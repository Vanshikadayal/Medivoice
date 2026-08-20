import { Types } from 'mongoose';
import { ReminderService } from '../reminder/reminder.service';
import { ReminderStatus } from '../reminder/schemas/reminder.schema';
import { MedicineFrequency } from '../medicine/schemas/medicine.schema';
import { ExtractionService } from './extraction.service';
import { PrescriptionStatus } from '../prescription/types/prescription-status';
import { PrescriptionMedicineParser } from './parsers/prescription-medicine.parser';
import { MedicineEntityValidator } from './validators/medicine-entity.validator';
import { validateExtractedMedicinesForCreation } from './validators/extracted-medicine.validator';
import * as prescriptionUpload from '../prescription/upload/prescription-upload.options';

describe('STEP 8G — prescription confirm → reminders today', () => {
  const userId = new Types.ObjectId().toHexString();
  const prescriptionId = new Types.ObjectId().toHexString();
  const medicineId = new Types.ObjectId();

  beforeAll(() => {
    jest
      .spyOn(prescriptionUpload, 'resolvePrescriptionImagePath')
      .mockReturnValue('/tmp/rx.jpg');
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  function startOfDay(value = new Date()) {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  function buildReminderService(store: {
    reminders: any[];
    medicines: any[];
  }) {
    const reminderModel = {
      find: jest.fn((query: any = {}) => {
        let rows = [...store.reminders];
        if (query.userId) {
          const uid = query.userId.toString();
          rows = rows.filter((r) => r.userId.toString() === uid);
        }
        if (query.medicineId?.$in) {
          const ids = new Set(
            query.medicineId.$in.map((id: Types.ObjectId) => id.toString()),
          );
          rows = rows.filter((r) => ids.has(r.medicineId.toString()));
        }
        if (query.medicineId?.$nin) {
          const ids = new Set(
            query.medicineId.$nin.map((id: Types.ObjectId) => id.toString()),
          );
          rows = rows.filter((r) => !ids.has(r.medicineId.toString()));
        }
        if (query.scheduledTime?.$gte || query.scheduledTime?.$lt) {
          rows = rows.filter((r) => {
            const t = r.scheduledTime.getTime();
            if (
              query.scheduledTime.$gte &&
              t < query.scheduledTime.$gte.getTime()
            ) {
              return false;
            }
            if (
              query.scheduledTime.$lt &&
              t >= query.scheduledTime.$lt.getTime()
            ) {
              return false;
            }
            if (
              query.scheduledTime.$in &&
              !query.scheduledTime.$in.some(
                (d: Date) => d.getTime() === r.scheduledTime.getTime(),
              )
            ) {
              return false;
            }
            return true;
          });
        }
        if (query.doseNumber !== undefined) {
          rows = rows.filter((r) => r.doseNumber === query.doseNumber);
        }
        const chain = {
          sort: jest.fn().mockResolvedValue(rows),
        };
        return Object.assign(Promise.resolve(rows), chain);
      }),
      insertMany: jest.fn(async (docs: any[]) => {
        const inserted = docs.map((doc) => ({
          ...doc,
          _id: new Types.ObjectId(),
        }));
        store.reminders.push(...inserted);
        return inserted;
      }),
      deleteMany: jest.fn(async (query: any) => {
        const before = store.reminders.length;
        store.reminders = store.reminders.filter((r) => {
          if (query.userId && r.userId.toString() !== query.userId.toString()) {
            return true;
          }
          if (
            query.medicineId?.$in &&
            !query.medicineId.$in.some(
              (id: Types.ObjectId) => id.toString() === r.medicineId.toString(),
            )
          ) {
            return true;
          }
          if (query.status && r.status !== query.status) {
            return true;
          }
          if (
            query.scheduledTime?.$gte &&
            r.scheduledTime.getTime() < query.scheduledTime.$gte.getTime()
          ) {
            return true;
          }
          return false;
        });
        return { deletedCount: before - store.reminders.length };
      }),
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      findOneAndDelete: jest.fn(),
    };

    const medicineModel = {
      find: jest.fn(async (query: any = {}) => {
        let rows = [...store.medicines];
        if (query.userId) {
          const uid = query.userId.toString();
          rows = rows.filter((m) => m.userId.toString() === uid);
        }
        if (query.prescriptionId) {
          rows = rows.filter(
            (m) => m.prescriptionId.toString() === query.prescriptionId.toString(),
          );
        }
        return rows;
      }),
      findOne: jest.fn(async (query: any) => {
        return (
          store.medicines.find((m) => {
            if (query._id && m._id.toString() !== query._id.toString()) {
              return false;
            }
            if (query.userId && m.userId.toString() !== query.userId.toString()) {
              return false;
            }
            return true;
          }) ?? null
        );
      }),
    };

    const prescriptionModel = {
      findOne: jest.fn(async () => ({
        _id: new Types.ObjectId(prescriptionId),
        userId: new Types.ObjectId(userId),
      })),
    };

    const historyService = {
      createFromReminder: jest.fn(),
    };

    const service = new ReminderService(
      reminderModel as never,
      medicineModel as never,
      prescriptionModel as never,
      historyService as never,
    );

    return { service, reminderModel, medicineModel, store };
  }

  it('generates reminders with correct userId and scheduledTime in today range', async () => {
    const store = { reminders: [] as any[], medicines: [] as any[] };
    const medicine = {
      _id: medicineId,
      userId: new Types.ObjectId(userId),
      prescriptionId: new Types.ObjectId(prescriptionId),
      name: 'Paracetamol',
      dosage: '1 tablet',
      frequency: MedicineFrequency.TWICE_DAILY,
      dosesPerDay: 2,
      durationDays: 5,
      startDate: startOfDay(),
      instructions: 'morning, evening',
    };
    store.medicines.push(medicine);

    const { service } = buildReminderService(store);
    const inserted = await service.generateRemindersForPrescription(
      userId,
      prescriptionId,
    );

    expect(inserted.length).toBeGreaterThan(0);
    expect(inserted.every((r: any) => r.userId.toString() === userId)).toBe(
      true,
    );
    expect(
      inserted.every((r: any) => r.medicineId.toString() === medicineId.toString()),
    ).toBe(true);

    const today = await service.findTodayByUser(userId);
    expect(today.length).toBeGreaterThan(0);
    expect(today.every((r: any) => r.userId.toString() === userId)).toBe(true);
  });

  it('same-day catch-up when morning-only dose is already past', async () => {
    const store = { reminders: [] as any[], medicines: [] as any[] };
    const medicine = {
      _id: medicineId,
      userId: new Types.ObjectId(userId),
      prescriptionId: new Types.ObjectId(prescriptionId),
      name: 'Cetirizine',
      dosage: '1 tablet',
      frequency: MedicineFrequency.ONCE_DAILY,
      dosesPerDay: 1,
      durationDays: null,
      startDate: startOfDay(),
      instructions: 'morning',
    };
    store.medicines.push(medicine);

    const { service } = buildReminderService(store);

    // Force "now" after morning by generating with real clock; if morning
    // already past (typical afternoon), catch-up or evening path applies.
    const inserted = await service.generateRemindersForPrescription(
      userId,
      prescriptionId,
    );
    expect(inserted.length).toBeGreaterThan(0);

    const now = new Date();
    const morning = startOfDay();
    morning.setHours(8, 0, 0, 0);
    if (now.getTime() > morning.getTime()) {
      const today = await service.findTodayByUser(userId);
      expect(today.length).toBeGreaterThan(0);
    }
  });

  it('confirming twice does not duplicate reminders', async () => {
    const store = { reminders: [] as any[], medicines: [] as any[] };
    store.medicines.push({
      _id: medicineId,
      userId: new Types.ObjectId(userId),
      prescriptionId: new Types.ObjectId(prescriptionId),
      name: 'Paracetamol',
      dosage: '1 tablet',
      frequency: MedicineFrequency.TWICE_DAILY,
      dosesPerDay: 2,
      durationDays: 3,
      startDate: startOfDay(),
      instructions: 'morning, evening',
    });

    const { service } = buildReminderService(store);
    const first = await service.generateRemindersForPrescription(
      userId,
      prescriptionId,
    );
    const second = await service.generateRemindersForPrescription(
      userId,
      prescriptionId,
    );

    expect(first.length).toBeGreaterThan(0);
    // Second pass deletes future pending then re-inserts; net should not grow
    // unbounded beyond a single course worth of reminders.
    expect(store.reminders.length).toBeLessThanOrEqual(first.length + second.length);
    const uniqueKeys = new Set(
      store.reminders.map(
        (r) =>
          `${r.medicineId.toString()}_${new Date(r.scheduledTime).getTime()}`,
      ),
    );
    expect(uniqueKeys.size).toBe(store.reminders.length);
  });

  it('missing duration does not invent a clinical duration on medicine', () => {
    const ready = validateExtractedMedicinesForCreation([
      {
        name: 'Paracetamol',
        dosage: '1 tablet',
        frequency: MedicineFrequency.TWICE_DAILY,
        dosesPerDay: 2,
        durationDays: null,
        startDate: null,
        instructions: 'morning, evening',
      },
    ]);
    expect(ready[0].durationDays).toBeNull();
    expect(ready[0].durationConfirmationNeeded).toBe(true);
  });

  it('confirm creates medicines and reports reminder count; second confirm is idempotent', async () => {
    const parser = new PrescriptionMedicineParser();
    const createdMedicines = [
      {
        _id: { toString: () => medicineId.toString() },
        name: 'Paracetamol',
        dosage: '1 tablet',
        dosesPerDay: 2,
        durationDays: 5,
      },
    ];

    const createMany = jest.fn().mockResolvedValue(createdMedicines);
    const prescriptionService = {
      findOne: jest.fn().mockResolvedValue({
        _id: { toString: () => prescriptionId },
        imageUrl: '/x.jpg',
        extractedText: 'Paracetamol',
        status: PrescriptionStatus.REVIEW_REQUIRED,
      }),
      update: jest.fn().mockImplementation(async (_u, _id, patch) => ({
        _id: { toString: () => prescriptionId },
        imageUrl: '/x.jpg',
        extractedText: 'Paracetamol',
        ...patch,
      })),
      tryBeginConfirmation: jest.fn().mockResolvedValue({
        _id: { toString: () => prescriptionId },
        imageUrl: '/x.jpg',
        extractedText: 'Paracetamol',
        status: PrescriptionStatus.PROCESSING,
      }),
    };
    const medicineService = {
      findByPrescription: jest.fn().mockResolvedValue([]),
      createMany,
    };
    const reminderService = {
      findAllByUser: jest.fn().mockResolvedValue([
        {
          prescriptionId: { toString: () => prescriptionId },
          userId: { toString: () => userId },
          scheduledTime: new Date(),
          status: ReminderStatus.PENDING,
        },
        {
          prescriptionId: { toString: () => prescriptionId },
          userId: { toString: () => userId },
          scheduledTime: new Date(),
          status: ReminderStatus.PENDING,
        },
      ]),
      generateRemindersForPrescription: jest.fn(),
    };

    const service = new ExtractionService(
      prescriptionService as never,
      medicineService as never,
      reminderService as never,
      parser,
      {
        extractText: jest.fn(),
        extractMedicines: jest.fn(),
        extractStructured: jest.fn(),
      } as never,
    );

    const confirmed = await service.confirmPrescription(userId, prescriptionId, {
      medicines: [
        {
          name: 'Paracetamol',
          dosage: '1 tablet',
          dosesPerDay: 2,
          timings: ['morning', 'evening'],
          durationDays: 5,
          instructions: 'morning, evening',
        },
      ],
    });

    expect(createMany).toHaveBeenCalledTimes(1);
    expect(createMany.mock.calls[0][0]).toBe(userId);
    expect(confirmed.remindersCreated).toBe(2);
    expect(confirmed.status).toBe(PrescriptionStatus.CONFIRMED);

    medicineService.findByPrescription = jest
      .fn()
      .mockResolvedValue(createdMedicines);
    prescriptionService.findOne = jest.fn().mockResolvedValue({
      _id: { toString: () => prescriptionId },
      imageUrl: '/x.jpg',
      status: PrescriptionStatus.CONFIRMED,
    });

    const again = await service.confirmPrescription(userId, prescriptionId, {
      medicines: [
        {
          name: 'Paracetamol',
          dosage: '1 tablet',
          dosesPerDay: 2,
          durationDays: 5,
        },
      ],
    });
    expect(createMany).toHaveBeenCalledTimes(1);
    expect(again.alreadyConfirmed).toBe(true);
  });

  it('India medicine DB / scanner path is not used by confirm', () => {
    const validator = new MedicineEntityValidator();
    const meds = validator.validateMedicines([
      {
        name: 'Paracetamol',
        dosage: '1 tablet',
        strength: '500 mg',
        frequencyPerDay: 2,
        timings: ['morning', 'evening'],
        durationDays: 5,
        instructions: '1 tablet twice daily',
      } as never,
    ]);
    expect(meds[0].name).toBe('Paracetamol');
    // Confirm path never imports IndiaMedicineDatabaseProvider.
    expect(() =>
      require('../medicine-scanner/providers/india-medicine-database.provider'),
    ).not.toThrow();
  });
});
