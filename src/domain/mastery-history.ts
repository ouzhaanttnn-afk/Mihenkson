import type { Ledger } from './settlement';
import type { ServiceJob } from './types';
import { creditMasteryWork, normalizeSkillProgress, type SkillProgress } from './skill-tree';

export function paidTestCosts(ledger: Ledger, dealId: string): number {
  return ledger.transactions.reduce((sum, tx) => sum + (tx.dealId === dealId && tx.txId.startsWith('test_') && tx.cashDelta < 0 ? -tx.cashDelta : 0), 0);
}
/** Conservative one-time backfill; historical appraisals do not prove accuracy. */
export function migrateMastery(progress: SkillProgress | undefined, ledger: Ledger, jobs: ServiceJob[]) {
  let p = normalizeSkillProgress(progress);
  if (progress?.mastery?.version === 1) return p;
  const applied = new Set(ledger.appliedTxIds);
  const transactions = new Map(ledger.transactions.map(tx => [tx.txId, tx]));
  const tests = new Map<string, number>();
  for (const tx of ledger.transactions) {
    if (tx.txId.startsWith('test_') && tx.cashDelta < 0) tests.set(tx.dealId, (tests.get(tx.dealId) ?? 0) - tx.cashDelta);
  }
  for (const deal of ledger.deals) {
    if (p.mastery.creditedWorkIds.length >= 120) return p;
    if (deal.side !== 'sell' || deal.finalState !== 'ACCEPTED' || !deal.dealId.endsWith('_pkg')) continue;
    if (!Number.isFinite(deal.price) || deal.price <= 0 || !Number.isFinite(deal.costBasis) || deal.costBasis < 0) continue;
    const id = deal.dealId.slice(0, -4), tx = transactions.get(`sale_${id}`);
    if (!tx || tx.dealId !== id || !applied.has(tx.txId) || tx.cashDelta !== deal.price || tx.itemsOut.length === 0) continue;
    p = creditMasteryWork(p, `deal:${id}`, deal.price - deal.costBasis - (tests.get(id) ?? 0), true);
  }
  for (const job of jobs) {
    if (p.mastery.creditedWorkIds.length >= 120) return p;
    if (![job.fee, job.partsCost, job.outsourceCost].every(n => Number.isFinite(n) && n >= 0)) continue;
    const tx = transactions.get(`service_deliver_${job.jobId}`);
    if (job.result !== 'delivered' || job.predeterminedOutcome !== 'success' || !tx || tx.cashDelta !== job.fee || !applied.has(tx.txId)) continue;
    p = creditMasteryWork(p, `job:${job.jobId}`, job.fee - job.partsCost - job.outsourceCost, true);
  }
  return p;
}
