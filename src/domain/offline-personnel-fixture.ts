// Synthetic test/dev fixture, never imported by the production entry.
import { armOfflineClock, emptyOfflineClock, OFFLINE_MAX_MS } from './offline-personnel';
import { createMarketForDay } from './market';
import { createLedger, type EconomyState } from './settlement';
import { spawnItem } from './item-spawn';
import { defaultSkillProgress } from './skill-tree';
import type { StoreState } from './types';

export function offlineFixture() {
  const market = { ...createMarketForDay(42, 1), clockMinutes: 600, goldSpot: 7100 };
  const store: StoreState = { name: 'QA', cash: 1_000_000, reputation: 70, level: 10,
    xp: 0, xpToNext: 580, storeTier: 3, displaySlots: 8, backStockSlots: 16, workshopCapacity: 2,
    personnelCount: 1, personnelRoles: ['sales'], staff: [], dailyOverhead: 1200,
    supplier: { trust: 65, limit: 100_000, terms: 7, openInvoices: [], priceBand: 1, specialLotEligibility: false }, payables: [] };
  const templates = ['gram_gold_1', 'quarter_gold', 'half_gold', 'full_gold', 'ring_14k', 'bracelet_22k_thin', 'necklace_18k'];
  const items = Object.fromEntries(templates.map((id, index) => {
    const item = { ...spawnItem(42, index, id), location: 'display' as const, buyCost: 100 };
    return [item.id, item];
  }));
  const economy: EconomyState = { store, items, ledger: createLedger(), inventory: Object.values(items).map(item => ({
    itemId: item.id, quantity: 100, costBasis: 10_000, currentValue: 100_000, age: 0,
    demand: 'steady' as const, thesis: null, location: 'display' as const, expectedExitValues: {},
  })) };
  return { economy, market, seed: 42, clock: armOfflineClock(emptyOfflineClock(), 1_000_000),
    now: 1_000_000 + OFFLINE_MAX_MS, customers: {}, skills: defaultSkillProgress(), pendingWages: 40_000 / 30 };
}
