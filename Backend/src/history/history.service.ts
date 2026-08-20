import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { History, HistoryStatus } from './schemas/history.schema';
import { Reminder } from '../reminder/schemas/reminder.schema';
import { ReminderStatus } from '../reminder/enums/reminder-status.enum';

const ALLOWED_HISTORY_STATUSES = new Set<HistoryStatus>([
  HistoryStatus.TAKEN,
  HistoryStatus.SKIPPED,
  HistoryStatus.MISSED,
]);

@Injectable()
export class HistoryService {
  constructor(
    @InjectModel(History.name) private historyModel: Model<History>,
    @InjectModel(Reminder.name) private reminderModel: Model<Reminder>,
  ) {}

  async createFromReminder(
    userId: string,
    reminderId: string,
    status: HistoryStatus,
  ) {
    if (!ALLOWED_HISTORY_STATUSES.has(status)) {
      throw new BadRequestException(
        'Status must be TAKEN, SKIPPED, or MISSED',
      );
    }

    const reminder = await this.reminderModel.findOne({
      _id: this.toObjectId(reminderId, 'Reminder not found'),
      userId,
    });

    if (!reminder) {
      throw new NotFoundException('Reminder not found');
    }

    const existing = await this.historyModel.findOne({
      userId,
      reminderId: reminder._id,
      status,
    });

    if (existing) {
      return existing;
    }

    await this.reminderModel.updateOne(
      { _id: reminder._id, userId },
      { $set: { status: this.toReminderStatus(status) } },
    );

    return this.historyModel.create({
      userId: new Types.ObjectId(userId),
      reminderId: reminder._id,
      medicineId: reminder.medicineId,
      status,
      scheduledTime: reminder.scheduledTime,
      actionTime: new Date(),
    });
  }

  async findAllByUser(userId: string) {
    return this.historyModel.find({ userId }).sort({ actionTime: -1 });
  }

  async findByDate(userId: string, date: Date | string) {
    const { start, end } = this.getDayRange(date);

    return this.historyModel
      .find({
        userId,
        scheduledTime: { $gte: start, $lt: end },
      })
      .sort({ scheduledTime: 1 });
  }

  async findByMedicine(userId: string, medicineId: string) {
    return this.historyModel
      .find({
        userId,
        medicineId: this.toObjectId(medicineId, 'Medicine not found'),
      })
      .sort({ actionTime: -1 });
  }

  async getAdherenceStats(userId: string) {
    const records = await this.historyModel.find({ userId });

    const total = records.length;
    const taken = records.filter(
      (record) => record.status === HistoryStatus.TAKEN,
    ).length;
    const skipped = records.filter(
      (record) => record.status === HistoryStatus.SKIPPED,
    ).length;
    const missed = records.filter(
      (record) => record.status === HistoryStatus.MISSED,
    ).length;

    const adherencePercentage =
      total === 0 ? 0 : Math.round((taken / total) * 100);

    return {
      total,
      taken,
      skipped,
      missed,
      adherencePercentage,
    };
  }

  private toReminderStatus(status: HistoryStatus): ReminderStatus {
    switch (status) {
      case HistoryStatus.TAKEN:
        return ReminderStatus.TAKEN;
      case HistoryStatus.SKIPPED:
        return ReminderStatus.SKIPPED;
      case HistoryStatus.MISSED:
      default:
        return ReminderStatus.MISSED;
    }
  }

  private getDayRange(date: Date | string) {
    const parsedDate = date instanceof Date ? new Date(date) : new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      throw new BadRequestException('Invalid date');
    }

    const start = new Date(parsedDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    return { start, end };
  }

  private toObjectId(id: string, notFoundMessage: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(notFoundMessage);
    }

    return new Types.ObjectId(id);
  }
}
