import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { StructuredPrescriptionExtraction } from '../types/structured-prescription';
import { buildPrescriptionExtractionPrompt } from '../prompts/prescription-extraction.prompt';
import {
  normalizeGeminiPrescriptionJson,
  parseGeminiJsonResponse,
} from '../normalizers/gemini-prescription.normalizer';

/**
 * Optional Gemini-backed structured prescription extraction.
 * Never throws into the prescription pipeline — returns null on any failure.
 */
@Injectable()
export class GeminiPrescriptionExtractionService implements OnModuleInit {
  private readonly logger = new Logger(GeminiPrescriptionExtractionService.name);
  private client: GoogleGenerativeAI | null = null;
  private modelName = 'gemini-3.6-flash';
  private timeoutMs = 30000;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const apiKey = this.configService.get<string>('chat.gemini.apiKey');
    this.modelName =
      this.configService.get<string>('chat.gemini.model') ?? 'gemini-3.6-flash';
    this.timeoutMs =
      this.configService.get<number>('chat.gemini.timeoutMs') ?? 30000;

    if (!apiKey?.trim()) {
      this.logger.warn(
        'GEMINI_API_KEY not set — prescription extraction will use deterministic parser only',
      );
      this.client = null;
      return;
    }

    this.client = new GoogleGenerativeAI(apiKey.trim());
  }

  /**
   * Attempt Gemini structured extraction.
   * Returns null on timeout, network error, invalid JSON, empty/unusable payload.
   */
  async tryExtractStructured(
    ocrText: string,
  ): Promise<StructuredPrescriptionExtraction | null> {
    const text = ocrText?.trim() ?? '';
    if (!text) {
      return null;
    }

    if (!this.client) {
      this.logger.debug('Gemini client unavailable; skipping AI extraction');
      return null;
    }

    try {
      const prompt = buildPrescriptionExtractionPrompt(text);
      const raw = await this.generateRawJson(prompt);
      const parsed = parseGeminiJsonResponse(raw);
      const normalized = normalizeGeminiPrescriptionJson(parsed);

      if (!normalized) {
        this.logger.warn(
          'Gemini prescription extraction produced unusable structure; falling back',
        );
        return null;
      }

      return normalized;
    } catch (error) {
      this.logger.warn(
        `Gemini prescription extraction failed; using deterministic fallback (${
          error instanceof Error ? error.message : 'unknown error'
        })`,
      );
      return null;
    }
  }

  private async generateRawJson(prompt: string): Promise<string> {
    if (!this.client) {
      throw new Error('Gemini client not configured');
    }

    const model = this.client.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    });

    const result = await this.withTimeout(
      model.generateContent(prompt),
      this.timeoutMs,
    );
    const responseText = result.response.text()?.trim() ?? '';
    if (!responseText) {
      throw new Error('empty response');
    }
    return responseText;
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
    let timeoutHandle: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new Error('timeout'));
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
