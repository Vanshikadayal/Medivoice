import { PrescriptionMedicineParser } from './parsers/prescription-medicine.parser';
import { MedicineEntityValidator } from './validators/medicine-entity.validator';
import {
  validateExtractedMedicinesForCreation,
  DURATION_CONFIRMATION_MESSAGE,
} from './validators/extracted-medicine.validator';
import {
  normalizeGeminiPrescriptionJson,
  parseGeminiJsonResponse,
} from './normalizers/gemini-prescription.normalizer';
import { extractExplicitDose } from './utils/dose-extraction.util';
import { IndiaMedicineDatabaseProvider } from '../medicine-scanner/providers/india-medicine-database.provider';
import { OpenFdaMedicineProvider } from '../medicine-scanner/providers/open-fda-medicine.provider';
import { TesseractPrescriptionExtractor } from './providers/tesseract-prescription.extractor';
import { GeminiPrescriptionExtractionService } from './providers/gemini-prescription-extraction.service';
import { ReminderShift } from '../reminder/schemas/reminder.schema';

describe('STEP 8E — robust AI prescription extraction', () => {
  const parser = new PrescriptionMedicineParser();
  const validator = new MedicineEntityValidator();

  function extractDeterministic(text: string) {
    const structured = parser.parseStructured(text);
    return {
      ...structured,
      medicines: validator.validateMedicines(structured.medicines),
    };
  }

  function reminderSlots(timings: string[]): string[] {
    const lower = timings.join(' ').toLowerCase();
    const slots: string[] = [];
    if (/\b(?:after\s+)?breakfast\b|\bmorning\b/.test(lower)) {
      slots.push(ReminderShift.MORNING);
    }
    if (/\b(?:after\s+)?lunch\b|\bnoon\b/.test(lower)) {
      slots.push(ReminderShift.NOON);
    }
    if (/\b(?:after\s+)?dinner\b|\bevening\b/.test(lower)) {
      slots.push(ReminderShift.EVENING);
    }
    if (/\b(?:at\s+)?bedtime\b|\bnight\b|\bhs\b/.test(lower)) {
      slots.push(ReminderShift.NIGHT);
    }
    return slots;
  }

  it('TEST 1 — simple prescription', () => {
    const result = extractDeterministic(`Paracetamol 500 mg
1 tablet twice daily
5 days`);

    expect(result.medicines).toHaveLength(1);
    const med = result.medicines[0];
    expect(med.name).toBe('Paracetamol');
    expect(med.strength?.toLowerCase()).toContain('500');
    expect(med.dosage).toMatch(/1\s*tablet/i);
    expect(med.frequencyPerDay).toBe(2);
    expect(med.durationDays).toBe(5);
  });

  it('TEST 2 — numeric 1-0-1 format', () => {
    const result = extractDeterministic(`Paracetamol 500 mg 1-0-1 5 days`);

    expect(result.medicines).toHaveLength(1);
    const med = result.medicines[0];
    expect(med.frequencyPerDay).toBe(2);
    expect(med.timings).toEqual(
      expect.arrayContaining(['morning', 'evening']),
    );
    expect(med.dosage).toBeNull();
    expect(med.durationDays).toBe(5);
  });

  it('TEST 3 — multiple medicines with different timings', () => {
    const result = extractDeterministic(`Paracetamol 500 mg
1-0-1
5 days

Amoxicillin 500 mg
1-1-1
7 days

Cetirizine 10 mg
0-0-1
5 days`);

    expect(result.medicines).toHaveLength(3);
    const byName = Object.fromEntries(
      result.medicines.map((m) => [m.name.toLowerCase(), m]),
    );
    expect(reminderSlots(byName.paracetamol.timings)).toEqual(
      expect.arrayContaining([ReminderShift.MORNING, ReminderShift.EVENING]),
    );
    expect(reminderSlots(byName.amoxicillin.timings)).toEqual(
      expect.arrayContaining([
        ReminderShift.MORNING,
        ReminderShift.NOON,
        ReminderShift.EVENING,
      ]),
    );
    expect(reminderSlots(byName.cetirizine.timings)).toContain(
      ReminderShift.NIGHT,
    );
  });

  it('TEST 4 — doctor only yields no medicines', () => {
    const result = extractDeterministic(`Dr. Ananya Sharma
MBBS MD`);
    expect(result.medicines).toHaveLength(0);
    expect(result.doctor.name).toMatch(/Ananya Sharma/i);
  });

  it('TEST 5 — patient only yields no medicines', () => {
    const result = extractDeterministic(`Patient: Vanshika
Age: 23
Gender: Female`);
    expect(result.medicines).toHaveLength(0);
    expect(result.patient.name).toMatch(/Vanshika/i);
  });

  it('TEST 6 — table-style layout with BD/HS', () => {
    const result = extractDeterministic(`Medicine       Strength     Dose      Frequency      Duration

Dolo           650 mg       1 tab     BD             5 days
Amoxicillin    500 mg       1 cap     BD             7 days
Cetirizine     10 mg        1 tab     HS             5 days`);

    expect(result.medicines.length).toBeGreaterThanOrEqual(3);
    const byName = Object.fromEntries(
      result.medicines.map((m) => [m.name.toLowerCase(), m]),
    );

    expect(byName.dolo.strength?.toLowerCase()).toContain('650');
    expect(byName.dolo.dosage).toMatch(/1\s*tablet/i);
    expect(byName.dolo.frequencyPerDay).toBe(2);
    expect(byName.dolo.durationDays).toBe(5);

    expect(byName.amoxicillin.dosage).toMatch(/1\s*capsule/i);
    expect(byName.amoxicillin.frequencyPerDay).toBe(2);
    expect(byName.amoxicillin.durationDays).toBe(7);

    expect(byName.cetirizine.dosage).toMatch(/1\s*tablet/i);
    expect(byName.cetirizine.frequencyPerDay).toBe(1);
    expect(reminderSlots(byName.cetirizine.timings)).toContain(
      ReminderShift.NIGHT,
    );
  });

  it('TEST 7 — missing dosage still allowed with timings', () => {
    const result = extractDeterministic(`Paracetamol 500 mg
after breakfast
after dinner`);

    const med = result.medicines[0];
    expect(med.dosage).toBeNull();
    expect(med.frequencyPerDay).toBe(2);
    expect(med.timings.join(' ')).toMatch(/breakfast/i);
    expect(med.timings.join(' ')).toMatch(/dinner/i);

    const ready = validateExtractedMedicinesForCreation(
      result.medicines.map((m) => parser.toExtractedMedicine(m)),
    );
    expect(ready).toHaveLength(1);
    expect(ready[0].dosage).toBe('');
    expect(ready[0].dosesPerDay).toBe(2);
  });

  it('TEST 8 — missing duration stays null (no fake 1-day clinical duration)', () => {
    const result = extractDeterministic(`Paracetamol 500 mg
1 tablet twice daily`);

    expect(result.medicines[0].durationDays).toBeNull();

    const ready = validateExtractedMedicinesForCreation(
      result.medicines.map((m) => parser.toExtractedMedicine(m)),
    );
    expect(ready[0].durationDays).toBeNull();
    expect(ready[0].durationConfirmationNeeded).toBe(true);
    expect(DURATION_CONFIRMATION_MESSAGE).toMatch(/confirm the duration/i);
  });

  it('TEST 9 — OCR noise dosage forms', () => {
    expect(extractExplicitDose('1 TABL').dosage).toBe('1 tablet');
    expect(extractExplicitDose('I TABLET').dosage).toBe('1 tablet');
    expect(extractExplicitDose('1 CAP').dosage).toBe('1 capsule');

    const result = extractDeterministic(`Paracetamol 500 mg
1 TABL after breakfast`);
    expect(result.medicines[0].dosage).toMatch(/1\s*tablet/i);
  });

  it('TEST 10 — medicine database providers are never called', () => {
    const indiaSpy = jest.spyOn(
      IndiaMedicineDatabaseProvider.prototype,
      'searchByCandidate',
    );
    const openFdaSpy = jest.spyOn(
      OpenFdaMedicineProvider.prototype,
      'searchByCandidate',
    );

    extractDeterministic(`SomeNewMedicine 20 mg
1 tablet BD
5 days`);

    expect(indiaSpy).not.toHaveBeenCalled();
    expect(openFdaSpy).not.toHaveBeenCalled();
    expect(
      (validator as unknown as { indiaMedicineDatabaseProvider?: unknown })
        .indiaMedicineDatabaseProvider,
    ).toBeUndefined();

    indiaSpy.mockRestore();
    openFdaSpy.mockRestore();
  });

  it('TEST 11 — Gemini timeout/error falls back to deterministic parser', async () => {
    const gemini = {
      tryExtractStructured: jest.fn().mockResolvedValue(null),
    } as unknown as GeminiPrescriptionExtractionService;

    const extractor = new TesseractPrescriptionExtractor(
      { recognize: jest.fn() } as never,
      parser,
      validator,
      gemini,
    );

    const result = await extractor.extractStructured({
      imageUrl: '/x.jpg',
      extractedText: `Paracetamol 500 mg
1 tablet twice daily
5 days`,
    });

    expect(gemini.tryExtractStructured).toHaveBeenCalled();
    expect(result.medicines).toHaveLength(1);
    expect(result.medicines[0].name).toBe('Paracetamol');
    expect(result.medicines[0].dosage).toMatch(/1\s*tablet/i);
  });

  it('TEST 12 — invalid Gemini JSON / unusable payload falls back', async () => {
    expect(() => parseGeminiJsonResponse('not-json {{{')).toThrow();

    const gemini = {
      tryExtractStructured: jest.fn().mockResolvedValue(null),
    } as unknown as GeminiPrescriptionExtractionService;

    const extractor = new TesseractPrescriptionExtractor(
      { recognize: jest.fn() } as never,
      parser,
      validator,
      gemini,
    );

    const result = await extractor.extractStructured({
      imageUrl: '/x.jpg',
      extractedText: `Amoxicillin 500 mg
1-0-1
7 days`,
    });

    expect(result.medicines[0].name).toBe('Amoxicillin');
    expect(result.medicines[0].frequencyPerDay).toBe(2);
  });

  it('TEST 13 — Gemini JSON normalizes into medicines that create reminders slots', () => {
    const normalized = normalizeGeminiPrescriptionJson({
      doctor: { name: 'Dr. Ananya Sharma' },
      patient: { name: 'Vanshika', age: 23, gender: 'Female' },
      medicines: [
        {
          name: 'Paracetamol',
          strength: '500 mg',
          dosage: { amount: 1, unit: 'tablet' },
          dosageForm: 'tablet',
          frequency: { timesPerDay: 2, pattern: '1-0-1' },
          timings: ['morning', 'evening'],
          duration: { value: 5, unit: 'days' },
          instructions: null,
        },
        {
          name: 'Cetirizine',
          strength: '10 mg',
          dosage: { amount: 1, unit: 'tablet' },
          frequency: { timesPerDay: 1, pattern: 'HS' },
          timings: ['bedtime'],
          duration: { value: 5, unit: 'days' },
        },
      ],
    });

    expect(normalized).not.toBeNull();
    const validated = validator.validateMedicines(normalized!.medicines);
    expect(validated).toHaveLength(2);

    const ready = validateExtractedMedicinesForCreation(
      validated.map((m) => parser.toExtractedMedicine(m)),
    );
    expect(ready[0].dosesPerDay).toBe(2);
    expect(ready[0].durationDays).toBe(5);
    expect(ready[1].dosesPerDay).toBe(1);
    expect(reminderSlots(validated[1].timings)).toContain(ReminderShift.NIGHT);

    // Doctor/patient never become medicines
    expect(validated.every((m) => !/Ananya|Vanshika/i.test(m.name))).toBe(true);
  });

  it('Gemini success path is preferred over deterministic when valid', async () => {
    const geminiStructured = normalizeGeminiPrescriptionJson({
      doctor: { name: 'Dr. Test' },
      patient: { name: null },
      medicines: [
        {
          name: 'SomeNewMedicine',
          strength: '20 mg',
          dosage: { amount: 1, unit: 'tablet' },
          frequency: { timesPerDay: 2, pattern: 'BD' },
          timings: ['morning', 'evening'],
          duration: { value: 3, unit: 'days' },
        },
      ],
    });

    const gemini = {
      tryExtractStructured: jest.fn().mockResolvedValue(geminiStructured),
    } as unknown as GeminiPrescriptionExtractionService;

    const extractor = new TesseractPrescriptionExtractor(
      { recognize: jest.fn() } as never,
      parser,
      validator,
      gemini,
    );

    const result = await extractor.extractStructured({
      imageUrl: '/x.jpg',
      extractedText: 'garbage OCR that deterministic might miss',
    });

    expect(result.medicines).toHaveLength(1);
    expect(result.medicines[0].name).toBe('Somenewmedicine');
    expect(result.medicines[0].dosage).toBe('1 tablet');
  });

  it('does not invent dosage from strength or from TABLETS alone', () => {
    const normalized = normalizeGeminiPrescriptionJson({
      doctor: { name: null },
      patient: { name: null },
      medicines: [
        {
          name: 'Paracetamol',
          strength: '500 mg',
          dosage: null,
          dosageForm: 'tablet',
          frequency: { timesPerDay: 2, pattern: 'BD' },
          timings: ['morning', 'evening'],
          duration: null,
        },
      ],
    });

    expect(normalized!.medicines[0].dosage).toBeNull();
    expect(normalized!.medicines[0].strength?.toLowerCase()).toContain('500');
    expect(normalized!.medicines[0].durationDays).toBeNull();
  });

  it('pipeline: OCR text → extract → validate → create payload → reminder slots', () => {
    const ocr = `Dr. Ananya Sharma
Patient: Vanshika

Paracetamol 500 mg
1 tablet after breakfast
1 tablet after dinner
5 days

Cetirizine 10 mg
1 tablet at bedtime
5 days`;

    const structured = extractDeterministic(ocr);
    expect(structured.medicines).toHaveLength(2);
    expect(structured.doctor.name).toMatch(/Ananya/i);
    expect(structured.patient.name).toMatch(/Vanshika/i);

    const ready = validateExtractedMedicinesForCreation(
      structured.medicines.map((m) => parser.toExtractedMedicine(m)),
    );

    // Simulate medicine records that would be persisted
    const medicineRecords = ready.map((m, i) => ({
      _id: `med-${i}`,
      name: m.name,
      dosage: m.dosage,
      dosesPerDay: m.dosesPerDay,
      durationDays: m.durationDays,
      instructions: m.instructions,
    }));

    expect(medicineRecords[0].name).toBe('Paracetamol');
    expect(medicineRecords[0].dosage).toMatch(/1\s*tablet/i);
    expect(medicineRecords[0].dosesPerDay).toBe(2);
    expect(medicineRecords[0].durationDays).toBe(5);

    // Reminder slots derived from extracted timings/instructions
    expect(reminderSlots(structured.medicines[0].timings)).toEqual(
      expect.arrayContaining([ReminderShift.MORNING, ReminderShift.EVENING]),
    );
    expect(reminderSlots(structured.medicines[1].timings)).toContain(
      ReminderShift.NIGHT,
    );
  });
});
