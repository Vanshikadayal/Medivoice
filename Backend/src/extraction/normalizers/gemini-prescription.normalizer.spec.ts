import {
  normalizeGeminiPrescriptionJson,
  parseGeminiJsonResponse,
} from './gemini-prescription.normalizer';

describe('gemini-prescription.normalizer', () => {
  it('parses fenced JSON responses', () => {
    const parsed = parseGeminiJsonResponse(`\`\`\`json
{"doctor":{"name":null},"patient":{"name":null},"medicines":[]}
\`\`\``);
    expect(normalizeGeminiPrescriptionJson(parsed)?.medicines).toEqual([]);
  });

  it('maps BD/HS abbreviations and nested dosage', () => {
    const result = normalizeGeminiPrescriptionJson({
      doctor: { name: 'Dr. A' },
      patient: { name: 'B', age: 20, gender: 'F' },
      medicines: [
        {
          name: 'dolo',
          strength: '650 mg',
          dosage: { amount: 1, unit: 'tab' },
          frequency: { timesPerDay: null, pattern: 'BD' },
          timings: [],
          duration: { value: 5, unit: 'days' },
        },
        {
          name: 'cetirizine',
          strength: '10 mg',
          dosage: { amount: 1, unit: 'tablet' },
          frequency: { pattern: 'HS' },
          timings: [],
          duration: { value: 5, unit: 'days' },
        },
      ],
    });

    expect(result?.medicines[0].dosage).toBe('1 tablet');
    expect(result?.medicines[0].frequencyPerDay).toBe(2);
    expect(result?.medicines[0].timings).toEqual(
      expect.arrayContaining(['morning', 'evening']),
    );
    expect(result?.medicines[1].frequencyPerDay).toBe(1);
    expect(result?.medicines[1].timings).toEqual(
      expect.arrayContaining(['night']),
    );
  });

  it('rejects incomplete dosage unit without amount', () => {
    const result = normalizeGeminiPrescriptionJson({
      doctor: {},
      patient: {},
      medicines: [
        {
          name: 'Paracetamol',
          strength: '500 mg',
          dosage: { amount: null, unit: 'tablet' },
          frequency: { timesPerDay: 2, pattern: 'BD' },
          timings: ['morning', 'evening'],
          duration: null,
        },
      ],
    });

    expect(result?.medicines[0].dosage).toBeNull();
  });
});
