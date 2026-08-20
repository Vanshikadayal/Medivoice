import { normalizeMedicineOcrText, hasUsefulMedicineOcrText } from './medicine-ocr-text.normalizer';

describe('medicine-ocr-text.normalizer', () => {
  it('normalizes whitespace and line endings', () => {
    const result = normalizeMedicineOcrText(
      '  PARACETAMOL   500 mg  \r\n\r\nTABLETS   \nParacetamol IP 500 mg',
    );

    expect(result).toBe(
      'PARACETAMOL 500 mg\nTABLETS\nParacetamol IP 500 mg',
    );
  });

  it('detects useful medicine OCR text', () => {
    expect(
      hasUsefulMedicineOcrText('PARACETAMOL 500 mg\nParacetamol IP 500 mg'),
    ).toBe(true);
    expect(hasUsefulMedicineOcrText('XXX XXX XXX XXX XXX')).toBe(false);
    expect(hasUsefulMedicineOcrText('!!! ???')).toBe(false);
    expect(hasUsefulMedicineOcrText('')).toBe(false);
  });
});
