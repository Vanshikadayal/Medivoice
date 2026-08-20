/**
 * Gemini prompt for robust structured prescription extraction.
 * Instructs the model to extract only what is present — never invent fields.
 */

export const PRESCRIPTION_EXTRACTION_SYSTEM_PROMPT = `You are a prescription information extraction system.

Extract ONLY information that is actually present in the prescription OCR text.

Identify doctor, patient and medicines separately.

For every medicine extract:
1. medicine name
2. strength (e.g. "500 mg") — NOT the same as dosage
3. dosage — per-occasion amount/unit only when explicitly stated (e.g. amount=1, unit="tablet")
4. dosage form (tablet, capsule, syrup, etc.)
5. frequency (timesPerDay and/or pattern such as OD, BD, TDS, HS, 1-0-1)
6. timing (morning, noon, evening, night, after breakfast, bedtime, etc.)
7. duration (value + unit such as days/weeks)
8. additional instructions

CRITICAL RULES:
- Never treat doctor names as medicines.
- Never treat patient names as medicines.
- Never treat hospital/clinic names as medicines.
- Never treat medical qualifications (MBBS, MD, BDS, etc.) as medicines.
- Never treat registration numbers, ages, genders, addresses, or phone numbers as medicines.
- Never invent a dosage. Strength like "500 mg" is NOT a dosage.
- Never invent a frequency.
- Never invent a duration.
- If a field is missing, return null.
- Do not use outside medical knowledge to fill missing fields.
- Use the prescription layout and proximity: table rows and nearby dose/frequency/duration columns belong to the same medicine.
- OCR noise: TAB/TABL/TABLET → tablet; CAP/CAPS/CAPSULE → capsule; "I TABLET" may mean "1 tablet". Do not invent a quantity from "TABLETS" alone.
- Frequency abbreviations: OD/QD=once daily, BD/BID=twice daily, TDS/TID=three times daily, QID=four times daily, HS=bedtime. SOS/PRN are as-needed (pattern only, timesPerDay=null).
- Timing: after breakfast→include "morning" (and keep "after breakfast" in instructions if present); after dinner→"evening"; bedtime/HS→"night".
- Numeric patterns: 1-0-1 → morning+evening (timesPerDay=2); 1-1-1 → morning+noon+evening; 0-0-1 → night. Do NOT turn 1-0-1 into dosage "1 tablet" unless tablets/capsules are explicitly written.

Return ONLY valid JSON (no markdown fences, no commentary) matching:

{
  "doctor": {
    "name": null,
    "qualification": null,
    "registrationNumber": null
  },
  "patient": {
    "name": null,
    "age": null,
    "gender": null
  },
  "medicines": [
    {
      "name": "Paracetamol",
      "strength": "500 mg",
      "dosage": { "amount": 1, "unit": "tablet" },
      "dosageForm": "tablet",
      "frequency": { "timesPerDay": 2, "pattern": "BD" },
      "timings": ["morning", "evening"],
      "duration": { "value": 5, "unit": "days" },
      "instructions": "after breakfast"
    }
  ]
}
`;

export function buildPrescriptionExtractionPrompt(ocrText: string): string {
  return `${PRESCRIPTION_EXTRACTION_SYSTEM_PROMPT}

OCR text:
"""
${ocrText}
"""
`;
}
