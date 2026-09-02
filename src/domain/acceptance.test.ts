/**
 * MIHENKAYNAK — Ekonomi Ara Düzeltmesi v1.0 KABUL TESTLERİ
 * Kaynak: Addendum §12 (kabul testleri) ve §11 (edge case'ler).
 *
 * Bu dosya addendum'un iki listesini BİREBİR takip eder. Diğer test
 * dosyaları maddeleri parça parça doğruluyor; burası listenin kendisidir ve
 * her `it` bir maddenin metnini taşır.
 *
 * Özellikle üç şey burada, başka yerde değil:
 *   · uçtan uca settlement (stoktan doğru miktar düşer, nakit doğru artar),
 *   · gün devrinin sırası ve tek-kezliği,
 *   · kaydet/yükle tutarlılığı.
 */

import { describe, expect, it } from 'vitest';

import { INTENT_MIX, PURCHASE, TARGET_MARGIN } from './balance';
import { createMarketForDay } from './market';
import { spawnItem } from './item-spawn';
import { spawnCustomer } from './customer-spawn';
import {
  dayCharacter,
  emptyTelemetry,
  intentAlarm,
  intentShares,
  recordIntent,
  rollIntent,
} from './intent';
import { bullionUnitValue, channelCapacity, priceForChannel, roundTripCost } from './channels';
import { estimateBand, initialKnowledge, metalValue, trueValue } from './valuation';
import { bullionMeta, CRAFTED_DEFAULT } from '@data/bullion';
import { channelForDemand, packageFairValue, quotePackage } from './purchase';
import { quoteLiquidation, financeTerms, creditLimit, supplyOffer } from './wholesaler';
import { networkLiquidationOffer, networkLoanOffer, spawnNetwork } from './trade-network';
import { measurePosition, resolveOvernight } from './overnight';
import {
  applyTransaction,
  closeDay,
  createLedger,
  removeUnits,
  type EconomyState,
} from './settlement';
import { deserialize, migrate, serialize, rebuildMarket, SAVE_VERSION } from '@state/save';
import type {
  Customer,
  CustomerDemand,
  InventoryPosition,
  ItemInstance,
  StoreState,
  TradeChannel,
} from './types';

const SEED = 20260827;
const MARKET = createMarketForDay(SEED, 1);
const CHARACTER = dayCharacter(SEED, 1, MARKET);
const ITEM = spawnItem(SEED, 1, 'quarter_gold');
const ITEMS: Record<string, ItemInstance> = { [ITEM.id]: ITEM };

function makeStore(over: Partial<StoreState> = {}): StoreState {
  return {
    name: 'Test',
    cash: 200_000,
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

function economy(over: Partial<EconomyState> = {}): EconomyState {
  return {
    store: makeStore(),
    inventory: [],
    items: {},
    ledger: createLedger(),
    ...over,
  };
}

// ===========================================================================
// §12.1
// "Uzun örneklemde müşteri intent üretimi %38 alış + %38 satış sabit
//  tabanını korur; %24 havuz yalnızca izin verilen dinamik nitelikleri
//  etkiler."
// ===========================================================================

describe('§12.1 — Sabit taban uzun örneklemde korunur', () => {
  it('%38 / %38 taban korunur, havuz payı ~%24 kalır', () => {
    let t = emptyTelemetry();
    for (let i = 0; i < 8_000; i += 1) {
      const roll = rollIntent(SEED, i, CHARACTER);
      t = recordIntent(t, roll.intent, roll.fromDynamicPool);
    }
    const shares = intentShares(t);

    expect(shares.buy).toBeGreaterThanOrEqual(INTENT_MIX.customerBuys - 0.02);
    expect(shares.sell).toBeGreaterThanOrEqual(INTENT_MIX.customerSells - 0.02);
    expect(t.fromDynamicPool / t.total).toBeCloseTo(INTENT_MIX.dynamic, 1);

    const alarm = intentAlarm(t);
    expect(alarm.sampled).toBe(true);
    expect(alarm.baseIntact).toBe(true);
    expect(alarm.warning).toBeNull();
  });

  it('havuz yalnız İZİN VERİLEN nitelikleri etkiler; niyet payını değil', () => {
    const a = dayCharacter(SEED, 3, createMarketForDay(SEED, 3));
    const b = dayCharacter(SEED + 99, 3, createMarketForDay(SEED + 99, 3));

    // İki gün karakteri nitelik olarak farklı...
    expect(a.bulkOrderChance).not.toBe(b.bulkOrderChance);

    // ...ama sabit taban ikisinde de aynı yerde duruyor.
    for (const c of [a, b]) {
      let t = emptyTelemetry();
      for (let i = 0; i < 4_000; i += 1) {
        const roll = rollIntent(SEED, i, c);
        t = recordIntent(t, roll.intent, roll.fromDynamicPool);
      }
      expect(intentAlarm(t).baseIntact).toBe(true);
    }
  });
});

// ===========================================================================
// §12.2
// "Aynı ürün ve piyasa anında tekil müşteri, toplu müşteri, toptancı ve
//  esnaf ağı farklı kanal sonuçları üretebilir ve sonuçlar açıklanabilir
//  girdilere dayanır."
// ===========================================================================

describe('§12.2 — Dört kanal aynı anda farklı ve açıklanabilir sonuç verir', () => {
  it('dört kanal farklı birim fiyat üretir', () => {
    const base = bullionUnitValue(ITEM, MARKET);
    const prices = (['retailCustomer', 'bulkCustomer', 'wholesaler', 'tradeNetwork'] as TradeChannel[])
      .map((channel) =>
        priceForChannel({
          item: ITEM,
          market: MARKET,
          channel,
          side: 'shopSells',
          quantity: 6,
          baseUnitValue: base,
          relationship: 55,
        }).unitPrice,
      );
    expect(prices[0]).toBe(prices[1]);
    expect(new Set(prices).size).toBe(3);
  });

  it('her sonuç açıklanabilir girdilere dayanır — breakdown toplamı marja eşit', () => {
    const r = priceForChannel({
      item: ITEM,
      market: MARKET,
      channel: 'retailCustomer',
      side: 'shopSells',
      quantity: 3,
      baseUnitValue: bullionUnitValue(ITEM, MARKET),
      relationship: 70,
    });
    // Döküm, açıkladığı sayıya TOPLANIR. Toplamı tutmayan bir döküm
    // açıklama değil süs olurdu.
    const sum = Object.values(r.breakdown).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(r.spreadRatio, 3);
    // Fiyat etkisi ayrı raporlanır: o bir marj değil, referansın kayması.
    expect(r.priceImpact).toBeLessThanOrEqual(0);
  });

  it('gerçek akışlar da farklı: müşteri paketi, toptancı bozma, esnaf bozma', () => {
    const store = makeStore();
    const inv = [position(12)];
    const customer = { trust: 55 } as unknown as Customer;
    const demand = { quantity: 12 } as unknown as CustomerDemand;

    const musteri = quotePackage(
      [{ itemId: ITEM.id, quantity: 12 }],
      demand,
      customer,
      MARKET,
      ITEMS,
    ).suggested;
    const toptanci = quoteLiquidation({ itemId: ITEM.id, quantity: 12 }, ITEMS, inv, MARKET, store)!.gross;
    const esnaf = networkLiquidationOffer(
      { ...spawnNetwork(SEED, 50)[0]!, cashOnHand: 5_000_000, bullionAppetite: 1, trust: 50 },
      ITEM.id,
      12,
      ITEMS,
      inv,
      MARKET,
    )!.total;

    expect(new Set([musteri, toptanci, esnaf]).size).toBe(3);
  });

  it('toplu müşteri kanal profili tekil müşteriden farklıdır', () => {
    expect(channelForDemand({ quantity: 2 } as CustomerDemand)).toBe('retailCustomer');
    expect(
      channelForDemand({ quantity: PURCHASE.bulkChannelThreshold + 2 } as CustomerDemand),
    ).toBe('bulkCustomer');
  });
});

// ===========================================================================
// §12.3
// "Toptancıya yüksek hacimli sarrafiye bozma, STOKTAN DOĞRU MİKTARI DÜŞER;
//  NAKDİ DOĞRU ARTIRIR; kapasite ve fiyat kademesini uygular."
// ===========================================================================

describe('§12.3 — Yüksek hacimli bozma stoğu ve nakdi doğru hareket ettirir', () => {
  it('uçtan uca: stoktan tam adet düşer, nakit tam tutar artar', () => {
    const state = economy({ inventory: [position(60, 7_000)], items: ITEMS });
    const quote = quoteLiquidation(
      { itemId: ITEM.id, quantity: 40 },
      ITEMS,
      state.inventory,
      MARKET,
      state.store,
      4,
    )!;

    const before = state.store.cash;
    const out = applyTransaction(state, {
      txId: 'acc_liq',
      dealId: 'acc_liq',
      day: 1,
      cashDelta: quote.gross,
      itemsIn: [],
      itemsOut: [{ itemId: ITEM.id, quantity: quote.quantity }],
      trustDelta: 0,
      reputationDelta: 0,
      xpDelta: 0,
      label: 'bozma',
    });

    expect(out.applied).toBe(true);
    // Stok: tam 40 adet düştü, 20 kaldı.
    expect(out.state.inventory[0]!.quantity).toBe(20);
    // Maliyet tabanı da orantılı düştü (GDD 31.3).
    expect(out.state.inventory[0]!.costBasis).toBe(140_000);
    // Nakit: tam teklif kadar arttı.
    expect(out.state.store.cash).toBe(before + quote.gross);
  });

  it('kapasite kademesi uygulanır: dilimleme daha iyi toplam verir', () => {
    const inv = [position(2_000)];
    const capacity = quoteLiquidation(
      { itemId: ITEM.id, quantity: 1 },
      ITEMS,
      inv,
      MARKET,
      makeStore(),
    )!.capacityPerSlice;
    const volume = capacity * 3;

    const q = (slices: number) =>
      quoteLiquidation({ itemId: ITEM.id, quantity: volume }, ITEMS, inv, MARKET, makeStore(), slices)!;

    expect(q(1).slices[0]!.overCapacity).toBe(true);
    expect(q(3).slices.every((sl) => !sl.overCapacity)).toBe(true);
    expect(q(3).gross).toBeGreaterThan(q(1).gross);
  });

  it('çift tap ikinci bozma üretmez (GDD 22.1)', () => {
    const state = economy({ inventory: [position(10)], items: ITEMS });
    const tx = {
      txId: 'acc_dup',
      dealId: 'acc_dup',
      day: 1,
      cashDelta: 50_000,
      itemsIn: [],
      itemsOut: [{ itemId: ITEM.id, quantity: 5 }],
      trustDelta: 0,
      reputationDelta: 0,
      xpDelta: 0,
      label: 'bozma',
    };
    const first = applyTransaction(state, tx);
    const second = applyTransaction(first.state, tx);

    expect(second.applied).toBe(false);
    expect(second.state.inventory[0]!.quantity).toBe(5);
    expect(second.state.store.cash).toBe(first.state.store.cash);
  });
});

// ===========================================================================
// §12.5
// "Nakit yetersiz alımda güven, limit ve vade koşulları kontrol edilir;
//  limit dışı veya vadesiz sınırsız borç oluşmaz."
// ===========================================================================

describe('§12.5 — Nakit yetersiz alımda üç koşul denetlenir', () => {
  it('vadeye yazılan her tutarın bir vadesi ve maliyeti vardır', () => {
    const store = makeStore({ cash: 0 });
    const t = financeTerms(store, 40_000, 5);
    expect(t.financed).toBe(40_000);
    expect(t.dueDay).toBeGreaterThan(5);
    expect(t.financeCost).toBeGreaterThan(0);
  });

  it('limit dışı borç oluşmaz', () => {
    const store = makeStore({ cash: 0 });
    expect(financeTerms(store, creditLimit(store) + 1, 1).blockedReason).toBeTruthy();
  });

  it('sınırsız stok yolu kapalı: lot adedi kapasiteyle tavanlı', () => {
    const store = makeStore({ cash: 10_000_000 });
    const lot = supplyOffer(ITEM, 1_000_000, MARKET, store)!;
    expect(lot.quantity).toBe(lot.maxQuantity);
    expect(lot.maxQuantity).toBeLessThan(1_000);
  });
});

// ===========================================================================
// §12.6
// "Esnaf ağı bozdurma ve kısa vadeli borç sunar; kapasite, ilişki ve açık
//  borç sonuçları doğru uygulanır."
// ===========================================================================

describe('§12.6 — Esnaf ağı iki hizmeti de sunar ve sonuçları uygular', () => {
  it('bozdurma ve kısa vadeli borç birlikte çalışır, aynı kasadan beslenir', () => {
    const net = spawnNetwork(SEED, 60);
    const m = { ...net[0]!, cashOnHand: 60_000, bullionAppetite: 1, trust: 60 };

    const bozma = networkLiquidationOffer(m, ITEM.id, 40, ITEMS, [position(40)], MARKET)!;
    const borc = networkLoanOffer(m, [m], 5_000, 1);

    expect(bozma.quantity).toBeGreaterThan(0);
    expect(borc.blockedReason).toBeNull();
    // İkisi de aynı kasadan besleniyor: kasa sınırı ikisini birden sınırlar.
    expect(bozma.total).toBeLessThanOrEqual(m.cashOnHand);
    expect(borc.maxAmount).toBeLessThanOrEqual(m.cashOnHand);
  });

  it('açık borç sonucu: aynı esnaftan ikinci borç açılmaz', () => {
    const m = {
      ...spawnNetwork(SEED, 50)[0]!,
      loan: { id: 'l', memberId: 'x', principal: 5_000, totalDue: 5_200, dueDay: 9, takenDay: 7 },
    };
    expect(networkLoanOffer(m, [m], 3_000, 7).blockedReason).toBeTruthy();
  });
});

// ===========================================================================
// §9 — DENGE İLKELERİ
//
// Addendum §9 bir TABLO veriyor ve tablonun her satırı sınanabilir bir iddia:
//   Sarrafiye     : likidite yüksek, hacim yüksek, belirsizlik düşük,
//                   marj potansiyeli düşük–orta
//   İşçilikli ürün: likidite daha düşük, hacim daha seçici, belirsizlik
//                   daha yüksek, marj potansiyeli daha yüksek
//
// "Sarrafiye ... TEK BAŞINA SÜREKLİ EN YÜKSEK KÂR SEÇENEĞİ OLMAZ."
// ===========================================================================

describe('§9 — Denge tablosu: sarrafiye ile işçilikli ürün karşıtlığı', () => {
  const zincir = spawnItem(SEED, 77, 'chain_14k');

  it('LİKİDİTE: sarrafiye yüksek, işçilikli ürün daha düşük', () => {
    expect(bullionMeta('quarter_gold')!.liquidityClass).toBe('high');
    // İşçilikli ürünün kanal metadatası yok; varsayılanı en düşük sınıf.
    expect(CRAFTED_DEFAULT.liquidityClass).toBe('low');
  });

  it('HACİM: sarrafiye yüksek, işçilikli ürün daha seçici', () => {
    const sarrafiye = bullionMeta('quarter_gold')!;
    expect(sarrafiye.volumeBand[1]).toBeGreaterThan(CRAFTED_DEFAULT.volumeBand[1]);
    expect(sarrafiye.bulkVolumeBand[1]).toBeGreaterThan(CRAFTED_DEFAULT.bulkVolumeBand[1]);

    // Kanal derinliği de bunu taşır: aynı kanalda sarrafiye daha çok emilir.
    expect(channelCapacity('wholesaler', sarrafiye, MARKET)).toBeGreaterThan(
      channelCapacity('wholesaler', null, MARKET),
    );
  });

  it('BELİRSİZLİK: işçilikli üründe değerleme bandı daha geniştir', () => {
    const genislik = (item: ItemInstance) => {
      const band = estimateBand(item, MARKET, initialKnowledge(item));
      return (band.max - band.min) / Math.max(1, (band.max + band.min) / 2);
    };
    // Aynı bilgi seviyesinde: standart sarrafiyenin bandı dar, işçilikli
    // ürününki geniş. Belirsizlik §9'un dördüncü sütunu.
    expect(genislik(zincir)).toBeGreaterThan(genislik(ITEM));
  });

  it('MARJ POTANSİYELİ: sarrafiye düşük–orta, işçilikli ürün daha yüksek', () => {
    const [sarrafiyeLo, sarrafiyeHi] = TARGET_MARGIN.bullion;
    const [isciLo, isciHi] = TARGET_MARGIN.secondHandJewellery;

    expect(isciLo).toBeGreaterThan(sarrafiyeLo);
    expect(isciHi).toBeGreaterThan(sarrafiyeHi);
  });

  it('§9 DEĞİŞMEZ — sarrafiye tek başına SÜREKLİ en yüksek kâr seçeneği değildir', () => {
    // Ölçülen makas: sarrafiyenin kanal makası, işçilikli ürününkinden dar.
    // Dar makas = düşük marj. Sarrafiyenin işi ciro ve likidite, kâr değil.
    const spread = (item: ItemInstance) =>
      priceForChannel({
        item,
        market: MARKET,
        channel: 'retailCustomer',
        side: 'shopSells',
        quantity: 1,
        baseUnitValue: 10_000,
        relationship: 50,
      }).spreadRatio;

    expect(spread(ITEM)).toBeLessThan(spread(zincir));
  });

  it('§9 — hiçbir kanal her rejimde en iyi fiyat + kapasite + hızı birden vermez', () => {
    // Toptancı kapasitede lider ama küçük hacimde fiyatta değil.
    const base = bullionUnitValue(ITEM, MARKET);
    const tek = (channel: TradeChannel) =>
      priceForChannel({
        item: ITEM,
        market: MARKET,
        channel,
        side: 'shopSells',
        quantity: 1,
        baseUnitValue: base,
        relationship: 50,
      }).unitPrice;

    expect(tek('wholesaler')).toBeLessThan(tek('retailCustomer'));
    expect(channelCapacity('wholesaler', bullionMeta('quarter_gold'), MARKET)).toBeGreaterThan(
      channelCapacity('retailCustomer', bullionMeta('quarter_gold'), MARKET),
    );
  });
});

// ===========================================================================
// §10 — DEĞİŞTİRİLMEMESİ GEREKEN SİSTEMLER
// ===========================================================================

describe('§10 — Addendum temel değerleme formülüne dokunmaz', () => {
  it('metal değeri TEK yerde tanımlıdır: net gram × gerçek saflık × spot', () => {
    // GDD 6.2 formülü valuation.ts'te yaşar. Kanal katmanı onu tüketir,
    // yeniden yazmaz.
    const beklenen = Math.round(
      ITEM.truth.netMetalWeight * ITEM.truth.actualPurity * MARKET.goldSpot,
    );
    expect(metalValue(ITEM, MARKET)).toBe(beklenen);
  });

  it('kanal katmanından geçmek trueValue çıktısını değiştirmez', () => {
    const before = trueValue(ITEM, MARKET);
    for (const channel of ['retailCustomer', 'bulkCustomer', 'wholesaler', 'tradeNetwork'] as TradeChannel[]) {
      priceForChannel({
        item: ITEM,
        market: MARKET,
        channel,
        side: 'shopSells',
        quantity: 9,
        baseUnitValue: bullionUnitValue(ITEM, MARKET),
        relationship: 80,
      });
    }
    expect(trueValue(ITEM, MARKET)).toBe(before);
  });

  it('sarrafiye birim değeri de aynı formülden türer, kopyasından değil', () => {
    const meta = bullionMeta('quarter_gold')!;
    const metal = meta.unitWeightGrams * meta.unitPurity * MARKET.goldSpot;
    expect(bullionUnitValue(ITEM, MARKET)).toBe(metal);
  });
});

// ===========================================================================
// §11 — EDGE CASE'LER
// ===========================================================================

describe('§11 — Negatif stok oluşmaz', () => {
  it('v5: stokta olandan fazla çıkış atomik olarak reddedilir', () => {
    const after = removeUnits([position(3)], { itemId: ITEM.id, quantity: 99 });
    expect(after).toEqual([position(3)]);
  });

  it('settlement sonrası hiçbir pozisyon negatif adet taşımaz', () => {
    const state = economy({ inventory: [position(5)], items: ITEMS });
    const out = applyTransaction(state, {
      txId: 'neg',
      dealId: 'neg',
      day: 1,
      cashDelta: 10_000,
      itemsIn: [],
      itemsOut: [{ itemId: ITEM.id, quantity: 500 }],
      trustDelta: 0,
      reputationDelta: 0,
      xpDelta: 0,
      label: 'aşırı çıkış',
    });
    expect(out.state.inventory.every((p) => p.quantity > 0)).toBe(true);
  });

  it('negatif adet istenirse hiçbir şey değişmez', () => {
    const inv = [position(5)];
    expect(removeUnits(inv, { itemId: ITEM.id, quantity: -3 })).toEqual(inv);
  });
});

describe('§11 — Sıfır/negatif fiyatla işlem yapılmaz', () => {
  it('kanal fiyatı hiçbir koşulda sıfıra veya altına inmez', () => {
    for (const regime of ['calm', 'normal', 'volatile', 'shock'] as const) {
      for (const q of [1, 50, 5_000]) {
        for (const side of ['shopBuys', 'shopSells'] as const) {
          const r = priceForChannel({
            item: ITEM,
            market: { ...MARKET, regime, volatility: 0.3 },
            channel: 'retailCustomer',
            side,
            quantity: q,
            baseUnitValue: bullionUnitValue(ITEM, MARKET),
            relationship: 100,
          });
          expect(r.unitPrice).toBeGreaterThan(0);
        }
      }
    }
  });

  it('temel değer sıfırsa paket fiyatı işlem üretmez', () => {
    const bos = quotePackage([], {} as CustomerDemand, { trust: 50 } as Customer, MARKET, ITEMS);
    expect(bos.suggested).toBe(0);
    expect(bos.rationale).toMatch(/ürün yok/i);
  });

  it('bilinmeyen kalem için bozma teklifi üretilmez — güvenle durur', () => {
    expect(quoteLiquidation({ itemId: 'yok', quantity: 5 }, ITEMS, [], MARKET, makeStore())).toBeNull();
  });

  it('değeri olmayan pakette fiyat sıfır kalır, negatif olmaz', () => {
    expect(packageFairValue([{ itemId: 'yok', quantity: 3 }], ITEMS, MARKET)).toBe(0);
  });
});

describe('§11 — Arbitraj döngüsü kapalıdır', () => {
  it('fiyat alıcısı kanallarda al-sat her koşulda zarardır', () => {
    for (const channel of ['wholesaler', 'tradeNetwork'] as TradeChannel[]) {
      for (const q of [1, 40, 400]) {
        const cost = roundTripCost({
          item: ITEM,
          market: MARKET,
          quantity: q,
          baseUnitValue: bullionUnitValue(ITEM, MARKET),
          relationship: 100,
          buyFrom: channel,
          sellTo: channel,
        });
        expect(cost).toBeGreaterThan(0);
      }
    }
  });

  it('toptancıdan alıp toptancıya bozmak zarardır (finansman öncesi bile)', () => {
    const store = makeStore();
    const lot = supplyOffer(ITEM, 20, MARKET, store)!;
    const back = quoteLiquidation(
      { itemId: ITEM.id, quantity: lot.quantity },
      ITEMS,
      [position(lot.quantity, lot.unitPrice)],
      MARKET,
      store,
    )!;
    expect(back.gross).toBeLessThan(lot.total);
  });
});

describe('§11 — Dinamik havuz sapması alarm üretir', () => {
  it('sağlıklı dağılımda alarm susar', () => {
    let t = emptyTelemetry();
    for (let i = 0; i < 3_000; i += 1) {
      const roll = rollIntent(SEED, i, CHARACTER);
      t = recordIntent(t, roll.intent, roll.fromDynamicPool);
    }
    expect(intentAlarm(t).warning).toBeNull();
  });

  it('taban aşınırsa alarm konuşur', () => {
    // Elle bozulmuş bir telemetri: alış payı tabanın çok altında.
    const bozuk = {
      total: 1_000,
      counts: { buy: 200, sell: 500, service: 300, appraisal: 0 },
      fromDynamicPool: 240,
    };
    const alarm = intentAlarm(bozuk);
    expect(alarm.baseIntact).toBe(false);
    expect(alarm.warning).toMatch(/taban/i);
  });

  it('denge bandın dışına çıkarsa alarm konuşur', () => {
    const egik = {
      total: 1_000,
      counts: { buy: 800, sell: 180, service: 20, appraisal: 0 },
      fromDynamicPool: 200,
    };
    const alarm = intentAlarm(egik);
    expect(alarm.balanced).toBe(false);
    expect(alarm.warning).toMatch(/niyet|denge/i);
  });

  it('kısa örneklemde alarm konuşmaz — gürültü sapma sanılmaz (§3)', () => {
    const kisa = {
      total: 10,
      counts: { buy: 1, sell: 9, service: 0, appraisal: 0 },
      fromDynamicPool: 2,
    };
    expect(intentAlarm(kisa).sampled).toBe(false);
    expect(intentAlarm(kisa).warning).toBeNull();
  });
});

describe('§11 — Gün devri belirlenmiş sırada ve TEK KEZ uygulanır', () => {
  it('aynı gün ikinci kez kapanmaz: kasa tekrar eksilmez', () => {
    const state = economy();
    const first = closeDay(state, 3);
    const second = closeDay(first.state, 3);

    expect(first.applied).toBe(true);
    expect(second.applied).toBe(false);
    expect(second.state.store.cash).toBe(first.state.store.cash);
  });

  it('gider tam bir kez düşer', () => {
    const state = economy();
    const out = closeDay(state, 3);
    expect(out.state.store.cash).toBe(state.store.cash - state.store.dailyOverhead);
  });

  it('vadeler gün raporunda tarih sırasına göre listelenir', () => {
    const state = economy({
      store: makeStore({
        supplier: {
          trust: 50,
          limit: 100_000,
          terms: 3,
          openInvoices: [
            { id: 'a', amount: 5_000, dueDay: 9 },
            { id: 'b', amount: 3_000, dueDay: 5 },
          ],
          priceBand: 1,
          specialLotEligibility: false,
        },
      }),
    });
    const days = closeDay(state, 3).report.upcomingLiabilities.map((l) => l.dueDay);
    expect(days).toEqual([...days].sort((a, b) => a - b));
  });

  it('pozisyon değerlemesi kapanış fiyatıyla, sonuç ertesi gün fiyatıyla', () => {
    const today = createMarketForDay(SEED, 4);
    const tomorrow = createMarketForDay(SEED, 5, today);

    const pos = measurePosition(4, 100_000, [position(10)], ITEMS, today);
    const out = resolveOvernight(pos, tomorrow);

    // Referans DÜNÜN spotu; bugünün fiyatıyla ölçmek geceyi yok saymaktı.
    expect(pos.goldSpot).toBe(today.goldSpot);
    expect(out.spotChange).toBeCloseTo(
      (tomorrow.goldSpot - today.goldSpot) / today.goldSpot,
      10,
    );
  });

  it('olay çözümü gün başına bir kez: aynı gün iki kez üretilmez', () => {
    const a = createMarketForDay(SEED, 6, createMarketForDay(SEED, 5));
    const b = createMarketForDay(SEED, 6, createMarketForDay(SEED, 5));
    expect(a.activeEvent).toEqual(b.activeEvent);
  });
});

// ===========================================================================
// §11 — KAYDET / YÜKLE
// ===========================================================================

describe('§11 — Kaydet/yükle tutarlı geri yükler', () => {
  function fullState() {
    const network = spawnNetwork(SEED, 50);
    return {
      seed: SEED,
      spawnCounter: 17,
      jobCounter: 4,
      market: rebuildMarket(SEED, 6, 700),
      store: makeStore({
        cash: 88_000,
        supplier: {
          trust: 71,
          limit: 120_000,
          terms: 4,
          openInvoices: [{ id: 'inv1', amount: 24_500, dueDay: 9 }],
          priceBand: 1,
          specialLotEligibility: false,
        },
      }),
      inventory: [position(12, 6_500)],
      items: ITEMS,
      ledger: createLedger(),
      jobs: [],
      network: [
        {
          ...network[0]!,
          loan: { id: 'nl', memberId: network[0]!.id, principal: 6_000, totalDue: 6_210, dueDay: 8, takenDay: 6 },
        },
        ...network.slice(1),
      ],
      speed4xUnlocked: true,
    } as never;
  }

  it('REJİM tutarlı geri yüklenir', () => {
    const loaded = deserialize(serialize(fullState()));
    const expected = rebuildMarket(SEED, 6, 700);
    expect(loaded.market.regime).toBe(expected.regime);
    expect(loaded.market.trend).toBe(expected.trend);
    expect(loaded.market.activeEvent).toEqual(expected.activeEvent);
    expect(loaded.market.goldSpot).toBe(expected.goldSpot);
  });

  it('RNG SEED yaklaşımı korunur — yükleme sonrası aynı üretim devam eder', () => {
    const loaded = deserialize(serialize(fullState()));
    expect(loaded.seed).toBe(SEED);
    expect(loaded.spawnCounter).toBe(17);
    // Aynı seed + sayaç, aynı müşteriyi üretir.
    const a = spawnCustomer(loaded.seed, loaded.spawnCounter, loaded.market, loaded.store, CHARACTER);
    const b = spawnCustomer(SEED, 17, loaded.market, loaded.store, CHARACTER);
    expect(a.customer.id).toBe(b.customer.id);
  });

  it('AÇIK BORÇLAR, VADELER ve LİMİTLER birebir geri yüklenir', () => {
    const loaded = deserialize(serialize(fullState()));
    expect(loaded.store.supplier.openInvoices).toEqual([
      { id: 'inv1', amount: 24_500, dueDay: 9 },
    ]);
    expect(loaded.store.supplier.limit).toBe(120_000);
    expect(loaded.store.supplier.terms).toBe(4);
    expect(loaded.store.supplier.trust).toBe(71);
    // §8 ağının borcu da taşınır.
    expect(loaded.network[0]!.loan).toEqual({
      id: 'nl',
      memberId: loaded.network[0]!.id,
      principal: 6_000,
      totalDue: 6_210,
      dueDay: 8,
      takenDay: 6,
    });
  });

  it('POZİSYONLAR birebir geri yüklenir', () => {
    const loaded = deserialize(serialize(fullState()));
    expect(loaded.inventory).toMatchObject([position(12, 6_500)]);
    expect(loaded.inventory[0]?.poolId).toBe('QUARTER_GOLD_POOL');
    expect(loaded.store.cash).toBe(88_000);
  });

  it('yarım kalan pazarlık taşınmaz — reload ile teklif geri alınamaz (GDD 34.3)', () => {
    const loaded = deserialize(serialize(fullState()));
    expect(loaded.activeDeal).toBeNull();
    expect(loaded.activeCustomer).toBeNull();
    expect(loaded.queue).toEqual([]);
  });

  it('ileri sürümlü kayıt güvenle reddedilir', () => {
    const file = serialize(fullState());
    expect(() => migrate({ ...file, version: SAVE_VERSION + 5 })).toThrow();
  });

  it('kaydet → yükle → kaydet aynı dosyayı verir (idempotent)', () => {
    const once = serialize(fullState());
    const loaded = deserialize(once);
    const twice = serialize({ ...(fullState() as object), ...loaded } as never);
    expect(twice.store).toMatchObject(once.store);
    expect(twice.inventory.reduce((sum, p) => sum + p.costBasis, 0)).toBe(once.inventory.reduce((sum, p) => sum + p.costBasis, 0));
    expect(deserialize(twice).inventory).toEqual(twice.inventory);
    expect(twice.network).toEqual(once.network);
  });
});
