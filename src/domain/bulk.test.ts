/**
 * MIHENKAYNAK — Toplu sarrafiye müşterisi ve kısmi karşılama kabul testleri
 * Kaynak: Ekonomi Ara Düzeltmesi v1.0 · §4.1; GDD 22.1, 31.3, 12.3.
 */

import { describe, expect, it } from 'vitest';

import { PURCHASE } from './balance';
import { createMarketForDay } from './market';
import { spawnItem } from './item-spawn';
import {
  applyBulkProfile,
  availableUnits,
  demandOutcome,
  fulfilmentOf,
  packageCost,
  packageGrams,
  packageFairValue,
  packageUnits,
  quotePackage,
} from './purchase';
import {
  applyTransaction,
  channelMetrics,
  costBasisForUnits,
  createLedger,
  removeUnits,
  stackKey,
  unitCostBasis,
  volumeSplitMetrics,
  type EconomyState,
} from './settlement';
import type {
  Customer,
  CustomerDemand,
  DealRecord,
  InventoryPosition,
  ItemInstance,
  StoreState,
} from './types';

const SEED = 20260827;
const MARKET = createMarketForDay(SEED, 1);

function makeStore(): StoreState {
  return {
    name: 'Test',
    cash: 500_000,
    reputation: 42,
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
      limit: 40_000,
      terms: 3,
      openInvoices: [],
      priceBand: 1,
      specialLotEligibility: false,
    },
    payables: [],
    dailyOverhead: 1_200,
  };
}

function position(item: ItemInstance, quantity: number, unitCost: number): InventoryPosition {
  return {
    itemId: item.id,
    quantity,
    costBasis: unitCost * quantity,
    currentValue: unitCost * quantity,
    age: 2,
    demand: 'steady',
    thesis: null,
    location: 'display',
    expectedExitValues: {},
  };
}

function demand(over: Partial<CustomerDemand> = {}): CustomerDemand {
  return {
    families: [],
    wantsBullion: true,
    templateId: 'quarter_gold',
    quantity: 20,
    isBulk: true,
    acceptsPartial: true,
    minQuantity: 10,
    summary: 'Toplu: 20 adet Çeyrek',
    alternativesLabel: '',
    ...over,
  };
}

// ===========================================================================
// GDD 22.1 / 31.3 — YIĞIN STOK VE KISMİ ÇIKIŞ
// ===========================================================================

describe('GDD 22.1 — Sarrafiye yığılır, işçilikli ürün yığılmaz', () => {
  it('aynı gerçeğe sahip iki sarrafiye AYNI yığına girer', () => {
    const a = spawnItem(SEED, 1, 'quarter_gold');
    // Farklı kimlik, aynı gerçek: yığılabilirlik kimliğe değil GERÇEĞE bakar.
    const b = { ...a, id: `${a.id}_copy` };
    expect(stackKey(b, 'display')).toBe(stackKey(a, 'display'));
  });

  it('kondisyonu farklı sarrafiye AYRI yığın kalır — ortalaması yanıltırdı', () => {
    const a = spawnItem(SEED, 1, 'quarter_gold');
    const worn = { ...a, truth: { ...a.truth, condition: 'worn' as const } };
    const pristine = { ...a, truth: { ...a.truth, condition: 'pristine' as const } };
    expect(stackKey(worn, 'display')).not.toBe(stackKey(pristine, 'display'));
  });

  it('konum ayrımı korunur: vitrindeki ile arka stoktaki aynı yığın değildir', () => {
    const a = spawnItem(SEED, 1, 'quarter_gold');
    expect(stackKey(a, 'display')).not.toBe(stackKey(a, 'backStock'));
  });

  it('işçilikli ürün ASLA yığılmaz (GDD 12.3 cost basis kalem bazındadır)', () => {
    const bilezik = spawnItem(SEED, 3, 'bracelet_22k_thin');
    expect(stackKey(bilezik, 'display')).toBeNull();
  });

  it('gizli kusuru olan sarrafiye yığılmaz — ortalaması yalan olurdu', () => {
    for (let i = 0; i < 200; i += 1) {
      const item = spawnItem(SEED, i, 'quarter_gold');
      if (item.truth.hiddenFlaws.length > 0) {
        expect(stackKey(item, 'display')).toBeNull();
        return;
      }
    }
  });

  it('aynı ürün ikinci kez girdiğinde pozisyon BİRLEŞİR ve maliyet ağırlıklanır', () => {
    const item = spawnItem(SEED, 5, 'quarter_gold');
    if (stackKey(item, 'backStock') === null) return; // kusurlu örnek; yığılmaz

    const base: EconomyState = {
      store: makeStore(),
      inventory: [],
      items: {},
      ledger: createLedger(),
    };

    const buy = (txId: string, cost: number) => ({
      txId,
      dealId: txId,
      day: 1,
      cashDelta: -cost,
      itemsIn: [{ ...item, buyCost: cost, location: 'backStock' as const }],
      itemsOut: [],
      trustDelta: 0,
      reputationDelta: 0,
      xpDelta: 0,
      label: 'test',
    });

    const first = applyTransaction(base, buy('t1', 7_000));
    const second = applyTransaction(first.state, buy('t2', 9_000));

    expect(second.state.inventory).toHaveLength(1);
    const merged = second.state.inventory[0]!;
    expect(merged.quantity).toBe(2);
    expect(merged.costBasis).toBe(16_000);
    // Ağırlıklı ortalama birim maliyet (GDD 22.1).
    expect(unitCostBasis(merged)).toBe(8_000);
  });
});

describe('GDD 31.3 — Kısmi çıkışta yalnız satılan miktar realize olur', () => {
  const item = spawnItem(SEED, 11, 'quarter_gold');

  it('adet düşer, maliyet ve değer ORANLA iner', () => {
    const before = [position(item, 10, 7_000)];
    const after = removeUnits(before, { itemId: item.id, quantity: 4 });

    expect(after[0]!.quantity).toBe(6);
    expect(after[0]!.costBasis).toBe(42_000);
    // Birim maliyet kısmi satıştan etkilenmez.
    expect(unitCostBasis(after[0]!)).toBe(7_000);
  });

  it('adet bitince pozisyon düşer', () => {
    const after = removeUnits([position(item, 3, 7_000)], { itemId: item.id, quantity: 3 });
    expect(after).toHaveLength(0);
  });

  it('stokta olandan fazlası çıkarılamaz — eksi adet üretilmez', () => {
    const after = removeUnits([position(item, 3, 7_000)], { itemId: item.id, quantity: 99 });
    expect(after).toEqual([position(item, 3, 7_000)]);
  });

  it('satılan adedin maliyet tabanı yalnız o adedin payıdır', () => {
    const p = position(item, 10, 7_000);
    expect(costBasisForUnits(p, 4)).toBe(28_000);
    expect(costBasisForUnits(p, 10)).toBe(70_000);
    expect(costBasisForUnits(p, 0)).toBe(0);
  });

  it('kısmi satış sonrası kalem hâlâ stoktadır, "sold" olmaz', () => {
    const state: EconomyState = {
      store: makeStore(),
      inventory: [position(item, 10, 7_000)],
      items: { [item.id]: item },
      ledger: createLedger(),
    };

    const out = applyTransaction(state, {
      txId: 'sale1',
      dealId: 'd1',
      day: 1,
      cashDelta: 30_000,
      itemsIn: [],
      itemsOut: [{ itemId: item.id, quantity: 4 }],
      trustDelta: 0,
      reputationDelta: 0,
      xpDelta: 0,
      label: 'kısmi satış',
    });

    expect(out.applied).toBe(true);
    expect(out.state.inventory[0]!.quantity).toBe(6);
    expect(out.state.items[item.id]!.location).not.toBe('sold');
  });

  it('tamamı satılınca kalem "sold" olur', () => {
    const state: EconomyState = {
      store: makeStore(),
      inventory: [position(item, 4, 7_000)],
      items: { [item.id]: item },
      ledger: createLedger(),
    };

    const out = applyTransaction(state, {
      txId: 'sale2',
      dealId: 'd2',
      day: 1,
      cashDelta: 30_000,
      itemsIn: [],
      itemsOut: [{ itemId: item.id, quantity: 4 }],
      trustDelta: 0,
      reputationDelta: 0,
      xpDelta: 0,
      label: 'tam satış',
    });

    expect(out.state.inventory).toHaveLength(0);
    expect(out.state.items[item.id]!.location).toBe('sold');
  });
});

// ===========================================================================
// §4.1 — TOPLU MÜŞTERİ AYRI BİR MÜŞTERİDİR
// ===========================================================================

describe('§4.1 — Toplu müşteri, tekil müşterinin yüksek adetli kopyası DEĞİLDİR', () => {
  function customer(over: Partial<Customer> = {}): Customer {
    return {
      id: 'c1',
      displayName: 'Test',
      archetype: 'investor',
      intent: 'buy',
      patienceMax: 60,
      knowledge: 50,
      urgency: 50,
      priceSensitivity: 50,
      status: 50,
      budget: 1_000_000,
      reservationPrice: 0,
      purchaseCeilingRatio: 1.2,
      demand: demand(),
      patience: 60,
      trust: 60,
      suspicion: 0,
      visitHistory: [],
      preferences: [],
      referralSource: null,
      lineIds: [],
      ...over,
    };
  }

  it('toplu profil fiyat hassasiyetini, sabrı, güveni ve tavanı DEĞİŞTİRİR', () => {
    const tekil = customer({ demand: demand({ isBulk: false, quantity: 2, minQuantity: 2 }) });
    const toplu = applyBulkProfile(customer());

    expect(toplu.priceSensitivity).toBeGreaterThan(tekil.priceSensitivity);
    expect(toplu.patienceMax).toBeGreaterThan(tekil.patienceMax);
    expect(toplu.trust).toBeLessThan(tekil.trust);
    // Perakende primini ödemez: tavan tekil müşterininkinden dar.
    expect(toplu.purchaseCeilingRatio).toBeLessThan(tekil.purchaseCeilingRatio);
    // Ama yine de 1'in üstünde — mal bedava değil.
    expect(toplu.purchaseCeilingRatio).toBeGreaterThan(1);
  });

  it('tekil müşteriye toplu profil UYGULANMAZ', () => {
    const tekil = customer({ demand: demand({ isBulk: false }) });
    expect(applyBulkProfile(tekil)).toEqual(tekil);
  });

  it('sabır her zaman patienceMax ile tutarlı kalır', () => {
    const toplu = applyBulkProfile(customer());
    expect(toplu.patience).toBe(toplu.patienceMax);
  });
});

// ===========================================================================
// §4.1 — KISMİ KARŞILAMA VE ÜÇ SONUÇ
// ===========================================================================

describe('§4.1 — Stok yetmediğinde üç ayrı sonuç', () => {
  it('reddedilebilir / kısmen karşılanabilir / tedarik gerekir', () => {
    const esnek = demand({ quantity: 20, minQuantity: 10, acceptsPartial: true });
    const kati = demand({ quantity: 20, minQuantity: 20, acceptsPartial: false });

    expect(demandOutcome(esnek, 20)).toBe('full');
    expect(demandOutcome(esnek, 12)).toBe('partial');
    // Eksiğe razı ama minimumun da altındayız → tedarik gerekir.
    expect(demandOutcome(esnek, 4)).toBe('sourceNeeded');
    expect(demandOutcome(esnek, 0)).toBe('reject');

    // Kısmi kabul etmeyen müşteri: eksik varsa tek yol tedarik.
    expect(demandOutcome(kati, 19)).toBe('sourceNeeded');
    expect(demandOutcome(kati, 20)).toBe('full');
  });

  it('kısmi karşılama fulfilmentOf ile tutarlıdır', () => {
    const d = demand({ quantity: 20, minQuantity: 10, acceptsPartial: true });
    expect(fulfilmentOf(d, 20)).toBe('full');
    expect(fulfilmentOf(d, 12)).toBe('partial');
    expect(fulfilmentOf(d, 4)).toBe('none');
  });

  it('kullanılabilir adet POZİSYON değil ADET sayar', () => {
    const item = spawnItem(SEED, 21, 'quarter_gold');
    const items = { [item.id]: item };
    // Tek pozisyon, 40 adet.
    expect(availableUnits(demand(), [position(item, 40, 7_000)], items)).toBe(40);
  });
});

// ===========================================================================
// §4.1 — HACİM FİYATLAMASI DOĞRUSAL DEĞİLDİR
// ===========================================================================

describe('§4.1 — Hacim büyüdükçe fiyat doğrusal ilerlemez', () => {
  const item = spawnItem(SEED, 31, 'quarter_gold');
  const items = { [item.id]: item };

  function ask(quantity: number) {
    const d = demand({ quantity });
    const c = {
      trust: 55,
      demand: d,
    } as unknown as Customer;
    return quotePackage([{ itemId: item.id, quantity }], d, c, MARKET, items);
  }

  it('adil değer adetle DOĞRUSAL büyür — temel değerleme bozulmaz (§10)', () => {
    const bir = packageFairValue([{ itemId: item.id, quantity: 1 }], items, MARKET);
    const kirk = packageFairValue([{ itemId: item.id, quantity: 40 }], items, MARKET);
    expect(kirk).toBe(bir * 40);
  });

  it('istenen fiyat adetle doğrusal büyümez — kanal makası devrede', () => {
    const bir = ask(1).suggested;
    const kirk = ask(40).suggested;
    // Doğrusal olsaydı tam 40 katı olurdu.
    expect(kirk).not.toBe(bir * 40);
    // Ama mertebe korunur: 40 adet 1 adetten pahalıdır.
    expect(kirk).toBeGreaterThan(bir);
  });

  it('toplu adette kanal profili değişir (§4.1)', () => {
    expect(ask(2).channel).toBe('retailCustomer');
    expect(ask(PURCHASE.bulkChannelThreshold + 4).channel).toBe('bulkCustomer');
  });

  it('birim fiyat hacimle SIKIŞIR — toplu iş marj bırakır ama daha az', () => {
    const birim = (q: number) => ask(q).suggested / q;
    expect(birim(40)).toBeLessThan(birim(1));
  });
});

// ===========================================================================
// §4.1 — TELEMETRİ: TOPLU İŞLEM TEKİL METRİĞİ ŞİŞİRMEZ
// ===========================================================================

describe('§4.1 — Toplu işlem tekil müşteri metriğini şişirmez', () => {
  function deal(over: Partial<DealRecord>): DealRecord {
    return {
      dealId: 'd',
      customerId: 'c',
      lineIds: [],
      itemIds: [],
      side: 'sell',
      day: 1,
      clockMinutes: 600,
      testsUsed: [],
      estimateBand: { min: 0, max: 0 },
      confidence: 'high',
      actualValue: 0,
      offerHistory: [],
      finalState: 'ACCEPTED',
      movesUsed: [],
      thesisAtDeal: null,
      price: 0,
      costBasis: 0,
      units: 1,
      grams: 0,
      channel: 'retailCustomer',
      isBulk: false,
      realizedProfit: null,
      trustDelta: 0,
      reputationDelta: 0,
      reviewData: { missedSignals: [], keyDecisionPoint: '', alternativeChannelNote: '' },
      ...over,
    };
  }

  const ledger = {
    ...createLedger(),
    deals: [
      deal({ dealId: 'a', price: 8_000, costBasis: 7_000, units: 1, grams: 1.75 }),
      deal({
        dealId: 'b',
        price: 300_000,
        costBasis: 285_000,
        units: 40,
        grams: 70,
        isBulk: true,
        channel: 'bulkCustomer',
      }),
      deal({ dealId: 'c', price: 0, costBasis: 0, finalState: 'REJECTED' }),
    ],
  };

  it('iki havuz AYRI tutulur; toplu işlem tekil ortalamayı bozmaz', () => {
    const { single, bulk } = volumeSplitMetrics(ledger);

    expect(single.deals).toBe(1);
    expect(single.units).toBe(1);
    expect(single.revenue).toBe(8_000);
    // Tekil marjda toplu işlemin izi YOK.
    expect(single.grossMargin).toBeCloseTo(1_000 / 8_000, 6);

    expect(bulk.deals).toBe(1);
    expect(bulk.units).toBe(40);
    expect(bulk.grams).toBeCloseTo(70, 3);
  });

  it('kanal bazında adet, gram, ciro ve brüt marj ayrı ölçülür (§6.1)', () => {
    const m = channelMetrics(ledger);
    expect(m.retailCustomer!.units).toBe(1);
    expect(m.bulkCustomer!.units).toBe(40);
    expect(m.bulkCustomer!.grams).toBeCloseTo(70, 3);
    expect(m.bulkCustomer!.grossMargin).toBeCloseTo(15_000 / 300_000, 6);
  });

  it('gerçekleşmemiş pazarlık ciro üretmez', () => {
    const m = channelMetrics(ledger);
    const toplam = Object.values(m).reduce((s, x) => s + x.deals, 0);
    expect(toplam).toBe(2); // reddedilen sayılmaz
  });

  it('paket gram karşılığı adetle ölçeklenir', () => {
    const item = spawnItem(SEED, 41, 'quarter_gold');
    const items = { [item.id]: item };
    expect(packageGrams([{ itemId: item.id, quantity: 4 }], items)).toBeCloseTo(7, 3);
    expect(packageUnits([{ itemId: item.id, quantity: 4 }])).toBe(4);
  });

  it('paket maliyeti pozisyonun tamamını değil SATILAN payı sayar', () => {
    const item = spawnItem(SEED, 51, 'quarter_gold');
    const inv = [position(item, 10, 7_000)];
    expect(packageCost([{ itemId: item.id, quantity: 3 }], inv)).toBe(21_000);
    expect(packageCost([{ itemId: item.id, quantity: 10 }], inv)).toBe(70_000);
  });
});
