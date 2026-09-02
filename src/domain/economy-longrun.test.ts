import { describe, expect, it } from 'vitest';
import { MARKET_BASE, MARKET_MEAN_REVERSION } from './balance';
import { createMarketForDay, meanReversionNudge } from './market';
import { liquidationEstimate } from './settlement';
import type { InventoryPosition, MarketState } from './types';

function simulate(days: number, seed = 159_360): {
  days: number;
  final: number;
  minimum: number;
  maximum: number;
  finalVsReference: number;
} {
  let market: MarketState = createMarketForDay(seed, 1);
  const prices = [market.goldSpot];
  for (let day = 2; day <= days; day += 1) {
    market = createMarketForDay(seed, day, market);
    prices.push(market.goldSpot);
  }
  return {
    days,
    final: Math.round(market.goldSpot),
    minimum: Math.round(Math.min(...prices)),
    maximum: Math.round(Math.max(...prices)),
    finalVsReference: Math.round((market.goldSpot / MARKET_BASE.goldGram) * 1000) / 1000,
  };
}

describe('uzun dönem ekonomi snapshotları', () => {
  it.each([30, 120, 365])('%i günlük 64 piyasa zincirinin dağılımı kontrollü kalır', (days) => {
    const runs = Array.from({ length: 64 }, (_, index) => simulate(days, 159_000 + index * 9_973));
    const ratios = runs.map((run) => run.finalVsReference).sort((a, b) => a - b);
    const percentile = (ratio: number) => ratios[Math.floor((ratios.length - 1) * ratio)]!;
    const snapshot = {
      days,
      p10: percentile(0.1),
      median: percentile(0.5),
      p90: percentile(0.9),
      lowestFinal: ratios[0],
      highestFinal: ratios[ratios.length - 1],
      lowestObserved: Math.min(...runs.map((run) => run.minimum)),
      highestObserved: Math.max(...runs.map((run) => run.maximum)),
      risingRuns: ratios.filter((ratio) => ratio > 1).length,
      fallingRuns: ratios.filter((ratio) => ratio < 1).length,
    };
    expect(snapshot).toMatchSnapshot();
    expect(snapshot.p10).toBeGreaterThan(0.55);
    expect(snapshot.p90).toBeLessThan(1.65);
    expect(snapshot.median).toBeGreaterThan(0.8);
    expect(snapshot.median).toBeLessThan(1.25);
    expect(snapshot.lowestObserved).toBeGreaterThan(MARKET_BASE.goldGram * 0.45);
    expect(snapshot.highestObserved).toBeLessThan(MARKET_BASE.goldGram * 2.1);
    expect(snapshot.lowestFinal).toBeGreaterThan(0.5);
    expect(snapshot.highestFinal).toBeLessThan(1.9);
    expect(snapshot.risingRuns).toBeGreaterThan(0);
    expect(snapshot.fallingRuns).toBeGreaterThan(0);
  });

  it('denge kuvveti yalnız serbest bandın dışında ve tavanlı çalışır', () => {
    expect(meanReversionNudge(MARKET_BASE.goldGram, MARKET_BASE.goldGram)).toBe(0);
    expect(meanReversionNudge(MARKET_BASE.goldGram * 1.05, MARKET_BASE.goldGram)).toBe(0);
    expect(meanReversionNudge(MARKET_BASE.goldGram * 2, MARKET_BASE.goldGram)).toBe(
      -MARKET_MEAN_REVERSION.dailyCap,
    );
    expect(meanReversionNudge(MARKET_BASE.goldGram * 0.3, MARKET_BASE.goldGram)).toBe(
      MARKET_MEAN_REVERSION.dailyCap,
    );
  });
});

describe('erişilebilir stok değeri', () => {
  const position: InventoryPosition = {
    itemId: 'item_1',
    quantity: 2,
    costBasis: 18_000,
    currentValue: 30_000,
    age: 2,
    demand: 'steady',
    thesis: 'retail',
    location: 'display',
    expectedExitValues: { retail: 15_000, wholesale: 11_000 },
  };

  it('en yüksek teorik kanal yerine hızlı erişilebilir kanalı kullanır', () => {
    expect(liquidationEstimate(position)).toEqual({
      value: 22_000,
      channel: 'Toptancı',
      time: '1–2 gün',
    });
  });

  it('eski kayıtta boş kanal tablosunu güvenli iskonto ile açar', () => {
    expect(liquidationEstimate({ ...position, expectedExitValues: {} }).value).toBe(26_400);
  });
});
