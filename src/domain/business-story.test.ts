import { describe, expect, it } from 'vitest';
import { createLedger, type Ledger } from './settlement';
import { createMarketForDay } from './market';
import { poolSupplyItem } from './pool-supply';
import { defaultSkillProgress } from './skill-tree';
import type { CustomerRecord } from './customer-memory';
import type { DealRecord, MarketEvent, ServiceJob, SettlementTransaction } from './types';
import {
  businessStoryAgenda, businessStoryDayProgress, businessStoryDirection,
  createBusinessStoryBaseline, customerReturnContext, normalizeBusinessStoryBaseline, normalizeBusinessStoryDayProgress,
  type BusinessStoryContext,
} from './business-story';

function context(): BusinessStoryContext {
  return { day: 1, economy: { market: createMarketForDay(20260827, 1),
    store: { name: 'Test', cash: 1_000_000, reputation: 50, level: 1, xp: 0, xpToNext: 580,
      storeTier: 1, displaySlots: 8, backStockSlots: 16, workshopCapacity: 2, staff: [],
      supplier: { trust: 50, limit: 100_000, terms: 3, openInvoices: [], priceBand: 1, specialLotEligibility: false },
      payables: [], dailyOverhead: 900 },
    inventory: [], items: {}, ledger: createLedger() },
    customers: {}, skillProgress: defaultSkillProgress(), jobs: [] };
}
function record(id = 'customer', overrides: Partial<CustomerRecord> = {}): CustomerRecord {
  return { id, displayName: 'Test', archetype: 'investor', trust: 55,
    history: [{ day: 1, dealId: 'visit', outcome: 'accepted', trustDelta: 1, note: '' }],
    visits: 1, lastVisitDay: 1, lifetimeVolume: 50_000, referredBy: null, spawnIndex: 0, ...overrides };
}
function deal(overrides: Partial<DealRecord> = {}): DealRecord {
  return { dealId: 'visit_pkg', customerId: 'customer', lineIds: [], itemIds: ['quarter'], side: 'sell', day: 1, clockMinutes: 600,
    testsUsed: [], estimateBand: { min: 50_000, max: 50_000 }, confidence: 'high', actualValue: 50_000,
    offerHistory: [50_000], finalState: 'ACCEPTED', movesUsed: ['offer'], thesisAtDeal: null,
    price: 50_000, costBasis: 48_000, units: 1, grams: 1.754, channel: 'retailCustomer', isBulk: false,
    realizedProfit: 2_000, trustDelta: 1, reputationDelta: 0,
    reviewData: { missedSignals: [], keyDecisionPoint: '', alternativeChannelNote: '' }, ...overrides };
}
function job(overrides: Partial<ServiceJob> = {}): ServiceJob {
  return { jobId: 'job', type: 'polish', itemId: 'quarter', customerId: 'customer', customerName: 'Test', itemName: 'Ürün',
    duration: 2, remainingDays: 1, risk: .1, partsCost: 50, assignedStaff: null, venue: 'inHouse', outsourceCost: 0,
    promisedDay: 2, expectedDay: 2, fee: 300, predeterminedOutcome: 'success', result: 'pending', compensation: 500, acceptedDay: 1,
    ...overrides };
}
const publicEvent: MarketEvent = { id: 'wedding', label: 'Düğün Sezonu', description: 'Kamuya açık olay',
  affects: ['demand', 'workshop'], counterplay: ['prepare'], durationDays: 3, startedDay: 1 };

describe('business story direction', () => {
  it('reuses all seven real gates while first-session direction points to the first real work threshold', () => {
    const s = context();
    const result = businessStoryDirection(s);
    expect(result.upgrade.gates).toHaveLength(7);
    expect(result.nearGoal).toEqual({ key: 'mastery-work', completed: 0, target: 5, remaining: 5 });
    expect(result.upgrade.next?.investment).toBe(220_000);
    expect(result.upgrade.next?.grants.dailyOverhead).toBe(1_800);
    expect(result).not.toHaveProperty('percentage');
    expect(result.mastery).toMatchObject({ completed: 0, next: 5, remaining: 5 });
  });
  it('keeps the first five-work target stable, then offers the point and returns to actual upgrade gates', () => {
    const s = context();
    for (let completed = 0; completed < 5; completed++) {
      s.skillProgress = { ...defaultSkillProgress(), mastery: { ...defaultSkillProgress().mastery,
        creditedWorkIds: Array.from({ length: completed }, (_, i) => `work${i}`) } };
      expect(businessStoryDirection(s).nearGoal).toEqual({ key: 'mastery-work', completed, target: 5, remaining: 5 - completed });
    }
    s.skillProgress = { ...defaultSkillProgress(), mastery: { ...defaultSkillProgress().mastery,
      creditedWorkIds: Array.from({ length: 5 }, (_, i) => `work${i}`) } };
    expect(businessStoryDirection(s).nearGoal).toEqual({ key: 'mastery-spend', available: 1 });
    s.skillProgress.assayAccuracyRank = 1;
    expect(businessStoryDirection(s).nearGoal).toMatchObject({ key: 'upgrade-gate', gate: { key: 'closedDeals', current: 0, needed: 18 } });
    expect(businessStoryDirection(s).mastery).toMatchObject({ next: 15, remaining: 10 });
  });
  it('uses a point that really exists, without treating all sales as eligible work', () => {
    const s = context();
    s.economy.ledger.deals = Array.from({ length: 8 }, (_, i) => deal({ dealId: `deal${i}` }));
    expect(businessStoryDirection(s).mastery.completed).toBe(0);
    s.skillProgress = { ...defaultSkillProgress(), mastery: { ...defaultSkillProgress().mastery,
      creditedWorkIds: Array.from({ length: 5 }, (_, i) => `work${i}`) } };
    expect(businessStoryDirection(s).nearGoal).toEqual({ key: 'mastery-spend', available: 1 });
  });
  it('calls an upgrade ready only after every canonical gate is met', () => {
    const s = context();
    s.economy.store = { ...s.economy.store, reputation: 52, level: 3, supplier: { ...s.economy.store.supplier, trust: 58 } };
    s.economy.ledger.deals = Array.from({ length: 18 }, (_, i) => deal({ dealId: `deal${i}` }));
    s.customers = Object.fromEntries(Array.from({ length: 6 }, (_, i) => [`c${i}`, record(`c${i}`)]));
    expect(businessStoryDirection(s).nearGoal).toEqual({ key: 'upgrade-ready', tier: 2, investment: 220_000 });
    s.economy.store.cash = 200_000;
    expect(businessStoryDirection(s).upgrade.ready).toBe(false);
  });
  it('does not invent another shop tier at the shipped career cap', () => {
    const s = context(); s.economy.store.storeTier = 4;
    expect(businessStoryDirection(s).upgrade.next).toBeNull();
    expect(businessStoryDirection(s).nearGoal).toEqual({ key: 'mastery-work', completed: 0, target: 5, remaining: 5 });
  });
});

describe('business story public agenda', () => {
  it('prioritizes real near commitments over the active event and calendar, capped at three', () => {
    const s = context(); s.day = 3;
    s.economy.store.payables = [{ id: 'due', dueDay: 2, amount: 300, label: 'Due' }, { id: 'future', dueDay: 30, amount: 900, label: 'Later' }];
    s.jobs = [job({ promisedDay: 3, result: 'success' })]; s.activeEvent = publicEvent;
    expect(businessStoryAgenda(s)).toEqual([
      { key: 'payment', id: 'due', source: 'payable', dueDay: 2, amount: 300, overdue: true },
      { key: 'delivery', id: 'job', promisedDay: 3, ready: true, overdue: false },
      { key: 'event', id: 'wedding', label: publicEvent.label, description: publicEvent.description, remainingDays: 1 },
    ]);
  });
  it('includes real supplier and network obligations, without duplicating or advancing them', () => {
    const s = context(); s.day = 3;
    s.economy.store.supplier.openInvoices = [{ id: 'invoice', dueDay: 4, amount: 600 }];
    s.network = [{ id: 'member', displayName: 'Test', craft: 'sarraf', trust: 50, cashOnHand: 100, bullionAppetite: 1,
      history: { repaidOnTime: 0, repaidLate: 0 }, loan: { id: 'loan', memberId: 'member', principal: 400, totalDue: 420, dueDay: 3, takenDay: 1 } }];
    const before = JSON.stringify(s);
    expect(businessStoryAgenda(s).slice(0, 2)).toMatchObject([
      { key: 'payment', source: 'network', amount: 420 }, { key: 'payment', source: 'supplier', amount: 600 },
    ]);
    expect(JSON.stringify(s)).toBe(before);
  });
  it('keeps payments visible when several ready jobs already have separate direct reminders', () => {
    const s = context(); s.day = 3; s.activeEvent = publicEvent;
    s.jobs = Array.from({ length: 6 }, (_, i) => job({ jobId: `ready${i}`, promisedDay: 1, result: i % 2 ? 'failed' : 'success' }));
    s.economy.store.supplier.openInvoices = [{ id: 'today', dueDay: 3, amount: 1000 }];
    expect(businessStoryAgenda(s)[0]).toMatchObject({ key: 'delivery', ready: true });
    expect(businessStoryAgenda(s, { includeReadyDeliveries: false })).toMatchObject([
      { key: 'payment', source: 'supplier', amount: 1000 }, { key: 'event' }, { key: 'week' },
    ]);
    s.economy.store.supplier.openInvoices = [];
    expect(businessStoryAgenda(s, { includeReadyDeliveries: false })[0]).toMatchObject({ key: 'event' });
  });
  it('uses only the fixed weekly schedule; no seed or future market truth is returned', () => {
    const s = context(); s.day = 6; s.activeEvent = null;
    expect(businessStoryAgenda(s)).toEqual([{ key: 'week', day: 6, kind: 'sales', shopOpen: true, marketOpen: false, nextMarketOpenDay: 8 }]);
    s.day = 7;
    expect(businessStoryAgenda(s)).toMatchObject([{ key: 'week', kind: 'planning', shopOpen: false, marketOpen: false }]);
    s.day = 5;
    expect(businessStoryAgenda(s)).toMatchObject([{ key: 'week', kind: 'buyback', shopOpen: true, marketOpen: true }]);
  });
  it('never reveals a pending service predetermined outcome or an unstarted/expired event', () => {
    const s = context(); s.jobs = [job({ predeterminedOutcome: 'failed' })];
    s.activeEvent = { ...publicEvent, startedDay: 2 };
    const agenda = businessStoryAgenda(s);
    expect(agenda[0]).toMatchObject({ key: 'delivery', ready: false });
    expect(JSON.stringify(agenda)).not.toContain('failed');
    expect(agenda.some(item => item.key === 'event')).toBe(false);
    s.day = 4; s.jobs = []; s.activeEvent = publicEvent;
    expect(businessStoryAgenda(s).some(item => item.key === 'event')).toBe(false);
  });
  it('ignores delivered jobs, nonpositive debts and far promises', () => {
    const s = context();
    s.jobs = [job({ result: 'delivered' }), job({ promisedDay: 5, predeterminedOutcome: 'failed' })];
    s.economy.store.payables = [{ id: 'nothing', amount: 0, dueDay: 1, label: 'Nothing' }];
    expect(businessStoryAgenda(s)).toHaveLength(1);
  });
});

describe('business story exact observed day progress', () => {
  it('leaves legacy, missing, malformed and wrong-day baselines unknown', () => {
    const s = context(), baseline = createBusinessStoryBaseline(s);
    for (const bad of [null, undefined, {}, { ...baseline, version: 2 }, { ...baseline, growth: { ...baseline.growth, netWorth: NaN } },
      { ...baseline, relationships: { known: 0, loyal: 1, upset: 0 } }, { ...baseline, mastery: { completed: 5, earned: 0, spent: 1 } }]) {
      expect(normalizeBusinessStoryBaseline(bad)).toBeNull();
      expect(businessStoryDayProgress(s, bad)).toBeNull();
    }
    expect(businessStoryDayProgress({ ...s, day: 2 }, baseline)).toBeNull();
  });
  it('measures actual deltas, including losses, separately from next targets', () => {
    const s = context(), baseline = createBusinessStoryBaseline(s);
    s.economy.store.cash -= 20_000; s.economy.store.reputation += 3; s.economy.store.supplier.trust -= 2;
    s.customers = { customer: record() };
    s.skillProgress = { ...defaultSkillProgress(), mastery: { ...defaultSkillProgress().mastery,
      creditedWorkIds: Array.from({ length: 5 }, (_, i) => `work${i}`) } };
    expect(businessStoryDayProgress(s, baseline)).toMatchObject({ day: 1, targetTier: 2,
      delta: { cash: -20_000, netWorth: -20_000, reputation: 3, supplierTrust: -2, knownCustomers: 1,
        masteryWorks: 5, masteryPoints: 1, masterySpent: 0 } });
  });
  it('compares the same tier gates when an upgrade occurred during the day', () => {
    const s = context(); s.economy.store.reputation = 52; s.economy.store.level = 3; s.economy.store.supplier.trust = 58;
    s.economy.ledger.deals = Array.from({ length: 17 }, (_, i) => deal({ dealId: `deal${i}` }));
    const baseline = createBusinessStoryBaseline(s);
    s.economy.ledger.deals.push(deal({ dealId: 'last' })); s.economy.store.storeTier = 2;
    expect(businessStoryDayProgress(s, baseline)).toMatchObject({ tierBefore: 1, tierAfter: 2, targetTier: 2, newlyMetGateKeys: ['closedDeals'] });
  });
  it('a lost requirement is represented honestly rather than clamped to positive progress', () => {
    const s = context(), baseline = createBusinessStoryBaseline(s); s.economy.store.cash = 200_000;
    expect(businessStoryDayProgress(s, baseline)?.noLongerMetGateKeys).toEqual(['netWorth', 'investment']);
  });
  it('is repeatable, save/load compatible, bounded and does not mutate economic state', () => {
    const s = context(), before = JSON.stringify(s), baseline = createBusinessStoryBaseline(s);
    expect(JSON.stringify(baseline).length).toBeLessThan(600);
    const loaded = normalizeBusinessStoryBaseline(JSON.parse(JSON.stringify(baseline)));
    expect(loaded).toEqual(baseline);
    expect(businessStoryDayProgress(s, loaded)).toEqual(businessStoryDayProgress(s, loaded));
    businessStoryDirection(s); businessStoryAgenda(s);
    expect(JSON.stringify(s)).toBe(before);
  });
  it('validates nested saved reports without permitting fabricated fields or overlapping gates', () => {
    const s = context(), baseline = createBusinessStoryBaseline(s);
    s.economy.store.cash -= 500;
    const progress = businessStoryDayProgress(s, baseline)!;
    expect(normalizeBusinessStoryDayProgress(JSON.parse(JSON.stringify(progress)))).toEqual(progress);
    expect(normalizeBusinessStoryDayProgress({ ...progress, hiddenPrice: 123 })).not.toHaveProperty('hiddenPrice');
    for (const malformed of [null, {}, { ...progress, version: 2 }, { ...progress, day: 0 },
      { ...progress, targetTier: 3 }, { ...progress, delta: {} }, { ...progress, delta: { ...progress.delta, cash: Infinity } },
      { ...progress, delta: { ...progress.delta, masteryPoints: 7 } }, { ...progress, delta: { ...progress.delta, knownCustomers: 1.5 } },
      { ...progress, newlyMetGateKeys: ['secret'] }, { ...progress, newlyMetGateKeys: ['level', 'level'] },
      { ...progress, newlyMetGateKeys: ['level'], noLongerMetGateKeys: ['level'] }]) {
      expect(normalizeBusinessStoryDayProgress(malformed)).toBeNull();
    }
  });
});

describe('customer return copy requires real owned ledger evidence', () => {
  const item = { ...poolSupplyItem('quarter_gold'), id: 'quarter' };
  function ledger(txOverrides: Partial<SettlementTransaction> = {}, dealOverrides: Partial<DealRecord> = {}): Ledger {
    return { ...createLedger(), appliedTxIds: ['sale_visit'], transactions: [{ txId: 'sale_visit', dealId: 'visit', day: 1,
      cashDelta: 50_000, itemsIn: [], itemsOut: [{ itemId: 'quarter', quantity: 1 }], trustDelta: 1, reputationDelta: 0, xpDelta: 0,
      label: 'Sale', ...txOverrides }], deals: [deal(dealOverrides)] };
  }
  it('returns null for a first visit and uses true visit context when product evidence is absent', () => {
    expect(customerReturnContext('missing', {}, createLedger(), {})).toBeNull();
    const result = customerReturnContext('customer', { customer: record() }, createLedger(), {});
    expect(result).toEqual({ key: 'customer-return', visits: 1, lastVisitDay: 1, lastOutcome: 'accepted', trust: 55, productNames: [], tradeSide: null });
  });
  it('allows product copy only for exact matching applied sale and accepted customer-owned record', () => {
    expect(customerReturnContext('customer', { customer: record() }, ledger(), { quarter: item }))
      .toMatchObject({ productNames: [item.displayName], tradeSide: 'sold-to-customer' });
  });
  it('does not infer a product from unapplied, wrong-day, rejected, prefix-similar or another customer record', () => {
    const unapplied = ledger(); unapplied.appliedTxIds = [];
    const alternatives = [unapplied, ledger({ day: 2 }), ledger({ dealId: 'visit_other' }),
      ledger({}, { customerId: 'someoneElse' }), ledger({}, { itemIds: ['unrelated'] }),
      ledger({}, { finalState: 'REJECTED' }), ledger({}, { dealId: 'visit_other_pkg' })];
    for (const evidence of alternatives) expect(customerReturnContext('customer', { customer: record() }, evidence, { quarter: item })?.productNames).toEqual([]);
    expect(customerReturnContext('customer', { customer: record('customer', { history: [{ day: 1, dealId: 'visit', outcome: 'rejected', trustDelta: -2, note: '' }] }) },
      ledger(), { quarter: item })?.productNames).toEqual([]);
  });
  it('proves an incoming line by its exact settlement txId, even after the item is no longer in the live map', () => {
    const evidence = ledger({ txId: 'settle_visit_line1', itemsIn: [item], itemsOut: [], cashDelta: -50_000 },
      { dealId: 'visit_line1', lineIds: ['line1'], side: 'buy' });
    evidence.appliedTxIds = ['settle_visit_line1'];
    expect(customerReturnContext('customer', { customer: record() }, evidence, {}))
      .toMatchObject({ productNames: [item.displayName], tradeSide: 'bought-from-customer' });
  });
  it('uses actual generic outcomes instead of attributing a trade to service bookings', () => {
    const customer = record('customer', { visits: 4, history: [{ day: 1, dealId: 'visit', outcome: 'serviceBooked', trustDelta: 1, note: '' }] });
    expect(customerReturnContext('customer', { customer }, ledger(), { quarter: item }))
      .toMatchObject({ visits: 4, lastOutcome: 'serviceBooked', productNames: [] });
  });
});
