import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MedicineService } from './medicine.service';
import { MedicineController } from './medicine.controller';
import { Medicine, MedicineSchema } from './schemas/medicine.schema';
import { PrescriptionModule } from '../prescription/prescription.module';
import { ReminderModule } from '../reminder/reminder.module';

@Module({
  imports: [
    PrescriptionModule,
    forwardRef(() => ReminderModule),
    MongooseModule.forFeature([
      { name: Medicine.name, schema: MedicineSchema },
    ]),
  ],
  controllers: [MedicineController],
  providers: [MedicineService],
  exports: [MongooseModule, MedicineService],
})
export class MedicineModule {}
