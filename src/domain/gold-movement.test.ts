import { afterEach, describe, expect, it, vi } from 'vitest';

// Run both tunings through the real engine with identical seeds/state.
const tuning = vi.hoisted(() => ({ scale: 1.2 }));
vi.mock('./balance', async (importOriginal) => {
  const original = await importOriginal<typeof import('./balance')>();
  return {
    ...original,
    get MARKET_GOLD_MOVEMENT_SCALE() { return tuning.scale; },
  };
});

import { MARKET_DAILY_CAP } from './balance';
import { createMarketForDay, stepMarketIntraday } from './market';

afterEach(() => { tuning.scale = 1.2; });

describe('gold-only movement tuning', () => {
  it('ships the approved 20% multiplier', async () => {
    const balance = await vi.importActual<typeof import('./balance')>('./balance');
    expect(balance.MARKET_GOLD_MOVEMENT_SCALE).toBe(1.2);
  });

  it('daily openings, events and pricing risk inputs are unchanged', () => {
    for (let seed = 1; seed <= 250; seed += 1) {
      tuning.scale = 1;
      const baseline = createMarketForDay(seed, 1);
      tuning.scale = 1.2;
      const current = createMarketForDay(seed, 1);
      expect(current).toEqual(baseline);
    }
  });

  it('existing saved markets receive the gold-only intraday increase without being rerolled', () => {
    let rising = 0;
    let falling = 0;
    for (let seed = 1; seed <= 100; seed += 1) {
      tuning.scale = 1;
      const saved = createMarketForDay(seed, 1);
      const before = structuredClone(saved);
      const baseline = stepMarketIntraday(saved, 9 * 60);
      tuning.scale = 1.2;
      const current = stepMarketIntraday(saved, 9 * 60);
      const scale = saved.regime === 'calm' || saved.regime === 'normal' ? 1.2 : 1;
      expect(current.goldSpot - saved.goldSpot).toBeCloseTo(
        (baseline.goldSpot - saved.goldSpot) * scale, 1,
      );
      expect(current.silverSpot).toBe(baseline.silverSpot);
      expect(current.fxIndex).toBe(baseline.fxIndex);
      expect(saved).toEqual(before);
      expect(stepMarketIntraday(saved, 9 * 60)).toEqual(current);
      if (scale > 1 && current.goldSpot > saved.goldSpot) rising += 1;
      if (scale > 1 && current.goldSpot < saved.goldSpot) falling += 1;
    }
    expect(rising).toBeGreaterThan(0);
    expect(falling).toBeGreaterThan(0);
  });

  it('event selection and decay remain identical with the same incoming state', () => {
    for (let seed = 1; seed <= 100; seed += 1) {
      tuning.scale = 1;
      const previous = createMarketForDay(seed, 1);
      const baseline = createMarketForDay(seed, 2, previous);
      tuning.scale = 1.2;
      const current = createMarketForDay(seed, 2, previous);
      expect(current.activeEvent).toEqual(baseline.activeEvent);
      expect(current.volatility).toBe(baseline.volatility);
      expect(current.silverSpot).toBe(baseline.silverSpot);
      expect(current.fxIndex).toBe(baseline.fxIndex);
    }
  });

  it('full trading days stay bounded and fast-forward matches gradual ticks', () => {
    for (let seed = 1; seed <= 100; seed += 1) {
      const open = createMarketForDay(seed, 1);
      let gradual = open;
      for (let minute = 9 * 60; minute <= 19 * 60; minute += 15) {
        gradual = stepMarketIntraday(gradual, minute);
        expect(Math.abs(gradual.goldSpot / open.goldSpot - 1)).toBeLessThanOrEqual(
          MARKET_DAILY_CAP + 0.00001,
        );
      }
      expect(stepMarketIntraday(open, 19 * 60).goldSpot).toBe(gradual.goldSpot);
    }
  });

  it('120-day chains including intraday closes retain the baseline economy envelope', () => {
    function simulate(seed: number, scale: number) {
      tuning.scale = scale;
      let market = createMarketForDay(seed, 1);
      for (let day = 1; day <= 120; day += 1) {
        if (day > 1) market = createMarketForDay(seed, day, market);
        market = stepMarketIntraday(market, 19 * 60);
      }
      return market;
    }
    const ratios: number[] = [];
    for (let index = 0; index < 32; index += 1) {
      const seed = 159_000 + index * 9_973;
      const baseline = simulate(seed, 1);
      const current = simulate(seed, 1.2);
      ratios.push(current.goldSpot / baseline.goldSpot);
      expect(current.silverSpot).toBe(baseline.silverSpot);
      expect(current.fxIndex).toBe(baseline.fxIndex);
    }
    ratios.sort((a, b) => a - b);
    expect(ratios[3]).toBeGreaterThan(0.8);
    expect(ratios[28]).toBeLessThan(1.25);
    expect(ratios[15]).toBeGreaterThan(0.9);
    expect(ratios[15]).toBeLessThan(1.1);
  });
});
