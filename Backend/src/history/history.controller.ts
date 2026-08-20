import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { HistoryService } from './history.service';
import { HistoryStatus } from './schemas/history.schema';
import { UpdateReminderDto } from '../reminder/dto/update-reminder.dto';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { CurrentUser } from 'src/decorators/current-user.decorator';

@Controller('history')
@UseGuards(JwtAuthGuard)
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Post('reminder/:reminderId')
  @HttpCode(HttpStatus.CREATED)
  createFromReminder(
    @CurrentUser() userId: string,
    @Param('reminderId') reminderId: string,
    @Body() body: UpdateReminderDto,
  ) {
    return this.historyService.createFromReminder(
      userId,
      reminderId,
      body.status as unknown as HistoryStatus,
    );
  }

  @Get()
  findAll(@CurrentUser() userId: string) {
    return this.historyService.findAllByUser(userId);
  }

  @Get('stats')
  getStats(@CurrentUser() userId: string) {
    return this.historyService.getAdherenceStats(userId);
  }

  @Get('date/:date')
  findByDate(@CurrentUser() userId: string, @Param('date') date: string) {
    return this.historyService.findByDate(userId, date);
  }

  @Get('medicine/:medicineId')
  findByMedicine(
    @CurrentUser() userId: string,
    @Param('medicineId') medicineId: string,
  ) {
    return this.historyService.findByMedicine(userId, medicineId);
  }
}
