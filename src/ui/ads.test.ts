import { beforeEach, describe, expect, it, vi } from 'vitest';

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
