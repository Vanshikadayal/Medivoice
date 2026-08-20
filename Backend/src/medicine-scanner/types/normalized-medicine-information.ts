export type IdentificationMethod =
  | 'QR'
  | 'MEDICINE_NAME'
  | 'INGREDIENT'
  | 'UNKNOWN';

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export type NormalizedMedicineInformation = {
  medicineName?: string | null;
  brandName?: string | null;
  activeIngredients: string[];
  strength?: string | null;
  dosageForm?: string | null;
  manufacturer?: string | null;
  commonUses: string[];
  warnings: string[];
  source?: string | null;
  identificationMethod: IdentificationMethod;
  confidence: ConfidenceLevel;
};

export type MedicineScanApiResponse = {
  success: boolean;
  found: boolean;
  message?: string;
  ocrText?: string;
  candidate?: {
    name: string;
    strength?: string | null;
    dosageForm?: string | null;
  } | null;
  medicine?: Record<string, unknown> | null;
  identification?: NormalizedMedicineInformation | null;
  speechSummary?: string | null;
};
