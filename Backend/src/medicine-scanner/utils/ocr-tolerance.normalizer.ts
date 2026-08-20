/**
 * Applies conservative OCR character substitutions common on medicine labels.
 * Examples: DOLO 65O → DOLO 650, D0LO → DOLO, PARACETAM0L → PARACETAMOL
 */
export function applyOcrTolerance(text: string): string {
  let result = text;

  // Digit O misread as letter O inside numeric tokens (65O → 650)
  result = result.replace(
    /(\d)[Oo](?=\s*(?:mg|mcg|g|ml|iu|%|\b))/gi,
    '$10',
  );
  result = result.replace(/(\d)[Oo](?=\d)/g, '$10');

  // Letter O misread as zero inside medicine names (D0LO → DOLO, PARACETAM0L)
  result = result.replace(
    /([A-Za-z])0([A-Za-z])/g,
    (_, before: string, after: string) => `${before}O${after}`,
  );

  // Lowercase L misread as 1 at word boundaries (1buprofen → Ibuprofen)
  result = result.replace(/\b1([a-z]{3,})/g, 'I$1');

  // Uppercase I misread as 1 in short tokens
  result = result.replace(/\b([A-Z])1([A-Z]{2,})\b/g, '$1I$2');

  return result;
}
