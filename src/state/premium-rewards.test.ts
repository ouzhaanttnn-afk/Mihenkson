import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ entitlement: vi.fn(), initialize: vi.fn() }));
vi.mock('@ui/premium', () => ({ premiumEntitlement: mocks.entitlement }));
vi.mock('@capacitor-community/admob', () => ({ AdMob: { initialize: mocks.initialize }, InterstitialAdPluginEvents: {}, RewardAdPluginEvents: {} }));
import { createMarketForDay } from '@domain/market';
import { useGame } from './gameStore';
import { deserialize, serialize } from './save';
const initial = useGame.getState();
beforeEach(() => {
  mocks.entitlement.mockReset().mockResolvedValue(true); mocks.initialize.mockClear();
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {}, removeItem: () => {} });
  useGame.setState({ ...initial, market: createMarketForDay(initial.seed, 1), rewardedAdPending: null,
    rewardedDailyUses: {}, rewardedSupplyExpressReady: false, rewardedFreeShippingReady: false }, true);
});
afterEach(() => { useGame.setState(initial, true); vi.unstubAllGlobals(); });
describe('Premium through the real reward bridge', () => {
  it('grants rewards without AdMob and preserves daily caps across a save reload', async () => {
    await useGame.getState().requestFreeShipping();
    await useGame.getState().requestSupplyExpress();
    expect(useGame.getState()).toMatchObject({ rewardedDailyUses: { freeShipping: 1, supplyExpress: 1 }, rewardedFreeShippingReady: true });
    const saved = deserialize(serialize(useGame.getState()));
    useGame.setState({ ...saved, rewardedFreeShippingReady: false, rewardedSupplyExpressReady: false });
    await useGame.getState().requestFreeShipping(); await useGame.getState().requestSupplyExpress();
    expect(mocks.entitlement).toHaveBeenCalledTimes(2);
    expect(useGame.getState().rewardedFreeShippingReady).toBe(false);
    expect(mocks.initialize).not.toHaveBeenCalled();
  });
  it('does not duplicate rewards when the same button is double tapped', async () => {
    await Promise.all([useGame.getState().requestFreeShipping(), useGame.getState().requestFreeShipping()]);
    expect(mocks.entitlement).toHaveBeenCalledOnce();
    expect(useGame.getState().rewardedAdPending).toBeNull();
    expect(mocks.initialize).not.toHaveBeenCalled();
  });
  it('does not consume the daily allowance when ownership cannot be verified', async () => {
    mocks.entitlement.mockResolvedValue(null);
    await useGame.getState().requestFreeShipping();
    expect(useGame.getState().rewardedDailyUses.freeShipping).toBeUndefined();
    expect(useGame.getState().rewardedFreeShippingReady).toBe(false);
    expect(mocks.initialize).not.toHaveBeenCalled();
  });
});
