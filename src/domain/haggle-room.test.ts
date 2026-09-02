/**
 * Pazarlık payı — ürün sınıfına göre makas genişliği.
 *
 * Playtest bulgusu: pazarlık modeli rezervasyon oranını arketipten alıyor ve
 * ürüne kör. İkinci el takıda bu doğru; standart sarrafiyede değil. Ölçüm:
 * Ata Lira getiren müşteri gerçek değerin %76'sına razı olabiliyordu, yani
 * dükkânın brüt marjı %13,8'e çıkıyordu. Gerçek sektörde gram başı ~100 ₺.
 *
 * Bu testler İKİ ŞEYİ birden korur: sarrafiyenin dar kalmasını VE işçilikli
 * ürünün daralmamasını. Tek yönlü bir test, ikinci el takıyı da yanlışlıkla
 * sıkıştıran bir değişikliği yakalayamazdı.
 */

import { describe, expect, it } from 'vitest';

import { START } from './balance';
import { poolForTemplate } from './stock-pools';
import { getTemplate, ITEM_TEMPLATES } from '@data/item-templates';
import { rulesFor } from '@data/product-classes';
import { bullionMeta, isBullion } from '@data/bullion';
import { spawnCustomer } from './customer-spawn';
import { dayCharacter } from './intent';
import { createMarketForDay, spotFor } from './market';
import { createSession, effectiveReservation } from './negotiation';
import { purchaseCeiling } from './purchase';
import { trueValue } from './valuation';
import type { NegotiationSession, StoreState, TradeSide } from './types';

const SEED = 20260828;

function makeStore(): StoreState {
  return {
    name: 'Test', cash: START.cash, reputation: START.reputation, level: 3, xp: 0, xpToNext: 900,
    storeTier: 2, displaySlots: START.displaySlots, backStockSlots: START.backStockSlots,
    workshopCapacity: START.workshopCapacity, staff: [],
    supplier: { trust: START.supplierTrust, limit: START.supplierLimit, terms: START.supplierTerms,
      openInvoices: [], priceBand: 1, specialLotEligibility: false },
    payables: [], dailyOverhead: START.dailyOverhead,
  };
}

/** Elinden geleni ardına koymayan oyuncu: tüm gerekçe ve jestler harcanmış. */
function aggressiveSession(): NegotiationSession {
  return { ...createSession('l', 'i'), usedReasons: ['a', 'b', 'c'], gesturesUsed: 3 } as NegotiationSession;
}

/** Dükkânın bir kalemi alabileceği EN DÜŞÜK fiyatın adil değere oranı. */
function bestBuyRatio(templateId: string): number[] {
  const store = makeStore();
  const out: number[] = [];
  for (let day = 1; day <= 25; day++) {
    const market = createMarketForDay(SEED, day);
    const character = dayCharacter(SEED, day, market);
    for (let i = 0; i < 70; i++) {
      const c = spawnCustomer(SEED + day, i, market, store, character);
      const item = c.items[0];
      if (c.customer.intent !== 'sell' || !item || c.items.length !== 1) continue;
      if (item.templateId !== templateId) continue;
      const fair = trueValue(item, market);
      if (fair <= 0) continue;
      const floor = effectiveReservation(
        {
          customer: c.customer, direction: 'shopBuys' as TradeSide, reputation: store.reputation,
          buyCeiling: 0, knowledge: [],
          fairValue: fair, haggleRoom: rulesFor(getTemplate(item.templateId)).haggleRoom,
        },
        aggressiveSession(),
      );
      out.push(floor / fair);
    }
  }
  return out;
}

const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;

// ===========================================================================

describe('Sarrafiyede pazarlık payı gerçek makasa oturur', () => {
  const BULLION = ['gram_gold_1', 'gram_gold_5', 'gram_gold_10', 'quarter_gold',
    'half_gold', 'full_gold', 'republic_gold', 'ata_gold'];

  it('en agresif oyuncu bile sarrafiyede %5\'ten fazla brüt marj çıkaramaz', () => {
    for (const id of BULLION) {
      const ratios = bestBuyRatio(id);
      expect(ratios.length, id).toBeGreaterThan(3);
      const margin = 1 - mean(ratios);
      // Eskiden Ata'da %13,8'di.
      expect(margin, `${id} brüt marj %${(margin * 100).toFixed(1)}`).toBeLessThan(0.05);
    }
  });

  it('tek bir sarrafiye işleminde bile marj patlamaz', () => {
    for (const id of BULLION) {
      for (const r of bestBuyRatio(id)) {
        expect(1 - r, id).toBeLessThan(0.08);
      }
    }
  });

  it('gram başı tur farkı gerçek sektörün mertebesinde kalır', () => {
    const market = createMarketForDay(SEED, 1);
    const spot = spotFor(market, 'gold');
    const store = makeStore();

    for (const id of ['gram_gold_1', 'gram_gold_5', 'full_gold', 'ata_gold']) {
      const meta = bullionMeta(id)!;
      const fair = meta.unitWeightGrams * meta.unitPurity * spot * (1 + meta.premiumRatio);
      const buy = mean(bestBuyRatio(id));

      // Satış yönü: müşterinin ödeme tavanı, aynı payla sıkıştırılmış.
      const caps: number[] = [];
      for (let day = 1; day <= 25; day++) {
        const m = createMarketForDay(SEED, day);
        const ch = dayCharacter(SEED, day, m);
        for (let i = 0; i < 70; i++) {
          const c = spawnCustomer(SEED + day, i, m, store, ch);
          if (c.customer.intent !== 'buy' || (c.customer.demand?.templateId !== id && (!c.customer.demand?.poolId || c.customer.demand.poolId !== poolForTemplate(id)))) continue;
          caps.push(
            effectiveReservation(
              {
                customer: c.customer, direction: 'shopSells' as TradeSide, reputation: store.reputation,
                buyCeiling: 0, purchaseCeiling: purchaseCeiling(c.customer, fair), knowledge: [],
                fairValue: fair,
                haggleRoom: rulesFor(getTemplate(id)).haggleRoom,
                retailSpread: rulesFor(getTemplate(id)).retailSpread,
              },
              aggressiveSession(),
            ) / fair,
          );
        }
      }
      expect(caps.length, id).toBeGreaterThan(3);

      const perGram = ((mean(caps) - buy) * fair) / meta.unitWeightGrams;
      /*
        SINIRLAR GÜNCELLENDİ — pay 0,12'den 0,06'ya inince tur farkı da indi.
        Eski sınır (100–260 ₺/g) oyunun sektörün ~2 katında oturduğu döneme
        aitti. Ölçüm: 1 g altında tur farkı 99 ₺/gram, yani playtest'te
        istenen "gram başı ~100 ₺" mertebesinin ta kendisi. Alt sınırı
        düşürmek testi gevşetmek değil, hedefi tutturmuş olmayı kabul etmek.

        Ürün primi, gramaj ve müşteri profili nedeniyle birim tur farkı aynı
        değildir. Koruma bandı çöküşü ve şişmeyi yakalar; perakende çıpasının
        maliyetin üstünde kalması aşağıdaki ayrı regresyonla bağlanır.
      */
      expect(perGram, `${id}: ${perGram.toFixed(0)} ₺/gram`).toBeGreaterThan(60);
      expect(perGram, `${id}: ${perGram.toFixed(0)} ₺/gram`).toBeLessThan(300);
    }
  });

  it('satışta perakende çıpası kabul eşiğini adil değerin üstüne taşır', () => {
    const market = createMarketForDay(SEED, 1);
    const store = makeStore();
    const spawned = spawnCustomer(SEED, 0, market, store, dayCharacter(SEED, 1, market));
    const base = {
      customer: { ...spawned.customer, reservationPrice: 123_500 },
      direction: 'shopSells' as TradeSide,
      reputation: store.reputation,
      buyCeiling: 0,
      purchaseCeiling: 123_500,
      knowledge: [],
      fairValue: 100_000,
      haggleRoom: 0.06,
      economicBand: { min: 100_000, max: 104_500 },
    };
    const withoutRetail = effectiveReservation(base, aggressiveSession());
    const withRetail = effectiveReservation({ ...base, retailSpread: 0.04 }, aggressiveSession());
    expect(withRetail).toBeGreaterThan(withoutRetail);
    expect(withRetail).toBeGreaterThan(102_000);
    expect(withRetail).toBeLessThanOrEqual(123_500);
  });
});

describe('İşçilikli ve ikinci el üründe pazarlık DARALMAZ', () => {
  it('takıda brüt marj gerçek ikinci el mertebesinde kalır', () => {
    // Bu test bir güvenlik ağıdır: sarrafiyeyi sıkıştıran değişiklik yanlışlıkla
    // takıyı da sıkıştırırsa oyunun asıl pazarlık gerilimi ölürdü.
    for (const id of ['bracelet_22k_thin', 'necklace_18k', 'ring_18k', 'silver_chain']) {
      const ratios = bestBuyRatio(id);
      expect(ratios.length, id).toBeGreaterThan(3);
      const margin = 1 - mean(ratios);
      expect(margin, `${id} brüt marj %${(margin * 100).toFixed(1)}`).toBeGreaterThan(0.08);
    }
  });

  it('her sarrafiye sınıfının payı, her işçilikli sınıfınkinden dardır', () => {
    /*
      İLİŞKİYİ bağlar, SAYIYI değil. Önce `toBe(1)` yazılmıştı; işçilikli payı
      1'den 1,5'e çıkarıldığında test kırıldı — oysa korumaya çalıştığı şey
      ("sarrafiye dar, işçilikli geniş") bozulmamıştı, aksine güçlenmişti.
      Bir sabiti çakmak, o sabitin var olma sebebini korumakla aynı şey değil.
    */
    const bullionRooms: number[] = [];
    const craftedRooms: number[] = [];
    for (const t of ITEM_TEMPLATES) {
      const room = rulesFor(t).haggleRoom;
      if (isBullion(t.id)) bullionRooms.push(room);
      else craftedRooms.push(room);
    }
    expect(bullionRooms.length).toBeGreaterThan(0);
    expect(craftedRooms.length).toBeGreaterThan(0);

    // Sarrafiye daraltılır (<1), işçilikli genişletilir (>1).
    for (const r of bullionRooms) expect(r).toBeLessThan(0.5);
    for (const r of craftedRooms) expect(r).toBeGreaterThan(1);

    // Ve aradaki fark tesadüfi değil: en geniş sarrafiye bile en dar
    // işçiliklinin onda birinden dar olmalı.
    expect(Math.max(...bullionRooms) * 10).toBeLessThan(Math.min(...craftedRooms));
  });
});

describe('Sıkıştırma pazarlığı öldürmez', () => {
  it('güven ve gerekçe sarrafiyede de fiyatı hâlâ oynatır', () => {
    const market = createMarketForDay(SEED, 1);
    const store = makeStore();
    const character = dayCharacter(SEED, 1, market);

    let compared = 0;
    for (let i = 0; i < 200; i++) {
      const c = spawnCustomer(SEED, i, market, store, character);
      const item = c.items[0];
      if (c.customer.intent !== 'sell' || !item || !isBullion(item.templateId)) continue;
      const fair = trueValue(item, market);
      if (fair <= 0) continue;
      const base = {
        customer: c.customer, direction: 'shopBuys' as TradeSide, reputation: store.reputation,
        buyCeiling: 0, knowledge: [],
        fairValue: fair, haggleRoom: rulesFor(getTemplate(item.templateId)).haggleRoom,
      };
      const cold = effectiveReservation(base, createSession('l', 'i'));
      const worked = effectiveReservation(base, aggressiveSession());
      // Pazarlık hâlâ iş görüyor: çalışan oyuncu daha ucuza alıyor.
      expect(worked).toBeLessThan(cold);
      compared++;
    }
    expect(compared).toBeGreaterThan(3);
  });

  it('pay verilmezse davranış eskisiyle birebir aynıdır', () => {
    const market = createMarketForDay(SEED, 1);
    const store = makeStore();
    const c = spawnCustomer(SEED, 2, market, store, dayCharacter(SEED, 1, market));
    const item = c.items[0];
    if (!item) return;
    const fair = trueValue(item, market);
    const base = {
      customer: c.customer, direction: 'shopBuys' as TradeSide,
      reputation: store.reputation, buyCeiling: 0, knowledge: [],
    };
    const session = aggressiveSession();
    // fairValue/haggleRoom yoksa ve room=1 ise sonuç değişmemeli.
    expect(effectiveReservation({ ...base, fairValue: fair, haggleRoom: 1 }, session))
      .toBe(effectiveReservation(base, session));
  });
});

describe('Pazarlık alanı: işçilikli GENİŞ, sarrafiye DAR', () => {
  /**
   * "Beceri farkı": aynı müşteriye karşı, tüm gerekçe ve jestini harcamış bir
   * oyuncunun ödediği fiyat ile hiçbir hamle yapmamış oyuncunun ödediği fiyat
   * arasındaki puan farkı. Pazarlığın oyuncuya AÇTIĞI alan tam olarak budur.
   *
   * Bu test sabitleri değil, sabitlerin ÜRETTİĞİ davranışı ölçer: biri
   * `haggleRoom`u değiştirir de niyeti bozarsa burada yakalanır.
   */
  function skillGap(bullion: boolean): number {
    const store = makeStore();
    const gaps: number[] = [];
    for (let day = 1; day <= 20; day++) {
      const market = createMarketForDay(SEED, day);
      const character = dayCharacter(SEED, day, market);
      for (let i = 0; i < 60; i++) {
        const c = spawnCustomer(SEED + day, i, market, store, character);
        if (c.customer.intent !== 'sell') continue;
        for (const item of c.items) {
          if (isBullion(item.templateId) !== bullion) continue;
          const fair = trueValue(item, market);
          if (fair <= 0) continue;
          const base = {
            customer: c.customer, direction: 'shopBuys' as TradeSide, reputation: store.reputation,
            buyCeiling: 0, knowledge: [],
            fairValue: fair, haggleRoom: rulesFor(getTemplate(item.templateId)).haggleRoom,
          };
          const lazy = effectiveReservation(base, createSession('l', 'i')) / fair;
          const sharp = effectiveReservation(base, aggressiveSession()) / fair;
          gaps.push(lazy - sharp);
        }
      }
    }
    gaps.sort((a, b) => a - b);
    return gaps[Math.floor(gaps.length / 2)]!; // medyan
  }

  it('sarrafiyede pazarlık alanı dardır ama SIFIR DEĞİLDİR', () => {
    const gap = skillGap(true);
    // Sıfır olsaydı gerekçe ve jest düğmeleri sarrafiyede yalan söylerdi.
    expect(gap, `sarrafiye beceri farkı ${(gap * 100).toFixed(1)} puan`).toBeGreaterThan(0.001);
    expect(gap, `sarrafiye beceri farkı ${(gap * 100).toFixed(1)} puan`).toBeLessThan(0.02);
  });

  it('işçilikli üründe pazarlık alanı belirgin biçimde geniştir', () => {
    const gap = skillGap(false);
    expect(gap, `işçilikli beceri farkı ${(gap * 100).toFixed(1)} puan`).toBeGreaterThan(0.08);
  });

  it('işçilikli alan, sarrafiye alanının en az 10 katıdır', () => {
    const bullionGap = skillGap(true);
    const craftedGap = skillGap(false);
    expect(
      craftedGap / bullionGap,
      `işçilikli ${(craftedGap * 100).toFixed(1)} puan / sarrafiye ${(bullionGap * 100).toFixed(1)} puan`,
    ).toBeGreaterThan(10);
  });
});
