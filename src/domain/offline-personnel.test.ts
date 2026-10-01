import { describe, expect, it } from 'vitest';
import { armOfflineClock, consumeOfflineClock, emptyOfflineClock, normalizeOfflineClock,
  normalizeOfflineReport, OFFLINE_ATTEMPT_MS, OFFLINE_MAX_MS, settleOfflinePersonnel } from './offline-personnel';
import type { PersonnelRole } from './types';
import { offlineFixture } from './offline-personnel-fixture';

describe('bounded offline safe sales', () => {
  it('is deterministic, reconciles real stock, profit and cash, and grants no XP', () => {
    const input = offlineFixture(), before = structuredClone(input);
    const result = settleOfflinePersonnel(input);
    expect(input).toEqual(before);
    expect(settleOfflinePersonnel(structuredClone(input))).toEqual(result);
    expect(result.report?.attempts).toBe(16);
    expect(result.report!.sales).toBeGreaterThan(0);
    expect(result.report!.sales).toBeLessThan(16);
    expect(result.economy.store.cash - input.economy.store.cash).toBe(result.report!.revenue);
    const beforeCost = input.economy.inventory.reduce((sum, p) => sum + p.costBasis, 0);
    const afterCost = result.economy.inventory.reduce((sum, p) => sum + p.costBasis, 0);
    expect(beforeCost - afterCost).toBeCloseTo(result.report!.stockCost);
    expect(result.economy.ledger.realizedProfitTotal).toBeCloseTo(result.report!.profit);
    expect(result.report!.profit).toBeCloseTo(result.report!.revenue - result.report!.stockCost);
    expect(result.report!.expenses).toBe(0);
    expect(result.report!.cashChange).toBe(result.report!.revenue);
    expect(result.economy.store.xp).toBe(input.economy.store.xp);
    expect(result.economy.store.payables).toEqual(input.economy.store.payables);
    expect(result.economy.store.supplier).toEqual(input.economy.store.supplier);
    expect(normalizeOfflineReport(result.report)).toEqual(result.report);
    expect(settleOfflinePersonnel({ ...input, economy: result.economy, clock: result.clock }).report).toBeNull();
    expect(settleOfflinePersonnel({ ...input, economy: result.economy, clock: input.clock }).economy).toEqual(result.economy);
  });
  it.each([0, 1, OFFLINE_ATTEMPT_MS - 1, OFFLINE_ATTEMPT_MS, OFFLINE_MAX_MS, OFFLINE_MAX_MS * 10])('bounds %i ms without carrying over excess time', gap => {
    const input = offlineFixture(), result = settleOfflinePersonnel({ ...input, now: input.clock.highWaterMs + gap });
    expect(result.report?.attempts ?? 0).toBe(Math.floor(Math.min(gap, OFFLINE_MAX_MS) / OFFLINE_ATTEMPT_MS));
    expect(result.clock.session).toBeNull();
    expect(result.clock.highWaterMs).toBe(input.clock.highWaterMs + gap);
  });
  it.each([NaN, Infinity, -10, 500_000])('invalid or rolled-back clock %s grants nothing and never lowers the watermark', now => {
    const input = offlineFixture(), result = settleOfflinePersonnel({ ...input, now });
    expect(result.economy).toBe(input.economy);
    expect(result.report).toBeNull();
    expect(result.clock.highWaterMs).toBe(input.clock.highWaterMs);
    expect(armOfflineClock(result.clock, 500_000)).toBe(result.clock);
  });
  it('does not multiply offline attempts by headcount and does not manufacture stock or margin', () => {
    const input = offlineFixture();
    const more = { ...input, economy: { ...input.economy, store: { ...input.economy.store,
      personnelCount: 3, personnelRoles: ['sales', 'sales', 'sales'] as PersonnelRole[] } } };
    expect(settleOfflinePersonnel(more).report?.attempts).toBe(16);
    for (const economy of [ { ...input.economy, inventory: [] },
      { ...input.economy, inventory: input.economy.inventory.map(p => ({ ...p, costBasis: 1e12 })) } ]) {
      const result = settleOfflinePersonnel({ ...input, economy });
      expect(result.report?.sales).toBe(0);
      expect(result.economy).toBe(economy);
    }
    const idle = { ...input.economy, store: { ...input.economy.store, personnelRoles: ['idle'] as PersonnelRole[] } };
    expect(settleOfflinePersonnel({ ...input, economy: idle }).report).toBeNull();
  });
  it('legacy/malformed anchors never grant a shift, and corrupt reports are discarded', () => {
    for (const value of [undefined, null, {}, { sequence: -1, highWaterMs: NaN, session: {} },
      { sequence: 1, highWaterMs: 50, session: { sequence: 1, startedAtMs: 100 } }])
      expect(normalizeOfflineClock(value).session).toBeNull();
    expect(normalizeOfflineReport({ id: 'offline_personnel_1' })).toBeNull();
    expect(consumeOfflineClock(emptyOfflineClock(), 100).elapsedMs).toBe(0);
  });
});
