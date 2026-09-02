import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGame } from '@state/gameStore';
import { deserialize, serialize } from '@state/save';
import { createMarketForDay } from './market';
import { applyTransaction, createLedger, costBasisForUnits } from './settlement';
import { maxPoolSupplyQuantity, poolSupplyQuote, poolSupplyItem, POOL_SUPPLY, validPoolSupplyQuantity } from './pool-supply';
import { hasQuote, maxHasBuyMg, tradeHas } from './has-account';
import type { SettlementTransaction } from './types';

const initial = useGame.getState();
beforeEach(() => {
  const data = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => data.set(k, v) });
  useGame.setState({ ...initial, store: { ...initial.store, cash: 10_000_000, hasBalanceMg: 0, hasCostBasis: 0 },
    market: createMarketForDay(456, 5), inventory: [], items: {}, ledger: createLedger() }, true);
});
afterEach(() => { useGame.setState(initial, true); vi.unstubAllGlobals(); });

describe('cash-only three-family pooled counter', () => {
  it('has the canonical player-sellable supply families', () => {
    expect(POOL_SUPPLY.map(p => p.templateId)).toEqual([
      'gram_gold_1',
      'quarter_gold',
      'half_gold',
      'republic_gold',
      'ata_gold',
      'investment_bangle_22k_10',
    ]);
  });
  it.each([.1, 1, 2.5, 7, 40, 135, 135.2])('buys %s grams into the one pool and pays the quoted total', qty => {
    const s = useGame.getState();
    const quote = poolSupplyQuote('gram_gold_1', qty, s.market, s.store)!;
    s.buyPoolStock('gram_gold_1', qty);
    expect(useGame.getState().inventory).toHaveLength(1);
    expect(useGame.getState().inventory[0]?.quantityMg).toBe(Math.round(qty * 1000));
    expect(useGame.getState().store.cash).toBe(s.store.cash - quote.totalPrice);
    expect(useGame.getState().inventory[0]?.costBasis).toBeCloseTo(quote.totalPrice, 8);
  });
  it.each([.001, .01, 2.55, 8.034])('rejects gram quantities with more than one decimal: %s', qty => {
    expect(validPoolSupplyQuantity('gram_gold_1', qty)).toBe(false);
  });
  it.each([1, 10, 40, 135, 250])('buys %s quarters without a lot cap', qty => {
    useGame.getState().buyPoolStock('quarter_gold', qty);
    expect(useGame.getState().inventory[0]?.quantity).toBe(qty);
  });
  it.each(['half_gold', 'republic_gold', 'ata_gold'] as const)('buys and stacks requested coin stock: %s', templateId => {
    useGame.getState().buyPoolStock(templateId, 2);
    useGame.getState().buyPoolStock(templateId, 1);
    const position = useGame.getState().inventory[0];
    expect(position?.quantity).toBe(3);
    expect(position?.poolId).toBe(
      templateId === 'half_gold' ? 'HALF_GOLD_POOL' : templateId === 'republic_gold' ? 'REPUBLIC_GOLD_POOL' : 'ATA_GOLD_POOL',
    );
  });
  it.each([0, -1, .5, 135.5, NaN, Infinity])('rejects invalid quarter quantity %s without financial mutations', qty => {
    const s = useGame.getState();
    s.buyPoolStock('quarter_gold', qty);
    expect(useGame.getState().inventory).toEqual([]);
    expect(useGame.getState().store.cash).toBe(s.store.cash);
  });
  it('40g + 30g - 50g gives 20g with pool weighted-average cost preserved', () => {
    useGame.getState().buyPoolStock('investment_bangle_22k_10', 4);
    const a = useGame.getState().inventory[0]!.costBasis;
    useGame.setState({ market: { ...useGame.getState().market, goldSpot: useGame.getState().market.goldSpot * 1.1 } });
    const b = poolSupplyQuote('investment_bangle_22k_10', 3, useGame.getState().market, useGame.getState().store)!.totalPrice;
    useGame.getState().buyPoolStock('investment_bangle_22k_10', 3);
    const s = useGame.getState(), p = s.inventory[0]!;
    expect(s.inventory).toHaveLength(1);
    expect(p.quantityMg).toBe(70000);
    expect(p.averageCostPerUnit).toBeCloseTo((a + b) / 7, 8);
    expect(costBasisForUnits(p, 5)).toBeCloseTo((a + b) * 5 / 7, 8);
    const result = applyTransaction(s, { txId: 'customer-50g', dealId: 'customer-50g', day: 5, cashDelta: 250000,
      itemsIn: [], itemsOut: [{ itemId: p.itemId, quantity: 5 }], trustDelta: 0, reputationDelta: 0, xpDelta: 0, label: '50g customer sale' });
    expect(result.applied).toBe(true);
    expect(result.state.inventory[0]?.quantityMg).toBe(20000);
    expect(result.state.inventory[0]?.costBasis).toBeCloseTo((a + b) * 2 / 7, 8);
    expect(result.state.inventory[0]?.averageCostPerUnit).toBe(p.averageCostPerUnit);
    expect(deserialize(serialize({ ...s, ...result.state })).inventory[0]?.quantityMg).toBe(20000);
  });
  it.each([.5, 1.5, 13.5])('rejects bangle amount of %s ten-gram units', quantity => {
    expect(validPoolSupplyQuantity('investment_bangle_22k_10', quantity)).toBe(false);
  });
  it.each(POOL_SUPPLY.map(p => p.templateId))('maximum for %s uses the actual volume-aware quote and cash', templateId => {
    const s = useGame.getState();
    const max = maxPoolSupplyQuantity(templateId, s.market, s.store);
    const step = templateId === 'gram_gold_1' ? .1 : 1;
    const over = Math.round((max + step) * 10) / 10;
    expect(poolSupplyQuote(templateId, max, s.market, s.store)!.totalPrice).toBeLessThanOrEqual(s.store.cash);
    expect(poolSupplyQuote(templateId, over, s.market, s.store)!.totalPrice).toBeGreaterThan(s.store.cash);
    s.buyPoolStock(templateId, over);
    expect(useGame.getState().store.cash).toBe(s.store.cash);
    expect(useGame.getState().store.supplier.openInvoices).toEqual(s.store.supplier.openInvoices);
  });
  it('respects physical space for a new family but can top up an existing full-slot pool', () => {
    useGame.setState({ store: { ...useGame.getState().store, backStockSlots: 1 } });
    useGame.getState().buyPoolStock('gram_gold_1', 7);
    useGame.getState().buyPoolStock('quarter_gold', 1);
    useGame.getState().buyPoolStock('gram_gold_1', 135.2);
    expect(useGame.getState().inventory).toHaveLength(1);
    expect(useGame.getState().inventory[0]?.quantityMg).toBe(142200);
  });
  function intake(): SettlementTransaction {
    const s = useGame.getState(), quantity = 10;
    const total = poolSupplyQuote('quarter_gold', quantity, s.market, s.store)!.totalPrice;
    return { txId: 'pool-test', dealId: 'pool-test', day: 5, cashDelta: -total, poolPurchase: { quantity },
      itemsIn: [{ ...poolSupplyItem('quarter_gold'), id: 'pool-test-item', location: 'backStock', buyCost: total / quantity }],
      itemsOut: [], trustDelta: 0, reputationDelta: 0, xpDelta: 0, label: 'pool-test' };
  }
  it('transaction validation rejects tampered quantity and amount; duplicate is idempotent', () => {
    const s = useGame.getState(), tx = intake();
    expect(applyTransaction(s, { ...tx, poolPurchase: { quantity: 1.5 } }).applied).toBe(false);
    expect(applyTransaction(s, { ...tx, cashDelta: -1 }).applied).toBe(false);
    const forged = { ...tx.itemsIn[0]!, truth: { ...tx.itemsIn[0]!.truth, grossWeight: 100 } };
    expect(applyTransaction(s, { ...tx, itemsIn: [forged] }).applied).toBe(false);
    const applied = applyTransaction(s, tx);
    expect(applied.applied).toBe(true);
    expect(applyTransaction(applied.state, tx).applied).toBe(false);
  });
});

describe('HAS slider-compatible existing precision and limits', () => {
  it.each([.25, 1.80, 7.35, 36.72, 106.85])('buys then sells %s g using existing HAS transactions', grams => {
    const s = useGame.getState();
    const bought = tradeHas(s, s.market, 'buy', Math.round(grams * 1000), 'has-buy');
    expect(bought.applied).toBe(true);
    expect(bought.state.store.hasBalanceMg).toBe(Math.round(grams * 1000));
    const sold = tradeHas(bought.state, s.market, 'sell', Math.round(grams * 1000), 'has-sell');
    expect(sold.applied).toBe(true);
    expect(sold.state.store.hasBalanceMg).toBe(0);
  });
  it('MAX buy and all-sell enforce cash/balance on every day including overshoot', () => {
    const s = useGame.getState(), quote = hasQuote(s.market, s.store);
    const max = maxHasBuyMg(s.store.cash, quote.buy);
    expect(tradeHas(s, s.market, 'buy', max + 1, 'over').applied).toBe(false);
    const bought = tradeHas(s, s.market, 'buy', max, 'max');
    expect(bought.applied).toBe(true);
    expect(tradeHas(bought.state, s.market, 'sell', max + 1, 'over-sell').applied).toBe(false);
    expect(tradeHas(bought.state, s.market, 'sell', max, 'all').state.store.hasBalanceMg).toBe(0);
    expect(tradeHas(s, { ...s.market, day: 6 }, 'buy', 1000, 'saturday').applied).toBe(true);
  });
});
