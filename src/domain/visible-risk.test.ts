/**
 * B1 ve B5 — İŞLEYEN AMA GÖRÜNMEYEN İKİ MEKANİK
 *
 * İkisinde de kural zaten çalışıyordu; eksik olan oyuncunun onu görebilmesiydi.
 * Bu yüzden testler EKRANDA YAZAN SAYININ KURALLA AYNI YERDEN GELDİĞİNİ
 * sabitliyor: sabit değişirse yazı da değişmek zorunda, yoksa oyuncuya yalan
 * söylemiş oluruz.
 */

import { describe, expect, it } from 'vitest';
import { isBlindTradingDay, isMarketOpen, isShopOpen, nextMarketOpenDay, weekdayLabel } from './calendar';
import { SHOWCASE_TARGET_CHANCE, showcaseTargetChancePerItem } from './purchase';

describe('B1 · körlemesine alım günü', () => {
  it('yalnız dükkân açık + piyasa kapalı olan günde doğrudur — yani cumartesi', () => {
    const gunler = Array.from({ length: 14 }, (_, i) => i + 1);
    const kor = gunler.filter(isBlindTradingDay);

    expect(kor.map(weekdayLabel)).toEqual(['Cumartesi', 'Cumartesi']);
  });

  it('pazar günü BU uyarıyı almaz — orada dükkân da kapalı, ayrı bir satır anlatır', () => {
    const pazar = 7;
    expect(isShopOpen(pazar)).toBe(false);
    expect(isBlindTradingDay(pazar)).toBe(false);
  });

  it('piyasanın açık olduğu hiçbir günde çıkmaz', () => {
    for (const day of [1, 2, 3, 4, 5, 8, 9, 12]) {
      if (isMarketOpen(day)) expect(isBlindTradingDay(day)).toBe(false);
    }
  });

  it('uyarıdaki "hangi güne kadar" gerçek açılış günüdür', () => {
    const cumartesi = 6;
    expect(weekdayLabel(nextMarketOpenDay(cumartesi))).toBe('Pazartesi');
  });
});

describe('B5 · vitrin slot seyrelmesi', () => {
  it('tek ürün varken şans spawn sabitinin ta kendisidir', () => {
    expect(showcaseTargetChancePerItem(1)).toBe(SHOWCASE_TARGET_CHANCE);
  });

  it('vitrine ürün eklendikçe ÜRÜN BAŞINA şans düşer — bedelin kendisi bu', () => {
    const bir = showcaseTargetChancePerItem(1);
    const bes = showcaseTargetChancePerItem(5);
    const sekiz = showcaseTargetChancePerItem(8);

    expect(bes).toBeLessThan(bir);
    expect(sekiz).toBeLessThan(bes);
    expect(bes).toBeCloseTo(0.04, 10);
  });

  it('toplam ilgi sabit kalır — bölüşülür, yaratılmaz', () => {
    for (const n of [1, 2, 3, 5, 8, 12]) {
      expect(showcaseTargetChancePerItem(n) * n).toBeCloseTo(SHOWCASE_TARGET_CHANCE, 10);
    }
  });

  it('vitrin boşken sıfırdır — bölme hatası yok, satır da basılmaz', () => {
    expect(showcaseTargetChancePerItem(0)).toBe(0);
    expect(showcaseTargetChancePerItem(-1)).toBe(0);
  });
});
