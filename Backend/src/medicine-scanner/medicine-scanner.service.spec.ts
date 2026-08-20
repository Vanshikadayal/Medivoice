import { MedicineScannerService } from './medicine-scanner.service';
import { IngredientFallbackService } from './ingredient-fallback.service';
import { QrMedicineResolverService } from './qr-medicine-resolver.service';
import { TesseractOcrService } from '../../ocr/tesseract-ocr.service';

describe('MedicineScannerService', () => {
  const medicineDatabaseProvider = {
    searchByCandidate: jest.fn(),
    lookupByBarcode: jest.fn(),
  };
  const tesseractOcrService = {
    recognize: jest.fn(),
  } as unknown as TesseractOcrService;
  const ingredientFallbackService = {
    lookupByIngredient: jest.fn(),
  } as unknown as IngredientFallbackService;
  const qrMedicineResolverService = {
    resolve: jest.fn(),
  } as unknown as QrMedicineResolverService;

  let service: MedicineScannerService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MedicineScannerService(
      medicineDatabaseProvider,
      tesseractOcrService,
      ingredientFallbackService,
      qrMedicineResolverService,
    );
  });

  it('returns normalized QR success response', async () => {
    (qrMedicineResolverService.resolve as jest.Mock).mockResolvedValue({
      found: true,
      candidate: { name: 'DOLO 650', strength: '650 MG', dosageForm: 'TABLETS' },
      medicine: {
        found: true,
        name: 'Dolo 650',
        activeIngredient: 'Paracetamol',
        strength: '650 MG',
        uses: ['Fever'],
        source: 'indian-medicine-dataset',
      },
    });

    const result = await service.lookupBarcode('Dolo 650');

    expect(result.found).toBe(true);
    expect(result.identification?.medicineName).toBe('Dolo 650');
    expect(result.speechSummary).toContain('Dolo 650');
  });

  it('returns QR failure message without crashing', async () => {
    (qrMedicineResolverService.resolve as jest.Mock).mockResolvedValue({
      found: false,
      message: 'Unable to retrieve medicine information from this QR code.',
    });

    const result = await service.lookupBarcode('https://invalid.example');

    expect(result.found).toBe(false);
    expect(result.message).toContain('Unable to retrieve');
  });

  it('falls back to ingredient identification for image scans', async () => {
    (tesseractOcrService.recognize as jest.Mock).mockResolvedValue(
      'Composition\nPARACETAMOL 650 MG TABLETS',
    );
    (medicineDatabaseProvider.searchByCandidate as jest.Mock).mockResolvedValue({
      found: false,
      source: null,
      sourceUrl: null,
    });
    (ingredientFallbackService.lookupByIngredient as jest.Mock).mockResolvedValue(
      null,
    );

    const result = await service.scanMedicineImage('/tmp/test.jpg');

    expect(result.found).toBe(true);
    expect(result.identification?.identificationMethod).toBe('INGREDIENT');
    expect(result.identification?.activeIngredients).toContain('Paracetamol');
    expect(result.speechSummary).toContain('paracetamol');
  });
});
