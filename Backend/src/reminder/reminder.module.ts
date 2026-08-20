import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReminderService } from './reminder.service';
import { ReminderController } from './reminder.controller';
import { Reminder, ReminderSchema } from './schemas/reminder.schema';
import { MedicineModule } from '../medicine/medicine.module';
import { PrescriptionModule } from '../prescription/prescription.module';
import { HistoryModule } from '../history/history.module';

@Module({
  imports: [
    forwardRef(() => MedicineModule),
    PrescriptionModule,
    forwardRef(() => HistoryModule),
    MongooseModule.forFeature([
      { name: Reminder.name, schema: ReminderSchema },
    ]),
  ],
  controllers: [ReminderController],
  providers: [ReminderService],
  exports: [MongooseModule, ReminderService],
})
export class ReminderModule {}
