import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SpeechToTextProvider } from './speech-to-text.provider';
import { SpeechTranscript } from '../types/speech-transcript';

@Injectable()
export class LocalWhisperSpeechToTextProvider
  implements SpeechToTextProvider, OnModuleInit
{
  readonly providerId = 'local-whisper';

  private readonly logger = new Logger(LocalWhisperSpeechToTextProvider.name);
  private serviceUrl = 'http://127.0.0.1:8001';
  private timeoutMs = 60000;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.serviceUrl =
      this.configService.get<string>('voice.speechToText.serviceUrl') ??
      'http://127.0.0.1:8001';
    this.timeoutMs =
      this.configService.get<number>('voice.speechToText.timeoutMs') ?? 60000;
  }

  async transcribe(audio: Express.Multer.File): Promise<SpeechTranscript> {
    const formData = new FormData();
    const blob = new Blob([Uint8Array.from(audio.buffer)], {
      type: audio.mimetype,
    });
    formData.append('audio', blob, audio.originalname || 'audio.webm');

    try {
      const response = await this.withTimeout(
        fetch(`${this.serviceUrl}/transcribe`, {
          method: 'POST',
          body: formData,
        }),
        this.timeoutMs,
      );

      if (!response.ok) {
        this.logger.error(
          `Local Whisper request failed with status ${response.status}`,
        );
        throw new ServiceUnavailableException(
          'Unable to understand the audio right now.',
        );
      }

      const payload = (await response.json()) as {
        text?: string;
        language?: string;
      };

      return {
        text: payload.text?.trim() ?? '',
        language: payload.language,
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      this.logger.error(
        'Local Whisper request failed',
        error instanceof Error ? error.message : undefined,
      );
      throw new ServiceUnavailableException(
        'Unable to understand the audio right now.',
      );
    }
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
    let timeoutHandle: NodeJS.Timeout | undefined;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new Error('Local Whisper request timed out'));
      }, timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
  }
}
