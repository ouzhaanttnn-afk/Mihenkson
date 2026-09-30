import { describe, expect, it } from 'vitest';
import { useGame } from '@state/gameStore';
import { createMarketForDay } from './market';
import { financedPoolSupply, maxFinancedPoolSupplyQuantity } from './financed-pool-supply';
import { maxPoolSupplyQuantity, POOL_SUPPLY, poolSupplyItem, poolSupplyQuote } from './pool-supply';
import { poolForTemplate } from './stock-pools';
import { applyTransaction, costBasisForUnits, createLedger, type EconomyState } from './settlement';
import { creditLimit, financeTerms, usedLimit } from './wholesaler';
import type { InventoryPosition, StoreState } from './types';

const market = { ...createMarketForDay(456, 5), goldSpot: 7100 };
const initialStore = useGame.getState().store;

function economy(overrides: Partial<StoreState> = {}): EconomyState {
  return { market, store: { ...initialStore, storeTier: 3, reputation: 70, cash: 2_000_000,
    displaySlots: 8, backStockSlots: 1,
    supplier: { ...initialStore.supplier, trust: 70, limit: 20_000_000, openInvoices: [] }, ...overrides },
    items: {}, inventory: [], ledger: createLedger() };
}
function fill(state: EconomyState, templateId: string, quantity = 1, unitCost = 10_000): EconomyState {
  const item = { ...poolSupplyItem(templateId), id: `owned-${templateId}`, location: 'backStock' as const, buyCost: unitCost };
  const position: InventoryPosition = { itemId: item.id, poolId: poolForTemplate(templateId), quantity,
    quantityMg: templateId === 'gram_gold_1' ? quantity * 1000 : undefined,
    costBasis: quantity * unitCost, averageCostPerUnit: unitCost, currentValue: quantity * unitCost,
    age: 3, demand: 'steady', location: 'backStock', thesis: null, expectedExitValues: {} };
  return { ...state, items: { [item.id]: item }, inventory: [position] };
}
function bookNetWorth(state: EconomyState): number {
  return state.store.cash + state.inventory.reduce((sum, position) => sum + position.costBasis, 0) - usedLimit(state.store.supplier);
}

describe('atomic financed canonical pool supply', () => {
  it('buys one kilogram with real cash, debt, finance cost and exactly one million mg', () => {
    const before = economy(), snapshot = structuredClone(before);
    const quote = poolSupplyQuote('gram_gold_1', 1000, market, before.store)!;
    const terms = financeTerms(before.store, quote.totalPrice, market.day);
    expect(terms.financed).toBeGreaterThan(0);
    expect(terms.blockedReason).toBeNull();
    const result = financedPoolSupply(before, market, 'gram_gold_1', 1000);
    expect(result.applied).toBe(true);
    expect(result.state.store.cash).toBe(before.store.cash - terms.fromCash);
    expect(result.state.inventory).toHaveLength(1);
    expect(result.state.inventory[0]).toMatchObject({ poolId: '24K_GRAM_GOLD_POOL', quantity: 1000,
      quantityMg: 1_000_000, costBasis: quote.totalPrice + terms.financeCost });
    const position = result.state.inventory[0]!;
    expect(costBasisForUnits(position, 1000)).toBeCloseTo(quote.totalPrice + terms.financeCost, 8);
    expect(result.state.items[position.itemId]!.truth).toMatchObject({ grossWeight: 1, netMetalWeight: 1,
      actualPurity: .995, actualKarat: '24K', hiddenFlaws: [] });
    expect(result.state.store.supplier.openInvoices).toHaveLength(1);
    expect(result.state.store.supplier.openInvoices[0]).toMatchObject({ amount: terms.totalDue, dueDay: terms.dueDay });
    expect(usedLimit(result.state.store.supplier) - usedLimit(before.store.supplier)).toBe(terms.totalDue);
    expect(result.state.ledger.transactions).toHaveLength(1);
    expect(result.state.ledger.transactions[0]!.cashDelta).toBe(-terms.fromCash);
    expect(result.state.ledger.realizedProfitTotal).toBe(0);
    expect(bookNetWorth(result.state)).toBeCloseTo(bookNetWorth(before), 8);
    expect(before).toEqual(snapshot);
  });
  it('rejects a new family in full storage before creating cash, invoice or ledger changes', () => {
    const before = fill(economy(), 'quarter_gold'), snapshot = structuredClone(before);
    const result = financedPoolSupply(before, market, 'gram_gold_1', 1000);
    expect(result.applied).toBe(false);
    expect(result.reasonCode).toBe('stock-capacity');
    expect(result.state).toBe(before);
    expect(before).toEqual(snapshot);
    expect(result.state.store.supplier.openInvoices).toEqual([]);
    expect(result.state.ledger.transactions).toEqual([]);
  });
  it('refills an existing full-slot gram pool losslessly and retains weighted cost', () => {
    const before = fill(economy(), 'gram_gold_1', 20, 7000);
    const quote = poolSupplyQuote('gram_gold_1', 1000, market, before.store)!;
    const terms = financeTerms(before.store, quote.totalPrice, market.day);
    const result = financedPoolSupply(before, market, 'gram_gold_1', 1000);
    expect(result.applied).toBe(true);
    expect(result.state.inventory).toHaveLength(1);
    expect(result.state.inventory[0]).toMatchObject({ quantity: 1020, quantityMg: 1_020_000 });
    expect(result.state.inventory[0]!.costBasis).toBeCloseTo(140_000 + quote.totalPrice + terms.financeCost, 8);
    expect(result.state.inventory[0]!.averageCostPerUnit).toBeCloseTo((140_000 + quote.totalPrice + terms.financeCost) / 1020, 8);
    expect(bookNetWorth(result.state)).toBeCloseTo(bookNetWorth(before), 8);
  });
  it('ten financed bangle units remain 100g instead of becoming a single 10g unit', () => {
    const before = economy({ cash: 200_000 });
    const result = financedPoolSupply(before, market, 'investment_bangle_22k_10', 10);
    expect(result.applied).toBe(true);
    expect(result.state.inventory[0]).toMatchObject({ poolId: '22K_INVESTMENT_BANGLE_POOL', quantity: 10, quantityMg: 100_000 });
    expect(bookNetWorth(result.state)).toBeCloseTo(bookNetWorth(before), 8);
  });
  it.each(['quarter_gold', 'half_gold', 'full_gold', 'republic_gold', 'ata_gold', 'small_ingot'])
    ('rejects fractional %s before producing any goods or debt', templateId => {
      const before = economy(), snapshot = structuredClone(before);
      expect(financedPoolSupply(before, market, templateId, 1.5)).toMatchObject({ applied: false, state: before });
      expect(before).toEqual(snapshot);
    });
  it('declines a genuine kilogram quote when cash and available credit cannot cover it', () => {
    const before = economy({ cash: 5000, supplier: { ...initialStore.supplier, trust: 70, limit: 1000, openInvoices: [] } });
    const snapshot = structuredClone(before);
    expect(poolSupplyQuote('gram_gold_1', 1000, market, before.store)).not.toBeNull();
    const result = financedPoolSupply(before, market, 'gram_gold_1', 1000);
    expect(result.applied).toBe(false);
    expect(result.state).toBe(before);
    expect(before).toEqual(snapshot);
  });
  it('counts finance charges against credit room as well as principal', () => {
    const provisional = economy({ cash: 0 });
    const quote = poolSupplyQuote('gram_gold_1', 1000, market, provisional.store)!;
    const creditFactor = creditLimit(provisional.store) / provisional.store.supplier.limit;
    const before = { ...provisional, store: { ...provisional.store,
      supplier: { ...provisional.store.supplier, limit: Math.ceil(quote.totalPrice / creditFactor) } } };
    const terms = financeTerms(before.store, quote.totalPrice, market.day);
    expect(terms.financed).toBeLessThanOrEqual(terms.availableLimit);
    expect(terms.totalDue).toBeGreaterThan(terms.availableLimit);
    expect(financedPoolSupply(before, market, 'gram_gold_1', 1000)).toMatchObject({ applied: false, state: before });
  });
  it('settlement replay cannot take more cash, add more gold or record an invoice twice', () => {
    const before = economy();
    const bought = financedPoolSupply(before, market, 'gram_gold_1', 1000);
    expect(bought.applied).toBe(true);
    const replay = applyTransaction(bought.state, bought.state.ledger.transactions[0]!);
    expect(replay.applied).toBe(false);
    expect(replay.state).toBe(bought.state);
  });
  it('cash-only maximum stays exact at kilogram-scale without being a wholesale lot cap', () => {
    const before = economy({ cash: 100_000_000 });
    const max = maxPoolSupplyQuantity('gram_gold_1', market, before.store);
    expect(max).toBeGreaterThan(1000);
    expect(poolSupplyQuote('gram_gold_1', max, market, before.store)!.totalPrice).toBeLessThanOrEqual(before.store.cash);
    expect(poolSupplyQuote('gram_gold_1', Math.round((max + .1) * 10) / 10, market, before.store)!.totalPrice).toBeGreaterThan(before.store.cash);
  });
});

describe('exact financed supply maximum', () => {
  it.each(POOL_SUPPLY.map(product => product.templateId))('%s MAX includes rounded interest and the next valid step is unaffordable', templateId => {
    const before = economy({ cash: 20_000 }), snapshot = structuredClone(before);
    const max = maxFinancedPoolSupplyQuantity(templateId, market, before.store);
    const step = templateId === 'gram_gold_1' ? .1 : 1;
    const next = Math.round((max + step) * 10) / 10;
    expect(max).toBeGreaterThan(0);
    const quote = poolSupplyQuote(templateId, max, market, before.store)!;
    const terms = financeTerms(before.store, quote.totalPrice, market.day);
    expect(terms.blockedReason).toBeNull();
    expect(terms.financed).toBeGreaterThan(0);
    expect(terms.totalDue).toBeLessThanOrEqual(terms.availableLimit);
    const nextQuote = poolSupplyQuote(templateId, next, market, before.store)!;
    const nextTerms = financeTerms(before.store, nextQuote.totalPrice, market.day);
    expect(!!nextTerms.blockedReason || nextTerms.totalDue > nextTerms.availableLimit).toBe(true);
    expect(financedPoolSupply(before, market, templateId, max).applied).toBe(true);
    expect(financedPoolSupply(before, market, templateId, next)).toMatchObject({ applied: false, state: before });
    expect(before).toEqual(snapshot);
  });
  it('overdue debt blocks credit MAX while the separate cash-only maximum stays available', () => {
    const before = economy();
    before.store.supplier = { ...before.store.supplier,
      openInvoices: [{ id: 'overdue', amount: 1000, dueDay: market.day - 1 }] };
    const snapshot = structuredClone(before);
    const cashMax = maxPoolSupplyQuantity('gram_gold_1', market, before.store);
    expect(cashMax).toBeGreaterThan(0);
    expect(maxFinancedPoolSupplyQuantity('gram_gold_1', market, before.store)).toBe(0);
    expect(financeTerms(before.store, poolSupplyQuote('gram_gold_1', cashMax, market, before.store)!.totalPrice, market.day).blockedReason)
      .not.toBeNull();
    expect(financedPoolSupply(before, market, 'gram_gold_1', cashMax)).toMatchObject({ applied: false, state: before });
    expect(before).toEqual(snapshot);
  });
  it('low trust with no available credit still permits the exact cash-funded quantity', () => {
    const before = economy();
    before.store.supplier = { ...before.store.supplier, trust: 0, limit: 0, openInvoices: [] };
    const cashMax = maxPoolSupplyQuantity('gram_gold_1', market, before.store);
    expect(creditLimit(before.store)).toBe(0);
    expect(maxFinancedPoolSupplyQuantity('gram_gold_1', market, before.store)).toBe(cashMax);
    const result = financedPoolSupply(before, market, 'gram_gold_1', cashMax);
    expect(result.applied).toBe(true);
    expect(result.state.store.supplier.openInvoices).toEqual([]);
    expect(result.state.inventory[0]?.quantity).toBe(cashMax);
  });
  it('zero cash can use existing approved credit without a new trust gate', () => {
    const before = economy({ cash: 0 });
    before.store.supplier = { ...before.store.supplier, trust: 0, limit: 100_000, openInvoices: [] };
    const max = maxFinancedPoolSupplyQuantity('gram_gold_1', market, before.store);
    expect(maxPoolSupplyQuantity('gram_gold_1', market, before.store)).toBe(0);
    expect(max).toBeGreaterThan(0);
    const result = financedPoolSupply(before, market, 'gram_gold_1', max);
    expect(result.applied).toBe(true);
    expect(result.state.store.cash).toBe(0);
    expect(result.state.store.supplier.openInvoices[0]?.amount).toBeGreaterThan(0);
    expect(bookNetWorth(result.state)).toBeCloseTo(bookNetWorth(before), 8);
  });
});
