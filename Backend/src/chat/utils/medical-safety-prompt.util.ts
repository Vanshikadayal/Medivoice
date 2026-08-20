import { MedicineRetrievalResult } from '../services/medicine-retrieval.service';
import {
  GroundingStatus,
  MedicalQueryCategory,
  MedicalSafetyDecision,
  MedicalSafetyLevel,
} from '../types/medical-safety';
import {
  buildMedicineAwarePrompt,
  formatMedicineContext,
} from './medicine-context-formatter.util';

export function buildMedicalSafetyInstructions(
  decision: MedicalSafetyDecision,
  medicineFound: boolean,
): string {
  const rules = [
    'MEDICAL SAFETY RULES:',
    '- You are an informational medical assistant, not a doctor.',
    '- Do not provide a personalized diagnosis.',
    '- Do not claim to have examined the user.',
  ];

  switch (decision.category) {
    case MedicalQueryCategory.MEDICINE_INFORMATION:
    case MedicalQueryCategory.SIDE_EFFECT:
      rules.push(
        '- Use the provided Indian medicine database context as the primary source for medicine-specific facts.',
        '- Clearly distinguish database information from general health information.',
        '- Do not invent missing medicine information.',
      );
      break;
    case MedicalQueryCategory.DOSAGE:
      rules.push(
        '- Do not invent or calculate a personalized dosage.',
        '- If dosage information is not explicitly available in trusted context, say that you cannot safely determine the dose.',
        '- Advise consultation with a qualified healthcare professional or pharmacist.',
        '- Never recommend changing a prescribed dose.',
      );
      break;
    case MedicalQueryCategory.PRESCRIPTION_CHANGE:
      rules.push(
        '- Do not instruct the user to stop, start, replace, skip, or change prescribed medication.',
        '- Recommend contacting the prescribing clinician or pharmacist before making any medication changes.',
      );
      break;
    case MedicalQueryCategory.DRUG_INTERACTION:
      rules.push(
        '- Do not invent drug interaction information.',
        '- If interaction data is not present in trusted context, say the current MediVoice database does not provide enough interaction information to safely confirm the combination.',
        '- Do not imply that absence of a warning means the combination is safe.',
        '- Recommend checking with a doctor or pharmacist.',
      );
      break;
    case MedicalQueryCategory.PREGNANCY:
    case MedicalQueryCategory.CHILD_MEDICATION:
    case MedicalQueryCategory.ALLERGY:
      rules.push(
        '- This is a higher-risk context that requires professional medical guidance.',
        '- Do not provide personalized treatment or dosing advice.',
        '- Recommend consultation with a qualified doctor or pharmacist.',
      );
      break;
    case MedicalQueryCategory.GENERAL_HEALTH:
      rules.push(
        '- Provide general health information only.',
        '- Do not invent medicine-specific facts.',
      );
      break;
    default:
      rules.push('- Do not invent medicine-specific facts.');
      break;
  }

  if (decision.requiresGrounding && !medicineFound) {
    rules.push(
      '- Only use the provided medicine database information for medicine-specific factual claims.',
      '- If verified medicine information is unavailable, say: "I don\'t have enough verified information in the available medicine database to answer that safely."',
      '- Do not guess or fabricate medicine details.',
    );
  }

  if (decision.groundingStatus === GroundingStatus.AVAILABLE) {
    rules.push(
      '- When stating database facts, you may phrase them as: "According to the medicine information available in MediVoice..."',
    );
  }

  if (decision.requiresProfessionalAdvice) {
    rules.push(
      '- Encourage the user to consult a qualified healthcare professional for personalized advice.',
    );
  }

  if (decision.level === MedicalSafetyLevel.CAUTION) {
    rules.push('- Answer cautiously and avoid definitive safety claims.');
  }

  return rules.join('\n');
}

export function buildSafetyAwarePrompt(input: {
  message: string;
  retrieval: MedicineRetrievalResult;
  decision: MedicalSafetyDecision;
}): string {
  const { message, retrieval, decision } = input;
  const safetyInstructions = buildMedicalSafetyInstructions(
    decision,
    retrieval.medicineFound,
  );

  const medicineContext = retrieval.medicine
    ? formatMedicineContext(retrieval.medicine)
    : '';

  const sections = [safetyInstructions];

  if (medicineContext) {
    sections.push(
      buildMedicineAwarePrompt(message, medicineContext).replace(
        `User question: ${message}`,
        '',
      ),
    );
  } else if (decision.requiresGrounding) {
    sections.push(
      'No verified Indian medicine database record was found for this question.',
      'Do not invent medicine-specific facts.',
    );
  }

  sections.push(`User question: ${message}`);

  return sections.filter(Boolean).join('\n\n');
}
