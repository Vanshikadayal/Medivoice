import { spawn } from 'child_process';
import { mkdtemp, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';
import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TextToSpeechProvider } from './text-to-speech.provider';
import { SynthesizedSpeech } from '../types/synthesized-speech';

@Injectable()
export class LocalPiperTextToSpeechProvider
  implements TextToSpeechProvider, OnModuleInit
{
  readonly providerId = 'local-piper';

  private readonly logger = new Logger(LocalPiperTextToSpeechProvider.name);
  private executable = '';
  private model = '';
  private configPath = '';
  private timeoutMs = 30000;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.executable =
      this.configService.get<string>('voice.textToSpeech.executable') ?? '';
    this.model = this.configService.get<string>('voice.textToSpeech.model') ?? '';
    this.configPath =
      this.configService.get<string>('voice.textToSpeech.config') ?? '';
    this.timeoutMs =
      this.configService.get<number>('voice.textToSpeech.timeoutMs') ?? 30000;

    if (!this.executable || !this.model) {
      this.logger.warn(
        'PIPER_EXECUTABLE or PIPER_MODEL is not configured. Voice synthesis will be unavailable.',
      );
    }
  }

  async synthesize(text: string): Promise<SynthesizedSpeech> {
    if (!this.executable || !this.model) {
      throw new ServiceUnavailableException(
        'Unable to generate voice response right now.',
      );
    }

    const tempDir = await mkdtemp(join(tmpdir(), 'medivoice-piper-'));
    const outputPath = join(tempDir, `${randomUUID()}.wav`);

    try {
      await this.runPiper(text, outputPath);
      const audioBuffer = await readFile(outputPath);

      return {
        audioBuffer,
        mimeType: 'audio/wav',
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      this.logger.error(
        'Local Piper synthesis failed',
        error instanceof Error ? error.message : undefined,
      );
      throw new ServiceUnavailableException(
        'Unable to generate voice response right now.',
      );
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  }

  private runPiper(text: string, outputPath: string): Promise<void> {
    const args = ['--model', this.model, '--output_file', outputPath];
    if (this.configPath) {
      args.push('--config', this.configPath);
    }

    return new Promise((resolve, reject) => {
      const child = spawn(this.executable, args, {
        stdio: ['pipe', 'ignore', 'pipe'],
      });

      let stderr = '';
      const timeoutHandle = setTimeout(() => {
        child.kill('SIGKILL');
        reject(new Error('Local Piper request timed out'));
      }, this.timeoutMs);

      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      child.on('error', (error) => {
        clearTimeout(timeoutHandle);
        reject(error);
      });

      child.on('close', (code) => {
        clearTimeout(timeoutHandle);
        if (code === 0) {
          resolve();
          return;
        }

        reject(new Error(stderr.trim() || `Piper exited with code ${code}`));
      });

      child.stdin.write(text);
      child.stdin.end();
    });
  }
}
