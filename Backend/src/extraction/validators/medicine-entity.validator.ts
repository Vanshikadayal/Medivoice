import { Injectable, Logger } from '@nestjs/common';
import { StructuredExtractedMedicine } from '../types/structured-prescription';
import { cleanMedicineCandidateName } from '../utils/medicine-name-cleaner.util';
import { extractExplicitDose } from '../utils/dose-extraction.util';
import {
  DOSE_FORM_PATTERN,
  FREQUENCY_PATTERN,
  STRENGTH_PATTERN,
  isDoctorLine,
  isNonMedicineMetadataLine,
  isPatientLine,
} from '../parsers/prescription-entity.rules';

/**
 * Heuristic gate for prescription medicines.
 *
 * IMPORTANT: Does NOT call IndiaMedicineDatabaseProvider / OpenFDA.
 * Database lookup belongs only to the medicine scanner path.
 */
@Injectable()
export class MedicineEntityValidator {
  private readonly logger = new Logger(MedicineEntityValidator.name);

  /**
   * Validate and normalize medicine candidates for direct record creation.
   */
  validateMedicines(
    medicines: StructuredExtractedMedicine[],
  ): StructuredExtractedMedicine[] {
    const accepted: StructuredExtractedMedicine[] = [];

    for (const medicine of medicines) {
      const sourceLine = [
        medicine.name,
        medicine.strength,
        medicine.dosage,
        medicine.instructions,
        ...(medicine.timings ?? []),
      ]
        .filter(Boolean)
        .join(' ');

      const cleaned = cleanMedicineCandidateName(sourceLine);

      if (!cleaned.name || cleaned.name.length < 3) {
        this.logger.debug('Rejected empty/short medicine candidate');
        continue;
      }

      if (this.isRejectedEntity(cleaned.name)) {
        this.logger.debug(`Rejected non-medicine entity: ${cleaned.name}`);
        continue;
      }

      const strength = cleaned.strength ?? medicine.strength;
      const dosageForm = cleaned.dosageForm ?? medicine.doseUnit;
      const timings = [
        ...new Set([...(medicine.timings ?? []), ...cleaned.timings]),
      ];

      const hasMedicineIndicators =
        Boolean(strength) ||
        Boolean(medicine.doseAmount) ||
        Boolean(medicine.frequencyPerDay) ||
        Boolean(medicine.durationDays) ||
        timings.length > 0 ||
        Boolean(dosageForm) ||
        DOSE_FORM_PATTERN.test(sourceLine) ||
        STRENGTH_PATTERN.test(sourceLine) ||
        FREQUENCY_PATTERN.test(sourceLine);

      // Accept candidates that look like prescribed medicines (indicators)
      // OR a clean single-token brand/generic name from a medicine row.
      if (!hasMedicineIndicators && cleaned.name.split(/\s+/).length > 3) {
        this.logger.debug(
          `Rejected candidate without Rx indicators: ${cleaned.name}`,
        );
        continue;
      }

      // Dosage is per-occasion only — never copy strength into dosage.
      const explicitDose =
        medicine.dosage && !this.looksLikeStrengthOnly(medicine.dosage)
          ? {
              dosage: medicine.dosage,
              doseAmount: medicine.doseAmount,
              doseUnit: medicine.doseUnit,
            }
          : extractExplicitDose(sourceLine);

      const dosage = explicitDose?.dosage ?? null;
      const doseAmount = explicitDose?.doseAmount ?? medicine.doseAmount;
      const doseUnit =
        explicitDose?.doseUnit ?? dosageForm ?? medicine.doseUnit;

      const frequencyPerDay =
        medicine.frequencyPerDay ??
        (timings.length > 0 ? timings.length : null);

      accepted.push({
        ...medicine,
        name: cleaned.name,
        strength,
        doseAmount,
        doseUnit,
        dosageForm: dosageForm ?? doseUnit,
        dosage,
        timings,
        frequencyPerDay,
        instructions:
          medicine.instructions ??
          (timings.length > 0 ? timings.join(', ') : null),
      });
    }

    return accepted;
  }

  private looksLikeStrengthOnly(value: string): boolean {
    return /^\d+(?:\.\d+)?\s*(?:mg|mcg|ug|g|ml|iu)\s*$/i.test(value.trim());
  }

  private isRejectedEntity(name: string): boolean {
    if (
      isDoctorLine(name) ||
      isPatientLine(name) ||
      isNonMedicineMetadataLine(name)
    ) {
      return true;
    }
    const lower = name.toLowerCase();
    if (
      lower.startsWith('dr ') ||
      lower.startsWith('dr.') ||
      lower.includes('hospital') ||
      lower.includes('clinic')
    ) {
      return true;
    }
    return false;
  }
}
