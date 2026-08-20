import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PrescriptionService } from './prescription.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { UpdatePrescriptionDto } from './dto/update-prescription.dto';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { CurrentUser } from 'src/decorators/current-user.decorator';
import {
  getPrescriptionImageUrl,
  prescriptionUploadOptions,
} from './upload/prescription-upload.options';
import { PrescriptionUploadExceptionFilter } from './upload/prescription-upload.exception-filter';

@Controller('prescriptions')
@UseGuards(JwtAuthGuard)
export class PrescriptionController {
  constructor(private readonly prescriptionService: PrescriptionService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() userId: string,
    @Body() createPrescriptionDto: CreatePrescriptionDto,
  ) {
    return this.prescriptionService.create(userId, {
      ...createPrescriptionDto,
      prescriptionDate: createPrescriptionDto.prescriptionDate
        ? new Date(createPrescriptionDto.prescriptionDate)
        : undefined,
    });
  }

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseFilters(PrescriptionUploadExceptionFilter)
  @UseInterceptors(FileInterceptor('image', prescriptionUploadOptions))
  upload(
    @CurrentUser() userId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Image file is required. Use the form field "image".',
      );
    }

    return this.prescriptionService.createFromUpload(
      userId,
      getPrescriptionImageUrl(file.filename),
    );
  }

  @Get()
  findAll(@CurrentUser() userId: string) {
    return this.prescriptionService.findAllByUser(userId);
  }

  @Get(':id')
  findOne(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.prescriptionService.findOne(userId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() updatePrescriptionDto: UpdatePrescriptionDto,
  ) {
    return this.prescriptionService.update(userId, id, {
      ...updatePrescriptionDto,
      prescriptionDate: updatePrescriptionDto.prescriptionDate
        ? new Date(updatePrescriptionDto.prescriptionDate)
        : undefined,
    });
  }

  @Delete(':id')
  remove(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.prescriptionService.remove(userId, id);
  }
}
