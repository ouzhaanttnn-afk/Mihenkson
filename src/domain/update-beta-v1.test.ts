import { describe, expect, it } from 'vitest';

import { RETAIL_BULLION_CATALOG } from '@data/bullion';
import { INTENT_MIX, NEGOTIATION, PURCHASE, START } from './balance';
import { templatesForTier } from './item-spawn';
import { recommendedSalePrice } from './purchase';
import { dailyIntentSplit } from './v5-rules';

describe('Beta Update v1', () => {
  it('pazarlık ayarları erişilebilir ekonomi turundan sonra akıcı kalır', () => {
    expect(NEGOTIATION.maxReservationFlex).toBe(0.12);
    expect(NEGOTIATION.counterMarginByState.OPEN).toEqual([0.08, 0.05]);
    expect(NEGOTIATION.insultThreshold).toBe(0.74);
    expect(NEGOTIATION.counterMarginByState.HARDENING).toEqual([0.05, 0.03]);
    expect(NEGOTIATION.counterMarginByState.FINAL_OFFER).toEqual([0.015, 0.015]);
  });

  it('Tam Altın yeni stok ve müşteri talebi havuzlarında yer almaz', () => {
    expect(RETAIL_BULLION_CATALOG).not.toContain('full_gold');
    for (let tier = 1; tier <= 4; tier += 1) {
      expect(templatesForTier(tier).map((template) => template.id)).not.toContain('full_gold');
    }
  });

  it('ortalama günde kârlı satış fırsatı stok alışından daha sık gelir', () => {
    const days = Array.from({ length: 240 }, (_, index) => dailyIntentSplit(456, index + 1));
    const averageBuys = days.reduce((sum, day) => sum + day.customerBuys, 0) / days.length;
    const averageSells = days.reduce((sum, day) => sum + day.customerSells, 0) / days.length;

    expect(averageBuys).toBeGreaterThanOrEqual(0.43);
    expect(averageBuys).toBeGreaterThan(averageSells);
    for (const day of days) {
      expect(day.customerBuys).toBeGreaterThanOrEqual(INTENT_MIX.customerBuys);
      expect(day.customerSells).toBeGreaterThanOrEqual(INTENT_MIX.customerSells);
      expect(day.customerBuys + day.customerSells + day.surprise).toBeCloseTo(1, 10);
    }
  });

  it('varsayılan satış önerisi en az %8 kâr hedefler', () => {
    const purchase = { suggestedPrice: 100_000, packageCost: 110_000 };
    expect(recommendedSalePrice(purchase)).toBe(118_800);
    expect(recommendedSalePrice(purchase)).toBeGreaterThanOrEqual(
      Math.round(purchase.packageCost * (1 + PURCHASE.minimumSuggestedProfitMargin)),
    );
  });

  it('oyun yumuşasa da gider ve pazarlık riski tamamen kalkmaz', () => {
    expect(START.dailyOverhead).toBeGreaterThan(0);
    expect(INTENT_MIX.customerSells).toBeGreaterThanOrEqual(0.30);
    expect(NEGOTIATION.insultThreshold).toBeGreaterThan(0.70);
    expect(NEGOTIATION.hardeningTrigger).toBeGreaterThan(1);
  });
});
