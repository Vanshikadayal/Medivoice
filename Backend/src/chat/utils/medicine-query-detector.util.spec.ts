import { isMedicineQuery } from './medicine-query-detector.util';

describe('isMedicineQuery', () => {
  it('detects medicine-specific questions', () => {
    expect(isMedicineQuery('What is Dolo 650?')).toBe(true);
    expect(isMedicineQuery('Tell me about Augmentin 625')).toBe(true);
    expect(isMedicineQuery('Side effects of Crocin')).toBe(true);
  });

  it('detects medicine names with dosage forms', () => {
    expect(isMedicineQuery('Dolo 650 tablet')).toBe(true);
    expect(isMedicineQuery('paracetamol 500 mg')).toBe(true);
  });

  it('does not treat general health questions as medicine queries', () => {
    expect(isMedicineQuery('How to reduce fever at home?')).toBe(false);
    expect(isMedicineQuery('What should I eat for better immunity?')).toBe(
      false,
    );
  });
});
