import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  isNativePlatform: vi.fn(),
  getPlatform: vi.fn(),
  premiumEntitlement: vi.fn(),
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
vi.mock('./premium', () => ({ premiumEntitlement: mocks.premiumEntitlement }));

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
  mocks.premiumEntitlement.mockReset().mockResolvedValue(false);
  mocks.isNativePlatform.mockReset().mockReturnValue(true);
  mocks.getPlatform.mockReset().mockReturnValue('ios');
  for (const fn of Object.values(mocks.adMob)) fn.mockReset();
  mocks.adMob.initialize.mockResolvedValue(undefined);
  mocks.adMob.showPrivacyOptionsForm.mockResolvedValue(undefined);
  mocks.adMob.addListener.mockResolvedValue({ remove: vi.fn() });
});

describe('AdMob gizlilik tercihleri', () => {
  it('Premium tüm ödülleri SDK başlatmadan verir ve zorunlu reklamı kaldırır', async () => {
    mocks.premiumEntitlement.mockResolvedValue(true);
    const { showRewardedAd, showInterstitialAd } = await subject();
    const kinds = ['speed4x', 'customerRush', 'personnelWaiver', 'personnelTempUnlock', 'dailySponsor', 'patienceBoost', 'expertHint', 'cosmeticTrial', 'supplyExpress', 'workshopRush', 'customerRecall', 'extraOffer', 'freeShipping', 'dailyCosmetic'] as const;
    for (const kind of kinds) await expect(showRewardedAd(kind)).resolves.toBe(true);
    await showInterstitialAd();
    expect(mocks.adMob.initialize).not.toHaveBeenCalled();
    expect(mocks.adMob.showRewardVideoAd).not.toHaveBeenCalled();
    expect(mocks.adMob.showInterstitial).not.toHaveBeenCalled();
  });
  it('Premium bilinmiyorsa ne reklam gösterir ne bedava ödül uydurur', async () => {
    mocks.premiumEntitlement.mockResolvedValue(null);
    const { showRewardedAd, showInterstitialAd } = await subject();
    await expect(showRewardedAd('dailySponsor')).resolves.toBe(false);
    await showInterstitialAd();
    expect(mocks.adMob.initialize).not.toHaveBeenCalled();
  });
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
  async function setup(preload = true) {
    vi.stubEnv('VITE_ADMOB_REWARD_UNIT_IOS', 'test-reward-unit');
    vi.stubEnv('VITE_ADMOB_DAY_OPEN_UNIT_IOS', 'test-interstitial-unit');
    mocks.adMob.requestConsentInfo.mockResolvedValue(consent('NOT_REQUIRED'));
    const callbacks = new Map<string, () => void>();
    mocks.adMob.addListener.mockImplementation(async (name: string, callback: () => void) => {
      callbacks.set(name, callback); return { remove: vi.fn() };
    });
    const api = await subject();
    if (preload) await api.preloadRewardedAd();
    return { callbacks, api };
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
    const { callbacks, api } = await setup(false);
    mocks.adMob.requestConsentInfo.mockResolvedValueOnce(consent('UNKNOWN', false));
    await expect(api.showRewardedAd('speed4x')).resolves.toBe(false);
    await expect(api.preloadRewardedAd()).resolves.toBe(true);
    const retry = api.showRewardedAd('speed4x');
    await vi.waitFor(() => expect(mocks.adMob.showRewardVideoAd).toHaveBeenCalledOnce());
    callbacks.get('rewardedDismissed')!();
    await expect(retry).resolves.toBe(false);
    expect(mocks.adMob.requestConsentInfo).toHaveBeenCalledTimes(2);
  });
});

describe('AdMob rewarded reklam altyapısı ve yaşam döngüsü', () => {
  it('initializeAds native ortamda SDK başlatır ve consent uygunsa preload tetikler', async () => {
    mocks.adMob.requestConsentInfo.mockResolvedValue(consent('NOT_REQUIRED', true));
    mocks.adMob.prepareRewardVideoAd.mockResolvedValue({ adUnitId: 'test' });
    const { initializeAds } = await subject();

    await initializeAds();
    expect(mocks.adMob.initialize).toHaveBeenCalledOnce();
    expect(mocks.adMob.requestConsentInfo).toHaveBeenCalledOnce();
    expect(mocks.adMob.prepareRewardVideoAd).toHaveBeenCalledOnce();
  });

  it('preloadRewardedAd reklamı yükler ve isRewardedAdReady durumunu günceller', async () => {
    mocks.adMob.requestConsentInfo.mockResolvedValue(consent('NOT_REQUIRED', true));
    mocks.adMob.prepareRewardVideoAd.mockResolvedValue({ adUnitId: 'test' });
    const { preloadRewardedAd, isRewardedAdReady } = await subject();

    expect(isRewardedAdReady()).toBe(false);
    const success = await preloadRewardedAd();
    expect(success).toBe(true);
    expect(isRewardedAdReady()).toBe(true);
    expect(mocks.adMob.prepareRewardVideoAd).toHaveBeenCalledOnce();
  });

  it('reklam hazır değilse showRewardVideoAd ÇAĞIRMAZ, hata loglar ve false döner', async () => {
    mocks.adMob.requestConsentInfo.mockResolvedValue(consent('NOT_REQUIRED', true));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { showRewardedAd, isRewardedAdReady } = await subject();

    expect(isRewardedAdReady()).toBe(false);
    const result = await showRewardedAd('customerRush');
    expect(result).toBe(false);
    expect(mocks.adMob.showRewardVideoAd).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      '[ADMOB][REWARDED][SHOW_ERROR]',
      expect.objectContaining({ message: expect.stringContaining('Not Ready') }),
    );
    consoleError.mockRestore();
  });

  it('reklam hazırsa gösterir, Rewarded olayı tetiklenince ödülü verir ve yeni preload başlatır', async () => {
    mocks.adMob.requestConsentInfo.mockResolvedValue(consent('NOT_REQUIRED', true));
    mocks.adMob.prepareRewardVideoAd.mockResolvedValue({ adUnitId: 'test' });

    let rewardedCallback: ((item: any) => void) | null = null;
    let dismissedCallback: (() => void) | null = null;

    mocks.adMob.addListener.mockImplementation((event: string, callback: any) => {
      if (event === 'rewarded') rewardedCallback = callback;
      if (event === 'rewardedDismissed') dismissedCallback = callback;
      return Promise.resolve({ remove: vi.fn() });
    });

    mocks.adMob.showRewardVideoAd.mockImplementation(async () => {
      // Simüle: Kullanıcı reklamı izledi, önce Rewarded sonra Dismissed geldi
      rewardedCallback?.({ type: 'reward', amount: 1 });
      dismissedCallback?.();
      return { type: 'reward', amount: 1 };
    });

    const { preloadRewardedAd, showRewardedAd } = await subject();
    await preloadRewardedAd();
    expect(mocks.adMob.prepareRewardVideoAd).toHaveBeenCalledTimes(1);

    const rewarded = await showRewardedAd('speed4x');
    expect(rewarded).toBe(true);
    expect(mocks.adMob.showRewardVideoAd).toHaveBeenCalledOnce();
    // Dismiss sonrası otomatik sonraki preload tetiklenmiş olmalı
    expect(mocks.adMob.prepareRewardVideoAd).toHaveBeenCalledTimes(2);
  });

  it('reklam yarıda kapatılırsa (Rewarded tetiklenmeden) ödül vermez', async () => {
    mocks.adMob.requestConsentInfo.mockResolvedValue(consent('NOT_REQUIRED', true));
    mocks.adMob.prepareRewardVideoAd.mockResolvedValue({ adUnitId: 'test' });

    let dismissedCallback: (() => void) | null = null;
    mocks.adMob.addListener.mockImplementation((event: string, callback: any) => {
      if (event === 'rewardedDismissed') dismissedCallback = callback;
      return Promise.resolve({ remove: vi.fn() });
    });

    mocks.adMob.showRewardVideoAd.mockImplementation(async () => {
      // Rewarded tetiklenmeden doğrudan kapatıldı
      dismissedCallback?.();
      return {} as any;
    });

    const { preloadRewardedAd, showRewardedAd } = await subject();
    await preloadRewardedAd();

    const rewarded = await showRewardedAd('speed4x');
    expect(rewarded).toBe(false);
  });

  it('hata sınıflandırıcı AdMob hata kategorilerini doğru tespit eder', async () => {
    const { classifyAdMobError } = await subject();

    expect(classifyAdMobError({ code: 3, message: 'No fill' })).toBe('no fill');
    expect(classifyAdMobError({ message: 'No inventory for ad unit' })).toBe('no fill');
    expect(classifyAdMobError({ message: 'Reward Video is Not Ready Yet' })).toBe('ad not ready');
    expect(classifyAdMobError({ code: 1, message: 'Invalid Request' })).toBe('invalid ad unit');
    expect(classifyAdMobError({ message: 'Cannot use AdMob ad unit ID with Ad Manager' })).toBe('invalid ad unit');
    expect(classifyAdMobError({ message: 'Consent not obtained' })).toBe('consent/UMP problemi');
    expect(classifyAdMobError({ code: 2, message: 'Network connection failed' })).toBe('network problemi');
    expect(classifyAdMobError({ message: 'Ad failed to present full screen content' })).toBe('presentation error');
    expect(classifyAdMobError({ message: 'AdMob initialize failed' })).toBe('initialization failure');
  });

  it('test modu açıldığında resmi Google test ad unit ID kullanılır', async () => {
    const { setAdMobTestMode, isAdMobTestMode, getRewardedAdUnitId, TEST_AD_UNITS } = await subject();

    setAdMobTestMode(true);
    expect(isAdMobTestMode()).toBe(true);
    expect(getRewardedAdUnitId()).toBe(TEST_AD_UNITS.rewarded.ios);

    setAdMobTestMode(false);
    expect(isAdMobTestMode()).toBe(false);
  });
});
