/**
 * Dosage (amount per occasion) helpers — distinct from strength (e.g. 500 mg).
 */

const DOSE_AMOUNT_UNIT =
  /\b(?:take\s+)?([Il1]|one)\s*[-.]?\s*(tablets?|tabls?|tabs?|capsules?|caps?|puffs?|drops?|ml|tsp|tbsp)\b/gi;

const DOSE_GLUED =
  /\b([Il1])(tablets?|tabls?|tabs?|capsules?|caps?)\b/gi;

const UNIT_ALIASES: Record<string, string> = {
  tablet: 'tablet',
  tablets: 'tablet',
  tabl: 'tablet',
  tabls: 'tablet',
  tab: 'tablet',
  tabs: 'tablet',
  capsule: 'capsule',
  capsules: 'capsule',
  cap: 'capsule',
  caps: 'capsule',
  puff: 'puff',
  puffs: 'puff',
  drop: 'drop',
  drops: 'drop',
  ml: 'ml',
  tsp: 'tsp',
  tbsp: 'tbsp',
};

/** Normalize OCR quirks before dose matching (I TABLET → 1 tablet, 1TABL → 1 tablet). */
export function normalizeDoseOcrText(text: string): string {
  return (text ?? '')
    .replace(/\bI(?=\s*(?:tab|cap|tabl))/gi, '1')
    .replace(/\bl(?=\s*(?:tab|cap|tabl))/gi, '1')
    .replace(/\b1\s*TABLETS?\b/gi, '1 tablet')
    .replace(/\b1\s*TABLS?\b/gi, '1 tablet')
    .replace(/\b1\s*TABS?\b/gi, '1 tablet')
    .replace(/\b1TABLETS?\b/gi, '1 tablet')
    .replace(/\b1TABLS?\b/gi, '1 tablet')
    .replace(/\b1TABS?\b/gi, '1 tablet')
    .replace(/\b1\s*CAPSULES?\b/gi, '1 capsule')
    .replace(/\b1\s*CAPS?\b/gi, '1 capsule')
    .replace(/\b1CAPSULES?\b/gi, '1 capsule')
    .replace(/\b1CAPS?\b/gi, '1 capsule')
    .replace(/\bone\s+(tablet|tab|capsule|cap)\b/gi, '1 $1');
}

export function normalizeDoseUnit(raw: string): string {
  const key = raw.toLowerCase().replace(/\s+/g, '');
  return UNIT_ALIASES[key] ?? raw.toLowerCase();
}

export function normalizeDoseAmount(raw: string): string {
  const value = raw.trim().toLowerCase();
  if (value === 'one' || value === 'i' || value === 'l') {
    return '1';
  }
  return value;
}

export type ExtractedDose = {
  doseAmount: string;
  doseUnit: string;
  dosage: string;
};

/**
 * Extract explicit per-occasion dosage (e.g. "1 tablet").
 * Does NOT treat strength (500 mg) as dosage.
 */
export function extractExplicitDose(text: string): ExtractedDose | null {
  const normalized = normalizeDoseOcrText(text);

  DOSE_AMOUNT_UNIT.lastIndex = 0;
  let match = DOSE_AMOUNT_UNIT.exec(normalized);
  if (!match) {
    DOSE_GLUED.lastIndex = 0;
    match = DOSE_GLUED.exec(normalized);
  }
  if (!match) {
    return null;
  }

  const doseAmount = normalizeDoseAmount(match[1]);
  const doseUnit = normalizeDoseUnit(match[2]);
  return {
    doseAmount,
    doseUnit,
    dosage: `${doseAmount} ${doseUnit}`,
  };
}
