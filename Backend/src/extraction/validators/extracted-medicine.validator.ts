import { BadRequestException, UnprocessableEntityException } from '@nestjs/common';
import { MedicineFrequency } from '../../medicine/schemas/medicine.schema';
import { ExtractedMedicine, ExtractedMedicineForCreation } from '../types/extracted-medicine';

const VALID_FREQUENCIES = new Set(Object.values(MedicineFrequency));

export const DURATION_CONFIRMATION_MESSAGE =
  'Duration not found. Please confirm the duration.';

export function validateExtractedMedicines(medicines: ExtractedMedicine[]) {
  if (!Array.isArray(medicines)) {
    throw new BadRequestException('Extracted medicines must be an array');
  }

  const validated: ExtractedMedicine[] = [];

  for (const [index, medicine] of medicines.entries()) {
    const name = medicine.name?.trim();
    if (!name) {
      throw new BadRequestException(
        `Medicine at index ${index} is missing a valid name`,
      );
    }

    const dosage =
      medicine.dosage === null || medicine.dosage === undefined
        ? null
        : medicine.dosage.trim();
    if (dosage !== null && !dosage) {
      throw new BadRequestException(
        `Medicine "${name}" has an invalid dosage value`,
      );
    }

    // Strength must never be treated as dosage (e.g. "500mg").
    const normalizedDosage =
      dosage && looksLikeStrengthOnly(dosage) ? null : dosage;

    const dosesPerDay = normalizeOptionalInteger(medicine.dosesPerDay);
    if (
      dosesPerDay !== null &&
      (dosesPerDay < 1 || dosesPerDay > 4)
    ) {
      throw new BadRequestException(
        `Medicine "${name}" has an invalid dosesPerDay value`,
      );
    }

    const durationDays = normalizeOptionalInteger(medicine.durationDays);
    if (durationDays !== null && durationDays < 1) {
      throw new BadRequestException(
        `Medicine "${name}" has an invalid durationDays value`,
      );
    }

    const frequency = medicine.frequency ?? null;
    if (frequency !== null && !VALID_FREQUENCIES.has(frequency)) {
      throw new BadRequestException(
        `Medicine "${name}" has an invalid frequency value`,
      );
    }

    const startDate =
      medicine.startDate === null || medicine.startDate === undefined
        ? null
        : medicine.startDate.trim();
    if (startDate !== null && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      throw new BadRequestException(
        `Medicine "${name}" has an invalid startDate value`,
      );
    }

    const instructions =
      medicine.instructions === null || medicine.instructions === undefined
        ? null
        : medicine.instructions.trim();
    if (instructions !== null && !instructions) {
      throw new BadRequestException(
        `Medicine "${name}" has an invalid instructions value`,
      );
    }

    validated.push({
      name,
      dosage: normalizedDosage,
      frequency,
      dosesPerDay,
      durationDays,
      startDate,
      instructions,
    });
  }

  return validated;
}

export function validateExtractedMedicinesForCreation(
  medicines: ExtractedMedicine[],
): ExtractedMedicineForCreation[] {
  const validated = validateExtractedMedicines(medicines);
  const ready: ExtractedMedicineForCreation[] = [];

  for (const medicine of validated) {
    const dosesPerDay =
      medicine.dosesPerDay ??
      (medicine.frequency
        ? dosesPerDayFromFrequency(medicine.frequency)
        : null);

    // Dosage is optional when timing/frequency is enough to schedule reminders.
    // Do not invent a dosage; store empty string when the Rx did not state one.
    if (!medicine.dosage && dosesPerDay === null) {
      throw new UnprocessableEntityException(
        `Medicine "${medicine.name}" is missing dosage and cannot be created`,
      );
    }

    if (dosesPerDay === null || dosesPerDay === undefined) {
      throw new UnprocessableEntityException(
        `Medicine "${medicine.name}" is missing dosesPerDay and cannot be created`,
      );
    }

    // Do NOT invent a clinical duration. Keep null when missing.
    const durationDays = medicine.durationDays ?? null;

    ready.push({
      name: medicine.name,
      dosage: medicine.dosage ?? '',
      frequency:
        medicine.frequency ?? frequencyFromDosesPerDay(dosesPerDay),
      dosesPerDay,
      durationDays,
      startDate: medicine.startDate,
      instructions: medicine.instructions,
      durationConfirmationNeeded: durationDays === null,
    });
  }

  return ready;
}

function looksLikeStrengthOnly(value: string): boolean {
  return /^\d+(?:\.\d+)?\s*(?:mg|mcg|ug|g|ml|iu)\s*$/i.test(value.trim());
}

function frequencyFromDosesPerDay(dosesPerDay: number): MedicineFrequency {
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
      throw new BadRequestException(
        `Cannot derive frequency from dosesPerDay value ${dosesPerDay}`,
      );
  }
}

function dosesPerDayFromFrequency(frequency: MedicineFrequency): number | null {
  switch (frequency) {
    case MedicineFrequency.ONCE_DAILY:
      return 1;
    case MedicineFrequency.TWICE_DAILY:
      return 2;
    case MedicineFrequency.THREE_TIMES_DAILY:
      return 3;
    case MedicineFrequency.FOUR_TIMES_DAILY:
      return 4;
    default:
      return null;
  }
}

function normalizeOptionalInteger(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  if (!Number.isInteger(value)) {
    return null;
  }

  return value;
}
