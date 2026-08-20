import { Module, forwardRef } from '@nestjs/common';
import { ExtractionService } from './extraction.service';
import { ExtractionController } from './extraction.controller';
import { PrescriptionModule } from '../prescription/prescription.module';
import { MedicineModule } from '../medicine/medicine.module';
import { ReminderModule } from '../reminder/reminder.module';
import { OcrModule } from '../ocr/ocr.module';
import { PRESCRIPTION_EXTRACTOR } from './interfaces/prescription-extractor.interface';
import { PrescriptionMedicineParser } from './parsers/prescription-medicine.parser';
import { PrescriptionStructuredParser } from './parsers/prescription-structured.parser';
import { TesseractPrescriptionExtractor } from './providers/tesseract-prescription.extractor';
import { GeminiPrescriptionExtractionService } from './providers/gemini-prescription-extraction.service';
import { MedicineEntityValidator } from './validators/medicine-entity.validator';

@Module({
  imports: [
    PrescriptionModule,
    MedicineModule,
    OcrModule,
    // MedicineScannerModule intentionally NOT imported — prescription
    // extraction must not depend on IndiaMedicineDatabaseProvider.
    forwardRef(() => ReminderModule),
  ],
  controllers: [ExtractionController],
  providers: [
    ExtractionService,
    PrescriptionMedicineParser,
    PrescriptionStructuredParser,
    MedicineEntityValidator,
    GeminiPrescriptionExtractionService,
    TesseractPrescriptionExtractor,
    {
      provide: PRESCRIPTION_EXTRACTOR,
      useExisting: TesseractPrescriptionExtractor,
    },
  ],
  exports: [ExtractionService],
})
export class ExtractionModule {}
