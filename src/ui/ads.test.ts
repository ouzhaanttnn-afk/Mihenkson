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
    Showed: 'interstitialShowed',
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
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

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
  it('no fill is not reported as the player abandoning an ad', async () => {
    mocks.adMob.requestConsentInfo.mockResolvedValue(consent('NOT_REQUIRED'));
    mocks.adMob.prepareRewardVideoAd.mockRejectedValue({ code: 3, message: 'No fill' });
    const api = await subject();
    await expect(api.preloadRewardedAd()).resolves.toBe(false);
    await expect(api.showRewardedAd('speed4x')).resolves.toBe(false);
    const { rewardedFailureMessage } = await import('./ad-feedback');
    expect(rewardedFailureMessage('fallback')).toContain('uygun reklam bulunamadı');
    expect(mocks.adMob.showRewardVideoAd).not.toHaveBeenCalled();
  });
  it('web explains native-only rewards without pretending an ad was watched', async () => {
    mocks.isNativePlatform.mockReturnValue(false);
    const api = await subject();
    await expect(api.showRewardedAd('speed4x')).resolves.toBe(false);
    const { rewardedFailureMessage } = await import('./ad-feedback');
    expect(rewardedFailureMessage('fallback')).toContain('mobil uygulamada');
  });
  it('unprepared creative reports preparation, never cancellation', async () => {
    mocks.adMob.requestConsentInfo.mockResolvedValue(consent('NOT_REQUIRED'));
    const api = await subject();
    await expect(api.showRewardedAd('speed4x')).resolves.toBe(false);
    const { rewardedFailureMessage } = await import('./ad-feedback');
    expect(rewardedFailureMessage('fallback')).toContain('hazırlanıyor');
  });
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

describe('bounded preloaded interstitial presentation', () => {
  function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
  }

  async function flush() {
    for (let i = 0; i < 30; i++) await Promise.resolve();
  }

  async function setup(preload = true) {
    mocks.adMob.requestConsentInfo.mockResolvedValue(consent('NOT_REQUIRED'));
    mocks.adMob.prepareInterstitial.mockResolvedValue({ adUnitId: 'prepared' });
    const callbacks = new Map<string, () => void>();
    const removals: ReturnType<typeof vi.fn>[] = [];
    mocks.adMob.addListener.mockImplementation(async (name: string, callback: () => void) => {
      const remove = vi.fn();
      removals.push(remove);
      callbacks.set(name, callback);
      return { remove };
    });
    const api = await subject();
    if (preload) expect(await api.preloadInterstitialAd()).toBe(true);
    return { api, callbacks, removals };
  }

  it('prepares in the background, coalesces loads and never presents from a load result', async () => {
    const { api } = await setup(false);
    const load = deferred<{ adUnitId: string }>();
    mocks.adMob.prepareInterstitial.mockReturnValue(load.promise);
    const first = api.preloadInterstitialAd();
    const second = api.preloadInterstitialAd();
    expect(first).toBe(second);
    await flush();
    expect(mocks.adMob.prepareInterstitial).toHaveBeenCalledOnce();
    expect(api.isInterstitialAdReady()).toBe(false);
    load.resolve({ adUnitId: 'prepared' });
    await expect(first).resolves.toBe(true);
    expect(api.isInterstitialAdReady()).toBe(true);
    expect(mocks.adMob.showInterstitial).not.toHaveBeenCalled();
    expect(api.isAdPresenting()).toBe(false);
  });

  it('skips an unprepared break without starting or waiting for a load', async () => {
    const { api } = await setup(false);
    await expect(api.showInterstitialAd()).resolves.toBe(false);
    expect(mocks.adMob.prepareInterstitial).not.toHaveBeenCalled();
    expect(mocks.adMob.showInterstitial).not.toHaveBeenCalled();
    expect(api.isAdPresenting()).toBe(false);
  });

  it.each([true, null])('does not initialize or preload when Premium is %s', async premium => {
    mocks.premiumEntitlement.mockResolvedValue(premium);
    const api = await subject();
    await api.initializeAds();
    await expect(api.preloadRewardedAd()).resolves.toBe(false);
    await expect(api.preloadInterstitialAd()).resolves.toBe(false);
    expect(mocks.adMob.initialize).not.toHaveBeenCalled();
    expect(mocks.adMob.prepareRewardVideoAd).not.toHaveBeenCalled();
    expect(mocks.adMob.prepareInterstitial).not.toHaveBeenCalled();
  });

  it('expires a preloaded creative at one monotonic hour', async () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const { api } = await setup();
    now = api.INTERSTITIAL_CACHE_MAX_AGE_MS - 1;
    expect(api.isInterstitialAdReady()).toBe(true);
    now += 1;
    expect(api.isInterstitialAdReady()).toBe(false);
    await expect(api.showInterstitialAd()).resolves.toBe(false);
    expect(mocks.adMob.showInterstitial).not.toHaveBeenCalled();
  });

  it('invalidates a cache on monotonic rollback instead of extending its age', async () => {
    let now = 100;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const { api } = await setup();
    now = 50;
    expect(api.isInterstitialAdReady()).toBe(false);
  });

  it('invalidates both cached formats when test mode changes', async () => {
    const { api } = await setup();
    await api.preloadRewardedAd();
    expect(api.isRewardedAdReady()).toBe(true);
    api.setAdMobTestMode(!api.isAdMobTestMode());
    expect(api.isInterstitialAdReady()).toBe(false);
    expect(api.isRewardedAdReady()).toBe(false);
  });

  it('privacy options invalidate cached creatives before the form closes', async () => {
    mocks.adMob.requestConsentInfo.mockResolvedValue(consent('REQUIRED'));
    mocks.adMob.prepareInterstitial.mockResolvedValue({ adUnitId: 'prepared' });
    const api = await subject();
    await api.preloadInterstitialAd();
    await api.preloadRewardedAd();
    const form = deferred<void>();
    mocks.adMob.showPrivacyOptionsForm.mockReturnValue(form.promise);
    const options = api.showAdPrivacyOptions();
    await flush();
    expect(api.isInterstitialAdReady()).toBe(false);
    expect(api.isRewardedAdReady()).toBe(false);
    form.resolve(undefined);
    await expect(options).resolves.toBe('shown');
  });

  it('no fill resolves false and never consumes a native show request', async () => {
    const { api } = await setup(false);
    mocks.adMob.prepareInterstitial.mockRejectedValue(new Error('No fill'));
    await expect(api.preloadInterstitialAd()).resolves.toBe(false);
    expect(api.isInterstitialAdReady()).toBe(false);
    await expect(api.showInterstitialAd()).resolves.toBe(false);
    expect(mocks.adMob.showInterstitial).not.toHaveBeenCalled();
  });

  it('bounds loading and ignores the late native result', async () => {
    const { api } = await setup(false);
    vi.useFakeTimers();
    const load = deferred<{ adUnitId: string }>();
    mocks.adMob.prepareInterstitial.mockReturnValue(load.promise);
    const result = api.preloadInterstitialAd();
    await flush();
    await vi.advanceTimersByTimeAsync(api.INTERSTITIAL_LOAD_TIMEOUT_MS);
    await expect(result).resolves.toBe(false);
    await expect(api.preloadInterstitialAd()).resolves.toBe(false);
    expect(mocks.adMob.prepareInterstitial).toHaveBeenCalledOnce();
    load.resolve({ adUnitId: 'late' });
    await flush();
    expect(api.isInterstitialAdReady()).toBe(false);
    expect(mocks.adMob.showInterstitial).not.toHaveBeenCalled();
    mocks.adMob.prepareInterstitial.mockResolvedValue({ adUnitId: 'fresh' });
    await expect(api.preloadInterstitialAd()).resolves.toBe(true);
    expect(api.isInterstitialAdReady()).toBe(true);
  });

  it('ignores an old generation load after test configuration changes', async () => {
    const { api } = await setup(false);
    const load = deferred<{ adUnitId: string }>();
    mocks.adMob.prepareInterstitial.mockReturnValue(load.promise);
    const result = api.preloadInterstitialAd();
    await flush();
    api.setAdMobTestMode(!api.isAdMobTestMode());
    load.resolve({ adUnitId: 'stale' });
    await expect(result).resolves.toBe(false);
    expect(api.isInterstitialAdReady()).toBe(false);
  });

  it.each([true, null])('rechecks Premium %s instead of serving a cached ad', async premium => {
    const { api } = await setup();
    mocks.premiumEntitlement.mockResolvedValue(premium);
    await expect(api.showInterstitialAd()).resolves.toBe(false);
    expect(mocks.adMob.showInterstitial).not.toHaveBeenCalled();
    expect(api.isInterstitialAdReady()).toBe(false);
  });

  it('rechecks current UMP permission rather than trusting the preload permission', async () => {
    const { api } = await setup();
    mocks.adMob.requestConsentInfo.mockResolvedValue(consent('UNKNOWN', false));
    await expect(api.showInterstitialAd()).resolves.toBe(false);
    expect(api.isInterstitialAdReady()).toBe(false);
    expect(mocks.adMob.showInterstitial).not.toHaveBeenCalled();
  });

  it('bounds preflight and never presents when an entitlement result arrives late', async () => {
    const { api } = await setup();
    vi.useFakeTimers();
    const premium = deferred<boolean>();
    mocks.premiumEntitlement.mockReturnValue(premium.promise);
    const result = api.showInterstitialAd();
    expect(api.isAdPresenting()).toBe(true);
    await vi.advanceTimersByTimeAsync(api.INTERSTITIAL_PREFLIGHT_TIMEOUT_MS);
    await expect(result).resolves.toBe(false);
    expect(api.isAdPresenting()).toBe(false);
    premium.resolve(false);
    await flush();
    expect(mocks.adMob.showInterstitial).not.toHaveBeenCalled();
  });

  it('rechecks foreground after an asynchronous preflight', async () => {
    const { api } = await setup();
    const visibility = { visibilityState: 'visible' };
    vi.stubGlobal('document', visibility);
    const premium = deferred<boolean>();
    mocks.premiumEntitlement.mockReturnValue(premium.promise);
    const result = api.showInterstitialAd();
    visibility.visibilityState = 'hidden';
    premium.resolve(false);
    await expect(result).resolves.toBe(false);
    expect(mocks.adMob.showInterstitial).not.toHaveBeenCalled();
  });

  it('rechecks the caller surface after asynchronous listener registration', async () => {
    const { api } = await setup();
    const registrations: ReturnType<typeof deferred<{ remove: () => void }>>[] = [];
    mocks.adMob.addListener.mockImplementation(() => {
      const handle = deferred<{ remove: () => void }>();
      registrations.push(handle);
      return handle.promise;
    });
    let safe = true;
    const result = api.showInterstitialAd(() => safe);
    await flush();
    expect(registrations).toHaveLength(3);
    safe = false;
    const removals = registrations.map(() => vi.fn());
    registrations.forEach((handle, i) => handle.resolve({ remove: removals[i]! }));
    await expect(result).resolves.toBe(false);
    await flush();
    removals.forEach(remove => expect(remove).toHaveBeenCalledOnce());
    expect(mocks.adMob.showInterstitial).not.toHaveBeenCalled();
  });

  it('rechecks Premium after the listener-registration boundary', async () => {
    const { api } = await setup();
    mocks.premiumEntitlement.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    await expect(api.showInterstitialAd()).resolves.toBe(false);
    expect(mocks.adMob.showInterstitial).not.toHaveBeenCalled();
    expect(api.isInterstitialAdReady()).toBe(false);
  });

  it('cleans up successful listener registrations when one registration rejects', async () => {
    const { api } = await setup();
    const remove = vi.fn();
    mocks.adMob.addListener
      .mockResolvedValueOnce({ remove })
      .mockRejectedValueOnce(new Error('Listener registration failed'))
      .mockResolvedValueOnce({ remove });
    await expect(api.showInterstitialAd()).resolves.toBe(false);
    await flush();
    expect(remove).toHaveBeenCalledTimes(2);
    expect(api.isAdPresenting()).toBe(false);
    expect(mocks.adMob.showInterstitial).not.toHaveBeenCalled();
  });

  it('a native show promise alone does not prove that an ad was shown', async () => {
    const { api } = await setup();
    vi.useFakeTimers();
    mocks.adMob.showInterstitial.mockResolvedValue(undefined);
    const result = api.showInterstitialAd();
    await flush();
    expect(mocks.adMob.showInterstitial).toHaveBeenCalledOnce();
    expect(api.isAdPresenting()).toBe(true);
    await vi.advanceTimersByTimeAsync(api.INTERSTITIAL_SHOW_START_TIMEOUT_MS);
    await expect(result).resolves.toBe(false);
    expect(api.isAdPresenting()).toBe(false);
  });

  it('holds the presentation lock until dismissal after Showed, without an ad-duration timeout', async () => {
    const { api, callbacks, removals } = await setup();
    vi.useFakeTimers();
    const result = api.showInterstitialAd();
    await flush();
    callbacks.get('interstitialShowed')!();
    callbacks.get('interstitialShowed')!();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(api.isAdPresenting()).toBe(true);
    await expect(api.showRewardedAd('customerRush')).resolves.toBe(false);
    await expect(api.showInterstitialAd()).resolves.toBe(false);
    expect(mocks.adMob.showRewardVideoAd).not.toHaveBeenCalled();
    callbacks.get('interstitialDismissed')!();
    callbacks.get('interstitialDismissed')!();
    await expect(result).resolves.toBe(true);
    expect(api.isAdPresenting()).toBe(false);
    await flush();
    removals.forEach(remove => expect(remove).toHaveBeenCalledOnce());
    expect(api.isInterstitialAdReady()).toBe(false);
  });

  it('Dismissed proves presentation even if the Showed callback was lost', async () => {
    const { api, callbacks } = await setup();
    const result = api.showInterstitialAd();
    await flush();
    callbacks.get('interstitialDismissed')!();
    await expect(result).resolves.toBe(true);
  });

  it('FailedToShow and native rejection return false and release the lock', async () => {
    const { api, callbacks } = await setup();
    const result = api.showInterstitialAd();
    await flush();
    callbacks.get('interstitialFailedToShow')!();
    callbacks.get('interstitialFailedToShow')!();
    await expect(result).resolves.toBe(false);
    expect(api.isAdPresenting()).toBe(false);
    expect(api.isInterstitialAdReady()).toBe(false);
  });

  it('native show rejection releases the lock without claiming an impression', async () => {
    const { api } = await setup();
    mocks.adMob.showInterstitial.mockRejectedValue(new Error('Native presentation error'));
    await expect(api.showInterstitialAd()).resolves.toBe(false);
    expect(api.isAdPresenting()).toBe(false);
  });

  it('a terminal native failure after Showed preserves the actual impression and releases the lock', async () => {
    const { api, callbacks } = await setup();
    const result = api.showInterstitialAd();
    await flush();
    callbacks.get('interstitialShowed')!();
    callbacks.get('interstitialFailedToShow')!();
    await expect(result).resolves.toBe(true);
    expect(api.isAdPresenting()).toBe(false);
  });

  it('a rejected native request after Showed also preserves the proven impression', async () => {
    const { api, callbacks } = await setup();
    const native = deferred<void>();
    mocks.adMob.showInterstitial.mockReturnValue(native.promise);
    const result = api.showInterstitialAd();
    await flush();
    callbacks.get('interstitialShowed')!();
    native.reject(new Error('Native presentation ended with an error'));
    await expect(result).resolves.toBe(true);
    expect(api.isAdPresenting()).toBe(false);
  });

  it('automatic preload never opens a consent form at a gameplay break', async () => {
    mocks.adMob.requestConsentInfo.mockResolvedValue({
      ...consent('REQUIRED', false), isConsentFormAvailable: true,
    });
    const api = await subject();
    await expect(api.preloadInterstitialAd()).resolves.toBe(false);
    await expect(api.preloadInterstitialAd()).resolves.toBe(false);
    expect(mocks.adMob.showConsentForm).not.toHaveBeenCalled();
    expect(mocks.adMob.prepareInterstitial).not.toHaveBeenCalled();
  });

  it('boot initialization may complete the consent form before preparing either format', async () => {
    mocks.adMob.requestConsentInfo.mockResolvedValue({
      ...consent('REQUIRED', false), isConsentFormAvailable: true,
    });
    mocks.adMob.showConsentForm.mockResolvedValue(consent('NOT_REQUIRED'));
    const api = await subject();
    await api.initializeAds();
    expect(mocks.adMob.showConsentForm).toHaveBeenCalledOnce();
    expect(mocks.adMob.prepareInterstitial).toHaveBeenCalledOnce();
    expect(mocks.adMob.prepareRewardVideoAd).toHaveBeenCalledOnce();
  });

  it('does not prepare or present while the explicit privacy form is open', async () => {
    mocks.adMob.requestConsentInfo.mockResolvedValue(consent('REQUIRED'));
    mocks.adMob.prepareInterstitial.mockResolvedValue({ adUnitId: 'prepared' });
    const api = await subject();
    await api.preloadInterstitialAd();
    const form = deferred<void>();
    mocks.adMob.showPrivacyOptionsForm.mockReturnValue(form.promise);
    const options = api.showAdPrivacyOptions();
    await flush();
    await expect(api.preloadInterstitialAd()).resolves.toBe(false);
    await expect(api.showInterstitialAd()).resolves.toBe(false);
    expect(mocks.adMob.prepareInterstitial).toHaveBeenCalledOnce();
    form.resolve(undefined);
    await options;
    expect(api.isInterstitialAdReady()).toBe(false);
  });

  it('a concurrently pending rewarded ad prevents any interstitial request', async () => {
    const { api, callbacks } = await setup();
    await api.preloadRewardedAd();
    const rewarded = api.showRewardedAd('speed4x');
    await flush();
    await expect(api.showInterstitialAd()).resolves.toBe(false);
    expect(mocks.adMob.showInterstitial).not.toHaveBeenCalled();
    callbacks.get('rewardedDismissed')!();
    await expect(rewarded).resolves.toBe(false);
    await expect(api.showInterstitialAd()).resolves.toBe(false);
    expect(api.interstitialAllowed(Date.now() + api.REWARDED_INTERSTITIAL_GAP_MS + 1)).toBe(true);
  });
});
