export enum PrescriptionStatus {
  UPLOADED = 'UPLOADED',
  PROCESSING = 'PROCESSING',
  REVIEW_REQUIRED = 'REVIEW_REQUIRED',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
}

export type PrescriptionExtractionSnapshot = {
  doctor: {
    name: string | null;
    qualification?: string | null;
    registrationNumber?: string | null;
  };
  patient: {
    name: string | null;
    age?: string | null;
    gender?: string | null;
  };
  medicines: ReviewMedicineSnapshot[];
  warnings: string[];
};

export type ReviewMedicineSnapshot = {
  name: string;
  strength: string | null;
  dosage: string | null;
  dosageForm: string | null;
  frequency: string | null;
  dosesPerDay: number | null;
  timings: string[];
  durationDays: number | null;
  instructions: string | null;
  confidence: number;
  warnings: string[];
};
