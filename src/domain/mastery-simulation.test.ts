import { describe, expect, it } from 'vitest';
import { SERVICE_TYPES } from '@data/service-types';
import { spawnCustomer } from './customer-spawn';
import { dayCharacter } from './intent';
import { spawnItem } from './item-spawn';
import { createMarketForDay } from './market';
import { buildQuote, createServiceJob, type QuoteContext } from './service';
import type { SkillProgress } from './skill-tree';
import type { StoreState } from './types';

const SEED = 20260827, MARKET = createMarketForDay(SEED, 1);
const CHARACTER = dayCharacter(SEED, MARKET.day, MARKET);
function storeFor(index: number): StoreState {
  const crew = index % 3;
  return { name: 'Simulation', cash: 1_000_000, reputation: 60, level: 9, xp: 0, xpToNext: 580,
    storeTier: (1 + index % 5) as StoreState['storeTier'], displaySlots: 8, backStockSlots: 16,
    workshopCapacity: 4, staff: [], personnelCount: crew,
    personnelRoles: Array.from({ length: crew }, () => 'workshop' as const),
    supplier: { trust: 50, limit: 40_000, terms: 3, openInvoices: [], priceBand: 1, specialLotEligibility: false },
    payables: [], dailyOverhead: 1_200 };
}
const skills = (rank: number): SkillProgress => ({ assayAccuracyRank: 0, tatliDilLevel: 0, workshopCareRank: rank });
describe('1,000 deterministic paired mastery scenarios', () => {
  it('preserves all economic and RNG fields in 1,000 paired visits', () => {
    for (let n = 0; n < 1_000; n++) {
      const store = storeFor(n), base = skills(0), expert = { ...base, assayAccuracyRank: 3, tatliDilLevel: 3 };
      const low = spawnCustomer(SEED, n, MARKET, store, CHARACTER, {}, undefined, base);
      const high = spawnCustomer(SEED, n, MARKET, store, CHARACTER, {}, undefined, expert);
      expect({ ...high, customer: { ...high.customer, patience: low.customer.patience,
        patienceMax: low.customer.patienceMax, skillSnapshot: low.customer.skillSnapshot } }).toEqual(low);
      // Bulk visits scale the starting patience after applying the skill bonus.
      expect(high.customer.patienceMax).toBeGreaterThanOrEqual(low.customer.patienceMax + 2);
      expect(spawnCustomer(SEED, n, MARKET, store, CHARACTER, {}, undefined, expert)).toEqual(high);
    }
  });
  it('keeps financial quotes unchanged and success monotonic in 1,000 fixtures at four ranks', () => {
    const failures = [0, 0, 0, 0];
    for (let n = 0; n < 1_000; n++) {
      const item = spawnItem(SEED, n, 'damaged_chain'), type = SERVICE_TYPES[n % SERVICE_TYPES.length]!;
      const ctx: QuoteContext = { store: storeFor(n), market: MARKET, day: 1, workshopLoad: n % 4, jobs: [], skills: skills(0) };
      const base = buildQuote(item, type, 'inHouse', ctx), external = buildQuote(item, type, 'outsourced', ctx);
      const makeJob = (quote: typeof base) => createServiceJob({ rootSeed: SEED, jobIndex: n, item,
        customerId: `c-${n}`, customerName: 'Simulation', quote, today: 1, promiseBufferDays: 1 });
      const first = makeJob(base);
      let previousRisk = base.risk, previousOutcome = first.predeterminedOutcome;
      for (let rank = 0; rank <= 3; rank++) {
        const upgraded = { ...ctx, skills: skills(rank) }, quote = buildQuote(item, type, 'inHouse', upgraded), job = makeJob(quote);
        expect(quote.risk).toBeGreaterThanOrEqual(0);
        expect(quote.risk).toBeLessThanOrEqual(previousRisk + 1e-12);
        expect(base.risk - quote.risk).toBeLessThanOrEqual(.06 + 1e-12);
        expect({ ...quote, risk: base.risk }).toEqual(base);
        expect({ ...job, risk: first.risk, predeterminedOutcome: first.predeterminedOutcome }).toEqual(first);
        if (previousOutcome === 'success') expect(job.predeterminedOutcome).toBe('success');
        expect(buildQuote(item, type, 'outsourced', upgraded)).toEqual(external);
        expect(makeJob(quote)).toEqual(job);
        expect(buildQuote(item, type, 'inHouse', { ...upgraded, workshopLoad: 4 }).blockedReason).not.toBeNull();
        if (job.predeterminedOutcome === 'failed') failures[rank]!++;
        previousRisk = quote.risk; previousOutcome = job.predeterminedOutcome;
      }
      const overloaded = buildQuote(item, type, 'inHouse', { ...ctx, workshopLoad: 3, skills: skills(3) });
      const idle = buildQuote(item, type, 'inHouse', { ...ctx, workshopLoad: 0, skills: skills(3) });
      expect(overloaded.risk).toBeGreaterThanOrEqual(idle.risk);
    }
    expect(failures[1]).toBeLessThanOrEqual(failures[0]!);
    expect(failures[2]).toBeLessThanOrEqual(failures[1]!);
    expect(failures[3]).toBeLessThanOrEqual(failures[2]!);
  });
});
