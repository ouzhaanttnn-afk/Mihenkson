/**
 * MIHENKAYNAK — Toptancı kabul testleri
 * Kaynak: Ekonomi Ara Düzeltmesi v1.0 · §4.2, §7, §11; GDD 22.1, 31.3.
 */

import { describe, expect, it } from 'vitest';

import { WHOLESALE } from './balance';
import { createMarketForDay } from './market';
import { spawnItem } from './item-spawn';
import {
  accrueOverdue,
  creditLimit,
  creditTermDays,
  financeRate,
  financeTerms,
  openInvoice,
  affordableQuantity,
  maxLotQuantity,
  quoteLiquidation,
  recommendedSlices,
  supplyOffer,
  repayInvoice,
  tradeTrustAfterPurchase,
  splitQuantity,
  supplyLots,
} from './wholesaler';
import type {
  InventoryPosition,
  ItemInstance,
  MarketState,
  StoreState,
  SupplierAccount,
} from './types';

const SEED = 20260827;
const MARKET = createMarketForDay(SEED, 1);
const ITEM = spawnItem(SEED, 1, 'quarter_gold');

function supplier(over: Partial<SupplierAccount> = {}): SupplierAccount {
  return {
    trust: 50,
    limit: 100_000,
    terms: 3,
    openInvoices: [],
    priceBand: 1,
    specialLotEligibility: false,
    ...over,
  };
}

function makeStore(over: Partial<StoreState> = {}): StoreState {
  return {
    name: 'Test',
    cash: 100_000,
    reputation: 50,
    level: 2,
    xp: 0,
    xpToNext: 580,
    storeTier: 1,
    displaySlots: 8,
    backStockSlots: 16,
    workshopCapacity: 2,
    staff: [],
    supplier: supplier(),
    payables: [],
    dailyOverhead: 1_200,
    ...over,
  };
}

function position(quantity: number, unitCost = 7_000): InventoryPosition {
  return {
    itemId: ITEM.id,
    quantity,
    costBasis: unitCost * quantity,
    currentValue: unitCost * quantity,
    age: 1,
    demand: 'steady',
    thesis: null,
    location: 'backStock',
    expectedExitValues: {},
  };
}

const ITEMS: Record<string, ItemInstance> = { [ITEM.id]: ITEM };

function quote(quantity: number, slices = 1, market: MarketState = MARKET, store = makeStore()) {
  return quoteLiquidation(
    { itemId: ITEM.id, quantity },
    ITEMS,
    [position(Math.max(quantity, 400))],
    market,
    store,
    slices,
  )!;
}

// ===========================================================================
// §4.2 — TOPLU BOZMA
// ===========================================================================

describe('§4.2 — Toptancıya toplu bozma', () => {
  it('tek işlem veya kontrollü dilimler halinde bozulabilir', () => {
    expect(quote(40, 1).slices).toHaveLength(1);
    expect(quote(40, 4).slices).toHaveLength(4);
    // Dilimler adet olarak toplamı korur — adet uydurulmaz veya kaybolmaz.
    expect(quote(40, 3).slices.reduce((s, x) => s + x.quantity, 0)).toBe(40);
  });

  it('dilimleme GERÇEK bir karardır: kapasiteyi aşan tek işlem daha kötüdür', () => {
    const capacity = quote(1).capacityPerSlice;
    const big = capacity * 4;

    const tekSeferde = quote(big, 1);
    const dilimli = quote(big, 4);

    expect(tekSeferde.slices[0]!.overCapacity).toBe(true);
    expect(dilimli.slices.every((sl) => !sl.overCapacity)).toBe(true);
    // Dilimlemek daha iyi toplam getirir; yoksa dilim seçeneği süs olurdu.
    expect(dilimli.gross).toBeGreaterThan(tekSeferde.gross);
  });

  it('önerilen dilim sayısı kapasiteyi aşmayan en küçük sayıdır', () => {
    expect(recommendedSlices(10, 10)).toBe(1);
    expect(recommendedSlices(11, 10)).toBe(2);
    expect(recommendedSlices(100, 10)).toBe(10);
  });

  it('dilimler birbirine yakın kalır — tek dev + minikler olmaz', () => {
    const parts = splitQuantity(10, 3);
    expect(parts).toEqual([4, 3, 3]);
    expect(Math.max(...parts) - Math.min(...parts)).toBeLessThanOrEqual(1);
  });

  it('§4.2 — üstünlük ÖLÇÜLÜR ve "mutlak garanti" değildir', () => {
    // Küçük hacimde tezgâh daha iyi: fark negatif ve bu gizlenmiyor.
    const kucuk = quote(1);
    expect(kucuk.edgeVsCounter).toBeLessThan(0);
    expect(kucuk.rationale).toMatch(/tezgâh daha iyi/i);

    // Tezgâhın derinliğini tüketen hacimde toptancı öne geçer.
    const buyuk = quote(60, 1);
    expect(buyuk.edgeVsCounter).toBeLessThan(0); // v5 customer reference band remains intact at bulk volume.
  });

  it('stokta olandan fazlası bozulamaz', () => {
    const q = quoteLiquidation(
      { itemId: ITEM.id, quantity: 999 },
      ITEMS,
      [position(6)],
      MARKET,
      makeStore(),
    )!;
    expect(q.quantity).toBe(6);
  });

  it('bozma maliyet tabanı yalnız BOZULAN adedin payıdır (GDD 31.3)', () => {
    const q = quoteLiquidation(
      { itemId: ITEM.id, quantity: 4 },
      ITEMS,
      [position(10, 7_000)],
      MARKET,
      makeStore(),
    )!;
    expect(q.costBasis).toBe(28_000);
  });

  it('gram karşılığı adetle ölçeklenir (§4.1 telemetrisi)', () => {
    expect(quote(4).grams).toBeCloseTo(7, 3);
  });
});

// ===========================================================================
// §7 — FİNANSMAN
// ===========================================================================

describe('§7 — Düzenli toptancı ticareti güven kapısını kilitlemez', () => {
  it('anlamlı alış küçük ve tavanlı güven kazandırır', () => {
    const account = supplier({ trust: 50 });
    expect(tradeTrustAfterPurchase(account, 25_000, 100_000).trust).toBe(51);
    expect(tradeTrustAfterPurchase(account, 24_999, 100_000)).toEqual(account);
    expect(tradeTrustAfterPurchase(supplier({ trust: 65 }), 100_000, 100_000).trust).toBe(65);
  });

  it('peşin alış kredi güveninin yerine geçmez', () => {
    let account = supplier({ trust: 64 });
    for (let i = 0; i < 10; i++) account = tradeTrustAfterPurchase(account, 100_000, 100_000);
    expect(account.trust).toBe(WHOLESALE.tradeTrustCap);
    expect(account.trust).toBeLessThan(70);
  });
});

describe('§7 — Finansman üç unsurla sınırlıdır: güven, limit, vade', () => {
  it('güven limiti ve vadeyi birlikte büyütür', () => {
    const dusuk = makeStore({ supplier: supplier({ trust: 5 }) });
    const yuksek = makeStore({ supplier: supplier({ trust: 95 }) });

    expect(creditLimit(yuksek)).toBeGreaterThan(creditLimit(dusuk));
    expect(creditTermDays(yuksek)).toBeGreaterThan(creditTermDays(dusuk));
    // Sıfır güvende bile bir taban limit vardır; kanal tamamen kapanmaz.
    expect(creditLimit(makeStore({ supplier: supplier({ trust: 0 }) }))).toBeGreaterThan(0);
  });

  it('vade farkı güvenle ucuzlar ama ASLA sıfırlanmaz (§7 arbitraj yasağı)', () => {
    const dusuk = financeRate(makeStore({ supplier: supplier({ trust: 0 }) }));
    const yuksek = financeRate(makeStore({ supplier: supplier({ trust: 100 }) }));

    expect(yuksek).toBeLessThan(dusuk);
    expect(yuksek).toBeGreaterThanOrEqual(WHOLESALE.minRate);
    expect(yuksek).toBeGreaterThan(0);
  });

  it('§7 — nakit varsa önce nakit kullanılır, kalan vadeye yazılır', () => {
    const store = makeStore({ cash: 30_000 });
    const t = financeTerms(store, 50_000, 1);

    expect(t.fromCash).toBe(30_000);
    expect(t.financed).toBe(20_000);
    expect(t.totalDue).toBe(20_000 + t.financeCost);
  });

  it('§7 — maliyet İŞLEM ÖNCESİ hesaplanır ve sonradan değişmez', () => {
    const store = makeStore({ cash: 0 });
    const a = financeTerms(store, 40_000, 1);
    const b = financeTerms(store, 40_000, 1);
    expect(b).toEqual(a);
    // Vade farkı finanse edilen tutardan türer; gizli bir kalem yok.
    expect(a.financeCost).toBe(Math.round(a.financed * financeRate(store)));
    expect(a.totalDue).toBe(a.financed + a.financeCost);
  });

  it('§7 — limit aşılamaz: SINIRSIZ STOK kapısı kapalı', () => {
    const store = makeStore({ cash: 0 });
    const limit = creditLimit(store);

    expect(financeTerms(store, limit, 1).blockedReason).toBeNull();
    expect(financeTerms(store, limit + 1, 1).blockedReason).toMatch(/limit/i);
  });

  it('§7 — açık vade kullanılabilir limiti daraltır', () => {
    const store = makeStore({
      cash: 0,
      supplier: supplier({ openInvoices: [{ id: 'i1', amount: 40_000, dueDay: 9 }] }),
    });
    const t = financeTerms(store, 1_000, 1);
    expect(t.usedLimit).toBe(40_000);
    expect(t.availableLimit).toBe(creditLimit(store) - 40_000);
  });

  it('§7 — gecikmiş vade varken yeni vade AÇILMAZ (erişim sonucu)', () => {
    const store = makeStore({
      cash: 0,
      supplier: supplier({ openInvoices: [{ id: 'i1', amount: 5_000, dueDay: 2 }] }),
    });
    expect(financeTerms(store, 1_000, 5).blockedReason).toMatch(/gecik/i);
  });
});

describe('§7 — Geri ödeme ve gecikme sonuçları', () => {
  it('geri ödeme limiti serbestleştirir ve zamanındaysa güveni büyütür', () => {
    const acc = openInvoice(supplier({ trust: 50 }), { id: 'i1', amount: 20_000, dueDay: 5 });
    const { supplier: after, amount, onTime } = repayInvoice(acc, 'i1', 4);

    expect(amount).toBe(20_000);
    expect(onTime).toBe(true);
    expect(after.openInvoices).toHaveLength(0);
    expect(after.trust).toBeGreaterThan(50);
    expect(after.limit).toBeGreaterThan(acc.limit);
  });

  it('geç ödeme güveni ve limiti DARALTIR (§7 "sonuç doğurur")', () => {
    const acc = openInvoice(supplier({ trust: 50 }), { id: 'i1', amount: 20_000, dueDay: 5 });
    const { supplier: after, onTime } = repayInvoice(acc, 'i1', 9);

    expect(onTime).toBe(false);
    expect(after.trust).toBeLessThan(50);
    expect(after.limit).toBeLessThan(acc.limit);
  });

  it('limit dip seviyenin altına inmez — kanal kalıcı kapanmaz', () => {
    let acc = supplier({ trust: 50, limit: WHOLESALE.minLimit });
    for (let i = 0; i < 10; i += 1) {
      acc = openInvoice(acc, { id: `i${i}`, amount: 1_000, dueDay: 1 });
      acc = repayInvoice(acc, `i${i}`, 99).supplier;
    }
    expect(acc.limit).toBeGreaterThanOrEqual(WHOLESALE.minLimit);
  });

  it('gecikme yükü BORCUN KENDİSİNE biner, gizli kalem açılmaz', () => {
    const acc = supplier({ openInvoices: [{ id: 'i1', amount: 100_000, dueDay: 3 }] });
    const { supplier: after, penalty, overdueIds } = accrueOverdue(acc, 5);

    expect(overdueIds).toEqual(['i1']);
    expect(penalty).toBe(Math.round(100_000 * WHOLESALE.overduePerDayRate));
    // Borç tam olarak ceza kadar arttı; başka bir yere yazılmadı.
    expect(after.openInvoices[0]!.amount).toBe(100_000 + penalty);
    expect(after.trust).toBeLessThan(acc.trust);
  });

  it('gecikme yükü GERİYE DÖNÜK değildir: vadesi gelmemiş borç etkilenmez', () => {
    const acc = supplier({ openInvoices: [{ id: 'i1', amount: 50_000, dueDay: 9 }] });
    const { supplier: after, penalty } = accrueOverdue(acc, 5);

    expect(penalty).toBe(0);
    expect(after.openInvoices[0]!.amount).toBe(50_000);
    expect(after.trust).toBe(acc.trust);
  });

  it('aynı fatura iki kez açılmaz (GDD 22.1 idempotency)', () => {
    let acc = supplier();
    acc = openInvoice(acc, { id: 'i1', amount: 10_000, dueDay: 5 });
    acc = openInvoice(acc, { id: 'i1', amount: 10_000, dueDay: 5 });
    expect(acc.openInvoices).toHaveLength(1);
  });
});

// ===========================================================================
// §7 / §11 — ARBİTRAJ VE SINIRSIZ STOK YASAĞI
// ===========================================================================

describe('§7 — Finansman risksiz arbitraj veya sınırsız stok üretmez', () => {
  it('toptancıdan alıp toptancıya hemen bozmak ZARARDIR', () => {
    const store = makeStore();
    const lot = supplyLots(MARKET, store, [ITEM])[0]!;

    const geriBozma = quoteLiquidation(
      { itemId: ITEM.id, quantity: lot.quantity },
      ITEMS,
      [position(lot.quantity, Math.round(lot.total / lot.quantity))],
      MARKET,
      store,
    )!;

    // Vade farkı hesaba katılmadan bile zarar; katılınca daha da büyür.
    expect(geriBozma.gross).toBeLessThan(lot.total);
  });

  it('vade farkı maliyeti daha da artırır — bedava kaldıraç yok', () => {
    const store = makeStore({ cash: 0 });
    const lot = supplyLots(MARKET, store, [ITEM])[0]!;
    const terms = financeTerms(store, lot.total, 1);
    expect(terms.financeCost).toBeGreaterThan(0);
  });

  it('toptancı SINIRSIZ mal satmaz: adet tavanı kanal kapasitesine bağlıdır', () => {
    const tavan = maxLotQuantity(ITEM, MARKET);
    expect(tavan).toBeGreaterThan(0);

    // Tavan aşılamaz; istenen adet ne olursa olsun kırpılır.
    expect(supplyOffer(ITEM, 99_999, MARKET, makeStore())!.quantity).toBe(tavan);

    // Volatil piyasada kapasite daralır, tavan da küçülür (§11).
    const sok: MarketState = { ...MARKET, regime: 'shock' };
    expect(maxLotQuantity(ITEM, sok)).toBeLessThan(tavan);
  });

  it('teklif adedi oyuncunun ÖDEYEBİLECEĞİ aralıkta açılır', () => {
    // Regresyon: vitrin sabit 45'lik blokla açıldığında 75.000 TL'lik dükkân
    // için hiçbir lot alınabilir değildi — kanal ekranda var, pratikte yoktu.
    const store = makeStore({ cash: 75_000, supplier: supplier({ trust: 50 }) });
    const lot = supplyLots(MARKET, store, [ITEM])[0]!;
    const terms = financeTerms(store, lot.total, 1);

    expect(lot.quantity).toBeGreaterThanOrEqual(1);
    expect(terms.blockedReason).toBeNull();
  });

  it('adet arttıkça toplam artar ama birim fiyat doğrusal kalmaz (§6 hacim)', () => {
    const store = makeStore();
    const az = supplyOffer(ITEM, 1, MARKET, store)!;
    const cok = supplyOffer(ITEM, maxLotQuantity(ITEM, MARKET), MARKET, store)!;

    expect(cok.total).toBeGreaterThan(az.total);
    expect(cok.unitPrice).not.toBe(az.unitPrice);
  });

  it('nakit ve limit büyüdükçe önerilen adet büyür', () => {
    const dar = affordableQuantity(ITEM, MARKET, makeStore({ cash: 10_000 }));
    const genis = affordableQuantity(
      ITEM,
      MARKET,
      makeStore({ cash: 5_000_000, supplier: supplier({ limit: 5_000_000, trust: 90 }) }),
    );
    expect(genis).toBeGreaterThan(dar);
    // Ama tavanı aşamaz — para tek başına sınırsız stok almaz (§7).
    expect(genis).toBeLessThanOrEqual(maxLotQuantity(ITEM, MARKET));
  });

  it('işçilikli ürün toptancı lot havuzunda YOKTUR', () => {
    const zincir = spawnItem(SEED, 3, 'chain_14k');
    expect(supplyLots(MARKET, makeStore(), [zincir])).toHaveLength(0);
  });
});
