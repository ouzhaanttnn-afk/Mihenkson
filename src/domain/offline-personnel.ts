import { dayCharacter } from './intent';
import { deriveSeed } from './rng';
import { spawnCustomer } from './customer-spawn';
import { personnelSale } from './personnel-sale';
import { personnelRoles } from './personnel';
import type { EconomyState } from './settlement';
import type { MarketState } from './types';
import type { CustomerRegistry } from './customer-memory';
import type { SkillProgress } from './skill-tree';

export const OFFLINE_MAX_MS = 4 * 60 * 60 * 1000;
export const OFFLINE_ATTEMPT_MS = 15 * 60 * 1000;

/** Explicitly armed on background, never inferred from a cosmetic save timestamp. */
export interface OfflinePersonnelClock {
  sequence: number;
  highWaterMs: number;
  session: { startedAtMs: number; sequence: number; resumeAtMs?: number } | null;
}
export interface OfflinePersonnelReport {
  id: string;
  elapsedMs: number;
  processedMs: number;
  attempts: number;
  sales: number;
  revenue: number;
  stockCost: number;
  profit: number;
  expenses: number;
  cashChange: number;
  pendingWages: number;
}
export const emptyOfflineClock = (): OfflinePersonnelClock => ({ sequence: 0, highWaterMs: 0, session: null });
const validTime = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;

export function normalizeOfflineClock(value: unknown): OfflinePersonnelClock {
  const clock = value as Partial<OfflinePersonnelClock> | null;
  const sequence = validTime(clock?.sequence) ? clock.sequence : 0;
  const highWaterMs = validTime(clock?.highWaterMs) ? clock.highWaterMs : 0;
  const session = clock?.session;
  return { sequence, highWaterMs, session: session && sequence > 0 && session.sequence === sequence &&
    validTime(session.startedAtMs) && session.startedAtMs <= highWaterMs &&
    (session.resumeAtMs === undefined || (validTime(session.resumeAtMs) && session.resumeAtMs >= highWaterMs))
    ? { ...session } : null };
}

export function normalizeOfflineReport(value: unknown): OfflinePersonnelReport | null {
  const report = value as OfflinePersonnelReport | null;
  if (!report || typeof report.id !== 'string' || !/^offline_personnel_\d+$/.test(report.id)) return null;
  if (![report.elapsedMs, report.processedMs, report.attempts, report.sales, report.revenue, report.stockCost,
    report.profit, report.expenses, report.cashChange, report.pendingWages].every(n => Number.isFinite(n) && n >= 0)) return null;
  if (report.processedMs > OFFLINE_MAX_MS || report.processedMs > report.elapsedMs ||
    !Number.isInteger(report.attempts) || !Number.isInteger(report.sales) || report.sales > report.attempts ||
    report.attempts !== Math.floor(report.processedMs / OFFLINE_ATTEMPT_MS) ||
    Math.abs(report.profit - (report.revenue - report.stockCost)) > 0.001 ||
    Math.abs(report.cashChange - (report.revenue - report.expenses)) > 0.001) return null;
  return { ...report };
}

export function armOfflineClock(previous: OfflinePersonnelClock, now: number): OfflinePersonnelClock {
  if (previous.session || !validTime(now) || previous.sequence >= Number.MAX_SAFE_INTEGER) return previous;
  // A clock rollback cannot create an overlapping interval or lower the watermark.
  if (now < previous.highWaterMs) return previous;
  const sequence = previous.sequence + 1;
  return { sequence, highWaterMs: now, session: { sequence, startedAtMs: now } };
}

export function consumeOfflineClock(previous: OfflinePersonnelClock, now: number) {
  const elapsedMs = previous.session && validTime(now) && now >= previous.highWaterMs
    ? Math.max(0, now - previous.session.startedAtMs) : 0;
  return {
    clock: { ...previous, session: null, highWaterMs: validTime(now) ? Math.max(previous.highWaterMs, now) : previous.highWaterMs },
    elapsedMs, processedMs: Math.min(elapsedMs, OFFLINE_MAX_MS),
  };
}

/** No game-day tick, borrowing, wages, services, XP or mastery. All sales use the live settlement contract. */
export function settleOfflinePersonnel(input: {
  economy: EconomyState; market: MarketState; seed: number; clock: OfflinePersonnelClock; now: number;
  customers: CustomerRegistry; skills: SkillProgress; pendingWages: number;
}) {
  const window = consumeOfflineClock(input.clock, input.now);
  let economy = input.economy;
  let sales = 0, revenue = 0, stockCost = 0;
  const attempts = Math.floor(window.processedMs / OFFLINE_ATTEMPT_MS);
  if (!input.clock.session || !personnelRoles(economy.store).includes('sales'))
    return { economy, clock: window.clock, report: null };
  const seed = deriveSeed(input.seed, 'offline-personnel', input.clock.session.sequence);
  const character = dayCharacter(input.seed, input.market.day, input.market);
  for (let index = 0; index < attempts; index++) {
    // Regular intent, budget and acceptance: neither buyers nor successful deals are guaranteed.
    // A separate spawn chain preserves the live queue/counter. Unsold visitors/items aren't stocked.
    const visitor = spawnCustomer(seed, index, input.market, economy.store, character, input.customers,
      { inventory: economy.inventory, items: economy.items }, input.skills).customer;
    const sold = personnelSale(economy, { ...visitor, visitId: `offline_${input.clock.session.sequence}_${index}` }, input.market);
    if (!sold) continue;
    const deal = sold.ledger.deals[sold.ledger.deals.length - 1]!;
    sales++; revenue += deal.price; stockCost += deal.costBasis;
    economy = sold;
  }
  const report: OfflinePersonnelReport | null = attempts === 0 ? null : {
    id: `offline_personnel_${input.clock.session.sequence}`, elapsedMs: window.elapsedMs,
    processedMs: window.processedMs, attempts, sales, revenue, stockCost,
    profit: revenue - stockCost, expenses: 0, cashChange: revenue, pendingWages: input.pendingWages,
  };
  return { economy, clock: window.clock, report };
}
