/**
 * Teklif tutarının birim karşılığı.
 *
 * Playtest: Karar Dock'unda yalnız toplam yazıyordu. "49.779 ₺" tek başına
 * karar verdirmez; sarraf fiyatı gram ya da adet başına konuşur.
 *
 * Bu testler satırın ÇIKTIĞI kadar ÇIKMADIĞI durumları da tutar: uydurulmuş
 * bir "ortalama birim fiyat" (karışık pakette 100 g külçe ile çeyreği aynı
 * kefeye koymak) ya da toplamı ikinci kez yazmak (tek adet ziynet) bilgi
 * değil, yanlış yönlendirmedir.
 */

import { describe, expect, it } from 'vitest';

import { spawnItem } from '@domain/item-spawn';
import { offerUnitLabel } from '@ui/offer-view';

const SEED = 20260828;
const item = (id: string) => spawnItem(SEED, 1, id);

describe('Gram bazlı sarrafiyede ₺/g yazılır', () => {
  it('tek 10 g külçede gram fiyatı görünür', () => {
    // 10 g × 4.000 ₺/g = 40.000 ₺
    const label = offerUnitLabel([item('gram_gold_10')], [1], 40_000);
    expect(label).toBe('10 g · 4.000 ₺/g');
  });

  it('adet artınca toplam gram da artar', () => {
    const label = offerUnitLabel([item('gram_gold_10')], [3], 120_000);
    expect(label).toBe('30 g · 4.000 ₺/g');
  });

  it('tek adette bile yazılır — toplamla aynı sayı değildir', () => {
    const label = offerUnitLabel([item('gram_gold_50')], [1], 200_000);
    expect(label).toBe('50 g · 4.000 ₺/g');
  });
});

describe('Adet bazlı ziynette ₺/adet yazılır', () => {
  it('çok adette birim fiyat görünür', () => {
    const label = offerUnitLabel([item('quarter_gold')], [4], 28_000);
    expect(label).toBe('4 adet · 7.000 ₺/adet');
  });

  it('TEK adette yazılmaz — birim fiyat toplamın kendisidir', () => {
    expect(offerUnitLabel([item('quarter_gold')], [1], 7_000)).toBeNull();
    expect(offerUnitLabel([item('ata_gold')], [1], 30_000)).toBeNull();
  });
});

describe('İşçilikli üründe', () => {
  it('tek parçada birim satırı yoktur', () => {
    expect(offerUnitLabel([item('ring_18k')], [1], 43_131)).toBeNull();
    expect(offerUnitLabel([item('bracelet_22k_thin')], [1], 90_000)).toBeNull();
  });

  it('çok parçada adet başına yazılır', () => {
    expect(offerUnitLabel([item('ring_18k')], [3], 90_000)).toBe('3 adet · 30.000 ₺/adet');
  });
});

describe('Karışık pakette birim fiyat UYDURULMAZ', () => {
  it('farklı ürünlerde yalnız adet yazılır', () => {
    // 100 g külçe ile çeyreği aynı "birim fiyatta" ortalamak yanlış olurdu.
    const label = offerUnitLabel(
      [item('gram_gold_100'), item('quarter_gold')],
      [1, 5],
      500_000,
    );
    expect(label).toBe('6 adet');
  });
});

describe('Sınır durumlar', () => {
  it('boş pakette satır yoktur', () => {
    expect(offerUnitLabel([], [], 0)).toBeNull();
  });

  it('adet sıfırsa bölme yapılmaz', () => {
    expect(offerUnitLabel([item('quarter_gold')], [0], 1_000)).toBeNull();
  });

  it('tutar sıfırken çökmez', () => {
    expect(() => offerUnitLabel([item('gram_gold_10')], [2], 0)).not.toThrow();
  });
});
