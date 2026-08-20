import { Test, TestingModule } from '@nestjs/testing';
import { VoiceUtilityService } from './voice-utility.service';
import { SPEECH_TO_TEXT_PROVIDER } from '../providers/speech-to-text.provider';
import { TEXT_TO_SPEECH_PROVIDER } from '../providers/text-to-speech.provider';

describe('VoiceUtilityService', () => {
  let service: VoiceUtilityService;

  const speechToTextProvider = {
    transcribe: jest.fn(),
  };

  const textToSpeechProvider = {
    synthesize: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoiceUtilityService,
        { provide: SPEECH_TO_TEXT_PROVIDER, useValue: speechToTextProvider },
        { provide: TEXT_TO_SPEECH_PROVIDER, useValue: textToSpeechProvider },
      ],
    }).compile();

    service = module.get(VoiceUtilityService);
  });

  it('speaks sanitized text via Piper', async () => {
    textToSpeechProvider.synthesize.mockResolvedValue({
      mimeType: 'audio/wav',
      audioBuffer: Buffer.from('audio'),
    });

    const result = await service.speak('**Hello** MediVoice');

    expect(textToSpeechProvider.synthesize).toHaveBeenCalledWith('Hello MediVoice');
    expect(result.success).toBe(true);
    expect(result.audio.data).toBeTruthy();
  });

  it('transcribes audio via Whisper', async () => {
    speechToTextProvider.transcribe.mockResolvedValue({
      text: 'scan medicine',
    });

    const result = await service.transcribe({
      originalname: 'voice.wav',
      buffer: Buffer.from('audio'),
    } as Express.Multer.File);

    expect(result.success).toBe(true);
    expect(result.transcript).toBe('scan medicine');
  });

  it('returns empty transcript failure without throwing', async () => {
    speechToTextProvider.transcribe.mockResolvedValue({ text: '   ' });

    const result = await service.transcribe({
      originalname: 'voice.wav',
      buffer: Buffer.from('audio'),
    } as Express.Multer.File);

    expect(result.success).toBe(false);
    expect(result.transcript).toBe('');
  });
});
