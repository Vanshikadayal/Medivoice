import { Injectable } from '@nestjs/common';
import { ExtractedMedicine } from '../types/extracted-medicine';
import {
  StructuredExtractedMedicine,
  StructuredPrescriptionExtraction,
} from '../types/structured-prescription';
import { PrescriptionStructuredParser } from './prescription-structured.parser';

/**
 * Facade kept for existing DI / tests.
 * Medicine candidates come ONLY from structured extraction.medicines[].
 */
@Injectable()
export class PrescriptionMedicineParser {
  private readonly structured = new PrescriptionStructuredParser();

  parse(extractedText: string): ExtractedMedicine[] {
    return this.structured.parse(extractedText);
  }

  parseStructured(extractedText: string): StructuredPrescriptionExtraction {
    return this.structured.parseStructured(extractedText);
  }

  toExtractedMedicine(medicine: StructuredExtractedMedicine): ExtractedMedicine {
    return this.structured.toExtractedMedicine(medicine);
  }
}
