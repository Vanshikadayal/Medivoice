import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { VoiceChatService } from './voice-chat.service';
import { ChatService } from '../chat.service';
import { SPEECH_TO_TEXT_PROVIDER } from '../providers/speech-to-text.provider';
import { TEXT_TO_SPEECH_PROVIDER } from '../providers/text-to-speech.provider';
import { EMERGENCY_RESPONSE_MESSAGE } from './medical-safety.service';

describe('VoiceChatService', () => {
  let service: VoiceChatService;

  const speechToTextProvider = {
    providerId: 'local-whisper',
    transcribe: jest.fn(),
  };

  const textToSpeechProvider = {
    providerId: 'local-piper',
    synthesize: jest.fn(),
  };

  const chatService = {
    sendMessage: jest.fn(),
  };

  const audioFile = {
    buffer: Buffer.from('audio'),
    mimetype: 'audio/webm',
    originalname: 'voice.webm',
  } as Express.Multer.File;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoiceChatService,
        { provide: SPEECH_TO_TEXT_PROVIDER, useValue: speechToTextProvider },
        { provide: TEXT_TO_SPEECH_PROVIDER, useValue: textToSpeechProvider },
        { provide: ChatService, useValue: chatService },
      ],
    }).compile();

    service = module.get(VoiceChatService);
    jest.clearAllMocks();
  });

  it('processes valid audio through ChatService and TTS', async () => {
    speechToTextProvider.transcribe.mockResolvedValue({
      text: 'What is Dolo 650 used for?',
    });
    chatService.sendMessage.mockResolvedValue({
      success: true,
      message: 'Dolo 650 contains paracetamol.',
      conversationId: 'conv-1',
      provider: 'gemini',
      safetyLevel: 'SAFE',
    });
    textToSpeechProvider.synthesize.mockResolvedValue({
      audioBuffer: Buffer.from('wav'),
      mimeType: 'audio/wav',
    });

    const result = await service.processVoiceMessage(
      'user-1',
      'conv-1',
      audioFile,
    );

    expect(speechToTextProvider.transcribe).toHaveBeenCalledWith(audioFile);
    expect(chatService.sendMessage).toHaveBeenCalledWith(
      'user-1',
      'conv-1',
      'What is Dolo 650 used for?',
    );
    expect(textToSpeechProvider.synthesize).toHaveBeenCalledWith(
      'Dolo 650 contains paracetamol.',
    );
    expect(result).toEqual({
      success: true,
      conversationId: 'conv-1',
      transcript: 'What is Dolo 650 used for?',
      message: 'Dolo 650 contains paracetamol.',
      safetyLevel: 'SAFE',
      provider: 'gemini',
      audio: {
        mimeType: 'audio/wav',
        data: Buffer.from('wav').toString('base64'),
      },
    });
  });

  it('rejects missing audio', async () => {
    await expect(
      service.processVoiceMessage('user-1', 'conv-1', undefined),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(speechToTextProvider.transcribe).not.toHaveBeenCalled();
  });

  it('returns controlled failure when STT fails', async () => {
    speechToTextProvider.transcribe.mockRejectedValue(
      new ServiceUnavailableException('Unable to understand the audio right now.'),
    );

    const result = await service.processVoiceMessage(
      'user-1',
      'conv-1',
      audioFile,
    );

    expect(result).toEqual({
      success: false,
      message: 'Unable to understand the audio right now.',
    });
    expect(chatService.sendMessage).not.toHaveBeenCalled();
  });

  it('returns controlled failure for empty transcript', async () => {
    speechToTextProvider.transcribe.mockResolvedValue({ text: '   ' });

    const result = await service.processVoiceMessage(
      'user-1',
      'conv-1',
      audioFile,
    );

    expect(result).toEqual({
      success: false,
      message: 'Could not understand the audio.',
    });
    expect(chatService.sendMessage).not.toHaveBeenCalled();
  });

  it('returns chat failure without calling TTS', async () => {
    speechToTextProvider.transcribe.mockResolvedValue({ text: 'Hello' });
    chatService.sendMessage.mockResolvedValue({
      success: false,
      message: 'Unable to generate a response right now.',
      conversationId: 'conv-1',
    });

    const result = await service.processVoiceMessage(
      'user-1',
      'conv-1',
      audioFile,
    );

    expect(result.success).toBe(false);
    expect(textToSpeechProvider.synthesize).not.toHaveBeenCalled();
  });

  it('returns text response when TTS fails', async () => {
    speechToTextProvider.transcribe.mockResolvedValue({ text: 'Hello' });
    chatService.sendMessage.mockResolvedValue({
      success: true,
      message: 'Hi there.',
      conversationId: 'conv-1',
      safetyLevel: 'SAFE',
    });
    textToSpeechProvider.synthesize.mockRejectedValue(new Error('tts down'));

    const result = await service.processVoiceMessage(
      'user-1',
      'conv-1',
      audioFile,
    );

    expect(result).toEqual({
      success: true,
      conversationId: 'conv-1',
      transcript: 'Hello',
      message: 'Hi there.',
      safetyLevel: 'SAFE',
      audio: null,
      audioError: 'Unable to generate voice response right now.',
    });
  });

  it('delegates emergency transcripts to ChatService', async () => {
    speechToTextProvider.transcribe.mockResolvedValue({
      text: 'I took too many tablets.',
    });
    chatService.sendMessage.mockResolvedValue({
      success: true,
      message: EMERGENCY_RESPONSE_MESSAGE,
      conversationId: 'conv-1',
      provider: 'gemini',
      safetyLevel: 'EMERGENCY',
    });
    textToSpeechProvider.synthesize.mockResolvedValue({
      audioBuffer: Buffer.from('wav'),
      mimeType: 'audio/wav',
    });

    const result = await service.processVoiceMessage(
      'user-1',
      'conv-1',
      audioFile,
    );

    expect(chatService.sendMessage).toHaveBeenCalledWith(
      'user-1',
      'conv-1',
      'I took too many tablets.',
    );
    expect(result.safetyLevel).toBe('EMERGENCY');
    expect(result.message).toBe(EMERGENCY_RESPONSE_MESSAGE);
  });
});
