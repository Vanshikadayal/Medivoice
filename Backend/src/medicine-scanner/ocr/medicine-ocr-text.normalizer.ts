export function normalizeMedicineOcrText(rawText: string): string {
  return rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[^\S\n]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
    .trim();
}

export function hasUsefulMedicineOcrText(
  ocrText: string,
  minLetters = 8,
): boolean {
  const letters = ocrText.replace(/[^A-Za-z]/g, '');
  if (letters.length < minLetters) {
    return false;
  }

  if (!/[A-Za-z]/.test(ocrText)) {
    return false;
  }

  const meaningfulTokens = ocrText
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => /[A-Za-z0-9]/.test(token));

  if (meaningfulTokens.length < 2) {
    return false;
  }

  const hasReadableWord = meaningfulTokens.some(
    (token) => /[aeiou]/i.test(token) && /[a-z]/i.test(token),
  );

  return hasReadableWord;
}
