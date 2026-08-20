import { MedicineInformation } from 'src/medicine-scanner/types/medicine-information';

export function formatMedicineContext(medicine: MedicineInformation): string {
  if (!medicine.found) {
    return '';
  }

  const lines = [
    'Trusted Indian medicine database record:',
    medicine.name ? `Name: ${medicine.name}` : null,
    medicine.genericName ? `Generic name: ${medicine.genericName}` : null,
    medicine.activeIngredient
      ? `Active ingredient(s): ${medicine.activeIngredient}`
      : null,
    medicine.strength ? `Strength: ${medicine.strength}` : null,
    medicine.dosageForm ? `Dosage form: ${medicine.dosageForm}` : null,
    medicine.manufacturerName
      ? `Manufacturer: ${medicine.manufacturerName}`
      : null,
    medicine.uses?.length ? `Uses: ${medicine.uses.join('; ')}` : null,
    medicine.sideEffects?.length
      ? `Side effects: ${medicine.sideEffects.join('; ')}`
      : null,
    medicine.therapeuticClass
      ? `Therapeutic class: ${medicine.therapeuticClass}`
      : null,
    medicine.chemicalClass ? `Chemical class: ${medicine.chemicalClass}` : null,
    medicine.habitForming ? `Habit forming: ${medicine.habitForming}` : null,
    medicine.packSizeLabel ? `Pack size: ${medicine.packSizeLabel}` : null,
    medicine.price != null ? `Price (INR): ${medicine.price}` : null,
    medicine.isDiscontinued ? 'Status: Discontinued' : null,
    medicine.substitutes?.length
      ? `Substitutes: ${medicine.substitutes.slice(0, 5).join('; ')}`
      : null,
  ].filter((line): line is string => Boolean(line));

  return lines.join('\n');
}

export function buildMedicineAwarePrompt(
  message: string,
  medicineContext: string,
): string {
  if (!medicineContext) {
    return message;
  }

  return `${medicineContext}

Use the trusted medicine database record above as your primary factual source when answering. If the record does not contain the answer, say so instead of guessing.

User question: ${message}`;
}
