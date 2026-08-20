import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdatePrescriptionDto {
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  extractedText?: string;

  @IsOptional()
  @IsString()
  doctorName?: string;

  @IsOptional()
  @IsDateString()
  prescriptionDate?: string;
}
