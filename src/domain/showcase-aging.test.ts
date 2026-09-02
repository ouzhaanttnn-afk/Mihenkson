/**
 * B4 — VİTRİN BİR KARAR OLSUN, DEPO OLMASIN
 *
 * Vitrin müşterisi hedefini düzgün dağılımla seçiyordu; vitrine konan ürün
 * süresiz olarak aynı çekiciliği koruyordu. Testler hem yaşlanmanın gerçekten
 * işlediğini hem de İKİ SINIRI sabitliyor: ilgi asla sıfırlanmaz (ürün
 * ulaşılamaz hâle gelmez) ve TOPLAM ilgi büyümez (ağırlık payı yeniden
 * dağıtır, yaratmaz).
 */

import { describe, expect, it } from 'vitest';
import { Rng } from './rng';
import {
  isShowcaseStale,
  showcaseWeight,
  SHOWCASE_STALE_AGE,
  SHOWCASE_STALE_FLOOR,
} from './showcase-weight';
import { SHOWCASE_TARGET_CHANCE } from './purchase';
import type { InventoryPosition } from './types';

const poz = (age: number) => ({ age }) as unknown as InventoryPosition;

describe('B4 · vitrin yaşlanması', () => {
  it('taze mal tam ilgi görür', () => {
    expect(showcaseWeight(poz(0))).toBe(1);
  });

  it('bekledikçe ilgi DÜŞER — mekaniğin kendisi bu', () => {
    const agirliklar = [0, 1, 2, 3, 4, 5, 6].map((g) => showcaseWeight(poz(g)));

    for (let i = 1; i < agirliklar.length; i++) {
      expect(agirliklar[i]!).toBeLessThan(agirliklar[i - 1]!);
    }
  });

  it('eşik gününde tabana iner', () => {
    expect(showcaseWeight(poz(SHOWCASE_STALE_AGE))).toBeCloseTo(SHOWCASE_STALE_FLOOR, 10);
  });

  /*
    SIFIRA GİTMEZ. Sıfır ağırlık ürünü vitrinde ulaşılamaz kılardı: oyuncu
    satamadığı bir malı slot işgal ederken seyrederdi. Yaşlanma cezalandırır,
    kilitlemez.
  */
  it.each([6, 10, 30, 365])('%i gün sonra bile ilgi tabanda kalır, sıfırlanmaz', (gun) => {
    expect(showcaseWeight(poz(gun))).toBe(SHOWCASE_STALE_FLOOR);
    expect(showcaseWeight(poz(gun))).toBeGreaterThan(0);
  });

  it('bozuk yaş çökertmez', () => {
    expect(showcaseWeight(poz(-5))).toBe(1);
  });

  it('bayat rozeti eşikle aynı günde yanar — ekran ile mekanik ayrışmaz', () => {
    expect(isShowcaseStale(poz(SHOWCASE_STALE_AGE - 1))).toBe(false);
    expect(isShowcaseStale(poz(SHOWCASE_STALE_AGE))).toBe(true);
  });
});

describe('B4 · gerçek seçim dağılımı', () => {
  /*
    Ağırlık tablosu doğru olsa da seçimin ona uyduğunu ayrıca görmek gerek;
    `pickWeighted` yanlış kullanılsaydı tablo yine doğru görünürdü.
  */
  it('bayat mal taze malın belirgin biçimde gerisinde kalır', () => {
    const vitrin = [poz(0), poz(0), poz(SHOWCASE_STALE_AGE), poz(0)];
    const sayac = [0, 0, 0, 0];
    const N = 20_000;

    for (let i = 0; i < N; i++) {
      const secilen = new Rng(i + 1).pickWeighted(
        vitrin.map((p, idx) => ({ value: idx, weight: showcaseWeight(p) })),
      );
      sayac[secilen]! += 1;
    }

    const bayat = sayac[2]! / N;
    const taze = sayac[0]! / N;

    expect(bayat).toBeLessThan(taze);
    // Düzgün dağılımda dördü de %25 olurdu; bayat belirgin biçimde altında.
    expect(bayat).toBeLessThan(0.2);
    expect(bayat).toBeGreaterThan(0.05); // ama yok olmadı
  });

  it('TOPLAM İLGİ BÜYÜMEZ — ağırlık payı dağıtır, yaratmaz', () => {
    // Hedefleme olasılığı `chance(SHOWCASE_TARGET_CHANCE)` ile ayrı belirlenir;
    // ağırlık yalnız o pay içinde kimin seçileceğini değiştirir.
    const vitrin = [poz(0), poz(3), poz(SHOWCASE_STALE_AGE)];
    const paylar = vitrin.map((p) => showcaseWeight(p));
    const toplam = paylar.reduce((a, b) => a + b, 0);

    const dagilim = paylar.map((w) => (w / toplam) * SHOWCASE_TARGET_CHANCE);

    expect(dagilim.reduce((a, b) => a + b, 0)).toBeCloseTo(SHOWCASE_TARGET_CHANCE, 10);
  });

  it('hepsi aynı yaştaysa dağılım düzgün kalır — eski davranış korunur', () => {
    const vitrin = [poz(2), poz(2), poz(2), poz(2)];
    const w = vitrin.map((p) => showcaseWeight(p));

    expect(new Set(w).size).toBe(1);
  });
});
