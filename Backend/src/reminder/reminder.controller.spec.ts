import { Test, TestingModule } from '@nestjs/testing';
import { ReminderController } from './reminder.controller';
import { ReminderService } from './reminder.service';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';

describe('ReminderController', () => {
  let controller: ReminderController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReminderController],
      providers: [{ provide: ReminderService, useValue: {} }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ReminderController>(ReminderController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
