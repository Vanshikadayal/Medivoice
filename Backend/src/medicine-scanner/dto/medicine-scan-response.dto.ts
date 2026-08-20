import { MedicineCandidate, MedicineInformation } from '../types/medicine-information';

export type MedicineScanResponse = {
  success: true;
  ocrText?: string;
  candidate?: MedicineCandidate | null;
  medicine: MedicineInformation;
  message?: string;
};
