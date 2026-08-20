import { HistoryStatus } from './schemas/history.schema';
import { ReminderStatus } from '../reminder/enums/reminder-status.enum';

describe('HistoryService STEP 11', () => {
  it('maps history status to reminder status', () => {
    const service = {
      toReminderStatus(status: HistoryStatus) {
        switch (status) {
          case HistoryStatus.TAKEN:
            return ReminderStatus.TAKEN;
          case HistoryStatus.SKIPPED:
            return ReminderStatus.SKIPPED;
          case HistoryStatus.MISSED:
          default:
            return ReminderStatus.MISSED;
        }
      },
    };

    expect(service.toReminderStatus(HistoryStatus.TAKEN)).toBe(
      ReminderStatus.TAKEN,
    );
    expect(service.toReminderStatus(HistoryStatus.SKIPPED)).toBe(
      ReminderStatus.SKIPPED,
    );
    expect(service.toReminderStatus(HistoryStatus.MISSED)).toBe(
      ReminderStatus.MISSED,
    );
  });
});
