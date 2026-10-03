import { describe, expect, it } from 'vitest';
import { useGame } from '@state/gameStore';
import { deserialize, serialize } from '@state/save';
import { tierDef } from '@data/store-tiers';
import { createMarketForDay, marketEventPresentation } from './market';
import { poolSupplyItem, poolSupplyQuote } from './pool-supply';
import { applyTransaction, createLedger, type EconomyState } from './settlement';
import { creditLimit, financeTerms, usedLimit } from './wholesaler';
import { evaluateUpgrade } from './store-growth';
import { WHOLESALE } from './balance';
import type { MarketEvent, SettlementTransaction } from './types';

const initial = useGame.getState();
function economy(cash = 1_000_000, trust = 50): EconomyState {
  return { market: { ...createMarketForDay(130, 1), goldSpot: 7100 }, store: {
    ...initial.store, cash, supplier: { ...initial.store.supplier, trust, limit: 1_000_000, openInvoices: [] },
  }, inventory: [], items: {}, ledger: createLedger() };
}
function purchase(s: EconomyState, quantity: number, financed = false): SettlementTransaction {
  const quote = poolSupplyQuote('gram_gold_1', quantity, s.market!, s.store)!;
  const terms = financed ? financeTerms(s.store, quote.totalPrice, s.market!.day) : null;
  return { txId: 'supply130', dealId: 'supply130', day: s.market!.day,
    cashDelta: -(terms?.fromCash ?? quote.totalPrice), poolPurchase: { quantity, financed },
    itemsIn: [{ ...poolSupplyItem('gram_gold_1'), id: 'supply130-item', location: 'backStock',
      buyCost: (quote.totalPrice + (terms?.financeCost ?? 0)) / quantity }], itemsOut: [],
    trustDelta: 0, reputationDelta: 0, xpDelta: 0, label: 'Supply' };
}

describe('1.3.0 measured supplier progression, without changing cash or invoices', () => {
  it('grants exactly the same meaningful trust for both fully-cash UI routes', () => {
    const before = economy(), snapshot = structuredClone(before);
    const cashTx = purchase(before, 40), financedTx = purchase(before, 40, true);
    expect(-cashTx.cashDelta).toBeGreaterThanOrEqual(creditLimit(before.store) * WHOLESALE.tradeTrustMinShare);
    const cash = applyTransaction(before, cashTx), financed = applyTransaction(before, financedTx);
    expect(cash.applied).toBe(true); expect(financed.applied).toBe(true);
    expect(cash.state.store).toEqual(financed.state.store);
    expect(cash.state.inventory).toEqual(financed.state.inventory);
    expect(cash.state.store.supplier.trust).toBe(51);
    expect(cash.state.store.supplier.openInvoices).toEqual([]);
    expect(cash.state.store.cash).toBe(before.store.cash + cashTx.cashDelta);
    expect(cash.state.inventory[0]!.costBasis).toBeCloseTo(-cashTx.cashDelta, 8);
    expect(cash.state.ledger.realizedProfitTotal).toBe(0);
    expect(before).toEqual(snapshot);
    const replay = applyTransaction(cash.state, cashTx);
    expect(replay).toMatchObject({ applied: false, state: cash.state });
    expect(replay.state.store.supplier.trust).toBe(51);
  });
  it('retains actual principal, finance cost, maturity and one trust increment when cash is insufficient', () => {
    const before = economy(100_000), tx = purchase(before, 40, true);
    const quote = poolSupplyQuote('gram_gold_1', 40, before.market!, before.store)!;
    const terms = financeTerms(before.store, quote.totalPrice, 1);
    expect(terms.financed).toBeGreaterThan(0);
    const result = applyTransaction(before, tx);
    expect(result.applied).toBe(true);
    expect(result.state.store.cash).toBe(0);
    expect(result.state.store.supplier.trust).toBe(51);
    expect(result.state.store.supplier.openInvoices).toEqual([{ id: tx.txId, amount: terms.totalDue, dueDay: terms.dueDay }]);
    expect(result.state.inventory[0]!.costBasis).toBeCloseTo(quote.totalPrice + terms.financeCost, 8);
    const bookNet = result.state.store.cash + result.state.inventory[0]!.costBasis - usedLimit(result.state.store.supplier);
    expect(bookNet).toBeCloseTo(before.store.cash, 8);
    expect(applyTransaction(result.state, tx).state).toBe(result.state);
  });
  it('does not give trust for small purchases or unsuccessful/forged transactions', () => {
    const before = economy(), small = purchase(before, 1);
    expect(-small.cashDelta).toBeLessThan(creditLimit(before.store) * WHOLESALE.tradeTrustMinShare);
    expect(applyTransaction(before, small).state.store.supplier.trust).toBe(50);
    const forged = { ...purchase(before, 40), cashDelta: -1 };
    expect(applyTransaction(before, forged)).toMatchObject({ applied: false, state: before });
    const full = { ...before, store: { ...before.store, backStockSlots: 0 } };
    expect(applyTransaction(full, purchase(full, 40))).toMatchObject({ applied: false, state: full });
  });
  it.each([64, 65, 85])('caps new trade trust without reducing existing %s trust', trust => {
    const before = economy(1_000_000, trust);
    expect(applyTransaction(before, purchase(before, 40)).state.store.supplier.trust).toBe(Math.min(65, trust + 1) < trust ? trust : Math.min(65, trust + 1));
  });
  it('preserves an existing saved supplier account; no replay or retroactive trust reward', () => {
    const before = economy(), bought = applyTransaction(before, purchase(before, 40)).state;
    // A pre-update cash purchase exists in the ledger but earned no trust.
    bought.store = { ...bought.store, supplier: { ...bought.store.supplier, trust: 50 } };
    const file = serialize({ ...initial, ...bought, market: bought.market!, businessStoryBaseline: null });
    const loaded = deserialize(file);
    expect(loaded.store.supplier.trust).toBe(50);
    expect(loaded.store.cash).toBe(bought.store.cash);
    expect(loaded.inventory).toEqual(bought.inventory);
    expect(loaded.ledger.appliedTxIds).toEqual(bought.ledger.appliedTxIds);
  });
});

describe('1.3.0 minimum calibrated gates and truthful public event copy', () => {
  it.each([2, 3, 4] as const)('opens only new eligibility, not a free tier %s', tier => {
    const definition = tierDef(tier), requires = definition.requires!;
    expect(requires.supplierTrust).toBe([58, 62, 65][tier - 2]);
    expect(requires.level).toBe([3, 6, 10][tier - 2]);
    expect(definition.investment).toBe([220_000, 850_000, 2_600_000][tier - 2]);
    const store = { ...economy().store, storeTier: (tier - 1) as 1 | 2 | 3 };
    const snapshot = { ...requires, cash: definition.investment };
    expect(evaluateUpgrade(store, snapshot).ready).toBe(true);
    expect(evaluateUpgrade(store, { ...snapshot, cash: definition.investment - 1 }).ready).toBe(false);
    expect(store.storeTier).toBe(tier - 1);
    expect(definition.unlocks.join(' ')).not.toMatch(/gümüş|Toptancı limiti büyür/);
  });
  it('replaces stale public descriptions without rerolling an old event or changing its timing', () => {
    const old: MarketEvent = { id: 'wedding_season', label: 'Old', description: 'atölye kapasitesi artar',
      affects: ['capacity'], counterplay: ['unsupported'], startedDay: 10, durationDays: 3 };
    const snapshot = structuredClone(old), current = marketEventPresentation(old)!;
    expect(current.description).not.toContain('atölye');
    expect(current.startedDay).toBe(10); expect(current.durationDays).toBe(3); expect(current.id).toBe(old.id);
    expect(old).toEqual(snapshot);
    expect(marketEventPresentation(null)).toBeNull();
  });
});
