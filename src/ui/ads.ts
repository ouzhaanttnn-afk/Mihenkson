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
 * `.env`'e taşınma sebebi ortam-özgü yapılandırma olmalarıdır. "4x hız" ve
 * "Dükkânı Canlandır" AYNI ödüllü reklam birimini paylaşır — hangi ödülün
 * verileceği reklam biriminin kendisinden değil, `showRewardedAd(kind)`in
 * çağrıldığı yerden gelir. Pazartesi açılış geçiş reklamı
 * (`showInterstitialAd`) AYRI ve FARKLI TÜRDE bir reklam birimi kullanır
 * (bkz. aşağıdaki INTERSTITIAL bölümü) — rewarded birimle karıştırılmamalı.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Capacitor } from '@capacitor/core';
import {
  AdMob,
  InterstitialAdPluginEvents,
  RewardAdPluginEvents,
  type AdMobRewardItem,
} from '@capacitor-community/admob';

/** Bir ödülün ne için verildiği — hangi oyun içi etkinin tetikleneceğini seçer. */
export type RewardKind = 'speed4x' | 'customerRush' | 'personnelWaiver' | 'personnelTempUnlock';

const REWARD_AD_UNIT: Record<'android' | 'ios', string | undefined> = {
  android: import.meta.env.VITE_ADMOB_REWARD_UNIT_ANDROID,
  ios: import.meta.env.VITE_ADMOB_REWARD_UNIT_IOS,
};

/**
 * Pazartesi açılış geçiş reklamı — GDD dışı, kullanıcı isteği: "pazardan
 * pazartesiye geçtiğimizde reklam verecez zorunlu reklam gibi". OYUNCU
 * BAŞLATMIYOR; hafta açılışında OTOMATİK gösterilir. Bu yüzden rewarded
 * DEĞİL, interstitial (geçiş reklamı) formatı kullanılıyor — AdMob'un
 * rewarded kuralları "oyuncu kendi başlatır, vazgeçebilir" der; otomatik/
 * zorunlu göstermek o formatı ihlal eder ve hesap askıya alınma riski
 * taşır. Interstitial'da bu kısıtlama yok: Google'ın kendi kapatma (X)
 * kontrolü reklamın üstünde durur, biz ayrıca bir "atla" UI'ı eklemiyoruz.
 */
const DAY_OPEN_AD_UNIT: Record<'android' | 'ios', string | undefined> = {
  android: import.meta.env.VITE_ADMOB_DAY_OPEN_UNIT_ANDROID,
  ios: import.meta.env.VITE_ADMOB_DAY_OPEN_UNIT_IOS,
};

function platformOf(): 'android' | 'ios' | null {
  const platform = Capacitor.getPlatform();
  return platform === 'android' || platform === 'ios' ? platform : null;
}

type PrivacyOptionsRequirement = 'UNKNOWN' | 'REQUIRED' | 'NOT_REQUIRED';

interface AdConsentGate {
  canRequestAds: boolean;
  privacyOptionsRequirement: PrivacyOptionsRequirement;
}

let initPromise: Promise<AdConsentGate> | null = null;

/**
 * SDK'yı ve Google UMP onay akışını tek seferlik hazırlar. Reklam isteği
 * ancak UMP `canRequestAds` döndürdükten sonra açılır. ATT/IDFA açıklaması
 * AdMob konsolundaki UMP mesajı tarafından yönetilir; burada ayrıca sistem
 * istemi çağırıp kullanıcıya iki farklı onay akışı göstermeyiz.
 */
function ensureInitialized(): Promise<AdConsentGate> {
  if (!initPromise) {
    initPromise = (async () => {
      await AdMob.initialize();

      let consent = await AdMob.requestConsentInfo();
      if (
        !consent.canRequestAds &&
        consent.isConsentFormAvailable
      ) {
        consent = await AdMob.showConsentForm();
      }
      return {
        canRequestAds: consent.canRequestAds,
        privacyOptionsRequirement: consent.privacyOptionsRequirementStatus,
      };
    })().catch((error) => {
      // Ağ/UMP hatasında daha sonraki kullanıcı eylemi yeniden deneyebilsin.
      initPromise = null;
      throw error;
    });
  }
  return initPromise;
}

export type AdPrivacyOptionsResult = 'shown' | 'not-required' | 'unavailable' | 'failed';

/** Native Ayarlar'daki Google UMP gizlilik tercihleri giriş noktası. */
export async function showAdPrivacyOptions(): Promise<AdPrivacyOptionsResult> {
  if (!Capacitor.isNativePlatform()) return 'unavailable';
  try {
    const consent = await ensureInitialized();
    if (consent.privacyOptionsRequirement === 'UNKNOWN') {
      return 'unavailable';
    }
    if (consent.privacyOptionsRequirement === 'NOT_REQUIRED') {
      return 'not-required';
    }
    await AdMob.showPrivacyOptionsForm();
    // Form sonrasında izin durumu değişmiş olabilir; bir sonraki reklamın
    // güncel `canRequestAds` kararını yeniden almasını sağla.
    initPromise = null;
    return 'shown';
  } catch (error) {
    console.warn('[ads] Gizlilik tercihleri açılamadı:', error);
    return 'failed';
  }
}

export function adPrivacyOptionsSupported(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Ödüllü reklamı gösterir, oyuncu ödülü GERÇEKTEN kazandıysa `true` döner.
 *
 * Native olmayan platformda (web/dev), reklam SDK'sı yoksa veya reklam
 * yüklenemezse/gösterilemezse `false` döner — hiçbir dal sessizce ödül
 * uydurmaz.
 */
export async function showRewardedAd(kind: RewardKind): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    console.info(`[ads] Ödüllü reklam (${kind}) yalnız native (iOS/Android) derlemede çalışır; web/dev ortamında atlanıyor.`);
    return false;
  }

  const platform = platformOf();
  const unitId = platform ? REWARD_AD_UNIT[platform] : null;
  if (!unitId) return false;

  try {
    if (!(await ensureInitialized()).canRequestAds) return false;
    await AdMob.prepareRewardVideoAd({ adId: unitId });
  } catch (err) {
    console.warn('[ads] Reklam yüklenemedi:', err);
    return false;
  }

  return new Promise<boolean>((resolve) => {
    let rewarded = false;
    let settled = false;
    const handles: Promise<{ remove: () => void }>[] = [];

    const finish = (result: boolean) => {
      if (settled) return;
      settled = true;
      resolve(result);
      // Dinleyiciler sonraki gösterimlerde birikmesin diye temizlenir.
      for (const h of handles) h.then((handle) => handle.remove());
    };

    handles.push(
      AdMob.addListener(RewardAdPluginEvents.Rewarded, (_reward: AdMobRewardItem) => {
        rewarded = true;
      }),
      AdMob.addListener(RewardAdPluginEvents.Dismissed, () => finish(rewarded)),
      AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => finish(false)),
    );

    AdMob.showRewardVideoAd().catch(() => finish(false));
  });
}

/**
 * Pazartesi açılış geçiş reklamını gösterir. ÖDÜL DÖNDÜRMEZ — bu bir
 * rewarded değil, interstitial: oyuncu başlatmıyor, kapanışını Google'ın
 * kendi reklam çerçevesi yönetiyor.
 *
 * ÇAĞIRAN TARAFI ASLA BEKLETMEZ/KİLİTLEMEZ: reklam yüklenemezse veya native
 * değilse günün açılışı normal akışında devam eder — reklam bir ekonomi
 * veya ilerleme koşulu DEĞİLDİR, yalnız bir yan etkidir. Bu yüzden
 * `gameStore.ts` bu fonksiyonu `await` ETMEDEN çağırır (fire-and-forget).
 */
export async function showInterstitialAd(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const platform = platformOf();
  const unitId = platform ? DAY_OPEN_AD_UNIT[platform] : null;
  if (!unitId) return;

  try {
    if (!(await ensureInitialized()).canRequestAds) return;
    await AdMob.prepareInterstitial({ adId: unitId });
  } catch (err) {
    console.warn('[ads] Geçiş reklamı yüklenemedi:', err);
    return;
  }

  return new Promise<void>((resolve) => {
    let settled = false;
    const handles: Promise<{ remove: () => void }>[] = [];

    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
      for (const h of handles) h.then((handle) => handle.remove());
    };

    handles.push(
      AdMob.addListener(InterstitialAdPluginEvents.Dismissed, finish),
      AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, finish),
    );

    AdMob.showInterstitial().catch(finish);
  });
}
