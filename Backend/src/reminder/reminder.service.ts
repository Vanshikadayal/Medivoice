import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Reminder,
  ReminderShift,
  ReminderStatus,
} from './schemas/reminder.schema';
import { Medicine } from '../medicine/schemas/medicine.schema';
import { Prescription } from '../prescription/schemas/prescription.schema';
import { HistoryService } from '../history/history.service';
import { HistoryStatus } from '../history/schemas/history.schema';

const FIRST_DOSE_HOUR = 8;
const FIRST_DOSE_MINUTE = 0;
const EIGHT_HOURS_IN_MS = 8 * 60 * 60 * 1000;
const TEN_MINUTES_IN_MS = 10 * 60 * 1000;
const ALLOWED_STATUS_UPDATES = new Set<ReminderStatus>([
  ReminderStatus.TAKEN,
  ReminderStatus.SKIPPED,
  ReminderStatus.MISSED,
]);

@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);

  constructor(
    @InjectModel(Reminder.name) private reminderModel: Model<Reminder>,
    @InjectModel(Medicine.name) private medicineModel: Model<Medicine>,
    @InjectModel(Prescription.name)
    private prescriptionModel: Model<Prescription>,
    @Inject(forwardRef(() => HistoryService))
    private readonly historyService: HistoryService,
  ) {}

  async generateRemindersForMedicine(userId: string, medicineId: string) {
    const medicine = await this.findOwnedMedicine(userId, medicineId);
    const now = new Date();

    await this.deleteFuturePendingReminders(userId, [medicine._id], now);

    const reminderDocs: ReturnType<ReminderService['createReminderDocuments']> =
      [];

    for (const dayStart of this.getCourseDays(medicine, now)) {
      const dayRange = this.getDayRange(dayStart);
      const occupiedFirstDoseTimes = await this.getOccupiedFirstDoseTimes(
        userId,
        dayRange,
        [medicine._id],
      );

      reminderDocs.push(
        ...this.buildReminderDocumentsForMedicine(
          userId,
          medicine,
          dayStart,
          occupiedFirstDoseTimes,
          now,
        ),
      );
    }

    return this.insertRemindersSkippingDuplicates(reminderDocs);
  }

  async generateRemindersForPrescription(
    userId: string,
    prescriptionId: string,
  ) {
    await this.findOwnedPrescription(userId, prescriptionId);

    const userObjectId = this.toUserObjectId(userId);
    const medicines = await this.medicineModel.find({
      userId: userObjectId,
      prescriptionId: this.toObjectId(prescriptionId, 'Prescription not found'),
    });

    if (medicines.length === 0) {
      this.logger.warn(
        `[ReminderGenerate] No medicines found for prescriptionId=${prescriptionId}`,
      );
      return [];
    }

    const medicineIds = medicines.map((medicine) => medicine._id);
    const now = new Date();

    await this.deleteFuturePendingReminders(userId, medicineIds, now);

    const occupiedByDay = new Map<string, Date[]>();
    const reminderDocs: ReturnType<ReminderService['createReminderDocuments']> =
      [];

    for (const medicine of medicines) {
      for (const dayStart of this.getCourseDays(medicine, now)) {
        const dayKey = this.dateKey(dayStart);
        const dayRange = this.getDayRange(dayStart);

        if (!occupiedByDay.has(dayKey)) {
          occupiedByDay.set(
            dayKey,
            await this.getOccupiedFirstDoseTimes(userId, dayRange, medicineIds),
          );
        }

        const occupiedFirstDoseTimes = occupiedByDay.get(dayKey)!;
        const docs = this.buildReminderDocumentsForMedicine(
          userId,
          medicine,
          dayStart,
          occupiedFirstDoseTimes,
          now,
        );

        if (docs[0]) {
          occupiedFirstDoseTimes.push(docs[0].scheduledTime);
        }

        reminderDocs.push(...docs);
      }
    }

    const inserted = await this.insertRemindersSkippingDuplicates(reminderDocs);
    this.logger.log(
      `[ReminderGenerate] prescriptionId=${prescriptionId} medicines=${medicines.length} docsPrepared=${reminderDocs.length} inserted=${Array.isArray(inserted) ? inserted.length : 0}`,
    );
    return inserted;
  }

  async findAllByUser(userId: string) {
    return this.reminderModel
      .find({ userId: this.toUserObjectId(userId) })
      .sort({ scheduledTime: 1 });
  }

  async findTodayByUser(userId: string) {
    const { start, end } = this.getDayRange();
    this.logger.log(
      `[ReminderToday] userId=${String(userId)} dateRange=${start.toISOString()}..${end.toISOString()}`,
    );

    const reminders = await this.reminderModel
      .find({
        userId: this.toUserObjectId(userId),
        scheduledTime: { $gte: start, $lt: end },
      })
      .sort({ scheduledTime: 1 });

    this.logger.log(`[ReminderToday] reminderCount=${reminders.length}`);
    return reminders;
  }

  async findByMedicine(userId: string, medicineId: string) {
    await this.findOwnedMedicine(userId, medicineId);

    return this.reminderModel
      .find({
        userId: this.toUserObjectId(userId),
        medicineId: this.toObjectId(medicineId, 'Medicine not found'),
      })
      .sort({ scheduledTime: 1 });
  }

  async findOne(userId: string, reminderId: string) {
    const reminder = await this.reminderModel.findOne({
      _id: this.toObjectId(reminderId, 'Reminder not found'),
      userId: this.toUserObjectId(userId),
    });

    if (!reminder) {
      throw new NotFoundException('Reminder not found');
    }

    return reminder;
  }

  async updateReminderStatus(
    userId: string,
    reminderId: string,
    status: ReminderStatus,
  ) {
    if (!ALLOWED_STATUS_UPDATES.has(status)) {
      throw new BadRequestException(
        'Status must be TAKEN, SKIPPED, or MISSED',
      );
    }

    const reminder = await this.reminderModel.findOneAndUpdate(
      {
        _id: this.toObjectId(reminderId, 'Reminder not found'),
        userId: this.toUserObjectId(userId),
      },
      { $set: { status } },
      { returnDocument: 'after', runValidators: true },
    );

    if (!reminder) {
      throw new NotFoundException('Reminder not found');
    }

    await this.recordHistory(userId, reminder._id.toString(), status);

    return reminder;
  }

  async deleteReminder(userId: string, reminderId: string) {
    const reminder = await this.reminderModel.findOneAndDelete({
      _id: this.toObjectId(reminderId, 'Reminder not found'),
      userId: this.toUserObjectId(userId),
    });

    if (!reminder) {
      throw new NotFoundException('Reminder not found');
    }

    return reminder;
  }

  async deleteFuturePendingRemindersForMedicine(
    userId: string,
    medicineId: string,
  ) {
    await this.deleteFuturePendingReminders(
      userId,
      [this.toObjectId(medicineId, 'Medicine not found')],
      new Date(),
    );
  }

  async markOverduePendingReminders(now = new Date()) {
    const overdueReminders = await this.reminderModel.find({
      status: ReminderStatus.PENDING,
      isActive: true,
      scheduledTime: { $lt: now },
    });

    const missedReminders: Reminder[] = [];

    for (const reminder of overdueReminders) {
      const updated = await this.reminderModel.findOneAndUpdate(
        {
          _id: reminder._id,
          status: ReminderStatus.PENDING,
        },
        { $set: { status: ReminderStatus.MISSED } },
        { returnDocument: 'after' },
      );

      if (updated) {
        await this.recordHistory(
          updated.userId.toString(),
          updated._id.toString(),
          ReminderStatus.MISSED,
        );
        missedReminders.push(updated);
      }
    }

    return missedReminders;
  }

  private buildReminderDocumentsForMedicine(
    userId: string,
    medicine: Medicine,
    dayStart: Date,
    occupiedFirstDoseTimes: Date[],
    now = new Date(),
  ) {
    const timedFromInstructions = this.calculateDoseTimesFromInstructions(
      medicine.instructions,
      dayStart,
    );
    const baseTimes =
      timedFromInstructions ??
      this.calculateDoseTimes(medicine.dosesPerDay, dayStart);

    if (baseTimes.length === 0) {
      return [];
    }

    const spacingSlot = this.getSpacingSlot(
      baseTimes[0],
      occupiedFirstDoseTimes,
    );
    const spacedTimes = this.applyMedicineSpacing(baseTimes, spacingSlot);

    return this.createReminderDocuments(userId, medicine, spacedTimes, now);
  }

  /**
   * Prefer explicit prescription timing words in instructions over generic
   * dosesPerDay spacing (e.g. bedtime → night, 1-0-1 → morning+evening).
   */
  private calculateDoseTimesFromInstructions(
    instructions: string | undefined,
    dayStart: Date,
  ): Date[] | null {
    if (!instructions?.trim()) {
      return null;
    }

    const lower = instructions.toLowerCase();
    const slots: Array<{ hour: number; minute: number }> = [];

    const pushUnique = (hour: number, minute: number) => {
      if (!slots.some((s) => s.hour === hour && s.minute === minute)) {
        slots.push({ hour, minute });
      }
    };

    if (/\b(?:after\s+)?breakfast\b|\bmorning\b/.test(lower)) {
      pushUnique(8, 0);
    }
    if (/\b(?:after\s+)?lunch\b|\bnoon\b/.test(lower)) {
      pushUnique(14, 0);
    }
    if (/\b(?:after\s+)?dinner\b|\bevening\b/.test(lower)) {
      pushUnique(20, 0);
    }
    if (
      /\b(?:at\s+)?bedtime\b|\bbefore\s+bed(?:time)?\b|\bbefore\s+sleep\b|\bnight\b/.test(
        lower,
      )
    ) {
      // Night/bedtime is distinct from evening/dinner when both appear.
      pushUnique(22, 0);
    }

    if (slots.length === 0) {
      return null;
    }

    return slots
      .sort((a, b) => a.hour - b.hour || a.minute - b.minute)
      .map((slot) => this.atTime(dayStart, slot.hour, slot.minute));
  }

  private calculateDoseTimes(dosesPerDay: number, dayStart: Date) {
    if (!dosesPerDay || dosesPerDay < 1) {
      throw new BadRequestException('dosesPerDay must be at least 1');
    }

    const firstDose = this.atTime(dayStart, FIRST_DOSE_HOUR, FIRST_DOSE_MINUTE);

    if (dosesPerDay === 1) {
      return [firstDose];
    }

    if (dosesPerDay === 2) {
      return [firstDose, new Date(firstDose.getTime() + EIGHT_HOURS_IN_MS)];
    }

    if (dosesPerDay === 3) {
      return [
        this.atTime(dayStart, 8, 0),
        this.atTime(dayStart, 14, 0),
        this.atTime(dayStart, 20, 0),
      ];
    }

    if (dosesPerDay === 4) {
      return [
        this.atTime(dayStart, 8, 0),
        this.atTime(dayStart, 12, 0),
        this.atTime(dayStart, 16, 0),
        this.atTime(dayStart, 20, 0),
      ];
    }

    const gapInMs = EIGHT_HOURS_IN_MS / 2;
    return Array.from({ length: dosesPerDay }, (_, index) => {
      return new Date(firstDose.getTime() + index * gapInMs);
    });
  }

  private getShiftForTime(scheduledTime: Date) {
    const hour = scheduledTime.getHours();

    if (hour >= 5 && hour < 12) {
      return ReminderShift.MORNING;
    }

    if (hour >= 12 && hour < 16) {
      return ReminderShift.NOON;
    }

    if (hour >= 16 && hour < 20) {
      return ReminderShift.EVENING;
    }

    return ReminderShift.NIGHT;
  }

  private getSpacingSlot(baseFirstDose: Date, occupiedFirstDoseTimes: Date[]) {
    let slot = 0;

    while (
      occupiedFirstDoseTimes.some((occupiedTime) => {
        const plannedTime = baseFirstDose.getTime() + slot * TEN_MINUTES_IN_MS;
        return Math.abs(occupiedTime.getTime() - plannedTime) < 60 * 1000;
      })
    ) {
      slot += 1;
    }

    return slot;
  }

  private applyMedicineSpacing(baseTimes: Date[], spacingSlot: number) {
    return baseTimes.map(
      (time) => new Date(time.getTime() + spacingSlot * TEN_MINUTES_IN_MS),
    );
  }

  private createReminderDocuments(
    userId: string,
    medicine: Medicine,
    scheduledTimes: Date[],
    now: Date,
  ) {
    const docs = scheduledTimes.map((scheduledTime, index) => ({
      userId: this.toUserObjectId(userId),
      medicineId: medicine._id,
      prescriptionId: medicine.prescriptionId,
      shift: this.getShiftForTime(scheduledTime),
      scheduledTime,
      doseNumber: index + 1,
      dosage: medicine.dosage?.trim() ? medicine.dosage : '',
      status: ReminderStatus.PENDING as ReminderStatus,
      isActive: true,
    }));

    const future = docs.filter(
      (reminder) => reminder.scheduledTime.getTime() >= now.getTime(),
    );
    if (future.length > 0) {
      return future;
    }

    // All planned slots for this day are already past. Schedule one same-day
    // catch-up soon so confirmation still produces an actionable reminder that
    // appears in GET /reminders/today (does not invent clinical duration).
    return this.buildSameDayCatchUpDocument(docs, now);
  }

  private buildSameDayCatchUpDocument(
    docs: Array<{
      userId: Types.ObjectId;
      medicineId: Types.ObjectId;
      prescriptionId: Types.ObjectId;
      shift: ReminderShift;
      scheduledTime: Date;
      doseNumber: number;
      dosage: string;
      status: ReminderStatus;
      isActive: boolean;
    }>,
    now: Date,
  ) {
    if (docs.length === 0) {
      return [];
    }

    const todayKey = this.dateKey(now);
    const hadTodaySlot = docs.some(
      (doc) => this.dateKey(doc.scheduledTime) === todayKey,
    );
    if (!hadTodaySlot) {
      return [];
    }

    const catchUp = new Date(now.getTime() + TEN_MINUTES_IN_MS);
    if (this.dateKey(catchUp) !== todayKey) {
      return [];
    }

    const template = docs[docs.length - 1];
    return [
      {
        ...template,
        scheduledTime: catchUp,
        shift: this.getShiftForTime(catchUp),
      },
    ];
  }

  private async insertRemindersSkippingDuplicates(
    reminderDocs: ReturnType<ReminderService['createReminderDocuments']>,
  ) {
    if (reminderDocs.length === 0) {
      return [];
    }

    const existing = await this.reminderModel.find({
      userId: reminderDocs[0].userId,
      medicineId: { $in: reminderDocs.map((doc) => doc.medicineId) },
      scheduledTime: { $in: reminderDocs.map((doc) => doc.scheduledTime) },
    });

    const existingKeys = new Set(
      existing.map(
        (doc) =>
          `${doc.userId.toString()}_${doc.medicineId.toString()}_${doc.scheduledTime.getTime()}`,
      ),
    );

    const uniqueDocs = reminderDocs.filter((doc) => {
      const key = `${doc.userId.toString()}_${doc.medicineId.toString()}_${doc.scheduledTime.getTime()}`;
      return !existingKeys.has(key);
    });

    if (uniqueDocs.length === 0) {
      return [];
    }

    try {
      return await this.reminderModel.insertMany(uniqueDocs, { ordered: false });
    } catch (error) {
      const duplicateKey =
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: number }).code === 11000;

      if (duplicateKey) {
        return uniqueDocs;
      }

      throw error;
    }
  }

  /**
   * Build course days for reminder generation.
   *
   * When duration is missing, only a provisional single day is scheduled.
   * If that day's slots are already past (and same-day catch-up cannot apply),
   * shift forward one calendar day so confirmation is not a no-op.
   * Multi-day courses keep their original window (past slots are simply skipped).
   */
  private getCourseDays(medicine: Medicine, now = new Date()) {
    const hasDuration =
      typeof medicine.durationDays === 'number' && medicine.durationDays >= 1;
    const durationDays = hasDuration ? medicine.durationDays! : 1;
    let start = this.startOfDay(medicine.startDate || now);
    const today = this.startOfDay(now);
    if (start.getTime() < today.getTime()) {
      start = today;
    }

    if (
      !hasDuration &&
      !this.dayHasFutureDoseSlot(medicine, start, now) &&
      !this.canScheduleSameDayCatchUp(start, now)
    ) {
      const shifted = new Date(start);
      shifted.setDate(shifted.getDate() + 1);
      start = shifted;
      this.logger.debug(
        `[ReminderGenerate] provisional start day fully past for medicine=${medicine.name}; shifting to ${start.toISOString()}`,
      );
    }

    return Array.from({ length: durationDays }, (_, index) => {
      const day = new Date(start);
      day.setDate(day.getDate() + index);
      return day;
    });
  }

  private canScheduleSameDayCatchUp(dayStart: Date, now: Date): boolean {
    if (this.dateKey(dayStart) !== this.dateKey(now)) {
      return false;
    }
    const catchUp = new Date(now.getTime() + TEN_MINUTES_IN_MS);
    return this.dateKey(catchUp) === this.dateKey(now);
  }

  private dayHasFutureDoseSlot(
    medicine: Medicine,
    dayStart: Date,
    now: Date,
  ): boolean {
    const times =
      this.calculateDoseTimesFromInstructions(medicine.instructions, dayStart) ??
      this.calculateDoseTimes(Math.max(1, medicine.dosesPerDay || 1), dayStart);
    return times.some((time) => time.getTime() >= now.getTime());
  }

  private startOfDay(value: Date) {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private dateKey(date: Date) {
    const day = this.startOfDay(date);
    return `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
  }

  private async deleteFuturePendingReminders(
    userId: string,
    medicineIds: Types.ObjectId[],
    fromTime: Date,
  ) {
    await this.reminderModel.deleteMany({
      userId: this.toUserObjectId(userId),
      medicineId: { $in: medicineIds },
      status: ReminderStatus.PENDING,
      scheduledTime: { $gte: fromTime },
    });
  }

  private async getOccupiedFirstDoseTimes(
    userId: string,
    dayRange: { start: Date; end: Date },
    excludedMedicineIds: Types.ObjectId[],
  ) {
    const reminders = await this.reminderModel.find({
      userId: this.toUserObjectId(userId),
      medicineId: { $nin: excludedMedicineIds },
      scheduledTime: { $gte: dayRange.start, $lt: dayRange.end },
      doseNumber: 1,
    });

    return reminders.map((reminder) => reminder.scheduledTime);
  }

  private getDayRange(now = new Date()) {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    return { start, end };
  }

  private atTime(dayStart: Date, hours: number, minutes: number) {
    const date = new Date(dayStart);
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  private async findOwnedMedicine(userId: string, medicineId: string) {
    const medicine = await this.medicineModel.findOne({
      _id: this.toObjectId(medicineId, 'Medicine not found'),
      userId: this.toUserObjectId(userId),
    });

    if (!medicine) {
      throw new NotFoundException('Medicine not found');
    }

    return medicine;
  }

  private async findOwnedPrescription(userId: string, prescriptionId: string) {
    const prescription = await this.prescriptionModel.findOne({
      _id: this.toObjectId(prescriptionId, 'Prescription not found'),
      userId: this.toUserObjectId(userId),
    });

    if (!prescription) {
      throw new NotFoundException('Prescription not found');
    }

    return prescription;
  }

  private async recordHistory(
    userId: string,
    reminderId: string,
    status: ReminderStatus,
  ) {
    if (status === ReminderStatus.PENDING) {
      return;
    }

    await this.historyService.createFromReminder(
      userId,
      reminderId,
      status as unknown as HistoryStatus,
    );
  }

  private toUserObjectId(userId: string | Types.ObjectId): Types.ObjectId {
    if (userId instanceof Types.ObjectId) {
      return userId;
    }
    const raw = String(userId ?? '').trim();
    const hex = raw.match(/[a-f0-9]{24}/i)?.[0];
    if (!hex) {
      throw new NotFoundException('User not found');
    }
    return new Types.ObjectId(hex);
  }

  private toObjectId(id: string, notFoundMessage: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(notFoundMessage);
    }

    return new Types.ObjectId(id);
  }
}
