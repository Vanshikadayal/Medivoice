import { Injectable, Logger } from '@nestjs/common';
import { MedicineDatabaseProvider } from './medicine-database.provider';
import { IndiaMedicineDatabaseProvider } from './india-medicine-database.provider';
import { OpenFdaMedicineProvider } from './open-fda-medicine.provider';
import {
  MedicineCandidate,
  MedicineInformation,
} from '../types/medicine-information';

@Injectable()
export class CompositeMedicineScannerProvider
  implements MedicineDatabaseProvider
{
  private readonly logger = new Logger('MedicineScanner');

  constructor(
    private readonly indiaMedicineDatabaseProvider: IndiaMedicineDatabaseProvider,
    private readonly openFdaMedicineProvider: OpenFdaMedicineProvider,
  ) {}

  async searchByCandidate(
    candidate: MedicineCandidate,
  ): Promise<MedicineInformation> {
    const candidateLabel = [candidate.name, candidate.strength, candidate.dosageForm]
      .filter(Boolean)
      .join(' ');

    this.logger.debug(`[MedicineScanner] Candidate: ${candidateLabel}`);

    const indiaResult =
      await this.indiaMedicineDatabaseProvider.searchByCandidate(candidate);

    this.logger.debug(
      `[MedicineScanner] India source result: ${indiaResult.found ? 'found' : 'not-found'}`,
    );

    if (indiaResult.found) {
      return indiaResult;
    }

    this.logger.debug('[MedicineScanner] Falling back to OpenFDA');

    const openFdaResult =
      await this.openFdaMedicineProvider.searchByCandidate(candidate);

    if (openFdaResult.found) {
      return openFdaResult;
    }

    return {
      found: false,
      source: null,
      sourceUrl: null,
    };
  }

  async lookupByBarcode(barcode: string): Promise<MedicineInformation> {
    const indiaResult =
      await this.indiaMedicineDatabaseProvider.lookupByBarcode(barcode);

    if (indiaResult.found) {
      return indiaResult;
    }

    return this.openFdaMedicineProvider.lookupByBarcode(barcode);
  }
}
