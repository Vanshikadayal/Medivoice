import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocalWhisperSpeechToTextProvider } from './local-whisper-speech-to-text.provider';

describe('LocalWhisperSpeechToTextProvider', () => {
  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'voice.speechToText.serviceUrl') {
        return 'http://127.0.0.1:8001';
      }
      if (key === 'voice.speechToText.timeoutMs') {
        return 60000;
      }
      return undefined;
    }),
  };

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('transcribes audio from the local Whisper service', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        text: 'What is Dolo 650 used for?',
        language: 'en',
      }),
    } as Response);

    const provider = new LocalWhisperSpeechToTextProvider(
      configService as unknown as ConfigService,
    );
    provider.onModuleInit();

    const result = await provider.transcribe({
      buffer: Buffer.from('audio'),
      mimetype: 'audio/webm',
      originalname: 'voice.webm',
    } as Express.Multer.File);

    expect(result).toEqual({
      text: 'What is Dolo 650 used for?',
      language: 'en',
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:8001/transcribe',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('throws when the local Whisper service is unavailable', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 503,
    } as Response);

    const provider = new LocalWhisperSpeechToTextProvider(
      configService as unknown as ConfigService,
    );
    provider.onModuleInit();

    await expect(
      provider.transcribe({
        buffer: Buffer.from('audio'),
        mimetype: 'audio/webm',
        originalname: 'voice.webm',
      } as Express.Multer.File),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('throws when the local Whisper service times out', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ ok: true, json: async () => ({}) } as Response), 100);
        }),
    );

    const timeoutConfig = {
      get: jest.fn((key: string) => {
        if (key === 'voice.speechToText.serviceUrl') {
          return 'http://127.0.0.1:8001';
        }
        if (key === 'voice.speechToText.timeoutMs') {
          return 10;
        }
        return undefined;
      }),
    };

    const provider = new LocalWhisperSpeechToTextProvider(
      timeoutConfig as unknown as ConfigService,
    );
    provider.onModuleInit();

    await expect(
      provider.transcribe({
        buffer: Buffer.from('audio'),
        mimetype: 'audio/webm',
        originalname: 'voice.webm',
      } as Express.Multer.File),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
