import { MedicineFrequency } from '../../medicine/schemas/medicine.schema';

export class ExtractedMedicine {
  name!: string;
  dosage?: string | null;
  frequency?: MedicineFrequency | null;
  dosesPerDay?: number | null;
  durationDays?: number | null;
  startDate?: string | null;
  instructions?: string | null;
}

export type ExtractedMedicineForCreation = {
  name: string;
  /** Empty string when prescription has no explicit per-occasion dosage. */
  dosage: string;
  frequency: MedicineFrequency;
  dosesPerDay: number;
  /** null when prescription did not state duration (not invented). */
  durationDays: number | null;
  startDate?: string | null;
  instructions?: string | null;
  durationConfirmationNeeded?: boolean;
};
