import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ExtractionService } from './extraction.service';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { CurrentUser } from 'src/decorators/current-user.decorator';
import { ConfirmPrescriptionDto } from './dto/confirm-prescription.dto';

@Controller('prescriptions')
@UseGuards(JwtAuthGuard)
export class ExtractionController {
  constructor(private readonly extractionService: ExtractionService) {}

  @Post(':id/ocr')
  @HttpCode(HttpStatus.OK)
  extractRawText(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.extractionService.extractRawText(userId, id);
  }

  @Post(':id/extract-medicines')
  @HttpCode(HttpStatus.OK)
  extractStructuredMedicines(
    @CurrentUser() userId: string,
    @Param('id') id: string,
  ) {
    return this.extractionService.extractStructuredMedicines(userId, id);
  }

  @Post(':id/process')
  @HttpCode(HttpStatus.OK)
  processPrescription(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.extractionService.processPrescription(userId, id);
  }

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  confirmPrescription(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() dto: ConfirmPrescriptionDto,
  ) {
    return this.extractionService.confirmPrescription(userId, id, dto);
  }
}
