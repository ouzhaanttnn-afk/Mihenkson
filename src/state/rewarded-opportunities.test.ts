import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const adMocks = vi.hoisted(() => ({
  showRewardedAd: vi.fn(),
  showInterstitialAd: vi.fn(),
}));

vi.mock('@ui/ads', () => adMocks);

import { createMarketForDay } from '@domain/market';
import { useGame } from './gameStore';
import { deserialize, serialize } from './save';

const initial = useGame.getState();

beforeEach(() => {
  const data = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
    removeItem: (key: string) => data.delete(key),
  });
  adMocks.showRewardedAd.mockReset().mockResolvedValue(true);
  adMocks.showInterstitialAd.mockReset().mockResolvedValue(undefined);
  useGame.setState({
    ...initial,
    market: createMarketForDay(initial.seed, 1),
    store: { ...initial.store, cash: 1_000_000, dailyOverhead: 0 },
    rewardedAdPending: null,
    rewardedDailyUses: {},
    rewardedSupplyExpressReady: false,
    rewardedFreeShippingReady: false,
    rewardedCosmeticTrial: null,
    recallableGuest: null,
    dayReportOpen: false,
    dayCloseConfirmOpen: false,
    dayCloseIssue: null,
  }, true);
});

afterEach(() => {
  useGame.setState(initial, true);
  vi.unstubAllGlobals();
});

describe('isteğe bağlı ödüllü reklam fırsatları', () => {
  it('tamamlanan reklamın tedarik avantajlarını açar ve aynı gün tekrar açmaz', async () => {
    await useGame.getState().requestSupplyExpress();
    await useGame.getState().requestFreeShipping();

    expect(adMocks.showRewardedAd).toHaveBeenNthCalledWith(1, 'supplyExpress');
    expect(adMocks.showRewardedAd).toHaveBeenNthCalledWith(2, 'freeShipping');
    expect(useGame.getState()).toMatchObject({
      rewardedSupplyExpressReady: true,
      rewardedFreeShippingReady: true,
      rewardedDailyUses: { supplyExpress: 1, freeShipping: 1 },
    });

    await useGame.getState().requestSupplyExpress();
    await useGame.getState().requestFreeShipping();
    expect(adMocks.showRewardedAd).toHaveBeenCalledTimes(2);
  });

  it('reklam tamamlanmazsa hiçbir oyun avantajı vermez', async () => {
    adMocks.showRewardedAd.mockResolvedValueOnce(false);

    await useGame.getState().requestFreeShipping();

    expect(useGame.getState().rewardedFreeShippingReady).toBe(false);
    expect(useGame.getState().rewardedDailyUses.freeShipping).toBeUndefined();
    expect(useGame.getState().rewardedAdPending).toBeNull();
  });

  it('yeni ödül durumlarını kayıt döngüsünde korur', () => {
    const state = {
      ...useGame.getState(),
      rewardedDailyUses: { expertHint: 4, freeShipping: 4 },
      rewardedSupplyExpressReady: true,
      rewardedFreeShippingReady: true,
    };

    expect(deserialize(serialize(state))).toMatchObject({
      rewardedDailyUses: { expertHint: 4, freeShipping: 4 },
      rewardedSupplyExpressReady: true,
      rewardedFreeShippingReady: true,
    });
  });
});

describe('haftalık zorunlu geçiş reklamı', () => {
  it('yalnız Pazar kapanıp Pazartesi açılırken interstitial çağırır', () => {
    useGame.setState({ market: createMarketForDay(initial.seed, 6) });
    useGame.getState().advanceDay();
    expect(adMocks.showInterstitialAd).not.toHaveBeenCalled();

    useGame.setState({
      market: createMarketForDay(initial.seed, 7),
      dayReportOpen: false,
      dayCloseIssue: null,
    });
    useGame.getState().advanceDay();

    expect(adMocks.showInterstitialAd).toHaveBeenCalledTimes(1);
    expect(useGame.getState().market.day).toBe(8);
  });
});
