import { applyOcrTolerance } from './ocr-tolerance.normalizer';

describe('ocr-tolerance.normalizer', () => {
  it('fixes O misread as zero in strengths', () => {
    expect(applyOcrTolerance('DOLO 65O MG')).toBe('DOLO 650 MG');
  });

  it('fixes zero misread as O in medicine names', () => {
    expect(applyOcrTolerance('D0LO 650')).toBe('DOLO 650');
  });

  it('fixes common ingredient OCR errors', () => {
    expect(applyOcrTolerance('PARACETAM0L 650 MG')).toBe(
      'PARACETAMOL 650 MG',
    );
  });
});
