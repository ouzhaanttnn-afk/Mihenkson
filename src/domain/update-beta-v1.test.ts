import { describe, expect, it } from 'vitest';

import { RETAIL_BULLION_CATALOG } from '@data/bullion';
import { DAY, INTENT_MIX, NEGOTIATION, PURCHASE, START } from './balance';
import { templatesForTier } from './item-spawn';
import { recommendedSalePrice, SHOWCASE_TARGET_CHANCE } from './purchase';
import { dailyIntentSplit, tradeDayKind } from './v5-rules';

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

  it('haftada dört satış, bir hibrit, bir bozdurma ve bir planlama günü vardır', () => {
    expect(Array.from({ length: 7 }, (_, index) => tradeDayKind(index + 1))).toEqual([
      'sales', 'sales', 'hybrid', 'sales', 'buyback', 'sales', 'planning',
    ]);
    const days = Array.from({ length: 6 }, (_, index) => dailyIntentSplit(456, index + 1));
    const averageBuys = days.reduce((sum, day) => sum + day.customerBuys, 0) / days.length;
    const averageSells = days.reduce((sum, day) => sum + day.customerSells, 0) / days.length;

    expect(averageBuys).toBeCloseTo(INTENT_MIX.customerBuys, 10);
    expect(averageSells).toBeCloseTo(INTENT_MIX.customerSells, 10);
    expect(averageBuys).toBeGreaterThan(averageSells);
    for (const day of days) {
      expect(day.customerBuys + day.customerSells + day.surprise).toBeCloseTo(1, 10);
    }
  });

  it('bir oyun günü eski sürümden yaklaşık dörtte bir daha kısa sürer', () => {
    expect(DAY.minutesPerRealSecond).toBe(1.6);
    const realSecondsAt1x = (DAY.closeMinutes - DAY.openMinutes) / DAY.minutesPerRealSecond;
    expect(realSecondsAt1x).toBe(375);
  });

  it('işçilikli ürünün haftalık alış-satış dengesi korunur', () => {
    const dynamicTradePerSide =
      INTENT_MIX.dynamic *
      (1 - INTENT_MIX.dynamicServiceShare - INTENT_MIX.dynamicAppraisalShare) /
      2;
    const averageCraftedIncomingShare =
      (INTENT_MIX.customerSells + dynamicTradePerSide) * 0.255;
    const averageCraftedShowcaseSaleShare =
      (INTENT_MIX.customerBuys + dynamicTradePerSide) * SHOWCASE_TARGET_CHANCE;
    expect(averageCraftedShowcaseSaleShare / averageCraftedIncomingShare)
      .toBeGreaterThan(0.9);
    expect(averageCraftedShowcaseSaleShare / averageCraftedIncomingShare)
      .toBeLessThan(1.1);
  });

  it('varsayılan sarrafiye satış önerisi erişilebilir %1,5 kâr hedefler', () => {
    const purchase = { suggestedPrice: 100_000, packageCost: 110_000 };
    expect(recommendedSalePrice(purchase)).toBe(111_650);
    expect(recommendedSalePrice(purchase)).toBeGreaterThanOrEqual(
      Math.round(purchase.packageCost * (1 + PURCHASE.minimumSuggestedProfitMargin)),
    );
  });

  it('oyun yumuşasa da gider ve pazarlık riski tamamen kalkmaz', () => {
    expect(START.dailyOverhead).toBeGreaterThan(0);
    expect(INTENT_MIX.dayProfiles.buyback.customerSells).toBeGreaterThan(0.50);
    expect(INTENT_MIX.dayProfiles.sales.customerSells).toBeGreaterThanOrEqual(0.20);
    expect(NEGOTIATION.insultThreshold).toBeGreaterThan(0.70);
    expect(PURCHASE.ceilingRatioBand).toEqual([1.11, 1.41]);
    expect(PURCHASE.sellerReservationRelief).toBe(0.02);
    expect(NEGOTIATION.hardeningTrigger).toBe(4);
  });
});
