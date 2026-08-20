import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MedicineDatabaseProvider } from './medicine-database.provider';
import {
  MedicineCandidate,
  MedicineInformation,
} from '../types/medicine-information';
import {
  MedicineDatabaseEntry,
} from '../schemas/medicine-database.schema';
import {
  buildExactSearchKeys,
  buildPartialNameRegex,
  escapeRegex,
  mapIndianMedicineEntry,
  selectBestIndianMedicineMatch,
} from '../utils/india-medicine-mapper';
import { normalizeMedicineName } from '../utils/medicine-database-normalizer';
import { isAmbiguousGenericCandidate } from '../utils/india-medicine-match.utils';

const MAX_PARTIAL_MATCHES = 50;
const MAX_COMPOSITION_MATCHES = 50;

@Injectable()
export class IndiaMedicineDatabaseProvider implements MedicineDatabaseProvider {
  private readonly logger = new Logger(IndiaMedicineDatabaseProvider.name);

  constructor(
    @InjectModel(MedicineDatabaseEntry.name)
    private readonly medicineDatabaseModel: Model<MedicineDatabaseEntry>,
  ) {}

  lookupByBarcode(_barcode: string): Promise<MedicineInformation> {
    return Promise.resolve({
      found: false,
      source: 'indian-medicine-dataset',
      sourceUrl: null,
    });
  }

  async searchByCandidate(
    candidate: MedicineCandidate,
  ): Promise<MedicineInformation> {
    const candidateLabel = this.formatCandidateLabel(candidate);
    this.logger.debug(`[IndiaMedicineDatabase] Candidate: ${candidateLabel}`);

    const exactMatch = await this.findExactMatch(candidate);
    this.logger.debug(
      `[IndiaMedicineDatabase] Exact match: ${exactMatch ? 'true' : 'false'}`,
    );
    if (exactMatch) {
      return mapIndianMedicineEntry(exactMatch);
    }

    const compositionMatch = await this.findCompositionMatch(candidate);
    if (compositionMatch) {
      this.logger.debug('[IndiaMedicineDatabase] Composition match: true');
      return mapIndianMedicineEntry(compositionMatch);
    }
    this.logger.debug('[IndiaMedicineDatabase] Composition match: false');

    const partialMatch = await this.findPartialMatch(candidate);
    this.logger.debug(
      `[IndiaMedicineDatabase] Partial match: ${partialMatch ? 'true' : 'false'}`,
    );
    if (partialMatch) {
      return mapIndianMedicineEntry(partialMatch);
    }

    return {
      found: false,
      source: 'indian-medicine-dataset',
      sourceUrl: null,
    };
  }

  private async findExactMatch(candidate: MedicineCandidate) {
    const searchKeys = buildExactSearchKeys(candidate);

    for (const searchKey of searchKeys) {
      const match = await this.medicineDatabaseModel
        .findOne({ normalizedName: searchKey })
        .lean()
        .exec();

      if (match) {
        return match as MedicineDatabaseEntry;
      }
    }

    return null;
  }

  private async findCompositionMatch(candidate: MedicineCandidate) {
    const compositionTerm = normalizeMedicineName(candidate.name);
    if (!compositionTerm || compositionTerm.split(/\s+/).length > 3) {
      return null;
    }

    const matches = await this.medicineDatabaseModel
      .find({
        'compositions.raw': {
          $regex: `\\b${escapeRegex(compositionTerm)}\\b`,
          $options: 'i',
        },
      })
      .limit(MAX_COMPOSITION_MATCHES)
      .lean()
      .exec();

    if (matches.length === 0) {
      return null;
    }

    if (isAmbiguousGenericCandidate(candidate) && matches.length > 1) {
      return null;
    }

    return selectBestIndianMedicineMatch(
      matches as MedicineDatabaseEntry[],
      candidate,
    );
  }

  private async findPartialMatch(candidate: MedicineCandidate) {
    const regex = buildPartialNameRegex(candidate);
    const matches = await this.medicineDatabaseModel
      .find({
        normalizedName: { $regex: regex, $options: 'i' },
      })
      .limit(MAX_PARTIAL_MATCHES)
      .lean()
      .exec();

    if (matches.length === 0) {
      return null;
    }

    return selectBestIndianMedicineMatch(
      matches as MedicineDatabaseEntry[],
      candidate,
    );
  }

  private formatCandidateLabel(candidate: MedicineCandidate): string {
    return [candidate.name, candidate.strength, candidate.dosageForm]
      .filter(Boolean)
      .join(' ');
  }
}
