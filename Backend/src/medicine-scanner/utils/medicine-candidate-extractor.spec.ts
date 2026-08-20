import { extractMedicineCandidate } from './medicine-candidate-extractor';

describe('extractMedicineCandidate', () => {
  it('extracts paracetamol from a strip label with brand noise', () => {
    expect(
      extractMedicineCandidate(`DOLO
PARACETAMOL
650 MG
TABLETS`),
    ).toEqual({
      name: 'PARACETAMOL',
      strength: '650 MG',
      dosageForm: 'TABLETS',
    });
  });

  it('extracts acetaminophen from a simple label', () => {
    expect(
      extractMedicineCandidate(`ACETAMINOPHEN
500 MG
TABLETS`),
    ).toEqual({
      name: 'ACETAMINOPHEN',
      strength: '500 MG',
      dosageForm: 'TABLETS',
    });
  });

  it('extracts augmentin strength from Indian pack labels', () => {
    expect(extractMedicineCandidate('Augmentin 625 Duo Tablet')).toEqual({
      name: 'AUGMENTIN',
      strength: '625 MG',
      dosageForm: 'TABLETS',
    });
  });

  it('extracts amoxicillin capsules', () => {
    expect(
      extractMedicineCandidate(`AMOXICILLIN 500 MG
CAPSULES`),
    ).toEqual({
      name: 'AMOXICILLIN',
      strength: '500 MG',
      dosageForm: 'CAPSULES',
    });
  });

  it('strips WHAT OCR prefix from Dolo candidate', () => {
    expect(extractMedicineCandidate('WHAT DOLO 650 650 MG')).toEqual({
      name: 'DOLO 650',
      strength: '650 MG',
      dosageForm: null,
    });
  });
});
