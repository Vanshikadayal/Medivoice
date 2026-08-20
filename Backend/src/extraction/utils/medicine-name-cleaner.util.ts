import {
  BARE_STRENGTH_AFTER_NAME,
  STRENGTH_PATTERN,
  OCR_ARTIFACT_TOKENS,
} from '../parsers/prescription-entity.rules';

export type CleanedMedicineCandidate = {
  name: string;
  strength: string | null;
  dosageForm: string | null;
  timings: string[];
};

const TIMING_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bafter\s+breakfast\b/gi, label: 'after breakfast' },
  { pattern: /\bbefore\s+breakfast\b/gi, label: 'before breakfast' },
  { pattern: /\bafter\s+lunch\b/gi, label: 'after lunch' },
  { pattern: /\bbefore\s+lunch\b/gi, label: 'before lunch' },
  { pattern: /\bafter\s+dinner\b/gi, label: 'after dinner' },
  { pattern: /\bbefore\s+dinner\b/gi, label: 'before dinner' },
  { pattern: /\bafter\s+meals?\b/gi, label: 'after meals' },
  { pattern: /\bbefore\s+meals?\b/gi, label: 'before meals' },
  { pattern: /\bat\s+bedtime\b/gi, label: 'bedtime' },
  { pattern: /\bbefore\s+bed(?:time)?\b/gi, label: 'bedtime' },
  { pattern: /\bbefore\s+sleep\b/gi, label: 'bedtime' },
  { pattern: /\bbedtime\b/gi, label: 'bedtime' },
  { pattern: /\bin\s+the\s+morning\b/gi, label: 'morning' },
  { pattern: /\bin\s+the\s+evening\b/gi, label: 'evening' },
  { pattern: /\bat\s+night\b/gi, label: 'night' },
];

const DOSAGE_FORM_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\btablets?\b/i, label: 'tablet' },
  { pattern: /\btabs?\b/i, label: 'tablet' },
  { pattern: /\bcapsules?\b/i, label: 'capsule' },
  { pattern: /\bcaps?\b/i, label: 'capsule' },
  { pattern: /\bsyrup\b/i, label: 'syrup' },
  { pattern: /\binjection\b/i, label: 'injection' },
  { pattern: /\bdrops?\b/i, label: 'drop' },
];

/**
 * Cleans OCR-contaminated medicine lines into structured fields.
 *
 * Example:
 * "PARACETAMOL AFTER BREAKFAST AFTER DINNER 500 MG TABLETS"
 * → name=Paracetamol, strength=500 MG, dosageForm=tablet,
 *   timings=[after breakfast, after dinner]
 */
export function cleanMedicineCandidateName(raw: string): CleanedMedicineCandidate {
  let text = (raw ?? '').replace(/\s+/g, ' ').trim();
  if (!text) {
    return { name: '', strength: null, dosageForm: null, timings: [] };
  }

  const timings: string[] = [];
  for (const { pattern, label } of TIMING_PATTERNS) {
    if (pattern.test(text)) {
      timings.push(label);
      text = text.replace(pattern, ' ');
    }
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0;
  }

  let dosageForm: string | null = null;
  for (const { pattern, label } of DOSAGE_FORM_PATTERNS) {
    if (pattern.test(text)) {
      dosageForm = label;
      break;
    }
  }

  const strengthMatches = [...text.matchAll(new RegExp(STRENGTH_PATTERN, 'gi'))];
  let strength =
    strengthMatches.length > 0
      ? strengthMatches[strengthMatches.length - 1][1]
          .replace(/\s+/g, ' ')
          .trim()
          .toUpperCase()
      : null;

  if (!strength) {
    const bare = text.match(BARE_STRENGTH_AFTER_NAME);
    if (bare?.[2]) {
      strength = `${bare[2]} MG`;
    }
  }

  // Normalize "500 MG" → "500 mg" style for API/UI consistency when returning.
  const strengthDisplay = strength
    ? strength.replace(/\s+/g, ' ').replace(/MG\b/i, 'mg').replace(/ML\b/i, 'ml')
    : null;

  let withoutStrength = text.replace(new RegExp(STRENGTH_PATTERN, 'gi'), ' ');
  withoutStrength = withoutStrength.replace(
    /\b([A-Za-z][A-Za-z0-9+-]*)\s+(\d{2,4})\b/g,
    '$1 ',
  );

  withoutStrength = withoutStrength
    .replace(/\b\d+\s*(?:tablets?|tabs?|capsules?|caps?|puffs?|drops?)\b/gi, ' ')
    .replace(/\b(?:tablets?|tabs?|capsules?|caps?|syrup|injection|drops?)\b/gi, ' ')
    .replace(/\b\d\s*-\s*\d(?:\s*-\s*\d){0,3}\b/g, ' ')
    .replace(
      /\b(?:once|twice|thrice|three times|four times)(?:\s+a\s+day|\s+daily)?\b/gi,
      ' ',
    )
    .replace(/\b(?:od|qd|bd|bid|tds|tid|qid|hs|sos|prn)\b/gi, ' ')
    .replace(/\b(?:for\s+)?\d+\s+(?:days?|weeks?)\b/gi, ' ')
    .replace(
      /\b(?:morning|noon|evening|night|breakfast|lunch|dinner|food|meal|meals)\b/gi,
      ' ',
    )
    .replace(/[^A-Za-z0-9+\-\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const tokens = withoutStrength
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !OCR_ARTIFACT_TOKENS.has(token.toLowerCase()))
    .filter((token) => !/^\d+$/.test(token));

  // Brand/generic name only — do NOT append strength into the name.
  let name = tokens.join(' ').trim();

  name = name
    .split(/\s+/)
    .map((part) => {
      if (/^\d/.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(' ')
    .trim();

  return {
    name,
    strength: strengthDisplay,
    dosageForm,
    timings: [...new Set(timings)],
  };
}
