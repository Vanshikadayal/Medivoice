import { extractMedicineCandidateFromChat } from './chat-medicine-candidate-extractor.util';

describe('extractMedicineCandidateFromChat', () => {
  it('extracts brand and strength from a medicine question', () => {
    expect(extractMedicineCandidateFromChat('What is Dolo 650?')).toEqual({
      name: 'DOLO 650',
      strength: '650 MG',
      dosageForm: null,
    });
  });

  it('extracts dosage form when present', () => {
    expect(
      extractMedicineCandidateFromChat('Tell me about Augmentin 625 tablet'),
    ).toEqual({
      name: 'AUGMENTIN 625',
      strength: '625 MG',
      dosageForm: 'TABLETS',
    });
  });

  it('returns null when no medicine name can be extracted', () => {
    expect(extractMedicineCandidateFromChat('How to reduce fever?')).toBeNull();
  });
});
