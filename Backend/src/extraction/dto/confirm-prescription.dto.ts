import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class ConfirmMedicineDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  strength?: string | null;

  @IsOptional()
  @IsString()
  dosage?: string | null;

  @IsOptional()
  @IsString()
  dosageForm?: string | null;

  @IsOptional()
  @IsString()
  frequency?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(4)
  dosesPerDay?: number | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  timings?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationDays?: number | null;

  @IsOptional()
  @IsString()
  instructions?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;
}

export class ConfirmPrescriptionDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ConfirmMedicineDto)
  medicines!: ConfirmMedicineDto[];
}
