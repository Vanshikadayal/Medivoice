import { cleanMedicineCandidateName } from './medicine-name-cleaner.util';

describe('cleanMedicineCandidateName', () => {
  it('normalizes WHAT DOLO 650 650 MG toward Dolo', () => {
    const cleaned = cleanMedicineCandidateName('WHAT DOLO 650 650 MG');
    expect(cleaned.name.toLowerCase()).toBe('dolo');
    expect(cleaned.name.toLowerCase()).not.toContain('what');
    expect(cleaned.strength?.toLowerCase()).toContain('650');
  });

  it('keeps bare Indian strength shorthand off the name', () => {
    const cleaned = cleanMedicineCandidateName('Azithromycin 500');
    expect(cleaned.name.toLowerCase()).toBe('azithromycin');
    expect(cleaned.strength?.toLowerCase()).toContain('500');
  });

  it('strips meal timing noise from OCR mega-lines', () => {
    const cleaned = cleanMedicineCandidateName(
      'AMOXICILLIN AFTER BREAKFAST AFTER DINNER 500 MG CAPSULES',
    );
    expect(cleaned.name).toBe('Amoxicillin');
    expect(cleaned.strength?.toLowerCase()).toContain('500');
    expect(cleaned.dosageForm).toBe('capsule');
    expect(cleaned.timings).toEqual(
      expect.arrayContaining(['after breakfast', 'after dinner']),
    );
  });

  it('handles CETIRIZINE BEDTIME 10 10 MG TABLETS', () => {
    const cleaned = cleanMedicineCandidateName(
      'CETIRIZINE BEDTIME 10 10 MG TABLETS',
    );
    expect(cleaned.name).toBe('Cetirizine');
    expect(cleaned.strength?.toLowerCase()).toContain('10');
    expect(cleaned.dosageForm).toBe('tablet');
    expect(cleaned.timings).toEqual(expect.arrayContaining(['bedtime']));
  });
});
