import { classifyQrPayload } from './qr-payload-classifier';

describe('qr-payload-classifier', () => {
  it('classifies URLs', () => {
    expect(classifyQrPayload('https://example.com/medicine/dolo')).toBe('URL');
  });

  it('classifies numeric identifiers', () => {
    expect(classifyQrPayload('8901234567890')).toBe('IDENTIFIER');
  });

  it('classifies medicine text payloads', () => {
    expect(classifyQrPayload('Dolo 650')).toBe('TEXT');
  });

  it('classifies empty payloads as unknown', () => {
    expect(classifyQrPayload('')).toBe('UNKNOWN');
  });
});
