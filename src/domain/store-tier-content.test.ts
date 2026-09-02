import { describe, expect, it } from 'vitest';

import { STORE_TIERS } from '@data/store-tiers';
import { PURCHASE } from './balance';
import { templatesForTier } from './item-spawn';

describe('mağaza kademeleri geri gitmez', () => {
  it('paket satırı, kapasite ve ürün çeşitliliği her kademede korunur veya artar', () => {
    let previousLines = 0;
    let previousDisplay = 0;
    let previousBack = 0;
    let previousWorkshop = 0;
    let previousTemplates = 0;

    for (const tier of STORE_TIERS) {
      const lines = PURCHASE.maxPackageLinesByTier[tier.tier];
      expect(lines, `kademe ${tier.tier} paket tablosunda yok`).toBeDefined();
      expect(lines!).toBeGreaterThanOrEqual(previousLines);
      expect(tier.grants.displaySlots).toBeGreaterThanOrEqual(previousDisplay);
      expect(tier.grants.backStockSlots).toBeGreaterThanOrEqual(previousBack);
      expect(tier.grants.workshopCapacity).toBeGreaterThanOrEqual(previousWorkshop);
      expect(templatesForTier(tier.tier).length).toBeGreaterThanOrEqual(previousTemplates);

      previousLines = lines!;
      previousDisplay = tier.grants.displaySlots;
      previousBack = tier.grants.backStockSlots;
      previousWorkshop = tier.grants.workshopCapacity;
      previousTemplates = templatesForTier(tier.tier).length;
    }
  });
});
