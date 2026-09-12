import { describe, expect, it } from 'vitest';
import { offerPresets, snapOffer } from './offer-presets';

describe('UI price presets — no acceptance-engine inputs', () => {
  const base = { min: 500, max: 20000, step: 50, boundary: 10000 };
  it('buy: agreement offers more; profit offers less', () => {
    const [deal, balanced, profit] = offerPresets({ ...base, direction: 'buy', anchor: 9000 });
    expect(deal!.value).toBeGreaterThan(balanced!.value);
    expect(balanced!.value).toBe(9000);
    expect(profit!.value).toBeLessThan(balanced!.value);
  });
  it('sell: agreement offers less; profit offers more', () => {
    const [deal, balanced, profit] = offerPresets({ ...base, direction: 'sell', anchor: 11000 });
    expect(deal!.value).toBeLessThan(balanced!.value);
    expect(balanced!.value).toBe(11000);
    expect(profit!.value).toBeGreaterThan(balanced!.value);
  });
  for (const direction of ['buy', 'sell'] as const) {
    it(`${direction}: quantized presets respect bounds and player boundary`, () => {
      for (const boundary of [1011, 5009, 9999]) for (const anchor of [100, boundary * .9, boundary * 1.1, 90000]) {
        const input = { ...base, direction, boundary, anchor, min: 509, step: 100 };
        for (const p of offerPresets(input)) {
          expect(p.value).toBeGreaterThanOrEqual(input.min);
          expect(p.value).toBeLessThanOrEqual(input.max);
          expect(p.value).toBe(snapOffer(p.value, input.min, input.max, input.step));
          expect(direction === 'buy' ? p.value <= boundary : p.value >= boundary).toBe(true);
        }
      }
    });
  }
  it('does not change input or game state', () => {
    const input = Object.freeze({ ...base, direction: 'sell' as const, anchor: 12000 });
    expect(offerPresets(input)).toEqual(offerPresets(input));
  });
  it('falls back to manual if a meaningful safe range is unavailable', () => {
    expect(offerPresets({ ...base, direction: 'buy', anchor: 1, boundary: 1 })).toEqual([]);
    expect(offerPresets({ ...base, direction: 'sell', anchor: NaN })).toEqual([]);
    expect(offerPresets({ ...base, direction: 'buy', anchor: 1000, max: 500 })).toEqual([]);
  });
});
