export type MedicineInformation = {
  found: boolean;
  name?: string | null;
  brandName?: string | null;
  genericName?: string | null;
  salt?: string | null;
  activeIngredient?: string | null;
  strength?: string | null;
  dosageForm?: string | null;
  usage?: string | null;
  dosageInformation?: string | null;
  warnings?: string | null;
  contraindications?: string | null;
  source?: string | null;
  sourceUrl?: string | null;
  manufacturerName?: string | null;
  sideEffects?: string[] | null;
  uses?: string[] | null;
  therapeuticClass?: string | null;
  chemicalClass?: string | null;
  habitForming?: string | null;
  actionClass?: string | null;
  isDiscontinued?: boolean | null;
  packSizeLabel?: string | null;
  price?: number | null;
  substitutes?: string[] | null;
  compositions?: Array<{ raw: string }> | null;
};

export type MedicineCandidate = {
  name: string;
  strength?: string | null;
  dosageForm?: string | null;
};
