import {
  GroundingStatus,
  MedicalQueryCategory,
  MedicalSafetyLevel,
} from '../types/medical-safety';
import {
  buildMedicalSafetyInstructions,
  buildSafetyAwarePrompt,
} from './medical-safety-prompt.util';

describe('medical-safety-prompt.util', () => {
  it('includes dosage safety rules for dosage questions', () => {
    const instructions = buildMedicalSafetyInstructions(
      {
        level: MedicalSafetyLevel.HIGH_RISK,
        category: MedicalQueryCategory.DOSAGE,
        requiresGrounding: true,
        requiresProfessionalAdvice: true,
        emergency: false,
        emergencyStatus: 'NONE',
        groundingStatus: GroundingStatus.AVAILABLE,
      },
      true,
    );

    expect(instructions).toContain('Do not invent or calculate a personalized dosage.');
    expect(instructions).toContain('qualified healthcare professional');
  });

  it('includes grounding fallback when medicine context is missing', () => {
    const instructions = buildMedicalSafetyInstructions(
      {
        level: MedicalSafetyLevel.SAFE,
        category: MedicalQueryCategory.MEDICINE_INFORMATION,
        requiresGrounding: true,
        requiresProfessionalAdvice: false,
        emergency: false,
        emergencyStatus: 'NONE',
        groundingStatus: GroundingStatus.UNAVAILABLE,
      },
      false,
    );

    expect(instructions).toContain(
      "I don't have enough verified information in the available medicine database to answer that safely.",
    );
  });

  it('builds a safety-aware prompt with database context', () => {
    const prompt = buildSafetyAwarePrompt({
      message: 'What is Dolo 650?',
      retrieval: {
        prompt: '',
        medicineFound: true,
        medicine: {
          found: true,
          name: 'Dolo 650 Tablet',
          uses: ['Pain relief'],
          sideEffects: ['Nausea'],
          source: 'indian-medicine-dataset',
          sourceUrl: null,
        },
      },
      decision: {
        level: MedicalSafetyLevel.SAFE,
        category: MedicalQueryCategory.MEDICINE_INFORMATION,
        requiresGrounding: true,
        requiresProfessionalAdvice: false,
        emergency: false,
        emergencyStatus: 'NONE',
        groundingStatus: GroundingStatus.AVAILABLE,
      },
    });

    expect(prompt).toContain('MEDICAL SAFETY RULES:');
    expect(prompt).toContain('Trusted Indian medicine database record:');
    expect(prompt).toContain('User question: What is Dolo 650?');
  });

  it('builds a safety-aware prompt for unknown medicine without fabricating facts', () => {
    const prompt = buildSafetyAwarePrompt({
      message: 'What is Zorvaxium?',
      retrieval: {
        prompt: 'What is Zorvaxium?',
        medicineFound: false,
      },
      decision: {
        level: MedicalSafetyLevel.SAFE,
        category: MedicalQueryCategory.MEDICINE_INFORMATION,
        requiresGrounding: true,
        requiresProfessionalAdvice: false,
        emergency: false,
        emergencyStatus: 'NONE',
        groundingStatus: GroundingStatus.UNAVAILABLE,
      },
    });

    expect(prompt).toContain('No verified Indian medicine database record was found');
    expect(prompt).toContain('Do not invent medicine-specific facts.');
  });
});
