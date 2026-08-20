import { Inject, Injectable, Logger } from '@nestjs/common';
import { unlink } from 'fs/promises';
import { TesseractOcrService } from '../ocr/tesseract-ocr.service';
import {
  MEDICINE_DATABASE_PROVIDER,
  type MedicineDatabaseProvider,
} from './providers/medicine-database.provider';
import { IngredientFallbackService } from './services/ingredient-fallback.service';
import { QrMedicineResolverService } from './services/qr-medicine-resolver.service';
import {
  buildMedicineSpeechSummary,
  buildNormalizedMedicineInformation,
  buildScanResponse,
  buildUnknownMedicineSpeechSummary,
  confidenceForMethod,
} from './services/medicine-scan-response.builder';
import { extractMedicineCandidate } from './utils/medicine-candidate-extractor';
import { extractActiveIngredient } from './utils/ingredient-extractor';
import { applyOcrTolerance } from './utils/ocr-tolerance.normalizer';
import {
  hasUsefulMedicineOcrText,
  normalizeMedicineOcrText,
} from './ocr/medicine-ocr-text.normalizer';
import { MedicineCandidate, MedicineInformation } from './types/medicine-information';
import { IdentificationMethod } from './types/normalized-medicine-information';

@Injectable()
export class MedicineScannerService {
  private readonly logger = new Logger(MedicineScannerService.name);

  constructor(
    @Inject(MEDICINE_DATABASE_PROVIDER)
    private readonly medicineDatabaseProvider: MedicineDatabaseProvider,
    private readonly tesseractOcrService: TesseractOcrService,
    private readonly ingredientFallbackService: IngredientFallbackService,
    private readonly qrMedicineResolverService: QrMedicineResolverService,
  ) {}

  async lookupBarcode(barcode: string) {
    const normalizedBarcode = barcode.trim();
    const qrResult =
      await this.qrMedicineResolverService.resolve(normalizedBarcode);

    if (qrResult.found && qrResult.medicine) {
      return this.buildSuccessResponse({
        medicine: qrResult.medicine,
        candidate: qrResult.candidate ?? null,
        identificationMethod: 'QR',
      });
    }

    if (qrResult.message) {
      return buildScanResponse({
        found: false,
        message: qrResult.message,
        candidate: qrResult.candidate ?? null,
        medicine: qrResult.medicine ?? null,
        speechSummary: qrResult.message,
      });
    }

    return buildScanResponse({
      found: false,
      message:
        'Unable to retrieve medicine information from this QR code.',
      speechSummary:
        'Unable to retrieve medicine information from this QR code.',
    });
  }

  async scanMedicineImage(imagePath: string) {
    try {
      const rawOcrText = await this.tesseractOcrService.recognize(imagePath);
      const normalizedOcr = normalizeMedicineOcrText(rawOcrText);
      const ocrText = applyOcrTolerance(normalizedOcr);

      if (!hasUsefulMedicineOcrText(ocrText)) {
        return buildScanResponse({
          found: false,
          ocrText: ocrText || undefined,
          message:
            'Could not read the medicine label clearly. Please capture a clearer image.',
          speechSummary: buildUnknownMedicineSpeechSummary(),
        });
      }

      const candidate = extractMedicineCandidate(ocrText);
      if (candidate?.name) {
        const nameResult = await this.lookupByMedicineName(candidate, ocrText);
        if (nameResult.found) {
          return nameResult;
        }
      }

      const ingredient = extractActiveIngredient(ocrText);
      if (ingredient) {
        const ingredientResult = await this.lookupByIngredientFallback(
          ingredient,
          ocrText,
          candidate,
        );
        if (ingredientResult) {
          return ingredientResult;
        }
      }

      return buildScanResponse({
        found: false,
        ocrText,
        candidate: candidate ?? null,
        message:
          "I couldn't confidently identify this medicine. Please try a clearer image showing the medicine name and active ingredient.",
        speechSummary: buildUnknownMedicineSpeechSummary(),
      });
    } finally {
      await this.deleteTemporaryImage(imagePath);
    }
  }

  private async lookupByMedicineName(
    candidate: MedicineCandidate,
    ocrText?: string,
  ) {
    const medicine =
      await this.medicineDatabaseProvider.searchByCandidate(candidate);

    if (!medicine.found) {
      return buildScanResponse({
        found: false,
        ocrText,
        candidate,
        medicine,
        message:
          'Medicine could not be identified from the available medicine databases.',
      });
    }

    return this.buildSuccessResponse({
      medicine,
      candidate,
      identificationMethod: 'MEDICINE_NAME',
      ocrText,
    });
  }

  private async lookupByIngredientFallback(
    ingredient: NonNullable<ReturnType<typeof extractActiveIngredient>>,
    ocrText: string,
    candidate: MedicineCandidate | null,
  ) {
    const fallback =
      await this.ingredientFallbackService.lookupByIngredient(ingredient);

    if (!fallback) {
      const ingredientOnlyMedicine: MedicineInformation = {
        found: true,
        name: null,
        brandName: null,
        genericName: ingredient.name,
        activeIngredient: ingredient.name,
        strength: ingredient.strength ?? null,
        source: 'Active ingredient',
        sourceUrl: null,
      };

      const identification = buildNormalizedMedicineInformation(
        ingredientOnlyMedicine,
        'INGREDIENT',
        'MEDIUM',
        { brandUncertain: true, ingredientOnly: ingredient },
      );

      return buildScanResponse({
        found: true,
        ocrText,
        candidate,
        medicine: ingredientOnlyMedicine,
        identification,
        speechSummary: buildMedicineSpeechSummary(identification),
        message:
          'Brand not confidently identified. Information is based on the active ingredient.',
      });
    }

    return this.buildSuccessResponse({
      medicine: fallback.medicine,
      candidate,
      identificationMethod: 'INGREDIENT',
      ocrText,
      brandUncertain: true,
      ingredientOnly: ingredient,
      message:
        'Brand not confidently identified. Information is based on the active ingredient.',
    });
  }

  private buildSuccessResponse(params: {
    medicine: MedicineInformation;
    candidate?: MedicineCandidate | null;
    identificationMethod: IdentificationMethod;
    ocrText?: string;
    brandUncertain?: boolean;
    ingredientOnly?: ReturnType<typeof extractActiveIngredient>;
    message?: string;
  }) {
    const confidence = confidenceForMethod(
      params.identificationMethod,
      true,
    );
    const identification = buildNormalizedMedicineInformation(
      params.medicine,
      params.identificationMethod,
      confidence,
      {
        brandUncertain: params.brandUncertain,
        ingredientOnly: params.ingredientOnly,
      },
    );

    return buildScanResponse({
      found: true,
      ocrText: params.ocrText,
      candidate: params.candidate ?? null,
      medicine: params.medicine,
      identification,
      speechSummary: buildMedicineSpeechSummary(identification),
      message: params.message,
    });
  }

  private async deleteTemporaryImage(imagePath: string) {
    try {
      await unlink(imagePath);
    } catch {
      // Temporary OCR files are best-effort cleanup only.
    }
  }
}
