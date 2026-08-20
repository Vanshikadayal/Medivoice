import { PrescriptionMedicineParser } from './prescription-medicine.parser';
import { cleanMedicineCandidateName } from '../utils/medicine-name-cleaner.util';
import { MedicineFrequency } from '../../medicine/schemas/medicine.schema';

describe('STEP 8B structured prescription entity extraction', () => {
  const parser = new PrescriptionMedicineParser();

  it('TEST 1: separates doctor, patient, and Dolo medicine', () => {
    const structured = parser.parseStructured(`Dr. Ananya Sharma
MBBS, MD

Patient: Rahul Sharma

Dolo 650  1 tablet  1-0-1  5 days`);

    expect(structured.doctor.name).toMatch(/Ananya Sharma/i);
    expect(structured.patient.name).toBe('Rahul Sharma');
    expect(structured.medicines).toHaveLength(1);
    expect(structured.medicines[0].name).toMatch(/Dolo/i);
    expect(
      structured.medicines.some((m) => /Ananya|Rahul|Sharma/i.test(m.name)),
    ).toBe(false);
  });

  it('TEST 2: Dr without period and Azithromycin', () => {
    const structured = parser.parseStructured(`Dr Ananya Sharma
Patient: Rahul

Azithromycin 500
1 tablet once daily
3 days`);

    expect(structured.doctor.name).toMatch(/Ananya Sharma/i);
    expect(structured.patient.name).toBe('Rahul');
    expect(structured.medicines).toHaveLength(1);
    expect(structured.medicines[0].name).toMatch(/Azithromycin/i);
    expect(structured.medicines[0].strength).toMatch(/500/i);
  });

  it('TEST 3: hospital/patient/doctor never become medicines', () => {
    const structured = parser.parseStructured(`Doctor: Ananya Sharma
Hospital: ABC Hospital
Patient: Rahul Sharma

Paracetamol
1 tablet twice daily
5 days`);

    expect(structured.medicines).toHaveLength(1);
    expect(structured.medicines[0].name).toMatch(/Paracetamol/i);
    expect(
      structured.medicines.some((m) =>
        /Ananya|Rahul|Hospital|ABC/i.test(m.name),
      ),
    ).toBe(false);
    expect(structured.doctor.name).toMatch(/Ananya Sharma/i);
    expect(structured.patient.name).toBe('Rahul Sharma');
  });

  it('TEST 4: cleans OCR artifact WHAT DOLO 650 650 MG', () => {
    const cleaned = cleanMedicineCandidateName('WHAT DOLO 650 650 MG');
    expect(cleaned.name.toLowerCase()).toContain('dolo');
    expect(cleaned.name.toLowerCase()).not.toContain('what');
    expect(cleaned.strength?.toUpperCase()).toContain('650');

    const structured = parser.parseStructured(
      `Patient: Rahul\n\nWHAT DOLO 650 650 MG\n1 tablet 1-0-1 5 days`,
    );
    expect(structured.medicines.length).toBeGreaterThanOrEqual(1);
    expect(structured.medicines[0].name.toLowerCase()).toContain('dolo');
    expect(structured.medicines[0].name.toLowerCase()).not.toContain('what');
    expect(structured.medicines[0].strength?.toLowerCase()).toContain('650');
  });

  it('legacy parse still returns medicines only (no doctor rows)', () => {
    const medicines = parser.parse(`Dr. Sharma

Paracetamol 500mg
1 tablet twice daily for 5 days
after food`);

    expect(medicines).toHaveLength(1);
    expect(medicines[0].name).toMatch(/Paracetamol/i);
    expect(medicines[0].dosage).toMatch(/1\s*tablet/i);
    expect(medicines[0].frequency).toBe(MedicineFrequency.TWICE_DAILY);
    expect(medicines[0].dosesPerDay).toBe(2);
    expect(medicines[0].durationDays).toBe(5);
  });
});
