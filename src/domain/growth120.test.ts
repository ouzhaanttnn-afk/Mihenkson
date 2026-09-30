import { describe, expect, it } from 'vitest';
import { START } from './balance';
import { customerDelayFactor, customerDensity, shopPresentationBonus } from './customer-traffic';
import { defaultPlayerMarket, MARKET_CATALOG, purchaseMarketProduct, type PlayerMarketState } from './marketplace';
import { createLedger, type EconomyState } from './settlement';
import { useGame } from '@state/gameStore';
import { PREMIUM_PRODUCT_ID, usePremium } from '@ui/premium';

const store = { reputation: START.reputation, storeTier: 1 as const };
const state = (owned: string[] = [], equipped: PlayerMarketState['equipped'] = {}): PlayerMarketState => ({ owned, equipped });

describe('1.2.0 bounded in-game presentation growth', () => {
  it('has no bonus without a purchased eligible category', () => {
    expect(shopPresentationBonus()).toBe(0);
    expect(shopPresentationBonus(defaultPlayerMarket())).toBe(0);
    expect(customerDensity(store, defaultPlayerMarket())).toBe(1);
    expect(customerDelayFactor(store, defaultPlayerMarket())).toBe(1);
  });

  it.each(['shop', 'decoration', 'collection'] as const)('each distinct purchased %s category adds exactly four percentage points', category => {
    const products = MARKET_CATALOG.filter(product => product.category === category);
    expect(products.length).toBeGreaterThan(1);
    const first = state([products[0]!.id]);
    const all = state(products.flatMap(product => [product.id, product.id]));
    expect(shopPresentationBonus(first)).toBeCloseTo(.04);
    expect(shopPresentationBonus(all)).toBeCloseTo(.04);
    expect(customerDensity(store, all)).toBeCloseTo(1.04);
    expect(customerDelayFactor(store, all)).toBeCloseTo(1 / 1.04);
  });

  it('combines only the three eligible categories and never exceeds 12%', () => {
    const owned = MARKET_CATALOG.map(product => product.id);
    const all = state([...owned, ...owned, 'unknown', PREMIUM_PRODUCT_ID]);
    expect(shopPresentationBonus(all)).toBeCloseTo(.12);
    expect(shopPresentationBonus(all)).toBeLessThanOrEqual(.12);
    expect(customerDensity(store, all)).toBeCloseTo(1.12);
    expect(customerDensity({ reputation: 100, storeTier: 5 }, all)).toBeLessThanOrEqual(1.9);
    for (let mask = 0; mask < 8; mask++) {
      const products = ['theme_bazaar', 'decor_tea', 'collection_tesbih'].filter((_, index) => mask & (1 << index));
      expect(shopPresentationBonus(state(products))).toBeCloseTo(products.length * .04);
    }
  });

  it('profile, silver cosmetic frame, lifestyle and unknown ids add no traffic', () => {
    const unrelated = MARKET_CATALOG.filter(product => !['shop', 'decoration', 'collection'].includes(product.category));
    const presentation = state([...unrelated.map(product => product.id), 'frame_telkari', 'theme_unknown',
      'decor_unknown', 'collection_unknown', PREMIUM_PRODUCT_ID]);
    expect(shopPresentationBonus(presentation)).toBe(0);
    expect(customerDensity(store, presentation)).toBe(1);
  });

  it('an equipped rewarded trial without ownership does not grant presentation growth', () => {
    const trial = state([], { shopTheme: 'theme_bazaar', shopBadge: 'badge_founder', profileFrame: 'frame_telkari' });
    expect(shopPresentationBonus(trial)).toBe(0);
    expect(customerDensity(store, trial)).toBe(1);
    expect(shopPresentationBonus(state(['decor_tea'], trial.equipped))).toBeCloseTo(.04);
  });

  it('verified or unknown real-money Premium entitlement does not change growth', () => {
    const original = usePremium.getState();
    try {
      for (const entitlement of [{ active: false, known: false }, { active: false, known: true }, { active: true, known: true }]) {
        usePremium.setState(entitlement);
        expect(shopPresentationBonus(state([PREMIUM_PRODUCT_ID]))).toBe(0);
        expect(customerDensity(store, state())).toBe(1);
        expect(shopPresentationBonus(state(['theme_bazaar']))).toBeCloseTo(.04);
      }
    } finally { usePremium.setState(original, true); }
  });

  it('real in-game purchases use settlement and grant category growth only once', () => {
    const initial = useGame.getState();
    let economy: EconomyState = { store: { ...initial.store, cash: 5_000_000, level: 9, reputation: 80,
      supplier: { ...initial.store.supplier, openInvoices: [] }, payables: [] },
      inventory: [], items: {}, ledger: createLedger() };
    let presentation = defaultPlayerMarket();
    let spent = 0;
    for (const [index, id] of ['theme_bazaar', 'decor_tea', 'collection_tesbih'].entries()) {
      const product = MARKET_CATALOG.find(candidate => candidate.id === id)!;
      const purchase = purchaseMarketProduct(economy, presentation, id, 1);
      expect(purchase.applied).toBe(true);
      spent += product.price;
      economy = purchase.economy;
      presentation = purchase.playerMarket;
      expect(economy.store.cash).toBe(5_000_000 - spent);
      expect(economy.ledger.transactions).toHaveLength(index + 1);
      expect(economy.ledger.realizedProfitTotal).toBe(0);
      expect(shopPresentationBonus(presentation)).toBeCloseTo((index + 1) * .04);
      const duplicate = purchaseMarketProduct(economy, presentation, id, 1);
      expect(duplicate.applied).toBe(false);
      expect(duplicate.economy).toBe(economy);
      expect(duplicate.playerMarket).toBe(presentation);
    }
  });
});
