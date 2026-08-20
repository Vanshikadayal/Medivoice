import { IsString, MaxLength, MinLength } from 'class-validator';

export class SpeakDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  text!: string;
}
