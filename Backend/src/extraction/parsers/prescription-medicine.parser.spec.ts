import { MedicineFrequency } from '../../medicine/schemas/medicine.schema';
import { PrescriptionMedicineParser } from './prescription-medicine.parser';

describe('PrescriptionMedicineParser', () => {
  const parser = new PrescriptionMedicineParser();

  it('extracts one medicine with duration and instructions', () => {
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
    expect(medicines[0].startDate).toBeNull();
    expect(medicines[0].instructions).toBe('after food');
  });

  it('extracts multiple medicines', () => {
    const medicines = parser.parse(`Paracetamol 500mg
1 tablet twice daily for 5 days
after food

Azithromycin 250mg
1 tablet once daily for 3 days
before food`);

    expect(medicines).toHaveLength(2);
    expect(medicines[0].name).toMatch(/Paracetamol/i);
    expect(medicines[1].name).toMatch(/Azithromycin/i);
    expect(medicines[1].dosesPerDay).toBe(1);
    expect(medicines[1].durationDays).toBe(3);
    expect(medicines[1].instructions).toBe('before food');
  });

  it('leaves duration null when not present', () => {
    const medicines = parser.parse(`Paracetamol 500mg
twice daily`);

    expect(medicines).toHaveLength(1);
    expect(medicines[0].durationDays).toBeNull();
    expect(medicines[0].dosesPerDay).toBe(2);
  });

  it('normalizes once, twice, and three times daily', () => {
    const medicines = parser.parse(`Medicine A 5mg once daily
Medicine B 5mg twice daily
Medicine C 5mg three times daily`);

    expect(medicines).toHaveLength(3);
    expect(medicines[0].dosesPerDay).toBe(1);
    expect(medicines[1].dosesPerDay).toBe(2);
    expect(medicines[2].dosesPerDay).toBe(3);
  });
});
