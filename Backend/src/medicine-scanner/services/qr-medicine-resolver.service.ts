import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import {
  MEDICINE_DATABASE_PROVIDER,
  type MedicineDatabaseProvider,
} from '../providers/medicine-database.provider';
import { MedicineCandidate } from '../types/medicine-information';
import { classifyQrPayload, isSafeMedicineUrl } from '../utils/qr-payload-classifier';
import { extractMedicineCandidate } from '../utils/medicine-candidate-extractor';
import { applyOcrTolerance } from '../utils/ocr-tolerance.normalizer';

export type QrResolutionResult = {
  found: boolean;
  candidate?: MedicineCandidate | null;
  medicine?: Awaited<
    ReturnType<MedicineDatabaseProvider['searchByCandidate']>
  > | null;
  message?: string;
};

@Injectable()
export class QrMedicineResolverService {
  private readonly logger = new Logger(QrMedicineResolverService.name);

  constructor(
    @Inject(MEDICINE_DATABASE_PROVIDER)
    private readonly medicineDatabaseProvider: MedicineDatabaseProvider,
    private readonly configService: ConfigService,
  ) {}

  async resolve(payload: string): Promise<QrResolutionResult> {
    const trimmed = payload.trim();
    if (!trimmed) {
      return {
        found: false,
        message: 'The QR code did not contain readable medicine information.',
      };
    }

    const payloadType = classifyQrPayload(trimmed);
    this.logger.debug(`[QrResolver] Payload type: ${payloadType}`);

    switch (payloadType) {
      case 'URL':
        return this.resolveUrl(trimmed);
      case 'IDENTIFIER':
        return this.resolveIdentifier(trimmed);
      case 'TEXT':
        return this.resolveText(trimmed);
      default:
        return {
          found: false,
          message:
            'Unable to retrieve medicine information from this QR code.',
        };
    }
  }

  private async resolveUrl(url: string): Promise<QrResolutionResult> {
    if (!isSafeMedicineUrl(url)) {
      return {
        found: false,
        message:
          'Unable to retrieve medicine information from this QR code.',
      };
    }

    try {
      const pageText = await this.fetchPageText(url);
      if (!pageText) {
        return {
          found: false,
          message:
            'Unable to retrieve medicine information from this QR code.',
        };
      }

      const tolerantText = applyOcrTolerance(pageText);
      const candidate = extractMedicineCandidate(tolerantText);
      if (!candidate?.name) {
        return {
          found: false,
          message:
            'Unable to retrieve medicine information from this QR code.',
        };
      }

      const medicine =
        await this.medicineDatabaseProvider.searchByCandidate(candidate);

      if (!medicine.found) {
        return {
          found: false,
          candidate,
          medicine,
          message:
            'Unable to retrieve medicine information from this QR code.',
        };
      }

      return { found: true, candidate, medicine };
    } catch (error) {
      this.logger.warn(
        `QR URL resolution failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return {
        found: false,
        message:
          'Unable to retrieve medicine information from this QR code.',
      };
    }
  }

  private async resolveIdentifier(
    identifier: string,
  ): Promise<QrResolutionResult> {
    const barcodeResult =
      await this.medicineDatabaseProvider.lookupByBarcode(identifier);

    if (barcodeResult.found) {
      return { found: true, medicine: barcodeResult };
    }

    return this.resolveText(identifier);
  }

  private async resolveText(text: string): Promise<QrResolutionResult> {
    const tolerantText = applyOcrTolerance(text);
    const candidate = extractMedicineCandidate(tolerantText) ?? {
      name: tolerantText.replace(/[^A-Za-z0-9\s+-]/g, ' ').trim().toUpperCase(),
      strength: null,
      dosageForm: null,
    };

    if (!candidate.name || candidate.name.length < 3) {
      return {
        found: false,
        message:
          'Unable to retrieve medicine information from this QR code.',
      };
    }

    const medicine =
      await this.medicineDatabaseProvider.searchByCandidate(candidate);

    if (!medicine.found) {
      return {
        found: false,
        candidate,
        medicine,
        message:
          'Unable to retrieve medicine information from this QR code.',
      };
    }

    return { found: true, candidate, medicine };
  }

  private async fetchPageText(url: string): Promise<string | null> {
    const timeoutMs =
      this.configService.get<number>('medicineScanner.requestTimeoutMs') ??
      15000;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'text/html,application/xhtml+xml',
          'User-Agent': 'MediVoice/1.0 (medicine-scanner)',
        },
        signal: controller.signal,
        redirect: 'follow',
      });

      if (!response.ok) {
        return null;
      }

      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
        return null;
      }

      const raw = await response.text();
      const limited = raw.slice(0, 250_000);
      return this.extractMedicineTextFromHtml(limited);
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  private extractMedicineTextFromHtml(html: string): string | null {
    const titleMatch = html.match(/<title[^>]*>([^<]{3,200})<\/title>/i);
    const h1Match = html.match(/<h1[^>]*>([^<]{3,200})<\/h1>/i);
    const metaMatch = html.match(
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']{3,300})["']/i,
    );

    const parts = [
      titleMatch?.[1],
      h1Match?.[1],
      metaMatch?.[1],
    ]
      .map((part) => part?.replace(/\s+/g, ' ').trim())
      .filter(Boolean) as string[];

    if (parts.length === 0) {
      const stripped = html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      return stripped.length >= 20 ? stripped.slice(0, 2000) : null;
    }

    return parts.join('\n');
  }
}
