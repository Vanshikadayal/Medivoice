import { IsMongoId, IsNotEmpty } from 'class-validator';

export class VoiceChatDto {
  @IsMongoId({ message: 'conversationId is required' })
  @IsNotEmpty({ message: 'conversationId is required' })
  conversationId!: string;
}
