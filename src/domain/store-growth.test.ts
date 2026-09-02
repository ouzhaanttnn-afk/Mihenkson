/**
 * MIHENKAYNAK — Mağaza büyümesi kabul testleri
 * Kaynak: GDD 19.1–19.3, GDD 18.1, GDD 22.1, GDD 30.2 MVP "2 mağaza kademesi".
 */

import { describe, expect, it } from 'vitest';

import { STORE_TIERS, nextTierDef, tierDef } from '@data/store-tiers';
import {
  applyTierGrants,
  evaluateUpgrade,
  growthSnapshot,
  type GrowthSnapshot,
} from './store-growth';
import { applyTransaction, createLedger, type EconomyState } from './settlement';
import type { DealRecord, StoreState } from './types';

function makeStore(over: Partial<StoreState> = {}): StoreState {
  const t1 = tierDef(1);
  return {
    name: 'Test',
    cash: 100_000,
    reputation: 50,
    level: 1,
    xp: 0,
    xpToNext: 580,
    storeTier: 1,
    displaySlots: t1.grants.displaySlots,
    backStockSlots: t1.grants.backStockSlots,
    workshopCapacity: t1.grants.workshopCapacity,
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
    dailyOverhead: t1.grants.dailyOverhead,
    ...over,
  };
}

/** Kademe 2'nin tüm kapılarını açan fotoğraf. */
function readySnapshot(over: Partial<GrowthSnapshot> = {}): GrowthSnapshot {
  const r = tierDef(2).requires!;
  return {
    netWorth: r.netWorth,
    reputation: r.reputation,
    level: r.level,
    supplierTrust: r.supplierTrust,
    closedDeals: r.closedDeals,
    knownCustomers: r.knownCustomers,
    cash: tierDef(2).investment,
    ...over,
  };
}

// ===========================================================================
// GDD 19.2 — YALNIZ LEVEL YETMEZ
// ===========================================================================

describe('GDD 19.2 — Kademe yalnız level sayısına bağlanmaz', () => {
  it('tüm kapılar açıkken yükseltmeye hazır', () => {
    const e = evaluateUpgrade(makeStore(), readySnapshot());
    expect(e.ready).toBe(true);
    expect(e.blockedReason).toBeNull();
    expect(e.next?.tier).toBe(2);
  });

  it('YALNIZ level yüksekse yükseltme AÇILMAZ', () => {
    // "XP kastım, mağaza büyüdü" senaryosu — GDD'nin açıkça reddettiği şey.
    const e = evaluateUpgrade(
      makeStore(),
      {
        netWorth: 0,
        reputation: 10,
        level: 99,
        supplierTrust: 10,
        closedDeals: 0,
        knownCustomers: 0,
        cash: 0,
      },
    );
    expect(e.ready).toBe(false);
    expect(e.gates.find((g) => g.key === 'level')?.met).toBe(true);
    expect(e.gates.filter((g) => !g.met).length).toBeGreaterThan(3);
  });

  it('her eksen ayrı bir kapıdır ve tek başına yeterli değildir', () => {
    const eksenler: (keyof GrowthSnapshot)[] = [
      'netWorth',
      'reputation',
      'level',
      'supplierTrust',
      'closedDeals',
      'knownCustomers',
      'cash',
    ];
    // Her eksen tek tek eksiltildiğinde yükseltme kapanmalı.
    for (const eksen of eksenler) {
      const e = evaluateUpgrade(makeStore(), readySnapshot({ [eksen]: 0 } as never));
      expect(e.ready).toBe(false);
    }
  });

  it('kapılar tek tek raporlanır — oyuncu neyin eksik olduğunu görür', () => {
    const e = evaluateUpgrade(makeStore(), readySnapshot({ reputation: 10 }));
    const rep = e.gates.find((g) => g.key === 'reputation')!;
    expect(rep.met).toBe(false);
    expect(rep.current).toBe(10);
    expect(rep.needed).toBe(tierDef(2).requires!.reputation);
    expect(e.blockedReason).toMatch(/itibar/i);
  });

  it('yatırım bedeli de bir kapıdır', () => {
    const e = evaluateUpgrade(makeStore(), readySnapshot({ cash: 0 }));
    expect(e.gates.find((g) => g.key === 'investment')?.met).toBe(false);
    expect(e.ready).toBe(false);
  });

  it('sermaye, itibar ve tedarik eksenlerinin hepsi listede', () => {
    const keys = evaluateUpgrade(makeStore(), readySnapshot()).gates.map((g) => g.key);
    expect(keys).toContain('netWorth');
    expect(keys).toContain('reputation');
    expect(keys).toContain('supplierTrust');
    expect(keys).toContain('closedDeals');
  });
});

// ===========================================================================
// GDD 19.1 — KADEME LADDER
// ===========================================================================

describe('GDD 19.1 — Kademe merdiveni', () => {
  it('beş kademe de GDD tablosundaki adlarla tanımlı', () => {
    expect(STORE_TIERS.map((t) => t.name)).toEqual([
      'Semt Kuyumcusu',
      'Cadde Mağazası',
      'AVM / Premium Butik',
      'Şehir Flagship',
      'Marka Ağı',
    ]);
  });

  it('her kademe bir öncekinden daha çok kapasite verir', () => {
    const inScope = STORE_TIERS.filter((t) => t.inScope);
    for (let i = 1; i < inScope.length; i += 1) {
      expect(inScope[i]!.grants.displaySlots).toBeGreaterThan(inScope[i - 1]!.grants.displaySlots);
      expect(inScope[i]!.grants.backStockSlots).toBeGreaterThan(
        inScope[i - 1]!.grants.backStockSlots,
      );
    }
  });

  it('büyüme BEDAVA değil: her kademe günlük gideri artırır', () => {
    const inScope = STORE_TIERS.filter((t) => t.inScope);
    for (let i = 1; i < inScope.length; i += 1) {
      expect(inScope[i]!.grants.dailyOverhead).toBeGreaterThan(
        inScope[i - 1]!.grants.dailyOverhead,
      );
      expect(inScope[i]!.investment).toBeGreaterThan(0);
    }
  });

  it('koşullar kademe yükseldikçe sertleşir', () => {
    const t2 = tierDef(2).requires!;
    const t3 = tierDef(3).requires!;
    const t4 = tierDef(4).requires!;
    for (const key of Object.keys(t2) as (keyof typeof t2)[]) {
      expect(t3[key]).toBeGreaterThan(t2[key]);
      expect(t4[key]).toBeGreaterThan(t3[key]);
    }
  });

  it('GDD 19.3 — Marka Ağı 1.0 kapsamı DIŞINDA, erişilemez', () => {
    expect(tierDef(5).inScope).toBe(false);
    expect(nextTierDef(4)).toBeNull();

    const e = evaluateUpgrade(makeStore({ storeTier: 4 }), readySnapshot());
    expect(e.next).toBeNull();
    expect(e.ready).toBe(false);
    expect(e.blockedReason).toMatch(/son kademe/i);
  });
});

// ===========================================================================
// YÜKSELTMENİN ETKİSİ
// ===========================================================================

describe('Yükseltme mağazayı gerçekten büyütür', () => {
  it('kapasiteler ve gider yeni kademenin değerlerine geçer', () => {
    const before = makeStore();
    const after = applyTierGrants(before, tierDef(2));

    expect(after.storeTier).toBe(2);
    expect(after.displaySlots).toBeGreaterThan(before.displaySlots);
    expect(after.backStockSlots).toBeGreaterThan(before.backStockSlots);
    expect(after.workshopCapacity).toBeGreaterThan(before.workshopCapacity);
    expect(after.dailyOverhead).toBeGreaterThan(before.dailyOverhead);
  });

  it('GDD 22.1 — yatırım tek settlement yolundan geçer ve iki kez uygulanmaz', () => {
    const state: EconomyState = {
      store: makeStore({ cash: 500_000 }),
      inventory: [],
      items: {},
      ledger: createLedger(),
    };
    const tx = {
      txId: 'upgrade_tier_2',
      dealId: 'upgrade_tier_2',
      day: 1,
      cashDelta: -tierDef(2).investment,
      itemsIn: [],
      itemsOut: [],
      trustDelta: 0,
      reputationDelta: 0,
      xpDelta: 0,
      label: 'yatırım',
    };

    const first = applyTransaction(state, tx);
    const second = applyTransaction(first.state, tx);

    expect(first.applied).toBe(true);
    expect(first.state.store.cash).toBe(500_000 - tierDef(2).investment);
    expect(second.applied).toBe(false);
    expect(second.state.store.cash).toBe(first.state.store.cash);
  });

  it('nakit yetmezse yatırım uygulanmaz — eksi kasa oluşmaz', () => {
    const state: EconomyState = {
      store: makeStore({ cash: 1_000 }),
      inventory: [],
      items: {},
      ledger: createLedger(),
    };
    const out = applyTransaction(state, {
      txId: 'upgrade_tier_2',
      dealId: 'upgrade_tier_2',
      day: 1,
      cashDelta: -tierDef(2).investment,
      itemsIn: [],
      itemsOut: [],
      trustDelta: 0,
      reputationDelta: 0,
      xpDelta: 0,
      label: 'yatırım',
    });
    expect(out.applied).toBe(false);
    expect(out.state.store.cash).toBe(1_000);
  });
});

describe('İşletme fotoğrafı doğru ölçülür', () => {
  it('yalnız KAPANMIŞ işlemler sayılır', () => {
    const deal = (price: number): DealRecord =>
      ({
        dealId: `d${price}`,
        price,
        costBasis: 0,
        side: 'buy',
        units: 1,
        grams: 0,
        channel: null,
        isBulk: false,
      }) as DealRecord;

    const economy: EconomyState = {
      store: makeStore(),
      inventory: [],
      items: {},
      ledger: { ...createLedger(), deals: [deal(1_000), deal(0), deal(5_000)] },
    };
    expect(growthSnapshot(economy, 3).closedDeals).toBe(2);
    expect(growthSnapshot(economy, 3).knownCustomers).toBe(3);
  });
});
