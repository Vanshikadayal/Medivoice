import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  ReminderShift,
  ReminderStatus,
} from '../schemas/reminder.schema';

export class CreateReminderDto {
  @IsMongoId()
  medicineId!: string;

  @IsMongoId()
  prescriptionId!: string;

  @IsEnum(ReminderShift)
  shift!: ReminderShift;

  @IsDateString()
  scheduledTime!: string;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  doseNumber!: number;

  @IsString()
  dosage!: string;

  @IsOptional()
  @IsEnum(ReminderStatus)
  status?: ReminderStatus;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
