import { IsIn } from 'class-validator';
import { ReminderStatus } from '../schemas/reminder.schema';

export class UpdateReminderDto {
  @IsIn([
    ReminderStatus.TAKEN,
    ReminderStatus.SKIPPED,
    ReminderStatus.MISSED,
  ])
  status!: ReminderStatus.TAKEN | ReminderStatus.SKIPPED | ReminderStatus.MISSED;
}
