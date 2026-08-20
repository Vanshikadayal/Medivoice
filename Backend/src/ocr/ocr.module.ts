import { Module } from '@nestjs/common';
import { TesseractOcrService } from './tesseract-ocr.service';

@Module({
  providers: [TesseractOcrService],
  exports: [TesseractOcrService],
})
export class OcrModule {}
