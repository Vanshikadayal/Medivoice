import { normalizeMedicineName } from './medicine-database-normalizer';

describe('normalizeMedicineName', () => {
  it('normalizes case and spacing', () => {
    expect(normalizeMedicineName('DOLO 650')).toBe('dolo 650');
  });

  it('normalizes hyphens', () => {
    expect(normalizeMedicineName('Dolo-650')).toBe('dolo 650');
  });

  it('preserves meaningful tablet names', () => {
    expect(normalizeMedicineName('Augmentin 625 Duo Tablet')).toBe(
      'augmentin 625 duo tablet',
    );
  });
});
