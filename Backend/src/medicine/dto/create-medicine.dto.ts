import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { MedicineFrequency } from '../schemas/medicine.schema';

export class CreateMedicineDto {
  @IsMongoId()
  prescriptionId!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  dosage?: string;

  @IsEnum(MedicineFrequency)
  frequency!: MedicineFrequency;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  dosesPerDay!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationDays?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsString()
  instructions?: string;
}
