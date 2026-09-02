/**
 * MIHENKAYNAK — Intent dağılımı ve müşteri alış akışı kabul testleri
 * Kaynak: Ekonomi Ara Düzeltmesi v1.0 · §3, §4.1; GDD 23.23, 34.2.
 */

import { describe, expect, it } from 'vitest';

import { INTENT_MIX, PURCHASE, START } from './balance';
import {
  dayCharacter,
  emptyTelemetry,
  intentShares,
  recordIntent,
  rollIntent,
  tradeBalance,
} from './intent';
import { createMarketForDay } from './market';
import { spawnCustomer } from './customer-spawn';
import { spawnItem } from './item-spawn';
import {
  channelForDemand,
  fulfilmentOf,
  matchDemand,
  offerableStock,
  packageFairValue,
  purchaseCeiling,
  quotePackage,
  repricePackage,
  createPurchaseSession,
} from './purchase';
import { applyMove, createSession, effectiveReservation } from './negotiation';
import type { Customer, InventoryPosition, ItemInstance, StoreState } from './types';

const SEED = 20260827;
const MARKET = createMarketForDay(SEED, 1);
const CHARACTER = dayCharacter(SEED, 1, MARKET);

function makeStore(): StoreState {
  return {
    name: 'Test',
    cash: START.cash,
    reputation: START.reputation,
    level: 2,
    xp: 0,
    xpToNext: 580,
    storeTier: 1,
    displaySlots: START.displaySlots,
    backStockSlots: START.backStockSlots,
    workshopCapacity: START.workshopCapacity,
    staff: [],
    supplier: {
      trust: START.supplierTrust,
      limit: START.supplierLimit,
      terms: START.supplierTerms,
      openInvoices: [],
      priceBand: 1,
      specialLotEligibility: false,
    },
    payables: [],
    dailyOverhead: START.dailyOverhead,
  };
}

// ===========================================================================
// §3 — INTENT DAĞILIMI
// ===========================================================================

describe('§3 — Intent dağılımı %38 / %38 / %24', () => {
  function sample(count: number, character = CHARACTER) {
    let t = emptyTelemetry();
    for (let i = 0; i < count; i += 1) {
      const { intent, fromDynamicPool } = rollIntent(SEED, i, character);
      t = recordIntent(t, intent, fromDynamicPool);
    }
    return t;
  }

  it('sabit taban korunur: alış ve satış payları %38\'in ALTINA inmez', () => {
    // §3 "Sabit taban; dinamik havuz tarafından AZALTILMAZ."
    const shares = intentShares(sample(6000));
    expect(shares.buy).toBeGreaterThanOrEqual(INTENT_MIX.customerBuys - 0.02);
    expect(shares.sell).toBeGreaterThanOrEqual(INTENT_MIX.customerSells - 0.02);
  });

  it('dinamik havuz toplamın yaklaşık %24\'ü kadardır', () => {
    const t = sample(6000);
    expect(t.fromDynamicPool / t.total).toBeCloseTo(INTENT_MIX.dynamic, 1);
  });

  it('§3 — dinamik havuz TEK YÖNE yığılamaz: fiili alış-satış dengesi korunur', () => {
    // Eğimin en uç değeriyle bile denge 1'den fazla uzaklaşamaz.
    const extreme = { ...CHARACTER, dynamicTilt: INTENT_MIX.maxDynamicTilt };
    const reverse = { ...CHARACTER, dynamicTilt: -INTENT_MIX.maxDynamicTilt };

    for (const c of [extreme, reverse]) {
      const balance = tradeBalance(sample(6000, c));
      expect(balance).toBeGreaterThan(.35 / .65 - .03);
      expect(balance).toBeLessThan(.65 / .35 + .03);
    }
  });

  it('gün karakteri dağılımın TABANINI değiştirmez, yalnız havuzu eğer', () => {
    const a = intentShares(sample(6000, { ...CHARACTER, dynamicTilt: 0.5 }));
    const b = intentShares(sample(6000, { ...CHARACTER, dynamicTilt: -0.5 }));
    // Eğim yön değiştirse de iki taban ayakta kalır.
    expect(a.buy).toBeGreaterThanOrEqual(0.36);
    expect(b.sell).toBeGreaterThanOrEqual(0.36);
    // Ama havuz gerçekten iş görüyor: paylar aynı değil.
    expect(a.buy).not.toBeCloseTo(b.buy, 2);
  });

  it('ekspertiz üretilir ve yalnız dinamik havuzun içinden çıkar', () => {
    // GDD 23.23'ün beşinci akışı artık uygulanmıştır (İncele → Test →
    // Rapor/Ücret → Sonuç), bu yüzden havuz onu üretir.
    const shares = intentShares(sample(6000));
    expect(shares.appraisal).toBeGreaterThan(0);

    // §3 DEĞİŞMEZİ: ticaret dışı niyetlerin TOPLAMI dinamik havuzu aşamaz.
    // Aşsaydı %38/%38 sabit tabandan çalınmış olurdu.
    expect(shares.appraisal + shares.service).toBeLessThanOrEqual(
      INTENT_MIX.dynamic + INTENT_MIX.baseTolerance,
    );

    // Ekspertiz servisten seyrek gelir — dükkânın her gün yaptığı iş değil.
    expect(shares.appraisal).toBeLessThan(shares.service);
  });

  it('aynı seed ve index her zaman aynı niyeti verir (GDD 11.4)', () => {
    for (let i = 0; i < 50; i += 1) {
      expect(rollIntent(SEED, i, CHARACTER)).toEqual(rollIntent(SEED, i, CHARACTER));
    }
  });

  it('gün karakteri deterministiktir ve kelepçelidir', () => {
    for (let day = 1; day <= 40; day += 1) {
      const market = createMarketForDay(SEED, day);
      const c = dayCharacter(SEED, day, market);
      expect(c).toEqual(dayCharacter(SEED, day, market));
      expect(Math.abs(c.dynamicTilt)).toBeLessThanOrEqual(INTENT_MIX.maxDynamicTilt);
      expect(c.bulkOrderChance).toBeGreaterThan(0);
      expect(c.tempo).toBeGreaterThan(0);
    }
  });
});

// ===========================================================================
// GDD 23.23 — MÜŞTERİ ALIŞ AKIŞI
// ===========================================================================

describe('GDD 23.23 — Müşteri alış akışı', () => {
  function buyer(): Customer {
    for (let i = 0; i < 500; i += 1) {
      const spawned = spawnCustomer(SEED, i, MARKET, makeStore(), CHARACTER);
      if (spawned.customer.intent === 'buy') return spawned.customer;
    }
    throw new Error('Alış müşterisi bulunamadı');
  }

  function stock(templateIds: string[]): {
    inventory: InventoryPosition[];
    items: Record<string, ItemInstance>;
  } {
    const items: Record<string, ItemInstance> = {};
    const inventory: InventoryPosition[] = [];
    templateIds.forEach((templateId, i) => {
      const item = spawnItem(SEED, 900 + i, templateId);
      items[item.id] = item;
      inventory.push({
        itemId: item.id,
        quantity: 1,
        costBasis: 10_000,
        currentValue: 11_000,
        age: 1,
        demand: 'steady',
        thesis: null,
        location: 'display',
        expectedExitValues: {},
      });
    });
    return { inventory, items };
  }

  it('alış müşterisi ELİNDE ÜRÜNLE gelmez; onun yerine talep taşır', () => {
    for (let i = 0; i < 500; i += 1) {
      const spawned = spawnCustomer(SEED, i, MARKET, makeStore(), CHARACTER);
      if (spawned.customer.intent !== 'buy') continue;
      expect(spawned.items).toHaveLength(0);
      expect(spawned.customer.demand).not.toBeNull();
    }
  });

  it('GDD 34.2 — ödeme tavanı ORANI spawn anında sabittir', () => {
    const a = spawnCustomer(SEED, 7, MARKET, makeStore(), CHARACTER);
    const b = spawnCustomer(SEED, 7, MARKET, makeStore(), CHARACTER);
    expect(b.customer.purchaseCeilingRatio).toBe(a.customer.purchaseCeilingRatio);
    expect(b.customer.demand).toEqual(a.customer.demand);
  });

  it('GDD 34.2 — paketi büyütmek tavanı YENİDEN ZAR ATMAZ, oranla ölçekler', () => {
    const customer = buyer();
    const kucuk = purchaseCeiling(customer, 10_000);
    const buyuk = purchaseCeiling(customer, 20_000);
    // Bütçe sınırına takılmadığı sürece tavan tam oranla ölçeklenir.
    if (buyuk < customer.budget) expect(buyuk).toBe(kucuk * 2);
    // Ve hiçbir koşulda bütçeyi aşmaz.
    expect(purchaseCeiling(customer, 10_000_000)).toBeLessThanOrEqual(customer.budget);
  });

  it('stok eşleşmesi talebi doğru sınıflandırır', () => {
    const customer = buyer();
    const demand = { ...customer.demand!, wantsBullion: true, templateId: 'quarter_gold' };
    const quarter = spawnItem(SEED, 1, 'quarter_gold');
    const gram = spawnItem(SEED, 2, 'gram_gold_10');

    expect(matchDemand(demand, quarter)).toBe('exact');
    expect(matchDemand(demand, gram)).toBe('off');
  });

  it('§4.1 — kısmi karşılama kuralı: eksik paket ancak müşteri razıysa geçerli', () => {
    const strict = { quantity: 10, minQuantity: 10, acceptsPartial: false } as never;
    const loose = { quantity: 10, minQuantity: 5, acceptsPartial: true } as never;

    expect(fulfilmentOf(strict, 10)).toBe('full');
    expect(fulfilmentOf(strict, 6)).toBe('none');
    expect(fulfilmentOf(loose, 6)).toBe('partial');
    expect(fulfilmentOf(loose, 3)).toBe('none');
    expect(fulfilmentOf(loose, 0)).toBe('none');
  });

  it('§4.1 — toplu talep TOPLU MÜŞTERİ kanal profiliyle fiyatlanır', () => {
    const tekil = { quantity: 2 } as never;
    const toplu = { quantity: PURCHASE.bulkChannelThreshold + 5 } as never;
    expect(channelForDemand(tekil)).toBe('retailCustomer');
    expect(channelForDemand(toplu)).toBe('bulkCustomer');
  });

  it('Addendum §10 — paket fiyatı temel değerlemeyi DEĞİŞTİRMEZ', () => {
    const customer = buyer();
    const { items } = stock(['quarter_gold', 'quarter_gold']);
    const lines = Object.keys(items).map((itemId) => ({ itemId, quantity: 1 }));
    const fairBefore = packageFairValue(lines, items, MARKET);

    quotePackage(lines, customer.demand!, customer, MARKET, items);

    expect(packageFairValue(lines, items, MARKET)).toBe(fairBefore);
  });

  it('paket değiştikçe fiyat ve karşılama durumu yeniden TÜREtilir', () => {
    const customer = buyer();
    const wanted = customer.demand!.templateId!;
    const { inventory, items } = stock([wanted, wanted, wanted]);
    const ids = Object.keys(items);

    const empty = createPurchaseSession(customer.demand!);
    expect(empty.suggestedPrice).toBe(0);
    expect(empty.fulfilment).toBe('none');

    const line = (id: string) => ({ itemId: id, quantity: 1 });
    const one = repricePackage(empty, [line(ids[0]!)], items, inventory, customer, MARKET);
    const two = repricePackage(empty, ids.slice(0, 2).map(line), items, inventory, customer, MARKET);

    expect(two.packageFairValue).toBeGreaterThan(one.packageFairValue);
    expect(two.packageCost).toBeGreaterThan(one.packageCost);
    expect(two.suggestedPrice).toBeGreaterThan(one.suggestedPrice);
  });

  it('sunulabilir stok yalnız vitrin ve arka stoktan gelir', () => {
    const customer = buyer();
    const wanted = customer.demand!.templateId!;
    const { inventory, items } = stock([wanted, wanted]);
    inventory[1]!.location = 'workshop';

    const rows = offerableStock(customer.demand!, inventory, items);
    expect(rows).toHaveLength(1);
  });
});

// ===========================================================================
// PAZARLIK YÖNÜ — aynı makine, ters eşik
// ===========================================================================

describe('Pazarlık yönü: satışta eşik TAVANDIR', () => {
  function ctx(direction: 'shopBuys' | 'shopSells', ceiling = 20_000) {
    const customer = {
      ...spawnCustomer(SEED, 3, MARKET, makeStore(), CHARACTER).customer,
      reservationPrice: 20_000,
      trust: 50,
      urgency: 50,
      suspicion: 0,
    };
    return {
      customer,
      direction,
      reputation: 42,
      buyCeiling: 0,
      purchaseCeiling: ceiling,
      knowledge: [],
    };
  }

  it('satışta DÜŞÜK fiyat kabul edilir, yüksek fiyat edilmez', () => {
    const c = ctx('shopSells');
    const threshold = effectiveReservation(c, createSession('l', 'i'));

    const ucuz = applyMove(createSession('l', 'i'), c, {
      kind: 'offer',
      amount: Math.round(threshold * 0.9),
      atRound: 0,
    });
    const pahali = applyMove(createSession('l', 'i'), c, {
      kind: 'offer',
      amount: Math.round(threshold * 1.4),
      atRound: 0,
    });

    expect(ucuz.session.state).toBe('ACCEPTED');
    expect(pahali.session.state).not.toBe('ACCEPTED');
  });

  it('alışta YÜKSEK teklif kabul edilir — yön tersine dönmemiştir', () => {
    const c = ctx('shopBuys');
    const threshold = effectiveReservation(c, createSession('l', 'i'));

    const yuksek = applyMove(createSession('l', 'i'), c, {
      kind: 'offer',
      amount: Math.round(threshold * 1.1),
      atRound: 0,
    });
    const dusuk = applyMove(createSession('l', 'i'), c, {
      kind: 'offer',
      amount: Math.round(threshold * 0.7),
      atRound: 0,
    });

    expect(yuksek.session.state).toBe('ACCEPTED');
    expect(dusuk.session.state).not.toBe('ACCEPTED');
  });

  it('satışta karşı teklif müşterinin tavanını AŞMAZ', () => {
    const c = ctx('shopSells');
    const threshold = effectiveReservation(c, createSession('l', 'i'));
    const { session, response } = applyMove(createSession('l', 'i'), c, {
      kind: 'offer',
      amount: Math.round(threshold * 1.5),
      atRound: 0,
    });
    if (response.counterOffer !== null) {
      expect(response.counterOffer).toBeLessThanOrEqual(threshold);
      expect(response.counterOffer).toBeGreaterThan(0);
    }
    expect(session.state).not.toBe('ACCEPTED');
  });

  it('GDD 34.3 — satış yönünde de aynı teklif spam\'i yeni sonuç üretmez', () => {
    const c = ctx('shopSells');
    const threshold = effectiveReservation(c, createSession('l', 'i'));
    const ask = Math.round(threshold * 1.5);

    const first = applyMove(createSession('l', 'i'), c, { kind: 'offer', amount: ask, atRound: 0 });
    const second = applyMove(first.session, c, { kind: 'offer', amount: ask, atRound: 1 });

    expect(second.response.wasRepeatOffer).toBe(true);
    expect(second.response.counterOffer).toBe(first.response.counterOffer);
    expect(second.session.state).not.toBe('ACCEPTED');
  });
});
