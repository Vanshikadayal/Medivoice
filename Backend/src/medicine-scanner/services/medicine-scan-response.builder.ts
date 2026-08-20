import { MedicineCandidate, MedicineInformation } from '../types/medicine-information';
import {
  ConfidenceLevel,
  IdentificationMethod,
  MedicineScanApiResponse,
  NormalizedMedicineInformation,
} from '../types/normalized-medicine-information';
import { ExtractedIngredient } from '../utils/ingredient-extractor';

export function buildNormalizedMedicineInformation(
  medicine: MedicineInformation,
  identificationMethod: IdentificationMethod,
  confidence: ConfidenceLevel,
  options?: {
    brandUncertain?: boolean;
    ingredientOnly?: ExtractedIngredient | null;
  },
): NormalizedMedicineInformation {
  const activeIngredients = collectActiveIngredients(
    medicine,
    options?.ingredientOnly,
  );

  return {
    medicineName: options?.brandUncertain
      ? null
      : medicine.name ?? medicine.brandName ?? null,
    brandName: options?.brandUncertain
      ? null
      : medicine.brandName ?? medicine.name ?? null,
    activeIngredients,
    strength:
      medicine.strength ??
      options?.ingredientOnly?.strength ??
      null,
    dosageForm: medicine.dosageForm ?? null,
    manufacturer: medicine.manufacturerName ?? null,
    commonUses: collectCommonUses(medicine),
    warnings: collectWarnings(medicine),
    source: formatUserFacingSource(medicine.source),
    identificationMethod,
    confidence,
  };
}

export function buildMedicineSpeechSummary(
  identification: NormalizedMedicineInformation,
): string {
  const ingredient = identification.activeIngredients[0];
  const strength = identification.strength;
  const uses = identification.commonUses.slice(0, 2).join(' and ');

  if (
    identification.identificationMethod === 'INGREDIENT' ||
    !identification.medicineName
  ) {
    const ingredientPhrase = ingredient
      ? `the active ingredient appears to be ${ingredient.toLowerCase()}`
      : 'I could not confidently identify the active ingredient';

    const strengthPhrase =
      strength != null && strength.length > 0
        ? `, ${strength.toLowerCase()}`
        : '';

    const usePhrase =
      uses.length > 0
        ? ` Medicines containing ${ingredient?.toLowerCase() ?? 'this ingredient'} are commonly used for ${uses.toLowerCase()}.`
        : '';

    return `I couldn't confidently identify the brand, but ${ingredientPhrase}${strengthPhrase}.${usePhrase} For exact instructions, please check the package or consult a healthcare professional.`;
  }

  const name = identification.medicineName;
  const ingredientPart = ingredient
    ? ` Its active ingredient is ${ingredient.toLowerCase()}`
    : '';
  const strengthPart =
    strength != null && strength.length > 0
      ? `, ${strength.toLowerCase()}`
      : '';
  const usePart =
    uses.length > 0
      ? ` It is commonly used to ${uses.toLowerCase()}.`
      : '';

  return `I identified this medicine as ${name}.${ingredientPart}${strengthPart}.${usePart} Please follow the dosage instructions on your prescription or package.`;
}

export function buildUnknownMedicineSpeechSummary(): string {
  return "I couldn't confidently identify this medicine. Please try a clearer image showing the medicine name and active ingredient.";
}

export function buildScanResponse(params: {
  found: boolean;
  message?: string;
  ocrText?: string;
  candidate?: MedicineCandidate | null;
  medicine?: MedicineInformation | null;
  identification?: NormalizedMedicineInformation | null;
  speechSummary?: string | null;
}): MedicineScanApiResponse {
  return {
    success: true,
    found: params.found,
    message: params.message,
    ocrText: params.ocrText,
    candidate: params.candidate ?? null,
    medicine: params.medicine ?? null,
    identification: params.identification ?? null,
    speechSummary: params.speechSummary ?? null,
  };
}

function collectActiveIngredients(
  medicine: MedicineInformation,
  ingredientOnly?: ExtractedIngredient | null,
): string[] {
  const values = new Set<string>();

  if (ingredientOnly?.name) {
    values.add(ingredientOnly.name);
  }

  if (medicine.activeIngredient?.trim()) {
    values.add(medicine.activeIngredient.trim());
  }

  if (medicine.salt?.trim()) {
    values.add(medicine.salt.trim());
  }

  if (medicine.genericName?.trim()) {
    values.add(medicine.genericName.trim());
  }

  if (medicine.compositions?.length) {
    for (const composition of medicine.compositions) {
      const raw = composition.raw?.trim();
      if (raw) {
        values.add(raw);
      }
    }
  }

  return [...values];
}

function collectCommonUses(medicine: MedicineInformation): string[] {
  if (medicine.uses?.length) {
    return medicine.uses.filter(Boolean).slice(0, 6);
  }

  if (medicine.usage?.trim()) {
    const sentences = medicine.usage
      .split(/[.;]/)
      .map((part) => part.trim())
      .filter((part) => part.length > 10);

    return sentences.slice(0, 3);
  }

  return [];
}

function collectWarnings(medicine: MedicineInformation): string[] {
  const warnings: string[] = [];

  if (medicine.sideEffects?.length) {
    warnings.push(...medicine.sideEffects.filter(Boolean).slice(0, 4));
  }

  if (medicine.warnings?.trim()) {
    const parts = medicine.warnings
      .split(/[.;]/)
      .map((part) => part.trim())
      .filter((part) => part.length > 10);
    warnings.push(...parts.slice(0, 2));
  }

  return warnings.slice(0, 5);
}

function formatUserFacingSource(source?: string | null): string | null {
  if (!source) {
    return null;
  }

  const lower = source.toLowerCase();
  if (lower.includes('indian') || lower.includes('india')) {
    return 'Medicine database';
  }
  if (lower.includes('openfda') || lower.includes('fda')) {
    return 'Medicine database';
  }
  if (lower.includes('qr')) {
    return 'QR source';
  }

  return 'Medicine database';
}

export function confidenceForMethod(
  method: IdentificationMethod,
  medicineFound: boolean,
): ConfidenceLevel {
  if (!medicineFound) {
    return 'LOW';
  }

  switch (method) {
    case 'QR':
    case 'MEDICINE_NAME':
      return 'HIGH';
    case 'INGREDIENT':
      return 'MEDIUM';
    default:
      return 'LOW';
  }
}
