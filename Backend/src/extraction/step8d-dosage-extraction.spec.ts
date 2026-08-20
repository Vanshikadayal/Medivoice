import { PrescriptionMedicineParser } from './parsers/prescription-medicine.parser';
import { MedicineEntityValidator } from './validators/medicine-entity.validator';
import {
  validateExtractedMedicinesForCreation,
} from './validators/extracted-medicine.validator';
import { extractExplicitDose } from './utils/dose-extraction.util';
import { IndiaMedicineDatabaseProvider } from '../medicine-scanner/providers/india-medicine-database.provider';
import { ReminderShift } from '../reminder/schemas/reminder.schema';

describe('STEP 8D — dosage extraction vs strength + reminders', () => {
  const parser = new PrescriptionMedicineParser();
  const validator = new MedicineEntityValidator();

  function extract(text: string) {
    const structured = parser.parseStructured(text);
    const medicines = validator.validateMedicines(structured.medicines);
    return { ...structured, medicines };
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
    if (
      /\b(?:at\s+)?bedtime\b|\bbefore\s+bed(?:time)?\b|\bnight\b/.test(lower)
    ) {
      slots.push(ReminderShift.NIGHT);
    }
    return slots;
  }

  it('1 — Paracetamol 500 mg with 1 tablet after breakfast and dinner', () => {
    const result = extract(`Paracetamol 500 mg
1 tablet after breakfast and dinner`);

    expect(result.medicines).toHaveLength(1);
    const med = result.medicines[0];
    expect(med.name).toBe('Paracetamol');
    expect(med.strength?.toLowerCase()).toContain('500');
    expect(med.dosage).toMatch(/1\s*tablet/i);
    expect(med.dosage?.toLowerCase()).not.toContain('500');
    expect(med.frequencyPerDay).toBe(2);
    expect(med.timings.join(' ')).toMatch(/breakfast/i);
    expect(med.timings.join(' ')).toMatch(/dinner/i);
  });

  it('2 — Paracetamol 500 mg — 1-0-1', () => {
    const result = extract(`Paracetamol 500 mg
1-0-1`);

    const med = result.medicines[0];
    expect(med.name).toBe('Paracetamol');
    expect(med.strength?.toLowerCase()).toContain('500');
    expect(med.dosage).toBeNull(); // no explicit "1 tablet"
    expect(med.frequencyPerDay).toBe(2);
    expect(med.timings).toEqual(
      expect.arrayContaining(['morning', 'evening']),
    );
    expect(reminderSlots(med.timings)).toEqual(
      expect.arrayContaining([ReminderShift.MORNING, ReminderShift.EVENING]),
    );
  });

  it('3 — Amoxicillin 500 mg — 1-1-1', () => {
    const result = extract(`Amoxicillin 500 mg
1-1-1`);

    const med = result.medicines[0];
    expect(med.name).toBe('Amoxicillin');
    expect(med.frequencyPerDay).toBe(3);
    expect(med.timings).toEqual(
      expect.arrayContaining(['morning', 'noon', 'evening']),
    );
  });

  it('4 — Cetirizine 10 mg — 0-0-1', () => {
    const result = extract(`Cetirizine 10 mg
0-0-1`);

    const med = result.medicines[0];
    expect(med.name).toBe('Cetirizine');
    expect(med.frequencyPerDay).toBe(1);
    expect(med.timings).toEqual(expect.arrayContaining(['night']));
    expect(reminderSlots(med.timings)).toContain(ReminderShift.NIGHT);
  });

  it('5 — 1 tablet twice daily', () => {
    const result = extract(`Paracetamol 500 mg
1 tablet twice daily`);

    const med = result.medicines[0];
    expect(med.dosage).toMatch(/1\s*tablet/i);
    expect(med.frequencyPerDay).toBe(2);
  });

  it('6 — 1 capsule at bedtime', () => {
    const result = extract(`Amoxicillin 500 mg
1 capsule at bedtime`);

    const med = result.medicines[0];
    expect(med.dosage).toMatch(/1\s*capsule/i);
    expect(med.frequencyPerDay).toBe(1);
    expect(med.timings.join(' ')).toMatch(/bedtime/i);
  });

  it('7 — OCR 1 TABL', () => {
    expect(extractExplicitDose('1 TABL').dosage).toBe('1 tablet');
    const result = extract(`Paracetamol 500 mg
1 TABL after breakfast`);
    expect(result.medicines[0].dosage).toMatch(/1\s*tablet/i);
  });

  it('8 — OCR I TABLET', () => {
    expect(extractExplicitDose('I TABLET').dosage).toBe('1 tablet');
    const result = extract(`Paracetamol 500 mg
I TABLET after dinner`);
    expect(result.medicines[0].dosage).toMatch(/1\s*tablet/i);
  });

  it('9 — strength without explicit dosage still creates when timing exists', () => {
    const result = extract(`Paracetamol 500 mg
After breakfast
After dinner`);

    expect(result.medicines).toHaveLength(1);
    const med = result.medicines[0];
    expect(med.strength?.toLowerCase()).toContain('500');
    expect(med.dosage).toBeNull();
    expect(med.frequencyPerDay).toBe(2);

    const ready = validateExtractedMedicinesForCreation(
      result.medicines.map((m) => parser.toExtractedMedicine(m)),
    );
    expect(ready).toHaveLength(1);
    expect(ready[0].dosage).toBe('');
    expect(ready[0].dosesPerDay).toBe(2);
  });

  it('10 — doctor name near medicine is ignored', () => {
    const result = extract(`Dr. Ananya Sharma
Paracetamol 500 mg
1 tablet after breakfast`);

    expect(result.medicines).toHaveLength(1);
    expect(result.medicines[0].name).toBe('Paracetamol');
    expect(
      result.medicines.some((m) => /Ananya|Sharma/i.test(m.name)),
    ).toBe(false);
  });

  it('11 — patient name near medicine is ignored', () => {
    const result = extract(`Patient: Vanshika
Paracetamol 500 mg
1 tablet after breakfast`);

    expect(result.medicines).toHaveLength(1);
    expect(result.medicines[0].name).toBe('Paracetamol');
    expect(
      result.medicines.some((m) => /Vanshika/i.test(m.name)),
    ).toBe(false);
  });

  it('12 — multiple medicines with different frequencies', () => {
    const result = extract(`Paracetamol 500 mg
1-0-1

Amoxicillin 500 mg
1-1-1

Cetirizine 10 mg
0-0-1`);

    expect(result.medicines).toHaveLength(3);
    const byName = Object.fromEntries(
      result.medicines.map((m) => [m.name.toLowerCase(), m]),
    );
    expect(byName.paracetamol.frequencyPerDay).toBe(2);
    expect(byName.amoxicillin.frequencyPerDay).toBe(3);
    expect(byName.cetirizine.frequencyPerDay).toBe(1);
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

  it('13 — prescription path never calls IndiaMedicineDatabaseProvider', () => {
    const protoSpy = jest.spyOn(
      IndiaMedicineDatabaseProvider.prototype,
      'searchByCandidate',
    );

    extract(`Paracetamol 500 mg
1 tablet after breakfast and dinner`);

    expect(protoSpy).not.toHaveBeenCalled();
    expect(
      (validator as unknown as { indiaMedicineDatabaseProvider?: unknown })
        .indiaMedicineDatabaseProvider,
    ).toBeUndefined();
    protoSpy.mockRestore();
  });

  it('does not invent dosage from dosage form alone', () => {
    const result = extract(
      'PARACETAMOL AFTER BREAKFAST AFTER DINNER 500 MG TABLETS',
    );
    expect(result.medicines).toHaveLength(1);
    expect(result.medicines[0].name).toBe('Paracetamol');
    expect(result.medicines[0].dosage).toBeNull();
    expect(result.medicines[0].dosageForm).toBe('tablet');
  });
});
