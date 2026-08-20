import {
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { TesseractOcrService } from '../../ocr/tesseract-ocr.service';
import {
  PrescriptionExtractionInput,
  PrescriptionExtractor,
  PrescriptionOcrInput,
  PrescriptionOcrResult,
} from '../interfaces/prescription-extractor.interface';
import { PrescriptionMedicineParser } from '../parsers/prescription-medicine.parser';
import { ExtractedMedicine } from '../types/extracted-medicine';
import { StructuredPrescriptionExtraction } from '../types/structured-prescription';
import { validateExtractedMedicines } from '../validators/extracted-medicine.validator';
import { MedicineEntityValidator } from '../validators/medicine-entity.validator';
import { GeminiPrescriptionExtractionService } from './gemini-prescription-extraction.service';

/**
 * Prescription extractor:
 * OCR text → Gemini structured extraction → deterministic validation
 * On Gemini failure → STEP 8D deterministic parser → validation
 */
@Injectable()
export class TesseractPrescriptionExtractor implements PrescriptionExtractor {
  private readonly logger = new Logger(TesseractPrescriptionExtractor.name);

  constructor(
    private readonly tesseractOcrService: TesseractOcrService,
    private readonly prescriptionMedicineParser: PrescriptionMedicineParser,
    private readonly medicineEntityValidator: MedicineEntityValidator,
    private readonly geminiPrescriptionExtraction: GeminiPrescriptionExtractionService,
  ) {}

  async extractText(input: PrescriptionOcrInput): Promise<PrescriptionOcrResult> {
    const extractedText = await this.tesseractOcrService.recognize(
      input.imagePath,
    );
    return { extractedText };
  }

  async extractMedicines(
    input: PrescriptionExtractionInput,
  ): Promise<ExtractedMedicine[]> {
    const structured = await this.extractStructured(input);
    const medicines = structured.medicines.map((medicine) =>
      this.prescriptionMedicineParser.toExtractedMedicine(medicine),
    );

    if (medicines.length === 0) {
      throw new UnprocessableEntityException(
        'No medicines could be extracted from the prescription text',
      );
    }

    return validateExtractedMedicines(medicines);
  }

  async extractStructured(
    input: PrescriptionExtractionInput,
  ): Promise<StructuredPrescriptionExtraction> {
    const extractedText = input.extractedText?.trim() ?? '';
    if (!extractedText) {
      throw new UnprocessableEntityException(
        'Prescription OCR text is missing. Run OCR before extracting medicines.',
      );
    }

    const geminiStructured =
      await this.geminiPrescriptionExtraction.tryExtractStructured(
        extractedText,
      );

    if (geminiStructured) {
      const validatedMedicines =
        this.medicineEntityValidator.validateMedicines(
          geminiStructured.medicines,
        );

      if (validatedMedicines.length > 0) {
        this.logger.debug(
          `Gemini structured extraction accepted (${validatedMedicines.length} medicines)`,
        );
        const result = {
          doctor: geminiStructured.doctor,
          patient: geminiStructured.patient,
          medicines: validatedMedicines,
        };
        this.logDevExtraction(result, 'gemini');
        return result;
      }

      // Gemini returned structure but no valid medicines — try deterministic.
      this.logger.warn(
        'Gemini returned no valid medicines; trying deterministic parser',
      );
      const fallback = this.parseDeterministic(extractedText);
      if (fallback.medicines.length > 0) {
        const result = {
          doctor: geminiStructured.doctor.name
            ? geminiStructured.doctor
            : fallback.doctor,
          patient: geminiStructured.patient.name
            ? geminiStructured.patient
            : fallback.patient,
          medicines: fallback.medicines,
        };
        this.logDevExtraction(result, 'deterministic-after-gemini');
        return result;
      }

      this.logDevExtraction(
        { ...geminiStructured, medicines: [] },
        'gemini-empty',
      );
      return { ...geminiStructured, medicines: [] };
    }

    const deterministic = this.parseDeterministic(extractedText);
    this.logDevExtraction(deterministic, 'deterministic');
    return deterministic;
  }

  private parseDeterministic(
    extractedText: string,
  ): StructuredPrescriptionExtraction {
    const structured =
      this.prescriptionMedicineParser.parseStructured(extractedText);
    const validatedMedicines =
      this.medicineEntityValidator.validateMedicines(structured.medicines);

    return {
      doctor: structured.doctor,
      patient: structured.patient,
      medicines: validatedMedicines,
    };
  }

  private logDevExtraction(
    result: StructuredPrescriptionExtraction,
    source: string,
  ) {
    if (process.env.NODE_ENV === 'production') {
      return;
    }

    const lines = [
      'PRESCRIPTION EXTRACTION',
      `Source: ${source}`,
      `Doctor: ${result.doctor.name ?? '(none)'}`,
      `Patient: ${result.patient.name ?? '(none)'}`,
      '',
    ];

    result.medicines.forEach((medicine, index) => {
      lines.push(`Medicine ${index + 1}:`);
      lines.push(`  Name: ${medicine.name}`);
      lines.push(`  Strength: ${medicine.strength ?? 'null'}`);
      lines.push(`  Dosage: ${medicine.dosage ?? 'null'}`);
      lines.push(`  Dosage Form: ${medicine.dosageForm ?? 'null'}`);
      lines.push(
        `  Frequency: ${
          medicine.frequencyPerDay !== null
            ? `${medicine.frequencyPerDay}/day`
            : 'null'
        }${medicine.frequencyPattern ? ` (${medicine.frequencyPattern})` : ''}`,
      );
      lines.push(
        `  Timing: ${
          medicine.timings.length > 0 ? medicine.timings.join(', ') : 'null'
        }`,
      );
      lines.push(
        `  Duration: ${
          medicine.durationDays !== null
            ? `${medicine.durationDays} days`
            : 'null'
        }`,
      );
      lines.push('');
    });

    this.logger.log(lines.join('\n'));
  }
}
