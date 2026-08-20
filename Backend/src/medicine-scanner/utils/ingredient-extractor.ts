import { applyOcrTolerance } from './ocr-tolerance.normalizer';

const STRENGTH_PATTERN =
  /\b(\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu))\b/i;

const INGREDIENT_LINE_PATTERN =
  /\b([A-Za-z][A-Za-z0-9+-]{2,})\s+(?:\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu))?\s*(?:ip|bp|usp)?\b/i;

const CONTAINS_PATTERN =
  /(?:each|contains|composition)\s+(?:uncoated\s+)?(?:tablet|capsule|ml)?\s*(?:contains?)?\s*:?\s*([A-Za-z][A-Za-z0-9\s+-]{2,}?)(?:\s+\d|\s*$)/i;

const KNOWN_INGREDIENTS = [
  'paracetamol',
  'acetaminophen',
  'ibuprofen',
  'amoxicillin',
  'azithromycin',
  'cetirizine',
  'omeprazole',
  'metformin',
  'atorvastatin',
  'amlodipine',
  'losartan',
  'pantoprazole',
  'diclofenac',
  'levocetirizine',
  'montelukast',
  'clavulanate',
  'amoxycillin',
];

export type ExtractedIngredient = {
  name: string;
  strength?: string | null;
};

export function extractActiveIngredient(
  ocrText: string,
): ExtractedIngredient | null {
  const tolerantText = applyOcrTolerance(ocrText);
  const lines = tolerantText
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  for (const line of lines) {
    const containsMatch = line.match(CONTAINS_PATTERN);
    if (containsMatch?.[1]) {
      const parsed = parseIngredientPhrase(containsMatch[1], line);
      if (parsed) {
        return parsed;
      }
    }

    const ingredientMatch = line.match(INGREDIENT_LINE_PATTERN);
    if (ingredientMatch?.[1]) {
      const name = ingredientMatch[1].trim();
      if (isLikelyIngredient(name)) {
        return {
          name: normalizeIngredientName(name),
          strength: extractStrength(line),
        };
      }
    }
  }

  const known = findKnownIngredient(tolerantText);
  if (known) {
    return {
      name: known,
      strength: extractStrength(ocrText),
    };
  }

  return null;
}

function parseIngredientPhrase(
  phrase: string,
  fullLine: string,
): ExtractedIngredient | null {
  const cleaned = phrase
    .replace(/\b(?:ip|bp|usp)\b/gi, '')
    .replace(STRENGTH_PATTERN, '')
    .replace(/[^A-Za-z0-9\s+-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length < 4 || !isLikelyIngredient(cleaned)) {
    return null;
  }

  return {
    name: normalizeIngredientName(cleaned.split(/\s+/).slice(0, 2).join(' ')),
    strength: extractStrength(fullLine),
  };
}

function findKnownIngredient(text: string): string | null {
  const lower = text.toLowerCase();
  for (const ingredient of KNOWN_INGREDIENTS) {
    if (lower.includes(ingredient)) {
      return normalizeIngredientName(ingredient);
    }
  }
  return null;
}

function isLikelyIngredient(value: string): boolean {
  const cleaned = value.trim();
  if (cleaned.length < 4) {
    return false;
  }

  const lower = cleaned.toLowerCase();
  const blocked = [
    'tablet',
    'capsule',
    'each',
    'contains',
    'composition',
    'manufactured',
    'batch',
    'strip',
    'what',
    'brand',
  ];

  if (blocked.some((word) => lower === word || lower.startsWith(`${word} `))) {
    return false;
  }

  return /[aeiou]/i.test(cleaned);
}

function normalizeIngredientName(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }

  return trimmed
    .split(/\s+/)
    .map(
      (word) =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join(' ');
}

function extractStrength(text: string): string | null {
  const match = text.match(STRENGTH_PATTERN);
  return match ? match[1].replace(/\s+/g, ' ').trim().toUpperCase() : null;
}
