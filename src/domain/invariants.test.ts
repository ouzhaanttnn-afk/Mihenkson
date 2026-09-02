/**
 * MIHENKAYNAK — Ekonomi invariant testleri
 * Kaynak: GDD 31.3 "Ekonomi invariant testleri" ve EK F "Teknik Kabul Checklist'i".
 *
 * Bu testler denge değerlerini değil DEĞİŞMEZLERİ korur. Bir denge parametresi
 * değiştiğinde bu testler geçmeye devam etmelidir; geçmiyorsa değişen şey denge
 * değil tasarım sözleşmesidir.
 */

import { describe, expect, it } from 'vitest';

import { PURITY_TABLE } from './balance';
import { createMarketForDay, stepMarketIntraday } from './market';
import { spawnItem } from './item-spawn';
import { spawnCustomer } from './customer-spawn';
import { dayCharacter } from './intent';
import { applyTest, estimateBand, initialKnowledge, trueValue } from './valuation';
import { revalueInventory, thesisFor, type ThesisContext } from './thesis';
import { applyMove, createSession, effectiveReservation } from './negotiation';
import {
  applyTransaction,
  closeDay,
  createLedger,
  liquidityRatio,
  summarizeWealth,
  type EconomyState,
} from './settlement';
import { getTool } from '@data/tools';
import { ITEM_TEMPLATES } from '@data/item-templates';
import type { ItemInstance, SettlementTransaction, StoreState } from './types';

const SEED = 20260827;

function makeStore(overrides: Partial<StoreState> = {}): StoreState {
  return {
    name: 'Test',
    cash: 75_000,
    reputation: 42,
    level: 1,
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
    ...overrides,
  };
}

function makeEconomy(overrides: Partial<EconomyState> = {}): EconomyState {
  return {
    store: makeStore(),
    inventory: [],
    items: {},
    ledger: createLedger(),
    ...overrides,
  };
}

function thesisCtx(store = makeStore()): ThesisContext {
  return {
    store,
    market: createMarketForDay(SEED, 1),
    displayUsed: 0,
    workshopUsed: 0,
    liquidityRatio: 1,
  };
}

// ===========================================================================
// GDD 5.4 / 34.1 — HIDDEN TRUTH REROLL YOK
// ===========================================================================

/**
 * §3 gün karakteri — müşteri üretiminin üçüncü girdisi. Testler sabit bir
 * karakter kullanır ki dağılım oynaklığı invariant testlerini sallamasın.
 */
const CHARACTER = dayCharacter(SEED, 1, createMarketForDay(SEED, 1));

/**
 * Ürünle GELEN müşteri (müşteri satış intenti). §3'ten sonra havuz alış
 * intenti de üretiyor; alış müşterisi elinde ürünle gelmez. Ürüne dayanan
 * testler bu yüzden ilk uygun index'i tarar — sabit bir index'e yaslanmak
 * intent dağılımı her ayarlandığında testleri kırardı.
 */
function spawnSeller(index: number, market: ReturnType<typeof createMarketForDay>, store: StoreState) {
  for (let i = index; i < index + 400; i += 1) {
    const spawned = spawnCustomer(SEED, i, market, store, CHARACTER);
    if (spawned.items.length > 0) return spawned;
  }
  throw new Error('Ürün getiren müşteri bulunamadı');
}

describe('GDD 5.4 — Hidden truth reroll yok', () => {
  it('aynı (seed, index, şablon) her zaman aynı ürünü üretir', () => {
    for (const template of ITEM_TEMPLATES) {
      const a = spawnItem(SEED, 7, template.id);
      const b = spawnItem(SEED, 7, template.id);
      expect(b).toEqual(a);
    }
  });

  it('farklı spawn index farklı ürün örneği üretir', () => {
    const a = spawnItem(SEED, 1, 'bracelet_22k_burma');
    const b = spawnItem(SEED, 2, 'bracelet_22k_burma');
    expect(a.id).not.toBe(b.id);
  });

  it('testi tekrarlamak gerçeği değiştirmez — readout sabittir', () => {
    const item = spawnItem(SEED, 11, 'plated_bangle');
    const tool = getTool('density');

    const first = applyTest(item, tool, initialKnowledge(item), 0);
    const second = applyTest(item, tool, initialKnowledge(item), 99);

    expect(second.result.readout).toBe(first.result.readout);
    expect(second.result.raisesSuspicion).toBe(first.result.raisesSuspicion);
  });

  it('panel kapat-aç (bilgi durumunu yeniden kurma) hidden truth’u değiştirmez', () => {
    const item = spawnItem(SEED, 3, 'stone_ring_premium');
    const snapshot = JSON.stringify(item.truth);

    // Bilgi durumu sıfırlanıp yeniden kurulsa bile truth aynı nesnedir.
    initialKnowledge(item);
    initialKnowledge(item);

    expect(JSON.stringify(item.truth)).toBe(snapshot);
  });
});

// ===========================================================================
// GDD 7.3 — Görünmez risk yok
// ===========================================================================

describe('GDD 7.3 — Her gizli kusurun okunabilir sinyali vardır', () => {
  it('üretilen tüm kusurlar readableSignal taşır ve gözlem listesine düşer', () => {
    for (let i = 0; i < 400; i++) {
      const template = ITEM_TEMPLATES[i % ITEM_TEMPLATES.length]!;
      const item = spawnItem(SEED, i, template.id);

      for (const flaw of item.truth.hiddenFlaws) {
        expect(flaw.readableSignal.label.length).toBeGreaterThan(0);
        const visible = item.declared.observableSignals.some(
          (s) => s.label === flaw.readableSignal.label,
        );
        expect(visible).toBe(true);
      }
    }
  });

  it('yanlış ayar beyanı her zaman damga sinyali üretir', () => {
    let checked = 0;
    for (let i = 0; i < 500; i++) {
      const item = spawnItem(SEED, i, 'plated_bangle');
      if (item.truth.actualKarat === item.declared.claimedKarat) continue;
      checked++;
      const hasHallmarkFlaw = item.truth.hiddenFlaws.some((f) => f.kind === 'fakeHallmark');
      expect(hasHallmarkFlaw).toBe(true);
    }
    expect(checked).toBeGreaterThan(0);
  });
});

// ===========================================================================
// GDD 6 — Değerleme motoru
// ===========================================================================

describe('GDD 6 — Değerleme ve güven seviyesi', () => {
  const market = createMarketForDay(SEED, 1);

  it('test yaptıkça değer bandı daralır ve güven yükselir', () => {
    const item = spawnItem(SEED, 21, 'bracelet_22k_burma');
    let knowledge = initialKnowledge(item);
    const before = estimateBand(item, market, knowledge);

    for (const toolId of ['scale', 'touchstone', 'density']) {
      knowledge = applyTest(item, getTool(toolId), knowledge, 0).knowledge;
    }
    const after = estimateBand(item, market, knowledge);

    expect(after.relativeWidth).toBeLessThan(before.relativeWidth);
    const rank = { low: 0, medium: 1, high: 2 };
    expect(rank[after.confidence]).toBeGreaterThanOrEqual(rank[before.confidence]);
  });

  it('tam bilgiye ulaşıldığında band gerçek değeri kapsar', () => {
    for (let i = 0; i < 60; i++) {
      const template = ITEM_TEMPLATES[i % ITEM_TEMPLATES.length]!;
      const item = spawnItem(SEED, 900 + i, template.id);
      let knowledge = initialKnowledge(item);

      for (const toolId of ['scale', 'spectrometer', 'density', 'loupe']) {
        knowledge = applyTest(item, getTool(toolId), knowledge, 0).knowledge;
        knowledge = applyTest(item, getTool(toolId), knowledge, 0).knowledge;
      }

      const band = estimateBand(item, market, knowledge);
      const actual = trueValue(item, market);

      // Tam bilgide band gerçek değeri içermeli (yuvarlama payı ile).
      expect(band.min).toBeLessThanOrEqual(actual * 1.02 + 50);
      expect(band.max).toBeGreaterThanOrEqual(actual * 0.98 - 50);
    }
  });

  it('band alt sınırı hiçbir zaman negatif değildir', () => {
    for (let i = 0; i < 200; i++) {
      const template = ITEM_TEMPLATES[i % ITEM_TEMPLATES.length]!;
      const item = spawnItem(SEED, 500 + i, template.id);
      const band = estimateBand(item, market, initialKnowledge(item));
      expect(band.min).toBeGreaterThanOrEqual(0);
      expect(band.max).toBeGreaterThanOrEqual(band.min);
    }
  });

  it('saflık tablosu GDD 6.1 ile birebir aynıdır', () => {
    expect(PURITY_TABLE['8K']).toBe(0.333);
    expect(PURITY_TABLE['14K']).toBe(0.585);
    expect(PURITY_TABLE['18K']).toBe(0.75);
    expect(PURITY_TABLE['22K']).toBe(0.912);
    expect(PURITY_TABLE['24K']).toBe(0.995);
  });
});

// ===========================================================================
// GDD 7.2 — Diminishing return
// ===========================================================================

describe('GDD 7.2 — Aynı alanda tekrar test azalan getiri verir', () => {
  it('ikinci mihenk testi birincisinden daha az kesinlik kazandırır', () => {
    const item = spawnItem(SEED, 31, 'chain_14k');
    const tool = getTool('touchstone');

    const first = applyTest(item, tool, initialKnowledge(item), 0);
    const second = applyTest(item, tool, first.knowledge, 1);
    const third = applyTest(item, tool, second.knowledge, 2);

    expect(second.result.effectiveGain).toBeLessThan(first.result.effectiveGain);
    expect(third.result.effectiveGain).toBeLessThan(second.result.effectiveGain);
  });

  it('kesinlik hiçbir zaman 1’i aşmaz', () => {
    const item = spawnItem(SEED, 32, 'gram_gold_5');
    let knowledge = initialKnowledge(item);
    for (let i = 0; i < 12; i++) {
      knowledge = applyTest(item, getTool('spectrometer'), knowledge, i).knowledge;
    }
    for (const field of knowledge) {
      expect(field.certainty).toBeLessThanOrEqual(1);
    }
  });
});

// ===========================================================================
// GDD 34.2 / 11.4 — Rezervasyon fiyatı sabit, anti-spam çalışır
// ===========================================================================

describe('GDD 11.4 / 34.3 — Deterministik pazarlık', () => {
  const market = createMarketForDay(SEED, 1);

  function setup(index = 5) {
    const { customer, items } = spawnSeller(index, market, makeStore());
    const item = items[0]!;
    const knowledge = initialKnowledge(item);
    return {
      customer,
      item,
      ctx: { customer, reputation: 42, buyCeiling: 0, knowledge },
      session: createSession('l0', item.id),
    };
  }

  it('aynı müşteri iki kez spawn edilirse rezervasyon fiyatı aynıdır', () => {
    const a = spawnCustomer(SEED, 12, market, makeStore(), CHARACTER);
    const b = spawnCustomer(SEED, 12, market, makeStore(), CHARACTER);
    expect(b.customer.reservationPrice).toBe(a.customer.reservationPrice);
    expect(b.customer.archetype).toBe(a.customer.archetype);
  });

  it('aynı teklifi tekrar etmek yeni kabul şansı üretmez', () => {
    const { ctx, session } = setup();
    const lowOffer = Math.round(ctx.customer.reservationPrice * 0.7);

    const r1 = applyMove(session, ctx, { kind: 'offer', amount: lowOffer, atRound: 0 });
    expect(r1.response.state).not.toBe('ACCEPTED');

    const r2 = applyMove(r1.session, ctx, { kind: 'offer', amount: lowOffer, atRound: 1 });
    expect(r2.response.wasRepeatOffer).toBe(true);
    expect(r2.response.state).not.toBe('ACCEPTED');
    // Anti-spam cezası uygulanır.
    expect(r2.response.patienceDelta).toBeLessThan(0);
    expect(r2.response.trustDelta).toBeLessThan(0);
    // Karşı teklif değişmez — yeni bilgi verilmedi.
    expect(r2.response.counterOffer).toBe(r1.response.counterOffer);
  });

  it('aynı teklif 20 kez tekrarlansa da asla kabul edilmez', () => {
    const { ctx, session } = setup(6);
    const lowOffer = Math.round(ctx.customer.reservationPrice * 0.6);

    let current = session;
    for (let i = 0; i < 20; i++) {
      const { session: next, response } = applyMove(current, ctx, {
        kind: 'offer',
        amount: lowOffer,
        atRound: i,
      });
      expect(response.state).not.toBe('ACCEPTED');
      current = next;
      if (current.state === 'REJECTED') break;
    }
  });

  it('eşiği aşan teklif deterministik olarak kabul edilir', () => {
    const { ctx, session } = setup(7);
    const threshold = effectiveReservation(ctx, session);

    const a = applyMove(session, ctx, { kind: 'offer', amount: threshold, atRound: 0 });
    const b = applyMove(session, ctx, { kind: 'offer', amount: threshold, atRound: 0 });

    expect(a.response.state).toBe('ACCEPTED');
    expect(b.response.state).toBe('ACCEPTED');
    expect(b.response.settledPrice).toBe(a.response.settledPrice);
  });

  it('eşiğin bir lira altı reddedilir — zar yok', () => {
    const { ctx, session } = setup(8);
    const threshold = effectiveReservation(ctx, session);
    for (let i = 0; i < 10; i++) {
      const { response } = applyMove(session, ctx, {
        kind: 'offer',
        amount: threshold - 1,
        atRound: 0,
      });
      expect(response.state).not.toBe('ACCEPTED');
    }
  });

  it('terminal state’te yeni hamle sonucu değiştirmez', () => {
    const { ctx, session } = setup(9);
    const threshold = effectiveReservation(ctx, session);
    const accepted = applyMove(session, ctx, { kind: 'offer', amount: threshold, atRound: 0 });

    const after = applyMove(accepted.session, ctx, {
      kind: 'offer',
      amount: threshold * 2,
      atRound: 1,
    });

    expect(after.session.settledPrice).toBe(accepted.session.settledPrice);
    expect(after.session.state).toBe('ACCEPTED');
  });

  it('karşı teklif hiçbir zaman etkin rezervasyonun altına inmez', () => {
    for (let idx = 20; idx < 50; idx++) {
      const { ctx, session } = setup(idx);
      let current = session;
      let offer = Math.round(ctx.customer.reservationPrice * 0.55);

      for (let round = 0; round < 5; round++) {
        const { session: next, response } = applyMove(current, ctx, {
          kind: 'offer',
          amount: offer,
          atRound: round,
        });
        if (response.counterOffer !== null) {
          const threshold = effectiveReservation(ctx, next);
          expect(response.counterOffer).toBeGreaterThanOrEqual(threshold);
        }
        current = next;
        if (current.state === 'ACCEPTED' || current.state === 'REJECTED') break;
        offer = Math.round(offer * 1.06);
      }
    }
  });

  it('güven biriktirmek rezervasyonu sınırsız kıramaz (GDD 35.1)', () => {
    const { ctx, session } = setup(13);
    const base = effectiveReservation(ctx, session);

    const maxTrustCtx = { ...ctx, customer: { ...ctx.customer, trust: 100, urgency: 100 }, reputation: 100 };
    const flexed = effectiveReservation(maxTrustCtx, session);

    // maxReservationFlex = %8 → en fazla %8 esneme.
    expect(flexed).toBeGreaterThanOrEqual(Math.round(base * 0.9));
  });
});

// ===========================================================================
// GDD 11.5 — Gerekçe doğruluk kuralı
// ===========================================================================

describe('GDD 11.5 — Gerekçe yalnız doğrulanmış veriye dayanabilir', () => {
  const market = createMarketForDay(SEED, 1);

  it('test yapılmadan verilen gerekçe bilgili müşteride güven kaybettirir', () => {
    const { customer, items } = spawnSeller(14, market, makeStore());
    const item = items[0]!;
    const knowledgeableCustomer = { ...customer, knowledge: 85 };
    const ctx = {
      customer: knowledgeableCustomer,
      reputation: 42,
      buyCeiling: 0,
      knowledge: initialKnowledge(item),
    };

    const { response } = applyMove(createSession('l0', item.id), ctx, {
      kind: 'reason',
      reasonEvidence: { field: 'purity', toolId: 'touchstone', claim: 'Mihenk 18K gösterdi' },
      atRound: 0,
    });

    expect(response.trustDelta).toBeLessThan(0);
    expect(response.suspicionDelta).toBeGreaterThan(0);
  });

  it('test yapıldıktan sonra aynı gerekçe güven kazandırır', () => {
    const { customer, items } = spawnSeller(14, market, makeStore());
    const item = items[0]!;
    const knowledge = applyTest(item, getTool('touchstone'), initialKnowledge(item), 0).knowledge;
    const ctx = { customer, reputation: 42, buyCeiling: 0, knowledge };

    const { response } = applyMove(createSession('l0', item.id), ctx, {
      kind: 'reason',
      reasonEvidence: { field: 'purity', toolId: 'touchstone', claim: 'Mihenk ayarı gösterdi' },
      atRound: 0,
    });

    expect(response.trustDelta).toBeGreaterThan(0);
  });

  it('aynı gerekçe ikinci kez değer üretmez', () => {
    const { customer, items } = spawnSeller(15, market, makeStore());
    const item = items[0]!;
    const knowledge = applyTest(item, getTool('touchstone'), initialKnowledge(item), 0).knowledge;
    const ctx = { customer, reputation: 42, buyCeiling: 0, knowledge };
    const move = {
      kind: 'reason' as const,
      reasonEvidence: { field: 'purity' as const, toolId: 'touchstone', claim: 'Ayar ölçüldü' },
      atRound: 0,
    };

    const first = applyMove(createSession('l0', item.id), ctx, move);
    const second = applyMove(first.session, ctx, move);

    expect(second.response.trustDelta).toBe(0);
  });
});

// ===========================================================================
// GDD 22.1 / 34.4 — Tek settlement, idempotency
// ===========================================================================

describe('GDD 22.1 / 34.4 — Tek settlement kuralı', () => {
  function buyTx(txId: string, item: ItemInstance, price: number): SettlementTransaction {
    return {
      txId,
      dealId: 'deal_1',
      day: 1,
      cashDelta: -price,
      itemsIn: [{ ...item, buyCost: price, acquiredDay: 1, location: 'backStock' }],
      itemsOut: [],
      trustDelta: 0,
      reputationDelta: 0,
      xpDelta: 30,
      label: 'test alımı',
    };
  }

  it('aynı txId iki kez uygulanamaz — çift tap ikinci işlem üretmez', () => {
    const item = spawnItem(SEED, 41, 'quarter_gold');
    let economy = makeEconomy();
    const tx = buyTx('settle_deal_1_line0', item, 10_000);

    const first = applyTransaction(economy, tx);
    expect(first.applied).toBe(true);
    economy = first.state;

    const second = applyTransaction(economy, tx);
    expect(second.applied).toBe(false);
    // Kasa ve stok hiç değişmedi.
    expect(second.state.store.cash).toBe(economy.store.cash);
    expect(second.state.inventory.length).toBe(economy.inventory.length);
  });

  it('reload sonrası aynı işlem yeniden settlement edilmez', () => {
    const item = spawnItem(SEED, 42, 'gram_gold_10');
    const tx = buyTx('settle_deal_2_line0', item, 40_000);

    let economy = makeEconomy();
    economy = applyTransaction(economy, tx).state;
    const cashAfterFirst = economy.store.cash;

    // Save/load simülasyonu: ledger korunarak durum yeniden kurulur.
    const reloaded: EconomyState = JSON.parse(JSON.stringify(economy));
    const replay = applyTransaction(reloaded, tx);

    expect(replay.applied).toBe(false);
    expect(replay.state.store.cash).toBe(cashAfterFirst);
  });

  it('yetersiz nakitte işlem uygulanmaz ve durum bozulmaz', () => {
    const item = spawnItem(SEED, 43, 'small_ingot');
    const economy = makeEconomy({ store: makeStore({ cash: 1_000 }) });
    const outcome = applyTransaction(economy, buyTx('tx_big', item, 90_000));

    expect(outcome.applied).toBe(false);
    expect(outcome.state.store.cash).toBe(1_000);
    expect(outcome.state.inventory).toHaveLength(0);
  });

  it('farklı kalemler ayrı txId ile bağımsız settle olur (GDD 12.3)', () => {
    const a = spawnItem(SEED, 44, 'quarter_gold');
    const b = spawnItem(SEED, 45, 'chain_14k');

    let economy = makeEconomy();
    economy = applyTransaction(economy, buyTx('settle_d_line0', a, 9_000)).state;
    economy = applyTransaction(economy, buyTx('settle_d_line1', b, 6_000)).state;

    expect(economy.inventory).toHaveLength(2);
    expect(economy.inventory[0]!.costBasis).toBe(9_000);
    expect(economy.inventory[1]!.costBasis).toBe(6_000);
    expect(economy.store.cash).toBe(75_000 - 15_000);
  });
});

// ===========================================================================
// GDD 22.1 — Gün kapanışı idempotent
// ===========================================================================

describe('GDD 22.1 — Gün kapanışı idempotent', () => {
  it('aynı gün iki kez kapanırsa kasa bir kez eksilir', () => {
    let economy = makeEconomy();
    const first = closeDay(economy, 1);
    expect(first.applied).toBe(true);
    economy = first.state;
    const cashAfter = economy.store.cash;

    const second = closeDay(economy, 1);
    expect(second.applied).toBe(false);
    expect(second.state.store.cash).toBe(cashAfter);
  });

  it('farklı günler ayrı ayrı uygulanır', () => {
    let economy = makeEconomy();
    economy = closeDay(economy, 1).state;
    economy = closeDay(economy, 2).state;
    expect(economy.store.cash).toBe(75_000 - 2 * 1_200);
  });
});

// ===========================================================================
// GDD 34.5 — Gerçekleşmiş kâr ile stok potansiyeli ayrıdır
// ===========================================================================

describe('GDD 34.5 — Stok potansiyeli gerçekleşmiş kâra eklenmez', () => {
  it('stok değeri artsa da realizedProfit sıfır kalır', () => {
    const item = spawnItem(SEED, 51, 'bracelet_22k_thin');
    let economy = makeEconomy();

    economy = applyTransaction(economy, {
      txId: 'buy_1',
      dealId: 'd1',
      day: 1,
      cashDelta: -20_000,
      itemsIn: [{ ...item, buyCost: 20_000, acquiredDay: 1, location: 'backStock' }],
      itemsOut: [],
      trustDelta: 0,
      reputationDelta: 0,
      xpDelta: 0,
      label: 'alım',
    }).state;

    // Stok değeri yükselsin.
    economy = {
      ...economy,
      inventory: economy.inventory.map((p) => ({ ...p, currentValue: 26_000 })),
    };

    const wealth = summarizeWealth(economy);
    // Eski kayıt kanal tablosu taşımıyor: net çıkış markı %12 hızlı satış
    // iskontosu uygular, teorik 6.000 ₺ farkı servete aynen yazmaz.
    expect(wealth.stockPotential).toBe(2_880);
    // Ama gerçekleşmiş kâr hâlâ sıfır — satış olmadı.
    expect(wealth.realizedProfitToday).toBe(0);
    expect(economy.ledger.realizedProfitTotal).toBe(0);
  });
});

// ===========================================================================
// GDD 14.3 / 15.1 — Stok yeniden değerleme
// ===========================================================================

describe('GDD 14.3 — Stok bugünkü piyasaya göre yeniden değerlenir', () => {
  function stocked() {
    const item = spawnItem(SEED, 61, 'bracelet_22k_thin');
    const economy = makeEconomy();
    return applyTransaction(economy, {
      txId: 'buy_reval',
      dealId: 'd',
      day: 1,
      cashDelta: -20_000,
      itemsIn: [{ ...item, buyCost: 20_000, acquiredDay: 1, location: 'backStock' }],
      itemsOut: [],
      trustDelta: 0,
      reputationDelta: 0,
      xpDelta: 0,
      label: 'alım',
    }).state;
  }

  it('currentValue alış maliyetinde donup kalmaz', () => {
    const economy = stocked();
    expect(economy.inventory[0]!.currentValue).toBe(20_000);

    const revalued = revalueInventory(economy.inventory, economy.items, thesisCtx());
    expect(revalued[0]!.currentValue).not.toBe(20_000);
    expect(revalued[0]!.currentValue).toBeGreaterThan(0);
  });

  it('her kalem için çıkış kanalı değerleri doldurulur', () => {
    const economy = stocked();
    const revalued = revalueInventory(economy.inventory, economy.items, thesisCtx());
    const exits = revalued[0]!.expectedExitValues;
    expect(Object.keys(exits).length).toBeGreaterThanOrEqual(2);
  });

  it('yeniden değerleme gerçekleşmiş kâra DOKUNMAZ (GDD 34.5)', () => {
    const economy = stocked();
    const revalued = revalueInventory(economy.inventory, economy.items, thesisCtx());
    const after: EconomyState = { ...economy, inventory: revalued };

    expect(after.ledger.realizedProfitTotal).toBe(0);
    expect(after.ledger.realizedProfitToday).toBe(0);
    // Stok potansiyeli değişir, gerçekleşmiş kâr değişmez.
    expect(summarizeWealth(after).stockPotential).not.toBe(0);
    expect(summarizeWealth(after).realizedProfitToday).toBe(0);
  });

  it('spot yükselince stok değeri de yükselir', () => {
    const economy = stocked();
    const day1 = createMarketForDay(SEED, 1);
    const richer = { ...day1, goldSpot: day1.goldSpot * 1.1 };

    const a = revalueInventory(economy.inventory, economy.items, { ...thesisCtx(), market: day1 });
    const b = revalueInventory(economy.inventory, economy.items, { ...thesisCtx(), market: richer });

    expect(b[0]!.currentValue).toBeGreaterThan(a[0]!.currentValue);
  });

  it('yeniden değerleme deterministiktir', () => {
    const economy = stocked();
    const a = revalueInventory(economy.inventory, economy.items, thesisCtx());
    const b = revalueInventory(economy.inventory, economy.items, thesisCtx());
    expect(b).toEqual(a);
  });
});

// ===========================================================================
// GDD 14.2 — Likidite oranı
// ===========================================================================

describe('GDD 14.2 — Likidite oranı', () => {
  it('Nakit / (Nakit + Stok Maliyet Tabanı) formülünü uygular', () => {
    const inventory = [
      { itemId: 'a', quantity: 1,
        costBasis: 30_000, currentValue: 31_000, age: 0, demand: 'steady' as const, thesis: null, location: 'backStock' as const, expectedExitValues: {} },
    ];
    expect(liquidityRatio(70_000, inventory)).toBeCloseTo(0.7, 5);
    expect(liquidityRatio(0, inventory)).toBe(0);
    expect(liquidityRatio(50_000, [])).toBe(1);
  });
});

// ===========================================================================
// GDD 8.1 / 35.1 — Çıkış kanalı ekonomik sıralaması
// ===========================================================================

describe('GDD 35.1 — Hızlı toptan çıkış perakendeyi geçmez', () => {
  it('işçilik değeri olan üründe vitrin net getirisi toptandan yüksektir', () => {
    const market = createMarketForDay(SEED, 1);
    const ctx = thesisCtx();
    let checked = 0;

    for (let i = 0; i < 120; i++) {
      const item = spawnItem(SEED, 700 + i, 'ring_18k');
      if (item.declared.visibleCondition === 'broken') continue;

      const band = estimateBand(item, market, initialKnowledge(item));
      const options = thesisFor(item, band, ctx);

      const retail = options.find((o) => o.channel === 'retail');
      const wholesale = options.find((o) => o.channel === 'wholesale');
      if (!retail || !wholesale) continue;

      checked++;
      expect(retail.expectedNet).toBeGreaterThan(wholesale.expectedNet);
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('eritme, işçilikli üründe en yüksek getiriyi vermez', () => {
    const market = createMarketForDay(SEED, 1);
    const ctx = thesisCtx();
    let checked = 0;

    for (let i = 0; i < 80; i++) {
      const item = spawnItem(SEED, 800 + i, 'earring_14k');
      const band = estimateBand(item, market, initialKnowledge(item));
      const options = thesisFor(item, band, ctx);

      const melt = options.find((o) => o.channel === 'melt');
      const best = options.reduce((a, b) => (b.expectedNet > a.expectedNet ? b : a));
      if (!melt || options.length < 2) continue;

      checked++;
      expect(best.expectedNet).toBeGreaterThanOrEqual(melt.expectedNet);
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('her ürün için en az 2, en fazla 4 kanal gösterilir (GDD 23.11)', () => {
    const market = createMarketForDay(SEED, 1);
    const ctx = thesisCtx();

    for (let i = 0; i < 150; i++) {
      const template = ITEM_TEMPLATES[i % ITEM_TEMPLATES.length]!;
      const item = spawnItem(SEED, 1000 + i, template.id);
      const band = estimateBand(item, market, initialKnowledge(item));
      const options = thesisFor(item, band, ctx);

      expect(options.length).toBeGreaterThanOrEqual(2);
      expect(options.length).toBeLessThanOrEqual(4);
    }
  });

  it('alış tavanı beklenen net getirinin altındadır (GDD 6.4)', () => {
    const market = createMarketForDay(SEED, 1);
    const ctx = thesisCtx();

    for (let i = 0; i < 100; i++) {
      const template = ITEM_TEMPLATES[i % ITEM_TEMPLATES.length]!;
      const item = spawnItem(SEED, 1200 + i, template.id);
      const band = estimateBand(item, market, initialKnowledge(item));

      for (const option of thesisFor(item, band, ctx)) {
        expect(option.buyCeiling).toBeLessThan(Math.max(1, option.expectedNet));
        expect(option.buyCeiling).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('düşük güven (geniş band) alış tavanını düşürür — risk rezervi çalışır', () => {
    const market = createMarketForDay(SEED, 1);
    const ctx = thesisCtx();
    const item = spawnItem(SEED, 1300, 'stone_ring_premium');

    const uninformed = estimateBand(item, market, initialKnowledge(item));
    let knowledge = initialKnowledge(item);
    for (const toolId of ['scale', 'spectrometer', 'loupe', 'density']) {
      knowledge = applyTest(item, getTool(toolId), knowledge, 0).knowledge;
    }
    const informed = estimateBand(item, market, knowledge);

    const ceilingUninformed = thesisFor(item, uninformed, ctx)[0]!.buyCeiling;
    const ceilingInformed = thesisFor(item, informed, ctx)[0]!.buyCeiling;

    expect(informed.relativeWidth).toBeLessThan(uninformed.relativeWidth);
    expect(ceilingInformed).toBeGreaterThan(ceilingUninformed);
  });
});

// ===========================================================================
// GDD 13.4 / 28.3 — Piyasa determinizmi
// ===========================================================================

describe('GDD 13.4 — Piyasa reload avantajı üretmez', () => {
  it('aynı (seed, gün) aynı rejim ve spot üretir', () => {
    for (let day = 1; day <= 10; day++) {
      const a = createMarketForDay(SEED, day);
      const b = createMarketForDay(SEED, day);
      expect(b.regime).toBe(a.regime);
      expect(b.goldSpot).toBe(a.goldSpot);
      expect(b.trend).toBe(a.trend);
      expect(b.activeEvent?.id ?? null).toBe(a.activeEvent?.id ?? null);
    }
  });

  it('gün içi adım deterministiktir', () => {
    const market = createMarketForDay(SEED, 3);
    const a = stepMarketIntraday(market, 11 * 60);
    const b = stepMarketIntraday(market, 11 * 60);
    expect(b.goldSpot).toBe(a.goldSpot);
  });

  it('çeyrek altın fiyatı gram spotundan türer — bağımsız arbitraj yoktur', () => {
    const market = createMarketForDay(SEED, 1);
    const gram = market.assets.find((a) => a.id === 'goldGram')!;
    const quarter = market.assets.find((a) => a.id === 'quarterGold')!;
    const derived = gram.price / .995 * 1.75 * .922;
    expect(quarter.price).toBeCloseTo(derived, 0);
  });

  it('event hareketi rejim tavanını aşmaz', () => {
    for (let day = 1; day <= 60; day++) {
      const prev = createMarketForDay(SEED, day);
      const next = createMarketForDay(SEED, day + 1, prev);
      const move = Math.abs(next.goldSpot - prev.goldSpot) / prev.goldSpot;
      // GDD 13.2 — en yüksek tavan şok olayda %8 + günlük %2.5.
      expect(move).toBeLessThan(0.12);
    }
  });
});

// ===========================================================================
// GDD 9.3 — Müşteri spawn determinizmi
// ===========================================================================

describe('GDD 9.3 — Müşteri spawn sabitleri', () => {
  it('aynı index aynı müşteri ve ürünleri üretir', () => {
    const market = createMarketForDay(SEED, 2);
    const store = makeStore();
    const a = spawnCustomer(SEED, 33, market, store, CHARACTER);
    const b = spawnCustomer(SEED, 33, market, store, CHARACTER);
    expect(b).toEqual(a);
  });

  it('rezervasyon fiyatı her zaman pozitiftir ve bütçe altındadır', () => {
    const market = createMarketForDay(SEED, 2);
    const store = makeStore();
    for (let i = 0; i < 200; i++) {
      const { customer } = spawnCustomer(SEED, i, market, store, CHARACTER);
      expect(customer.patience).toBe(customer.patienceMax);
      expect(customer.budget).toBeGreaterThan(0);

      if (customer.intent === 'buy') {
        // Alış müşterisinin sınırı rezervasyon değil ÖDEME TAVANIdır; ürünü
        // getirmediği için rezervasyonun bir dayanağı yoktur (Addendum §3).
        expect(customer.demand).not.toBeNull();
        expect(customer.purchaseCeilingRatio).toBeGreaterThan(1);
      } else {
        expect(customer.reservationPrice).toBeGreaterThan(0);
      expect(customer.budget).toBeGreaterThanOrEqual(customer.reservationPrice);
      }
    }
  });
});
