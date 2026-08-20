import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class ScanBarcodeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  @Matches(/^[A-Za-z0-9][A-Za-z0-9\-_.]*$/, {
    message:
      'barcode must contain only letters, numbers, hyphens, underscores, or dots',
  })
  barcode!: string;
}
