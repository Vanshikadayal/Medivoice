import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  MEDICINE_DATABASE_PROVIDER,
  type MedicineDatabaseProvider,
} from '../providers/medicine-database.provider';
import { MedicineCandidate, MedicineInformation } from '../types/medicine-information';
import { ExtractedIngredient } from '../utils/ingredient-extractor';

export type IngredientFallbackResult = {
  medicine: MedicineInformation;
  ingredient: ExtractedIngredient;
};

@Injectable()
export class IngredientFallbackService {
  private readonly logger = new Logger(IngredientFallbackService.name);

  constructor(
    @Inject(MEDICINE_DATABASE_PROVIDER)
    private readonly medicineDatabaseProvider: MedicineDatabaseProvider,
  ) {}

  async lookupByIngredient(
    ingredient: ExtractedIngredient,
  ): Promise<IngredientFallbackResult | null> {
    const candidate: MedicineCandidate = {
      name: ingredient.name.toUpperCase(),
      strength: ingredient.strength ?? null,
      dosageForm: null,
    };

    this.logger.debug(
      `[IngredientFallback] Searching for ingredient: ${candidate.name}`,
    );

    const medicine =
      await this.medicineDatabaseProvider.searchByCandidate(candidate);

    if (!medicine.found) {
      return null;
    }

    return { medicine, ingredient };
  }
}
