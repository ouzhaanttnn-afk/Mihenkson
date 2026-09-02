/**
 * "MÜŞTERİ UÇUK FİYAT İSTİYOR" REGRESYONU.
 *
 * Playtest şikâyeti: müşteriler piyasa değerine göre çok uçuk teklifler
 * veriyor. Ölçüm suçluyu başka yerde buldu — müşteri değil, dükkânın kendi
 * ALIŞ TAVANI yanlıştı. İki ürüne kör sabit vardı:
 *
 *   1. Alış tavanı hedef marjı ürün ne olursa olsun %5/11/19 idi. GDD 14.1
 *      sarrafiye için %1,5–4 diyor. Bir çeyrekten %11 marj beklemek
 *      sarraflık değil; tavan çöküyor, müşterinin makul isteği uçuk
 *      görünüyordu.
 *   2. Test edilmemiş bir çeyreğin değer bandı %53 genişlikte çıkıyordu.
 *      Çeyreğin gramajı ve ayarı ölçülerek öğrenilmez, ürünün TANIMINDA
 *      vardır. Geniş band tavanı ayrıca düşürüyordu.
 *
 * Bu testler ikisini de kilitler VE işçilikli tarafın DARALMADIĞINI
 * doğrular: ikinci el takıda belirsizlik gerçektir ve orada test etmek
 * gerçekten iş görmelidir.
 */

import { describe, expect, it } from 'vitest';

import { START } from './balance';
import { isBullion } from '@data/bullion';
import { getTemplate } from '@data/item-templates';
import { rulesFor } from '@data/product-classes';
import { spawnCustomer } from './customer-spawn';
import { dayCharacter } from './intent';
import { spawnItem } from './item-spawn';
import { createMarketForDay } from './market';
import { createSession, effectiveReservation } from './negotiation';
import { liquidityRatio } from './settlement';
import { effectiveCeiling, thesisFor } from './thesis';
import { estimateBand, initialKnowledge, trueValue } from './valuation';
import type { FieldKnowledge, StoreState, TradeSide } from './types';

const SEED = 20260828;
const MARKET = createMarketForDay(SEED, 1);

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

const BULLION = ['gram_gold_1', 'gram_gold_10', 'quarter_gold', 'half_gold', 'full_gold', 'ata_gold'];
const CRAFTED = ['ring_18k', 'bracelet_22k_thin', 'necklace_14k', 'plated_bangle'];

function widthOf(templateId: string, knowledge?: (k: FieldKnowledge[]) => FieldKnowledge[]) {
  const w: number[] = [];
  for (let i = 0; i < 25; i++) {
    const item = spawnItem(SEED, i * 3 + 1, templateId);
    const k = knowledge ? knowledge(initialKnowledge(item)) : initialKnowledge(item);
    w.push(estimateBand(item, MARKET, k).relativeWidth);
  }
  return w.reduce((a, b) => a + b, 0) / w.length;
}

const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;

// ===========================================================================

describe('Standart sarrafiye ölçülmeden de bilinir', () => {
  it('müşteriden gelen standart yatırım bileziği test yapılmadan doğrulanmış sayılmaz', () => {
    const item = spawnItem(SEED, 41, 'investment_bangle_22k_40');
    const knowledge = initialKnowledge(item);
    expect(knowledge.find((field) => field.field === 'weight')?.status).not.toBe('verified');
    expect(knowledge.find((field) => field.field === 'purity')?.status).not.toBe('verified');
  });

  it('test yapılmadan band dar kalır', () => {
    for (const id of BULLION) {
      const w = widthOf(id);
      // Eskiden çeyrek %53'tü.
      expect(w, `${id} band %${(w * 100).toFixed(1)}`).toBeLessThan(0.25);
    }
  });

  it('işçilikli üründe belirsizlik GERÇEK kalır — test anlamını yitirmez', () => {
    for (const id of CRAFTED) {
      const w = widthOf(id);
      expect(w, `${id} band %${(w * 100).toFixed(1)}`).toBeGreaterThan(0.4);
    }
  });

  it('şüphe sinyali taşıyan sarrafiye bu güveni ALMAZ', () => {
    // Sinyalli örneklerde band, temiz örneklerden belirgin geniş olmalı:
    // orada ölçüm hâlâ gerçek bilgi üretir (GDD 7).
    let clean = 0, flagged = 0, cn = 0, fn = 0;
    for (const id of BULLION) {
      for (let i = 0; i < 60; i++) {
        const item = spawnItem(SEED, i * 7 + 3, id);
        const w = estimateBand(item, MARKET, initialKnowledge(item)).relativeWidth;
        if (item.declared.visibleCondition !== 'pristine' || item.declared.observableSignals.length > 0) {
          flagged += w; fn++;
        } else { clean += w; cn++; }
      }
    }
    expect(cn).toBeGreaterThan(10);
    expect(fn).toBeGreaterThan(0);
    expect(flagged / fn).toBeGreaterThan(clean / cn);
  });
});

describe('Alış tavanı ürünün hedef marjını kullanır (GDD 14.1)', () => {
  /** Bir ürünün tavan/beklenen-net oranı, çok örnek üzerinden ortalama. */
  function ceilingShare(templateId: string, onlyClean: boolean) {
    const store = makeStore();
    const out: number[] = [];
    for (let i = 0; i < 40; i++) {
      const item = spawnItem(SEED, i * 7 + 1, templateId);
      // Şüphe sinyalli sarrafiye bilinçli olarak daha temkinli fiyatlanır;
      // hedef marjı ölçerken onları ayırmak gerekir, yoksa iki ayrı kural
      // tek ortalamada karışır.
      const flagged =
        item.declared.visibleCondition !== 'pristine' ||
        item.declared.observableSignals.length > 0;
      if (onlyClean && flagged) continue;

      const band = estimateBand(item, MARKET, initialKnowledge(item));
      const opts = thesisFor(item, band, {
        store, market: MARKET, displayUsed: 0, workshopUsed: 0,
        liquidityRatio: liquidityRatio(store.cash, []),
      });
      const best = opts[0];
      if (!best || best.expectedNet <= 0) continue;
      out.push(best.buyCeiling / best.expectedNet);
    }
    return out;
  }

  it('temiz sarrafiyede tavan, beklenen gelirin büyük kısmını bırakır', () => {
    for (const id of BULLION) {
      const shares = ceilingShare(id, true);
      expect(shares.length, id).toBeGreaterThan(5);
      const avg = mean(shares);
      // %11'lik takı marjı + geniş band ile kesilseydi bu oran çok daha
      // düşük olurdu; ölçüm eskiden çeyrekte ~%70'ti.
      expect(avg, `${id} tavan/net %${(avg * 100).toFixed(1)}`).toBeGreaterThan(0.85);
    }
  });

  it('işçilikli üründe tavan belirgin daha aşağıda — takı marjı korundu', () => {
    for (const id of CRAFTED) {
      const shares = ceilingShare(id, false);
      expect(shares.length, id).toBeGreaterThan(5);
      const avg = mean(shares);
      expect(avg, `${id} tavan/net %${(avg * 100).toFixed(1)}`).toBeLessThan(0.8);
    }
  });
});

describe('Müşteri isteği dükkânın tavanıyla aynı dünyada', () => {
  function thresholdOverCeiling(fullyMeasured: boolean) {
    const store = makeStore();
    const out: Record<'sarrafiye' | 'craft', number[]> = { sarrafiye: [], craft: [] };
    for (let day = 1; day <= 20; day++) {
      const market = createMarketForDay(SEED, day);
      const character = dayCharacter(SEED, day, market);
      for (let i = 0; i < 60; i++) {
        const c = spawnCustomer(SEED + day, i, market, store, character);
        const item = c.items[0];
        if (c.customer.intent !== 'sell' || !item || c.items.length !== 1) continue;
        const fair = trueValue(item, market);
        if (fair <= 0) continue;

        const base = initialKnowledge(item);
        const k = fullyMeasured
          ? base.map((f) => ({ ...f, certainty: 1, status: 'verified' as const }))
          : base;
        const band = estimateBand(item, market, k);
        const opts = thesisFor(item, band, {
          store, market, displayUsed: 0, workshopUsed: 0,
          liquidityRatio: liquidityRatio(store.cash, []),
        });
        const ceiling = effectiveCeiling(opts, null);
        if (ceiling <= 0) continue;

        const threshold = effectiveReservation(
          {
            customer: c.customer, direction: 'shopBuys' as TradeSide, reputation: store.reputation,
            buyCeiling: ceiling, knowledge: [], fairValue: fair,
            haggleRoom: rulesFor(getTemplate(item.templateId)).haggleRoom,
          },
          createSession('l', 'i'),
        );
        out[isBullion(item.templateId) ? 'sarrafiye' : 'craft'].push(threshold / ceiling);
      }
    }
    return out;
  }

  it('tam ölçülmüş sarrafiye KÂRLA kapanabilir', () => {
    const r = thresholdOverCeiling(true);
    expect(r.sarrafiye.length).toBeGreaterThan(30);
    // Eskiden %109'du: ölçseniz bile zarardı.
    expect(mean(r.sarrafiye)).toBeLessThan(1.03);
  });

  it('ölçülmemiş sarrafiye de duvara toslamaz', () => {
    const r = thresholdOverCeiling(false);
    expect(r.sarrafiye.length).toBeGreaterThan(30);
    const sorted = [...r.sarrafiye].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)]!;
    // Eskiden medyan %158'di — hızlı akış bir yalandı (v1.1 §2).
    expect(median, `medyan %${(median * 100).toFixed(0)}`).toBeLessThan(1.15);
  });

  it('işçilikli üründe ölçmek HÂLÂ gerekli — kolay yol açılmadı', () => {
    const blind = thresholdOverCeiling(false).craft;
    const measured = thresholdOverCeiling(true).craft;
    expect(blind.length).toBeGreaterThan(30);
    // Ölçmek eşiği tavana yaklaştırmalı; aradaki fark oyunun öğrettiği şey.
    expect(mean(measured)).toBeLessThan(mean(blind) - 0.2);
  });
});

describe('UPDATEv2 müşteri satın alma kataloğu', () => {
  it('işçilikli ürün satın alma talebi üretilmez', () => {
    const store = makeStore();
    let checked = 0;
    for (let day = 1; day <= 20; day++) {
      const market = createMarketForDay(SEED, day);
      const character = dayCharacter(SEED, day, market);
      for (let i = 0; i < 60; i++) {
        const c = spawnCustomer(SEED + day, i, market, store, character);
        const d = c.customer.demand;
        if (!d) continue;
        expect(d.wantsBullion, d.summary).toBe(true);
        expect(d.families, d.summary).toEqual([]);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(30);
  });
});
