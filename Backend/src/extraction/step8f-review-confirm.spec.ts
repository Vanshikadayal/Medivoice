import { PrescriptionMedicineParser } from './parsers/prescription-medicine.parser';
import { MedicineEntityValidator } from './validators/medicine-entity.validator';
import {
  buildExtractionSnapshot,
  computeExtractionConfidence,
  toReviewMedicineSnapshot,
} from './utils/review-extraction.util';
import { validateExtractedMedicinesForCreation } from './validators/extracted-medicine.validator';
import { ExtractionService } from './extraction.service';
import { PrescriptionStatus } from '../prescription/types/prescription-status';
import { MedicineFrequency } from '../medicine/schemas/medicine.schema';
import { IndiaMedicineDatabaseProvider } from '../medicine-scanner/providers/india-medicine-database.provider';
import * as prescriptionUpload from '../prescription/upload/prescription-upload.options';

describe('STEP 8F — review then confirm', () => {
  const parser = new PrescriptionMedicineParser();
  const validator = new MedicineEntityValidator();

  beforeAll(() => {
    jest
      .spyOn(prescriptionUpload, 'resolvePrescriptionImagePath')
      .mockReturnValue('/tmp/rx.jpg');
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  function extract(text: string) {
    const structured = parser.parseStructured(text);
    return {
      ...structured,
      medicines: validator.validateMedicines(structured.medicines),
    };
  }

  it('builds review snapshot without inventing dosage from strength', () => {
    const structured = extract(`Paracetamol 500 mg
1 tablet after breakfast
1 tablet after dinner
5 days`);

    const snapshot = buildExtractionSnapshot(structured);
    expect(snapshot.medicines).toHaveLength(1);
    const med = snapshot.medicines[0];
    expect(med.name).toBe('Paracetamol');
    expect(med.strength?.toLowerCase()).toContain('500');
    expect(med.dosage).toMatch(/1\s*tablet/i);
    expect(med.dosesPerDay).toBe(2);
    expect(med.timings.join(' ')).toMatch(/breakfast|morning/i);
    expect(med.timings.join(' ')).toMatch(/dinner|evening/i);
    expect(med.durationDays).toBe(5);
    expect(med.confidence).toBeGreaterThan(0.7);
    expect(med.dosage).not.toMatch(/500/);
  });

  it('Cetirizine bedtime review fields', () => {
    const structured = extract(`Cetirizine 10 mg
1 tablet at bedtime
5 days`);
    const med = toReviewMedicineSnapshot(structured.medicines[0]);
    expect(med.name).toBe('Cetirizine');
    expect(med.strength?.toLowerCase()).toContain('10');
    expect(med.dosage).toMatch(/1\s*tablet/i);
    expect(med.dosesPerDay).toBe(1);
    expect(med.timings.join(' ')).toMatch(/bedtime|night/i);
    expect(med.durationDays).toBe(5);
  });

  it('strength-only does not become dosage; warns about missing dosage', () => {
    const structured = extract(`Paracetamol 500 mg`);
    const med = toReviewMedicineSnapshot(structured.medicines[0]);
    expect(med.dosage).toBeNull();
    expect(med.strength?.toLowerCase()).toContain('500');
    expect(med.warnings.some((w) => /dosage not found/i.test(w))).toBe(true);
  });

  it('missing duration stays null and produces warning', () => {
    const structured = extract(`Paracetamol 500 mg
1 tablet twice daily`);
    const med = toReviewMedicineSnapshot(structured.medicines[0]);
    expect(med.durationDays).toBeNull();
    expect(med.warnings.some((w) => /duration not found/i.test(w))).toBe(true);
    expect(computeExtractionConfidence(structured.medicines[0])).toBeLessThan(
      0.95,
    );
  });

  it('1-0-1 and BID map to twice-daily review timings', () => {
    const a = extract(`Paracetamol 500 mg 1-0-1`);
    expect(a.medicines[0].frequencyPerDay).toBe(2);
    expect(a.medicines[0].timings).toEqual(
      expect.arrayContaining(['morning', 'evening']),
    );

    const b = extract(`Amoxicillin 500 mg 1 cap BID 5 days`);
    expect(b.medicines[0].frequencyPerDay).toBe(2);
  });

  it('doctor/patient never appear as medicines in review snapshot', () => {
    const structured = extract(`Dr. Ananya Sharma
Patient: Rahul Sharma
Paracetamol 500 mg
1 tablet twice daily
5 days`);
    const snapshot = buildExtractionSnapshot(structured);
    expect(snapshot.doctor.name).toMatch(/Ananya/i);
    expect(snapshot.patient.name).toMatch(/Rahul/i);
    expect(
      snapshot.medicines.every((m) => !/Ananya|Rahul/i.test(m.name)),
    ).toBe(true);
  });

  it('confirm DTO validation accepts user-edited medicines for creation', () => {
    const ready = validateExtractedMedicinesForCreation([
      {
        name: 'Paracetamol',
        dosage: '1 tablet',
        frequency: MedicineFrequency.TWICE_DAILY,
        dosesPerDay: 2,
        durationDays: 5,
        instructions: 'morning, evening',
      },
      {
        name: 'SomeUnknownMed',
        dosage: '1 capsule',
        frequency: MedicineFrequency.ONCE_DAILY,
        dosesPerDay: 1,
        durationDays: 3,
        instructions: 'night',
      },
    ]);
    expect(ready).toHaveLength(2);
    expect(ready[1].name).toBe('SomeUnknownMed');
  });

  describe('ExtractionService process/confirm orchestration', () => {
    function buildService(overrides: {
      prescription?: Record<string, unknown>;
      existingMedicines?: unknown[];
      structured?: ReturnType<typeof extract>;
      createMany?: jest.Mock;
    }) {
      const prescription = {
        _id: { toString: () => 'rx1' },
        imageUrl: '/uploads/rx.jpg',
        extractedText: 'Paracetamol 500 mg\n1 tablet twice daily\n5 days',
        doctorName: null,
        patientName: null,
        status: PrescriptionStatus.UPLOADED,
        extractionResult: null,
        ...overrides.prescription,
      };

      const prescriptionService = {
        findOne: jest.fn().mockResolvedValue(prescription),
        update: jest.fn().mockImplementation(async (_u, _id, patch) => ({
          ...prescription,
          ...patch,
        })),
        tryBeginConfirmation: jest.fn().mockImplementation(async () => {
          if (prescription.status === PrescriptionStatus.CONFIRMED) {
            return null;
          }
          return {
            ...prescription,
            status: PrescriptionStatus.PROCESSING,
          };
        }),
      };

      const medicineService = {
        findByPrescription: jest
          .fn()
          .mockResolvedValue(overrides.existingMedicines ?? []),
        createMany:
          overrides.createMany ??
          jest.fn().mockResolvedValue([
            {
              _id: { toString: () => 'm1' },
              name: 'Paracetamol',
              dosage: '1 tablet',
              dosesPerDay: 2,
              durationDays: 5,
            },
          ]),
      };

      const reminderService = {
        findAllByUser: jest.fn().mockResolvedValue([
          {
            prescriptionId: { toString: () => 'rx1' },
          },
          {
            prescriptionId: { toString: () => 'rx1' },
          },
        ]),
        generateRemindersForPrescription: jest.fn(),
      };

      const structured =
        overrides.structured ??
        extract(`Paracetamol 500 mg
1 tablet twice daily
5 days`);

      const extractor = {
        extractText: jest.fn(),
        extractMedicines: jest.fn(),
        extractStructured: jest.fn().mockResolvedValue(structured),
      };

      const service = new ExtractionService(
        prescriptionService as never,
        medicineService as never,
        reminderService as never,
        parser,
        extractor as never,
      );

      return { service, prescriptionService, medicineService, reminderService };
    }

    it('process returns REVIEW_REQUIRED and does not create medicines', async () => {
      const { service, medicineService, prescriptionService } = buildService({});

      const result = await service.processPrescription('user1', 'rx1');

      expect(result.status).toBe(PrescriptionStatus.REVIEW_REQUIRED);
      expect(result.medicines.length).toBeGreaterThanOrEqual(1);
      expect(result.remindersCreated).toBe(0);
      expect(medicineService.createMany).not.toHaveBeenCalled();
      expect(prescriptionService.update).toHaveBeenCalledWith(
        'user1',
        'rx1',
        expect.objectContaining({
          status: PrescriptionStatus.REVIEW_REQUIRED,
        }),
      );
    });

    it('confirm creates medicines once and is idempotent on second call', async () => {
      const createMany = jest.fn().mockResolvedValue([
        {
          _id: { toString: () => 'm1' },
          name: 'Paracetamol',
          dosage: '1 tablet',
          dosesPerDay: 2,
          durationDays: 5,
        },
      ]);
      const first = buildService({ createMany });
      const confirmed = await first.service.confirmPrescription('user1', 'rx1', {
        medicines: [
          {
            name: 'Paracetamol',
            strength: '500 mg',
            dosage: '1 tablet',
            frequency: '2/day',
            dosesPerDay: 2,
            timings: ['morning', 'evening'],
            durationDays: 5,
          },
        ],
      });

      expect(createMany).toHaveBeenCalledTimes(1);
      expect(confirmed.status).toBe(PrescriptionStatus.CONFIRMED);
      expect(confirmed.remindersCreated).toBe(2);

      const second = buildService({
        prescription: { status: PrescriptionStatus.CONFIRMED },
        existingMedicines: [
          {
            _id: { toString: () => 'm1' },
            name: 'Paracetamol',
            dosage: '1 tablet',
            dosesPerDay: 2,
            durationDays: 5,
          },
        ],
        createMany: jest.fn(),
      });
      const again = await second.service.confirmPrescription('user1', 'rx1', {
        medicines: [
          {
            name: 'Paracetamol',
            dosage: '1 tablet',
            dosesPerDay: 2,
            durationDays: 5,
          },
        ],
      });
      expect(second.medicineService.createMany).not.toHaveBeenCalled();
      expect(again.alreadyConfirmed).toBe(true);
      expect(again.message).toMatch(/already been confirmed/i);
    });

    it('confirm does not create when validation fails', async () => {
      const createMany = jest.fn();
      const { service } = buildService({ createMany });
      await expect(
        service.confirmPrescription('user1', 'rx1', {
          medicines: [{ name: 'Paracetamol' }],
        }),
      ).rejects.toBeTruthy();
      expect(createMany).not.toHaveBeenCalled();
    });

    it('never calls India medicine database during process/confirm', async () => {
      const spy = jest.spyOn(
        IndiaMedicineDatabaseProvider.prototype,
        'searchByCandidate',
      );
      const { service } = buildService({});
      await service.processPrescription('user1', 'rx1');
      await service.confirmPrescription('user1', 'rx1', {
        medicines: [
          {
            name: 'Paracetamol',
            dosage: '1 tablet',
            dosesPerDay: 2,
            durationDays: 5,
            timings: ['morning', 'evening'],
          },
        ],
      });
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });
});
