import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ChatService } from '../chat.service';
import {
  SPEECH_TO_TEXT_PROVIDER,
  type SpeechToTextProvider,
} from '../providers/speech-to-text.provider';
import {
  TEXT_TO_SPEECH_PROVIDER,
  type TextToSpeechProvider,
} from '../providers/text-to-speech.provider';
import { VoiceChatResponse } from '../types/voice-chat-response';
import { sanitizeForSpeech } from '../utils/tts-text-sanitizer.util';

@Injectable()
export class VoiceChatService {
  private readonly logger = new Logger(VoiceChatService.name);

  constructor(
    @Inject(SPEECH_TO_TEXT_PROVIDER)
    private readonly speechToTextProvider: SpeechToTextProvider,
    @Inject(TEXT_TO_SPEECH_PROVIDER)
    private readonly textToSpeechProvider: TextToSpeechProvider,
    private readonly chatService: ChatService,
  ) {}

  async processVoiceMessage(
    userId: string,
    conversationId: string,
    audio?: Express.Multer.File,
  ): Promise<VoiceChatResponse> {
    this.logger.log('[VoiceChat] Received voice request');

    if (!audio) {
      throw new BadRequestException({
        success: false,
        message: 'Audio file is required.',
      });
    }

    let transcriptText: string;

    try {
      const transcript = await this.speechToTextProvider.transcribe(audio);
      transcriptText = transcript.text.trim();
      this.logger.log('[VoiceChat] Speech-to-text completed');
      this.logger.log(`[VoiceChat] Transcript length: ${transcriptText.length}`);
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        return {
          success: false,
          message: 'Unable to understand the audio right now.',
        };
      }

      throw error;
    }

    if (!transcriptText) {
      return {
        success: false,
        message: 'Could not understand the audio.',
      };
    }

    const chatResponse = await this.chatService.sendMessage(
      userId,
      conversationId,
      transcriptText,
    );

    if (!chatResponse.success) {
      return {
        success: false,
        message: chatResponse.message,
        conversationId: chatResponse.conversationId,
        transcript: transcriptText,
        safetyLevel: chatResponse.safetyLevel,
      };
    }

    this.logger.log('[VoiceChat] Chat response generated');

    try {
      const speechText = sanitizeForSpeech(chatResponse.message);
      const synthesized = await this.textToSpeechProvider.synthesize(
        speechText,
      );
      this.logger.log('[VoiceChat] Text-to-speech completed');

      return {
        success: true,
        conversationId: chatResponse.conversationId,
        transcript: transcriptText,
        message: chatResponse.message,
        safetyLevel: chatResponse.safetyLevel,
        provider: chatResponse.provider,
        audio: {
          mimeType: synthesized.mimeType,
          data: synthesized.audioBuffer.toString('base64'),
        },
      };
    } catch {
      return {
        success: true,
        conversationId: chatResponse.conversationId,
        transcript: transcriptText,
        message: chatResponse.message,
        safetyLevel: chatResponse.safetyLevel,
        provider: chatResponse.provider,
        audio: null,
        audioError: 'Unable to generate voice response right now.',
      };
    }
  }
}
