import { MedicineCandidate, MedicineInformation } from '../types/medicine-information';

export const MEDICINE_DATABASE_PROVIDER = 'MEDICINE_DATABASE_PROVIDER';

export interface MedicineDatabaseProvider {
  searchByCandidate(candidate: MedicineCandidate): Promise<MedicineInformation>;
  lookupByBarcode(barcode: string): Promise<MedicineInformation>;
}
