/**
 * MÜŞTERİ TRAFİĞİ — itibar ve kademe kaç müşteri getirir.
 *
 * En kritik test ilki: BAŞLANGIÇTA HİÇBİR ŞEY DEĞİŞMEZ. Yeni bir mekanik
 * eklerken en kolay kaçırılan şey, o mekaniğin mevcut dengeyi sessizce
 * kaydırmasıdır; çarpan başlangıç dükkânında tam 1,0 olmalı.
 */

import { describe, expect, it } from 'vitest';

import { customerDelayFactor, customerDensity } from './customer-traffic';
import { START } from './balance';
import { DAY } from './balance';
import { nextCustomerDelay } from './customer-spawn';

type Tier = 1 | 2 | 3 | 4 | 5;
const shop = (reputation: number, storeTier: Tier) => ({ reputation, storeTier });

/** Bir günde kaç müşteri gelir — çarpanı gerçek akışta ölçer. */
function customersPerDay(store: { reputation: number; storeTier: Tier }): number {
  const factor = customerDelayFactor(store);
  let clock = DAY.openMinutes + 3;
  let count = 0;
  let index = 0;
  while (clock < DAY.closeMinutes) {
    count += 1;
    index += 1;
    clock += nextCustomerDelay(4242, index, DAY.customerIntervalMinutes, false) * factor;
  }
  return count;
}

describe('başlangıç dengesi', () => {
  it('BAŞLANGIÇ DÜKKÂNINDA ÇARPAN TAM 1 — mevcut denge kaymaz', () => {
    expect(customerDensity(shop(START.reputation, 1))).toBe(1);
    expect(customerDelayFactor(shop(START.reputation, 1))).toBe(1);
  });
});

describe('itibar trafiği artırır (GDD 10.1)', () => {
  it('itibar yükseldikçe yoğunluk artar', () => {
    const dusuk = customerDensity(shop(20, 1));
    const orta = customerDensity(shop(START.reputation, 1));
    const yuksek = customerDensity(shop(80, 1));
    expect(dusuk).toBeLessThan(orta);
    expect(orta).toBeLessThan(yuksek);
  });

  it('İTİBAR DÜŞÜNCE TRAFİK DE DÜŞER — kural iki yöne de işler', () => {
    expect(customerDensity(shop(10, 1))).toBeLessThan(1);
  });

  it('mağaza kademesi ayrı bir basamak ekler', () => {
    const t1 = customerDensity(shop(START.reputation, 1));
    const t3 = customerDensity(shop(START.reputation, 3));
    expect(t3).toBeGreaterThan(t1);
  });
});

describe('uçlar kelepçeli', () => {
  it('en kötü durumda bile müşteri gelmeye devam eder', () => {
    /*
      "Hiç müşteri gelmiyor" cezası, toparlanma yolunu da kapatırdı: oyuncu
      itibarını yükseltmek için müşteriye ihtiyaç duyar.
    */
    expect(customerDensity(shop(0, 1))).toBeGreaterThanOrEqual(0.6);
    expect(customersPerDay(shop(0, 1))).toBeGreaterThan(15);
  });

  it('en iyi durumda tavan aşılmaz — kuyruk kapasitesiyle orantılı kalır', () => {
    expect(customerDensity(shop(100, 5))).toBeLessThanOrEqual(1.9);
  });
});

describe('gerçek akışta ölçüm', () => {
  it('başlangıçtan zirveye müşteri sayısı belirgin artar', () => {
    const baslangic = customersPerDay(shop(START.reputation, 1));
    const zirve = customersPerDay(shop(95, 4));
    expect(zirve).toBeGreaterThan(baslangic * 1.4);
  });

  it('ÇARPAN ZAR TÜKETMEZ — aynı index aynı ham gecikmeyi verir', () => {
    /*
      Determinizmin can damarı: çarpan `nextCustomerDelay`in SONUCUNU
      ölçekler, çekilişine dokunmaz. Ham gecikme mağaza durumundan
      bağımsızdır.
    */
    const ham = nextCustomerDelay(777, 5, DAY.customerIntervalMinutes, false);
    expect(nextCustomerDelay(777, 5, DAY.customerIntervalMinutes, false)).toBe(ham);
  });
});
