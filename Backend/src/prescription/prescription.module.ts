import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PrescriptionService } from './prescription.service';
import { PrescriptionController } from './prescription.controller';
import { Prescription, PrescriptionSchema } from './schemas/prescription.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Prescription.name, schema: PrescriptionSchema },
    ]),
  ],
  controllers: [PrescriptionController],
  providers: [PrescriptionService],
  exports: [MongooseModule, PrescriptionService],
})
export class PrescriptionModule {}
