import { StructuredPrescriptionExtraction } from '../types/structured-prescription';
import {
  normalizeDoseAmount,
  normalizeDoseUnit,
} from '../utils/dose-extraction.util';

type UnknownRecord = Record<string, unknown>;

/**
 * Normalize Gemini (or similar) JSON into the existing StructuredPrescriptionExtraction shape.
 * Accepts both nested STEP 8E schema and flat STEP 8D-compatible fields.
 */
export function normalizeGeminiPrescriptionJson(
  raw: unknown,
): StructuredPrescriptionExtraction | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }

  const root = raw as UnknownRecord;
  const doctorRaw = asRecord(root.doctor);
  const patientRaw = asRecord(root.patient);
  const medicinesRaw = Array.isArray(root.medicines) ? root.medicines : null;

  if (!medicinesRaw) {
    return null;
  }

  const medicines = medicinesRaw
    .map((item) => normalizeMedicine(item))
    .filter((m): m is NonNullable<typeof m> => m !== null);

  return {
    doctor: {
      name: asNullableString(doctorRaw?.name),
      qualification: asNullableString(doctorRaw?.qualification),
      registrationNumber: asNullableString(
        doctorRaw?.registrationNumber ?? doctorRaw?.registration,
      ),
    },
    patient: {
      name: asNullableString(patientRaw?.name),
      age: normalizeAge(patientRaw?.age),
      gender: asNullableString(patientRaw?.gender),
    },
    medicines,
  };
}

function normalizeMedicine(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  const m = raw as UnknownRecord;
  const name = asNullableString(m.name);
  if (!name || name.length < 2) {
    return null;
  }

  const strength = normalizeStrength(m.strength);
  const dosageInfo = normalizeDosage(m);
  const dosageForm =
    normalizeDoseUnit(
      asNullableString(m.dosageForm) ??
        asNullableString(m.doseUnit) ??
        dosageInfo.doseUnit ??
        '',
    ) || null;

  const frequency = normalizeFrequency(m);
  const timings = normalizeTimings(m.timings, frequency.pattern, m.instructions);
  const durationDays = normalizeDurationDays(m);
  const instructions = buildInstructions(m, timings);

  // Prefer frequency timesPerDay; else unique daily slots when fixed daily pattern
  let frequencyPerDay = frequency.timesPerDay;
  if (frequencyPerDay === null && timings.length > 0 && !frequency.isAsNeeded) {
    frequencyPerDay = countDailySlots(timings) || null;
  }

  return {
    name: toTitleCaseName(name),
    strength,
    dosageForm: dosageForm || dosageInfo.doseUnit,
    doseAmount: dosageInfo.doseAmount,
    doseUnit: dosageInfo.doseUnit ?? dosageForm,
    frequencyPerDay,
    frequencyPattern: frequency.pattern,
    timings,
    durationDays,
    dosage: dosageInfo.dosage,
    instructions,
    startDate: asNullableString(m.startDate),
  };
}

function normalizeDosage(m: UnknownRecord): {
  doseAmount: string | null;
  doseUnit: string | null;
  dosage: string | null;
} {
  // Nested: dosage: { amount, unit }
  const nested = asRecord(m.dosage);
  if (nested) {
    const amountRaw = nested.amount;
    const unitRaw = asNullableString(nested.unit);
    if (
      (amountRaw === null || amountRaw === undefined) &&
      !unitRaw
    ) {
      return { doseAmount: null, doseUnit: null, dosage: null };
    }
    if (amountRaw === null || amountRaw === undefined || !unitRaw) {
      // Incomplete — do not invent quantity from unit alone
      return {
        doseAmount: null,
        doseUnit: unitRaw ? normalizeDoseUnit(unitRaw) : null,
        dosage: null,
      };
    }
    const doseAmount = normalizeDoseAmount(String(amountRaw));
    const doseUnit = normalizeDoseUnit(unitRaw);
    if (!doseAmount || !doseUnit || looksLikeStrengthUnit(doseUnit)) {
      return { doseAmount: null, doseUnit: null, dosage: null };
    }
    return {
      doseAmount,
      doseUnit,
      dosage: `${doseAmount} ${doseUnit}`,
    };
  }

  // Flat legacy: dosage string / doseAmount + doseUnit
  const flatDosage = asNullableString(m.dosage);
  if (flatDosage && !looksLikeStrengthOnly(flatDosage)) {
    const match = flatDosage.match(
      /^(\d+(?:\.\d+)?|one)\s*(tablet|tabl|tab|capsule|cap|puff|drop|ml|tsp|tbsp)s?$/i,
    );
    if (match) {
      const doseAmount = normalizeDoseAmount(match[1]);
      const doseUnit = normalizeDoseUnit(match[2]);
      return {
        doseAmount,
        doseUnit,
        dosage: `${doseAmount} ${doseUnit}`,
      };
    }
  }

  const doseAmount = asNullableString(m.doseAmount);
  const doseUnitRaw = asNullableString(m.doseUnit);
  if (doseAmount && doseUnitRaw && !looksLikeStrengthUnit(doseUnitRaw)) {
    const unit = normalizeDoseUnit(doseUnitRaw);
    const amount = normalizeDoseAmount(doseAmount);
    return {
      doseAmount: amount,
      doseUnit: unit,
      dosage: `${amount} ${unit}`,
    };
  }

  return { doseAmount: null, doseUnit: null, dosage: null };
}

function normalizeFrequency(m: UnknownRecord): {
  timesPerDay: number | null;
  pattern: string | null;
  isAsNeeded: boolean;
} {
  const nested = asRecord(m.frequency);
  let pattern =
    asNullableString(nested?.pattern) ??
    asNullableString(m.frequencyPattern) ??
    null;
  let timesPerDay =
    asNullableNumber(nested?.timesPerDay) ??
    asNullableNumber(m.frequencyPerDay) ??
    asNullableNumber(m.dosesPerDay);

  if (typeof m.frequency === 'string') {
    pattern = pattern ?? m.frequency;
  }

  const abbr = normalizeFrequencyAbbreviation(pattern);
  if (abbr) {
    pattern = abbr.pattern;
    if (timesPerDay === null) {
      timesPerDay = abbr.timesPerDay;
    }
    return {
      timesPerDay: abbr.isAsNeeded ? null : timesPerDay,
      pattern: abbr.pattern,
      isAsNeeded: abbr.isAsNeeded,
    };
  }

  if (timesPerDay !== null && (timesPerDay < 1 || timesPerDay > 4)) {
    timesPerDay = null;
  }

  return {
    timesPerDay,
    pattern,
    isAsNeeded: false,
  };
}

function normalizeFrequencyAbbreviation(pattern: string | null): {
  pattern: string;
  timesPerDay: number | null;
  isAsNeeded: boolean;
} | null {
  if (!pattern) return null;
  const p = pattern.trim().toUpperCase().replace(/\s+/g, '');

  if (p === 'SOS' || p === 'PRN') {
    return { pattern: p, timesPerDay: null, isAsNeeded: true };
  }
  if (p === 'OD' || p === 'QD' || p === 'ONCEDAILY' || p === 'ONCE') {
    return { pattern: 'OD', timesPerDay: 1, isAsNeeded: false };
  }
  if (p === 'BD' || p === 'BID' || p === 'TWICEDAILY' || p === 'TWICE') {
    return { pattern: 'BD', timesPerDay: 2, isAsNeeded: false };
  }
  if (p === 'TDS' || p === 'TID' || p === 'THRICEDAILY' || p === 'THREETIMESDAILY') {
    return { pattern: 'TDS', timesPerDay: 3, isAsNeeded: false };
  }
  if (p === 'QID' || p === 'FOURTIMESDAILY') {
    return { pattern: 'QID', timesPerDay: 4, isAsNeeded: false };
  }
  if (p === 'HS' || p === 'BEDTIME') {
    return { pattern: 'HS', timesPerDay: 1, isAsNeeded: false };
  }
  if (/^1-0-1$/.test(p) || /^1\s*-\s*0\s*-\s*1$/.test(pattern)) {
    return { pattern: '1-0-1', timesPerDay: 2, isAsNeeded: false };
  }
  if (/^1-1-1$/.test(p)) {
    return { pattern: '1-1-1', timesPerDay: 3, isAsNeeded: false };
  }
  if (/^0-0-1$/.test(p)) {
    return { pattern: '0-0-1', timesPerDay: 1, isAsNeeded: false };
  }
  if (/^1-0-0$/.test(p)) {
    return { pattern: '1-0-0', timesPerDay: 1, isAsNeeded: false };
  }
  return null;
}

function normalizeTimings(
  raw: unknown,
  pattern: string | null,
  instructions: unknown,
): string[] {
  const timings: string[] = [];
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const mapped = mapTimingToken(String(item ?? ''));
      timings.push(...mapped);
    }
  }

  const instructionText = asNullableString(instructions);
  if (instructionText) {
    timings.push(...extractTimingsFromText(instructionText));
  }

  if (timings.length === 0 && pattern) {
    timings.push(...timingsFromPattern(pattern));
  }

  return [...new Set(timings.map((t) => t.toLowerCase().trim()).filter(Boolean))];
}

function mapTimingToken(token: string): string[] {
  const t = token.toLowerCase().trim();
  if (!t) return [];

  if (/after\s+breakfast|before\s+breakfast|breakfast/.test(t)) {
    return t.includes('before') ? ['before breakfast'] : ['after breakfast', 'morning'];
  }
  if (/after\s+lunch|before\s+lunch|lunch|noon|afternoon/.test(t)) {
    if (t.includes('before')) return ['before lunch'];
    if (t.includes('afternoon')) return ['afternoon', 'noon'];
    return t.includes('lunch') ? ['after lunch', 'noon'] : ['noon'];
  }
  if (/after\s+dinner|before\s+dinner|dinner|evening/.test(t)) {
    return t.includes('before')
      ? ['before dinner']
      : t.includes('evening')
        ? ['evening']
        : ['after dinner', 'evening'];
  }
  if (/bedtime|before\s+bed|before\s+sleep|night|hs\b/.test(t)) {
    return ['bedtime', 'night'];
  }
  if (/morning/.test(t)) return ['morning'];
  if (/noon/.test(t)) return ['noon'];
  if (/evening/.test(t)) return ['evening'];
  if (/night/.test(t)) return ['night'];
  return [t];
}

function extractTimingsFromText(text: string): string[] {
  const lower = text.toLowerCase();
  const out: string[] = [];
  if (/after\s+breakfast/.test(lower)) out.push('after breakfast', 'morning');
  if (/after\s+lunch/.test(lower)) out.push('after lunch', 'noon');
  if (/after\s+dinner/.test(lower)) out.push('after dinner', 'evening');
  if (/bedtime|before\s+bed|before\s+sleep/.test(lower)) {
    out.push('bedtime', 'night');
  }
  if (/\bmorning\b/.test(lower)) out.push('morning');
  if (/\bevening\b/.test(lower)) out.push('evening');
  if (/\bnoon\b/.test(lower)) out.push('noon');
  if (/\bnight\b/.test(lower)) out.push('night');
  return out;
}

function timingsFromPattern(pattern: string): string[] {
  const p = pattern.toUpperCase().replace(/\s+/g, '');
  if (p === '1-0-1' || p === 'BD' || p === 'BID') {
    return ['morning', 'evening'];
  }
  if (p === '1-1-1' || p === 'TDS' || p === 'TID') {
    return ['morning', 'noon', 'evening'];
  }
  if (p === '0-0-1' || p === 'HS') {
    return ['night'];
  }
  if (p === '1-0-0' || p === 'OD' || p === 'QD') {
    return ['morning'];
  }
  if (p === 'QID') {
    return ['morning', 'noon', 'evening', 'night'];
  }
  return [];
}

function normalizeDurationDays(m: UnknownRecord): number | null {
  const nested = asRecord(m.duration);
  if (nested) {
    const value = asNullableNumber(nested.value);
    const unit = (asNullableString(nested.unit) ?? 'days').toLowerCase();
    if (value === null || value < 1) return null;
    if (/week/.test(unit)) return value * 7;
    if (/day/.test(unit)) return value;
    return value;
  }
  return asNullableNumber(m.durationDays);
}

function normalizeStrength(raw: unknown): string | null {
  const text = asNullableString(raw);
  if (!text) return null;
  if (looksLikeStrengthOnly(text) || /\d/.test(text)) {
    return text.replace(/\s+/g, ' ').trim();
  }
  return text;
}

function buildInstructions(m: UnknownRecord, timings: string[]): string | null {
  const explicit = asNullableString(m.instructions);
  if (explicit) return explicit;
  if (timings.length === 0) return null;
  // Prefer meal-specific labels for instructions when present
  const meal = timings.filter((t) =>
    /breakfast|lunch|dinner|bedtime|food|meal/.test(t),
  );
  return (meal.length > 0 ? meal : timings).join(', ');
}

function countDailySlots(timings: string[]): number {
  const slots = new Set<string>();
  for (const t of timings) {
    const lower = t.toLowerCase();
    if (/breakfast|morning/.test(lower)) slots.add('morning');
    else if (/lunch|noon|afternoon/.test(lower)) slots.add('noon');
    else if (/dinner|evening/.test(lower)) slots.add('evening');
    else if (/bedtime|night/.test(lower)) slots.add('night');
  }
  return slots.size;
}

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as UnknownRecord;
}

function asNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function asNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function normalizeAge(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  return String(value).trim() || null;
}

function looksLikeStrengthOnly(value: string): boolean {
  return /^\d+(?:\.\d+)?\s*(?:mg|mcg|ug|g|ml|iu)\s*$/i.test(value.trim());
}

function looksLikeStrengthUnit(unit: string): boolean {
  return /^(?:mg|mcg|ug|g|ml|iu)$/i.test(unit.trim());
}

function toTitleCaseName(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => {
      if (/^\d/.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(' ')
    .trim();
}

/** Strip markdown fences and parse JSON from a model response. */
export function parseGeminiJsonResponse(text: string): unknown {
  let cleaned = (text ?? '').trim();
  if (!cleaned) {
    throw new Error('Empty Gemini response');
  }

  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    cleaned = fenced[1].trim();
  }

  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Gemini response did not contain JSON object');
  }

  return JSON.parse(cleaned.slice(start, end + 1));
}
