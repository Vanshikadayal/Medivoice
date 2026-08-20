import { Transform } from 'class-transformer';
import { IsMongoId, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ChatMessageDto {
  @IsMongoId({ message: 'conversationId is required' })
  @IsNotEmpty({ message: 'conversationId is required' })
  conversationId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  message!: string;
}
