import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  SPEECH_TO_TEXT_PROVIDER,
  type SpeechToTextProvider,
} from '../providers/speech-to-text.provider';
import {
  TEXT_TO_SPEECH_PROVIDER,
  type TextToSpeechProvider,
} from '../providers/text-to-speech.provider';
import { sanitizeForSpeech } from '../utils/tts-text-sanitizer.util';

@Injectable()
export class VoiceUtilityService {
  private readonly logger = new Logger(VoiceUtilityService.name);

  constructor(
    @Inject(SPEECH_TO_TEXT_PROVIDER)
    private readonly speechToTextProvider: SpeechToTextProvider,
    @Inject(TEXT_TO_SPEECH_PROVIDER)
    private readonly textToSpeechProvider: TextToSpeechProvider,
  ) {}

  async speak(text: string) {
    const trimmed = text.trim();
    if (!trimmed) {
      throw new BadRequestException('Text is required.');
    }

    const speechText = sanitizeForSpeech(trimmed);
    this.logger.log(`[VoiceUtility] speak length=${speechText.length}`);

    try {
      const synthesized = await this.textToSpeechProvider.synthesize(speechText);
      return {
        success: true,
        text: speechText,
        audio: {
          mimeType: synthesized.mimeType,
          data: synthesized.audioBuffer.toString('base64'),
        },
      };
    } catch (error) {
      this.logger.warn(
        `[VoiceUtility] speak failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new ServiceUnavailableException(
        'Unable to generate voice response right now.',
      );
    }
  }

  async transcribe(audio?: Express.Multer.File) {
    if (!audio) {
      throw new BadRequestException('Audio file is required.');
    }

    try {
      const transcript = await this.speechToTextProvider.transcribe(audio);
      const text = transcript.text.trim();
      this.logger.log(`[VoiceUtility] transcribe length=${text.length}`);

      if (!text) {
        return {
          success: false,
          transcript: '',
          message: "I couldn't understand that. Please try again.",
        };
      }

      return {
        success: true,
        transcript: text,
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        return {
          success: false,
          transcript: '',
          message: "I couldn't understand that. Please try again.",
        };
      }

      throw error;
    }
  }
}
