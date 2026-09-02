/**
 * Ekspertiz / danışma akışı kabul testleri.
 * Kaynak: GDD 23.23 beşinci akış, 17.1, 6.6, 22.1, 34.3, 21.1.
 */

import { describe, expect, it } from 'vitest';

import { APPRAISAL, START } from './balance';
import {
  STANCES,
  appraisalTransaction,
  feeBounds,
  feeCeiling,
  getStance,
  reportedRange,
  resolveAppraisal,
  suggestedFee,
} from './appraisal';
import { spawnCustomer } from './customer-spawn';
import { dayCharacter } from './intent';
import { spawnItem } from './item-spawn';
import { createMarketForDay } from './market';
import { applyTransaction, createLedger } from './settlement';
import { estimateBand, initialKnowledge, trueValue } from './valuation';
import type { AppraisalStance, Customer, ItemInstance, StoreState } from './types';

const SEED = 20260828;
const MARKET = createMarketForDay(SEED, 1);

function makeStore(): StoreState {
  return {
    name: 'Test',
    cash: START.cash,
    reputation: START.reputation,
    level: 5,
    xp: 0,
    xpToNext: 900,
    storeTier: 2,
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

/** Ölçüm yapılmamış (en geniş) band. */
function rawBand(item: ItemInstance) {
  return estimateBand(item, MARKET, initialKnowledge(item));
}

/** Gerçeği tam bilen bir oyuncunun bandı — dar ve doğru. */
function certainBand(item: ItemInstance) {
  const knowledge = initialKnowledge(item).map((k) => ({
    ...k,
    certainty: 1,
    status: 'verified' as const,
  }));
  return estimateBand(item, MARKET, knowledge);
}

function customerFor(index: number): Customer {
  const character = dayCharacter(SEED, 1, MARKET);
  return spawnCustomer(SEED, index, MARKET, makeStore(), character).customer;
}

// ===========================================================================
// Rapor duruşu ve raporlanan band
// ===========================================================================

describe('Rapor duruşu bandı daraltır ama KAYDIRMAZ', () => {
  const item = spawnItem(SEED, 10, 'ring_18k');
  const band = rawBand(item);

  it('her duruşta bandın merkezi aynı kalır', () => {
    for (const profile of STANCES) {
      const r = reportedRange(band, profile.id);
      const mid = (r.min + r.max) / 2;
      // Merkez kaymaz: oyuncu bandını kaydıramaz, yalnız iddia derecesini seçer.
      expect(Math.abs(mid - band.mid)).toBeLessThanOrEqual(1);
    }
  });

  it('kesin duruş temkinliden dar, temkinli ölçülüden geniştir', () => {
    const width = (id: AppraisalStance) => {
      const r = reportedRange(band, id);
      return r.max - r.min;
    };
    expect(width('assertive')).toBeLessThan(width('measured'));
    expect(width('measured')).toBeLessThan(width('cautious'));
  });

  it('band negatife düşmez', () => {
    const cheap = spawnItem(SEED, 11, 'silver_chain');
    for (const profile of STANCES) {
      expect(reportedRange(rawBand(cheap), profile.id).min).toBeGreaterThanOrEqual(0);
    }
  });
});

// ===========================================================================
// GDD 6.6 — ücret önerisi gizli gerçeği sızdırmaz
// ===========================================================================

describe('GDD 6.6 — ücret oyuncunun kendi bandından türer', () => {
  it('aynı ürünün ölçülmemiş ve ölçülmüş hâli farklı ücret önerir', () => {
    // Yanlış beyanı olan bir ürün: gerçek değeri bandın merkezinden uzaktır.
    const item = spawnItem(SEED, 12, 'plated_bangle');
    const blind = suggestedFee(rawBand(item), 'measured');
    const known = suggestedFee(certainBand(item), 'measured');

    // Öneri gerçek değere değil, BİLİNENE bağlıdır. İkisi eşit çıksaydı
    // ücret rakamı test yapmadan gerçeği ele veriyor olurdu.
    expect(blind).not.toBe(known);
  });

  it('ücret önerisi taban ücretin altına inmez', () => {
    const tiny = spawnItem(SEED, 13, 'silver_ring');
    for (const profile of STANCES) {
      expect(suggestedFee(rawBand(tiny), profile.id)).toBeGreaterThanOrEqual(APPRAISAL.minFee);
    }
  });

  it('kesin duruş temkinliden pahalıdır', () => {
    const item = spawnItem(SEED, 14, 'stone_ring_premium');
    const band = rawBand(item);
    expect(suggestedFee(band, 'assertive')).toBeGreaterThan(suggestedFee(band, 'cautious'));
  });

  it('ücret üst sınırı ölü bölge değildir — cömert müşteride ödenir', () => {
    let payable = 0;
    for (let i = 0; i < 60; i++) {
      const item = spawnItem(SEED, 900 + i, 'ring_18k');
      const customer = customerFor(i);
      const band = rawBand(item);
      const max = feeBounds(band, 'assertive').max;
      if (max <= feeCeiling(item, MARKET, customer, 'assertive')) payable++;
    }
    // Ne herkes öder (o zaman risk yok) ne de hiç kimse (o zaman kontrolün
    // üst yarısı ölü bir bölge olurdu).
    expect(payable).toBeGreaterThan(0);
    expect(payable).toBeLessThan(60);
  });

  it('oyuncu ücreti sınırların dışına taşıyamaz', () => {
    const item = spawnItem(SEED, 15, 'ring_14k');
    const band = rawBand(item);
    const bounds = feeBounds(band, 'measured');
    expect(bounds.min).toBe(APPRAISAL.minFee);
    expect(bounds.max).toBeGreaterThan(suggestedFee(band, 'measured'));
  });
});

// ===========================================================================
// GDD 34.3 — belirlenimli sonuç
// ===========================================================================

describe('GDD 34.3 — sonuç belirlenimlidir', () => {
  it('aynı rapor + aynı ücret her zaman aynı sonucu verir', () => {
    const item = spawnItem(SEED, 20, 'necklace_18k');
    const customer = customerFor(3);
    const band = rawBand(item);
    const input = {
      item,
      market: MARKET,
      customer,
      band,
      stance: 'measured' as const,
      fee: suggestedFee(band, 'measured'),
      testsUsed: 2,
    };
    expect(resolveAppraisal(input)).toEqual(resolveAppraisal(input));
  });

  it('reddedilen ücreti tekrar denemek yeni bir zar atmaz', () => {
    const item = spawnItem(SEED, 21, 'bracelet_22k_burma');
    const customer = customerFor(4);
    const band = rawBand(item);
    const greedy = feeBounds(band, 'measured').max;

    const first = resolveAppraisal({
      item, market: MARKET, customer, band, stance: 'measured', fee: greedy, testsUsed: 1,
    });
    const second = resolveAppraisal({
      item, market: MARKET, customer, band, stance: 'measured', fee: greedy, testsUsed: 1,
    });
    expect(second.paid).toBe(first.paid);
  });

  it('önerilen ücret normal müşteride kabul edilir', () => {
    let accepted = 0;
    let tried = 0;
    for (let i = 0; i < 40; i++) {
      const item = spawnItem(SEED, 100 + i, 'ring_14k');
      const customer = customerFor(i);
      const band = rawBand(item);
      const fee = suggestedFee(band, 'measured');
      tried++;
      if (fee <= feeCeiling(item, MARKET, customer, 'measured')) accepted++;
    }
    // Öneri bir tuzak değil: çoğu müşteride geçmelidir.
    expect(accepted / tried).toBeGreaterThan(0.7);
  });

  it('açgözlü ücret reddedilebilir — tavan gerçek bir sınırdır', () => {
    let refused = 0;
    for (let i = 0; i < 40; i++) {
      const item = spawnItem(SEED, 200 + i, 'ring_18k');
      const customer = customerFor(i);
      const band = rawBand(item);
      const fee = feeBounds(band, 'assertive').max;
      if (fee > feeCeiling(item, MARKET, customer, 'assertive')) refused++;
    }
    expect(refused).toBeGreaterThan(0);
  });
});

// ===========================================================================
// Doğruluk ve itibar
// ===========================================================================

describe('Rapor doğruluğu gerçeğe göre ölçülür', () => {
  it('gerçeği bilen dar rapor tutar ve itibar kazandırır', () => {
    const item = spawnItem(SEED, 30, 'ring_18k');
    const customer = customerFor(5);
    const band = certainBand(item);

    const v = resolveAppraisal({
      item, market: MARKET, customer, band, stance: 'assertive',
      fee: suggestedFee(band, 'assertive'), testsUsed: 4,
    });
    expect(v.accurate).toBe(true);
    expect(v.trustDelta).toBeGreaterThan(0);
    expect(v.actualValue).toBe(trueValue(item, MARKET));
  });

  it('temkinli rapor kesin rapordan daha az yanılır', () => {
    let cautiousMiss = 0;
    let assertiveMiss = 0;

    for (let i = 0; i < 60; i++) {
      const item = spawnItem(SEED, 300 + i, 'plated_bangle');
      const customer = customerFor(i % 20);
      const band = rawBand(item);
      const base = { item, market: MARKET, customer, band, testsUsed: 0 };
      if (!resolveAppraisal({ ...base, stance: 'cautious', fee: APPRAISAL.minFee }).accurate) {
        cautiousMiss++;
      }
      if (!resolveAppraisal({ ...base, stance: 'assertive', fee: APPRAISAL.minFee }).accurate) {
        assertiveMiss++;
      }
    }
    expect(cautiousMiss).toBeLessThanOrEqual(assertiveMiss);
  });

  it('ÖLÇMEK ASLA ZARARA UĞRATMAZ — tam ölçülmüş rapor hiçbir duruşta ıskalamaz', () => {
    // Bu, akışın çekirdek sözü: bilgi satın almak (GDD 7) sonucu iyileştirir.
    // Band tam ölçümde sıfıra çöktüğü için raporun bir alt genişliği vardır
    // (APPRAISAL.minReportHalfWidth); olmasaydı 1 ₺'lik yuvarlama farkı
    // kusursuz ekspertizi "yanlış" sayar ve ölçmek cezalandırılırdı.
    for (const id of ['stone_ring_entry', 'ring_18k', 'plated_bangle', 'necklace_14k']) {
      for (let i = 0; i < 30; i++) {
        const item = spawnItem(SEED, 700 + i, id);
        const customer = customerFor(i % 20);
        const band = certainBand(item);
        for (const profile of STANCES) {
          const v = resolveAppraisal({
            item, market: MARKET, customer, band, stance: profile.id,
            fee: APPRAISAL.minFee, testsUsed: 4,
          });
          expect(v.accurate, `${id}/${profile.id}`).toBe(true);
        }
      }
    }
  });

  it('ölçmeden kesin konuşmak gerçekten ıskalar', () => {
    let missed = 0;
    for (let i = 0; i < 40; i++) {
      const item = spawnItem(SEED, 800 + i, 'ring_18k');
      const customer = customerFor(i % 20);
      const v = resolveAppraisal({
        item, market: MARKET, customer, band: rawBand(item), stance: 'assertive',
        fee: APPRAISAL.minFee, testsUsed: 0,
      });
      if (!v.accurate) missed++;
    }
    // Riskin gerçek olduğunu görelim — "kesin" duruşu bedava olsaydı karar
    // diye bir şey kalmazdı.
    expect(missed).toBeGreaterThan(10);
  });

  it('emek itibarı besler: test yapmadan tutturmak daha az kazandırır', () => {
    const item = spawnItem(SEED, 31, 'necklace_14k');
    const customer = customerFor(6);
    const band = certainBand(item);
    const base = {
      item, market: MARKET, customer, band, stance: 'measured' as const,
      fee: suggestedFee(band, 'measured'),
    };
    const lazy = resolveAppraisal({ ...base, testsUsed: 0 });
    const diligent = resolveAppraisal({ ...base, testsUsed: 4 });

    expect(lazy.accurate).toBe(true);
    expect(diligent.accurate).toBe(true);
    expect(diligent.trustDelta).toBeGreaterThan(lazy.trustDelta);
  });

  it('GDD 10.4 — tek ekspertiz itibarı uçurmaz', () => {
    for (let i = 0; i < 60; i++) {
      const item = spawnItem(SEED, 400 + i, 'stone_ring_entry');
      const customer = customerFor(i % 20);
      const band = rawBand(item);
      for (const profile of STANCES) {
        const v = resolveAppraisal({
          item, market: MARKET, customer, band, stance: profile.id,
          fee: suggestedFee(band, profile.id), testsUsed: 2,
        });
        expect(Math.abs(v.trustDelta)).toBeLessThanOrEqual(APPRAISAL.maxTrustSwing);
      }
    }
  });

  it('kesin konuşup yanılmak, ölçülü konuşup yanılmaktan daha pahalıdır', () => {
    // Bandı gerçekten uzağa kaydırılmış yapay bir ölçüm: iki duruş da ıskalar.
    const item = spawnItem(SEED, 32, 'ring_14k');
    const customer = customerFor(7);
    const truth = trueValue(item, MARKET);
    const wrong = { ...certainBand(item), min: truth * 3, mid: truth * 3.2, max: truth * 3.4 };

    const measured = resolveAppraisal({
      item, market: MARKET, customer, band: wrong, stance: 'measured',
      fee: APPRAISAL.minFee, testsUsed: 2,
    });
    const assertive = resolveAppraisal({
      item, market: MARKET, customer, band: wrong, stance: 'assertive',
      fee: APPRAISAL.minFee, testsUsed: 2,
    });

    expect(measured.accurate).toBe(false);
    expect(assertive.accurate).toBe(false);
    expect(assertive.trustDelta).toBeLessThan(measured.trustDelta);
  });
});

// ===========================================================================
// GDD 22.1 / 34.4 — settlement
// ===========================================================================

describe('GDD 22.1 — ekspertiz tek settlement kapısından geçer', () => {
  function verdictFor(fee: number) {
    const item = spawnItem(SEED, 40, 'ring_18k');
    const customer = customerFor(8);
    const band = certainBand(item);
    return resolveAppraisal({
      item, market: MARKET, customer, band, stance: 'measured', fee, testsUsed: 3,
    });
  }

  it('ürün stoğa GİRMEZ — müşterinin malı dükkânın olmaz', () => {
    const item = spawnItem(SEED, 40, 'ring_18k');
    const band = certainBand(item);
    const verdict = verdictFor(suggestedFee(band, 'measured'));
    const tx = appraisalTransaction({ dealId: 'd1', day: 1, verdict, xpDelta: 10 });

    expect(tx.itemsIn).toEqual([]);
    expect(tx.itemsOut).toEqual([]);

    const before = { store: makeStore(), inventory: [], items: { [item.id]: item }, ledger: createLedger() };
    const after = applyTransaction(before, tx);
    expect(after.applied).toBe(true);
    expect(after.state.inventory).toEqual([]);
  });

  it('ödenen ücret kadar nakit girer', () => {
    const item = spawnItem(SEED, 40, 'ring_18k');
    const band = certainBand(item);
    const fee = suggestedFee(band, 'measured');
    const verdict = verdictFor(fee);
    expect(verdict.paid).toBe(true);

    const tx = appraisalTransaction({ dealId: 'd2', day: 1, verdict, xpDelta: 0 });
    const before = { store: makeStore(), inventory: [], items: {}, ledger: createLedger() };
    const after = applyTransaction(before, tx);
    expect(after.state.store.cash).toBe(before.store.cash + verdict.fee);
  });

  it('reddedilen ücrette nakit hareket etmez', () => {
    const item = spawnItem(SEED, 41, 'ring_18k');
    const customer = customerFor(9);
    const band = certainBand(item);
    const verdict = resolveAppraisal({
      item, market: MARKET, customer, band, stance: 'assertive',
      fee: feeBounds(band, 'assertive').max * 10, testsUsed: 3,
    });
    expect(verdict.paid).toBe(false);
    expect(verdict.fee).toBe(0);

    const tx = appraisalTransaction({ dealId: 'd3', day: 1, verdict, xpDelta: 0 });
    const before = { store: makeStore(), inventory: [], items: {}, ledger: createLedger() };
    const after = applyTransaction(before, tx);
    expect(after.state.store.cash).toBe(before.store.cash);
  });

  it('GDD 34.4 — aynı işlem iki kez uygulanmaz', () => {
    const item = spawnItem(SEED, 42, 'ring_18k');
    const band = certainBand(item);
    const verdict = verdictFor(suggestedFee(band, 'measured'));
    const tx = appraisalTransaction({ dealId: 'd4', day: 1, verdict, xpDelta: 0 });

    const before = { store: makeStore(), inventory: [], items: {}, ledger: createLedger() };
    const first = applyTransaction(before, tx);
    const second = applyTransaction(first.state, tx);

    expect(second.applied).toBe(false);
    expect(second.state.store.cash).toBe(first.state.store.cash);
  });
});

// ===========================================================================
// Müşteri havuzu
// ===========================================================================

describe('Ekspertiz müşterisi', () => {
  it('elinde ürünle gelir ve o ürün standart sarrafiye değildir', () => {
    let seen = 0;
    const store = makeStore();

    for (let day = 1; day <= 20; day++) {
      const market = createMarketForDay(SEED, day);
      const character = dayCharacter(SEED, day, market);
      for (let i = 0; i < 50; i++) {
        const c = spawnCustomer(SEED + day, i, market, store, character);
        if (c.customer.intent !== 'appraisal') continue;
        seen++;
        expect(c.items.length).toBeGreaterThan(0);
        for (const item of c.items) {
          // Gram altının bandı sıfır genişliktedir; ekspertizi bedava paradır.
          expect(item.family, item.templateId).not.toBe('bullion');
        }
      }
    }
    expect(seen).toBeGreaterThan(10); // v5 surprise pool is 20%, not legacy 24%.
  });
});

describe('Duruş tablosu bütünlüğü', () => {
  it('her duruş kimliği çözülebilir', () => {
    for (const profile of STANCES) {
      expect(getStance(profile.id).id).toBe(profile.id);
    }
    expect(() => getStance('yok' as AppraisalStance)).toThrow();
  });
});
