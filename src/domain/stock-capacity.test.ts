import { describe, expect, it } from 'vitest';
import { deserialize, SAVE_VERSION, type SaveFile } from '@state/save';
import { spawnItem } from './item-spawn';
import { createMarketForDay } from './market';
import { poolSupplyItem, poolSupplyQuote } from './pool-supply';
import { applyTransaction, createLedger, type EconomyState } from './settlement';
import { stockCapacityBlock, stockUsage, type StockCapacityLocation } from './stock-capacity';
import { consolidatePools } from './stock-pools';
import type { InventoryPosition, ItemInstance, SettlementTransaction, StoreState } from './types';

const market = createMarketForDay(456, 5);

function store(): StoreState {
  return {
    name: 'Capacity test', cash: 1_000_000, reputation: 42, level: 2,
    xp: 0, xpToNext: 580, storeTier: 1, displaySlots: 2, backStockSlots: 2,
    workshopCapacity: 2, staff: [], dailyOverhead: 900,
    supplier: { trust: 50, limit: 40_000, terms: 3, priceBand: 1,
      specialLotEligibility: false, openInvoices: [{ id: 'existing-invoice', amount: 5_000, dueDay: 9 }] },
    payables: [{ id: 'existing-payable', amount: 1_000, dueDay: 8, label: 'Existing debt' }],
  };
}

function crafted(id: string, location: StockCapacityLocation = 'backStock'): ItemInstance {
  return { ...spawnItem(456, 3, 'ring_18k'), id, buyCost: 20_000, acquiredDay: 5, location };
}

function position(item: ItemInstance, quantity = 1): InventoryPosition {
  return {
    itemId: item.id, quantity, costBasis: (item.buyCost ?? 0) * quantity,
    currentValue: 30_000 * quantity, age: 2, demand: 'steady', thesis: null,
    location: item.location === 'display' ? 'display' : 'backStock', expectedExitValues: {},
  };
}

function economy(items: ItemInstance[] = []): EconomyState {
  return {
    market, store: store(), items: Object.fromEntries(items.map(item => [item.id, item])),
    inventory: items.map(item => position(item)), ledger: createLedger(),
  };
}

function intake(itemsIn: ItemInstance[], overrides: Partial<SettlementTransaction> = {}): SettlementTransaction {
  return {
    txId: 'intake', dealId: 'intake', day: 5, cashDelta: -20_000 * itemsIn.length,
    itemsIn, itemsOut: [], trustDelta: 0, reputationDelta: 2, xpDelta: 10,
    label: 'Stock intake', ...overrides,
  };
}

function poolIntake(state: EconomyState, templateId: string, quantity: number): SettlementTransaction {
  const quote = poolSupplyQuote(templateId, quantity, market, state.store)!;
  const item = { ...poolSupplyItem(templateId), id: `incoming-${templateId}`,
    location: 'backStock' as const, acquiredDay: 5, buyCost: quote.totalPrice / quantity };
  return intake([item], { cashDelta: -quote.totalPrice, poolPurchase: { quantity } });
}

function expectAtomicRejection(state: EconomyState, tx: SettlementTransaction, location: StockCapacityLocation) {
  const before = structuredClone(state);
  const outcome = applyTransaction(state, tx);
  expect(outcome).toMatchObject({ applied: false, reasonCode: 'stock-capacity', blockedStockLocation: location });
  expect(outcome.reason).toBe(location === 'display'
    ? 'Vitrin kapasitesi dolu; işlem uygulanmadı.' : 'Arka stok kapasitesi dolu; işlem uygulanmadı.');
  expect(outcome.state).toBe(state);
  expect(state).toEqual(before);
  expect(state.ledger.appliedTxIds).not.toContain(tx.txId);
}

describe('canonical stock capacity', () => {
  it('counts positions separately by physical location and excludes workshop custody', () => {
    expect(stockUsage([{ location: 'display' }, { location: 'backStock' },
      { location: 'backStock' }, { location: 'workshop' }])).toEqual({ display: 1, backStock: 2 });
  });

  it('grandfathers legacy overflow without increasing it', () => {
    const before = [{ location: 'backStock' }, { location: 'backStock' }];
    const limits = { displaySlots: 1, backStockSlots: 1 };
    expect(stockCapacityBlock(before, before, limits)).toBeNull();
    expect(stockCapacityBlock(before, before.slice(1), limits)).toBeNull();
    expect(stockCapacityBlock(before, [...before, { location: 'backStock' }], limits)).toBe('backStock');
  });

  it.each(['display', 'backStock'] as const)('rejects general intake into full %s atomically', location => {
    const state = economy([crafted('held-a', location), crafted('held-b', location)]);
    expectAtomicRejection(state, intake([crafted('new', location)]), location);
  });

  it('rejects an entire multi-item purchase when only one new position fits', () => {
    const state = economy([crafted('held')]);
    expectAtomicRejection(state, intake([crafted('incoming-a'), crafted('incoming-b')]), 'backStock');
  });

  it('keeps legacy positions untouched when rejected projection encounters stale pool metadata', () => {
    const state = economy([crafted('held-a'), crafted('held-b')]);
    state.inventory[0]!.poolId = 'QUARTER_GOLD_POOL';
    const incoming = { ...poolSupplyItem('quarter_gold'), id: 'incoming-quarter',
      location: 'backStock' as const, buyCost: 7_000 };
    expectAtomicRejection(state, intake([incoming, crafted('incoming-ring')]), 'backStock');
  });

  it('counts a wholesale lot after consolidation, rather than treating each unit as a slot', () => {
    const items = Array.from({ length: 40 }, (_, index) => ({ ...poolSupplyItem('half_gold'),
      id: `half-${index}`, location: 'backStock' as const, buyCost: 15_000, acquiredDay: 5 }));
    const state = economy([crafted('held')]);
    const outcome = applyTransaction(state, intake(items));
    expect(outcome.applied).toBe(true);
    expect(stockUsage(outcome.state.inventory)).toEqual({ display: 0, backStock: 2 });
    expect(outcome.state.inventory.find(p => p.poolId === 'HALF_GOLD_POOL')?.quantity).toBe(40);
    expect(outcome.state.inventory.reduce((sum, p) => sum + p.costBasis, 0)).toBe(620_000);
  });

  it('allows a pool top-up at capacity even when legacy positions lack pool metadata', () => {
    const gram = { ...poolSupplyItem('gram_gold_1'), id: 'held-gram', buyCost: 4_000,
      acquiredDay: 5, location: 'backStock' as const };
    const state = economy([crafted('held'), gram]);
    expect(state.inventory[1]?.poolId).toBeUndefined();
    const tx = poolIntake(state, 'gram_gold_1', 7);
    const outcome = applyTransaction(state, tx);
    expect(outcome.applied).toBe(true);
    expect(outcome.state.inventory).toHaveLength(2);
    const pool = outcome.state.inventory.find(p => p.poolId === '24K_GRAM_GOLD_POOL')!;
    expect(pool.quantity).toBe(8);
    expect(pool.costBasis).toBeCloseTo(4_000 - tx.cashDelta, 8);
    expect(state.inventory[1]?.quantity).toBe(1);
  });

  it('rejects a missing supply pool at capacity using the same readable result', () => {
    const state = economy([crafted('held-a'), crafted('held-b')]);
    expectAtomicRejection(state, poolIntake(state, 'quarter_gold', 2), 'backStock');
  });

  it('rejects a wholesale lot that adds a missing pool to full storage', () => {
    const state = economy([crafted('held-a'), crafted('held-b')]);
    const incoming = Array.from({ length: 3 }, (_, index) => ({ ...poolSupplyItem('half_gold'),
      id: `incoming-half-${index}`, location: 'backStock' as const, buyCost: 15_000 }));
    expectAtomicRejection(state, intake(incoming, { cashDelta: -45_000 }), 'backStock');
  });

  it('uses outgoing stock to free a position within the same full-capacity transaction', () => {
    const state = economy([crafted('held-a'), crafted('held-b')]);
    const outcome = applyTransaction(state, intake([crafted('replacement')],
      { itemsOut: [{ itemId: 'held-a', quantity: 1 }] }));
    expect(outcome.applied).toBe(true);
    expect(outcome.state.inventory.map(p => p.itemId)).toEqual(['held-b', 'replacement']);
    expect(outcome.state.store.cash).toBe(state.store.cash - 20_000);
    expect(outcome.state.store.supplier).toEqual(state.store.supplier);
  });

  it('does not use an outgoing display position to expand a full back stock', () => {
    const state = economy([crafted('held-display', 'display'), crafted('held-a'), crafted('held-b')]);
    expectAtomicRejection(state, intake([crafted('incoming')],
      { itemsOut: [{ itemId: 'held-display', quantity: 1 }] }), 'backStock');
  });

  it.each([0, -1, 2, NaN, Infinity])('does not treat invalid outgoing quantity %s as freed space', quantity => {
    const state = economy([crafted('held-a'), crafted('held-b')]);
    const outcome = applyTransaction(state, intake([crafted('incoming')],
      { itemsOut: [{ itemId: 'held-a', quantity }] }));
    expect(outcome.applied).toBe(false);
    expect(outcome.state).toBe(state);
    expect(state.ledger.appliedTxIds).toEqual([]);
  });

  it('rejects cumulative duplicate exits that exceed held stock', () => {
    const state = economy([crafted('held-a'), crafted('held-b')]);
    const outcome = applyTransaction(state, intake([crafted('incoming')], { itemsOut: [
      { itemId: 'held-a', quantity: 1 }, { itemId: 'held-a', quantity: 1 },
    ] }));
    expect(outcome.applied).toBe(false);
    expect(outcome.state).toBe(state);
  });

  it('allows existing-pool top-ups and exits after an overflowing save is loaded', () => {
    const quarter = { ...poolSupplyItem('quarter_gold'), id: 'held-quarter', buyCost: 7_000,
      acquiredDay: 5, location: 'backStock' as const };
    const state = economy([crafted('held-a'), crafted('held-b'), quarter]);
    state.ledger.realizedProfitTotal = 12_345;
    const pooled = consolidatePools(state.inventory, state.items);
    const file: SaveFile = { version: SAVE_VERSION, seed: 456, day: 5, clockMinutes: 540,
      market, spawnCounter: 0, jobCounter: 0, store: state.store,
      inventory: pooled.inventory, items: pooled.items, ledger: state.ledger,
      jobs: [], network: [], customers: {}, speed4xUnlocked: false };
    const loaded = deserialize(JSON.parse(JSON.stringify(file)));
    expect(stockUsage(loaded.inventory).backStock).toBe(3);
    expect(loaded.store.backStockSlots).toBe(2);
    expect(loaded.store.cash).toBe(state.store.cash);
    expect(loaded.inventory.reduce((sum, p) => sum + p.costBasis, 0)).toBe(47_000);

    const tx = poolIntake(loaded, 'quarter_gold', 2);
    const topped = applyTransaction(loaded, tx);
    expect(topped.applied).toBe(true);
    expect(stockUsage(topped.state.inventory).backStock).toBe(3);
    expect(topped.state.inventory.find(p => p.poolId === 'QUARTER_GOLD_POOL')?.quantity).toBe(3);
    expect(topped.state.ledger.realizedProfitTotal).toBe(12_345);
    expectAtomicRejection(topped.state, intake([crafted('new')], { txId: 'blocked-new' }), 'backStock');
    const exit = applyTransaction(topped.state, intake([], { txId: 'exit', cashDelta: 25_000,
      itemsOut: [{ itemId: 'held-a', quantity: 1 }] }));
    expect(exit.applied).toBe(true);
    expect(stockUsage(exit.state.inventory).backStock).toBe(2);
    // A meaningful top-up may earn the 1.3.0 capped relationship increment;
    // the unrelated exit must not change it again or modify existing invoices.
    expect(exit.state.store.supplier).toEqual(topped.state.store.supplier);
    expect(exit.state.store.supplier.openInvoices).toEqual(state.store.supplier.openInvoices);
    expect(exit.state.store.supplier.limit).toBe(state.store.supplier.limit);
    expect(exit.state.ledger.realizedProfitTotal).toBe(12_345);
  });

  it('allows same-occupancy replacement of legacy overflow without deleting other ownership', () => {
    const state = economy([crafted('held-a'), crafted('held-b'), crafted('held-c')]);
    const outcome = applyTransaction(state, intake([crafted('replacement')],
      { itemsOut: [{ itemId: 'held-a', quantity: 1 }] }));
    expect(outcome.applied).toBe(true);
    expect(outcome.state.inventory.map(p => p.itemId)).toEqual(['held-b', 'held-c', 'replacement']);
    expect(stockUsage(outcome.state.inventory).backStock).toBe(3);
  });

  it('allows a partial pool exit while legacy overflow remains', () => {
    const quarter = { ...poolSupplyItem('quarter_gold'), id: 'held-quarter', buyCost: 7_000,
      acquiredDay: 5, location: 'backStock' as const };
    const state = economy([crafted('held-a'), crafted('held-b'), quarter]);
    state.inventory[2] = position(quarter, 3);
    const outcome = applyTransaction(state, intake([], { cashDelta: 8_000,
      itemsOut: [{ itemId: quarter.id, quantity: 1 }] }));
    expect(outcome.applied).toBe(true);
    expect(stockUsage(outcome.state.inventory).backStock).toBe(3);
    expect(outcome.state.inventory.find(p => p.poolId === 'QUARTER_GOLD_POOL')?.quantity).toBe(2);
  });

  it('does not consume a rejected transaction ID, and an eventual successful retry applies once', () => {
    const state = economy([crafted('held-a'), crafted('held-b')]);
    const tx = intake([crafted('incoming')]);
    expectAtomicRejection(state, tx, 'backStock');
    const freed = applyTransaction(state, intake([], { txId: 'free-slot', cashDelta: 25_000,
      itemsOut: [{ itemId: 'held-a', quantity: 1 }] }));
    expect(freed.applied).toBe(true);
    const applied = applyTransaction(freed.state, tx);
    expect(applied.applied).toBe(true);
    expect(applied.state.ledger.appliedTxIds.filter(id => id === tx.txId)).toHaveLength(1);
    const replay = applyTransaction(applied.state, tx);
    expect(replay.applied).toBe(false);
    expect(replay.state).toBe(applied.state);
  });
});
