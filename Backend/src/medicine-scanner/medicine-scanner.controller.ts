import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MedicineScannerService } from './medicine-scanner.service';
import { ScanBarcodeDto } from './dto/scan-barcode.dto';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { medicineScannerUploadOptions } from './upload/medicine-scanner-upload.options';
import { MedicineScannerUploadExceptionFilter } from './upload/medicine-scanner-upload.exception-filter';

@Controller('medicine-scanner')
@UseGuards(JwtAuthGuard)
export class MedicineScannerController {
  constructor(private readonly medicineScannerService: MedicineScannerService) {}

  @Post('barcode')
  @HttpCode(HttpStatus.OK)
  scanBarcode(@Body() scanBarcodeDto: ScanBarcodeDto) {
    return this.medicineScannerService.lookupBarcode(scanBarcodeDto.barcode);
  }

  @Post('image')
  @HttpCode(HttpStatus.OK)
  @UseFilters(MedicineScannerUploadExceptionFilter)
  @UseInterceptors(FileInterceptor('image', medicineScannerUploadOptions))
  scanImage(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException(
        'Image file is required. Use the form field "image".',
      );
    }

    return this.medicineScannerService.scanMedicineImage(file.path);
  }
}
