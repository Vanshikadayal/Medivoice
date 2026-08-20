import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ReminderService } from './reminder.service';
import { Reminder } from './schemas/reminder.schema';
import { Medicine } from '../medicine/schemas/medicine.schema';
import { Prescription } from '../prescription/schemas/prescription.schema';
import { HistoryService } from '../history/history.service';

describe('ReminderService', () => {
  let service: ReminderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReminderService,
        { provide: getModelToken(Reminder.name), useValue: {} },
        { provide: getModelToken(Medicine.name), useValue: {} },
        { provide: getModelToken(Prescription.name), useValue: {} },
        { provide: HistoryService, useValue: {} },
      ],
    }).compile();

    service = module.get<ReminderService>(ReminderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
