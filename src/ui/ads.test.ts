import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  isNativePlatform: vi.fn(),
  getPlatform: vi.fn(),
  adMob: {
    initialize: vi.fn(),
    requestConsentInfo: vi.fn(),
    showConsentForm: vi.fn(),
    showPrivacyOptionsForm: vi.fn(),
    prepareRewardVideoAd: vi.fn(),
    showRewardVideoAd: vi.fn(),
    prepareInterstitial: vi.fn(),
    showInterstitial: vi.fn(),
    addListener: vi.fn(),
  },
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: mocks.isNativePlatform,
    getPlatform: mocks.getPlatform,
  },
}));

vi.mock('@capacitor-community/admob', () => ({
  AdMob: mocks.adMob,
  RewardAdPluginEvents: {
    Rewarded: 'rewarded',
    Dismissed: 'rewardedDismissed',
    FailedToShow: 'rewardedFailedToShow',
  },
  InterstitialAdPluginEvents: {
    Dismissed: 'interstitialDismissed',
    FailedToShow: 'interstitialFailedToShow',
  },
}));

function consent(
  privacyOptionsRequirementStatus: 'UNKNOWN' | 'REQUIRED' | 'NOT_REQUIRED',
  canRequestAds = true,
) {
  return {
    status: canRequestAds ? 'OBTAINED' : 'REQUIRED',
    isConsentFormAvailable: false,
    canRequestAds,
    privacyOptionsRequirementStatus,
  };
}

async function subject() {
  return import('./ads');
}

beforeEach(() => {
  vi.resetModules();
  mocks.isNativePlatform.mockReset().mockReturnValue(true);
  mocks.getPlatform.mockReset().mockReturnValue('ios');
  for (const fn of Object.values(mocks.adMob)) fn.mockReset();
  mocks.adMob.initialize.mockResolvedValue(undefined);
  mocks.adMob.showPrivacyOptionsForm.mockResolvedValue(undefined);
  mocks.adMob.addListener.mockResolvedValue({ remove: vi.fn() });
});

describe('AdMob gizlilik tercihleri', () => {
  it('native olmayan platformda SDK çağırmadan unavailable döner', async () => {
    mocks.isNativePlatform.mockReturnValue(false);
    const { showAdPrivacyOptions } = await subject();

    await expect(showAdPrivacyOptions()).resolves.toBe('unavailable');
    expect(mocks.adMob.initialize).not.toHaveBeenCalled();
  });

  it('UNKNOWN durumunu not-required diye sunmaz', async () => {
    mocks.adMob.requestConsentInfo.mockResolvedValue(consent('UNKNOWN', false));
    const { showAdPrivacyOptions } = await subject();

    await expect(showAdPrivacyOptions()).resolves.toBe('unavailable');
    expect(mocks.adMob.showPrivacyOptionsForm).not.toHaveBeenCalled();
  });

  it('yalnız açık NOT_REQUIRED sonucunu not-required olarak döndürür', async () => {
    mocks.adMob.requestConsentInfo.mockResolvedValue(consent('NOT_REQUIRED'));
    const { showAdPrivacyOptions } = await subject();

    await expect(showAdPrivacyOptions()).resolves.toBe('not-required');
    expect(mocks.adMob.showPrivacyOptionsForm).not.toHaveBeenCalled();
  });

  it('REQUIRED durumunda kullanıcı reklam isteyemese bile tercih formunu açar', async () => {
    mocks.adMob.requestConsentInfo.mockResolvedValue(consent('REQUIRED', false));
    const { showAdPrivacyOptions } = await subject();

    await expect(showAdPrivacyOptions()).resolves.toBe('shown');
    expect(mocks.adMob.showPrivacyOptionsForm).toHaveBeenCalledOnce();
  });

  it('UMP başlatma hatasını failed döndürür ve sonraki denemeyi kilitlemez', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    mocks.adMob.requestConsentInfo
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(consent('NOT_REQUIRED'));
    const { showAdPrivacyOptions } = await subject();

    await expect(showAdPrivacyOptions()).resolves.toBe('failed');
    await expect(showAdPrivacyOptions()).resolves.toBe('not-required');
    expect(mocks.adMob.initialize).toHaveBeenCalledTimes(2);
    expect(mocks.adMob.requestConsentInfo).toHaveBeenCalledTimes(2);
    expect(warning).toHaveBeenCalledOnce();
    warning.mockRestore();
  });
});
afterEach(() => vi.unstubAllEnvs());

describe('1.1 reklam tamamlanması ve geçiş koruması', () => {
  async function setup() {
    vi.stubEnv('VITE_ADMOB_REWARD_UNIT_IOS', 'test-reward-unit');
    vi.stubEnv('VITE_ADMOB_DAY_OPEN_UNIT_IOS', 'test-interstitial-unit');
    mocks.adMob.requestConsentInfo.mockResolvedValue(consent('NOT_REQUIRED'));
    const callbacks = new Map<string, () => void>();
    mocks.adMob.addListener.mockImplementation(async (name: string, callback: () => void) => {
      callbacks.set(name, callback); return { remove: vi.fn() };
    });
    return { callbacks, api: await subject() };
  }

  it('SDK promise tek başına ödül vermez; erken kapatma false döner', async () => {
    const { callbacks, api } = await setup();
    const result = api.showRewardedAd('customerRecall');
    await vi.waitFor(() => expect(mocks.adMob.showRewardVideoAd).toHaveBeenCalledOnce());
    callbacks.get('rewardedDismissed')!();
    await expect(result).resolves.toBe(false);
  });

  it('tamamlama + kapatma bir ödül verir; eşzamanlı ve hemen sonraki reklamı engeller', async () => {
    const { callbacks, api } = await setup();
    const result = api.showRewardedAd('customerRush');
    await expect(api.showRewardedAd('customerRecall')).resolves.toBe(false);
    await vi.waitFor(() => expect(mocks.adMob.showRewardVideoAd).toHaveBeenCalledOnce());
    callbacks.get('rewarded')!();
    callbacks.get('rewardedDismissed')!();
    callbacks.get('rewardedDismissed')!();
    await expect(result).resolves.toBe(true);
    await api.showInterstitialAd();
    expect(mocks.adMob.prepareInterstitial).not.toHaveBeenCalled();
    expect(api.interstitialAllowed(Date.now() + api.REWARDED_INTERSTITIAL_GAP_MS + 1)).toBe(true);
  });

  it('FailedToShow ödül vermez', async () => {
    const { callbacks, api } = await setup();
    const result = api.showRewardedAd('speed4x');
    await vi.waitFor(() => expect(mocks.adMob.showRewardVideoAd).toHaveBeenCalledOnce());
    callbacks.get('rewardedFailedToShow')!();
    await expect(result).resolves.toBe(false);
  });

  it('UMP false sonucu sonraki kullanıcı denemesini kalıcı kilitlemez', async () => {
    const { callbacks, api } = await setup();
    mocks.adMob.requestConsentInfo.mockResolvedValueOnce(consent('UNKNOWN', false));
    await expect(api.showRewardedAd('speed4x')).resolves.toBe(false);
    const retry = api.showRewardedAd('speed4x');
    await vi.waitFor(() => expect(mocks.adMob.showRewardVideoAd).toHaveBeenCalledOnce());
    callbacks.get('rewardedDismissed')!();
    await expect(retry).resolves.toBe(false);
    expect(mocks.adMob.requestConsentInfo).toHaveBeenCalledTimes(2);
  });
});
