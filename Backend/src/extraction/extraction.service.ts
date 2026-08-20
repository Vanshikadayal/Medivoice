import {
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrescriptionService } from '../prescription/prescription.service';
import { MedicineService } from '../medicine/medicine.service';
import { ReminderService } from '../reminder/reminder.service';
import { MedicineFrequency } from '../medicine/schemas/medicine.schema';
import {
  PRESCRIPTION_EXTRACTOR,
  type PrescriptionExtractor,
  type PrescriptionOcrResult,
} from './interfaces/prescription-extractor.interface';
import {
  ExtractedMedicine,
  ExtractedMedicineForCreation,
} from './types/extracted-medicine';
import { resolvePrescriptionImagePath } from '../prescription/upload/prescription-upload.options';
import {
  validateExtractedMedicinesForCreation,
  DURATION_CONFIRMATION_MESSAGE,
} from './validators/extracted-medicine.validator';
import { PrescriptionMedicineParser } from './parsers/prescription-medicine.parser';
import { StructuredPrescriptionExtraction } from './types/structured-prescription';
import { ConfirmPrescriptionDto } from './dto/confirm-prescription.dto';
import { buildExtractionSnapshot } from './utils/review-extraction.util';
import {
  PrescriptionStatus,
  ReviewMedicineSnapshot,
} from '../prescription/types/prescription-status';

type CreateMedicineInput = {
  prescriptionId: string;
  name: string;
  dosage: string;
  frequency: MedicineFrequency;
  dosesPerDay: number;
  durationDays?: number | null;
  startDate?: string;
  instructions?: string;
};

@Injectable()
export class ExtractionService {
  private readonly logger = new Logger('PrescriptionExtraction');

  constructor(
    private readonly prescriptionService: PrescriptionService,
    private readonly medicineService: MedicineService,
    private readonly reminderService: ReminderService,
    private readonly prescriptionMedicineParser: PrescriptionMedicineParser,
    @Inject(PRESCRIPTION_EXTRACTOR)
    private readonly prescriptionExtractor: PrescriptionExtractor,
  ) {}

  async extractRawText(userId: string, prescriptionId: string) {
    const prescription = await this.prescriptionService.findOne(
      userId,
      prescriptionId,
    );

    const imagePath = resolvePrescriptionImagePath(prescription.imageUrl);

    let ocrResult: PrescriptionOcrResult;
    try {
      ocrResult = await this.prescriptionExtractor.extractText({
        imageUrl: prescription.imageUrl,
        imagePath,
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'OCR failed to process the prescription image',
      );
    }

    const extractedText = ocrResult.extractedText?.trim() ?? '';
    if (!extractedText) {
      throw new UnprocessableEntityException(
        'No text was detected in the prescription image',
      );
    }

    return this.prescriptionService.update(userId, prescriptionId, {
      extractedText,
    });
  }

  async extractStructuredMedicines(userId: string, prescriptionId: string) {
    const prescription = await this.prescriptionService.findOne(
      userId,
      prescriptionId,
    );

    const structured = await this.resolveStructured(
      prescription.imageUrl,
      prescription.extractedText,
    );

    if (structured.doctor.name) {
      await this.prescriptionService.update(userId, prescriptionId, {
        doctorName: structured.doctor.name,
      });
    }

    return {
      prescriptionId,
      doctor: structured.doctor,
      patient: structured.patient,
      medicines: structured.medicines.map((medicine) =>
        this.prescriptionMedicineParser.toExtractedMedicine(medicine),
      ),
    };
  }

  /**
   * Phase A — extract only. Does NOT create medicines or reminders.
   */
  async processPrescription(userId: string, prescriptionId: string) {
    let prescription = await this.prescriptionService.findOne(
      userId,
      prescriptionId,
    );

    if (!prescription.imageUrl?.trim()) {
      throw new BadRequestException('Prescription image is required');
    }

    resolvePrescriptionImagePath(prescription.imageUrl);

    const existingMedicines = await this.medicineService.findByPrescription(
      userId,
      prescriptionId,
    );

    if (
      prescription.status === PrescriptionStatus.CONFIRMED ||
      existingMedicines.length > 0
    ) {
      const remindersCreated = await this.countRemindersForPrescription(
        userId,
        prescriptionId,
      );
      return this.buildConfirmedResponse(
        'This prescription has already been confirmed.',
        prescription,
        existingMedicines,
        remindersCreated,
      );
    }

    if (
      prescription.status === PrescriptionStatus.REVIEW_REQUIRED &&
      prescription.extractionResult?.medicines?.length
    ) {
      return this.buildReviewResponse(
        prescription,
        prescription.extractionResult,
      );
    }

    try {
      prescription = await this.prescriptionService.update(
        userId,
        prescriptionId,
        { status: PrescriptionStatus.PROCESSING },
      );

      if (!prescription.extractedText?.trim()) {
        prescription = await this.extractRawText(userId, prescriptionId);
      }

      const structured = await this.resolveStructured(
        prescription.imageUrl,
        prescription.extractedText,
      );

      const snapshot = buildExtractionSnapshot(structured);

      this.logger.log(
        `Extracted ${snapshot.medicines.length} medicines from prescription (review required)`,
      );

      if (snapshot.medicines.length === 0) {
        await this.prescriptionService.update(userId, prescriptionId, {
          status: PrescriptionStatus.FAILED,
          extractionResult: snapshot,
          doctorName: structured.doctor.name ?? undefined,
          patientName: structured.patient.name ?? undefined,
        });
        throw new UnprocessableEntityException(
          'No medicines could be extracted from the prescription text',
        );
      }

      prescription = await this.prescriptionService.update(
        userId,
        prescriptionId,
        {
          status: PrescriptionStatus.REVIEW_REQUIRED,
          extractionResult: snapshot,
          doctorName: structured.doctor.name ?? undefined,
          patientName: structured.patient.name ?? undefined,
        },
      );

      return this.buildReviewResponse(prescription, snapshot);
    } catch (error) {
      if (error instanceof HttpException) {
        if (!(error instanceof UnprocessableEntityException)) {
          try {
            await this.prescriptionService.update(userId, prescriptionId, {
              status: PrescriptionStatus.FAILED,
            });
          } catch {
            // ignore secondary status update failure
          }
        }
        throw error;
      }

      try {
        await this.prescriptionService.update(userId, prescriptionId, {
          status: PrescriptionStatus.FAILED,
        });
      } catch {
        // ignore
      }

      throw new InternalServerErrorException(
        'Unable to process this prescription.',
      );
    }
  }

  /**
   * Phase B — user-confirmed medicines → create records + reminders.
   */
  async confirmPrescription(
    userId: string,
    prescriptionId: string,
    dto: ConfirmPrescriptionDto,
  ) {
    const prescription = await this.prescriptionService.findOne(
      userId,
      prescriptionId,
    );

    const existingMedicines = await this.medicineService.findByPrescription(
      userId,
      prescriptionId,
    );

    if (
      prescription.status === PrescriptionStatus.CONFIRMED ||
      existingMedicines.length > 0
    ) {
      const remindersCreated = await this.countRemindersForPrescription(
        userId,
        prescriptionId,
      );
      return this.buildConfirmedResponse(
        'This prescription has already been confirmed.',
        prescription,
        existingMedicines,
        remindersCreated,
        true,
      );
    }

    const claimed = await this.prescriptionService.tryBeginConfirmation(
      userId,
      prescriptionId,
    );

    if (!claimed) {
      const latestMedicines = await this.medicineService.findByPrescription(
        userId,
        prescriptionId,
      );
      const latestPrescription = await this.prescriptionService.findOne(
        userId,
        prescriptionId,
      );
      const remindersCreated = await this.countRemindersForPrescription(
        userId,
        prescriptionId,
      );
      return this.buildConfirmedResponse(
        'This prescription has already been confirmed.',
        latestPrescription,
        latestMedicines,
        remindersCreated,
        true,
      );
    }

    if (!dto.medicines?.length) {
      await this.prescriptionService.update(userId, prescriptionId, {
        status: PrescriptionStatus.REVIEW_REQUIRED,
      });
      throw new BadRequestException('At least one medicine is required');
    }

    this.logger.log(
      `[PrescriptionConfirm] prescriptionId=${prescriptionId} userId=${String(userId)} medicinesToCreate=${dto.medicines.length}`,
    );

    const extractedMedicines = dto.medicines.map((medicine) =>
      this.confirmDtoToExtractedMedicine(medicine),
    );

    // Validate ALL before creating anything.
    let medicinesReadyForCreation: ExtractedMedicineForCreation[];
    try {
      medicinesReadyForCreation =
        validateExtractedMedicinesForCreation(extractedMedicines);
    } catch (error) {
      await this.prescriptionService.update(userId, prescriptionId, {
        status: PrescriptionStatus.REVIEW_REQUIRED,
      });
      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid medicine data',
      );
    }

    const medicinesToCreate = medicinesReadyForCreation.map((medicine) =>
      this.toCreateMedicineDto(prescriptionId, medicine),
    );

    this.logger.log(
      `[PrescriptionConfirm] medicinesToCreate=${medicinesToCreate.length} names=${medicinesToCreate
        .map((m) => m.name)
        .join(',')}`,
    );

    let createdMedicines;
    try {
      // createMany inserts medicines then generates reminders once per prescription.
      createdMedicines = await this.medicineService.createMany(
        userId,
        medicinesToCreate,
      );
    } catch (error) {
      await this.prescriptionService.update(userId, prescriptionId, {
        status: PrescriptionStatus.REVIEW_REQUIRED,
      });
      this.logger.warn(
        `Medicine creation failed during confirmation: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new InternalServerErrorException(
        'Unable to create medicines from this prescription. Please try again.',
      );
    }

    const createdMedicineIds = createdMedicines.map((medicine) =>
      medicine._id.toString(),
    );
    this.logger.log(
      `[PrescriptionConfirm] createdMedicineIds=${createdMedicineIds.join(',')}`,
    );
    this.logger.log(
      `[PrescriptionConfirm] generating reminders=true prescriptionId=${prescriptionId}`,
    );

    const remindersCreated = await this.countRemindersForPrescription(
      userId,
      prescriptionId,
    );

    this.logger.log(
      `[PrescriptionConfirm] createdReminderCount=${remindersCreated}`,
    );

    if (remindersCreated === 0) {
      this.logger.warn(
        `[PrescriptionConfirm] medicines saved but no reminders were created for prescriptionId=${prescriptionId}`,
      );
    }

    const updated = await this.prescriptionService.update(
      userId,
      prescriptionId,
      { status: PrescriptionStatus.CONFIRMED },
    );

    const durationConfirmationNeeded = medicinesReadyForCreation.some(
      (medicine) => medicine.durationConfirmationNeeded,
    );

    return this.buildConfirmedResponse(
      durationConfirmationNeeded
        ? `Prescription confirmed. ${DURATION_CONFIRMATION_MESSAGE}`
        : 'Prescription confirmed successfully',
      updated,
      createdMedicines,
      remindersCreated,
      false,
      durationConfirmationNeeded,
    );
  }

  async extractMedicinesFromPrescription(
    userId: string,
    prescriptionId: string,
  ) {
    // Kept for compatibility — does not create medicines (review flow owns creation).
    return this.extractStructuredMedicines(userId, prescriptionId);
  }

  private confirmDtoToExtractedMedicine(
    medicine: ConfirmPrescriptionDto['medicines'][number],
  ): ExtractedMedicine {
    const dosesPerDay =
      medicine.dosesPerDay ??
      this.dosesPerDayFromFrequencyLabel(medicine.frequency) ??
      (medicine.timings && medicine.timings.length > 0
        ? this.countDailySlots(medicine.timings)
        : null);

    const instructions =
      medicine.instructions?.trim() ||
      (medicine.timings && medicine.timings.length > 0
        ? medicine.timings.join(', ')
        : null);

    const dosage =
      medicine.dosage?.trim() &&
      !/^\d+(?:\.\d+)?\s*(?:mg|mcg|ug|g|ml|iu)\s*$/i.test(medicine.dosage.trim())
        ? medicine.dosage.trim()
        : null;

    return {
      name: medicine.name.trim(),
      dosage,
      frequency:
        dosesPerDay !== null
          ? this.frequencyFromDosesPerDay(dosesPerDay)
          : null,
      dosesPerDay,
      durationDays: medicine.durationDays ?? null,
      startDate: null,
      instructions,
    };
  }

  private dosesPerDayFromFrequencyLabel(
    frequency?: string | null,
  ): number | null {
    if (!frequency) return null;
    const normalized = frequency.trim().toLowerCase();
    if (/sos|prn/.test(normalized)) return null;
    if (/^1\s*\/\s*day$|^once/.test(normalized) || normalized === 'od' || normalized === 'qd' || normalized === 'hs') {
      return 1;
    }
    if (/^2\s*\/\s*day$|^twice|bd|bid/.test(normalized)) return 2;
    if (/^3\s*\/\s*day$|^three|tds|tid/.test(normalized)) return 3;
    if (/^4\s*\/\s*day$|qid/.test(normalized)) return 4;
    const match = normalized.match(/(\d+)\s*(?:times?|\/\s*day)/);
    if (match) {
      const n = Number(match[1]);
      return n >= 1 && n <= 4 ? n : null;
    }
    return null;
  }

  private countDailySlots(timings: string[]): number {
    const slots = new Set<string>();
    for (const t of timings) {
      const lower = t.toLowerCase();
      if (/breakfast|morning/.test(lower)) slots.add('morning');
      else if (/lunch|noon|afternoon/.test(lower)) slots.add('noon');
      else if (/dinner|evening/.test(lower)) slots.add('evening');
      else if (/bedtime|night/.test(lower)) slots.add('night');
    }
    return slots.size || timings.length;
  }

  private frequencyFromDosesPerDay(dosesPerDay: number): MedicineFrequency {
    switch (dosesPerDay) {
      case 1:
        return MedicineFrequency.ONCE_DAILY;
      case 2:
        return MedicineFrequency.TWICE_DAILY;
      case 3:
        return MedicineFrequency.THREE_TIMES_DAILY;
      case 4:
        return MedicineFrequency.FOUR_TIMES_DAILY;
      default:
        return MedicineFrequency.CUSTOM;
    }
  }

  private async resolveStructured(
    imageUrl: string,
    extractedText?: string,
  ) {
    if (this.prescriptionExtractor.extractStructured) {
      return this.prescriptionExtractor.extractStructured({
        imageUrl,
        extractedText,
      });
    }

    const medicines = await this.prescriptionExtractor.extractMedicines({
      imageUrl,
      extractedText,
    });
    return {
      doctor: { name: null, qualification: null, registrationNumber: null },
      patient: { name: null, age: null, gender: null },
      medicines: medicines.map((medicine) => ({
        name: medicine.name,
        strength: null,
        doseAmount: null,
        doseUnit: null,
        frequencyPerDay: medicine.dosesPerDay ?? null,
        timings: [] as string[],
        durationDays: medicine.durationDays ?? null,
        dosage: medicine.dosage ?? null,
        instructions: medicine.instructions ?? null,
        startDate: medicine.startDate ?? null,
      })),
    } satisfies StructuredPrescriptionExtraction;
  }

  private toCreateMedicineDto(
    prescriptionId: string,
    medicine: ExtractedMedicineForCreation,
  ): CreateMedicineInput {
    return {
      prescriptionId,
      name: medicine.name,
      dosage: medicine.dosage,
      frequency: medicine.frequency,
      dosesPerDay: medicine.dosesPerDay,
      durationDays: medicine.durationDays,
      startDate: medicine.startDate ?? undefined,
      instructions: medicine.instructions ?? undefined,
    };
  }

  private async countRemindersForPrescription(
    userId: string,
    prescriptionId: string,
  ) {
    const reminders = await this.reminderService.findAllByUser(userId);
    return reminders.filter(
      (reminder) => reminder.prescriptionId.toString() === prescriptionId,
    ).length;
  }

  private buildReviewResponse(
    prescription: {
      _id: { toString(): string };
      imageUrl: string;
      extractedText?: string;
      doctorName?: string;
      patientName?: string;
      status?: PrescriptionStatus;
    },
    snapshot: {
      doctor: { name: string | null };
      patient: { name: string | null; age?: string | null; gender?: string | null };
      medicines: ReviewMedicineSnapshot[];
      warnings: string[];
    },
  ) {
    return {
      success: true,
      prescriptionId: prescription._id.toString(),
      status: PrescriptionStatus.REVIEW_REQUIRED,
      message: 'Please review the extracted medicines before setting reminders.',
      prescription: {
        _id: prescription._id.toString(),
        imageUrl: prescription.imageUrl,
        extractedText: prescription.extractedText ?? '',
        doctorName: prescription.doctorName ?? snapshot.doctor.name ?? null,
        patientName: prescription.patientName ?? snapshot.patient.name ?? null,
        status: PrescriptionStatus.REVIEW_REQUIRED,
      },
      doctor: snapshot.doctor,
      patient: snapshot.patient,
      medicines: snapshot.medicines,
      warnings: snapshot.warnings,
      remindersCreated: 0,
    };
  }

  private buildConfirmedResponse(
    message: string,
    prescription: {
      _id: { toString(): string };
      imageUrl: string;
      extractedText?: string;
      doctorName?: string;
      patientName?: string;
    },
    medicines: Array<{
      _id: { toString(): string };
      name: string;
      dosage: string;
      dosesPerDay: number;
      durationDays?: number | null;
    }>,
    remindersCreated: number,
    alreadyConfirmed = false,
    durationConfirmationNeeded = false,
  ) {
    return {
      success: true,
      alreadyConfirmed,
      prescriptionId: prescription._id.toString(),
      status: PrescriptionStatus.CONFIRMED,
      message,
      prescription: {
        _id: prescription._id.toString(),
        imageUrl: prescription.imageUrl,
        extractedText: prescription.extractedText ?? '',
        doctorName: prescription.doctorName ?? null,
        patientName: prescription.patientName ?? null,
        status: PrescriptionStatus.CONFIRMED,
      },
      doctor: { name: prescription.doctorName ?? null },
      patient: { name: prescription.patientName ?? null },
      medicines: medicines.map((medicine) => ({
        _id: medicine._id.toString(),
        name: medicine.name,
        dosage: medicine.dosage,
        dosesPerDay: medicine.dosesPerDay,
        durationDays: medicine.durationDays ?? null,
      })),
      remindersCreated,
      durationConfirmationNeeded,
      durationConfirmationMessage: durationConfirmationNeeded
        ? DURATION_CONFIRMATION_MESSAGE
        : null,
    };
  }
}
