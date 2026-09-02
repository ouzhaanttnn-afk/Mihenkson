/**
 * MIHENKAYNAK — Sarrafiye fiyat görünürlüğü ve playtest alım testleri
 * Kaynak: Hızlı Sarrafiye Fiyat Görünürlüğü + Playtest Stok Alımı revizyonu.
 */

import { describe, expect, it } from 'vitest';

import { START } from './balance';
import { createMarketForDay } from './market';
import { spawnItem } from './item-spawn';
import { bullionMeta, isBullion } from '@data/bullion';
import { getTemplate } from '@data/item-templates';
import {
  bullionUnitValue,
  isPerGramProduct,
  marketReferenceBuy,
  marketReferenceSell,
  unitPriceView,
} from './channels';
import { supplyOffer } from './wholesaler';
import type { StoreState } from './types';

const SEED = 20260827;
const MARKET = createMarketForDay(SEED, 1);

const POOL = [
  'gram_gold_1',
  'gram_gold_2_5',
  'gram_gold_5',
  'gram_gold_10',
  'gram_gold_20',
  'gram_gold_50',
  'gram_gold_100',
  'quarter_gold',
  'half_gold',
  'full_gold',
  'ata_gold',
];

function makeStore(cash: number = START.cash): StoreState {
  return {
    name: 'Test',
    cash,
    reputation: 50,
    level: 2,
    xp: 0,
    xpToNext: 580,
    storeTier: 1,
    displaySlots: 8,
    backStockSlots: 16,
    workshopCapacity: 2,
    staff: [],
    supplier: {
      trust: 50,
      limit: 100_000,
      terms: 3,
      openInvoices: [],
      priceBand: 1,
      specialLotEligibility: false,
    },
    payables: [],
    dailyOverhead: 1_200,
  };
}

// ===========================================================================
// §1 — BİRİM FİYAT GÖRÜNÜRLÜĞÜ
// ===========================================================================

describe('§1 — Sarrafiyede birim fiyat görünür', () => {
  it('gram bazlı ürün ₺/g, adet bazlı ürün ₺/adet okunur', () => {
    const gram = spawnItem(SEED, 1, 'gram_gold_10');
    const ceyrek = spawnItem(SEED, 2, 'quarter_gold');

    expect(unitPriceView(gram, 100_000).unit).toBe('₺/g');
    expect(unitPriceView(ceyrek, 100_000).unit).toBe('₺/adet');
    expect(isPerGramProduct('gram_gold_50')).toBe(true);
    expect(isPerGramProduct('ata_gold')).toBe(false);
  });

  it('gram bazlı üründe birim fiyat GRAMA bölünür', () => {
    const gram = spawnItem(SEED, 1, 'gram_gold_10');
    const view = unitPriceView(gram, 45_000);
    expect(view.gramsPerPiece).toBe(10);
    expect(view.unitPrice).toBe(4_500);
  });

  it('adet bazlı üründe birim fiyat adedin kendisidir', () => {
    const ceyrek = spawnItem(SEED, 2, 'quarter_gold');
    const view = unitPriceView(ceyrek, 7_300);
    expect(view.unitPrice).toBe(7_300);
    expect(view.perGram).toBe(false);
  });

  it('toplam satırı yalnız birim fiyatın toplamı VERMEDİĞİ üründe gerekir', () => {
    // Teklif ekranındaki "gram × ₺/g = toplam" satırının kuralı budur:
    // adet bazlı üründe birim fiyat zaten toplamdır, satır tekrar olurdu.
    const gerekir = (templateId: string) => {
      const v = unitPriceView(spawnItem(SEED, 1, templateId), 100_000);
      return v.perGram && v.gramsPerPiece > 1;
    };
    expect(gerekir('gram_gold_10')).toBe(true);
    expect(gerekir('gram_gold_100')).toBe(true);
    // 1 g'da ₺/g zaten adedin fiyatı; tekrar satır gerekmez.
    expect(gerekir('gram_gold_1')).toBe(false);
    // Adet bazlı ürünlerde hiç gerekmez.
    expect(gerekir('quarter_gold')).toBe(false);
    expect(gerekir('ata_gold')).toBe(false);
  });

  it('adet × birim fiyat = toplam (§1 toplu işlem kuralı)', () => {
    const ceyrek = spawnItem(SEED, 2, 'quarter_gold');
    const lot = supplyOffer(ceyrek, 6, MARKET, makeStore())!;
    expect(Math.round(lot.unitPrice * lot.quantity)).toBe(lot.total);
  });

  it('gram bazlıda gram × ₺/g ≈ toplam', () => {
    const gram = spawnItem(SEED, 1, 'gram_gold_10');
    const lot = supplyOffer(gram, 3, MARKET, makeStore())!;
    const view = unitPriceView(gram, lot.unitPrice);
    // 3 adet × 10 g = 30 g; yuvarlama payıyla toplamı vermeli.
    expect(Math.abs(view.unitPrice * lot.grams - lot.total)).toBeLessThan(lot.grams + 1);
  });
});

// ===========================================================================
// §2 — PİYASA REFERANS ALIŞ
// ===========================================================================

describe('§2 — Piyasa referans alış dinamik ve tarafsızdır', () => {
  const item = spawnItem(SEED, 3, 'quarter_gold');
  const base = bullionUnitValue(item, MARKET);

  it('referans piyasadan türer, hardcode değildir', () => {
    const ucuz = marketReferenceBuy(item, MARKET, base);
    const pahali = marketReferenceBuy(item, { ...MARKET, goldSpot: MARKET.goldSpot * 1.2 }, base * 1.2);
    expect(pahali).toBeGreaterThan(ucuz);
  });

  it('referans piyasa koşuluna tepki verir', () => {
    const sakin = marketReferenceBuy(item, { ...MARKET, regime: 'calm', volatility: 0.003 }, base);
    const sok = marketReferenceBuy(item, { ...MARKET, regime: 'shock', volatility: 0.03 }, base);
    // Şokta dükkân daha temkinli alır.
    expect(sok).toBeLessThan(sakin);
  });

  it('tipik kuyumcu ALIŞI: adil değerin altındadır', () => {
    expect(marketReferenceBuy(item, MARKET, base)).toBeLessThan(base);
    expect(marketReferenceBuy(item, MARKET, base)).toBeGreaterThan(0);
  });

  it('tipik kuyumcu SATIŞI: adil değerin üstündedir', () => {
    // Alış akışının referansı. Alışın işaret çevrilmiş hâli DEĞİLDİR:
    // tezgâhın alış ve satış makasları ayrı katsayılardır.
    expect(marketReferenceSell(item, MARKET, base)).toBeGreaterThan(base);
  });

  it('satış referansı alış referansının üstündedir — makas kapanmaz', () => {
    const alis = marketReferenceBuy(item, MARKET, base);
    const satis = marketReferenceSell(item, MARKET, base);
    expect(satis).toBeGreaterThan(alis);
  });

  it('v5 iki yön referansın etrafında yarım makasla simetriktir', () => {
    const alis = marketReferenceBuy(item, MARKET, base);
    const satis = marketReferenceSell(item, MARKET, base);
    // Simetrik olsaydı adil değere uzaklıkları eşit olurdu.
    expect(Math.abs(base - alis)).toBeCloseTo(Math.abs(satis - base), 6);
  });

  it('referans MÜŞTERİDEN bağımsızdır — rezervasyon fiyatı değildir', () => {
    // İmza müşteri almıyor; aynı ürün ve piyasa her zaman aynı referansı verir.
    expect(marketReferenceBuy(item, MARKET, base)).toBe(marketReferenceBuy(item, MARKET, base));
  });
});

// ===========================================================================
// §3 / §4 — PLAYTEST NAKDİ VE ALIM HAVUZU
// ===========================================================================

describe('§3 — Playtest başlangıç nakdi', () => {
  it('başlangıç nakdi 1.000.000 ₺', () => {
    expect(START.cash).toBe(1_000_000);
  });
});

describe('§4 — Playtest sarrafiye havuzu', () => {
  it('istenen on bir ürünün hepsi tanımlı ve sarrafiye', () => {
    for (const id of POOL) {
      expect(() => getTemplate(id)).not.toThrow();
      expect(isBullion(id)).toBe(true);
      expect(bullionMeta(id)).not.toBeNull();
    }
  });

  it('gram basamakları doğru gramajda', () => {
    const g = (id: string) => bullionMeta(id)!.unitWeightGrams;
    expect(g('gram_gold_1')).toBe(1);
    expect(g('gram_gold_2_5')).toBe(2.5);
    expect(g('gram_gold_5')).toBe(5);
    expect(g('gram_gold_10')).toBe(10);
    expect(g('gram_gold_20')).toBe(20);
    expect(g('gram_gold_50')).toBe(50);
    expect(g('gram_gold_100')).toBe(100);
  });

  it('her ürün için fiyat piyasadan türer, sabit değildir', () => {
    const store = makeStore();
    for (const id of POOL) {
      const probe = spawnItem(SEED, 990_001, id);
      const ucuz = supplyOffer(probe, 1, MARKET, store)!;
      const pahali = supplyOffer(probe, 1, { ...MARKET, goldSpot: MARKET.goldSpot * 1.5 }, store)!;
      expect(ucuz.unitPrice).toBeGreaterThan(0);
      expect(pahali.unitPrice).toBeGreaterThan(ucuz.unitPrice);
    }
  });

  it('ağır gram basamağı hafiften pahalıdır', () => {
    const store = makeStore();
    const fiyat = (id: string) =>
      supplyOffer(spawnItem(SEED, 990_001, id), 1, MARKET, store)!.unitPrice;
    expect(fiyat('gram_gold_100')).toBeGreaterThan(fiyat('gram_gold_50'));
    expect(fiyat('gram_gold_50')).toBeGreaterThan(fiyat('gram_gold_10'));
  });

  it('1.000.000 ₺ ile havuzun her ürününden en az bir adet alınabilir', () => {
    const store = makeStore(1_000_000);
    for (const id of POOL) {
      const lot = supplyOffer(spawnItem(SEED, 990_001, id), 1, MARKET, store)!;
      expect(lot.total).toBeLessThanOrEqual(store.cash);
    }
  });

  it('gösterilen tutar ile hesaplanan tutar AYNI adetten türer', () => {
    // Regresyon: mağaza kendi "bugün sığan" adediyle fiyatlıyordu; hacim
    // makasa girdiği için ekrandaki toplam ile tahsil edilen ayrışıyordu.
    const store = makeStore();
    for (const q of [1, 3, 8]) {
      const lot = supplyOffer(spawnItem(SEED, 990_001, 'gram_gold_10'), q, MARKET, store)!;
      expect(lot.total).toBe(Math.round(lot.unitPrice * lot.quantity));
      expect(lot.quantity).toBe(q);
    }
  });

  it('adet tavanı kanal kapasitesinden gelir — sınırsız alım yok', () => {
    const store = makeStore(50_000_000);
    for (const id of POOL) {
      const lot = supplyOffer(spawnItem(SEED, 990_001, id), 999_999, MARKET, store)!;
      expect(lot.quantity).toBe(lot.maxQuantity);
    }
  });
});
