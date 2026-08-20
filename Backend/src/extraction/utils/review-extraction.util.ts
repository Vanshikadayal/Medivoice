import { StructuredExtractedMedicine } from '../../extraction/types/structured-prescription';
import {
  PrescriptionExtractionSnapshot,
  ReviewMedicineSnapshot,
} from '../../prescription/types/prescription-status';
import { StructuredPrescriptionExtraction } from '../../extraction/types/structured-prescription';

/**
 * Heuristic extraction-quality score (0–1). Not medically authoritative.
 */
export function computeExtractionConfidence(
  medicine: StructuredExtractedMedicine,
): number {
  let score = 0.35; // has a name
  if (medicine.strength) score += 0.15;
  if (medicine.dosage) score += 0.2;
  if (medicine.frequencyPerDay || medicine.frequencyPattern) score += 0.15;
  if (medicine.timings?.length) score += 0.05;
  if (medicine.durationDays) score += 0.1;
  return Math.min(1, Math.round(score * 100) / 100);
}

export function buildMedicineWarnings(
  medicine: StructuredExtractedMedicine,
): string[] {
  const warnings: string[] = [];
  if (!medicine.dosage?.trim()) {
    warnings.push(`Dosage not found for ${medicine.name}`);
  }
  if (medicine.durationDays === null || medicine.durationDays === undefined) {
    warnings.push(`Duration not found for ${medicine.name}`);
  }
  if (
    (medicine.frequencyPerDay === null ||
      medicine.frequencyPerDay === undefined) &&
    (!medicine.timings || medicine.timings.length === 0)
  ) {
    warnings.push(`Frequency could not be determined for ${medicine.name}`);
  }
  return warnings;
}

export function formatFrequencyLabel(
  dosesPerDay: number | null,
  pattern?: string | null,
): string | null {
  if (pattern && /^(SOS|PRN)$/i.test(pattern)) {
    return pattern.toUpperCase();
  }
  if (dosesPerDay === 1) return '1/day';
  if (dosesPerDay === 2) return '2/day';
  if (dosesPerDay === 3) return '3/day';
  if (dosesPerDay === 4) return '4/day';
  if (pattern) return pattern;
  return null;
}

export function toReviewMedicineSnapshot(
  medicine: StructuredExtractedMedicine,
): ReviewMedicineSnapshot {
  const warnings = buildMedicineWarnings(medicine);
  return {
    name: medicine.name,
    strength: medicine.strength,
    dosage: medicine.dosage,
    dosageForm: medicine.dosageForm ?? medicine.doseUnit ?? null,
    frequency: formatFrequencyLabel(
      medicine.frequencyPerDay,
      medicine.frequencyPattern,
    ),
    dosesPerDay: medicine.frequencyPerDay,
    timings: medicine.timings ?? [],
    durationDays: medicine.durationDays,
    instructions: medicine.instructions,
    confidence: computeExtractionConfidence(medicine),
    warnings,
  };
}

export function buildExtractionSnapshot(
  structured: StructuredPrescriptionExtraction,
): PrescriptionExtractionSnapshot {
  const medicines = structured.medicines.map(toReviewMedicineSnapshot);
  const warnings = [
    ...new Set(medicines.flatMap((m) => m.warnings)),
  ];
  if (medicines.length === 0) {
    warnings.push('Prescription text was unclear');
  }
  return {
    doctor: {
      name: structured.doctor.name,
      qualification: structured.doctor.qualification,
      registrationNumber: structured.doctor.registrationNumber,
    },
    patient: {
      name: structured.patient.name,
      age: structured.patient.age,
      gender: structured.patient.gender,
    },
    medicines,
    warnings,
  };
}
