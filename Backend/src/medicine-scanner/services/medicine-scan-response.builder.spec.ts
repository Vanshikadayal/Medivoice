import {
  buildMedicineSpeechSummary,
  buildNormalizedMedicineInformation,
  buildUnknownMedicineSpeechSummary,
  confidenceForMethod,
} from '../services/medicine-scan-response.builder';

describe('medicine-scan-response.builder', () => {
  it('builds normalized medicine information', () => {
    const normalized = buildNormalizedMedicineInformation(
      {
        found: true,
        name: 'Dolo 650',
        brandName: 'Dolo 650',
        activeIngredient: 'Paracetamol',
        strength: '650 MG',
        dosageForm: 'TABLET',
        manufacturerName: 'Micro Labs',
        uses: ['Fever', 'Pain relief'],
        source: 'indian-medicine-dataset',
      },
      'MEDICINE_NAME',
      'HIGH',
    );

    expect(normalized.medicineName).toBe('Dolo 650');
    expect(normalized.activeIngredients).toContain('Paracetamol');
    expect(normalized.commonUses).toEqual(['Fever', 'Pain relief']);
    expect(normalized.identificationMethod).toBe('MEDICINE_NAME');
    expect(normalized.confidence).toBe('HIGH');
  });

  it('builds cautious ingredient fallback speech', () => {
    const normalized = buildNormalizedMedicineInformation(
      {
        found: true,
        activeIngredient: 'Paracetamol',
        strength: '650 MG',
        source: 'Active ingredient',
      },
      'INGREDIENT',
      'MEDIUM',
      {
        brandUncertain: true,
        ingredientOnly: { name: 'Paracetamol', strength: '650 MG' },
      },
    );

    const speech = buildMedicineSpeechSummary(normalized);
    expect(speech).toContain("couldn't confidently identify the brand");
    expect(speech).toContain('paracetamol');
    expect(speech).not.toContain('definitely');
  });

  it('builds unknown medicine speech', () => {
    expect(buildUnknownMedicineSpeechSummary()).toContain(
      "couldn't confidently identify",
    );
  });

  it('maps confidence by identification method', () => {
    expect(confidenceForMethod('MEDICINE_NAME', true)).toBe('HIGH');
    expect(confidenceForMethod('INGREDIENT', true)).toBe('MEDIUM');
    expect(confidenceForMethod('UNKNOWN', false)).toBe('LOW');
  });
});
