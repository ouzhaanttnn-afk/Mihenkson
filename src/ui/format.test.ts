import { describe, expect, it } from 'vitest';
import { pct, pctSigned, tl, tlSigned } from './format';

describe('finansal sayı normalizasyonu', () => {
  it('pozitif ve negatif sıfırı işaretsiz gösterir', () => {
    expect(tlSigned(0)).toBe('0 ₺');
    expect(tlSigned(-0)).toBe('0 ₺');
    expect(tlSigned(-0.49)).toBe('0 ₺');
  });
});

/**
 * A6 — Ekspertiz kırılımında değeri DÜŞÜREN kalem `Math.abs` yüzünden artı
 * yüzdeyle ama eksi tutarla gösteriliyordu: "Kondisyon / Risk %7 · −999 ₺".
 * `pctSigned` işareti yüzdeye de taşır. `pct(-0.07)` "%-7" üretiyordu; Türkçede
 * işaret yüzde iminin ÖNÜNDE yazılır.
 */
describe('pctSigned', () => {
  it('işareti yüzde iminin önüne koyar', () => {
    expect(pctSigned(-0.07)).toBe('−%7');
    expect(pctSigned(0.02)).toBe('+%2');
  });

  it('eksi imi olarak tire değil U+2212 kullanır — tlSigned ile aynı karakter', () => {
    expect(pctSigned(-0.07)).toContain('−');
    expect(pctSigned(-0.07)).not.toContain('-');
    expect(tlSigned(-1200)).toContain('−');
  });

  it('aynı satırda tutarla birlikte tek tip eksi kullanılır', () => {
    // Kırılım satırı "−%7 · −685 ₺" okunur; iki farklı eksi karakteri değil.
    expect(tl(-685)).toBe('−685 ₺');
    expect(tl(-685)).not.toContain('-');
    expect(tl(685)).toBe('685 ₺');
  });

  it('sıfırı işaretsiz gösterir; yön yokken yön uydurmaz', () => {
    expect(pctSigned(0)).toBe('%0');
    expect(pctSigned(-0)).toBe('%0');
  });

  it('yuvarlandığında sıfıra düşen değer de işaretsizdir', () => {
    // %0,4 tam sayıya yuvarlanınca 0 olur; "+%0" bir yön varmış gibi okunurdu.
    expect(pctSigned(0.004)).toBe('%0');
    expect(pctSigned(-0.004)).toBe('%0');
  });

  it('ondalık basamak sayısına uyar ve ayraç olarak virgül kullanır', () => {
    expect(pctSigned(-0.073, 1)).toBe('−%7,3');
    expect(pctSigned(0.0725, 2)).toBe('+%7,25');
  });

  it('yuvarlamada pct ile birebir aynı davranır', () => {
    // Tek doğru kaynak `pct`; pctSigned yalnız işareti ekler, sayıyı
    // yeniden yuvarlamaz. (0,0725 ikilik tabanda 7,2499… olduğu için
    // bir basamağa "7,2" düşer — ikisi de aynı sonucu vermeli.)
    for (const [ratio, digits] of [[0.0725, 1], [-0.0725, 1], [0.12345, 3]] as const) {
      expect(pctSigned(ratio, digits)).toBe(`${ratio < 0 ? '−' : '+'}${pct(Math.abs(ratio), digits)}`);
    }
  });

  it('büyüklük olarak işaretsiz pct ile aynıdır', () => {
    expect(pctSigned(-0.07)).toBe(`−${pct(0.07)}`);
    expect(pctSigned(0.07)).toBe(`+${pct(0.07)}`);
  });
});
