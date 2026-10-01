import { describe, expect, it } from 'vitest';
import { getTool } from '@data/tools';
import { getServiceType } from '@data/service-types';
import { useGame } from '@state/gameStore';
import { buildQuote, createServiceJob } from './service';
import { spawnItem } from './item-spawn';
import { createLedger } from './settlement';
import type { DealRecord, SettlementTransaction } from './types';
import { migrateMastery } from './mastery-history';
import { creditMasteryWork, defaultSkillProgress, learnTalent, masterySummary, normalizeSkillProgress,
  resetTalents, toolWithSkillBonuses, visitSkills, workshopRiskReduction } from './skill-tree';

function works(count: number) {
  let p = defaultSkillProgress();
  for (let n = 0; n < count; n++) p = creditMasteryWork(p, `work:${n}`, 1, true);
  return p;
}
const tx = (id: string, cash: number): SettlementTransaction => ({ txId: `sale_${id}`, dealId: id,
  day: 1, cashDelta: cash, itemsIn: [], itemsOut: [{ itemId: 'gold', quantity: 1 }],
  trustDelta: 0, reputationDelta: 0, xpDelta: 0, label: 'fixture' });
const sale = (id: string, price = 200, costBasis = 100): DealRecord => ({ dealId: `${id}_pkg`, day: 1,
  customerId: 'customer', lineIds: [], itemIds: ['gold'], side: 'sell', price, costBasis,
  clockMinutes: 540, estimateBand: { min: 100, max: 200 }, actualValue: 200, offerHistory: [price],
  finalState: 'ACCEPTED', testsUsed: [], confidence: 'high', trustDelta: 0, reputationDelta: 0,
  movesUsed: ['offer'], thesisAtDeal: null, units: 1, grams: 1, channel: null, isBulk: false,
  realizedProfit: price - costBasis, reviewData: { missedSignals: [], keyDecisionPoint: '', alternativeChannelNote: '' } });

describe('six-point mastery accounting', () => {
  it.each([[0, 0], [4, 0], [5, 1], [14, 1], [15, 2], [29, 2], [30, 3], [49, 3],
    [50, 4], [79, 4], [80, 5], [119, 5], [120, 6], [1_000, 6]])('%i completed works yield %i points', (count, points) => {
    expect(masterySummary(works(count))).toMatchObject({ earned: points, available: points, spent: 0 });
    expect(works(count).mastery.creditedWorkIds.length).toBe(Math.min(count, 120));
  });
  it('requires positive finite net contribution, completion and a unique permanent identity', () => {
    const p = works(4);
    for (const net of [0, -1, NaN, Infinity]) expect(creditMasteryWork(p, 'new', net, true)).toEqual(p);
    expect(creditMasteryWork(p, 'new', 1, false)).toEqual(p);
    expect(creditMasteryWork(p, 'work:0', 1, true)).toEqual(p);
    const next = creditMasteryWork(p, 'new', 1, true);
    expect(masterySummary(next).earned).toBe(1);
    expect(creditMasteryWork(next, 'new', 1, true)).toEqual(next);
    expect(creditMasteryWork(works(120), 'overflow', 1, true)).toEqual(works(120));
  });
  it('learns sequentially, rejects stale taps and cannot buy all nine ranks', () => {
    let p = works(120);
    for (let rank = 0; rank < 3; rank++) p = learnTalent(p, 'ayar_ustaligi', rank)!;
    expect(learnTalent(p, 'ayar_ustaligi', 3)).toBeNull();
    expect(learnTalent(p, 'tatli_dil', 1)).toBeNull();
    for (let rank = 0; rank < 3; rank++) p = learnTalent(p, 'tatli_dil', rank)!;
    expect(masterySummary(p)).toMatchObject({ earned: 6, spent: 6, available: 0 });
    expect(learnTalent(p, 'usta_eli', 0)).toBeNull();
    const first = learnTalent(works(15), 'usta_eli', 0)!;
    expect(learnTalent(first, 'usta_eli', 0)).toBeNull();
    expect(workshopRiskReduction(first)).toBe(.02);
  });
  it('resets for free once per game day without resetting work IDs or granting points', () => {
    const learned = learnTalent(works(15), 'tatli_dil', 0)!;
    expect(resetTalents(learned, 1, learned.mastery.revision - 1)).toBeNull();
    const reset = resetTalents(learned, 1, learned.mastery.revision)!;
    expect(reset.mastery.creditedWorkIds).toEqual(learned.mastery.creditedWorkIds);
    expect(masterySummary(reset)).toMatchObject({ earned: 2, available: 2, spent: 0 });
    const relearn = learnTalent(reset, 'usta_eli', 0)!;
    expect(resetTalents(relearn, 1, relearn.mastery.revision)).toBeNull();
    expect(resetTalents(relearn, 0, relearn.mastery.revision)).toBeNull();
    expect(resetTalents(relearn, 2, relearn.mastery.revision)?.mastery.lastResetDay).toBe(2);
  });
  it('grandfathers real legacy ranks without adding them to earned milestone points', () => {
    const legacy = normalizeSkillProgress({ assayAccuracyRank: 2, tatliDilLevel: 1 });
    expect(masterySummary(legacy)).toMatchObject({ earned: 3, spent: 3, available: 0 });
    let p = legacy;
    for (let n = 0; n < 50; n++) p = creditMasteryWork(p, `old:${n}`, 1, true);
    expect(masterySummary(p)).toMatchObject({ earned: 4, spent: 3, available: 1 });
  });
  it('repairs malformed persistent saves without stripping rank-only visit effects', () => {
    const p = works(120);
    const repaired = normalizeSkillProgress({ ...p, assayAccuracyRank: 3, tatliDilLevel: 3, workshopCareRank: 3 });
    expect(masterySummary(repaired).spent).toBe(6);
    expect(repaired.workshopCareRank).toBe(0);
    expect(normalizeSkillProgress({ ...defaultSkillProgress(), assayAccuracyRank: 3 }).assayAccuracyRank).toBe(0);
    expect(normalizeSkillProgress({ assayAccuracyRank: NaN, tatliDilLevel: Infinity })).toEqual(defaultSkillProgress());
    const snapshot = visitSkills({ assayAccuracyRank: 3, tatliDilLevel: 3, workshopCareRank: 3 });
    expect(workshopRiskReduction(snapshot)).toBe(.06);
    expect(toolWithSkillBonuses(getTool('touchstone'), snapshot).reliability).toBe(.9);
  });
});

describe('conservative one-time historical backfill', () => {
  it('requires genuine accepted manual sale transaction proof and subtracts tests', () => {
    const ledger = createLedger();
    ledger.deals = [sale('good'), sale('tested'), sale('loss', 100, 100), sale('missing'), sale('badcash'), sale('badcost', 200, -100),
      { ...sale('staff'), dealId: 'staff_sale' }, { ...sale('wholesale'), dealId: 'wholesale' },
      { ...sale('purchase'), side: 'buy' }];
    ledger.transactions = [tx('good', 200), tx('tested', 200), { ...tx('tested', -101), txId: 'test_tested_1', itemsOut: [] },
      tx('loss', 100), tx('badcash', 199), tx('badcost', 200), tx('staff', 200), tx('wholesale', 200), tx('purchase', 200)];
    ledger.appliedTxIds = ledger.transactions.map(t => t.txId);
    const migrated = migrateMastery(undefined, ledger, []);
    expect(migrated.mastery.creditedWorkIds).toEqual(['deal:good']);
    expect(migrateMastery(migrated, ledger, [])).toEqual(migrated);
  });
  it('requires successful delivered jobs with actual fee transactions and full net profit', () => {
    const s = useGame.getState(), item = spawnItem(42, 1, 'damaged_chain');
    const quote = buildQuote(item, getServiceType('chainRepair'), 'inHouse', { store: { ...s.store, level: 9 }, market: s.market, workshopLoad: 0, day: 1 });
    const base = createServiceJob({ rootSeed: 42, jobIndex: 1, item, customerId: 'c', customerName: 'c', quote, today: 1, promiseBufferDays: 1 });
    const jobs = ['good', 'missing', 'mismatch', 'loss', 'failed', 'pending'].map(jobId => ({ ...base, jobId,
      result: jobId === 'pending' ? 'pending' as const : 'delivered' as const,
      predeterminedOutcome: jobId === 'failed' ? 'failed' as const : 'success' as const,
      fee: 200, partsCost: jobId === 'loss' ? 200 : 100, outsourceCost: 0 }));
    const ledger = createLedger();
    ledger.transactions = jobs.filter(j => j.jobId !== 'missing').map(j => ({ ...tx(j.jobId, j.jobId === 'mismatch' ? 199 : 200), txId: `service_deliver_${j.jobId}`, itemsOut: [] }));
    ledger.appliedTxIds = [...ledger.transactions.map(t => t.txId), 'service_deliver_missing'];
    expect(migrateMastery(undefined, ledger, jobs).mastery.creditedWorkIds).toEqual(['job:good']);
  });
});
