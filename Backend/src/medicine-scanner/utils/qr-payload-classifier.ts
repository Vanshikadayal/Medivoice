export type QrPayloadType = 'URL' | 'IDENTIFIER' | 'TEXT' | 'UNKNOWN';

export function classifyQrPayload(payload: string): QrPayloadType {
  const trimmed = payload.trim();
  if (!trimmed) {
    return 'UNKNOWN';
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return 'URL';
  }

  if (/^[A-Za-z0-9][A-Za-z0-9\-_.]{3,127}$/.test(trimmed)) {
    if (/^\d{8,14}$/.test(trimmed)) {
      return 'IDENTIFIER';
    }

    if (/^[A-Za-z]/.test(trimmed) && trimmed.length <= 64) {
      return 'TEXT';
    }

    return 'IDENTIFIER';
  }

  if (trimmed.length >= 3) {
    return 'TEXT';
  }

  return 'UNKNOWN';
}

export function isSafeMedicineUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }

    const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0'];
    if (blockedHosts.includes(parsed.hostname)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
