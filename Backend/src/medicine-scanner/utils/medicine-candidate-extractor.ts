import { MedicineCandidate } from '../types/medicine-information';

const STRENGTH_PATTERN =
  /\b(\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu))\b/i;

const INDIAN_PACK_STRENGTH_PATTERN =
  /\b(\d+(?:\.\d+)?)\s+(?:duo\s+)?(?:tablets?|capsules?)\b/i;

const DOSAGE_FORMS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\btablets?\b/i, label: 'TABLETS' },
  { pattern: /\bcapsules?\b/i, label: 'CAPSULES' },
  { pattern: /\bsyrup\b/i, label: 'SYRUP' },
  { pattern: /\binjection\b/i, label: 'INJECTION' },
  { pattern: /\bcream\b/i, label: 'CREAM' },
  { pattern: /\bointment\b/i, label: 'OINTMENT' },
];

const LABEL_NOISE =
  /^(composition|brand|manufactured|batch|mfg|exp|mrp|price|strip|box|each|contains)$/i;

const GENERIC_MARKERS = /\b(?:ip|bp|usp)\b/i;

export function extractMedicineCandidate(
  ocrText: string,
): MedicineCandidate | null {
  const lines = ocrText
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return null;
  }

  const strength = extractStrength(ocrText);
  const dosageForm = extractDosageForm(ocrText);
  const name =
    extractNameFromIngredientLines(lines) ??
    extractNameFromStrengthLines(lines) ??
    extractBestNameLine(lines, strength);

  if (!name) {
    return null;
  }

  return {
    name: name.toUpperCase(),
    strength: strength ? strength.toUpperCase() : null,
    dosageForm,
  };
}

function extractStrength(text: string): string | null {
  const match = text.match(STRENGTH_PATTERN);
  if (match) {
    return match[1].replace(/\s+/g, ' ').trim();
  }

  const indianPackMatch = text.match(INDIAN_PACK_STRENGTH_PATTERN);
  if (indianPackMatch) {
    return `${indianPackMatch[1]} MG`;
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

function extractNameFromIngredientLines(lines: string[]): string | null {
  for (const line of lines) {
    if (!GENERIC_MARKERS.test(line)) {
      continue;
    }

    const inlineIngredient = line.match(
      /\b([A-Za-z][A-Za-z0-9+-]{2,})\s+(?:ip|bp|usp)\b/i,
    );
    if (inlineIngredient?.[1]) {
      return cleanMedicineName(inlineIngredient[1]);
    }

    if (/^(?:ip|bp|usp)\b/i.test(line)) {
      continue;
    }

    const cleaned = cleanIngredientLine(line);
    if (cleaned) {
      return cleaned;
    }
  }

  return null;
}

function extractNameFromStrengthLines(lines: string[]): string | null {
  for (const line of lines) {
    const withStrength = line.match(
      /^([A-Za-z][A-Za-z0-9\s+-]{2,}?)\s+\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu)\b/i,
    );
    if (withStrength?.[1]) {
      return cleanMedicineName(withStrength[1]);
    }

    const withIndianPackStrength = line.match(
      /^([A-Za-z0-9][A-Za-z0-9\s+-]*?)\s+\d+(?:\.\d+)?\s+(?:duo\s+)?(?:tablets?|capsules?)\b/i,
    );
    if (withIndianPackStrength?.[1]) {
      return cleanMedicineName(withIndianPackStrength[1]);
    }
  }

  return null;
}

function extractBestNameLine(
  lines: string[],
  strength: string | null,
): string | null {
  const candidates: string[] = [];

  for (const line of lines) {
    if (isNoiseLine(line)) {
      continue;
    }

    if (STRENGTH_PATTERN.test(line) && !/^[A-Za-z]/.test(line)) {
      continue;
    }

    const alphaOnly = line.replace(/[^A-Za-z\s+-]/g, ' ').replace(/\s+/g, ' ').trim();
    if (alphaOnly.length < 3) {
      continue;
    }

    if (/^[A-Za-z][A-Za-z0-9\s+-]{2,}$/.test(alphaOnly) && !strength) {
      candidates.push(cleanMedicineName(alphaOnly) ?? alphaOnly);
      continue;
    }

    const withoutStrength = alphaOnly
      .replace(STRENGTH_PATTERN, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (withoutStrength.length >= 3 && /^[A-Za-z]/.test(withoutStrength)) {
      candidates.push(cleanMedicineName(withoutStrength) ?? withoutStrength);
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  return candidates.sort((left, right) => right.length - left.length)[0];
}

function isNoiseLine(line: string): boolean {
  const firstToken = line.split(/\s+/)[0] ?? '';
  if (LABEL_NOISE.test(firstToken)) {
    return true;
  }

  if (/^(composition|brand)\b/i.test(line)) {
    return true;
  }

  if (/^\d+\s*(?:tablets?|capsules?)\b/i.test(line)) {
    return true;
  }

  return DOSAGE_FORMS.some((form) => form.pattern.test(line) && line.split(/\s+/).length <= 2);
}

function cleanIngredientLine(line: string): string | null {
  const cleaned = line
    .replace(/\b(?:ip|bp|usp)\b/gi, '')
    .replace(STRENGTH_PATTERN, '')
    .replace(/[^A-Za-z0-9\s+-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length < 3) {
    return null;
  }

  return cleanMedicineName(cleaned.split(/\s+/).slice(0, 3).join(' '));
}

function cleanMedicineName(value: string): string | null {
  let cleaned = value.replace(/\s+/g, ' ').trim();
  if (cleaned.length < 3 || LABEL_NOISE.test(cleaned)) {
    return null;
  }

  // Drop common OCR question/noise prefixes (e.g. "WHAT DOLO 650").
  cleaned = cleaned
    .replace(
      /^(?:what|whot|who|the|this|that|is|are|please|note)\s+/i,
      '',
    )
    .trim();

  if (cleaned.length < 3) {
    return null;
  }

  return cleaned;
}
