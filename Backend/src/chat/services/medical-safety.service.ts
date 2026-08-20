import { Injectable } from '@nestjs/common';
import {
  EmergencyStatus,
  GroundingStatus,
  MedicalQueryCategory,
  MedicalSafetyDecision,
  MedicalSafetyEvaluationInput,
  MedicalSafetyLevel,
} from '../types/medical-safety';

export const EMERGENCY_RESPONSE_MESSAGE =
  'This may require urgent medical attention. Please seek immediate emergency medical care or contact your local emergency service now. If possible, have the medicine package or container with you and tell the healthcare professional what was taken.';

@Injectable()
export class MedicalSafetyService {
  evaluate(input: MedicalSafetyEvaluationInput): MedicalSafetyDecision {
    const { category, medicineFound = false } = input;

    if (category === MedicalQueryCategory.EMERGENCY) {
      return {
        level: MedicalSafetyLevel.EMERGENCY,
        category,
        requiresGrounding: false,
        requiresProfessionalAdvice: true,
        emergency: true,
        emergencyStatus: EmergencyStatus.DETECTED,
        groundingStatus: GroundingStatus.NOT_REQUIRED,
      };
    }

    const requiresGrounding = this.requiresGrounding(category);
    const groundingStatus = this.resolveGroundingStatus(
      requiresGrounding,
      medicineFound,
    );

    return {
      level: this.resolveSafetyLevel(category),
      category,
      requiresGrounding,
      requiresProfessionalAdvice: this.requiresProfessionalAdvice(category),
      emergency: false,
      emergencyStatus: EmergencyStatus.NONE,
      groundingStatus,
    };
  }

  buildEmergencyResponse(): string {
    return EMERGENCY_RESPONSE_MESSAGE;
  }

  private requiresGrounding(category: MedicalQueryCategory): boolean {
    return [
      MedicalQueryCategory.MEDICINE_INFORMATION,
      MedicalQueryCategory.SIDE_EFFECT,
      MedicalQueryCategory.DOSAGE,
      MedicalQueryCategory.DRUG_INTERACTION,
      MedicalQueryCategory.ALLERGY,
      MedicalQueryCategory.PREGNANCY,
      MedicalQueryCategory.CHILD_MEDICATION,
    ].includes(category);
  }

  private requiresProfessionalAdvice(category: MedicalQueryCategory): boolean {
    return [
      MedicalQueryCategory.DOSAGE,
      MedicalQueryCategory.DRUG_INTERACTION,
      MedicalQueryCategory.PREGNANCY,
      MedicalQueryCategory.CHILD_MEDICATION,
      MedicalQueryCategory.ALLERGY,
      MedicalQueryCategory.PRESCRIPTION_CHANGE,
    ].includes(category);
  }

  private resolveSafetyLevel(
    category: MedicalQueryCategory,
  ): MedicalSafetyLevel {
    switch (category) {
      case MedicalQueryCategory.DOSAGE:
      case MedicalQueryCategory.PRESCRIPTION_CHANGE:
      case MedicalQueryCategory.PREGNANCY:
      case MedicalQueryCategory.CHILD_MEDICATION:
        return MedicalSafetyLevel.HIGH_RISK;
      case MedicalQueryCategory.DRUG_INTERACTION:
      case MedicalQueryCategory.ALLERGY:
        return MedicalSafetyLevel.CAUTION;
      case MedicalQueryCategory.GENERAL_HEALTH:
      case MedicalQueryCategory.MEDICINE_INFORMATION:
      case MedicalQueryCategory.SIDE_EFFECT:
        return MedicalSafetyLevel.SAFE;
      default:
        return MedicalSafetyLevel.CAUTION;
    }
  }

  private resolveGroundingStatus(
    requiresGrounding: boolean,
    medicineFound: boolean,
  ): GroundingStatus {
    if (!requiresGrounding) {
      return GroundingStatus.NOT_REQUIRED;
    }

    return medicineFound
      ? GroundingStatus.AVAILABLE
      : GroundingStatus.UNAVAILABLE;
  }
}
