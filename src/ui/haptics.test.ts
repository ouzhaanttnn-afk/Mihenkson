/**
 * TİTREŞİM — sessiz çökmeme ve doğru olay sözleşmesi.
 *
 * `navigator.vibrate` iOS Safari'de YOKTUR; kod bunu zararsızca karşılamalı.
 * Testler hem o durumu hem de "hangi olayda titreşir" kararını sabitliyor.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  HAPTIC_PATTERNS,
  hapticsSupported,
  playHaptic,
  resetHapticsForTests,
  stopHaptics,
} from './haptics';

afterEach(() => {
  resetHapticsForTests();
  vi.unstubAllGlobals();
});

/** `navigator.vibrate` taklidi kur ve çağrıları topla. */
function sahteCihaz() {
  const cagrilar: (number | number[])[] = [];
  vi.stubGlobal('navigator', { vibrate: (p: number | number[]) => { cagrilar.push(p); return true; } });
  return cagrilar;
}

describe('titreşim · desteklenmeyen cihaz', () => {
  /*
    iOS Safari'de `navigator.vibrate` yok. Tek bir `throw`, titreşimle hiç
    ilgisi olmayan bütün arayüzü düşürürdü.
  */
  it('API yokken çağrılar sessizce geçer', () => {
    vi.stubGlobal('navigator', {});

    expect(hapticsSupported()).toBe(false);
    expect(() => playHaptic('deal', true)).not.toThrow();
    expect(() => stopHaptics()).not.toThrow();
  });

  it('tarayıcı reddederse oyun etkilenmez', () => {
    vi.stubGlobal('navigator', { vibrate: () => { throw new Error('izin yok'); } });

    expect(() => playHaptic('deal', true)).not.toThrow();
  });
});

describe('titreşim · desteklenen cihaz', () => {
  it('anlaşma kapanınca titreşir', () => {
    const cagrilar = sahteCihaz();

    playHaptic('deal', true);

    expect(cagrilar).toEqual([HAPTIC_PATTERNS.deal]);
  });

  it('KAPALIYKEN titreşmez', () => {
    const cagrilar = sahteCihaz();

    playHaptic('deal', false);

    expect(cagrilar).toHaveLength(0);
  });

  /*
    `test` (mihenk ve ölçüm araçları) HER dokunuşta tetikleniyor; oraya
    titreşim koymak telefonu sürekli titretirdi. Tabloda bilerek yok.
  */
  it('ölçüm aracı titreşmez — telefon sürekli titremesin', () => {
    const cagrilar = sahteCihaz();

    playHaptic('test', true);

    expect(cagrilar).toHaveLength(0);
    expect(HAPTIC_PATTERNS.test).toBeUndefined();
  });

  it('ret deseni kabul deseninden FARKLIDIR — fark elde hissedilmeli', () => {
    expect(HAPTIC_PATTERNS.deny).not.toEqual(HAPTIC_PATTERNS.deal);
    expect(Array.isArray(HAPTIC_PATTERNS.deny)).toBe(true);
  });

  it('art arda gelen olaylar tek uzun titreşime dönüşmez', () => {
    const cagrilar = sahteCihaz();

    playHaptic('coins', true);
    playHaptic('coins', true);
    playHaptic('coins', true);

    expect(cagrilar).toHaveLength(1);
  });

  it('kapatınca süren titreşim kesilir', () => {
    const cagrilar = sahteCihaz();

    stopHaptics();

    expect(cagrilar).toEqual([0]);
  });

  it('bütün desenler kısa tutulmuştur — uzun titreşim rahatsız eder', () => {
    for (const desen of Object.values(HAPTIC_PATTERNS)) {
      const toplam = Array.isArray(desen) ? desen.reduce((a, b) => a + b, 0) : desen!;
      expect(toplam).toBeLessThanOrEqual(200);
    }
  });
});
