import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GeminiAiProvider } from './gemini-ai.provider';

const sendMessageMock = jest.fn();
const startChatMock = jest.fn(() => ({
  sendMessage: sendMessageMock,
}));
const getGenerativeModelMock = jest.fn(() => ({
  startChat: startChatMock,
}));

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: getGenerativeModelMock,
  })),
}));

describe('GeminiAiProvider', () => {
  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'chat.gemini.apiKey') {
        return 'test-api-key';
      }
      if (key === 'chat.gemini.model') {
        return 'gemini-3.6-flash';
      }
      if (key === 'chat.gemini.timeoutMs') {
        return 30000;
      }
      return undefined;
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with the configured API key', () => {
    const provider = new GeminiAiProvider(
      configService as unknown as ConfigService,
    );

    provider.onModuleInit();

    expect(provider.providerId).toBe('gemini');
    expect(configService.get).toHaveBeenCalledWith('chat.gemini.apiKey');
  });

  it('returns generated text on success', async () => {
    sendMessageMock.mockResolvedValue({
      response: {
        text: () => '  Paracetamol is used for pain and fever.  ',
      },
    });

    const provider = new GeminiAiProvider(
      configService as unknown as ConfigService,
    );
    provider.onModuleInit();

    await expect(
      provider.generateResponse('What is paracetamol?'),
    ).resolves.toBe('Paracetamol is used for pain and fever.');
    expect(startChatMock).toHaveBeenCalledWith({ history: [] });
  });

  it('passes conversation history to Gemini using multi-turn chat', async () => {
    sendMessageMock.mockResolvedValue({
      response: {
        text: () => 'It is used for pain and fever relief.',
      },
    });

    const provider = new GeminiAiProvider(
      configService as unknown as ConfigService,
    );
    provider.onModuleInit();

    await provider.generateResponse('What is it used for?', [
      { role: 'user', content: 'What is Dolo 650?' },
      { role: 'assistant', content: 'Dolo 650 contains paracetamol.' },
    ]);

    expect(startChatMock).toHaveBeenCalledWith({
      history: [
        { role: 'user', parts: [{ text: 'What is Dolo 650?' }] },
        {
          role: 'model',
          parts: [{ text: 'Dolo 650 contains paracetamol.' }],
        },
      ],
    });
    expect(sendMessageMock).toHaveBeenCalledWith('What is it used for?');
  });

  it('throws 429 when Gemini quota or rate limit is hit', async () => {
    sendMessageMock.mockRejectedValue(new Error('rate limit'));

    const provider = new GeminiAiProvider(
      configService as unknown as ConfigService,
    );
    provider.onModuleInit();

    await expect(provider.generateResponse('Hello')).rejects.toMatchObject({
      status: 429,
      message: 'AI service is temporarily unavailable. Please try again later.',
    });
  });

  it('throws a service unavailable error when Gemini fails for other reasons', async () => {
    sendMessageMock.mockRejectedValue(new Error('network down'));

    const provider = new GeminiAiProvider(
      configService as unknown as ConfigService,
    );
    provider.onModuleInit();

    await expect(provider.generateResponse('Hello')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('throws when GEMINI_API_KEY is missing', () => {
    const missingKeyConfig = {
      get: jest.fn(() => undefined),
    };
    const provider = new GeminiAiProvider(
      missingKeyConfig as unknown as ConfigService,
    );

    expect(() => provider.onModuleInit()).toThrow(
      'GEMINI_API_KEY is required for the chat module',
    );
  });
});
