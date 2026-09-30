import { describe, expect, it } from 'vitest';
import { bullionMeta } from '@data/bullion';
import { getLanguage, setLanguage } from '@i18n/index';
import { getTemplate } from '@data/item-templates';
import { rulesFor } from '@data/product-classes';
import { START } from './balance';
import { createMarketForDay } from './market';
import { applyMove, createSession } from './negotiation';
import { personnelSale } from './personnel-sale';
import { purchaseNegotiationContext } from './purchase-negotiation-context';
import { createPurchaseSession, packageFitPenalty, packagePriceBand, purchaseCeiling, repricePackage } from './purchase';
import { createLedger, type EconomyState } from './settlement';
import { spawnItem } from './item-spawn';
import type { Customer, CustomerDemand, InventoryPosition, StoreState } from './types';
import { trueValue } from './valuation';

const market = { ...createMarketForDay(42, 1), goldSpot: 7100 };

function fixture(templateId = 'gram_gold_1', quantity = 1, unitCost = 100) {
  const store: StoreState = {
    name: 'Staff test', cash: START.cash, reputation: 50, level: 3, xp: 0, xpToNext: 580,
    storeTier: 3, displaySlots: 8, backStockSlots: 16, workshopCapacity: 2, staff: [],
    supplier: { trust: 65, limit: START.supplierLimit, terms: START.supplierTerms,
      openInvoices: [], priceBand: 1, specialLotEligibility: false },
    payables: [], dailyOverhead: START.dailyOverhead,
  };
  const spawned = spawnItem(42, 7, templateId);
  const meta = bullionMeta(templateId);
  const item = { ...spawned, id: `${spawned.id}_${templateId}`, location: 'display' as const, buyCost: unitCost,
    ...(meta ? { truth: { ...spawned.truth, actualPurity: meta.unitPurity, craftsmanship: 0, hiddenFlaws: [] } } : {}) };
  const position: InventoryPosition = { itemId: item.id, quantity, costBasis: unitCost * quantity,
    currentValue: trueValue(item, market) * quantity, age: 0, demand: 'steady',
    thesis: null, location: 'display', expectedExitValues: {} };
  const demand: CustomerDemand = { families: [item.family], wantsBullion: !!meta, templateId,
    quantity, minQuantity: quantity, acceptsPartial: false, isBulk: quantity >= 10,
    summary: 'Staff order', alternativesLabel: '' };
  const customer: Customer = { id: 'staff-buyer', displayName: 'Staff buyer', archetype: 'investor',
    intent: 'buy', patienceMax: 8, patience: 8, knowledge: 80, urgency: 50,
    priceSensitivity: 80, status: 50, budget: 100_000_000, reservationPrice: 0,
    purchaseCeilingRatio: 1.15, demand, trust: 50, suspicion: 0, visitHistory: [],
    preferences: [], referralSource: null, lineIds: [] };
  const economy: EconomyState = { store, items: { [item.id]: item }, inventory: [position], ledger: createLedger() };
  const lines = [{ itemId: item.id, quantity }];
  return { economy, customer, item, demand, lines };
}

describe('Mihenk 1.2.0 · staff sale acceptance and accounting', () => {
  it('localizes stored sale text from semantic demand without changing its economics', () => {
    const setup = fixture('gram_gold_1', 2);
    const customer = { ...setup.customer, demand: { ...setup.demand,
      poolId: '24K_GRAM_GOLD_POOL' as const, summary: 'Eski Türkçe kayıt' } };
    const previousLanguage = getLanguage();
    try {
      setLanguage('tr');
      const tr = personnelSale(setup.economy, customer, market)!;
      setLanguage('en');
      const en = personnelSale(setup.economy, customer, market)!;
      expect(en.ledger.transactions[0]?.label).toBe('Staff sale · 2 grams of gold');
      expect(en.ledger.deals[0]?.reviewData?.keyDecisionPoint)
        .toBe('Staff: full order with a price at least 1% above cost');
      expect(en.store.cash).toBe(tr.store.cash);
      expect(en.inventory).toEqual(tr.inventory);
      expect(en.ledger.deals[0]?.price).toBe(tr.ledger.deals[0]?.price);
      expect(en.ledger.realizedProfitTotal).toBe(tr.ledger.realizedProfitTotal);
    } finally {
      setLanguage(previousLanguage);
    }
  });

  it('uses the existing manual acceptance contract across market products and customer profiles', () => {
    let accepted = 0;
    let refused = 0;
    for (const templateId of ['gram_gold_1', 'quarter_gold', 'ring_14k', 'bracelet_22k_thin', 'necklace_18k']) {
      for (const ratio of [0.95, 1, 1.05, 1.1, 1.15, 1.25]) {
        for (const trust of [0, 50, 100]) {
          for (const suspicion of [0, 50, 100]) {
            const setup = fixture(templateId);
            const customer = { ...setup.customer, purchaseCeilingRatio: ratio, trust, suspicion };
            const purchase = repricePackage(createPurchaseSession(setup.demand), setup.lines,
              setup.economy.items, setup.economy.inventory, customer, market);
            const productRules = rulesFor(getTemplate(templateId));
            // Independently retain the pre-extraction manual single-product contract.
            const manual = applyMove(createSession('manual', setup.item.id), {
              customer, direction: 'shopSells', reputation: setup.economy.store.reputation,
              buyCeiling: 0, knowledge: [], economicBand: packagePriceBand(setup.lines, setup.economy.items, market),
              purchaseCeiling: Math.round(purchaseCeiling(customer, purchase.packageFairValue) *
                packageFitPenalty(setup.demand, setup.lines, setup.economy.items).ceilingMultiplier),
              fairValue: trueValue(setup.item, market), haggleRoom: Math.min(1, productRules.haggleRoom),
              retailSpread: productRules.retailSpread,
            }, { kind: 'offer', amount: purchase.suggestedPrice, atRound: 0 });
            const sale = personnelSale(setup.economy, customer, market);
            expect(!!sale, `${templateId}, ratio ${ratio}, trust ${trust}, suspicion ${suspicion}`)
              .toBe(manual.response.state === 'ACCEPTED');
            if (sale) accepted++; else refused++;
          }
        }
      }
    }
    expect(accepted).toBeGreaterThan(0);
    expect(refused).toBeGreaterThan(0);
  });

  it.each([1, 10, 1000])('a real %i-gram sale reconciles cash, cost, stock and profit once', quantity => {
    const { economy, customer } = fixture('gram_gold_1', quantity, 5000);
    const before = JSON.parse(JSON.stringify(economy)) as EconomyState;
    const result = personnelSale(economy, customer, market)!;
    expect(result).not.toBeNull();
    expect(economy).toEqual(before);
    const deal = result.ledger.deals[0]!;
    expect(deal.costBasis).toBe(5000 * quantity);
    expect(deal.units).toBe(quantity);
    expect(deal.grams).toBe(quantity);
    expect(deal.price).toBeGreaterThanOrEqual(Math.ceil(deal.costBasis * 1.01));
    expect(deal.price).toBeLessThanOrEqual(customer.budget);
    expect(result.store.cash - economy.store.cash).toBe(deal.price);
    expect(result.ledger.realizedProfitTotal).toBe(deal.price - deal.costBasis);
    expect(result.ledger.realizedProfitToday).toBe(deal.price - deal.costBasis);
    expect(result.inventory).toHaveLength(0);
    expect(result.ledger.transactions).toHaveLength(1);
    expect(personnelSale(result, customer, market)).toBeNull();
  });

  it('partial sale realizes only the sold share of cost and cannot repeat after save/load', () => {
    const setup = fixture('gram_gold_1', 10, 5000);
    const customer = { ...setup.customer, demand: { ...setup.demand, quantity: 2, minQuantity: 2 } };
    const result = personnelSale(setup.economy, customer, market)!;
    expect(result.inventory[0]?.quantity).toBe(8);
    expect(result.inventory[0]?.costBasis).toBe(40_000);
    expect(result.ledger.deals[0]?.costBasis).toBe(10_000);
    expect(result.ledger.realizedProfitTotal).toBe(result.ledger.deals[0]!.price - 10_000);
    const loaded = JSON.parse(JSON.stringify(result)) as EconomyState;
    expect(personnelSale(loaded, customer, market)).toBeNull();
  });

  it('separate same-day visits share person identity but never share their transaction identity', () => {
    const setup = fixture('gram_gold_1', 10, 5000);
    const customer = { ...setup.customer, visitId: 'arrival_1',
      demand: { ...setup.demand, quantity: 2, minQuantity: 2 } };
    const first = personnelSale(setup.economy, customer, market)!;
    const loaded = JSON.parse(JSON.stringify(first)) as EconomyState;
    expect(personnelSale(loaded, customer, { ...market, clockMinutes: market.clockMinutes + 2 })).toBeNull();
    const second = personnelSale(loaded, { ...customer, visitId: 'arrival_2' }, market)!;
    expect(second.inventory[0]?.quantity).toBe(6);
    expect(second.ledger.deals).toHaveLength(2);
    expect(new Set(second.ledger.appliedTxIds).size).toBe(2);
    expect(second.ledger.deals.map(deal => deal.customerId)).toEqual([customer.id, customer.id]);
    expect(personnelSale(second, { ...customer, visitId: 'arrival_2' }, market)).toBeNull();
  });

  it.each([1, 10, 1000])('a %i-gram sale cannot exceed a budget below the package market band', quantity => {
    const setup = fixture('gram_gold_1', quantity);
    const customer = { ...setup.customer, budget: 7000 * quantity, trust: 100, urgency: 100 };
    expect(personnelSale(setup.economy, customer, market)).toBeNull();
    expect(setup.economy.ledger.transactions).toHaveLength(0);
  });

  it('never buys stock or takes on debt to fulfil a missing order', () => {
    const setup = fixture();
    const missing = { ...setup.customer, demand: { ...setup.demand, quantity: 2, minQuantity: 2 } };
    const before = JSON.parse(JSON.stringify(setup.economy)) as EconomyState;
    expect(personnelSale(setup.economy, missing, market)).toBeNull();
    expect(setup.economy).toEqual(before);
  });

  it('will not sell old inventory at a loss to create an automatic deal', () => {
    const setup = fixture('gram_gold_1', 1, 20_000);
    expect(personnelSale(setup.economy, setup.customer, market)).toBeNull();
    expect(setup.economy.ledger.realizedProfitTotal).toBe(0);
  });

  it('cannot sell stock from the workshop or fulfil a different product demand', () => {
    const setup = fixture();
    const workshop = { ...setup.economy, inventory: setup.economy.inventory.map(row =>
      ({ ...row, location: 'workshop' as const })) };
    expect(personnelSale(workshop, setup.customer, market)).toBeNull();
    const mismatch = { ...setup.customer, demand: { ...setup.demand, templateId: 'quarter_gold' } };
    expect(personnelSale(setup.economy, mismatch, market)).toBeNull();
  });

  it('the shared context preserves full/partial fit and the narrow bullion anchor in a mixed package', () => {
    const bullion = fixture('quarter_gold');
    const crafted = fixture('ring_14k');
    const items = { ...bullion.economy.items, ...crafted.economy.items };
    const lines = [...bullion.lines, ...crafted.lines];
    const inventory = [...bullion.economy.inventory, ...crafted.economy.inventory];
    const demand = { ...bullion.demand, templateId: null, wantsBullion: false,
      families: [bullion.item.family, crafted.item.family], quantity: 3, minQuantity: 2, acceptsPartial: true };
    const purchase = repricePackage(createPurchaseSession(demand), lines, items, inventory, bullion.customer, market);
    const ctx = purchaseNegotiationContext({ purchase, customer: bullion.customer, items, market, reputation: 50 });
    expect(purchase.fulfilment).toBe('partial');
    expect(ctx.haggleRoom).toBe(rulesFor(getTemplate('quarter_gold')).haggleRoom);
    expect(ctx.fairValue).toBe(trueValue(bullion.item, market) + trueValue(crafted.item, market));
    expect(ctx.purchaseCeiling).toBe(Math.round(purchaseCeiling(bullion.customer, purchase.packageFairValue) *
      0.94 * packageFitPenalty(demand, lines, items).ceilingMultiplier));
  });
});
