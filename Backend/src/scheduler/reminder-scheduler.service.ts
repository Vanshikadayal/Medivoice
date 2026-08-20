import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReminderService } from '../reminder/reminder.service';

@Injectable()
export class ReminderSchedulerService {
  private readonly logger = new Logger(ReminderSchedulerService.name);

  constructor(private readonly reminderService: ReminderService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async markMissedReminders() {
    const missedReminders =
      await this.reminderService.markOverduePendingReminders(new Date());

    if (missedReminders.length > 0) {
      this.logger.log(
        `Marked ${missedReminders.length} overdue reminder(s) as MISSED`,
      );
    }
  }
}
