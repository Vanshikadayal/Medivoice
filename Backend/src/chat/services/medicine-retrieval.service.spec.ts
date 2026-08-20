import { Test, TestingModule } from '@nestjs/testing';
import { IndiaMedicineDatabaseProvider } from 'src/medicine-scanner/providers/india-medicine-database.provider';
import { MedicalQueryCategory } from '../types/medical-safety';
import { MedicalQueryClassifierService } from './medical-query-classifier.service';
import { MedicineRetrievalService } from './medicine-retrieval.service';

describe('MedicineRetrievalService', () => {
  let service: MedicineRetrievalService;

  const indiaMedicineDatabaseProvider = {
    searchByCandidate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MedicineRetrievalService,
        MedicalQueryClassifierService,
        {
          provide: IndiaMedicineDatabaseProvider,
          useValue: indiaMedicineDatabaseProvider,
        },
      ],
    }).compile();

    service = module.get(MedicineRetrievalService);
    jest.clearAllMocks();
  });

  it('returns the original prompt for general health questions', async () => {
    const result = await service.retrieveForMessage(
      'How to reduce fever at home?',
      MedicalQueryCategory.GENERAL_HEALTH,
    );

    expect(result).toEqual({
      prompt: 'How to reduce fever at home?',
      medicineFound: false,
    });
    expect(indiaMedicineDatabaseProvider.searchByCandidate).not.toHaveBeenCalled();
  });

  it('enriches medicine questions with database context', async () => {
    indiaMedicineDatabaseProvider.searchByCandidate.mockResolvedValue({
      found: true,
      name: 'Dolo 650 Tablet',
      uses: ['Pain relief', 'Treatment of Fever'],
      sideEffects: ['Nausea'],
      source: 'indian-medicine-dataset',
      sourceUrl: null,
    });

    const result = await service.retrieveForMessage(
      'What is Dolo 650?',
      MedicalQueryCategory.MEDICINE_INFORMATION,
    );

    expect(indiaMedicineDatabaseProvider.searchByCandidate).toHaveBeenCalledWith({
      name: 'DOLO 650',
      strength: '650 MG',
      dosageForm: null,
    });
    expect(result.medicineFound).toBe(true);
    expect(result.prompt).toContain('Trusted Indian medicine database record:');
    expect(result.prompt).toContain('User question: What is Dolo 650?');
  });

  it('falls back to the original prompt when no database match is found', async () => {
    indiaMedicineDatabaseProvider.searchByCandidate.mockResolvedValue({
      found: false,
      source: 'indian-medicine-dataset',
      sourceUrl: null,
    });

    const result = await service.retrieveForMessage(
      'What is UnknownMed 999?',
      MedicalQueryCategory.MEDICINE_INFORMATION,
    );

    expect(result).toEqual({
      prompt: 'What is UnknownMed 999?',
      medicineFound: false,
    });
  });
});
