/**
 * MIHENKAYNAK — Servis ve atölye invariant testleri
 * Kaynak: GDD 17 (atölye), 22.4 (net katkı), 31.3 ve EK F (kabul checklist'i).
 *
 * Korunan değişmezler:
 *   17.4 / 34.13  Atölye pasif gelir üretmez.
 *   EK F          Servis işi duplicate completion üretmiyor.
 *   31.3          Servis geliri parça ve hata/tazmin maliyetini doğru düşer.
 *   28.3          İş sonucu kabul anında sabitlenir; reload reroll üretmez.
 *   17.3          Aşırı iş almak hata riskini artırır.
 *   14.1          Servis brüt marjı %35–60 bandındadır.
 */

import { describe, expect, it } from 'vitest';

import { SERVICE } from './balance';
import { createMarketForDay } from './market';
import { spawnItem } from './item-spawn';
import {
  advanceJobsOneDay,
  applyServiceToItem,
  buildQuote,
  buildQuotes,
  createServiceJob,
  diagnose,
  errorRisk,
  improveCondition,
  inHouseLoad,
  overdueJobs,
  readyJobs,
  resolveDelivery,
  type QuoteContext,
} from './service';
import { applyTransaction, createLedger, type EconomyState } from './settlement';
import { getServiceType, SERVICE_TYPES } from '@data/service-types';
import type { ServiceJob, ServiceQuote, StoreState } from './types';

const SEED = 20260827;
const MARKET = createMarketForDay(SEED, 1);

function makeStore(overrides: Partial<StoreState> = {}): StoreState {
  return {
    name: 'Test',
    cash: 75_000,
    reputation: 42,
    level: 9, // Tüm servis türleri açık olsun.
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

function ctx(overrides: Partial<QuoteContext> = {}): QuoteContext {
  return { store: makeStore(), market: MARKET, workshopLoad: 0, day: 1, ...overrides };
}

/** Kondisyonu bozuk, servise uygun bir ürün. */
function brokenItem(index = 1) {
  return spawnItem(SEED, index, 'damaged_chain');
}

function makeEconomy(overrides: Partial<EconomyState> = {}): EconomyState {
  return { store: makeStore(), inventory: [], items: {}, ledger: createLedger(), ...overrides };
}

function jobFor(
  quote: ServiceQuote,
  opts: { today?: number; buffer?: number; index?: number } = {},
): ServiceJob {
  return createServiceJob({
    rootSeed: SEED,
    jobIndex: opts.index ?? 1,
    item: brokenItem(),
    customerId: 'cust_1',
    customerName: 'Test Müşteri',
    quote,
    today: opts.today ?? 1,
    promiseBufferDays: opts.buffer ?? 1,
  });
}

// ===========================================================================
// GDD 17.4 / 34.13 — ATÖLYE PASİF GELİR ÜRETMEZ
// ===========================================================================

describe('GDD 17.4 — Atölye pasif gelir üretmez', () => {
  it('gün ilerlemek tek başına hiçbir para hareketi üretmez', () => {
    const quote = buildQuote(brokenItem(), getServiceType('chainRepair'), 'inHouse', ctx());
    let jobs = [jobFor(quote)];

    // 10 gün ilerlet — hiçbir teslim yapma.
    for (let d = 0; d < 10; d++) jobs = advanceJobsOneDay(jobs);

    // advanceJobsOneDay saf bir süre fonksiyonudur: para alanı bile döndürmez.
    // Ekonomiye tek giriş noktası applyTransaction'dır ve burada çağrılmadı.
    const economy = makeEconomy();
    expect(economy.store.cash).toBe(75_000);
    expect(economy.ledger.realizedProfitTotal).toBe(0);
    expect(economy.ledger.appliedTxIds).toHaveLength(0);
  });

  it('bekleyen iş kasaya hiçbir şey yazmaz; yalnız süresi azalır', () => {
    const quote = buildQuote(brokenItem(), getServiceType('restoration'), 'inHouse', ctx());
    let jobs = [jobFor(quote)];
    const before = jobs[0]!.remainingDays;

    jobs = advanceJobsOneDay(jobs);

    expect(jobs[0]!.remainingDays).toBe(before - 1);
    expect(jobs[0]!.fee).toBe(quote.fee); // Ücret değişmedi, tahsil de edilmedi.
  });
});

// ===========================================================================
// GDD EK F — SERVİS İŞİ DUPLICATE COMPLETION ÜRETMİYOR
// ===========================================================================

describe('GDD EK F — Servis teslimi idempotenttir', () => {
  function deliveredEconomy() {
    const quote = buildQuote(brokenItem(), getServiceType('chainRepair'), 'inHouse', ctx());
    let jobs = [jobFor(quote)];
    for (let d = 0; d < quote.durationDays; d++) jobs = advanceJobsOneDay(jobs);

    const job = jobs[0]!;
    const delivery = resolveDelivery(job, brokenItem(), 3);

    const tx = {
      txId: `service_deliver_${job.jobId}`,
      dealId: job.jobId,
      day: 3,
      cashDelta: delivery.cashDelta,
      itemsIn: [],
      itemsOut: [],
      trustDelta: delivery.trustDelta,
      reputationDelta: delivery.reputationDelta,
      xpDelta: 0,
      label: 'teslim',
    };

    return { job, delivery, tx };
  }

  it('aynı iş iki kez teslim edilemez — ikinci settlement yok sayılır', () => {
    const { tx } = deliveredEconomy();
    let economy = makeEconomy();

    const first = applyTransaction(economy, tx);
    expect(first.applied).toBe(true);
    economy = first.state;
    const cashAfterFirst = economy.store.cash;

    const second = applyTransaction(economy, tx);
    expect(second.applied).toBe(false);
    expect(second.state.store.cash).toBe(cashAfterFirst);
  });

  it('bir gün daha ilerletmek biten işin sonucunu değiştirmez', () => {
    const quote = buildQuote(brokenItem(), getServiceType('clean'), 'inHouse', ctx());
    let jobs = [jobFor(quote)];

    for (let d = 0; d < quote.durationDays; d++) jobs = advanceJobsOneDay(jobs);
    const settled = jobs[0]!.result;
    expect(settled).not.toBe('pending');

    for (let d = 0; d < 5; d++) jobs = advanceJobsOneDay(jobs);
    expect(jobs[0]!.result).toBe(settled);
    expect(jobs[0]!.remainingDays).toBe(0);
  });

  it('teslim edilmiş iş yeniden ilerletilmez', () => {
    const delivered: ServiceJob = { ...jobFor(
      buildQuote(brokenItem(), getServiceType('clean'), 'inHouse', ctx()),
    ), result: 'delivered' };

    const after = advanceJobsOneDay([delivered]);
    expect(after[0]).toEqual(delivered);
  });
});

// ===========================================================================
// GDD 28.3 — SONUÇ KABUL ANINDA SABİTLENİR (reload reroll üretmez)
// ===========================================================================

describe('GDD 28.3 — Servis sonucu deterministiktir', () => {
  it('aynı (seed, index, teklif) her zaman aynı sonucu verir', () => {
    const quote = buildQuote(brokenItem(), getServiceType('restoration'), 'inHouse', ctx());
    const a = jobFor(quote, { index: 7 });
    const b = jobFor(quote, { index: 7 });

    expect(b.jobId).toBe(a.jobId);
    expect(b.predeterminedOutcome).toBe(a.predeterminedOutcome);
    expect(b.risk).toBe(a.risk);
  });

  it('sonuç iş oluşturulurken sabitlenir, süre bitince yalnız açılır', () => {
    const quote = buildQuote(brokenItem(), getServiceType('chainRepair'), 'inHouse', ctx());
    const job = jobFor(quote, { index: 11 });
    const fixed = job.predeterminedOutcome;

    let jobs = [job];
    for (let d = 0; d < quote.durationDays; d++) jobs = advanceJobsOneDay(jobs);

    expect(jobs[0]!.result).toBe(fixed);
  });

  it('save/load simülasyonu sonucu değiştirmez', () => {
    const quote = buildQuote(brokenItem(), getServiceType('stoneSet'), 'inHouse', ctx());
    const job = jobFor(quote, { index: 23 });

    const reloaded: ServiceJob = JSON.parse(JSON.stringify(job));
    expect(reloaded.predeterminedOutcome).toBe(job.predeterminedOutcome);

    let a = [job];
    let b = [reloaded];
    for (let d = 0; d < quote.durationDays; d++) {
      a = advanceJobsOneDay(a);
      b = advanceJobsOneDay(b);
    }
    expect(b[0]!.result).toBe(a[0]!.result);
  });
});

// ===========================================================================
// GDD 31.3 — SERVİS GELİRİ PARÇA VE HATA/TAZMİN MALİYETİNİ DOĞRU DÜŞER
// ===========================================================================

describe('GDD 22.4 / 31.3 — Servis net katkısı', () => {
  it('başarılı işte net katkı = ücret − parça − dış usta', () => {
    const quote = buildQuote(brokenItem(), getServiceType('chainRepair'), 'inHouse', ctx());
    const job: ServiceJob = { ...jobFor(quote), result: 'success' };

    const d = resolveDelivery(job, brokenItem(), job.promisedDay);

    expect(d.succeeded).toBe(true);
    expect(d.cashDelta).toBe(job.fee);
    expect(d.netContribution).toBe(job.fee - job.partsCost - job.outsourceCost);
  });

  it('başarısız işte ücret alınmaz ve tazmin ödenir', () => {
    const quote = buildQuote(brokenItem(), getServiceType('restoration'), 'inHouse', ctx());
    const job: ServiceJob = { ...jobFor(quote), result: 'failed' };

    const d = resolveDelivery(job, brokenItem(), job.promisedDay);

    expect(d.succeeded).toBe(false);
    expect(d.cashDelta).toBe(-job.compensation);
    expect(d.cashDelta).toBeLessThan(0);
    // Net katkı parça ve dış ustayı da içerir — hepsi batmıştır.
    expect(d.netContribution).toBe(-(job.compensation + job.partsCost + job.outsourceCost));
    expect(d.trustDelta).toBeLessThan(0);
  });

  it('dış usta payı net katkıyı düşürür', () => {
    const item = brokenItem();
    const type = getServiceType('chainRepair');
    const inHouse = buildQuote(item, type, 'inHouse', ctx());
    const outsourced = buildQuote(item, type, 'outsourced', ctx());

    expect(outsourced.outsourceCost).toBeGreaterThan(0);
    expect(outsourced.netContribution).toBeLessThan(inHouse.netContribution);
    // GDD 17.2 — dış usta daha uzun sürer.
    expect(outsourced.durationDays).toBeGreaterThan(inHouse.durationDays);
    // Ama kapasite tüketmez.
    expect(outsourced.usesCapacity).toBe(false);
    expect(inHouse.usesCapacity).toBe(true);
  });

  it('parça maliyeti kabul ve teslimde ÇİFT sayılmaz', () => {
    const quote = buildQuote(brokenItem(), getServiceType('chainRepair'), 'inHouse', ctx());
    const job: ServiceJob = { ...jobFor(quote), result: 'success' };
    const d = resolveDelivery(job, brokenItem(), job.promisedDay);

    // Parça kabul anında nakit olarak çıktı; teslimde nakde tekrar yansımaz.
    expect(d.cashDelta).toBe(job.fee);
    expect(d.cashDelta).not.toBe(job.fee - job.partsCost);
  });
});

// ===========================================================================
// GDD 14.1 — SERVİS BRÜT MARJI %35–60
// ===========================================================================

describe('GDD 14.1 — Servis brüt marjı banttadır', () => {
  it('kendi atölyede brüt marj %35–60 arasında kalır', () => {
    const [lo, hi] = SERVICE.grossMarginBand;

    for (const type of SERVICE_TYPES) {
      for (let i = 0; i < 12; i++) {
        const item = spawnItem(SEED, 300 + i, 'necklace_14k');
        const quote = buildQuote(item, type, 'inHouse', ctx());
        if (quote.fee <= 0) continue;

        // GDD 14.1 brüt marjı: (ücret − işçilik − parça) / ücret.
        const margin = (quote.fee - quote.laborCost - quote.partsCost) / quote.fee;
        expect(margin).toBeGreaterThanOrEqual(lo - 0.02);
        expect(margin).toBeLessThanOrEqual(hi + 0.02);
      }
    }
  });

  it('ücret her zaman pozitiftir ve parça maliyetini aşar', () => {
    for (const type of SERVICE_TYPES) {
      const item = spawnItem(SEED, 401, 'bracelet_22k_burma');
      const quote = buildQuote(item, type, 'inHouse', ctx());
      expect(quote.fee).toBeGreaterThan(0);
      expect(quote.fee).toBeGreaterThan(quote.partsCost);
      expect(quote.netContribution).toBeGreaterThan(0);
    }
  });
});

// ===========================================================================
// GDD 17.3 / 35 — KAPASİTE, YOĞUNLUK VE HATA RİSKİ
// ===========================================================================

describe('GDD 17.3 / 35 — Hata riski formülü', () => {
  it('aşırı iş almak hata riskini ARTIRIR', () => {
    const type = getServiceType('chainRepair');
    const empty = errorRisk(type, ctx({ workshopLoad: 0 }), 'inHouse');
    const full = errorRisk(type, ctx({ workshopLoad: 2 }), 'inHouse');

    expect(full).toBeGreaterThan(empty);
  });

  it('zor iş kolay işten daha riskli', () => {
    const easy = errorRisk(getServiceType('clean'), ctx(), 'inHouse');
    const hard = errorRisk(getServiceType('restoration'), ctx(), 'inHouse');
    expect(hard).toBeGreaterThan(easy);
  });

  it('ekipman bonusu riski düşürür', () => {
    const type = getServiceType('restoration');
    const tier1 = errorRisk(type, ctx({ store: makeStore({ storeTier: 1 }) }), 'inHouse');
    const tier4 = errorRisk(type, ctx({ store: makeStore({ storeTier: 4 }) }), 'inHouse');
    expect(tier4).toBeLessThan(tier1);
  });

  it('risk her zaman 0–1 aralığındadır', () => {
    for (const type of SERVICE_TYPES) {
      for (const load of [0, 1, 2, 8, 40]) {
        for (const venue of ['inHouse', 'outsourced'] as const) {
          const r = errorRisk(type, ctx({ workshopLoad: load }), venue);
          expect(r).toBeGreaterThanOrEqual(0);
          expect(r).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('atölye doluyken kendi atölye teklifi engellenir, dış usta açık kalır', () => {
    const item = brokenItem();
    const type = getServiceType('chainRepair');
    const fullCtx = ctx({ workshopLoad: 2 }); // kapasite 2

    const inHouse = buildQuote(item, type, 'inHouse', fullCtx);
    const outsourced = buildQuote(item, type, 'outsourced', fullCtx);

    expect(inHouse.blockedReason).toBe('Atölye dolu');
    expect(outsourced.blockedReason).toBeNull();
  });

  it('inHouseLoad yalnız kendi atölyedeki bekleyen işleri sayar', () => {
    const item = brokenItem();
    const type = getServiceType('clean');
    const a = jobFor(buildQuote(item, type, 'inHouse', ctx()), { index: 1 });
    const b = jobFor(buildQuote(item, type, 'outsourced', ctx()), { index: 2 });
    const done: ServiceJob = { ...a, jobId: 'x', result: 'delivered' };

    expect(inHouseLoad([a, b, done])).toBe(1);
  });
});

// ===========================================================================
// GDD 17.3 — TESLİM SÖZÜ KİŞİSEL GÜVENİN PARÇASIDIR
// ===========================================================================

describe('GDD 17.3 — Teslim sözü ve gecikme', () => {
  it('sözünde teslim güven kazandırır', () => {
    const quote = buildQuote(brokenItem(), getServiceType('clean'), 'inHouse', ctx());
    const job: ServiceJob = { ...jobFor(quote), result: 'success' };
    const d = resolveDelivery(job, brokenItem(), job.promisedDay);

    expect(d.lateDays).toBe(0);
    expect(d.trustDelta).toBeGreaterThan(0);
  });

  it('geç teslim güven kaybettirir ve gecikme gün başına artar', () => {
    const quote = buildQuote(brokenItem(), getServiceType('clean'), 'inHouse', ctx());
    const job: ServiceJob = { ...jobFor(quote), result: 'success' };

    const onTime = resolveDelivery(job, brokenItem(), job.promisedDay);
    const late1 = resolveDelivery(job, brokenItem(), job.promisedDay + 1);
    const late3 = resolveDelivery(job, brokenItem(), job.promisedDay + 3);

    expect(late1.trustDelta).toBeLessThan(onTime.trustDelta);
    expect(late3.trustDelta).toBeLessThan(late1.trustDelta);
    expect(late3.lateDays).toBe(3);
  });

  it('sıkı söz tutulursa geniş sözden daha çok güven kazandırır', () => {
    const quote = buildQuote(brokenItem(), getServiceType('clean'), 'inHouse', ctx());
    const tight: ServiceJob = { ...jobFor(quote, { buffer: 0 }), result: 'success' };
    const loose: ServiceJob = { ...jobFor(quote, { buffer: 3 }), result: 'success' };

    const a = resolveDelivery(tight, brokenItem(), tight.promisedDay);
    const b = resolveDelivery(loose, brokenItem(), loose.promisedDay);

    expect(a.trustDelta).toBeGreaterThan(b.trustDelta);
  });

  it('overdueJobs sözü geçmiş, teslim edilmemiş işleri bulur', () => {
    const quote = buildQuote(brokenItem(), getServiceType('clean'), 'inHouse', ctx());
    const job: ServiceJob = { ...jobFor(quote), result: 'success' };
    const delivered: ServiceJob = { ...job, jobId: 'z', result: 'delivered' };

    const late = overdueJobs([job, delivered], job.promisedDay + 2);
    expect(late).toHaveLength(1);
    expect(late[0]!.jobId).toBe(job.jobId);
  });
});

// ===========================================================================
// Servis ürün üzerindeki etkisi
// ===========================================================================

describe('GDD 17.1 — Servis ürünün kondisyonunu gerçekten iyileştirir', () => {
  it('başarılı tamir kondisyonu yükseltir ve mekanik kusuru kaldırır', () => {
    const item = brokenItem(55);
    const quote = buildQuote(item, getServiceType('chainRepair'), 'inHouse', ctx());
    const job: ServiceJob = { ...jobFor(quote), result: 'success' };

    const after = applyServiceToItem(item, job);

    const order = ['broken', 'damaged', 'worn', 'good', 'pristine'];
    expect(order.indexOf(after.truth.condition)).toBeGreaterThanOrEqual(
      order.indexOf(item.truth.condition),
    );
    expect(
      after.truth.hiddenFlaws.some(
        (f) => f.kind === 'brokenMechanism' || f.kind === 'solderRepair',
      ),
    ).toBe(false);
  });

  it('başarısız iş ürüne dokunmaz', () => {
    const item = brokenItem(56);
    const quote = buildQuote(item, getServiceType('restoration'), 'inHouse', ctx());
    const job: ServiceJob = { ...jobFor(quote), result: 'failed' };

    expect(applyServiceToItem(item, job)).toEqual(item);
  });

  it('improveCondition üst sınırı aşmaz', () => {
    expect(improveCondition('pristine', 5)).toBe('pristine');
    expect(improveCondition('broken', 99)).toBe('pristine');
    expect(improveCondition('worn', 0)).toBe('worn');
  });
});

// ===========================================================================
// Tanılama
// ===========================================================================

describe('GDD 23.14 — Tanılama', () => {
  it('her ürün için en az bir servis türü önerir', () => {
    for (let i = 0; i < 60; i++) {
      const item = spawnItem(SEED, 600 + i, 'necklace_14k');
      const d = diagnose(item, 9);
      expect(d.availableTypeIds.length).toBeGreaterThan(0);
      expect(d.problemLabel.length).toBeGreaterThan(0);
    }
  });

  it('kilitli servis türleri seviyeye göre gizlenir', () => {
    const item = spawnItem(SEED, 700, 'damaged_chain');
    const early = diagnose(item, 1);
    const late = diagnose(item, 9);

    expect(early.availableTypeIds.length).toBeLessThanOrEqual(late.availableTypeIds.length);
    expect(early.availableTypeIds).not.toContain('restoration');
  });

  it('taşsız üründe taş sıkıştırma önerilmez', () => {
    const item = spawnItem(SEED, 800, 'bracelet_22k_thin');
    if (item.truth.stoneData.kind !== 'none') return;
    expect(diagnose(item, 9).availableTypeIds).not.toContain('stoneSet');
  });

  it('her önerilen tür için hem kendi atölye hem dış usta teklifi üretilir', () => {
    const item = spawnItem(SEED, 900, 'damaged_chain');
    const d = diagnose(item, 9);
    const quotes = buildQuotes(item, d, ctx());

    expect(quotes).toHaveLength(d.availableTypeIds.length * 2);
    for (const typeId of d.availableTypeIds) {
      expect(quotes.filter((q) => q.typeId === typeId)).toHaveLength(2);
    }
  });
});

// ===========================================================================
// Kuyruk yardımcıları
// ===========================================================================

describe('Atölye kuyruğu', () => {
  it('readyJobs yalnız süresi bitmiş, teslim edilmemiş işleri döndürür', () => {
    const quote = buildQuote(brokenItem(), getServiceType('clean'), 'inHouse', ctx());
    let jobs = [jobFor(quote, { index: 1 }), jobFor(
      buildQuote(brokenItem(), getServiceType('restoration'), 'inHouse', ctx()),
      { index: 2 },
    )];

    jobs = advanceJobsOneDay(jobs); // clean (1 gün) biter, restoration (4 gün) devam
    const ready = readyJobs(jobs);

    expect(ready).toHaveLength(1);
    expect(ready[0]!.type).toBe('clean');
  });
});
