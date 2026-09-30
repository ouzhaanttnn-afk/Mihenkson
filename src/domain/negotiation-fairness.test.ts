import { describe, expect, it } from 'vitest';
import { bullionMeta } from '@data/bullion';
import { NEGOTIATION, TRUST } from './balance';
import { createMarketForDay } from './market';
import { applyMove, createSession, effectiveReservation, type NegotiationContext } from './negotiation';
import { packageCost, packageFairValue, packagePriceBand, purchaseCeiling } from './purchase';
import { spawnItem } from './item-spawn';
import type { Customer, InventoryPosition, NegotiationSession } from './types';

function customer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: 'fairness-customer', displayName: 'Test', archetype: 'investor', intent: 'buy',
    patienceMax: 8, patience: 8, knowledge: 80, urgency: 50, priceSensitivity: 80,
    status: 50, budget: 200_000, reservationPrice: 0, purchaseCeilingRatio: 1.15,
    demand: null, trust: 50, suspicion: 0, visitHistory: [], preferences: [],
    referralSource: null, lineIds: [], ...overrides,
  };
}

function context(overrides: Partial<NegotiationContext> = {}): NegotiationContext {
  return {
    customer: customer(), direction: 'shopSells', reputation: 50,
    buyCeiling: 0, purchaseCeiling: 100_000, knowledge: [], ...overrides,
  };
}

function offer(ctx: NegotiationContext, amount: number, session = createSession('line', 'item')) {
  return applyMove(session, ctx, { kind: 'offer', amount, atRound: session.round });
}

function stockPackage(quantity: number, unitCost: number) {
  const market = { ...createMarketForDay(12, 2), goldSpot: 10_000 };
  const spawned = spawnItem(12, 7, 'gram_gold_1');
  const item = { ...spawned, buyCost: unitCost,
    truth: { ...spawned.truth, actualPurity: bullionMeta('gram_gold_1')!.unitPurity, craftsmanship: 0, hiddenFlaws: [] } };
  const position: InventoryPosition = {
    itemId: item.id, quantity, costBasis: unitCost * quantity, currentValue: 10_000 * quantity,
    age: 2, demand: 'steady', thesis: null, location: 'backStock', expectedExitValues: {},
  };
  const items = { [item.id]: item };
  const lines = [{ itemId: item.id, quantity }];
  const band = packagePriceBand(lines, items, market)!;
  const fair = packageFairValue(lines, items, market);
  const buyer = customer({ budget: Math.ceil(band.max * 2) });
  const ctx = context({ customer: buyer, economicBand: band, fairValue: fair,
    purchaseCeiling: purchaseCeiling(buyer, fair), haggleRoom: 0.06, retailSpread: 0.04 });
  return { ctx, cost: packageCost(lines, [position]), band };
}

describe('Mihenk 1.2.0 · current market, historical cost and buyer budgets', () => {
  it.each([1, 10, 1000])('historical cost does not reroll or raise a buyer threshold for %i grams', quantity => {
    const cheap = stockPackage(quantity, 9_000);
    const expensive = stockPackage(quantity, 11_000);
    const session = createSession('line', 'item');

    expect(cheap.cost).toBe(9_000 * quantity);
    expect(expensive.cost).toBe(11_000 * quantity);
    expect(effectiveReservation(cheap.ctx, session)).toBe(effectiveReservation(expensive.ctx, session));

    const asking = Math.round(expensive.cost * 1.01);
    expect(asking).toBeGreaterThan(expensive.band.max);
    expect(offer(expensive.ctx, asking).session.state).not.toBe('ACCEPTED');
    expect(offer(cheap.ctx, asking)).toEqual(offer(expensive.ctx, asking));
    expect(offer(cheap.ctx, Math.round(cheap.cost * 1.01)).session.state).toBe('ACCEPTED');
  });

  it('a slightly profitable historical-cost ask can fail when patience has already run out', () => {
    const { ctx, cost } = stockPackage(1, 11_000);
    const out = offer({ ...ctx, customer: { ...ctx.customer, patience: 1 } }, Math.round(cost * 1.01));

    expect(out.session.state).toBe('REJECTED');
    expect(out.response.message.key).toContain('piyasa beklentimin üzerinde');
    expect(out.response.message.key).toContain('Sabrım da kalmadı');
    expect(out.response.patienceDelta).toBe(-NEGOTIATION.patiencePerRound);
  });

  it.each([1, 10, 1000])('a %i-gram market band cannot create money beyond the fixed budget', quantity => {
    const { ctx, band } = stockPackage(quantity, 9_000);
    const budget = band.min - 50 * quantity;
    const bounded = { ...ctx, purchaseCeiling: budget,
      customer: { ...ctx.customer, budget, trust: 100, urgency: 100 }, reputation: 100 };
    const session = { ...createSession('line', 'item'), usedReasons: ['weight', 'purity'], gesturesUsed: 2 };

    expect(effectiveReservation(bounded, session)).toBe(budget);
    const aboveBudget = offer(bounded, budget + 1, session);
    expect(aboveBudget.session.state).not.toBe('ACCEPTED');
    expect(aboveBudget.response.message.key).toContain('bütçemi aşıyor');
    expect(aboveBudget.response.counterOffer).toBeLessThanOrEqual(budget);
    const accepted = applyMove(aboveBudget.session, bounded,
      { kind: 'acceptCounter', atRound: aboveBudget.session.round });
    expect(accepted.session.settledPrice).toBeLessThanOrEqual(budget);
  });

  it('relationship flexibility also respects the fixed budget without an economic band', () => {
    const ctx = context({ purchaseCeiling: 100_000, customer: customer({ budget: 100_000, trust: 100 }) });
    const session = { ...createSession('line', 'item'), gesturesUsed: 2, usedReasons: ['purity'] };
    expect(effectiveReservation(ctx, session)).toBe(100_000);
    expect(offer(ctx, 100_001, session).session.state).not.toBe('ACCEPTED');
  });

  it('an invalid old counter cannot settle above the buyer budget', () => {
    const ctx = context({ customer: customer({ budget: 90_000 }), purchaseCeiling: 90_000 });
    const session = { ...createSession('line', 'item'), activeCounter: 100_000 };
    const out = applyMove(session, ctx, { kind: 'acceptCounter', atRound: 0 });
    expect(out.session.state).not.toBe('ACCEPTED');
    expect(out.session.settledPrice).toBeNull();
    expect(out.response.message.key).toContain('bütçemi aşıyor');
    const repaired = applyMove(out.session, ctx, { kind: 'requestCounter', atRound: 0 });
    expect(repaired.response.counterOffer).toBeLessThanOrEqual(90_000);
  });
});

describe('Mihenk 1.2.0 · directional responses and binding counteroffers', () => {
  it('selling high repeatedly counts as bad offers for a buyer', () => {
    const ctx = context({ customer: customer({ patience: 30, patienceMax: 30, budget: 1_000_000 }) });
    const history = Array.from({ length: NEGOTIATION.hardeningTrigger - 1 }, (_, i) => 180_000 + i * 1000);
    const out = offer(ctx, 190_000, { ...createSession('line', 'item'), offerHistory: history });
    expect(out.session.state).toBe('HARDENING');
  });

  it('buyer counter dialogue correctly asks for a lower selling price', () => {
    const ctx = context();
    const threshold = effectiveReservation(ctx, createSession('line', 'item'));
    const out = offer(ctx, Math.round(threshold * 1.15));
    expect(out.response.message.key).toContain('piyasa beklentimin üzerinde');
    expect(out.response.message.key).not.toContain('beklentimin altında');
  });

  it.each(['shopBuys', 'shopSells'] as const)('%s honors an existing counter when the player types it', direction => {
    const base = context({ direction, customer: customer({ reservationPrice: 100_000 }) });
    const quoted = applyMove(createSession('line', 'item'), base, { kind: 'requestCounter', atRound: 0 });
    const changed = { ...base, customer: { ...base.customer, trust: 0, suspicion: 100, patience: 1 } };
    const typed = offer(changed, quoted.response.counterOffer!, quoted.session);
    const accepted = applyMove(quoted.session, changed, { kind: 'acceptCounter', atRound: quoted.session.round });
    expect(typed.session.state).toBe('ACCEPTED');
    expect(typed.session.settledPrice).toBe(accepted.session.settledPrice);
  });

  it.each(['shopBuys', 'shopSells'] as const)('%s cannot reopen or reprice a final offer with replenished patience', direction => {
    const ctx = context({ direction, customer: customer({ reservationPrice: 100_000 }) });
    const finalPrice = direction === 'shopBuys' ? 103_000 : 99_000;
    const session: NegotiationSession = { ...createSession('line', 'item'), state: 'FINAL_OFFER',
      finalOffer: finalPrice, activeCounter: finalPrice, round: 4 };
    const gesture = applyMove(session, ctx, { kind: 'gesture', atRound: 4 });
    const refreshed = { ...ctx, customer: { ...ctx.customer,
      patience: ctx.customer.patience + gesture.response.patienceDelta,
      trust: ctx.customer.trust + gesture.response.trustDelta } };
    const counter = applyMove(gesture.session, refreshed, { kind: 'requestCounter', atRound: 5 });
    expect(counter.session.state).toBe('FINAL_OFFER');
    expect(counter.session.activeCounter).toBe(finalPrice);
    const badOffer = offer(refreshed, direction === 'shopBuys' ? finalPrice - 1 : finalPrice + 1, counter.session);
    expect(badOffer.session.state).toBe('FINAL_OFFER');
    expect(badOffer.session.finalOffer).toBe(finalPrice);
    expect(badOffer.response.message.key).toBe(direction === 'shopBuys'
      ? 'Son fiyatım bu. Daha aşağısına bırakmam.' : 'Son teklifim bu. Daha fazlasını ödeyemem.');
  });

  it('accepting a buyer counter evaluates fairness against the buyer ceiling, even with zero seller reservation', () => {
    const ctx = context({ purchaseCeiling: 100_000, customer: customer({ reservationPrice: 0 }) });
    const session = { ...createSession('line', 'item'), activeCounter: 100_000 };
    const out = applyMove(session, ctx, { kind: 'acceptCounter', atRound: 0 });
    expect(out.response.trustDelta).toBe(3);
    expect(out.response.trustDelta).not.toBe(TRUST.fairDealGain);
    const generous = applyMove({ ...session, activeCounter: 95_000 }, ctx, { kind: 'acceptCounter', atRound: 0 });
    expect(generous.response.trustDelta).toBe(TRUST.fairDealGain);
  });

  it('a repeated offer consumes the existing penalty and closes when patience is exhausted', () => {
    const ctx = context({ customer: customer({ patience: 1 }) });
    const session = { ...createSession('line', 'item'), offerHistory: [130_000], activeCounter: 100_000 };
    const out = offer(ctx, 130_000, session);
    expect(out.session.state).toBe('REJECTED');
    expect(out.response.wasRepeatOffer).toBe(true);
    expect(out.response.patienceDelta).toBe(-NEGOTIATION.repeatOfferPatiencePenalty);
    expect(out.response.counterOffer).toBeNull();
    const again = offer(ctx, 130_000, out.session);
    expect(again.session).toEqual(out.session);
    expect(again.response.patienceDelta).toBe(0);
  });

  it('identical offer sequences remain identical after JSON save/load', () => {
    const ctx = context();
    const first = offer(ctx, 160_000);
    const saved = JSON.parse(JSON.stringify(first.session)) as NegotiationSession;
    expect(offer(ctx, 145_000, saved)).toEqual(offer(ctx, 145_000, first.session));
  });
});
