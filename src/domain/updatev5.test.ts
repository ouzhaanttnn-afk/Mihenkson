import { afterEach, describe, expect, it, vi } from 'vitest';
import * as customerSpawn from './customer-spawn';
import { useGame } from '@state/gameStore';
import { serialize, deserialize, migrate } from '@state/save';
import { RETAIL_BULLION_CATALOG, bullionMeta } from '@data/bullion';
import { spawnItem } from './item-spawn';
import { createMarketForDay } from './market';
import { consolidatePools, poolForItem, poolForTemplate, validQuantity } from './stock-pools';
import { applyTransaction, createLedger, closeDay, costBasisForUnits, type EconomyState } from './settlement';
import { dailyTraffic, dailyIntentSplit, dailyPurchaseMix, queueCapacity, personnelDaily, isHasTradingDay, toMg, roundMoney } from './v5-rules';
import { hasQuote, maxHasBuyMg, tradeHas, meltToHas } from './has-account';
import { customerPriceBand, customerSpread, CUSTOMER_SPREAD, CRAFTED_BANDS } from './customer-pricing';
import { priceForChannel, bullionUnitValue } from './channels';
import { spawnCustomer } from './customer-spawn';
import { dayCharacter, rollIntent } from './intent';
import { matchDemand, showcaseStock, showcaseDemand, spawnDemand, repricePackage, createPurchaseSession } from './purchase';
import { createSession, effectiveReservation, applyMove } from './negotiation';
import { quoteLiquidation, supplyOffer } from './wholesaler';
import { EXIT_CHANNEL } from './balance';
import type { InventoryPosition, ItemInstance, SettlementTransaction, MarketRegime, Customer } from './types';

const initial = useGame.getState();
afterEach(() => { useGame.setState(initial, true); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const market = { ...createMarketForDay(456, 5), goldSpot: 7100 };
const character = dayCharacter(456, 5, market);
function owned(templateId: string, cost: number, index = 1): ItemInstance {
  const item = spawnItem(456, index, templateId);
  const meta = bullionMeta(templateId);
  return { ...item, id: `${templateId}_${index}`, buyCost: cost, acquiredDay: 1, location: 'backStock',
    truth: { ...item.truth, hiddenFlaws: [], ...(meta ? { actualPurity: meta.unitPurity, craftsmanship: 0 } : {}) } };
}
function position(item: ItemInstance, quantity = 1): InventoryPosition {
  return { itemId: item.id, quantity, costBasis: (item.buyCost ?? 0) * quantity, currentValue: (item.buyCost ?? 0) * quantity,
    age: 2, demand: 'steady', location: item.location === 'display' ? 'display' : 'backStock', thesis: null, expectedExitValues: {} };
}
function economy(items: ItemInstance[] = []): EconomyState {
  return { store: { ...initial.store, cash: 10_000_000, personnelCount: 0, hasBalanceMg: 0, hasCostBasis: 0 },
    inventory: items.map(item => position(item)), items: Object.fromEntries(items.map(item => [item.id, item])), ledger: createLedger() };
}
const tx = (id: string, partial: Partial<SettlementTransaction> = {}): SettlementTransaction => ({
  txId: id, dealId: id, day: 5, cashDelta: 0, itemsIn: [], itemsOut: [], trustDelta: 0, reputationDelta: 0, xpDelta: 0, label: id, ...partial,
});

describe('UPDATEv5 · master acceptance edge cases', () => {
  it('personnel changes neither generated customer nor base arrival delay', () => {
    for (let index = 0; index < 100; index++) {
      const baseline = spawnCustomer(456, index, market, { ...economy().store, personnelCount: 0 }, character);
      for (const count of [1,2,3]) {
        const staffed = spawnCustomer(456, index, market, { ...economy().store, personnelCount: count }, character);
        expect(staffed).toEqual(baseline);
        expect(customerSpawn.nextCustomerDelay(456, index, [6,15], false) * character.tempo)
          .toBe(customerSpawn.nextCustomerDelay(456, index, [6,15], false) / dailyTraffic(456, market.day).multiplier);
      }
    }
  });
  it('seller product mix follows the fixed daily Y, not a fixed 33 percent crafted share', () => {
    let sellers = 0, bullion = 0;
    for (let index = 0; index < 4000; index++) {
      const spawned = spawnCustomer(456, index, market, economy().store, character);
      if (spawned.customer.intent !== 'sell') continue;
      sellers++;
      if (bullionMeta(spawned.items[0]!.templateId)) bullion++;
    }
    expect(Math.abs(bullion / sellers - dailyPurchaseMix(456, market.day).bullion)).toBeLessThan(.04);
  });
  it('1 + 5 + 20 grams, minus 8.5 = 17.5 grams with unchanged average', () => {
    const bought = applyTransaction(economy(), tx('mix', { itemsIn: [owned('gram_gold_1', 7100), owned('gram_gold_5', 36000), owned('gram_gold_20', 145000)] })).state;
    const p = bought.inventory[0]!;
    expect(p.quantityMg).toBe(26000);
    const sold = applyTransaction(bought, tx('8.5', { itemsOut: [{ itemId: p.itemId, quantity: 8.5 }] })).state;
    expect(sold.inventory[0]?.quantityMg).toBe(17500);
    expect(sold.inventory[0]?.averageCostPerUnit).toBe(p.averageCostPerUnit);
  });
  it('quarter 10 + 20, minus 8 = 22 units and fixed average', () => {
    const a = owned('quarter_gold', 10000), b = owned('quarter_gold', 11000, 2);
    const pooled = consolidatePools([position(a, 10), position(b, 20)], { [a.id]: a, [b.id]: b });
    const p = pooled.inventory[0]!;
    const result = applyTransaction({ ...economy(), ...pooled }, tx('quarter8', { itemsOut: [{ itemId: p.itemId, quantity: 8 }] })).state;
    expect(result.inventory[0]?.quantity).toBe(22);
    expect(result.inventory[0]?.averageCostPerUnit).toBe(320000 / 30);
  });
  it('fractional wholesale quote and settlement share a single final TL amount', () => {
    const item = owned('gram_gold_10', 60000);
    const state = applyTransaction(economy(), tx('buy', { itemsIn: [item] })).state;
    const q = quoteLiquidation({ itemId: item.id, quantity: 8.5 }, state.items, state.inventory, market, state.store, 3)!;
    expect(q.quantity).toBe(8.5); expect(q.slices.reduce((sum, s) => sum + s.quantity, 0)).toBeCloseTo(8.5, 10);
    expect(q.costBasis).toBe(51000); expect(Number.isInteger(q.gross)).toBe(true);
    const result = applyTransaction(state, tx('liquidate', { cashDelta: q.gross, itemsOut: [{ itemId: item.id, quantity: q.quantity }] }));
    expect(result.state.inventory[0]?.quantityMg).toBe(1500);
    const supply = supplyOffer(item, 3, market, state.store)!;
    expect(supply.total).toBe(roundMoney(supply.unitPrice * supply.quantity));
  });
  it('invalid spawn in a full queue is not a missed guest', () => {
    const entry = spawnCustomer(456, 1, market, economy().store, character);
    const invalid = { ...entry, customer: { ...entry.customer, intent: 'buy' as const, demand: null }, items: [] };
    vi.spyOn(customerSpawn, 'spawnCustomer').mockReturnValue(invalid);
    useGame.setState({ ...economy(), market: { ...market, clockMinutes: 550 }, dayCharacter: character,
      queue: [entry,entry,entry,entry], activeDeal: null, activeCustomer: null, profileOpen: false, nextCustomerAtMinutes: 550, missedGuestCountToday: 0 });
    useGame.getState().tick(1);
    expect(useGame.getState().missedGuestCountToday).toBe(0);
  });
  it('a free queue slot accepts arrival without counting a missed guest', () => {
    useGame.setState({ ...economy(), seed: 456, market: { ...market, clockMinutes: 550 }, dayCharacter: character,
      queue: [], activeDeal: null, activeCustomer: null, profileOpen: false, nextCustomerAtMinutes: 550, missedGuestCountToday: 0 });
    useGame.getState().tick(1);
    expect(useGame.getState().queue).toHaveLength(1);
    expect(useGame.getState().missedGuestCountToday).toBe(0);
  });
  it('missing display target falls back in the same visit, without new spawn', () => {
    const item = { ...owned('bracelet_22k_thin', 1000), location: 'display' as const };
    const fallback = spawnDemand(456, 2, 'investor', character);
    const entry = spawnCustomer(456, 2, market, economy().store, character);
    entry.customer = { ...entry.customer, intent: 'buy', demand: { ...showcaseDemand(item), fallbackDemand: fallback } }; entry.items = [];
    useGame.setState({ ...economy(), market, queue: [entry], activeDeal: null, activeCustomer: null, spawnCounter: 3 });
    useGame.getState().greetCustomer();
    expect(useGame.getState().activeCustomer?.id).toBe(entry.customer.id);
    expect(useGame.getState().activeDeal?.purchase?.demand).toEqual(fallback);
    expect(useGame.getState().spawnCounter).toBe(3);
  });
  it('closing day keeps crafted stock, reports missed guests and resets the new day', () => {
    const mem = new Map<string,string>();
    vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string,v: string) => mem.set(k,v) });
    const item = { ...owned('bracelet_22k_thin', 39000), location: 'display' as const };
    useGame.setState({ ...economy([item]), seed: 456, market, dayCharacter: character, missedGuestCountToday: 7 });
    useGame.getState().advanceDay();
    const after = useGame.getState();
    expect(after.market.day).toBe(6); expect(after.lastDayReport?.missedGuestCountToday).toBe(7);
    expect(after.missedGuestCountToday).toBe(0); expect(after.inventory[0]?.itemId).toBe(item.id);
    expect(after.items[item.id]?.buyCost).toBe(39000);
  });
  it('legacy active purchase migration preserves negotiated price, costs and history', () => {
    const a = owned('gram_gold_5', 32000), b = owned('gram_gold_20', 130000);
    const entry = spawnCustomer(456, 2, market, economy().store, character);
    entry.customer = { ...entry.customer, intent: 'buy', demand: { ...spawnDemand(456, 2, 'investor', character),
      templateId: 'gram_gold_5', poolId: undefined, quantity: 1, minQuantity: 1, acceptsPartial: false } }; entry.items = [];
    useGame.setState({ ...economy([a,b]), market, queue: [entry], activeDeal: null, activeCustomer: null });
    useGame.getState().greetCustomer(); useGame.getState().togglePackageItem(a.id);
    const before = useGame.getState(); const deal = before.activeDeal!;
    const file = serialize({ ...before, activeDeal: { ...deal, stage: 'negotiate', lines: deal.lines.map(l => ({ ...l,
      negotiation: { ...l.negotiation, offerHistory: [35000], activeCounter: 34000 } })) } });
    const loaded = deserialize({ ...file, version: 1 });
    expect(loaded.activeDeal?.purchase?.lines).toEqual([{ itemId: a.id, quantity: 5 }]);
    expect(loaded.activeDeal?.purchase?.packageCost).toBe(32000);
    expect(loaded.activeDeal?.purchase?.demand.quantity).toBe(5);
    expect(loaded.activeDeal?.lines[0]?.negotiation.offerHistory).toEqual([35000]);
    expect(loaded.activeDeal?.lines[0]?.negotiation.activeCounter).toBe(34000);
    expect(loaded.inventory[0]?.quantityMg).toBe(25000);
    expect(deserialize(serialize({ ...before, ...loaded })).activeDeal).toEqual(loaded.activeDeal);
  });
  it.each(['shopBuys','shopSells'] as const)('%s counteroffer respects the economic range', direction => {
    const item = owned('gram_gold_1', 1), economicBand = customerPriceBand(item, market, direction)!;
    const customer = spawnCustomer(456, 2, market, economy().store, character).customer;
    const ctx = { customer, economicBand, direction, buyCeiling: 100000, purchaseCeiling: 100000, reputation: 50, knowledge: [] };
    const result = applyMove(createSession('counter','item'), ctx, { kind: 'requestCounter', atRound: 0 });
    expect(result.response.counterOffer).toBeGreaterThanOrEqual(roundMoney(economicBand.min));
    expect(result.response.counterOffer).toBeLessThanOrEqual(roundMoney(economicBand.max));
  });
});

describe('UPDATEv5 · common physical pools and precision', () => {
  it.each(['1', '2_5', '5', '10', '20', '50', '100'])('gram SKU %s feeds the same pool', suffix => {
    const item = owned(`gram_gold_${suffix}`, 10000);
    const result = applyTransaction(economy(), tx(suffix, { itemsIn: [item] })).state;
    expect(result.inventory[0]?.poolId).toBe('24K_GRAM_GOLD_POOL');
    expect(result.inventory[0]?.quantityMg).toBe(toMg(bullionMeta(item.templateId)!.unitWeightGrams));
    expect(result.items[item.id]?.templateId).toBe('gram_gold_1');
  });
  it('mixed purchases, weighted average, fractional sale and later buy preserve cost exactly', () => {
    let state = applyTransaction(economy(), tx('a', { itemsIn: [owned('gram_gold_10', 60000)] })).state;
    state = applyTransaction(state, tx('b', { itemsIn: [owned('gram_gold_20', 140000)] })).state;
    expect(state.inventory).toHaveLength(1);
    const before = state.inventory[0]!;
    expect(before.quantity).toBe(30);
    expect(before.costBasis).toBe(200000);
    expect(before.averageCostPerUnit).toBe(200000 / 30);
    const cost = costBasisForUnits(before, 8.5);
    state = applyTransaction(state, tx('sale', { cashDelta: 70000, itemsOut: [{ itemId: before.itemId, quantity: 8.5 }] })).state;
    expect(state.inventory[0]?.quantityMg).toBe(21500);
    expect(state.inventory[0]?.averageCostPerUnit).toBe(before.averageCostPerUnit);
    expect(state.inventory[0]!.costBasis + cost).toBeCloseTo(200000, 8);
    state = applyTransaction(state, tx('c', { itemsIn: [owned('gram_gold_2_5', 20000)] })).state;
    expect(state.inventory[0]?.quantity).toBe(24);
    expect(state.inventory[0]!.averageCostPerUnit).toBeCloseTo((200000 - cost + 20000) / 24, 8);
  });
  it.each([10,20,30,40,50,60,70,80,90,100])('%i g investment purchase joins a gram pool', grams => {
    const result = applyTransaction(economy(), tx(String(grams), { itemsIn: [owned(`investment_bangle_22k_${grams}`, 50000)] })).state;
    const p = result.inventory[0]!;
    expect(p.quantityMg).toBe(grams * 1000);
    expect(p.quantity).toBe(grams / 10);
    expect(validQuantity(p, .5)).toBe(false);
    expect(validQuantity(p, 1)).toBe(true);
  });
  it.each([15,25,8,14,18])('nonstandard bangle %i never enters catalog pool', n => {
    expect(poolForTemplate(`investment_bangle_22k_${n}`)).toBeUndefined();
    expect(RETAIL_BULLION_CATALOG).not.toContain(`investment_bangle_22k_${n}`);
  });
  it('crafted/stone bangle is never pooled', () => {
    expect(poolForItem(owned('bracelet_22k_thin', 10000))).toBeUndefined();
    const fake = owned('investment_bangle_22k_20', 10000);
    fake.truth.craftsmanship = 1;
    expect(poolForItem(fake)).toBeUndefined();
    fake.truth.craftsmanship = 0; fake.truth.actualPurity = .585;
    expect(poolForItem(fake)).toBeUndefined();
  });
  it('quarter count averages independently of gram pool', () => {
    const a = owned('quarter_gold', 10000), b = owned('quarter_gold', 12000, 2);
    const pooled = consolidatePools([position(a, 2), position(b, 3)], { [a.id]: a, [b.id]: b });
    expect(pooled.inventory).toHaveLength(1);
    expect(pooled.inventory[0]?.quantity).toBe(5);
    expect(pooled.inventory[0]?.costBasis).toBe(56000);
    expect(pooled.inventory[0]?.averageCostPerUnit).toBe(11200);
  });
  it.each([0,-1,NaN,Infinity,1.0001,1000])('rejects invalid gram output %s atomically', quantity => {
    const state = applyTransaction(economy(), tx('buy', { itemsIn: [owned('gram_gold_10', 10)] })).state;
    const out = applyTransaction(state, tx('bad', { cashDelta: 500, itemsOut: [{ itemId: state.inventory[0]!.itemId, quantity }] }));
    expect(out.applied).toBe(false); expect(out.state).toBe(state);
  });
  it('1000 milligram sales produce no negative residue', () => {
    let state = applyTransaction(economy(), tx('one', { itemsIn: [owned('gram_gold_1', 7000)] })).state;
    const itemId = state.inventory[0]!.itemId;
    for (let i = 0; i < 1000; i++) state = applyTransaction(state, tx(`mg${i}`, { itemsOut: [{ itemId, quantity: .001 }] })).state;
    expect(state.inventory).toHaveLength(0);
  });
  it('duplicate aggregate output rejects without crediting cash', () => {
    const state = applyTransaction(economy(), tx('one', { itemsIn: [owned('gram_gold_10', 10)] })).state;
    const itemId = state.inventory[0]!.itemId;
    expect(applyTransaction(state, tx('bad', { cashDelta: 1000, itemsOut: [{ itemId, quantity: 6 }, { itemId, quantity: 6 }] })).state).toBe(state);
  });
});

describe('UPDATEv5 · deterministic daily rules, personnel, queue', () => {
  it.each([0,1,2,3])('personnel %i has exact expense/capacity without workshop staff', n => {
    const state = economy(); state.store.personnelCount = n;
    expect(queueCapacity(state.store)).toBe([4,6,8,10][n]);
    expect(personnelDaily(state.store)).toBe([0,40000,90000,150000][n]! / 30);
    const close = closeDay(state, 5, 7);
    expect(close.report.overhead).toBe(roundMoney(state.store.dailyOverhead + personnelDaily(state.store)));
    expect(close.report.missedGuestCountToday).toBe(7);
    expect(closeDay(close.state, 5).applied).toBe(false);
    expect(close.state.store.staff).toEqual(state.store.staff);
  });
  it('daily salts yield fixed integer splits and independent distributions', () => {
    const counts: Record<string, number> = {};
    for (let d = 1; d <= 10000; d++) {
      const traffic = dailyTraffic(456, d), split = dailyIntentSplit(456, d), mix = dailyPurchaseMix(456, d);
      expect(split.x).toBeGreaterThanOrEqual(0); expect(split.x).toBeLessThanOrEqual(10);
      expect(mix.y).toBeGreaterThanOrEqual(0); expect(mix.y).toBeLessThanOrEqual(15);
      expect(Number.isInteger(split.x) && Number.isInteger(mix.y)).toBe(true);
      expect(split.customerBuys + split.customerSells + split.surprise).toBeCloseTo(1, 10);
      expect(mix.bullion + mix.crafted).toBeCloseTo(1, 10);
      expect(split).toEqual(dailyIntentSplit(456, d)); expect(mix).toEqual(dailyPurchaseMix(456, d));
      counts[traffic.multiplier] = (counts[traffic.multiplier] ?? 0) + 1;
    }
    for (const [multiplier, share] of [[.65,.15],[1,.50],[1.25,.25],[1.5,.10]]) expect(counts[multiplier!]! / 10000).toBeCloseTo(share!, 1);
  });
  it('base roll shares follow daily split without quotas', () => {
    const split = dailyIntentSplit(456, 5);
    let buys = 0, sells = 0, surprise = 0;
    for (let i = 0; i < 20000; i++) {
      const roll = rollIntent(456, i, character);
      if (roll.fromDynamicPool) surprise++; else if (roll.intent === 'buy') buys++; else sells++;
    }
    expect(buys / 20000).toBeCloseTo(split.customerBuys, 1);
    expect(sells / 20000).toBeCloseTo(split.customerSells, 1);
    expect(surprise / 20000).toBeCloseTo(.2, 1);
  });
  it('full queue attempts arrivals and records exactly one missed guest without penalty', () => {
    const entry = spawnCustomer(456, 1, market, economy().store, character);
    const queue = [0,1,2,3].map(i => ({ ...entry, customer: { ...entry.customer, id: `q${i}` } }));
    useGame.setState({ ...economy(), seed: 456, market: { ...market, clockMinutes: 550 }, dayCharacter: character,
      queue, activeDeal: null, activeCustomer: null, profileOpen: false, nextCustomerAtMinutes: 550, spawnCounter: 50, missedGuestCountToday: 0 });
    const before = useGame.getState().store;
    useGame.getState().tick(1);
    expect(useGame.getState().queue).toHaveLength(4);
    expect(useGame.getState().missedGuestCountToday).toBe(1);
    expect(useGame.getState().spawnCounter).toBe(51);
    expect(useGame.getState().store).toEqual(before);
  });
});

describe('UPDATEv5 · reference prices and single spread', () => {
  it.each([['gram_gold_1',7064.5],['investment_bangle_22k_10',65462],['quarter_gold',11455.85]] as const)('%s uses exact purity/weight', (id, value) => {
    expect(bullionUnitValue(owned(id, 0), market)).toBeCloseTo(value, 8);
  });
  it.each(['calm','normal','volatile','shock'] as MarketRegime[])('%s spread never stacks a second spread', regime => {
    const m = { ...market, regime };
    for (const volatility of [0, .005, .015, .1]) {
      const marketNow = { ...m, volatility };
      const spread = customerSpread(marketNow);
      expect(spread).toBeGreaterThanOrEqual(CUSTOMER_SPREAD[regime][0]);
      expect(spread).toBeLessThanOrEqual(CUSTOMER_SPREAD[regime][1]);
      const item = owned('gram_gold_1', 1);
      const input = { item, market: marketNow, quantity: 8.5, baseUnitValue: 99999, relationship: 99, channel: 'retailCustomer' as const };
      const buy = priceForChannel({ ...input, side: 'shopBuys' }), sell = priceForChannel({ ...input, side: 'shopSells' });
      expect(sell.unitPrice - buy.unitPrice).toBeCloseTo(spread, 8);
      expect(sell.totalPrice).toBe(roundMoney(sell.unitPrice * 8.5));
      expect((sell.unitPrice + buy.unitPrice) / 2).toBe(7064.5);
    }
  });
  it.each(['8K','14K','18K','22K'] as const)('%s crafted bands distinct from acquisition cost', karat => {
    const item = owned('bracelet_22k_thin', 1234);
    item.truth.actualKarat = karat; item.truth.netMetalWeight = 10;
    const buy = customerPriceBand(item, market, 'shopBuys')!, sell = customerPriceBand(item, market, 'shopSells')!;
    const rule = CRAFTED_BANDS[karat];
    expect(buy.min).toBe(71000 * rule.buy[0]); expect(buy.max).toBe(71000 * rule.buy[1]);
    expect(sell.min).toBe(71000 * rule.sell[0]); expect(sell.max).toBe(71000 * rule.sell[1]);
    expect(buy.reference).toBe(71000 * rule.metal); expect(item.buyCost).toBe(1234);
  });
  it.each(['shopBuys','shopSells'] as const)('%s reservation stays inside its economic range', direction => {
    const item = owned('gram_gold_1', 1), band = customerPriceBand(item, market, direction)!;
    const customer = spawnCustomer(456, 5, market, economy().store, character).customer;
    for (const trust of [0,50,100]) {
      const threshold = effectiveReservation({ customer: { ...customer, trust, reservationPrice: 1000000 }, direction,
        buyCeiling: 1, purchaseCeiling: 1000000, reputation: 100, knowledge: [], economicBand: band }, createSession('l','i'));
      expect(threshold).toBeGreaterThanOrEqual(roundMoney(band.min)); expect(threshold).toBeLessThanOrEqual(roundMoney(band.max));
    }
  });
});

describe('UPDATEv5 · showcase and HAS', () => {
  it('exact physical display target, not a matching template', () => {
    const a = { ...owned('bracelet_22k_thin', 1000), location: 'display' as const }, b = { ...a, id: 'other' };
    const demand = showcaseDemand(a);
    expect(matchDemand(demand, a)).toBe('exact'); expect(matchDemand(demand, b)).toBe('off');
    const state = economy([a]);
    expect(showcaseStock(state.inventory, state.items)).toHaveLength(1);
    const gone = { ...state, inventory: state.inventory.map(p => ({ ...p, location: 'workshop' as const })) };
    expect(applyTransaction(gone, tx('sale', { targetInventoryItemId: a.id, cashDelta: 2000, itemsOut: [{ itemId: a.id, quantity: 1 }] })).applied).toBe(false);
    expect(a.buyCost).toBe(1000);
  });
  it('showcase sub-selection is 20% of buyers, not extra arrivals', () => {
    const a = { ...owned('bracelet_22k_thin', 1000), location: 'display' as const };
    const state = economy([a]); let buyers = 0, showcases = 0;
    for (let i = 0; i < 5000; i++) {
      const normal = spawnCustomer(456, i, market, state.store, character);
      const withStock = spawnCustomer(456, i, market, state.store, character, {}, state);
      expect(withStock.customer.id).toBe(normal.customer.id);
      expect(withStock.customer.intent).toBe(normal.customer.intent);
      expect(normal.customer.demand?.targetInventoryItemId).toBeUndefined();
      if (withStock.customer.intent === 'buy') buyers++;
      if (withStock.customer.demand?.targetInventoryItemId) { showcases++; expect(withStock.customer.demand.fallbackDemand).toEqual(normal.customer.demand); }
    }
    expect(showcases / buyers).toBeCloseTo(.2, 1);
  });
  it('melt removes physical item, keeps cost and yields only HAS less existing refining fee', () => {
    const item = owned('bracelet_22k_thin', 50000), before = economy([item]);
    const result = meltToHas(before, market, item.id);
    expect(result.applied).toBe(true);
    expect(result.state.store.cash).toBe(before.store.cash - EXIT_CHANNEL.melt.refiningFee);
    expect(result.state.store.hasBalanceMg).toBe(Math.floor(item.truth.netMetalWeight * item.truth.actualPurity * EXIT_CHANNEL.melt.metalRecovery * 1000));
    expect(result.state.inventory).toHaveLength(0);
    expect(result.state.items[item.id]?.location).toBe('melted');
    expect(result.state.items[item.id]?.buyCost).toBe(50000);
    expect(meltToHas(result.state, market, item.id).applied).toBe(false);
  });
  it.each([1,2,3,4,6,7,8,9,10,11])('HAS trade is closed on game day %i', day => {
    expect(isHasTradingDay(day)).toBe(false);
    expect(tradeHas(economy(), { ...market, day }, 'buy', 1000, `closed${day}`).applied).toBe(false);
  });
  it.each([5,12,19,26])('HAS trade is open on Friday %i', day => {
    expect(isHasTradingDay(day)).toBe(true);
    expect(tradeHas(economy(), { ...market, day }, 'buy', 8500, `open${day}`).applied).toBe(true);
  });
  it('MAX uses wholesale ask, no overdraft, no positive roundtrip, duplicate tx rejected', () => {
    const base = economy(); base.store.cash = 100000;
    const quote = hasQuote(market, base.store), mg = maxHasBuyMg(base.store.cash, quote.buy);
    expect(quote.buy).toBeGreaterThan(quote.sell);
    expect(mg).toBe(Math.floor(100000 / quote.buy * 1000));
    const buy = tradeHas(base, market, 'buy', mg, 'hasbuy');
    expect(buy.applied).toBe(true); expect(buy.state.store.cash).toBeGreaterThanOrEqual(0);
    expect(tradeHas(base, market, 'buy', mg + 1, 'toomuch').applied).toBe(false);
    expect(tradeHas(buy.state, market, 'buy', 1, 'hasbuy').applied).toBe(false);
    const sale = tradeHas(buy.state, market, 'sell', mg, 'hassale');
    expect(sale.applied).toBe(true);
    expect(sale.state.store.cash - buy.state.store.cash).toBe(roundMoney(mg / 1000 * quote.sell));
    expect(sale.state.store.cash).toBeLessThanOrEqual(base.store.cash);
    expect(sale.state.store.hasBalanceMg).toBe(0); expect(sale.state.store.hasCostBasis).toBe(0);
    expect(sale.state.inventory).toHaveLength(0);
  });
});

describe('UPDATEv5 · migration and active save integrity', () => {
  it('v1 mixed SKU save preserves grams, total cost, customer, queue, market and progression', () => {
    const a = owned('gram_gold_2_5', 15000), b = owned('gram_gold_20', 130000), c = owned('quarter_gold', 10000), crafted = owned('bracelet_22k_thin', 70000);
    const state = { ...initial, ...economy([a,b,c,crafted]), market, queue: [spawnCustomer(456, 4, market, initial.store, character)],
      activeCustomer: spawnCustomer(456, 5, market, initial.store, character).customer, missedGuestCountToday: 7, nextCustomerAtMinutes: 600 };
    const file = { ...serialize(state), version: 1 };
    const loaded = deserialize(file);
    expect(loaded.inventory).toHaveLength(3);
    expect(loaded.inventory.find(p => p.poolId === '24K_GRAM_GOLD_POOL')?.quantityMg).toBe(22500);
    expect(loaded.inventory.reduce((sum, p) => sum + p.costBasis, 0)).toBe(225000);
    expect(loaded.items[crafted.id]).toEqual(crafted);
    expect(loaded.store.cash).toBe(state.store.cash); expect(loaded.store.xp).toBe(state.store.xp);
    expect(loaded.market).toEqual(state.market); expect(loaded.queue).toEqual(state.queue);
    expect(loaded.activeCustomer?.id).toBe(state.activeCustomer.id);
    expect(loaded.missedGuestCountToday).toBe(7); expect(loaded.nextCustomerAtMinutes).toBe(600);
    expect(migrate(migrate(file))).toEqual(migrate(file));
  });
  it('newly quoted fractional package uses exact grams/cost and one final price', () => {
    const item = owned('gram_gold_10', 60000);
    const pooled = consolidatePools([position(item)], { [item.id]: item });
    const demand = { ...spawnDemand(456, 1, 'investor', character), templateId: 'gram_gold_1', poolId: '24K_GRAM_GOLD_POOL' as const,
      quantity: 8.5, minQuantity: 8.5, acceptsPartial: false };
    const customer = { trust: 50 } as Customer;
    const session = repricePackage(createPurchaseSession(demand), [{ itemId: item.id, quantity: 8.5 }], pooled.items, pooled.inventory, customer, market);
    expect(session.fulfilment).toBe('full'); expect(session.packageCost).toBe(51000);
    expect(session.suggestedPrice).toBe(roundMoney(customerPriceBand(pooled.items[item.id]!, market, 'shopSells', 8.5)!.max));
  });
});
