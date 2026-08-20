/**
 * Shared detection rules for separating doctor / patient / non-medicine
 * lines from prescribed medication rows in OCR text.
 */

export const DOCTOR_LINE =
  /^(?:dr\.?|doctor|physician|consultant)\b/i;

export const DOCTOR_LABEL =
  /^(?:doctor|physician|consultant)\s*[:\-]/i;

export const QUALIFICATION_TOKEN =
  /\b(?:mbbs|md|ms|bds|dm|mch|dnb|frcs|mrcs|do|dgo|dch|da|mds)\b/i;

export const REGISTRATION_LINE =
  /\b(?:reg(?:istration)?\.?\s*(?:no|number|#)?|regn\.?\s*no\.?)\b/i;

export const PATIENT_LINE =
  /^(?:patient(?:\s+name)?|pt\.?|name)\s*[:\-]/i;

export const PATIENT_FIELD =
  /^(?:age|gender|sex)\s*[:\-]/i;

export const HOSPITAL_CLINIC_LINE =
  /^(?:hospital|clinic|nursing\s+home|medical\s+centre|medical\s+center|pharmacy|address|phone|mobile|email|tel\.?)\b/i;

export const MEDICINE_SECTION_HEADER =
  /^(?:medicines?|medications?|drugs?|rx|prescription|dosage|dose|frequency|duration)\s*:?\s*$/i;

export const MEDICINE_TABLE_HEADER =
  /^(?:s\.?\s*no\.?|sl\.?\s*no\.?|#)\b.*\b(?:medicine|drug|medication)\b/i;

export const MEDICINE_COLUMN_HEADER =
  /^(?:medicine|drug|medication)\b.*\b(?:dose|frequency|duration|strength)\b/i;

export const PERSON_NAME_LIKE =
  /^(?:dr\.?\s+)?[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}$/;

export const PHONE_OR_EMAIL =
  /(?:\+?\d[\d\s\-()]{7,}\d)|(?:[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i;

export const DATE_ONLY_LINE =
  /^(?:date\s*[:\-]?\s*)?\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}$/i;

export const STRENGTH_PATTERN =
  /\b(\d+(?:\.\d+)?\s*(?:mg|mcg|ug|g|ml|iu))\b/i;

/** Indian Rx shorthand: "Dolo 650" / "Azithromycin 500" (unit implied mg). */
export const BARE_STRENGTH_AFTER_NAME =
  /\b([A-Za-z][A-Za-z0-9+-]*)\s+(\d{2,4})(?:\s|$)/;

/**
 * Explicit per-occasion dose (NOT strength).
 * Supports OCR: 1 TAB, 1 TABL, 1 TABLET, I TABLET, 1TABLET, one tablet, 1 cap.
 */
export const DOSE_FORM_PATTERN =
  /\b(?:take\s+)?([Il1]|one|\d+(?:\.\d+)?)\s*[-.]?\s*(tablets?|tabls?|tabs?|capsules?|caps?|puffs?|drops?|ml|tsp|tbsp)\b/i;

export const FREQUENCY_PATTERN =
  /\b(?:once|twice|thrice|three times|four times)(?:\s+a\s+day|\s+daily)?\b|\b(?:od|qd|bd|bid|tds|tid|qid|hs|sos|prn)\b|\b\d\s*-\s*\d(?:\s*-\s*\d){1,3}\b/i;

export const DURATION_PATTERN =
  /\b(?:for\s+|x\s*)?\d+\s+(?:days?|weeks?)\b/i;

/** OCR artifacts often prepended/appended by Tesseract near brand names. */
export const OCR_ARTIFACT_TOKENS = new Set([
  'what',
  'whot',
  'who',
  'the',
  'this',
  'that',
  'with',
  'from',
  'and',
  'for',
  'of',
  'to',
  'a',
  'an',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'or',
  'as',
  'by',
  'on',
  'in',
  'at',
  'it',
  'its',
  'take',
  'please',
  'note',
  'sign',
  'signature',
]);

export function isDoctorLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (DOCTOR_LINE.test(trimmed) || DOCTOR_LABEL.test(trimmed)) return true;
  if (REGISTRATION_LINE.test(trimmed)) return true;
  // "Ananya Sharma, MBBS" / "Ananya Sharma MBBS, MD"
  if (QUALIFICATION_TOKEN.test(trimmed) && !STRENGTH_PATTERN.test(trimmed)) {
    return true;
  }
  return false;
}

export function isPatientLine(line: string): boolean {
  const trimmed = line.trim();
  return PATIENT_LINE.test(trimmed) || PATIENT_FIELD.test(trimmed);
}

export function isNonMedicineMetadataLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;
  if (isDoctorLine(trimmed) || isPatientLine(trimmed)) return true;
  if (HOSPITAL_CLINIC_LINE.test(trimmed)) return true;
  if (MEDICINE_SECTION_HEADER.test(trimmed)) return true;
  if (MEDICINE_TABLE_HEADER.test(trimmed)) return true;
  if (MEDICINE_COLUMN_HEADER.test(trimmed)) return true;
  if (DATE_ONLY_LINE.test(trimmed)) return true;
  if (PHONE_OR_EMAIL.test(trimmed) && !STRENGTH_PATTERN.test(trimmed)) {
    return true;
  }
  // Pure qualification rows like "MBBS, MD"
  if (
    /^(?:mbbs|md|ms|bds|dm|mch|dnb)(?:\s*,\s*(?:mbbs|md|ms|bds|dm|mch|dnb))*$/i.test(
      trimmed,
    )
  ) {
    return true;
  }
  return false;
}

export function looksLikeMedicineRow(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || isNonMedicineMetadataLine(trimmed)) {
    return false;
  }

  // Dose/instruction continuation lines are not new medicine rows.
  if (
    /^(?:take|after|before|with|empty|at|for)\b/i.test(trimmed) ||
    /^(?:once|twice|thrice|three times|four times|daily|od|qd|bd|bid|tds|tid|qid|hs)\b/i.test(
      trimmed,
    ) ||
    /^\d+\s*(?:tablets?|tabls?|tabs?|capsules?|caps?|puffs?|drops?|ml)\b/i.test(
      trimmed,
    ) ||
    /^(?:[Il1]|one)\s*(?:tablets?|tabls?|tabs?|capsules?|caps?)\b/i.test(
      trimmed,
    ) ||
    /^\d\s*-\s*\d/.test(trimmed) ||
    /^(?:for\s+)?\d+\s+(?:days?|weeks?)$/i.test(trimmed)
  ) {
    return false;
  }

  const hasStrength =
    STRENGTH_PATTERN.test(trimmed) || BARE_STRENGTH_AFTER_NAME.test(trimmed);
  const hasDoseForm = DOSE_FORM_PATTERN.test(trimmed);
  const hasFrequency = FREQUENCY_PATTERN.test(trimmed);
  const hasDuration = DURATION_PATTERN.test(trimmed);
  const hasAlphaName = /[A-Za-z]{3,}/.test(
    trimmed
      .replace(STRENGTH_PATTERN, ' ')
      .replace(DOSE_FORM_PATTERN, ' ')
      .replace(/\b\d{2,4}\b/g, ' '),
  );

  if (!hasAlphaName) {
    return false;
  }

  if (hasAlphaName && (hasStrength || hasDoseForm) && (hasFrequency || hasDuration)) {
    return true;
  }

  if (hasAlphaName && hasStrength) {
    return true;
  }

  if (hasAlphaName && (hasFrequency || hasDuration) && !isDoctorLine(trimmed)) {
    return true;
  }

  return false;
}

export function extractDoctorName(line: string): string | null {
  let value = line.trim();
  value = value.replace(DOCTOR_LABEL, '').trim();
  value = value.replace(/^(?:dr\.?|doctor)\s*/i, 'Dr. ').trim();
  // Drop trailing qualifications for the name field
  const withoutQual = value
    .replace(/,?\s*(?:mbbs|md|ms|bds|dm|mch|dnb|frcs|mrcs)(?:\s*,\s*(?:mbbs|md|ms|bds|dm|mch|dnb|frcs|mrcs))*$/i, '')
    .trim();
  const name = withoutQual.replace(/\s+/g, ' ').trim();
  if (name.length < 3) return null;
  // Ensure Dr. prefix when original had it
  if (/^dr\.?\b/i.test(line) && !/^dr\./i.test(name)) {
    return `Dr. ${name.replace(/^dr\.?\s*/i, '')}`.trim();
  }
  return name;
}

export function extractPatientName(line: string): string | null {
  const match = line.match(
    /^(?:patient(?:\s+name)?|pt\.?|name)\s*[:\-]\s*(.+)$/i,
  );
  if (!match?.[1]) return null;
  const name = match[1]
    .replace(/\b(?:age|gender|sex)\s*[:\-].*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  return name.length >= 2 ? name : null;
}

export function extractQualification(line: string): string | null {
  const matches = line.match(
    /\b(?:mbbs|md|ms|bds|dm|mch|dnb|frcs|mrcs|do|dgo|dch|da|mds)\b/gi,
  );
  if (!matches?.length) return null;
  return [...new Set(matches.map((m) => m.toUpperCase()))].join(', ');
}

export function extractRegistrationNumber(line: string): string | null {
  const match = line.match(
    /\b(?:reg(?:istration)?\.?\s*(?:no|number|#)?|regn\.?\s*no\.?)\s*[:\-]?\s*([A-Za-z0-9\-\/]+)/i,
  );
  return match?.[1]?.trim() || null;
}

export function looksLikeMedicineNameOnly(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || isNonMedicineMetadataLine(trimmed)) {
    return false;
  }
  if (
    STRENGTH_PATTERN.test(trimmed) ||
    FREQUENCY_PATTERN.test(trimmed) ||
    DOSE_FORM_PATTERN.test(trimmed) ||
    DURATION_PATTERN.test(trimmed)
  ) {
    return false;
  }
  if (
    /^(?:take|after|before|with|empty|at|for|once|twice|thrice|daily)\b/i.test(
      trimmed,
    )
  ) {
    return false;
  }

  const cleaned = trimmed
    .replace(/[^A-Za-z\s+-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!/^[A-Za-z][A-Za-z0-9+\-\s]{2,}$/.test(cleaned)) {
    return false;
  }

  const words = cleaned.split(/\s+/);
  if (words.length === 0 || words.length > 4) {
    return false;
  }

  // Multi-word Title Case without Rx markers is usually a person name.
  if (
    words.length >= 2 &&
    words.length <= 3 &&
    /^(?:[A-Z][a-z]+)(?:\s+[A-Z][a-z]+){1,2}$/.test(cleaned)
  ) {
    return false;
  }

  return true;
}

export function isMedicineDetailLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (isNonMedicineMetadataLine(trimmed)) return false;
  return (
    DOSE_FORM_PATTERN.test(trimmed) ||
    FREQUENCY_PATTERN.test(trimmed) ||
    DURATION_PATTERN.test(trimmed) ||
    /^(?:take|after|before|with|empty|at)\b/i.test(trimmed)
  );
}
