import {
  buildMedicineAwarePrompt,
  formatMedicineContext,
} from './medicine-context-formatter.util';

describe('medicine context formatter', () => {
  const medicine = {
    found: true,
    name: 'Dolo 650 Tablet',
    genericName: 'Paracetamol',
    activeIngredient: 'Paracetamol (650mg)',
    strength: '650 MG',
    dosageForm: 'Tablet',
    manufacturerName: 'Micro Labs Ltd',
    uses: ['Pain relief', 'Treatment of Fever'],
    sideEffects: ['Nausea'],
    source: 'indian-medicine-dataset',
    sourceUrl: null,
  };

  it('formats medicine information for Gemini context', () => {
    const context = formatMedicineContext(medicine);

    expect(context).toContain('Trusted Indian medicine database record:');
    expect(context).toContain('Name: Dolo 650 Tablet');
    expect(context).toContain('Uses: Pain relief; Treatment of Fever');
  });

  it('builds a medicine-aware prompt', () => {
    const prompt = buildMedicineAwarePrompt(
      'What is it used for?',
      formatMedicineContext(medicine),
    );

    expect(prompt).toContain('Trusted Indian medicine database record:');
    expect(prompt).toContain('User question: What is it used for?');
  });
});
