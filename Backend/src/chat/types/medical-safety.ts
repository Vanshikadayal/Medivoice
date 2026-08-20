export enum MedicalQueryCategory {
  GENERAL_HEALTH = 'GENERAL_HEALTH',
  MEDICINE_INFORMATION = 'MEDICINE_INFORMATION',
  DOSAGE = 'DOSAGE',
  SIDE_EFFECT = 'SIDE_EFFECT',
  DRUG_INTERACTION = 'DRUG_INTERACTION',
  PREGNANCY = 'PREGNANCY',
  CHILD_MEDICATION = 'CHILD_MEDICATION',
  ALLERGY = 'ALLERGY',
  PRESCRIPTION_CHANGE = 'PRESCRIPTION_CHANGE',
  EMERGENCY = 'EMERGENCY',
  UNKNOWN = 'UNKNOWN',
}

export enum MedicalSafetyLevel {
  SAFE = 'SAFE',
  CAUTION = 'CAUTION',
  HIGH_RISK = 'HIGH_RISK',
  EMERGENCY = 'EMERGENCY',
}

export enum EmergencyStatus {
  NONE = 'NONE',
  DETECTED = 'DETECTED',
}

export enum GroundingStatus {
  NOT_REQUIRED = 'NOT_REQUIRED',
  REQUIRED = 'REQUIRED',
  AVAILABLE = 'AVAILABLE',
  UNAVAILABLE = 'UNAVAILABLE',
}

export type MedicalSafetyDecision = {
  level: MedicalSafetyLevel;
  category: MedicalQueryCategory;
  requiresGrounding: boolean;
  requiresProfessionalAdvice: boolean;
  emergency: boolean;
  emergencyStatus: EmergencyStatus;
  groundingStatus: GroundingStatus;
};

export type MedicalSafetyEvaluationInput = {
  message: string;
  category: MedicalQueryCategory;
  medicineFound?: boolean;
};
