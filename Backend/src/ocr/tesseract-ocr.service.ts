import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { createWorker, type Worker } from 'tesseract.js';

@Injectable()
export class TesseractOcrService implements OnModuleDestroy {
  private readonly logger = new Logger(TesseractOcrService.name);
  private workerPromise?: Promise<Worker>;

  async recognize(imagePath: string): Promise<string> {
    try {
      const worker = await this.getWorker();
      const { data } = await worker.recognize(imagePath);
      return data.text ?? '';
    } catch (error) {
      this.logger.error(
        'Tesseract OCR failed',
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException('OCR failed to process the image');
    }
  }

  async onModuleDestroy() {
    if (!this.workerPromise) {
      return;
    }

    try {
      const worker = await this.workerPromise;
      await worker.terminate();
    } catch {
      this.logger.warn('Failed to terminate Tesseract worker');
    }
  }

  private getWorker() {
    if (!this.workerPromise) {
      this.workerPromise = createWorker('eng', undefined, {
        logger: () => undefined,
      });
    }

    return this.workerPromise;
  }
}
