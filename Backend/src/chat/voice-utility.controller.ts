import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SpeakDto } from './dto/speak.dto';
import { VoiceUtilityService } from './services/voice-utility.service';
import { voiceChatUploadOptions } from './upload/voice-chat-upload.options';
import { VoiceChatUploadExceptionFilter } from './upload/voice-chat-upload.exception-filter';

/**
 * Lightweight Piper/Whisper utilities for voice-first UI flows.
 * Public (no JWT) so login/signup voice guidance works before authentication.
 */
@Controller('voice')
export class VoiceUtilityController {
  constructor(private readonly voiceUtilityService: VoiceUtilityService) {}

  @Post('speak')
  @HttpCode(HttpStatus.OK)
  speak(@Body() dto: SpeakDto) {
    return this.voiceUtilityService.speak(dto.text);
  }

  @Post('transcribe')
  @HttpCode(HttpStatus.OK)
  @UseFilters(VoiceChatUploadExceptionFilter)
  @UseInterceptors(FileInterceptor('audio', voiceChatUploadOptions))
  transcribe(@UploadedFile() audio?: Express.Multer.File) {
    return this.voiceUtilityService.transcribe(audio);
  }
}
