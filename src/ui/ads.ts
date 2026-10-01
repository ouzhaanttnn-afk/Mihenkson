/**
 * Ödüllü (rewarded) reklam köprüsü — Google AdMob, @capacitor-community/admob.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * KAPSAM SINIRI
 *
 * Bu dosya yalnız "reklamı göster, ödül kazanıldı mı söyle" işini yapar.
 * Ödülün OYUNA ne yaptığına hiç karışmaz — `unlock4x()` ve
 * `triggerCustomerRush()` (gameStore.ts) hâlâ tek karar mercii: ikisi de
 * zaten reklamdan önce, GDD 26.2 / 23.10.1 gereği tasarlanmıştı. Burada
 * yalnız o iki çağrının önüne bir "reklamı gerçekten izledin mi" kapısı
 * ekleniyor. Ekonomiye, pazarlığa, müşteri kalitesine dokunmaz.
 *
 * NEDEN OLAY DİNLEYİCİLERİ, PROMISE DEĞİL?
 * `showRewardVideoAd()`'ın promise'i "ödül kazanılınca çözülür" diye
 * belgelense de, web stub'ı (bkz. @capacitor-community/admob/web.js)
 * hiç ödül olayı ATEŞLEMEDEN sahte bir sonuçla hemen çözülüyor. Gerçek ödülü
 * yalnız `Rewarded` OLAYININ ateşlenip ateşlenmediğine bakarak doğrularız;
 * `Dismissed`/`FailedToShow` gördüğümüzde de ödül YOK kararını veririz.
 *
 * NATIVE OLMAYAN ORTAM (tarayıcı/`vite dev`) İÇİN SESSİZCE ÖDÜL VERİLMEZ.
 * Eskiden (gerçek sağlayıcı yokken) StatusStrip/RushFab düğmeleri direkt
 * ödülü veriyordu — bilerek "video izle" iddiasında bulunmuyordu (bkz. o
 * dosyaların eski yorumları). Şimdi gerçek sağlayıcı bağlandığına göre aynı
 * dürüstlük ilkesi tersine döner: reklam gerçekten gösterilemiyorsa (web,
 * simülatörde SDK yok, ağ hatası) ödül de verilmez — sahte "izledin"
 * simülasyonu yapmayız, ne oyuncuya ne de mağaza incelemesine.
 *
 * AD UNIT ID'LERİ — gerçek AdMob hesabından alınır, `.env`'den okunur (bkz.
 * `.env.example`, `src/vite-env.d.ts`). Bu ID'ler GİZLİ değildir (native
 * derlemede zaten APK/IPA içine gömülür, hesaba erişim yetkisi taşımaz);
 * `.env`'e taşınma sebebi ortam-özgü yapılandırma olmalarıdır. Oyuncunun
 * isteyerek başlattığı bütün ödüller AYNI ödüllü reklam birimini paylaşır —
 * hangi ödülün verileceği reklam biriminin kendisinden değil,
 * `showRewardedAd(kind)`in çağrıldığı yerden gelir. Tamamlanan işlem / gün
 * raporu arasındaki geçiş reklamı (`showInterstitialAd`) AYRI ve FARKLI
 * TÜRDE bir reklam birimi kullanır
 * (bkz. aşağıdaki INTERSTITIAL bölümü) — rewarded birimle karıştırılmamalı.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { setAdAudioPaused } from './audio';
import { setRewardedFeedback, type RewardedFeedback } from './ad-feedback';
import { Capacitor } from '@capacitor/core';
import { premiumEntitlement } from './premium';
import {
  AdMob,
  InterstitialAdPluginEvents,
  RewardAdPluginEvents,
  type AdMobRewardItem,
  type AdMobError,
} from '@capacitor-community/admob';

/** Bir ödülün ne için verildiği — hangi oyun içi etkinin tetikleneceğini seçer. */
export type RewardKind =
  | 'speed4x'
  | 'customerRush'
  | 'personnelWaiver'
  | 'personnelTempUnlock'
  | 'dailySponsor'
  | 'patienceBoost'
  | 'expertHint'
  | 'cosmeticTrial'
  | 'supplyExpress'
  | 'workshopRush'
  | 'customerRecall'
  | 'extraOffer'
  | 'freeShipping'
  | 'dailyCosmetic';

/** Google'ın resmi test reklam birimi kimlikleri */
export const TEST_AD_UNITS = {
  rewarded: {
    ios: 'ca-app-pub-3940256099942544/1712485313',
    android: 'ca-app-pub-3940256099942544/5224354917',
  },
  interstitial: {
    ios: 'ca-app-pub-3940256099942544/4411468910',
    android: 'ca-app-pub-3940256099942544/1033173712',
  },
} as const;

/** Production ortamından (.env) gelen reklam birimi kimlikleri */
export const PROD_AD_UNITS = {
  rewarded: {
    android: import.meta.env.VITE_ADMOB_REWARD_UNIT_ANDROID || 'ca-app-pub-4229088811556918/3366498503',
    ios: import.meta.env.VITE_ADMOB_REWARD_UNIT_IOS || 'ca-app-pub-4229088811556918/9671167921',
  },
  dayOpen: {
    android: import.meta.env.VITE_ADMOB_DAY_OPEN_UNIT_ANDROID || 'ca-app-pub-4229088811556918/7681148035',
    ios: import.meta.env.VITE_ADMOB_DAY_OPEN_UNIT_IOS || 'ca-app-pub-4229088811556918/7939178650',
  },
} as const;

let testModeActive = import.meta.env.DEV || import.meta.env.VITE_ADMOB_TEST_MODE === 'true';

export function setAdMobTestMode(enabled: boolean): void {
  testModeActive = enabled;
  console.info(`[ADMOB][CONFIG] Test ad mode set to: ${enabled}`);
  resetRewardedAdState();
  resetInterstitialAdState();
  initPromise = null;
}

export function isAdMobTestMode(): boolean {
  return testModeActive;
}

if (typeof window !== 'undefined') {
  (window as any).__setAdMobTestMode = setAdMobTestMode;
  (window as any).__isAdMobTestMode = isAdMobTestMode;
}

function platformOf(): 'android' | 'ios' | null {
  const platform = Capacitor.getPlatform();
  return platform === 'android' || platform === 'ios' ? platform : null;
}

export function getRewardedAdUnitId(): string | null {
  const platform = platformOf();
  if (!platform) return null;
  if (testModeActive) {
    return TEST_AD_UNITS.rewarded[platform];
  }
  return PROD_AD_UNITS.rewarded[platform] || null;
}

export function getDayOpenAdUnitId(): string | null {
  const platform = platformOf();
  if (!platform) return null;
  if (testModeActive) {
    return TEST_AD_UNITS.interstitial[platform];
  }
  return PROD_AD_UNITS.dayOpen[platform] || null;
}

export type AdMobErrorCategory =
  | 'no fill'
  | 'ad not ready'
  | 'invalid ad unit'
  | 'initialization failure'
  | 'consent/UMP problemi'
  | 'network problemi'
  | 'presentation error'
  | 'unknown';

export function classifyAdMobError(error: any): AdMobErrorCategory {
  if (!error) return 'unknown';

  const code = typeof error === 'object' && error !== null && 'code' in error ? Number(error.code) : null;
  const message = String(error?.message || error?.errorDescription || error || '').toLowerCase();

  if (
    message.includes('not ready') ||
    message.includes('no ad prepared') ||
    message.includes('not loaded') ||
    message.includes('ad_not_ready')
  ) {
    return 'ad not ready';
  }

  if (
    message.includes('consent') ||
    message.includes('ump') ||
    message.includes('privacy') ||
    message.includes('canrequestads')
  ) {
    return 'consent/UMP problemi';
  }

  if (
    message.includes('initialize') ||
    message.includes('init') ||
    message.includes('sdk')
  ) {
    return 'initialization failure';
  }

  if (
    code === 1 ||
    message.includes('invalid ad unit') ||
    message.includes('invalid request') ||
    message.includes('adunitid') ||
    message.includes('malformed') ||
    message.includes('cannot use admob ad unit')
  ) {
    return 'invalid ad unit';
  }

  if (
    code === 2 ||
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('connection') ||
    message.includes('offline') ||
    message.includes('unreachable')
  ) {
    return 'network problemi';
  }

  if (
    code === 3 ||
    message.includes('no fill') ||
    message.includes('no inventory') ||
    message.includes('no ad config') ||
    message.includes('no matching ads') ||
    message.includes('request completed without an ad')
  ) {
    return 'no fill';
  }

  if (
    message.includes('presentation') ||
    message.includes('failed to show') ||
    message.includes('present') ||
    message.includes('already showing')
  ) {
    return 'presentation error';
  }

  return 'unknown';
}

export function logAdLoadError(error: any): void {
  console.error('[ADMOB][REWARDED][LOAD_ERROR]', error);
  const category = classifyAdMobError(error);
  console.error(`[ADMOB][REWARDED][LOAD_ERROR][CATEGORY: ${category}]`, {
    category,
    code: error?.code,
    message: error?.message || String(error),
    adUnitId: getRewardedAdUnitId(),
    testMode: testModeActive,
  });
}

function adFailureReason(error: unknown): RewardedFeedback {
  const category = classifyAdMobError(error);
  return category === 'no fill' ? 'unavailable'
    : category === 'network problemi' ? 'network'
    : category === 'consent/UMP problemi' ? 'consent' : 'failed';
}

export function logAdShowError(error: any): void {
  console.error('[ADMOB][REWARDED][SHOW_ERROR]', error);
  const category = classifyAdMobError(error);
  console.error(`[ADMOB][REWARDED][SHOW_ERROR][CATEGORY: ${category}]`, {
    category,
    code: error?.code,
    message: error?.message || String(error),
    adUnitId: getRewardedAdUnitId(),
    testMode: testModeActive,
  });
}

type PrivacyOptionsRequirement = 'UNKNOWN' | 'REQUIRED' | 'NOT_REQUIRED';

interface AdConsentGate {
  canRequestAds: boolean;
  privacyOptionsRequirement: PrivacyOptionsRequirement;
}

let initPromise: Promise<AdConsentGate> | null = null;
let privacyOptionsOpen = false;

/**
 * SDK'yı ve Google UMP onay akışını tek seferlik hazırlar. Reklam isteği
 * ancak UMP `canRequestAds` döndürdükten sonra açılır. ATT/IDFA açıklaması
 * AdMob konsolundaki UMP mesajı tarafından yönetilir; burada ayrıca sistem
 * istemi çağırıp kullanıcıya iki farklı onay akışı göstermeyiz.
 */
function ensureInitialized(allowConsentForm = true): Promise<AdConsentGate> {
  if (!initPromise) {
    initPromise = (async () => {
      try {
        console.info('[ADMOB][INIT] Initializing Google Mobile Ads SDK...');
        await AdMob.initialize({
          initializeForTesting: testModeActive,
        });
        console.info('[ADMOB][INIT] AdMob initialized.');
      } catch (initErr) {
        console.error('[ADMOB][INIT_ERROR]', initErr);
        const cat = classifyAdMobError(initErr);
        console.error(`[ADMOB][INIT_ERROR][CATEGORY: ${cat}]`, initErr);
        throw initErr;
      }

      let consent = await AdMob.requestConsentInfo();
      if (allowConsentForm && !consent?.canRequestAds && consent?.isConsentFormAvailable) {
        console.info('[ADMOB][CONSENT] Consent form available, presenting to user...');
        consent = await AdMob.showConsentForm();
      }
      return {
        canRequestAds: Boolean(consent?.canRequestAds),
        privacyOptionsRequirement: consent?.privacyOptionsRequirementStatus ?? 'UNKNOWN',
      };
    })().catch((error) => {
      // Ağ/UMP hatasında daha sonraki kullanıcı eylemi yeniden deneyebilsin.
      initPromise = null;
      throw error;
    });
  }
  return initPromise.then(consent => {
    // A non-requestable result is not a permanent session lock.
    if (!consent.canRequestAds) initPromise = null;
    return consent;
  });
}

/** Uygulama başlangıcında (main.tsx) çağrılır; SDK ve ilk preload'u tetikler. */
export async function initializeAds(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    console.info('[ADMOB][INIT] Not a native platform, skipping AdMob initialization.');
    return;
  }
  try {
    if (await premiumEntitlement() !== false) return;
    const consent = await ensureInitialized();
    console.info('[ADMOB][INIT] Initialization complete. canRequestAds:', consent.canRequestAds);
    if (consent.canRequestAds) {
      await Promise.all([preloadRewardedAd(), preloadInterstitialAd()]);
    }
  } catch (error) {
    console.error('[ADMOB][INIT_ERROR] initializeAds failed:', error);
  }
}

export type AdPrivacyOptionsResult = 'shown' | 'not-required' | 'unavailable' | 'failed';

/** Native Ayarlar'daki Google UMP gizlilik tercihleri giriş noktası. */
export async function showAdPrivacyOptions(): Promise<AdPrivacyOptionsResult> {
  if (!Capacitor.isNativePlatform() || privacyOptionsOpen) return 'unavailable';
  let opened = false;
  try {
    const consent = await ensureInitialized();
    if (consent.privacyOptionsRequirement === 'UNKNOWN') {
      return 'unavailable';
    }
    if (consent.privacyOptionsRequirement === 'NOT_REQUIRED') {
      return 'not-required';
    }
    if (privacyOptionsOpen) return 'unavailable';
    privacyOptionsOpen = true;
    opened = true;
    // Invalidate before presentation too: no old creative may race a changed privacy choice.
    resetRewardedAdState();
    resetInterstitialAdState();
    initPromise = null;
    await AdMob.showPrivacyOptionsForm();
    return 'shown';
  } catch (error) {
    console.warn('[ads] Gizlilik tercihleri açılamadı:', error);
    return 'failed';
  } finally {
    if (opened) {
      privacyOptionsOpen = false;
      resetRewardedAdState();
      resetInterstitialAdState();
      initPromise = null;
    }
  }
}

export function adPrivacyOptionsSupported(): boolean {
  return Capacitor.isNativePlatform();
}

// ─── REWARDED AD PRELOAD & LIFECYCLE STATE ────────────────────────────────────

let isRewardedAdLoaded = false;
let isRewardedAdLoading = false;
let rewardedLoadPromise: Promise<boolean> | null = null;
let loadedAdUnitId: string | null = null;
let lastLoadFailure: RewardedFeedback = null;
let rewardedGeneration = 0;

export function isRewardedAdReady(): boolean {
  return isRewardedAdLoaded;
}

function resetRewardedAdState(): void {
  rewardedGeneration++;
  isRewardedAdLoaded = false;
  isRewardedAdLoading = false;
  rewardedLoadPromise = null;
  loadedAdUnitId = null;
  lastLoadFailure = null;
}

/**
 * Rewarded reklamı önceden belleğe yükler (preload).
 * Show çağrısından önce çağrılmalı veya uygulama açılışında / reklam bitiminde tetiklenmelidir.
 */
export async function preloadRewardedAd(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  const generation = rewardedGeneration;
  if (await premiumEntitlement() !== false || generation !== rewardedGeneration) return false;

  const unitId = getRewardedAdUnitId();
  if (!unitId) {
    const error = new Error('No rewarded ad unit ID available for current platform');
    logAdLoadError(error);
    return false;
  }

  if (isRewardedAdLoaded && loadedAdUnitId === unitId) {
    console.info(`[ADMOB][REWARDED] Ad already preloaded and ready (Unit: ${unitId}).`);
    return true;
  }

  if (isRewardedAdLoading && rewardedLoadPromise) {
    return rewardedLoadPromise;
  }

  isRewardedAdLoading = true;
  rewardedLoadPromise = (async () => {
    try {
      if (!(await ensureInitialized()).canRequestAds || generation !== rewardedGeneration) return false;

      console.info(`[ADMOB][REWARDED] Preloading ad (Unit: ${unitId}, TestMode: ${testModeActive})...`);
      await AdMob.prepareRewardVideoAd({ adId: unitId });
      if (generation !== rewardedGeneration) return false;
      lastLoadFailure = null;
      isRewardedAdLoaded = true;
      loadedAdUnitId = unitId;
      isRewardedAdLoading = false;
      console.info(`[ADMOB][REWARDED] Preload successful (Unit: ${unitId}).`);
      return true;
    } catch (error: any) {
      if (generation !== rewardedGeneration) return false;
      isRewardedAdLoaded = false;
      loadedAdUnitId = null;
      isRewardedAdLoading = false;
      logAdLoadError(error);
      lastLoadFailure = adFailureReason(error);
      return false;
    } finally {
      if (generation === rewardedGeneration) {
        isRewardedAdLoading = false;
        rewardedLoadPromise = null;
      }
    }
  })();

  return rewardedLoadPromise;
}

/**
 * Ödüllü reklamı gösterir, oyuncu ödülü GERÇEKTEN kazandıysa `true` döner.
 *
 * Native olmayan platformda (web/dev), reklam SDK'sı yoksa veya reklam
 * yüklenemezse/gösterilemezse `false` döner — hiçbir dal sessizce ödül
 * uydurmaz.
 */
async function presentRewardedAd(kind: RewardKind): Promise<boolean> {
  const premium = await premiumEntitlement();
  if (premium === true) return true;
  if (premium === null) { setRewardedFeedback('premium-unknown'); return false; }
  if (!Capacitor.isNativePlatform()) {
    setRewardedFeedback('web');
    console.info(`[ads] Ödüllü reklam (${kind}) yalnız native (iOS/Android) derlemede çalışır; web/dev ortamında atlanıyor.`);
    return false;
  }

  // A cached creative never bypasses current UMP permission.
  try { if (!(await ensureInitialized()).canRequestAds) { setRewardedFeedback('consent'); return false; } }
  catch (error) { setRewardedFeedback(adFailureReason(error)); logAdShowError(error); return false; }

  // 1. Eğer halihazırda bir yükleme sürüyorsa kısa bir süre tamamlanmasını bekle
  if (!isRewardedAdLoaded && isRewardedAdLoading && rewardedLoadPromise) {
    console.info('[ADMOB][REWARDED] Preload in progress, waiting briefly...');
    await Promise.race([
      rewardedLoadPromise,
      new Promise((resolve) => setTimeout(resolve, 3500)),
    ]);
  }

  // 2. REKLAM HENÜZ YÜKLENMEDİYSE SHOW() ÇAĞIRMA!
  if (!isRewardedAdLoaded) {
    setRewardedFeedback(isRewardedAdLoading ? 'loading' : lastLoadFailure ?? 'loading');
    const notReadyErr = new Error('Reward Video is Not Ready Yet');
    logAdShowError(notReadyErr);
    // Bir sonraki denemeye hazır olsun diye arka planda preload başlat
    void preloadRewardedAd();
    return false;
  }

  // Yüklü reklam tüketiliyor
  isRewardedAdLoaded = false;
  loadedAdUnitId = null;

  return new Promise<boolean>((resolve) => {
    let rewarded = false;
    let settled = false;
    const handles: Promise<{ remove: () => void }>[] = [];

    const cleanup = () => {
      for (const h of handles) {
        h.then((handle) => handle.remove()).catch(() => {});
      }
    };

    const finish = (result: boolean) => {
      if (settled) return;
      settled = true;
      cleanup();
      // Reklam kapandıktan sonra bir sonraki rewarded reklamı otomatik preload et
      void preloadRewardedAd();
      resolve(result);
    };

    handles.push(
      AdMob.addListener(RewardAdPluginEvents.Rewarded, (reward: AdMobRewardItem) => {
        console.info('[ADMOB][REWARDED] User earned reward:', reward);
        rewarded = true;
      }),
      AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
        console.info(`[ADMOB][REWARDED] Ad dismissed. User rewarded: ${rewarded}`);
        // Reklam başarıyla TAMAMLANDIĞINDA ödülü ver; yarıda kapatıldıysa ödül verme
        if (!rewarded) setRewardedFeedback('cancelled');
        finish(rewarded);
      }),
      AdMob.addListener(RewardAdPluginEvents.FailedToShow, (error: AdMobError) => {
        setRewardedFeedback(adFailureReason(error));
        logAdShowError(error);
        finish(false);
      }),
    );

    Promise.all(handles).then(() => AdMob.showRewardVideoAd()).catch(error => { setRewardedFeedback(adFailureReason(error)); logAdShowError(error); finish(false); });
  });
}

export const INTERSTITIAL_LOAD_TIMEOUT_MS = 8_000;
export const INTERSTITIAL_PREFLIGHT_TIMEOUT_MS = 1_000;
export const INTERSTITIAL_SHOW_START_TIMEOUT_MS = 5_000;
export const INTERSTITIAL_CACHE_MAX_AGE_MS = 3_600_000;
let interstitialGeneration = 0;
let interstitialLoadPromise: Promise<boolean> | null = null;
let interstitialCreative: { unitId: string; loadedAtMs: number } | null = null;
// Native prepares cannot be cancelled and use one cache entry per unit. Keep them serialized
// even after a JS timeout, so an old response cannot overwrite a newer prepared creative.
let interstitialNativeLoadPending = false;

function adMonotonicNow(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function resetInterstitialAdState(): void {
  interstitialGeneration++;
  interstitialCreative = null;
  interstitialLoadPromise = null;
}

function boundedAdOperation<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Ad operation timeout')), timeoutMs);
    operation.then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
  });
}

export function isInterstitialAdReady(): boolean {
  if (!interstitialCreative) return false;
  const age = adMonotonicNow() - interstitialCreative.loadedAtMs;
  if (interstitialCreative.unitId !== getDayOpenAdUnitId() || age < 0 || age >= INTERSTITIAL_CACHE_MAX_AGE_MS) {
    interstitialCreative = null;
    return false;
  }
  return true;
}

/** Background preparation only. A loaded callback never opens an ad. */
export function preloadInterstitialAd(): Promise<boolean> {
  if (!Capacitor.isNativePlatform() || privacyOptionsOpen || adBusy) return Promise.resolve(false);
  if (interstitialLoadPromise) return interstitialLoadPromise;
  if (interstitialNativeLoadPending) return Promise.resolve(false);
  const generation = interstitialGeneration;
  const unitId = getDayOpenAdUnitId();
  if (!unitId) return Promise.resolve(false);
  const operation = (async () => {
    if (await premiumEntitlement() !== false || generation !== interstitialGeneration) return false;
    if (!(await ensureInitialized(false)).canRequestAds || generation !== interstitialGeneration || privacyOptionsOpen || adBusy) return false;
    if (isInterstitialAdReady()) return true;
    interstitialNativeLoadPending = true;
    try { await AdMob.prepareInterstitial({ adId: unitId }); }
    finally { interstitialNativeLoadPending = false; }
    if (generation !== interstitialGeneration || await premiumEntitlement() !== false) return false;
    if (generation !== interstitialGeneration) return false;
    interstitialCreative = { unitId, loadedAtMs: adMonotonicNow() };
    return true;
  })();
  interstitialLoadPromise = boundedAdOperation(operation, INTERSTITIAL_LOAD_TIMEOUT_MS)
    .catch(error => {
      if (generation === interstitialGeneration) resetInterstitialAdState();
      console.warn('[ads] Geçiş reklamı yüklenemedi:', error);
      return false;
    })
    .finally(() => { if (generation === interstitialGeneration) interstitialLoadPromise = null; });
  return interstitialLoadPromise;
}

function surfaceSafe(isSurfaceSafe: () => boolean): boolean {
  try {
    return !privacyOptionsOpen && (typeof document === 'undefined' || document.visibilityState === 'visible') && isSurfaceSafe();
  } catch { return false; }
}

/** Checks/registration have one shared deadline; the already-visible creative has no duration timer. */
function presentInterstitialAd(isSurfaceSafe: () => boolean): Promise<boolean> {
  const generation = interstitialGeneration;
  return new Promise<boolean>((resolve) => {
    let settled = false;
    let shown = false;
    let requested = false;
    let showTimer: ReturnType<typeof setTimeout> | null = null;
    const handles: Promise<{ remove: () => void }>[] = [];
    const finish = (result: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(preflightTimer);
      if (showTimer !== null) clearTimeout(showTimer);
      for (const handle of handles) void handle.then(value => value.remove()).catch(() => undefined);
      resolve(result);
    };
    const preflightTimer = setTimeout(() => finish(false), INTERSTITIAL_PREFLIGHT_TIMEOUT_MS);
    const run = async () => {
      // Refresh UMP without opening a consent form at a gameplay break.
      const [premium, consent] = await Promise.all([premiumEntitlement(), AdMob.requestConsentInfo()]);
      if (settled) return;
      if (premium !== false || !consent?.canRequestAds) {
        resetInterstitialAdState();
        if (!consent?.canRequestAds) initPromise = null;
        finish(false);
        return;
      }
      if (generation !== interstitialGeneration || !isInterstitialAdReady() || !surfaceSafe(isSurfaceSafe)) {
        finish(false); return;
      }
      handles.push(
        AdMob.addListener(InterstitialAdPluginEvents.Showed, () => {
          if (settled || !requested) return;
          shown = true;
          if (showTimer !== null) clearTimeout(showTimer);
        }),
        AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => { if (requested) finish(true); }),
        AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, () => { if (requested) finish(shown); }),
      );
      await Promise.all(handles);
      if (settled) return;
      // Listener registration can cross a foreground/navigation/entitlement transition.
      if (await premiumEntitlement() !== false) { resetInterstitialAdState(); finish(false); return; }
      if (settled) return;
      if (generation !== interstitialGeneration || !isInterstitialAdReady() || !surfaceSafe(isSurfaceSafe)) {
        finish(false); return;
      }
      const unitId = interstitialCreative!.unitId;
      interstitialCreative = null;
      requested = true;
      clearTimeout(preflightTimer);
      // This bounds a missing presentation acknowledgement, not ad length. The native SDK
      // cannot cancel an issued show request; a native acknowledgement arriving late is a limitation.
      showTimer = setTimeout(() => { if (!shown) finish(false); }, INTERSTITIAL_SHOW_START_TIMEOUT_MS);
      await AdMob.showInterstitial({ adId: unitId });
    };
    void run().catch(() => finish(shown));
  });
}

// Shared presentation gate. Time is real foreground-independent time, not game time.
export const REWARDED_INTERSTITIAL_GAP_MS = 120_000;
let adBusy = false;
let rewardedEndedAt: number | null = null;
let interstitialEndedAt: number | null = null;

/** Includes checks and a pending native presentation, so session time never accrues during either. */
export function isAdPresenting(): boolean { return adBusy; }

export function interstitialAllowed(now = Date.now()): boolean {
  return !adBusy &&
    (rewardedEndedAt === null || now - rewardedEndedAt >= REWARDED_INTERSTITIAL_GAP_MS) &&
    (interstitialEndedAt === null || now - interstitialEndedAt >= REWARDED_INTERSTITIAL_GAP_MS);
}

export async function showRewardedAd(kind: RewardKind): Promise<boolean> {
  if (adBusy) return false;
  setRewardedFeedback(null);
  adBusy = true;
  setAdAudioPaused(true);
  try { return await presentRewardedAd(kind); }
  catch (error) { setRewardedFeedback(adFailureReason(error)); return false; }
  finally {
    rewardedEndedAt = Date.now();
    adBusy = false;
    setAdAudioPaused(false);
  }
}

export async function showInterstitialAd(isSurfaceSafe: () => boolean = () => true): Promise<boolean> {
  if (!Capacitor.isNativePlatform() || !interstitialAllowed() || !isInterstitialAdReady() || !surfaceSafe(isSurfaceSafe)) return false;
  adBusy = true;
  setAdAudioPaused(true);
  try { return await presentInterstitialAd(isSurfaceSafe); }
  finally {
    interstitialEndedAt = Date.now();
    adBusy = false;
    setAdAudioPaused(false);
  }
}
