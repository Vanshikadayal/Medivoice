import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MedicineScannerService } from './medicine-scanner.service';
import { MedicineScannerController } from './medicine-scanner.controller';
import { MEDICINE_DATABASE_PROVIDER } from './providers/medicine-database.provider';
import { OpenFdaMedicineProvider } from './providers/open-fda-medicine.provider';
import { IndiaMedicineDatabaseProvider } from './providers/india-medicine-database.provider';
import { CompositeMedicineScannerProvider } from './providers/composite-medicine-scanner.provider';
import { IngredientFallbackService } from './services/ingredient-fallback.service';
import { QrMedicineResolverService } from './services/qr-medicine-resolver.service';
import {
  MedicineDatabaseEntry,
  MedicineDatabaseSchema,
} from './schemas/medicine-database.schema';
import { OcrModule } from '../ocr/ocr.module';

@Module({
  imports: [
    OcrModule,
    MongooseModule.forFeature([
      { name: MedicineDatabaseEntry.name, schema: MedicineDatabaseSchema },
    ]),
  ],
  controllers: [MedicineScannerController],
  providers: [
    MedicineScannerService,
    IndiaMedicineDatabaseProvider,
    OpenFdaMedicineProvider,
    CompositeMedicineScannerProvider,
    IngredientFallbackService,
    QrMedicineResolverService,
    {
      provide: MEDICINE_DATABASE_PROVIDER,
      useExisting: CompositeMedicineScannerProvider,
    },
  ],
  exports: [IndiaMedicineDatabaseProvider, MongooseModule],
})
export class MedicineScannerModule {}
