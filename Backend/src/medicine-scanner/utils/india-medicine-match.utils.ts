import { MedicineCandidate } from '../types/medicine-information';
import { MedicineDatabaseEntry } from '../schemas/medicine-database.schema';
import { normalizeMedicineName } from './medicine-database-normalizer';

const STRENGTH_PATTERN = /\b(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml|iu)\b/i;

export function buildCandidateSearchKey(candidate: MedicineCandidate): string {
  const parts = [candidate.name, candidate.strength].filter(Boolean);
  return normalizeMedicineName(parts.join(' '));
}

export function buildPartialNameRegex(candidate: MedicineCandidate): string {
  const tokens = tokenizeSearchKey(buildCandidateSearchKey(candidate)).filter(
    (token) => !/^(mg|mcg|g|ml|iu)$/i.test(token),
  );

  const strengthNumber = candidate.strength?.match(/\d+(?:\.\d+)?/)?.[0];
  if (strengthNumber && !tokens.includes(strengthNumber)) {
    tokens.push(strengthNumber);
  }

  if (tokens.length === 0) {
    return `^${escapeRegex(normalizeMedicineName(candidate.name))}`;
  }

  return tokens.map((token) => `(?=.*\\b${escapeRegex(token)}\\b)`).join('');
}

export function isAmbiguousGenericCandidate(candidate: MedicineCandidate): boolean {
  const normalizedName = normalizeMedicineName(candidate.name);
  const tokens = tokenizeSearchKey(normalizedName);

  return tokens.length === 1 && !candidate.strength;
}

export function rankIndianMedicineMatches(
  entries: MedicineDatabaseEntry[],
  candidate: MedicineCandidate,
) {
  return entries
    .map((entry) => ({
      entry,
      score: scoreIndianMedicineMatch(entry, candidate),
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score);
}

export function scoreIndianMedicineMatch(
  entry: MedicineDatabaseEntry,
  candidate: MedicineCandidate,
): number {
  let score = 0;
  const normalizedEntryName = entry.normalizedName;
  const searchKey = buildCandidateSearchKey(candidate);
  const nameOnly = normalizeMedicineName(candidate.name);

  if (normalizedEntryName === searchKey) {
    score += 100;
  } else if (normalizedEntryName === nameOnly) {
    score += 90;
  } else if (normalizedEntryName.startsWith(`${searchKey} `)) {
    score += 85;
  } else if (normalizedEntryName.startsWith(`${nameOnly} `)) {
    score += 80;
  } else if (containsTokensInOrder(normalizedEntryName, tokenizeSearchKey(searchKey))) {
    score += 65;
  } else if (containsTokensInOrder(normalizedEntryName, tokenizeSearchKey(nameOnly))) {
    score += 55;
  }

  if (candidate.strength && strengthMatchesEntry(entry, candidate.strength)) {
    score += 25;
  }

  if (candidate.dosageForm && dosageFormMatchesEntry(entry, candidate.dosageForm)) {
    score += 15;
  }

  return score;
}

export function extractStrengthValue(text: string): string | null {
  const match = text.match(STRENGTH_PATTERN);
  if (!match) {
    return null;
  }

  return `${match[1]}${match[2]}`.toLowerCase();
}

export function strengthMatchesEntry(
  entry: MedicineDatabaseEntry,
  candidateStrength: string,
): boolean {
  const normalizedCandidateStrength = normalizeStrength(candidateStrength);
  if (!normalizedCandidateStrength) {
    return false;
  }

  const entryStrengths = [
    entry.name,
    ...(entry.compositions?.map((item) => item.raw) ?? []),
  ]
    .map((value) => extractStrengthValue(value))
    .filter((value): value is string => Boolean(value))
    .map((value) => normalizeStrength(value));

  return entryStrengths.includes(normalizedCandidateStrength);
}

export function dosageFormMatchesEntry(
  entry: MedicineDatabaseEntry,
  candidateDosageForm: string,
): boolean {
  const normalizedCandidate = normalizeDosageForm(candidateDosageForm);
  const entryValues = [
    entry.type,
    entry.name,
    entry.packSizeLabel,
  ]
    .filter(Boolean)
    .map((value) => normalizeDosageForm(value as string));

  return entryValues.some((value) => value === normalizedCandidate);
}

function tokenizeSearchKey(value: string): string[] {
  return value
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

function containsTokensInOrder(text: string, tokens: string[]): boolean {
  if (tokens.length === 0) {
    return false;
  }

  let startIndex = 0;
  for (const token of tokens) {
    const tokenIndex = text.indexOf(token, startIndex);
    if (tokenIndex < 0) {
      return false;
    }
    startIndex = tokenIndex + token.length;
  }

  return true;
}

function normalizeStrength(value: string): string {
  const match = value.match(STRENGTH_PATTERN);
  if (!match) {
    return value.replace(/\s+/g, '').toLowerCase();
  }

  return `${match[1]}${match[2].toLowerCase()}`;
}

function normalizeDosageForm(value: string): string {
  const normalized = value.toLowerCase();
  if (/\btablets?\b/.test(normalized)) {
    return 'tablet';
  }
  if (/\bcapsules?\b/.test(normalized)) {
    return 'capsule';
  }
  if (/\bsyrup\b/.test(normalized)) {
    return 'syrup';
  }
  if (/\binjection\b/.test(normalized)) {
    return 'injection';
  }
  if (/\bcream\b/.test(normalized)) {
    return 'cream';
  }
  if (/\bointment\b/.test(normalized)) {
    return 'ointment';
  }

  return normalized.trim();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
