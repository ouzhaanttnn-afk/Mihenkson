import { describe, expect, it } from 'vitest';
import { tlSigned } from './format';

describe('finansal sayı normalizasyonu', () => {
  it('pozitif ve negatif sıfırı işaretsiz gösterir', () => {
    expect(tlSigned(0)).toBe('0 ₺');
    expect(tlSigned(-0)).toBe('0 ₺');
    expect(tlSigned(-0.49)).toBe('0 ₺');
  });
});
