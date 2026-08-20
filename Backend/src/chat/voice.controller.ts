import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { CurrentUser } from 'src/decorators/current-user.decorator';
import { VoiceChatService } from './services/voice-chat.service';
import { VoiceChatDto } from './dto/voice-chat.dto';
import { voiceChatUploadOptions } from './upload/voice-chat-upload.options';
import { VoiceChatUploadExceptionFilter } from './upload/voice-chat-upload.exception-filter';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class VoiceController {
  constructor(private readonly voiceChatService: VoiceChatService) {}

  @Post('voice')
  @HttpCode(HttpStatus.OK)
  @UseFilters(VoiceChatUploadExceptionFilter)
  @UseInterceptors(FileInterceptor('audio', voiceChatUploadOptions))
  voiceChat(
    @CurrentUser() userId: string,
    @Body() voiceChatDto: VoiceChatDto,
    @UploadedFile() audio?: Express.Multer.File,
  ) {
    return this.voiceChatService.processVoiceMessage(
      userId,
      voiceChatDto.conversationId,
      audio,
    );
  }
}
