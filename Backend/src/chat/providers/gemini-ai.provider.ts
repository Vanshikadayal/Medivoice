import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIProvider } from './ai-provider.interface';
import { MEDICAL_CHATBOT_SYSTEM_INSTRUCTION } from './medical-chatbot-system-instruction';
import { ConversationTurn } from '../types/conversation-context';

@Injectable()
export class GeminiAiProvider implements AIProvider, OnModuleInit {
  readonly providerId = 'gemini';

  private readonly logger = new Logger(GeminiAiProvider.name);
  private client: GoogleGenerativeAI | null = null;
  private modelName = 'gemini-3.6-flash';
  private timeoutMs = 30000;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const apiKey = this.configService.get<string>('chat.gemini.apiKey');
    if (!apiKey) {
      throw new Error(
        'GEMINI_API_KEY is required for the chat module. Set it in your environment configuration.',
      );
    }

    this.modelName =
      this.configService.get<string>('chat.gemini.model') ?? 'gemini-3.6-flash';
    this.timeoutMs =
      this.configService.get<number>('chat.gemini.timeoutMs') ?? 30000;

    this.logGeminiAuthDiagnostics(apiKey, this.modelName);
    this.client = new GoogleGenerativeAI(apiKey.trim());
  }

  private logGeminiAuthDiagnostics(apiKey: string, modelName: string): void {
    const trimmedKey = apiKey.trim();
    this.logger.log(
      `Gemini auth diagnostics: GEMINI_API_KEY exists=true; key prefix=${trimmedKey.slice(0, 4)}; key length=${trimmedKey.length}; GEMINI_MODEL=${modelName}; authMechanism=x-goog-api-key via @google/generative-ai SDK`,
    );
  }

  async generateResponse(
    input: string,
    history: ConversationTurn[] = [],
  ): Promise<string> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'Unable to generate a response right now.',
      );
    }

    const model = this.client.getGenerativeModel({
      model: this.modelName,
      systemInstruction: MEDICAL_CHATBOT_SYSTEM_INSTRUCTION,
    });

    try {
      const geminiHistory = history.map((turn) => ({
        role: turn.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: turn.content }],
      }));

      const chat = model.startChat({
        history: geminiHistory,
      });

      const result = await this.withTimeout(
        chat.sendMessage(input),
        this.timeoutMs,
      );
      const text = result.response.text()?.trim();

      if (!text) {
        this.logger.warn('Gemini returned an empty response');
        throw new ServiceUnavailableException(
          'Unable to generate a response right now.',
        );
      }

      return text;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      if (isGeminiQuotaOrRateLimitError(error)) {
        this.logger.warn('Gemini quota or rate limit reached');
        throw new HttpException(
          'AI service is temporarily unavailable. Please try again later.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      this.logger.error(
        'Gemini API request failed',
        error instanceof Error ? error.message : undefined,
      );
      throw new ServiceUnavailableException(
        'Unable to generate a response right now.',
      );
    }
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
    let timeoutHandle: NodeJS.Timeout | undefined;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new Error('Gemini request timed out'));
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

function isGeminiQuotaOrRateLimitError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
          ? error
          : JSON.stringify(error);
  const lower = message.toLowerCase();
  return (
    lower.includes('429') ||
    lower.includes('quota') ||
    lower.includes('rate limit') ||
    lower.includes('rate_limit') ||
    lower.includes('resource exhausted') ||
    lower.includes('too many requests')
  );
}
