import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { MedicineService } from './medicine.service';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { UpdateMedicineDto } from './dto/update-medicine.dto';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { CurrentUser } from 'src/decorators/current-user.decorator';

@Controller('medicines')
@UseGuards(JwtAuthGuard)
export class MedicineController {
  constructor(private readonly medicineService: MedicineService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() userId: string,
    @Body() createMedicineDto: CreateMedicineDto,
  ) {
    return this.medicineService.create(userId, createMedicineDto);
  }

  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  createMany(
    @CurrentUser() userId: string,
    @Body() medicines: CreateMedicineDto[],
  ) {
    return this.medicineService.createMany(userId, medicines);
  }

  @Get()
  findAll(@CurrentUser() userId: string) {
    return this.medicineService.findAllByUser(userId);
  }

  @Get('prescription/:prescriptionId')
  findByPrescription(
    @CurrentUser() userId: string,
    @Param('prescriptionId') prescriptionId: string,
  ) {
    return this.medicineService.findByPrescription(userId, prescriptionId);
  }

  @Get(':id')
  findOne(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.medicineService.findOne(userId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() updateMedicineDto: UpdateMedicineDto,
  ) {
    return this.medicineService.update(userId, id, updateMedicineDto);
  }

  @Delete(':id')
  remove(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.medicineService.remove(userId, id);
  }
}
