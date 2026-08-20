import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ReminderSchedulerService } from './reminder-scheduler.service';
import { ReminderModule } from '../reminder/reminder.module';

@Module({
  imports: [ScheduleModule.forRoot(), ReminderModule],
  providers: [ReminderSchedulerService],
})
export class SchedulerModule {}
