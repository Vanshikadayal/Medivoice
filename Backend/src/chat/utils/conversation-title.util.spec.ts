import { generateConversationTitle } from './conversation-title.util';

describe('generateConversationTitle', () => {
  it('removes common question prefixes and question marks', () => {
    expect(generateConversationTitle('What is Dolo 650 used for?')).toBe(
      'Dolo 650 used for',
    );
  });

  it('falls back to the first 60 characters for long messages', () => {
    const longMessage =
      'This is a very long medicine question that should be truncated because it exceeds the title limit';

    expect(generateConversationTitle(longMessage)).toBe(
      'This is a very long medicine question that should be trun...',
    );
  });
});
