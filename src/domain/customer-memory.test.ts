/**
 * MIHENKAYNAK — Müşteri hafızası ve kişisel güven testleri
 * Kaynak: GDD 10 (10.1–10.4), GDD 30.2 MVP "tekrar müşteri ve kişisel güven".
 */

import { describe, expect, it } from 'vitest';

import { MEMORY, TRUST } from './balance';
import { createMarketForDay } from './market';
import { dayCharacter } from './intent';
import { spawnCustomer } from './customer-spawn';
import {
  applyMemory,
  createRecord,
  loyaltyEffects,
  pickReturningCustomer,
  recordVisit,
  registrySummary,
  reputationDelta,
  returnWeight,
  trustFromHistory,
  type CustomerRecord,
  type CustomerRegistry,
} from './customer-memory';
import type { Customer, StoreState, VisitRecord } from './types';

const SEED = 20260827;
const MARKET = createMarketForDay(SEED, 1);
const CHARACTER = dayCharacter(SEED, 1, MARKET);

function makeStore(): StoreState {
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
  };
}

function customer(over: Partial<Customer> = {}): Customer {
  return {
    id: 'c1',
    displayName: 'Test Müşteri',
    archetype: 'investor',
    intent: 'sell',
    patienceMax: 60,
    knowledge: 50,
    urgency: 50,
    priceSensitivity: 50,
    status: 50,
    budget: 100_000,
    reservationPrice: 40_000,
    purchaseCeilingRatio: 1.2,
    demand: null,
    patience: 60,
    trust: 50,
    suspicion: 20,
    visitHistory: [],
    preferences: [],
    referralSource: null,
    lineIds: [],
    ...over,
  };
}

function visit(over: Partial<VisitRecord> = {}): VisitRecord {
  return { day: 1, dealId: null, outcome: 'accepted', trustDelta: 0, note: '', ...over };
}

function record(over: Partial<CustomerRecord> = {}): CustomerRecord {
  return { ...createRecord(customer(), 1, 0), ...over };
}

/** Ardışık ziyaretler uygular. */
function withVisits(base: CustomerRecord, visits: VisitRecord[]): CustomerRecord {
  return visits.reduce((r, v, i) => recordVisit(r, { ...v, dealId: `d${i}` }), base);
}

// ===========================================================================
// GDD 10 — GÜVEN EKONOMİK BİR VARLIKTIR (KALICIDIR)
// ===========================================================================

describe('GDD 10 — Güven işlem bitince buharlaşmaz', () => {
  it('ziyaret deftere yazılır ve güven geçmişten türer', () => {
    const r = withVisits(record(), [visit({ trustDelta: 10 }), visit({ trustDelta: 6, day: 3 })]);

    expect(r.visits).toBe(2);
    expect(r.history).toHaveLength(2);
    expect(r.trust).toBeGreaterThan(MEMORY.baseTrust);
    expect(r.lastVisitDay).toBe(3);
  });

  it('aynı işlem iki kez kaydedilmez', () => {
    const once = recordVisit(record(), visit({ dealId: 'd1', trustDelta: 10 }));
    const twice = recordVisit(once, visit({ dealId: 'd1', trustDelta: 10 }));
    expect(twice.visits).toBe(1);
    expect(twice.trust).toBe(once.trust);
  });

  it('kötü ziyaret güveni düşürür', () => {
    const iyi = withVisits(record(), [visit({ trustDelta: 12 })]);
    const kotu = withVisits(record(), [visit({ trustDelta: -12, outcome: 'walkedOut' })]);
    expect(kotu.trust).toBeLessThan(MEMORY.baseTrust);
    expect(kotu.trust).toBeLessThan(iyi.trust);
  });

  it('geçmiş sınırlıdır — defter sonsuza kadar büyümez', () => {
    const many = Array.from({ length: MEMORY.maxHistory + 8 }, (_, i) =>
      visit({ day: i + 1, trustDelta: 3 }),
    );
    expect(withVisits(record(), many).history.length).toBe(MEMORY.maxHistory);
  });

  it('güven her koşulda 0–100 arasında kalır', () => {
    const cok = Array.from({ length: 30 }, (_, i) => visit({ day: i + 1, trustDelta: 40 }));
    const az = Array.from({ length: 30 }, (_, i) =>
      visit({ day: i + 1, trustDelta: -40, outcome: 'walkedOut' }),
    );
    expect(withVisits(record(), cok).trust).toBeLessThanOrEqual(100);
    expect(withVisits(record(), az).trust).toBeGreaterThanOrEqual(0);
  });
});

// ===========================================================================
// GDD 10.4 — GÜVEN EXPLOIT KORUMASI
// ===========================================================================

describe('GDD 10.4 — Güven satın alınamaz', () => {
  it('tek bir büyük jest, davranış geçmişinin yerini TUTMAZ', () => {
    // Tek seferlik büyük kazanç vs aynı toplamı taşıyan istikrarlı geçmiş.
    const tekJest = trustFromHistory(50, [visit({ trustDelta: 40 })]);
    const istikrar = trustFromHistory(
      50,
      Array.from({ length: 5 }, (_, i) => visit({ day: i + 1, trustDelta: 10 })),
    );
    // İstikrarlı geçmiş, tek jestin toplamının yarısıyla bile ona yaklaşır
    // veya geçer; jest tek başına VIP yapmaz.
    expect(istikrar).toBeGreaterThan(tekJest);
  });

  it('küçük düşük marjlı işlem SPAM\'i hızlı VIP üretmez', () => {
    // Aynı sayıda ziyaret: biri küçük kazanç spam'i, öteki tek anlamlı olay.
    const spam = trustFromHistory(
      50,
      Array.from({ length: 8 }, (_, i) => visit({ day: i + 1, trustDelta: MEMORY.smallGainThreshold - 1 })),
    );
    const duz = 50 + 8 * (MEMORY.smallGainThreshold - 1);
    // Azalan getiri olmasaydı toplam düz toplama eşit olurdu.
    expect(spam).toBeLessThan(duz);
    expect(spam).toBeLessThan(100);
  });

  it('CİDDİ olaylar sıradan iyi fiyattan daha ağır basar', () => {
    const iyiFiyat = trustFromHistory(50, [visit({ trustDelta: 10, outcome: 'accepted' })]);
    const cikipGitme = trustFromHistory(50, [visit({ trustDelta: -10, outcome: 'walkedOut' })]);
    // Aynı mutlak delta, çıkıp gitmede daha derin iz bırakır.
    expect(50 - cikipGitme).toBeGreaterThan(iyiFiyat - 50);
  });

  it('yakın geçmiş uzak geçmişten ağır basar', () => {
    // Aynı iki olay, ters sırada: son olay sonucu belirler.
    const sonuIyi = trustFromHistory(50, [visit({ trustDelta: -10 }), visit({ day: 2, trustDelta: 10 })]);
    const sonuKotu = trustFromHistory(50, [visit({ trustDelta: 10 }), visit({ day: 2, trustDelta: -10 })]);
    expect(sonuIyi).toBeGreaterThan(sonuKotu);
  });

  it('referans YÜKSEK GÜVEN ve YETERLİ ZİYARET ister — ikisi birden', () => {
    const guvenVarZiyaretYok = record({ trust: 90, visits: 1 });
    const ziyaretVarGuvenYok = record({ trust: 55, visits: 9 });
    const ikisiDe = record({ trust: 90, visits: 9 });

    expect(loyaltyEffects(guvenVarZiyaretYok).referralChance).toBe(0);
    expect(loyaltyEffects(ziyaretVarGuvenYok).referralChance).toBe(0);
    expect(loyaltyEffects(ikisiDe).referralChance).toBeGreaterThan(0);
  });

  it('tek işlem semt itibarını uçurmaz', () => {
    expect(Math.abs(reputationDelta(20))).toBeLessThan(20 * 0.5);
    expect(reputationDelta(20)).toBe(Math.round(20 * TRUST.reputationTransfer));
  });
});

// ===========================================================================
// GDD 10.3 — SADAKAT EKONOMİK SONUÇ ÜRETİR
// ===========================================================================

describe('GDD 10.3 — Sadık müşteri yalnız daha sık gelmez', () => {
  it('sadık müşteri DAHA YÜKSEK SEPET ve DAHA DÜŞÜK ŞÜPHE getirir', () => {
    const sadik = loyaltyEffects(record({ trust: 88, visits: 6 }));
    const yeni = loyaltyEffects(null);

    expect(sadik.basketMultiplier).toBeGreaterThan(yeni.basketMultiplier);
    expect(sadik.suspicionRelief).toBeGreaterThan(0);
    expect(sadik.label).toMatch(/sadık/i);
  });

  it('küsmüş müşteri daha DÜŞÜK sepetle gelir — sertlik geri döner', () => {
    const kusmus = loyaltyEffects(record({ trust: 18, visits: 4 }));
    expect(kusmus.basketMultiplier).toBeLessThan(1);
    expect(kusmus.suspicionRelief).toBe(0);
    expect(kusmus.label).toMatch(/küsmüş/i);
  });

  it('sadakat ziyaret sayısını DA ister; tek büyük işlem yetmez', () => {
    const tekIslem = loyaltyEffects(record({ trust: 95, visits: 1 }));
    const duzenli = loyaltyEffects(record({ trust: 95, visits: MEMORY.loyalVisits }));
    expect(duzenli.basketMultiplier).toBeGreaterThan(tekIslem.basketMultiplier);
  });

  it('hafıza müşteriye giydirilince sepet ve şüphe gerçekten değişir', () => {
    const sadik = record({ trust: 88, visits: 6 });
    const base = customer({ budget: 100_000, suspicion: 30 });
    const withMem = applyMemory(base, sadik);

    expect(withMem.trust).toBe(88);
    expect(withMem.budget).toBeGreaterThan(base.budget);
    expect(withMem.suspicion).toBeLessThan(base.suspicion);
    expect(withMem.id).toBe(sadik.id);
  });
});

// ===========================================================================
// TEKRAR ZİYARET (MVP 30.2)
// ===========================================================================

describe('MVP 30.2 — Tekrar müşteri', () => {
  it('güvenilen müşteri daha sık döner', () => {
    const sadik = returnWeight(record({ trust: 90, lastVisitDay: 1 }), 5);
    const kusmus = returnWeight(record({ trust: 15, lastVisitDay: 1 }), 5);
    expect(sadik).toBeGreaterThan(kusmus);
  });

  it('aynı gün içinde geri dönmez', () => {
    expect(returnWeight(record({ lastVisitDay: 7 }), 7)).toBe(0);
  });

  it('çok uzun süre görülmeyen müşteri unutulmaya yüz tutar', () => {
    const yakin = returnWeight(record({ trust: 70, lastVisitDay: 10 }), 13);
    const uzak = returnWeight(record({ trust: 70, lastVisitDay: 10 }), 10 + MEMORY.forgetAfterDays);
    expect(uzak).toBeLessThan(yakin);
    expect(uzak).toBeGreaterThanOrEqual(0);
  });

  it('boş defterde tekrar müşteri seçilmez', () => {
    expect(pickReturningCustomer(SEED, 1, {}, 5)).toBeNull();
  });

  it('seçim DETERMİNİSTİKtir — reload aynı müşteriyi verir', () => {
    const registry: CustomerRegistry = {
      a: record({ id: 'a', trust: 80, visits: 3, lastVisitDay: 1 }),
      b: record({ id: 'b', trust: 75, visits: 2, lastVisitDay: 1 }),
    };
    for (let i = 0; i < 30; i += 1) {
      expect(pickReturningCustomer(SEED, i, registry, 6)?.id).toBe(
        pickReturningCustomer(SEED, i, registry, 6)?.id,
      );
    }
  });

  it('yeni müşteri akışı kurumaz — dönüş payı tavanlıdır', () => {
    // Kalabalık ve çok sadık bir defter kur.
    const registry: CustomerRegistry = {};
    for (let i = 0; i < 40; i += 1) {
      registry[`c${i}`] = record({ id: `c${i}`, trust: 100, visits: 9, lastVisitDay: 1 });
    }
    let returning = 0;
    for (let i = 0; i < 1_000; i += 1) {
      if (pickReturningCustomer(SEED, i, registry, 10)) returning += 1;
    }
    const share = returning / 1_000;
    expect(share).toBeLessThanOrEqual(MEMORY.maxReturnShare + 0.05);
    expect(share).toBeGreaterThan(0.2);
  });

  it('spawn tanıdık müşteriyi kimliğiyle geri getirir', () => {
    const store = makeStore();
    // Müşteri aynı gün geri dönmez; birkaç gün sonrasına bak.
    const laterDay = createMarketForDay(SEED, 6);
    const registry: CustomerRegistry = {
      tanidik: record({ id: 'tanidik', displayName: 'Tanıdık Bey', trust: 85, visits: 4, lastVisitDay: 1 }),
    };

    let found = false;
    for (let i = 0; i < 400 && !found; i += 1) {
      const spawned = spawnCustomer(SEED, i, laterDay, store, CHARACTER, registry);
      if (spawned.returningRecord) {
        expect(spawned.customer.id).toBe('tanidik');
        expect(spawned.customer.displayName).toBe('Tanıdık Bey');
        expect(spawned.customer.trust).toBe(85);
        found = true;
      }
    }
    expect(found).toBe(true);
  });

  it('boş defterle spawn eskisi gibi çalışır — herkes yabancı', () => {
    const spawned = spawnCustomer(SEED, 5, MARKET, makeStore(), CHARACTER, {});
    expect(spawned.returningRecord).toBeNull();
    expect(spawned.customer.visitHistory).toEqual([]);
  });
});

describe('Defter özeti', () => {
  it('tanıdık, sadık ve küsmüş sayıları ayrı ölçülür', () => {
    const registry: CustomerRegistry = {
      a: record({ id: 'a', trust: 90, visits: 4, lifetimeVolume: 50_000 }),
      b: record({ id: 'b', trust: 20, visits: 2, lifetimeVolume: 10_000 }),
      c: record({ id: 'c', trust: 55, visits: 1, lifetimeVolume: 5_000 }),
    };
    const sum = registrySummary(registry);
    expect(sum.known).toBe(3);
    expect(sum.loyal).toBe(1);
    expect(sum.upset).toBe(1);
    expect(sum.lifetimeVolume).toBe(65_000);
  });
});
