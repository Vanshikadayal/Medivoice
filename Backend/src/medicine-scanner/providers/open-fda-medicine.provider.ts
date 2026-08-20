import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MedicineDatabaseProvider } from './medicine-database.provider';
import { MedicineCandidate, MedicineInformation } from '../types/medicine-information';

type OpenFdaLabelResult = {
  openfda?: {
    brand_name?: string[];
    generic_name?: string[];
    manufacturer_name?: string[];
    dosage_form?: string[];
    product_ndc?: string[];
  };
  active_ingredient?: string[];
  dosage_forms_and_strengths?: string[];
  indications_and_usage?: string[];
  dosage_and_administration?: string[];
  warnings?: string[];
  warnings_and_cautions?: string[];
  contraindications?: string[];
  do_not_use?: string[];
};

type OpenFdaLabelResponse = {
  results?: OpenFdaLabelResult[];
};

const OPENFDA_SOURCE_URL = 'https://api.fda.gov/drug/label.json';

@Injectable()
export class OpenFdaMedicineProvider implements MedicineDatabaseProvider {
  readonly providerId = 'openfda';

  private readonly logger = new Logger(OpenFdaMedicineProvider.name);

  constructor(private readonly configService: ConfigService) {}

  lookupByBarcode(_barcode: string): Promise<MedicineInformation> {
    return Promise.resolve({
      found: false,
      source: 'openFDA',
      sourceUrl: OPENFDA_SOURCE_URL,
    });
  }

  async searchByCandidate(
    candidate: MedicineCandidate,
  ): Promise<MedicineInformation> {
    const normalizedCandidate = candidate.name.trim();
    if (!normalizedCandidate) {
      return this.notFound();
    }

    const searchFields = [
      'openfda.generic_name',
      'openfda.brand_name',
      'active_ingredient',
    ] as const;

    for (const field of searchFields) {
      const label = await this.searchLabelField(field, normalizedCandidate);
      if (label) {
        return this.normalizeLabel(label);
      }
    }

    return this.notFound();
  }

  private async searchLabelField(
    field: 'openfda.generic_name' | 'openfda.brand_name' | 'active_ingredient',
    candidateName: string,
  ): Promise<OpenFdaLabelResult | null> {
    const escapedCandidate = this.escapeSearchTerm(candidateName);
    const search = `${field}:"${escapedCandidate}"`;
    const url = this.buildSearchUrl(search);

    this.logger.debug(
      `openFDA search candidate="${candidateName}" field="${field}" path="/drug/label.json?search=${search}&limit=5"`,
    );

    const response = await this.fetchOpenFda(url);

    this.logger.debug(
      `openFDA search candidate="${candidateName}" field="${field}" httpStatus=${response.status}`,
    );

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      this.logger.warn(`openFDA returned HTTP ${response.status}`);
      throw new ServiceUnavailableException(
        'Medicine database lookup is temporarily unavailable',
      );
    }

    let payload: OpenFdaLabelResponse;
    try {
      payload = (await response.json()) as OpenFdaLabelResponse;
    } catch {
      throw new BadGatewayException(
        'Medicine database returned an invalid response',
      );
    }

    const resultCount = payload.results?.length ?? 0;
    this.logger.debug(
      `openFDA search candidate="${candidateName}" field="${field}" resultCount=${resultCount}`,
    );

    if (resultCount === 0) {
      return null;
    }

    return (
      this.pickBestLabelMatch(candidateName, payload.results ?? []) ?? null
    );
  }

  private pickBestLabelMatch(
    candidateName: string,
    results: OpenFdaLabelResult[],
  ) {
    const normalizedCandidate = candidateName.toLowerCase();

    return (
      results.find((result) =>
        result.openfda?.generic_name?.some((name) =>
          name.toLowerCase().includes(normalizedCandidate),
        ),
      ) ??
      results.find((result) =>
        result.openfda?.brand_name?.some((name) =>
          name.toLowerCase().includes(normalizedCandidate),
        ),
      ) ??
      results.find((result) =>
        result.active_ingredient?.some((ingredient) =>
          ingredient.toLowerCase().includes(normalizedCandidate),
        ),
      ) ??
      results[0]
    );
  }

  private normalizeLabel(label: OpenFdaLabelResult): MedicineInformation {
    const brandName = label.openfda?.brand_name?.[0] ?? null;
    const genericName = label.openfda?.generic_name?.[0] ?? null;
    const activeIngredient = this.extractActiveIngredientName(
      label.active_ingredient,
    );
    const strength =
      this.extractStrength(label.active_ingredient) ??
      this.extractStrengthFromDosageForms(label.dosage_forms_and_strengths);
    const dosageForm =
      label.openfda?.dosage_form?.[0] ??
      this.extractDosageForm(label.dosage_forms_and_strengths);

    return {
      found: true,
      name: brandName ?? genericName ?? activeIngredient,
      brandName,
      genericName,
      salt: null,
      activeIngredient,
      strength,
      dosageForm,
      usage: this.joinUnique(label.indications_and_usage),
      dosageInformation: this.joinUnique(label.dosage_and_administration),
      warnings: this.joinUnique(label.warnings, label.warnings_and_cautions),
      contraindications:
        this.joinUnique(label.contraindications, label.do_not_use),
      source: 'openFDA',
      sourceUrl: OPENFDA_SOURCE_URL,
    };
  }

  private extractActiveIngredientName(
    ingredients: string[] | undefined,
  ): string | null {
    if (!ingredients?.length) {
      return null;
    }

    const combined = ingredients.join(' ');
    const activeIngredientMatch = combined.match(
      /active ingredient(?:\(s\))?\s+([A-Za-z][A-Za-z0-9\s,+-]+?)(?:\s+\d|\s*$)/i,
    );
    if (activeIngredientMatch?.[1]) {
      return activeIngredientMatch[1].split(',')[0]?.trim() ?? null;
    }

    const strengthMatch = combined.match(
      /\b([A-Za-z][A-Za-z0-9+-]{2,})\s+\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu)\b/i,
    );
    if (strengthMatch?.[1] && !/^(active|ingredient|each)$/i.test(strengthMatch[1])) {
      return strengthMatch[1];
    }

    return null;
  }

  private extractStrength(
    ingredients: string[] | undefined,
  ): string | null {
    if (!ingredients?.length) {
      return null;
    }

    const strengthMatch = ingredients.join(' ').match(
      /\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu)\b/i,
    );

    return strengthMatch?.[0].replace(/\s+/g, ' ').trim() ?? null;
  }

  private extractStrengthFromDosageForms(
    dosageForms: string[] | undefined,
  ): string | null {
    if (!dosageForms?.length) {
      return null;
    }

    const strengthMatch = dosageForms.join(' ').match(
      /\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu)\b/i,
    );

    return strengthMatch?.[0].replace(/\s+/g, ' ').trim() ?? null;
  }

  private extractDosageForm(
    dosageForms: string[] | undefined,
  ): string | null {
    if (!dosageForms?.length) {
      return null;
    }

    const text = dosageForms.join(' ');
    if (/\btablets?\b/i.test(text)) {
      return 'TABLET';
    }
    if (/\bcapsules?\b/i.test(text)) {
      return 'CAPSULE';
    }
    if (/\bsyrup\b/i.test(text)) {
      return 'SYRUP';
    }
    if (/\binjection\b/i.test(text)) {
      return 'INJECTION';
    }
    if (/\bcream\b/i.test(text)) {
      return 'CREAM';
    }
    if (/\bointment\b/i.test(text)) {
      return 'OINTMENT';
    }

    return null;
  }

  private notFound(): MedicineInformation {
    return {
      found: false,
      source: 'openFDA',
      sourceUrl: OPENFDA_SOURCE_URL,
    };
  }

  private joinUnique(...groups: Array<string[] | undefined>) {
    const values = groups
      .flatMap((group) => group ?? [])
      .map((value) => value.trim())
      .filter(Boolean);

    if (values.length === 0) {
      return null;
    }

    return [...new Set(values)].join('; ');
  }

  private buildSearchUrl(search: string) {
    const baseUrl =
      this.configService.get<string>('medicineScanner.openFda.baseUrl') ??
      'https://api.fda.gov';
    const apiKey = this.configService.get<string>('medicineScanner.openFda.apiKey');
    const apiKeyParam = apiKey ? `&api_key=${encodeURIComponent(apiKey)}` : '';

    return `${baseUrl.replace(/\/$/, '')}/drug/label.json?search=${search}&limit=5${apiKeyParam}`;
  }

  private escapeSearchTerm(value: string) {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  private async fetchOpenFda(url: string) {
    const timeoutMs =
      this.configService.get<number>('medicineScanner.requestTimeoutMs') ??
      15000;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'MediVoice/1.0 (medicine-scanner)',
        },
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new GatewayTimeoutException(
          'Medicine database lookup timed out',
        );
      }

      this.logger.error(
        'openFDA request failed',
        error instanceof Error ? error.stack : undefined,
      );
      throw new ServiceUnavailableException(
        'Medicine database lookup is temporarily unavailable',
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
