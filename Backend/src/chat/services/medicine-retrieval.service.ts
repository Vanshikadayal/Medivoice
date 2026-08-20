import { Injectable, Logger } from '@nestjs/common';
import { IndiaMedicineDatabaseProvider } from 'src/medicine-scanner/providers/india-medicine-database.provider';
import { MedicineInformation } from 'src/medicine-scanner/types/medicine-information';
import { MedicalQueryCategory } from '../types/medical-safety';
import { extractMedicineCandidateFromChat } from '../utils/chat-medicine-candidate-extractor.util';
import {
  buildMedicineAwarePrompt,
  formatMedicineContext,
} from '../utils/medicine-context-formatter.util';
import { isMedicineQuery } from '../utils/medicine-query-detector.util';
import { MedicalQueryClassifierService } from './medical-query-classifier.service';

export type MedicineRetrievalResult = {
  prompt: string;
  medicineFound: boolean;
  medicine?: MedicineInformation;
};

@Injectable()
export class MedicineRetrievalService {
  private readonly logger = new Logger(MedicineRetrievalService.name);

  constructor(
    private readonly indiaMedicineDatabaseProvider: IndiaMedicineDatabaseProvider,
    private readonly medicalQueryClassifierService: MedicalQueryClassifierService,
  ) {}

  async retrieveForMessage(
    message: string,
    category: MedicalQueryCategory,
  ): Promise<MedicineRetrievalResult> {
    const shouldRetrieve =
      this.medicalQueryClassifierService.shouldAttemptMedicineRetrieval(
        category,
      ) || isMedicineQuery(message);

    if (!shouldRetrieve) {
      return {
        prompt: message,
        medicineFound: false,
      };
    }

    const candidate = extractMedicineCandidateFromChat(message);
    if (!candidate) {
      this.logger.debug('Medicine retrieval requested but no candidate extracted');
      return {
        prompt: message,
        medicineFound: false,
      };
    }

    const medicine =
      await this.indiaMedicineDatabaseProvider.searchByCandidate(candidate);

    if (!medicine.found) {
      this.logger.debug(
        `No Indian medicine database match for candidate: ${candidate.name}`,
      );
      return {
        prompt: message,
        medicineFound: false,
      };
    }

    const medicineContext = formatMedicineContext(medicine);
    return {
      prompt: buildMedicineAwarePrompt(message, medicineContext),
      medicineFound: true,
      medicine,
    };
  }

  /** @deprecated Use retrieveForMessage with category for safety-aware retrieval */
  async buildPromptForMessage(message: string): Promise<MedicineRetrievalResult> {
    return this.retrieveForMessage(message, MedicalQueryCategory.UNKNOWN);
  }
}
