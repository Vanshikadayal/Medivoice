/**
 * Strip Markdown for Piper TTS without changing medical meaning.
 * Keep the original message for chat UI display.
 */
export function sanitizeForSpeech(text: string): string {
  let result = text ?? '';

  result = result.replace(/```[\w]*\n?([\s\S]*?)```/g, (_, inner: string) =>
    (inner ?? '').trim(),
  );
  result = result.replace(/`([^`]*)`/g, '$1');
  result = result.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1');
  result = result.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
  result = result.replace(/^#{1,6}\s*/gm, '');
  result = result.replace(/#{1,6}\s+/g, '');
  result = result.replace(/(\*\*|__)(.*?)\1/g, '$2');
  result = result.replace(/(\*|_)([^*\n]+?)\1/g, '$2');
  result = result.replace(/\*\*/g, '');
  result = result.replace(/__/g, '');
  result = result.replace(/^\s*[-*+]\s+/gm, '');
  result = result.replace(/^\s*\d+\.\s+/gm, '');
  result = result.replace(/(^|\n)\s*\*\s+/g, '$1');
  result = result.replace(/•/g, '');
  result = result.replace(/[_*]/g, '');
  result = result.replace(/^\s*>\s?/gm, '');
  result = result.replace(/^\s*([-*_]){3,}\s*$/gm, '');
  result = result.replace(/[ \t]+/g, ' ');
  result = result.replace(/\n{3,}/g, '\n\n');
  result = result
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n');

  return result.trim();
}
