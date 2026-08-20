import { extractActiveIngredient } from './ingredient-extractor';

describe('ingredient-extractor', () => {
  it('extracts paracetamol with strength from composition line', () => {
    const result = extractActiveIngredient(
      'Each uncoated tablet contains:\nParacetamol IP 650 mg',
    );

    expect(result?.name).toBe('Paracetamol');
    expect(result?.strength).toBe('650 MG');
  });

  it('finds known ingredient when brand is unclear', () => {
    const result = extractActiveIngredient(
      'Composition\nPARACETAM0L 650 MG TABLETS',
    );

    expect(result?.name).toBe('Paracetamol');
  });

  it('returns null when no ingredient is present', () => {
    expect(extractActiveIngredient('Batch no 12345')).toBeNull();
  });
});
