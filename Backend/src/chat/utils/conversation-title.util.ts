import { DEFAULT_CONVERSATION_TITLE } from '../schemas/conversation.schema';

export function generateConversationTitle(firstMessage: string): string {
  const cleaned = firstMessage.trim().replace(/\s+/g, ' ');
  if (!cleaned) {
    return DEFAULT_CONVERSATION_TITLE;
  }

  const simplified = cleaned
    .replace(
      /^(what is|what are|how does|how do|tell me about|explain|can you explain)\s+/i,
      '',
    )
    .replace(/\?+$/g, '')
    .trim();

  if (!simplified) {
    return truncateTitle(cleaned);
  }

  return truncateTitle(
    simplified.charAt(0).toUpperCase() + simplified.slice(1),
  );
}

function truncateTitle(value: string): string {
  if (value.length <= 60) {
    return value;
  }

  return `${value.slice(0, 57).trim()}...`;
}
