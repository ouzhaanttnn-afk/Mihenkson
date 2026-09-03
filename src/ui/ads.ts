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
 * AD UNIT ID'LERİ — gerçek AdMob hesabından alındı (uygulama: MİHENKAYNAK,
 * yayıncı kimliği ca-app-pub-4229088811556918). "4x hız" ve "Dükkânı
 * Canlandır" AYNI ödüllü reklam birimini paylaşır — hangi ödülün verileceği
 * reklam biriminin kendisinden değil, `showRewardedAd(kind)`in çağrıldığı
 * yerden gelir. Pazartesi açılış geçiş reklamı (`showInterstitialAd`) AYRI
 * ve FARKLI TÜRDE bir reklam birimi kullanır (bkz. aşağıdaki INTERSTITIAL
 * bölümü) — rewarded birimle karıştırılmamalı.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Capacitor } from '@capacitor/core';
import {
  AdMob,
  AdmobConsentStatus,
  InterstitialAdPluginEvents,
  RewardAdPluginEvents,
  type AdMobRewardItem,
} from '@capacitor-community/admob';

/** Bir ödülün ne için verildiği — hangi oyun içi etkinin tetikleneceğini seçer. */
export type RewardKind = 'speed4x' | 'customerRush' | 'personnelWaiver' | 'personnelTempUnlock';

const REWARD_AD_UNIT: Record<'android' | 'ios', string> = {
  android: 'ca-app-pub-4229088811556918/3366498503',
  ios: 'ca-app-pub-4229088811556918/9671167921',
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
const DAY_OPEN_AD_UNIT: Record<'android' | 'ios', string> = {
  android: 'ca-app-pub-4229088811556918/7681148035',
  ios: 'ca-app-pub-4229088811556918/7939178650',
};

function platformOf(): 'android' | 'ios' | null {
  const platform = Capacitor.getPlatform();
  return platform === 'android' || platform === 'ios' ? platform : null;
}

let initPromise: Promise<void> | null = null;

/**
 * SDK'yı, iOS App Tracking Transparency iznini ve GDPR (UMP) onay akışını
 * tek seferlik hazırlar. Sıralama AdMob'un kendi önerdiği sırayla aynı:
 * initialize → (iOS'ta gerekirse) ATT izni → GDPR onayı gerekiyorsa form.
 */
function ensureInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await AdMob.initialize();

      const tracking = await AdMob.trackingAuthorizationStatus();
      if (tracking.status === 'notDetermined') {
        await AdMob.requestTrackingAuthorization();
      }

      const consent = await AdMob.requestConsentInfo();
      if (consent.status === AdmobConsentStatus.REQUIRED && consent.isConsentFormAvailable) {
        await AdMob.showConsentForm();
      }
    })();
  }
  return initPromise;
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
    await ensureInitialized();
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
    await ensureInitialized();
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
