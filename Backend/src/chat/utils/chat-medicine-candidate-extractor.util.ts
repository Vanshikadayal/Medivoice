import { MedicineCandidate } from 'src/medicine-scanner/types/medicine-information';

const QUESTION_PREFIX =
  /^(?:what is|what are|tell me about|can you (?:tell|explain)|explain|describe|information (?:on|about)|info (?:on|about)|uses? of|side effects? of|composition of|ingredients? (?:in|of)|price of|cost of|substitute(?:s)? for|alternative(?:s)? (?:to|for)|how (?:does|do)|is)\s+/i;

const TRAILING_PHRASES =
  /\s+(?:used for|for what|please|thanks|thank you)\b.*$/i;

const STRENGTH_WITH_UNIT_PATTERN =
  /\b(\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu))\b/i;

const BRAND_WITH_NUMBER_PATTERN =
  /\b([a-z][\w-]*)\s+(\d+(?:\.\d+)?)\b/i;

const DOSAGE_FORMS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\btablets?\b/i, label: 'TABLETS' },
  { pattern: /\bcapsules?\b/i, label: 'CAPSULES' },
  { pattern: /\bsyrup\b/i, label: 'SYRUP' },
  { pattern: /\binjection\b/i, label: 'INJECTION' },
  { pattern: /\bcream\b/i, label: 'CREAM' },
  { pattern: /\bointment\b/i, label: 'OINTMENT' },
];

export function extractMedicineCandidateFromChat(
  message: string,
): MedicineCandidate | null {
  let text = message.trim();
  if (!text) {
    return null;
  }

  text = text.replace(QUESTION_PREFIX, '');
  text = text.replace(/\?+$/g, '').trim();
  text = text.replace(TRAILING_PHRASES, '').trim();

  if (!text) {
    return null;
  }

  const strength = extractStrength(text);
  const dosageForm = extractDosageForm(text);
  const name = extractName(text, strength, dosageForm);

  if (!name || name.length < 2) {
    return null;
  }

  if (isNonMedicinePhrase(name)) {
    return null;
  }

  return {
    name: name.toUpperCase(),
    strength: strength ? strength.toUpperCase() : null,
    dosageForm,
  };
}

function extractStrength(text: string): string | null {
  const withUnit = text.match(STRENGTH_WITH_UNIT_PATTERN);
  if (withUnit) {
    return withUnit[1].replace(/\s+/g, ' ').trim();
  }

  const brandWithNumber = text.match(BRAND_WITH_NUMBER_PATTERN);
  if (brandWithNumber) {
    return `${brandWithNumber[2]} MG`;
  }

  return null;
}

function extractDosageForm(text: string): string | null {
  for (const form of DOSAGE_FORMS) {
    if (form.pattern.test(text)) {
      return form.label;
    }
  }

  return null;
}

function extractName(
  text: string,
  strength: string | null,
  dosageForm: string | null,
): string | null {
  let name = text;

  if (strength) {
    name = name.replace(strength, ' ');
  }

  const brandWithNumber = text.match(BRAND_WITH_NUMBER_PATTERN);
  if (brandWithNumber && !strength?.includes(brandWithNumber[2])) {
    name = `${brandWithNumber[1]} ${brandWithNumber[2]}`;
  }

  for (const form of DOSAGE_FORMS) {
    name = name.replace(form.pattern, ' ');
  }

  name = name.replace(/\s+/g, ' ').trim();

  if (!name) {
    return null;
  }

  if (dosageForm && name.split(/\s+/).length === 1) {
    return name;
  }

  return name;
}

const NON_MEDICINE_NAME_PATTERN =
  /^(?:how to|what should|why do|when to|tips for|ways to|home remedies|reduce|prevent|treat|manage)\b/i;

function isNonMedicinePhrase(name: string): boolean {
  return NON_MEDICINE_NAME_PATTERN.test(name);
}
