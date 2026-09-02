/**
 * Niyet cümlesi sözleşmesi.
 *
 * İki şeyi birden korur:
 *   1. Cümle SOMUT olmalı — ürün adı ve adedi geçmeli, "ürün" gibi soyut bir
 *      yer tutucuya düşmemeli.
 *   2. Cümle GİZLİ GERÇEK SIZDIRMAMALI (GDD 6.6) — ölçülmemiş ağırlık, gerçek
 *      ayar ya da rezervasyon fiyatı görünmemeli.
 * Yalnız birincisini test etmek, ürünün gerçeğini ekrana döken bir
 * "iyileştirmeyi" yeşil geçirirdi.
 */

import { describe, expect, it } from 'vitest';

import { customerIntentLine } from './intent-line';
import { spawnCustomer } from '@domain/customer-spawn';
import { dayCharacter } from '@domain/intent';
import { createMarketForDay } from '@domain/market';
import { START } from '@domain/balance';
import { bullionMeta } from '@data/bullion';
import type { Customer, ItemInstance, StoreState } from '@domain/types';

const SEED = 20260828;

function makeStore(): StoreState {
  return {
    name: 'T', cash: START.cash, reputation: START.reputation, level: 3, xp: 0, xpToNext: 900,
    storeTier: 2, displaySlots: START.displaySlots, backStockSlots: START.backStockSlots,
    workshopCapacity: START.workshopCapacity, staff: [],
    supplier: { trust: START.supplierTrust, limit: START.supplierLimit, terms: START.supplierTerms,
      openInvoices: [], priceBand: 1, specialLotEligibility: false },
    payables: [], dailyOverhead: START.dailyOverhead,
  } as StoreState;
}

/** Oyunun gerçekten ürettiği müşterileri gezer. */
function everyCustomer(fn: (c: Customer, items: ItemInstance[]) => void) {
  const store = makeStore();
  for (let day = 1; day <= 12; day++) {
    const market = createMarketForDay(SEED, day);
    const character = dayCharacter(SEED, day, market);
    for (let i = 0; i < 60; i++) {
      const sp = spawnCustomer(SEED + day, i, market, store, character);
      fn(sp.customer, sp.items);
    }
  }
}

describe('niyet cümlesi somuttur', () => {
  it('satış niyetinde getirilen ürünün adı geçer', () => {
    let checked = 0;
    everyCustomer((c, items) => {
      if (c.intent !== 'sell' || items.length === 0) return;
      const line = customerIntentLine(c, items);
      expect(line, line).toContain(items[0]!.displayName);
      checked += 1;
    });
    expect(checked).toBeGreaterThan(20);
  });

  it('alış niyetinde istenen ürün adı ve adedi geçer', () => {
    let checked = 0;
    everyCustomer((c) => {
      if (c.intent !== 'buy' || !c.demand?.templateId) return;
      const line = customerIntentLine(c, []);
      expect(line, line).toMatch(/almak istiyor$/);
      if (c.demand.quantity > 1) {
        expect(line, line).toContain(String(c.demand.quantity));
      }
      checked += 1;
    });
    expect(checked).toBeGreaterThan(10);
  });

  it('her müşteri için cümle müşterinin EYLEMİYLE biter', () => {
    everyCustomer((c, items) => {
      const line = customerIntentLine(c, items);
      expect(line, `${c.intent}: ${line}`).toMatch(/istiyor$|danışıyor$/);
    });
  });

  it('soyut "alış / satış" kalıbı hiçbir cümlede geçmez', () => {
    everyCustomer((c, items) => {
      const line = customerIntentLine(c, items);
      expect(line.toLowerCase(), line).not.toContain('alış');
      expect(line.toLowerCase(), line).not.toContain('satış');
      // Eski kalıp: "Ürün satmak / bozdurmak istiyor"
      expect(line, line).not.toContain(' / ');
    });
  });

  it('sarrafiyede adet ürünün kendi adıyla sayılır ("3 Çeyrek Altın")', () => {
    const c = { intent: 'sell' } as Customer;
    const quarter = (id: string) =>
      ({ id, templateId: 'quarter_gold', displayName: 'Çeyrek Altın' }) as ItemInstance;
    expect(customerIntentLine(c, [quarter('a'), quarter('b'), quarter('c')]))
      .toBe('3 Çeyrek Altın bozdurmak istiyor');
  });

  it('işçilikli üründe "adet" kullanılır', () => {
    const c = { intent: 'sell' } as Customer;
    const ring = (id: string) =>
      ({ id, templateId: 'ring_14k', displayName: '14 Ayar Yüzük' }) as ItemInstance;
    expect(customerIntentLine(c, [ring('a')])).toBe('14 Ayar Yüzük satmak istiyor');
    expect(customerIntentLine(c, [ring('a'), ring('b')]))
      .toBe('2 adet 14 Ayar Yüzük satmak istiyor');
  });

  it('servis ve ekspertizde ürün adı geçer', () => {
    const items = [{ id: 'a', templateId: 'ring_14k', displayName: '14 Ayar Yüzük' } as ItemInstance];
    expect(customerIntentLine({ intent: 'service' } as Customer, items))
      .toBe('14 Ayar Yüzük için tamir/servis istiyor');
    expect(customerIntentLine({ intent: 'appraisal' } as Customer, items))
      .toBe('14 Ayar Yüzük için ekspertiz istiyor');
  });

  it('kalem yoksa cümle yine de anlamlıdır — boş metin üretilmez', () => {
    for (const intent of ['sell', 'buy', 'service', 'appraisal'] as const) {
      const line = customerIntentLine({ intent, demand: null } as unknown as Customer, []);
      expect(line.length, intent).toBeGreaterThan(8);
    }
  });
});

describe('niyet cümlesi gizli gerçeği sızdırmaz (GDD 6.6)', () => {
  /*
    NOT — bu iki test önce yanlış yazılmıştı ve yanlış alarm verdi:
      · Sarrafiye ŞABLON ADI zaten gramajı taşıyor ("Gram Altın (2,5 g)").
        Bu gizli gerçek değil, ürünün herkesçe bilinen kimliği. Ham ağırlık
        karşılaştırması bunu sızıntı sanmıştı.
      · Yuvarlanmış rezervasyon fiyatını alt dize olarak aramak, ürün
        adındaki "10 g"nin içindeki "0"a takılıyordu.
    Doğru soru "şu rakam metinde geçiyor mu" değil, "BEYANDAN FARKLI olan
    gerçek görünüyor mu" ve "fiyat gibi okunan bir sayı var mı".
  */
  it('beyandan farklı olan gerçek ağırlık/ayar cümlede geçmez', () => {
    let checked = 0;
    everyCustomer((c, items) => {
      const line = customerIntentLine(c, items);
      for (const item of items) {
        // Ürün adının kendisi kimliktir; onun dışında gerçek sızmamalı.
        const withoutName = line.split(item.displayName).join('');

        const claimed = item.declared.claimedWeight ?? 0;
        if (Math.abs(item.truth.grossWeight - claimed) > 0.05) {
          const realWeight = item.truth.grossWeight.toFixed(1).replace('.', ',');
          expect(withoutName, `${line} ← gerçek ağırlık ${realWeight}`).not.toContain(realWeight);
          checked += 1;
        }
        if (item.truth.actualKarat !== item.declared.claimedKarat) {
          expect(withoutName, `${line} ← gerçek ayar`).not.toContain(
            `${item.truth.actualKarat} Ayar`,
          );
          checked += 1;
        }
      }
    });
    // Test gerçekten çalışmış olmalı: hiç farklı örnek görmediyse boş geçmiştir.
    expect(checked, 'beyanı gerçeğinden farklı hiç kalem denenmedi').toBeGreaterThan(5);
  });

  it('cümlede fiyat gibi okunan hiçbir sayı yoktur', () => {
    everyCustomer((c, items) => {
      const line = customerIntentLine(c, items);
      expect(line, line).not.toContain('₺');
      expect(line, line).not.toContain('TL');
      /*
        Cümlede meşru sayılar var: ürün adındaki gramaj ("1 g") ve talebin
        ADEDİ (toplu müşteri 102 gram altın isteyebilir). İkisini de düşüp
        geriye kalanda üç haneli bir sayı ararız — orada kalan bir sayı
        ancak fiyat olabilir.
      */
      let rest = items.reduce((acc, i) => acc.split(i.displayName).join(''), line);
      const demandQty = c.demand?.quantity;
      if (demandQty !== undefined) rest = rest.split(String(demandQty)).join('');
      const meta = c.demand?.templateId ? bullionMeta(c.demand.templateId) : null;
      if (meta) rest = rest.split(String(meta.unitWeightGrams).replace('.', ',')).join('');
      const bangleWeight = c.demand?.templateId?.match(/^investment_bangle_22k_(\d+)$/)?.[1];
      if (bangleWeight) rest = rest.split(bangleWeight).join('').replace('22 ayar', 'ayar');
      expect(rest, `${line} ← fiyat benzeri sayı`).not.toMatch(/\d{3,}/);
    });
  });
});
