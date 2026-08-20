export type ExtractedDoctorInfo = {
  name: string | null;
  qualification: string | null;
  registrationNumber: string | null;
};

export type ExtractedPatientInfo = {
  name: string | null;
  age: string | null;
  gender: string | null;
};

export type StructuredExtractedMedicine = {
  name: string;
  strength: string | null;
  dosageForm?: string | null;
  doseAmount: string | null;
  doseUnit: string | null;
  frequencyPerDay: number | null;
  /** OD/BD/TDS/HS/SOS/1-0-1 etc. when known. */
  frequencyPattern?: string | null;
  timings: string[];
  durationDays: number | null;
  /**
   * Per-occasion dosage only (e.g. "1 tablet").
   * Never copy strength (e.g. "500 mg") into this field.
   */
  dosage: string | null;
  instructions: string | null;
  startDate: string | null;
};

export type StructuredPrescriptionExtraction = {
  doctor: ExtractedDoctorInfo;
  patient: ExtractedPatientInfo;
  medicines: StructuredExtractedMedicine[];
};
