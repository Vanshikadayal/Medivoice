import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { MedicineService } from './medicine.service';
import { Medicine } from './schemas/medicine.schema';
import { Prescription } from '../prescription/schemas/prescription.schema';
import { ReminderService } from '../reminder/reminder.service';

describe('MedicineService', () => {
  let service: MedicineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MedicineService,
        { provide: getModelToken(Medicine.name), useValue: {} },
        { provide: getModelToken(Prescription.name), useValue: {} },
        { provide: ReminderService, useValue: {} },
      ],
    }).compile();

    service = module.get<MedicineService>(MedicineService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
