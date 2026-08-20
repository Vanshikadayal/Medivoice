import {
  EMERGENCY_RESPONSE_MESSAGE,
  MedicalSafetyService,
} from './medical-safety.service';
import {
  GroundingStatus,
  MedicalQueryCategory,
  MedicalSafetyLevel,
} from '../types/medical-safety';

describe('MedicalSafetyService', () => {
  let service: MedicalSafetyService;

  beforeEach(() => {
    service = new MedicalSafetyService();
  });

  it('returns SAFE for medicine information with grounding available', () => {
    const decision = service.evaluate({
      message: 'What is Dolo 650?',
      category: MedicalQueryCategory.MEDICINE_INFORMATION,
      medicineFound: true,
    });

    expect(decision).toEqual({
      level: MedicalSafetyLevel.SAFE,
      category: MedicalQueryCategory.MEDICINE_INFORMATION,
      requiresGrounding: true,
      requiresProfessionalAdvice: false,
      emergency: false,
      emergencyStatus: 'NONE',
      groundingStatus: GroundingStatus.AVAILABLE,
    });
  });

  it('returns HIGH_RISK for dosage questions', () => {
    const decision = service.evaluate({
      message: 'How many Dolo 650 tablets should I take?',
      category: MedicalQueryCategory.DOSAGE,
      medicineFound: true,
    });

    expect(decision.level).toBe(MedicalSafetyLevel.HIGH_RISK);
    expect(decision.requiresProfessionalAdvice).toBe(true);
    expect(decision.requiresGrounding).toBe(true);
  });

  it('returns HIGH_RISK for prescription change questions', () => {
    const decision = service.evaluate({
      message: 'Can I stop taking my antibiotics?',
      category: MedicalQueryCategory.PRESCRIPTION_CHANGE,
      medicineFound: false,
    });

    expect(decision.level).toBe(MedicalSafetyLevel.HIGH_RISK);
    expect(decision.requiresProfessionalAdvice).toBe(true);
  });

  it('returns CAUTION for drug interaction questions', () => {
    const decision = service.evaluate({
      message: 'Can I take Dolo with ibuprofen?',
      category: MedicalQueryCategory.DRUG_INTERACTION,
      medicineFound: true,
    });

    expect(decision.level).toBe(MedicalSafetyLevel.CAUTION);
    expect(decision.requiresProfessionalAdvice).toBe(true);
  });

  it('returns EMERGENCY for emergency categories', () => {
    const decision = service.evaluate({
      message: "I can't breathe and my throat is swelling.",
      category: MedicalQueryCategory.EMERGENCY,
      medicineFound: false,
    });

    expect(decision.level).toBe(MedicalSafetyLevel.EMERGENCY);
    expect(decision.emergency).toBe(true);
    expect(decision.requiresGrounding).toBe(false);
  });

  it('returns unavailable grounding when medicine is not found', () => {
    const decision = service.evaluate({
      message: 'What is Zorvaxium?',
      category: MedicalQueryCategory.MEDICINE_INFORMATION,
      medicineFound: false,
    });

    expect(decision.groundingStatus).toBe(GroundingStatus.UNAVAILABLE);
  });

  it('returns a controlled emergency response message', () => {
    expect(service.buildEmergencyResponse()).toBe(EMERGENCY_RESPONSE_MESSAGE);
    expect(service.buildEmergencyResponse()).toContain(
      'urgent medical attention',
    );
  });
});
