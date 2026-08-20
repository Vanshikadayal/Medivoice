import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HistoryService } from './history.service';
import { HistoryController } from './history.controller';
import { History, HistorySchema } from './schemas/history.schema';
import { ReminderModule } from '../reminder/reminder.module';

@Module({
  imports: [
    forwardRef(() => ReminderModule),
    MongooseModule.forFeature([{ name: History.name, schema: HistorySchema }]),
  ],
  controllers: [HistoryController],
  providers: [HistoryService],
  exports: [MongooseModule, HistoryService],
})
export class HistoryModule {}
