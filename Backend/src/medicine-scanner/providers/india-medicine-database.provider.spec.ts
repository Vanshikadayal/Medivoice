import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { IndiaMedicineDatabaseProvider } from './india-medicine-database.provider';
import { CompositeMedicineScannerProvider } from './composite-medicine-scanner.provider';
import { OpenFdaMedicineProvider } from './open-fda-medicine.provider';
import { MedicineDatabaseEntry } from '../schemas/medicine-database.schema';
import { MedicineCandidate } from '../types/medicine-information';

const augmentinEntry = {
  externalId: '1',
  name: 'Augmentin 625 Duo Tablet',
  normalizedName: 'augmentin 625 duo tablet',
  price: 223.42,
  isDiscontinued: false,
  manufacturerName: 'Glaxo SmithKline Pharmaceuticals Ltd',
  type: 'Tablet',
  packSizeLabel: 'strip of 10 tablets',
  compositions: [
    { raw: 'Amoxycillin  (500mg)' },
    { raw: 'Clavulanic Acid (125mg)' },
  ],
  substitutes: [],
  sideEffects: ['Vomiting', 'Nausea', 'Diarrhea'],
  uses: ['Treatment of Bacterial infections'],
  chemicalClass: null,
  habitForming: 'No',
  therapeuticClass: 'ANTI INFECTIVES',
  actionClass: 'Broad Spectrum Antibiotic',
  source: 'indian-medicine-dataset',
};

const dolo650Entry = {
  externalId: '2',
  name: 'Dolo 650 Tablet',
  normalizedName: 'dolo 650 tablet',
  price: 30.13,
  isDiscontinued: false,
  manufacturerName: 'Micro Labs Ltd',
  type: 'Tablet',
  packSizeLabel: 'strip of 15 tablets',
  compositions: [{ raw: 'Paracetamol (650mg)' }],
  substitutes: [],
  sideEffects: ['Stomach pain', 'Nausea', 'Vomiting'],
  uses: ['Pain relief', 'Treatment of Fever'],
  chemicalClass: null,
  habitForming: 'No',
  therapeuticClass: 'ANALGESIC',
  actionClass: 'Non-opioid analgesic',
  source: 'indian-medicine-dataset',
};

function createQueryMock(results: unknown[] = []) {
  const findChain = {
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(results),
  };

  return {
    findOne: jest.fn().mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(results[0] ?? null),
      }),
    }),
    find: jest.fn().mockReturnValue(findChain),
  };
}

describe('IndiaMedicineDatabaseProvider', () => {
  let provider: IndiaMedicineDatabaseProvider;
  let model: ReturnType<typeof createQueryMock>;

  beforeEach(async () => {
    model = createQueryMock([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IndiaMedicineDatabaseProvider,
        {
          provide: getModelToken(MedicineDatabaseEntry.name),
          useValue: model,
        },
      ],
    }).compile();

    provider = module.get(IndiaMedicineDatabaseProvider);
  });

  it('finds Dolo 650 from Indian database', async () => {
    model.findOne.mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
    });
    model.find.mockReturnValue({
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([dolo650Entry]),
    });

    const candidate: MedicineCandidate = {
      name: 'DOLO',
      strength: '650 MG',
      dosageForm: 'TABLETS',
    };

    const result = await provider.searchByCandidate(candidate);

    expect(result.found).toBe(true);
    expect(result.source).toBe('indian-medicine-dataset');
    expect(result.name).toBe('Dolo 650 Tablet');
    expect(result.manufacturerName).toBe('Micro Labs Ltd');
    expect(result.genericName).toBe('Paracetamol');
  });

  it('finds Augmentin 625 Duo Tablet with dataset usage and side effects', async () => {
    model.findOne.mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(augmentinEntry),
      }),
    });

    const candidate: MedicineCandidate = {
      name: 'Augmentin 625 Duo Tablet',
    };

    const result = await provider.searchByCandidate(candidate);

    expect(result.found).toBe(true);
    expect(result.source).toBe('indian-medicine-dataset');
    expect(result.compositions?.map((item) => item.raw)).toEqual([
      'Amoxycillin  (500mg)',
      'Clavulanic Acid (125mg)',
    ]);
    expect(result.usage).toBe('Treatment of Bacterial infections');
    expect(result.sideEffects).toEqual(['Vomiting', 'Nausea', 'Diarrhea']);
    expect(result.genericName).toBeNull();
  });

  it('returns found:false for ambiguous Paracetamol candidate', async () => {
    model.findOne.mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
    });
    model.find.mockReturnValue({
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([
        dolo650Entry,
        {
          ...dolo650Entry,
          externalId: '3',
          name: 'Another Paracetamol Tablet',
          normalizedName: 'another paracetamol tablet',
        },
      ]),
    });

    const result = await provider.searchByCandidate({ name: 'PARACETAMOL' });

    expect(result.found).toBe(false);
    expect(result.source).toBe('indian-medicine-dataset');
  });

  it('returns found:false for unknown medicine', async () => {
    model.findOne.mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
    });
    model.find.mockReturnValue({
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    });

    const result = await provider.searchByCandidate({ name: 'ZORVAXIUM' });

    expect(result.found).toBe(false);
  });
});

describe('CompositeMedicineScannerProvider', () => {
  it('falls back to OpenFDA when India provider does not find a match', async () => {
    const indiaProvider = {
      searchByCandidate: jest.fn().mockResolvedValue({
        found: false,
        source: 'indian-medicine-dataset',
      }),
      lookupByBarcode: jest.fn(),
    };
    const openFdaProvider = {
      searchByCandidate: jest.fn().mockResolvedValue({
        found: true,
        source: 'openFDA',
        name: 'Acetaminophen',
      }),
      lookupByBarcode: jest.fn(),
    };

    const provider = new CompositeMedicineScannerProvider(
      indiaProvider as never,
      openFdaProvider as never,
    );

    const result = await provider.searchByCandidate({ name: 'ACETAMINOPHEN' });

    expect(indiaProvider.searchByCandidate).toHaveBeenCalled();
    expect(openFdaProvider.searchByCandidate).toHaveBeenCalled();
    expect(result.found).toBe(true);
    expect(result.source).toBe('openFDA');
  });

  it('does not call OpenFDA when India provider finds a match', async () => {
    const indiaProvider = {
      searchByCandidate: jest.fn().mockResolvedValue({
        found: true,
        source: 'indian-medicine-dataset',
        name: 'Dolo 650 Tablet',
      }),
      lookupByBarcode: jest.fn(),
    };
    const openFdaProvider = {
      searchByCandidate: jest.fn(),
      lookupByBarcode: jest.fn(),
    };

    const provider = new CompositeMedicineScannerProvider(
      indiaProvider as never,
      openFdaProvider as never,
    );

    const result = await provider.searchByCandidate({
      name: 'DOLO',
      strength: '650 MG',
    });

    expect(result.source).toBe('indian-medicine-dataset');
    expect(openFdaProvider.searchByCandidate).not.toHaveBeenCalled();
  });
});
