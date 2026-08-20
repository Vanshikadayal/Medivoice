import { Injectable } from '@nestjs/common';
import { MedicineFrequency } from '../../medicine/schemas/medicine.schema';
import { ExtractedMedicine } from '../types/extracted-medicine';
import {
  StructuredExtractedMedicine,
  StructuredPrescriptionExtraction,
} from '../types/structured-prescription';
import { cleanMedicineCandidateName } from '../utils/medicine-name-cleaner.util';
import {
  extractExplicitDose,
  normalizeDoseOcrText,
} from '../utils/dose-extraction.util';
import {
  BARE_STRENGTH_AFTER_NAME,
  DOSE_FORM_PATTERN,
  FREQUENCY_PATTERN,
  STRENGTH_PATTERN,
  extractDoctorName,
  extractPatientName,
  extractQualification,
  extractRegistrationNumber,
  isDoctorLine,
  isMedicineDetailLine,
  isNonMedicineMetadataLine,
  isPatientLine,
  looksLikeMedicineNameOnly,
  looksLikeMedicineRow,
} from './prescription-entity.rules';

const DETAIL_STARTERS =
  /^(take|tab(?:let)?s?|cap(?:sule)?s?|syrup|for|after|before|with|at|empty|once|twice|thrice|daily|od|bd|tds|qid|sos|prn|x\s*\d)/i;

const INSTRUCTION_PHRASES = [
  'empty stomach',
  'after food',
  'before food',
  'with food',
  'after meals',
  'before meals',
  'after meal',
  'before meal',
  'at bedtime',
  'before sleep',
  'before bedtime',
  'after breakfast',
  'before breakfast',
];

/**
 * Structured prescription OCR parser.
 *
 * Separates doctor / patient / medicines before any medicine DB lookup.
 */
@Injectable()
export class PrescriptionStructuredParser {
  parseStructured(extractedText: string): StructuredPrescriptionExtraction {
    const lines = this.normalizeLines(extractedText);

    const doctor = {
      name: null as string | null,
      qualification: null as string | null,
      registrationNumber: null as string | null,
    };
    const patient = {
      name: null as string | null,
      age: null as string | null,
      gender: null as string | null,
    };

    const medicineLines: string[] = [];
    let inMedicineSection = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const next = lines[i + 1] ?? '';
      const next2 = lines[i + 2] ?? '';

      if (/^(?:medicines?|medications?|drugs?|rx)\b/i.test(line)) {
        inMedicineSection = true;
        if (/^(?:medicines?|medications?|drugs?|rx)\s*:?\s*$/i.test(line)) {
          continue;
        }
      }

      if (isDoctorLine(line)) {
        const name = extractDoctorName(line);
        if (name && !doctor.name) doctor.name = name;
        const qualification = extractQualification(line);
        if (qualification) {
          doctor.qualification = doctor.qualification
            ? `${doctor.qualification}, ${qualification}`
            : qualification;
        }
        const reg = extractRegistrationNumber(line);
        if (reg) doctor.registrationNumber = reg;
        continue;
      }

      if (isPatientLine(line)) {
        if (/^(?:age)\s*[:\-]/i.test(line)) {
          patient.age =
            line.replace(/^age\s*[:\-]\s*/i, '').trim() || patient.age;
          continue;
        }
        if (/^(?:gender|sex)\s*[:\-]/i.test(line)) {
          patient.gender =
            line.replace(/^(?:gender|sex)\s*[:\-]\s*/i, '').trim() ||
            patient.gender;
          continue;
        }
        const name = extractPatientName(line);
        if (name && !patient.name) patient.name = name;
        continue;
      }

      if (isNonMedicineMetadataLine(line)) {
        const qualification = extractQualification(line);
        if (qualification && !doctor.qualification) {
          doctor.qualification = qualification;
        }
        const reg = extractRegistrationNumber(line);
        if (reg) doctor.registrationNumber = reg;
        continue;
      }

      const nameOnlyWithLookahead =
        looksLikeMedicineNameOnly(line) &&
        (isMedicineDetailLine(next) ||
          isMedicineDetailLine(next2) ||
          looksLikeMedicineRow(next));

      if (
        looksLikeMedicineRow(line) ||
        nameOnlyWithLookahead ||
        (inMedicineSection && looksLikeMedicineNameOnly(line))
      ) {
        medicineLines.push(line);
        inMedicineSection = true;
        continue;
      }

      if (
        medicineLines.length > 0 &&
        (DETAIL_STARTERS.test(line) ||
          isMedicineDetailLine(line) ||
          INSTRUCTION_PHRASES.some((p) => line.toLowerCase().includes(p)))
      ) {
        medicineLines.push(line);
      }
    }

    const medicines = this.parseMedicineLines(medicineLines).filter((m) =>
      this.isValidMedicineEntity(m, doctor.name, patient.name),
    );

    return { doctor, patient, medicines };
  }

  /** Backward-compatible medicine-only parse used by existing callers. */
  parse(extractedText: string): ExtractedMedicine[] {
    return this.parseStructured(extractedText).medicines.map((medicine) =>
      this.toExtractedMedicine(medicine),
    );
  }

  toExtractedMedicine(medicine: StructuredExtractedMedicine): ExtractedMedicine {
    return {
      name: medicine.name,
      dosage: medicine.dosage,
      frequency: this.toFrequency(medicine.frequencyPerDay),
      dosesPerDay: medicine.frequencyPerDay,
      durationDays: medicine.durationDays,
      startDate: medicine.startDate,
      instructions: medicine.instructions,
    };
  }

  private normalizeLines(extractedText: string): string[] {
    return extractedText
      .replace(/\r/g, '')
      .split('\n')
      .map((line) => line.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
  }

  private parseMedicineLines(lines: string[]): StructuredExtractedMedicine[] {
    const blocks: string[][] = [];
    let current: string[] = [];

    const isStart = (line: string) =>
      looksLikeMedicineRow(line) || looksLikeMedicineNameOnly(line);

    for (const line of lines) {
      if (isStart(line) && current.length > 0) {
        blocks.push(current);
        current = [line];
        continue;
      }
      if (isStart(line)) {
        current = [line];
        continue;
      }
      if (current.length > 0) {
        current.push(line);
      }
    }
    if (current.length > 0) {
      blocks.push(current);
    }

    if (blocks.length === 0 && lines.length > 0) {
      for (const line of lines) {
        if (isStart(line)) {
          blocks.push([line]);
        }
      }
    }

    return blocks
      .map((block) => this.parseMedicineBlock(block))
      .filter((m): m is StructuredExtractedMedicine => m !== null);
  }

  private parseMedicineBlock(lines: string[]): StructuredExtractedMedicine | null {
    const text = normalizeDoseOcrText(lines.join('\n'));
    const cleaned = cleanMedicineCandidateName(text);
    if (!cleaned.name || cleaned.name.length < 3) {
      return null;
    }

    // Reject if cleaned name is still clearly a multi-word person without Rx cues
    if (
      this.isLikelyPersonOrPlaceName(cleaned.name) &&
      !STRENGTH_PATTERN.test(text) &&
      !FREQUENCY_PATTERN.test(text) &&
      !DOSE_FORM_PATTERN.test(text)
    ) {
      return null;
    }

    const strength =
      cleaned.strength ??
      text.match(STRENGTH_PATTERN)?.[1]?.replace(/\s+/g, ' ').trim() ??
      (text.match(BARE_STRENGTH_AFTER_NAME)
        ? `${text.match(BARE_STRENGTH_AFTER_NAME)![2]} mg`
        : null);

    // Dosage = per-occasion amount only. Never use strength (500 mg) as dosage.
    const explicitDose = extractExplicitDose(text);
    const doseAmount = explicitDose?.doseAmount ?? null;
    const doseUnit =
      explicitDose?.doseUnit ?? cleaned.dosageForm ?? null;
    const dosage = explicitDose?.dosage ?? null;

    const timings = [
      ...new Set([...this.extractTimings(text), ...cleaned.timings]),
    ];
    const frequencyPerDay =
      this.extractDosesPerDay(text) ??
      (timings.length > 0 ? this.countDailySlots(timings) : null);
    const durationDays = this.extractDurationDays(text);
    const frequencyPattern = this.extractFrequencyPattern(text);
    const instructions =
      this.extractInstructions(text) ??
      (timings.length > 0 ? timings.join(', ') : null);

    return {
      name: cleaned.name,
      strength,
      dosageForm: cleaned.dosageForm ?? doseUnit,
      doseAmount,
      doseUnit,
      frequencyPerDay,
      frequencyPattern,
      timings,
      durationDays,
      dosage,
      instructions,
      startDate: this.extractStartDate(text),
    };
  }

  private countDailySlots(timings: string[]): number {
    const slots = new Set<string>();
    for (const t of timings) {
      const lower = t.toLowerCase();
      if (/breakfast|morning/.test(lower)) slots.add('morning');
      else if (/lunch|noon|afternoon/.test(lower)) slots.add('noon');
      else if (/dinner|evening/.test(lower)) slots.add('evening');
      else if (/bedtime|night/.test(lower)) slots.add('night');
    }
    return slots.size || timings.length;
  }

  private extractFrequencyPattern(text: string): string | null {
    const normalized = text.toLowerCase();
    if (/\bsos\b/.test(normalized)) return 'SOS';
    if (/\bprn\b/.test(normalized)) return 'PRN';
    if (/\b1\s*-\s*0\s*-\s*1\b/.test(normalized)) return '1-0-1';
    if (/\b1\s*-\s*1\s*-\s*1\b/.test(normalized)) return '1-1-1';
    if (/\b0\s*-\s*0\s*-\s*1\b/.test(normalized)) return '0-0-1';
    if (/\bqid\b/.test(normalized)) return 'QID';
    if (/\b(?:tds|tid)\b/.test(normalized)) return 'TDS';
    if (/\b(?:bd|bid)\b/.test(normalized)) return 'BD';
    if (/\bhs\b/.test(normalized)) return 'HS';
    if (/\b(?:od|qd)\b/.test(normalized)) return 'OD';
    return null;
  }

  private isValidMedicineEntity(
    medicine: StructuredExtractedMedicine,
    doctorName: string | null,
    patientName: string | null,
  ): boolean {
    const nameLower = medicine.name.toLowerCase();

    if (doctorName) {
      const doctorCore = doctorName
        .replace(/^dr\.?\s*/i, '')
        .toLowerCase()
        .trim();
      if (doctorCore && nameLower.includes(doctorCore)) {
        return false;
      }
      if (nameLower.includes(doctorName.toLowerCase())) {
        return false;
      }
    }

    if (patientName && nameLower.includes(patientName.toLowerCase())) {
      return false;
    }

    // Must have at least a plausible medicine name token
    if (!/[a-zA-Z]{3,}/.test(medicine.name)) {
      return false;
    }

    return true;
  }

  private isLikelyPersonOrPlaceName(line: string): boolean {
    const cleaned = line
      .replace(/^dr\.?\s*/i, '')
      .replace(/[^A-Za-z\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleaned) return false;
    if (
      STRENGTH_PATTERN.test(line) ||
      FREQUENCY_PATTERN.test(line) ||
      DOSE_FORM_PATTERN.test(line) ||
      /\d/.test(line)
    ) {
      return false;
    }
    const words = cleaned.split(/\s+/);
    // Person names are typically 2–4 Capitalized tokens — never a single brand word.
    if (words.length < 2 || words.length > 4) {
      return false;
    }
    return /^(?:[A-Z][a-z]+)(?:\s+[A-Z][a-z]+){1,3}$/.test(cleaned);
  }

  private extractDosesPerDay(text: string): number | null {
    const normalized = text.toLowerCase().replace(/[.]/g, '');

    // As-needed — not a fixed daily frequency
    if (/\b(?:sos|prn)\b/.test(normalized)) {
      return null;
    }

    const rules: Array<{ pattern: RegExp; doses: number }> = [
      {
        pattern:
          /\b(four times(?: a day| daily)?|qid|1\s*-\s*1\s*-\s*1\s*-\s*1)\b/,
        doses: 4,
      },
      {
        pattern:
          /\b(three times(?: a day| daily)?|thrice(?: daily)?|tds|tid|1\s*-\s*1\s*-\s*1)\b/,
        doses: 3,
      },
      {
        pattern:
          /\b(twice(?: a day| daily)?|bd|bid|1\s*-\s*0\s*-\s*1|1\s*-\s*1\s*-\s*0)\b/,
        doses: 2,
      },
      {
        pattern:
          /\b(once(?: a day| daily)?|\bod\b|\bqd\b|\bhs\b|1\s*-\s*0\s*-\s*0|0\s*-\s*0\s*-\s*1)\b/,
        doses: 1,
      },
    ];

    for (const rule of rules) {
      if (rule.pattern.test(normalized)) {
        return rule.doses;
      }
    }

    // "1 tablet after breakfast and dinner" / "morning and evening"
    if (
      /\b(?:breakfast|morning)\b.+\b(?:dinner|evening)\b/.test(normalized) ||
      /\b(?:dinner|evening)\b.+\b(?:breakfast|morning)\b/.test(normalized)
    ) {
      return 2;
    }

    // Count distinct "1 tablet after …" style lines as occasions.
    const occasionMatches = normalized.match(
      /\b(?:[il1]|one)\s*(?:tablet|tabl|tab|capsule|cap)s?\b/g,
    );
    if (occasionMatches && occasionMatches.length >= 2) {
      return occasionMatches.length;
    }

    return null;
  }

  private extractDurationDays(text: string): number | null {
    const weeks = text.match(/\b(?:for\s+)?(\d+)\s+weeks?\b/i);
    if (weeks) {
      const value = Number(weeks[1]) * 7;
      return value > 0 ? value : null;
    }

    const days = text.match(/\b(?:for\s+|x\s*)?(\d+)\s+days?\b/i);
    if (days) {
      const value = Number(days[1]);
      return value > 0 ? value : null;
    }

    return null;
  }

  private extractInstructions(text: string): string | null {
    const lower = text.toLowerCase();
    const found = INSTRUCTION_PHRASES.filter((phrase) => lower.includes(phrase));
    if (found.length === 0) return null;
    return [...new Set(found)].join(', ');
  }

  private extractTimings(text: string): string[] {
    const normalized = text.toLowerCase();
    const timings: string[] = [];

    if (/\bafter\s+breakfast\b/.test(normalized)) timings.push('after breakfast');
    if (/\bbefore\s+breakfast\b/.test(normalized)) timings.push('before breakfast');
    if (/\bafter\s+lunch\b/.test(normalized)) timings.push('after lunch');
    if (/\bbefore\s+lunch\b/.test(normalized)) timings.push('before lunch');
    if (/\bafter\s+dinner\b/.test(normalized)) timings.push('after dinner');
    if (/\bbefore\s+dinner\b/.test(normalized)) timings.push('before dinner');
    if (
      /\b(?:at\s+)?bedtime\b|\bbefore\s+bed(?:time)?\b|\bbefore\s+sleep\b/.test(
        normalized,
      )
    ) {
      timings.push('bedtime');
    }
    if (/\bin\s+the\s+morning\b|\bmorning\b/.test(normalized) && !/\bafter\s+breakfast\b/.test(normalized)) {
      // Prefer meal-specific labels when present; otherwise keep "morning".
      if (!timings.some((t) => /breakfast/i.test(t))) {
        timings.push('morning');
      }
    }
    if (/\bin\s+the\s+evening\b|\bevening\b/.test(normalized) && !/\bafter\s+dinner\b/.test(normalized)) {
      if (!timings.some((t) => /dinner/i.test(t))) {
        timings.push('evening');
      }
    }

    // "after breakfast and dinner" / "morning and evening"
    if (
      /\b(?:after\s+)?breakfast\s+and\s+(?:after\s+)?dinner\b/.test(normalized)
    ) {
      timings.push('after breakfast', 'after dinner');
    }
    if (/\bmorning\s+and\s+evening\b/.test(normalized)) {
      timings.push('morning', 'evening');
    }

    if (timings.length > 0) {
      return [...new Set(timings)];
    }

    if (/\b1\s*-\s*0\s*-\s*1\b|\bbd\b|\bbid\b/.test(normalized)) {
      return ['morning', 'evening'];
    }
    if (/\b1\s*-\s*1\s*-\s*1\b|\btds\b|\btid\b/.test(normalized)) {
      return ['morning', 'noon', 'evening'];
    }
    if (/\b1\s*-\s*0\s*-\s*0\b|\bod\b|\bqd\b/.test(normalized)) {
      return ['morning'];
    }
    if (/\b0\s*-\s*0\s*-\s*1\b|\bhs\b/.test(normalized)) {
      return ['night'];
    }
    if (/\bqid\b/.test(normalized)) {
      return ['morning', 'noon', 'evening', 'night'];
    }
    if (/\btwice\b/.test(normalized)) {
      return ['morning', 'evening'];
    }
    if (/\bonce\b/.test(normalized) && !/\bbedtime\b/.test(normalized)) {
      return ['morning'];
    }
    return [];
  }

  private extractStartDate(text: string): string | null {
    const labeled = text.match(
      /\b(?:start(?:ing)?(?:\s+date)?(?:\s*(?:from|on))?)\s+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2})\b/i,
    );
    if (!labeled) return null;
    return this.toIsoDate(labeled[1]);
  }

  private toIsoDate(value: string): string | null {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const parts = value.split(/[/-]/).map(Number);
    if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
      return null;
    }
    const [first, second, yearRaw] = parts;
    const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
    const date = new Date(Date.UTC(year, second - 1, first));
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== second - 1 ||
      date.getUTCDate() !== first
    ) {
      return null;
    }
    return date.toISOString().slice(0, 10);
  }

  private toFrequency(dosesPerDay: number | null): MedicineFrequency | null {
    switch (dosesPerDay) {
      case 1:
        return MedicineFrequency.ONCE_DAILY;
      case 2:
        return MedicineFrequency.TWICE_DAILY;
      case 3:
        return MedicineFrequency.THREE_TIMES_DAILY;
      case 4:
        return MedicineFrequency.FOUR_TIMES_DAILY;
      default:
        return null;
    }
  }
}
