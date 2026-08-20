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
import { ReminderService } from './reminder.service';
import { UpdateReminderDto } from './dto/update-reminder.dto';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { CurrentUser } from 'src/decorators/current-user.decorator';

@Controller('reminders')
@UseGuards(JwtAuthGuard)
export class ReminderController {
  constructor(private readonly reminderService: ReminderService) {}

  @Post('generate/medicine/:medicineId')
  @HttpCode(HttpStatus.CREATED)
  generateForMedicine(
    @CurrentUser() userId: string,
    @Param('medicineId') medicineId: string,
  ) {
    return this.reminderService.generateRemindersForMedicine(
      userId,
      medicineId,
    );
  }

  @Post('generate/prescription/:prescriptionId')
  @HttpCode(HttpStatus.CREATED)
  generateForPrescription(
    @CurrentUser() userId: string,
    @Param('prescriptionId') prescriptionId: string,
  ) {
    return this.reminderService.generateRemindersForPrescription(
      userId,
      prescriptionId,
    );
  }

  @Get()
  findAll(@CurrentUser() userId: string) {
    return this.reminderService.findAllByUser(userId);
  }

  @Get('today')
  findToday(@CurrentUser() userId: string) {
    return this.reminderService.findTodayByUser(userId);
  }

  @Get('medicine/:medicineId')
  findByMedicine(
    @CurrentUser() userId: string,
    @Param('medicineId') medicineId: string,
  ) {
    return this.reminderService.findByMedicine(userId, medicineId);
  }

  @Get(':id')
  findOne(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.reminderService.findOne(userId, id);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() updateReminderDto: UpdateReminderDto,
  ) {
    return this.reminderService.updateReminderStatus(
      userId,
      id,
      updateReminderDto.status,
    );
  }

  @Delete(':id')
  remove(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.reminderService.deleteReminder(userId, id);
  }
}
