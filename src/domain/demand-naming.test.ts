/**
 * MÜŞTERİ NE İSTEDİĞİNİ ADIYLA SÖYLER.
 *
 * Playtest: müşteri şeridinde "klasik takı / gümüş arıyor" yazıyordu.
 * Gerçek müşteri aile adı söylemez — "bilezik bakıyorum" der. Sarrafiyede
 * zaten somuttu ("3 adet Çeyrek Altın"); eksik olan işçilikli taraftı.
 *
 * KRİTİK DENGE: somut ad eklemek TALEBİ DARALTMAMALI. Eşleşme aile
 * düzeyinde çalışmaya devam etmeli, yoksa oyuncu yakın bir ürünü sunamaz
 * ve müşteriyi boşuna geri çevirir. Bu dosya ikisini birden sınar.
 */

import { describe, expect, it } from 'vitest';

import { START } from './balance';
import { poolForTemplate } from './stock-pools';
import { getTemplate, ITEM_TEMPLATES } from '@data/item-templates';
import { RETAIL_BULLION_CATALOG, INVESTMENT_BANGLE_WEIGHTS, bullionMeta } from '@data/bullion';
import { spawnCustomer } from './customer-spawn';
import { dayCharacter } from './intent';
import { spawnItem } from './item-spawn';
import { createMarketForDay } from './market';
import { matchDemand } from './purchase';
import { daDe } from '@ui/format';
import type { CustomerDemand, StoreState } from './types';

const SEED = 20260828;

function makeStore(tier: StoreState['storeTier']): StoreState {
  return {
    name: 'Test', cash: START.cash, reputation: START.reputation, level: 4, xp: 0, xpToNext: 900,
    storeTier: tier, displaySlots: START.displaySlots, backStockSlots: START.backStockSlots,
    workshopCapacity: START.workshopCapacity, staff: [],
    supplier: { trust: START.supplierTrust, limit: START.supplierLimit, terms: START.supplierTerms,
      openInvoices: [], priceBand: 1, specialLotEligibility: false },
    payables: [], dailyOverhead: START.dailyOverhead,
  };
}

/** Belirli bir kademede üretilen tüm alış taleplerini toplar. */
function demands(tier: StoreState['storeTier'] = 3) {
  const store = makeStore(tier);
  const out = [];
  for (let day = 1; day <= 20; day++) {
    const market = createMarketForDay(SEED, day);
    const character = dayCharacter(SEED, day, market);
    for (let i = 0; i < 60; i++) {
      const c = spawnCustomer(SEED + day, i, market, store, character);
      if (c.customer.intent === 'buy' && c.customer.demand) out.push(c.customer.demand);
    }
  }
  return out;
}

// ===========================================================================

describe('Talep somut bir ürün adı taşır', () => {
  const all = demands();

  it('örneklem gerçekten üretildi', () => {
    expect(all.length).toBeGreaterThan(50);
  });

  it('hiçbir talep ürün adı olmadan gelmez', () => {
    for (const d of all) {
      expect(d.templateId, JSON.stringify(d.summary)).not.toBeNull();
    }
  });

  it('özet metninde iç aile adı GEÇMEZ', () => {
    // "bullion", "classic", "stoneSet", "silver", "collectible"
    const leak = /bullion|classic|stoneSet|silver|collectible/;
    for (const d of all) {
      expect(leak.test(d.summary), d.summary).toBe(false);
      expect(leak.test(d.alternativesLabel), d.alternativesLabel).toBe(false);
    }
  });

  it('özet, gerçek bir ürünün görünen adını içerir', () => {
    const names = new Set(ITEM_TEMPLATES.map((t) => t.displayName));
    for (const d of all) {
      const name = getTemplate(d.templateId!)?.displayName;
      expect(names.has(name!), d.summary).toBe(true);
      if (d.poolId === '24K_GRAM_GOLD_POOL') expect(d.summary).toContain(`${d.quantity} gram altın`);
      else if (d.poolId === '22K_INVESTMENT_BANGLE_POOL') expect(d.summary).toContain(`${d.quantity * 10} gram 22 ayar işçiliksiz bilezik`);
      else expect(d.summary).toContain(name!);
    }
  });

  it('UPDATEv2 — bütün satın alma talepleri ortak perakende kataloğundan gelir', () => {
    for (const d of all) {
      expect(d.wantsBullion).toBe(true);
      expect(RETAIL_BULLION_CATALOG).toContain(d.templateId);
    }
  });
});

describe('Somut ad talebi kesin ürüne daralır', () => {
  it('istenen SKU dışında başka sarrafiye önerilmez', () => {
    for (const d of demands()) {
      const otherId = RETAIL_BULLION_CATALOG.find((id) => id !== d.templateId && (!d.poolId || poolForTemplate(id) !== d.poolId))!;
      expect(matchDemand(d, spawnItem(SEED, 1, otherId))).toBe('off');
    }
  });

  it('tam istenen ürün hâlâ en iyi eşleşmedir', () => {
    for (const d of demands()) {
      const item = spawnItem(SEED, 2, d.templateId!);
      expect(matchDemand(d, item)).toBe('exact');
    }
  });

  it('sarrafiye talebinde farklı gramaj ve tür kabul edilmez', () => {
    const bullion = demands().filter((d) => d.wantsBullion);
    expect(bullion.length).toBeGreaterThan(5);
    const other = spawnItem(SEED, 3, 'gram_gold_5');
    for (const d of bullion) {
      const expected = d.poolId === '24K_GRAM_GOLD_POOL' || d.templateId === 'gram_gold_5' ? 'exact' : 'off';
      expect(matchDemand(d, other)).toBe(expected);
    }
  });
});

describe('UPDATEv3 yatırım bileziği kataloğu', () => {
  it('yalnız 10 gramın katı 10–100 g SKU üretir', () => {
    const ids = RETAIL_BULLION_CATALOG.filter((id) => id.startsWith('investment_bangle_22k_'));
    expect(ids).toHaveLength(INVESTMENT_BANGLE_WEIGHTS.length);
    expect(ids.map((id) => Number(id.split('_').at(-1)))).toEqual([...INVESTMENT_BANGLE_WEIGHTS]);
  });

  it('işçiliksiz, taşsız ve yalnız 22 ayardır', () => {
    for (const weight of INVESTMENT_BANGLE_WEIGHTS) {
      const t = getTemplate(`investment_bangle_22k_${weight}`);
      expect(t.nominalKarat).toBe('22K');
      expect(t.weightBand).toEqual([weight, weight]);
      expect(t.craftsmanshipRatioBand).toEqual([0, 0]);
      expect(t.hasStone).toBe(false);
      expect(bullionMeta(t.id)?.unitPurity).toBe(0.922);
      expect(bullionMeta(t.id)?.premiumRatio).toBe(0);
    }
  });

  it('20 g talebi 10 g ve 30 g bileziği kesin biçimde reddeder', () => {
    const demand: CustomerDemand = {
      families: [], wantsBullion: true, templateId: 'investment_bangle_22k_20',
      quantity: 1, isBulk: false, acceptsPartial: false, minQuantity: 1,
      summary: '20 g bilezik', alternativesLabel: '',
    };
    expect(matchDemand(demand, spawnItem(SEED, 20, 'investment_bangle_22k_20'))).toBe('exact');
    expect(matchDemand(demand, spawnItem(SEED, 10, 'investment_bangle_22k_10'))).toBe('off');
    expect(matchDemand(demand, spawnItem(SEED, 30, 'investment_bangle_22k_30'))).toBe('off');
  });
});

describe('Kademe sınırı korunur', () => {
  it('kademe 1 dükkânının müşterisi üst kademe ürünü sormaz', () => {
    for (const d of demands(1)) {
      const t = getTemplate(d.templateId!);
      expect(t.minTier, `${t.displayName} minTier=${t.minTier}`).toBeLessThanOrEqual(1);
    }
  });
});

// ===========================================================================
// Dil
// ===========================================================================

describe('Türkçe ünlü uyumu', () => {
  it('"da / de" son ünlüye göre seçilir', () => {
    // Kalın ünlüyle biten
    expect(daDe('klasik takı')).toBe('da');
    expect(daDe('koleksiyon')).toBe('da');
    expect(daDe('altın')).toBe('da');
    // İnce ünlüyle biten
    expect(daDe('sarrafiye')).toBe('de');
    expect(daDe('gümüş')).toBe('de');
    expect(daDe('taşlı ürün')).toBe('de');
  });

  it('birden çok aile listelendiğinde SON kelimeye uyar', () => {
    expect(daDe('klasik takı / sarrafiye')).toBe('de');
    expect(daDe('sarrafiye / klasik takı')).toBe('da');
  });

  it('ünlü yoksa çökmez', () => {
    expect(['da', 'de']).toContain(daDe(''));
    expect(['da', 'de']).toContain(daDe('—'));
  });

  it('üretilen her alternatif etiketi için ek seçilebilir', () => {
    for (const d of demands()) {
      if (!d.alternativesLabel) continue;
      expect(['da', 'de']).toContain(daDe(d.alternativesLabel));
    }
  });
});
