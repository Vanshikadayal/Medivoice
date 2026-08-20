import { PrescriptionMedicineParser } from './parsers/prescription-medicine.parser';
import { MedicineEntityValidator } from './validators/medicine-entity.validator';
import { cleanMedicineCandidateName } from './utils/medicine-name-cleaner.util';
import { IndiaMedicineDatabaseProvider } from '../medicine-scanner/providers/india-medicine-database.provider';

describe('STEP 8C — prescription extraction without medicine database', () => {
  const parser = new PrescriptionMedicineParser();
  const validator = new MedicineEntityValidator();

  function extract(text: string) {
    const structured = parser.parseStructured(text);
    return {
      ...structured,
      medicines: validator.validateMedicines(structured.medicines),
    };
  }

  it('TEST 1 — doctor/patient only yields zero medicines', () => {
    const result = extract(`Dr. Ananya Sharma
MBBS, MD
Patient: Vanshika`);

    expect(result.medicines).toHaveLength(0);
    expect(result.doctor.name).toMatch(/Ananya Sharma/i);
    expect(result.patient.name).toMatch(/Vanshika/i);
  });

  it('TEST 2 — one medicine with breakfast/dinner timing', () => {
    const result = extract(`Dr. Ananya Sharma

Patient: Vanshika

Paracetamol 500 mg tablet
1 tablet after breakfast
1 tablet after dinner`);

    expect(result.medicines).toHaveLength(1);
    expect(result.medicines[0].name).toBe('Paracetamol');
    expect(result.medicines[0].strength?.toLowerCase()).toContain('500');
    expect(
      result.medicines[0].timings.some((t) => /breakfast/i.test(t)),
    ).toBe(true);
    expect(
      result.medicines[0].timings.some((t) => /dinner/i.test(t)),
    ).toBe(true);
  });

  it('TEST 3 — multiple medicines with 1-0-1 / 0-0-1 timing groups', () => {
    const result = extract(`Paracetamol 500 mg
1-0-1

Amoxicillin 500 mg
1-0-1

Cetirizine 10 mg
0-0-1`);

    expect(result.medicines).toHaveLength(3);

    const byName = Object.fromEntries(
      result.medicines.map((m) => [m.name.toLowerCase(), m]),
    );

    expect(byName.paracetamol.timings).toEqual(
      expect.arrayContaining(['morning', 'evening']),
    );
    expect(byName.amoxicillin.timings).toEqual(
      expect.arrayContaining(['morning', 'evening']),
    );
    expect(byName.cetirizine.timings).toEqual(
      expect.arrayContaining(['night']),
    );
  });

  it('TEST 4 — IndiaMedicineDatabaseProvider is not used by validator', () => {
    const searchSpy = jest.fn();
    // Validator must not accept/require the provider at all.
    expect(validator).toBeInstanceOf(MedicineEntityValidator);
    expect(
      (validator as unknown as { indiaMedicineDatabaseProvider?: unknown })
        .indiaMedicineDatabaseProvider,
    ).toBeUndefined();

    extract(`SomeMedicine 250 mg tablet
1 tablet after breakfast`);

    expect(searchSpy).not.toHaveBeenCalled();
    // Ensure the provider class method was never invoked via a shared mock.
    const protoSpy = jest.spyOn(
      IndiaMedicineDatabaseProvider.prototype,
      'searchByCandidate',
    );
    extract(`Paracetamol 500 mg
1 tablet after breakfast`);
    expect(protoSpy).not.toHaveBeenCalled();
    protoSpy.mockRestore();
  });

  it('TEST 5 — unknown medicine still extracts without DB match', () => {
    const result = extract(`SomeMedicine 250 mg tablet
1 tablet after breakfast`);

    expect(result.medicines.length).toBeGreaterThanOrEqual(1);
    expect(result.medicines[0].name.toLowerCase()).toContain('somemedicine');
    expect(result.medicines[0].strength?.toLowerCase()).toContain('250');
  });

  it('TEST 6 — doctor name must not become a medicine', () => {
    const result = extract(`Dr. Ananya Sharma
Paracetamol 500 mg`);

    expect(result.medicines).toHaveLength(1);
    expect(result.medicines[0].name).toBe('Paracetamol');
    expect(
      result.medicines.some((m) => /Ananya|Sharma/i.test(m.name)),
    ).toBe(false);
  });

  it('TEST 7 — OCR noise line is split into fields', () => {
    const cleaned = cleanMedicineCandidateName(
      'PARACETAMOL AFTER BREAKFAST AFTER DINNER 500 MG TABLETS',
    );
    expect(cleaned.name).toBe('Paracetamol');
    expect(cleaned.strength?.toLowerCase()).toContain('500');
    expect(cleaned.dosageForm).toBe('tablet');
    expect(cleaned.timings).toEqual(
      expect.arrayContaining(['after breakfast', 'after dinner']),
    );

    const result = extract(
      'PARACETAMOL AFTER BREAKFAST AFTER DINNER 500 MG TABLETS',
    );
    expect(result.medicines).toHaveLength(1);
    expect(result.medicines[0].name).toBe('Paracetamol');
    expect(result.medicines[0].name.toLowerCase()).not.toContain('breakfast');
    expect(result.medicines[0].name.toLowerCase()).not.toContain('dinner');
  });
});
