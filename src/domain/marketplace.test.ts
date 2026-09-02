import { describe, expect, it } from 'vitest';
import { closeDay, createLedger, type EconomyState } from './settlement';
import {
  MARKET_CATALOG,
  defaultPlayerMarket,
  equipMarketProduct,
  lifestyleDailyExpense,
  purchaseMarketProduct,
} from './marketplace';
import type { StoreState } from './types';

function economy(cash = 300_000_000, level = 30, reputation = 100): EconomyState {
  const store = {
    name: 'Test', cash, level, reputation, xp: 0, xpToNext: 1, storeTier: 1,
    displaySlots: 8, backStockSlots: 16, workshopCapacity: 1, staff: [], personnelCount: 0,
    hasBalanceMg: 0, hasCostBasis: 0, supplier: { trust: 0, limit: 0, terms: 0, openInvoices: [], priceBand: 1, specialLotEligibility: false },
    payables: [], dailyOverhead: 1_200,
  } satisfies StoreState;
  return { store, inventory: [], items: {}, ledger: createLedger() };
}

describe('data-driven oyun içi Market', () => {
  it('her katalog ürünü gerekli alanları ve benzersiz id taşır', () => {
    expect(new Set(MARKET_CATALOG.map((p) => p.id)).size).toBe(MARKET_CATALOG.length);
    for (const product of MARKET_CATALOG) {
      expect(product.name).toBeTruthy();
      expect(product.price).toBeGreaterThanOrEqual(0);
      expect(product.category).toBeTruthy();
      expect(product.unlockRequirement).toBeTruthy();
      expect(product.assetReference).toBeTruthy();
    }
  });

  it('satın alma settlement kullanır ve aynı ürün iki kez para yakmaz', () => {
    const initial = economy();
    const first = purchaseMarketProduct(initial, defaultPlayerMarket(), 'life_watch', 3);
    expect(first.applied).toBe(true);
    expect(first.economy.store.cash).toBe(initial.store.cash - 180_000);
    expect(first.economy.ledger.transactions.at(-1)?.label).toBe('Market · İsviçre Saati');

    const second = purchaseMarketProduct(first.economy, first.playerMarket, 'life_watch', 3);
    expect(second.applied).toBe(false);
    expect(second.economy.store.cash).toBe(first.economy.store.cash);
  });

  it('kilit ve yetersiz nakit satın almayı reddeder', () => {
    expect(purchaseMarketProduct(economy(1_000_000, 1, 42), defaultPlayerMarket(), 'life_jet', 1).applied).toBe(false);
    expect(purchaseMarketProduct(economy(10_000, 30, 100), defaultPlayerMarket(), 'life_watch', 1).applied).toBe(false);
    expect(purchaseMarketProduct(economy(180_500, 30, 100), defaultPlayerMarket(), 'life_watch', 1).applied).toBe(false);
  });

  it('5 kg HAS rozeti yerel save tarafından dağıtılmaz', () => {
    const eligible = economy();
    eligible.store.hasBalanceMg = 5_000_000;
    const result = purchaseMarketProduct(eligible, defaultPlayerMarket(), 'badge_first_5kg_has', 1);
    expect(result.applied).toBe(false);
    expect(result.reason).toContain('sunucu sıralaması');
    expect(result.playerMarket.owned).not.toContain('badge_first_5kg_has');
  });

  it('yalnız sahip olunan kozmetik equip edilir ve şahsi giderler toplanır', () => {
    const owned = { owned: ['frame_brass', 'life_sedan', 'life_yacht'], equipped: {} };
    expect(equipMarketProduct(owned, 'frame_brass')?.equipped.profileFrame).toBe('frame_brass');
    expect(equipMarketProduct(defaultPlayerMarket(), 'frame_brass')).toBeNull();
    expect(lifestyleDailyExpense(owned)).toBe(21_000);
  });

  it('şahsi bakım gün kapanışında settlement giderine eklenir', () => {
    const result = closeDay(economy(1_000_000), 8, 0, 21_000);
    expect(result.applied).toBe(true);
    expect(result.report.lifestyleExpense).toBe(21_000);
    expect(result.report.overhead).toBe(22_200);
    expect(result.state.store.cash).toBe(977_800);
  });
});
