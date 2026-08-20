import {
  buildCandidateSearchKey,
  buildPartialNameRegex,
  extractStrengthValue,
  isAmbiguousGenericCandidate,
  rankIndianMedicineMatches,
  scoreIndianMedicineMatch,
} from '../utils/india-medicine-match.utils';
import { normalizeMedicineName } from '../utils/medicine-database-normalizer';
import { MedicineCandidate, MedicineInformation } from '../types/medicine-information';
import { MedicineDatabaseEntry } from '../schemas/medicine-database.schema';

const MAX_PARTIAL_MATCHES = 50;
const MAX_COMPOSITION_MATCHES = 50;
const MIN_RELIABLE_MATCH_SCORE = 70;

export function mapIndianMedicineEntry(
  entry: MedicineDatabaseEntry,
): MedicineInformation {
  const compositionRaws = entry.compositions?.map((item) => item.raw).filter(Boolean) ?? [];
  const parsedIngredients = compositionRaws
    .map((raw) => extractIngredientName(raw))
    .filter((value): value is string => Boolean(value));
  const activeIngredient =
    compositionRaws.length > 0 ? compositionRaws.join('; ') : null;
  const genericName =
    parsedIngredients.length === 1 ? parsedIngredients[0] : null;
  const salt = genericName;
  const strength =
    extractStrengthFromCompositions(compositionRaws) ??
    extractStrengthFromName(entry.name);
  const dosageForm = deriveDosageForm(entry);
  const usage = entry.uses?.length ? entry.uses.join('; ') : null;
  const warnings = entry.sideEffects?.length
    ? entry.sideEffects.join('; ')
    : null;

  return {
    found: true,
    name: entry.name,
    brandName: entry.name,
    genericName,
    salt,
    activeIngredient,
    strength,
    dosageForm,
    usage,
    dosageInformation: null,
    warnings,
    contraindications: null,
    source: 'indian-medicine-dataset',
    sourceUrl: null,
    manufacturerName: entry.manufacturerName ?? null,
    sideEffects: entry.sideEffects ?? [],
    uses: entry.uses ?? [],
    therapeuticClass: entry.therapeuticClass ?? null,
    chemicalClass: entry.chemicalClass ?? null,
    habitForming: entry.habitForming ?? null,
    actionClass: entry.actionClass ?? null,
    isDiscontinued: entry.isDiscontinued ?? false,
    packSizeLabel: entry.packSizeLabel ?? null,
    price: entry.price ?? null,
    substitutes: entry.substitutes ?? [],
    compositions: entry.compositions ?? [],
  };
}

export function extractIngredientName(raw: string): string | null {
  const cleaned = raw.trim();
  if (!cleaned) {
    return null;
  }

  const match = cleaned.match(/^([A-Za-z][A-Za-z0-9\s+-]+?)(?:\s*\(|\s+\d|$)/);
  return match?.[1]?.trim() ?? null;
}

function extractStrengthFromCompositions(compositions: string[]): string | null {
  for (const composition of compositions) {
    const strength = extractStrengthValue(composition);
    if (strength) {
      return strength;
    }
  }

  return null;
}

function extractStrengthFromName(name: string): string | null {
  return extractStrengthValue(name);
}

function deriveDosageForm(entry: MedicineDatabaseEntry): string | null {
  if (entry.type?.trim()) {
    return entry.type.trim();
  }

  const name = entry.name.toLowerCase();
  if (/\btablets?\b/.test(name)) {
    return 'Tablet';
  }
  if (/\bcapsules?\b/.test(name)) {
    return 'Capsule';
  }
  if (/\bsyrup\b/.test(name)) {
    return 'Syrup';
  }
  if (/\binjection\b/.test(name)) {
    return 'Injection';
  }
  if (/\bcream\b/.test(name)) {
    return 'Cream';
  }
  if (/\bointment\b/.test(name)) {
    return 'Ointment';
  }

  return null;
}

export function buildExactSearchKeys(candidate: MedicineCandidate): string[] {
  const keys = new Set<string>();
  const combined = buildCandidateSearchKey(candidate);
  const nameOnly = normalizeMedicineName(candidate.name);

  if (combined) {
    keys.add(combined);
  }
  if (nameOnly) {
    keys.add(nameOnly);
  }

  return [...keys];
}

export function selectBestIndianMedicineMatch(
  entries: MedicineDatabaseEntry[],
  candidate: MedicineCandidate,
): MedicineDatabaseEntry | null {
  if (entries.length === 0) {
    return null;
  }

  const ranked = rankIndianMedicineMatches(entries, candidate);
  const best = ranked[0];
  if (!best) {
    return null;
  }

  const minimumScore = isAmbiguousGenericCandidate(candidate)
    ? 90
    : MIN_RELIABLE_MATCH_SCORE;

  if (best.score < minimumScore) {
    return null;
  }

  const closeCompetitors = ranked.filter(
    (item) => best.score - item.score <= 5 && item.score >= minimumScore,
  );

  if (closeCompetitors.length > 1 && isAmbiguousGenericCandidate(candidate)) {
    return null;
  }

  if (!candidate.strength && closeCompetitors.length > 1) {
    return null;
  }

  return best.entry;
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export {
  buildCandidateSearchKey,
  buildPartialNameRegex,
  isAmbiguousGenericCandidate,
  rankIndianMedicineMatches,
  scoreIndianMedicineMatch,
};
