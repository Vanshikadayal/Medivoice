import { MedicalQueryClassifierService } from './medical-query-classifier.service';
import { MedicalQueryCategory } from '../types/medical-safety';

describe('MedicalQueryClassifierService', () => {
  let classifier: MedicalQueryClassifierService;

  beforeEach(() => {
    classifier = new MedicalQueryClassifierService();
  });

  it('classifies medicine information questions', () => {
    expect(classifier.classify('What is Dolo 650?')).toBe(
      MedicalQueryCategory.MEDICINE_INFORMATION,
    );
  });

  it('classifies side effect questions', () => {
    expect(classifier.classify('What are the side effects of Dolo 650?')).toBe(
      MedicalQueryCategory.SIDE_EFFECT,
    );
  });

  it('classifies dosage questions', () => {
    expect(
      classifier.classify('How many Dolo 650 tablets should I take?'),
    ).toBe(MedicalQueryCategory.DOSAGE);
  });

  it('classifies prescription change questions', () => {
    expect(classifier.classify('Can I stop taking my antibiotics?')).toBe(
      MedicalQueryCategory.PRESCRIPTION_CHANGE,
    );
  });

  it('classifies drug interaction questions', () => {
    expect(classifier.classify('Can I take Dolo with ibuprofen?')).toBe(
      MedicalQueryCategory.DRUG_INTERACTION,
    );
  });

  it('classifies pregnancy questions', () => {
    expect(classifier.classify('I am pregnant, can I take this medicine?')).toBe(
      MedicalQueryCategory.PREGNANCY,
    );
  });

  it('classifies child medication questions', () => {
    expect(classifier.classify('Can I give this tablet to my child?')).toBe(
      MedicalQueryCategory.CHILD_MEDICATION,
    );
  });

  it('classifies allergy questions', () => {
    expect(
      classifier.classify('I am allergic to penicillin, can I take Augmentin?'),
    ).toBe(MedicalQueryCategory.ALLERGY);
  });

  it('classifies emergency questions', () => {
    expect(
      classifier.classify("I can't breathe and my throat is swelling."),
    ).toBe(MedicalQueryCategory.EMERGENCY);
  });

  it('classifies general health questions', () => {
    expect(classifier.classify('How can I reduce fever at home?')).toBe(
      MedicalQueryCategory.GENERAL_HEALTH,
    );
  });

  it('enables medicine retrieval for medicine-related categories', () => {
    expect(
      classifier.shouldAttemptMedicineRetrieval(
        MedicalQueryCategory.MEDICINE_INFORMATION,
      ),
    ).toBe(true);
    expect(
      classifier.shouldAttemptMedicineRetrieval(
        MedicalQueryCategory.GENERAL_HEALTH,
      ),
    ).toBe(false);
  });
});
