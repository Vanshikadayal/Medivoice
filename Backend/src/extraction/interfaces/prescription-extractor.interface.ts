import { ExtractedMedicine } from '../types/extracted-medicine';
import { StructuredPrescriptionExtraction } from '../types/structured-prescription';

export const PRESCRIPTION_EXTRACTOR = 'PRESCRIPTION_EXTRACTOR';

export type PrescriptionExtractionInput = {
  imageUrl: string;
  extractedText?: string;
};

export type PrescriptionOcrInput = {
  imageUrl: string;
  imagePath: string;
};

export type PrescriptionOcrResult = {
  extractedText: string;
};

export interface PrescriptionExtractor {
  extractText(input: PrescriptionOcrInput): Promise<PrescriptionOcrResult>;

  extractMedicines(
    input: PrescriptionExtractionInput,
  ): Promise<ExtractedMedicine[]>;

  /** Optional structured doctor/patient/medicine separation. */
  extractStructured?(
    input: PrescriptionExtractionInput,
  ): Promise<StructuredPrescriptionExtraction>;
}
