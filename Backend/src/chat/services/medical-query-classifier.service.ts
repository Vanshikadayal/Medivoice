import { Injectable } from '@nestjs/common';
import { MedicalQueryCategory } from '../types/medical-safety';

const EMERGENCY_PATTERNS: RegExp[] = [
  /\bcan(?:'|no)?t breathe\b/i,
  /\bsevere difficulty breathing\b/i,
  /\bchest pain\b/i,
  /\bunconscious\b/i,
  /\bseizure\b/i,
  /\boverdose\b/i,
  /\btook too many (?:pills?|tablets?|medicines?|capsules?)\b/i,
  /\bpoisoning\b/i,
  /\bsevere allergic reaction\b/i,
  /\bswelling of (?:the )?throat\b/i,
  /\bthroat is swelling\b/i,
  /\bblue lips\b/i,
  /\bheavy bleeding\b/i,
  /\bsuicidal\b/i,
  /\bwant to (?:kill|hurt) myself\b/i,
];

const PRESCRIPTION_CHANGE_PATTERNS: RegExp[] = [
  /\b(?:can|should) i stop (?:taking|my)\b/i,
  /\bstop (?:taking|my) (?:medicine|medication|antibiotics?|tablets?|pills?)\b/i,
  /\bskip(?:ping)? (?:today(?:'s)?|this|my) dose\b/i,
  /\bdouble (?:the|my) dose\b/i,
  /\breplace (?:this|my) medicine\b/i,
  /\btake this instead\b/i,
  /\bchange (?:my|the) (?:medicine|medication|prescription)\b/i,
];

const DOSAGE_PATTERNS: RegExp[] = [
  /\bhow (?:many|much)(?:\s+\w+){0,4}\s+(?:should i|can i|do i|to)(?:\s+\w+){0,3}\s+take\b/i,
  /\bhow often should i take\b/i,
  /\bwhat dose should\b/i,
  /\bcan i take (?:two|2|three|3|more) (?:tablets?|pills?|capsules?)\b/i,
  /\bhow many (?:tablets?|pills?|capsules?|doses?)\b/i,
  /\bwhat(?:'s| is) the (?:correct|right|recommended) dose\b/i,
  /\bhow much should i take\b/i,
];

const DRUG_INTERACTION_PATTERNS: RegExp[] = [
  /\bcan i take .+ with\b/i,
  /\btake .+ together\b/i,
  /\b(?:these|both|two) medicines? together\b/i,
  /\bdrug interaction\b/i,
  /\binteract(?:ion|s)? (?:with|between)\b/i,
  /\bsafe to (?:combine|mix)\b/i,
];

const PREGNANCY_PATTERNS: RegExp[] = [
  /\bi am pregnant\b/i,
  /\bwhile pregnant\b/i,
  /\bduring pregnancy\b/i,
  /\bif i am pregnant\b/i,
  /\bsafe (?:in|during) pregnancy\b/i,
];

const CHILD_MEDICATION_PATTERNS: RegExp[] = [
  /\bmy child\b/i,
  /\bmy baby\b/i,
  /\bmy kid\b/i,
  /\bfor (?:my )?(?:child|baby|kid|toddler|infant)\b/i,
  /\bgive (?:this|it) to (?:my )?(?:child|baby|kid)\b/i,
  /\bpediatric\b/i,
];

const ALLERGY_PATTERNS: RegExp[] = [
  /\ballergic to\b/i,
  /\bi am allergic\b/i,
  /\ballergy to\b/i,
  /\bhave an allergy\b/i,
];

const SIDE_EFFECT_PATTERNS: RegExp[] = [
  /\bside effects?\b/i,
  /\badverse effects?\b/i,
  /\bany reactions?\b/i,
];

const MEDICINE_INFORMATION_PATTERNS: RegExp[] = [
  /\bwhat is\b/i,
  /\bwhat are\b/i,
  /\btell me about\b/i,
  /\bexplain\b/i,
  /\binformation (?:on|about)\b/i,
  /\buses? of\b/i,
  /\bcomposition of\b/i,
  /\bingredients? (?:in|of)\b/i,
];

const GENERAL_HEALTH_PATTERNS: RegExp[] = [
  /\bhow (?:can|to)\b.+\b(?:reduce|prevent|manage|treat|lower|improve)\b/i,
  /\bhome remedies?\b/i,
  /\bnaturally\b/i,
  /\bwhat should i eat\b/i,
  /\btips for\b/i,
  /\bways to\b/i,
];

@Injectable()
export class MedicalQueryClassifierService {
  classify(message: string): MedicalQueryCategory {
    const normalized = message.trim();
    if (!normalized) {
      return MedicalQueryCategory.UNKNOWN;
    }

    if (this.matchesAny(normalized, EMERGENCY_PATTERNS)) {
      return MedicalQueryCategory.EMERGENCY;
    }

    if (this.matchesAny(normalized, PRESCRIPTION_CHANGE_PATTERNS)) {
      return MedicalQueryCategory.PRESCRIPTION_CHANGE;
    }

    if (this.matchesAny(normalized, DOSAGE_PATTERNS)) {
      return MedicalQueryCategory.DOSAGE;
    }

    if (this.matchesAny(normalized, DRUG_INTERACTION_PATTERNS)) {
      return MedicalQueryCategory.DRUG_INTERACTION;
    }

    if (this.matchesAny(normalized, PREGNANCY_PATTERNS)) {
      return MedicalQueryCategory.PREGNANCY;
    }

    if (this.matchesAny(normalized, CHILD_MEDICATION_PATTERNS)) {
      return MedicalQueryCategory.CHILD_MEDICATION;
    }

    if (this.matchesAny(normalized, ALLERGY_PATTERNS)) {
      return MedicalQueryCategory.ALLERGY;
    }

    if (this.matchesAny(normalized, SIDE_EFFECT_PATTERNS)) {
      return MedicalQueryCategory.SIDE_EFFECT;
    }

    if (this.matchesAny(normalized, MEDICINE_INFORMATION_PATTERNS)) {
      return MedicalQueryCategory.MEDICINE_INFORMATION;
    }

    if (this.matchesAny(normalized, GENERAL_HEALTH_PATTERNS)) {
      return MedicalQueryCategory.GENERAL_HEALTH;
    }

    return MedicalQueryCategory.UNKNOWN;
  }

  shouldAttemptMedicineRetrieval(category: MedicalQueryCategory): boolean {
    return [
      MedicalQueryCategory.MEDICINE_INFORMATION,
      MedicalQueryCategory.SIDE_EFFECT,
      MedicalQueryCategory.DOSAGE,
      MedicalQueryCategory.DRUG_INTERACTION,
      MedicalQueryCategory.ALLERGY,
      MedicalQueryCategory.PREGNANCY,
      MedicalQueryCategory.CHILD_MEDICATION,
    ].includes(category);
  }

  private matchesAny(message: string, patterns: RegExp[]): boolean {
    return patterns.some((pattern) => pattern.test(message));
  }
}
