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
 * Canlandır" AYRI reklam birimleri kullanır — hangi ödülün verileceği
 * yine de reklam biriminin kendisinden değil, `showRewardedAd(kind)`in
 * çağrıldığı yerden gelir; ayrım yalnız AdMob konsolunda iki akışı ayrı
 * raporlayabilmek için.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Capacitor } from '@capacitor/core';
import { AdMob, AdmobConsentStatus, RewardAdPluginEvents, type AdMobRewardItem } from '@capacitor-community/admob';

/** Bir ödülün ne için verildiği — hangi oyun içi etkinin tetikleneceğini seçer. */
export type RewardKind = 'speed4x' | 'customerRush';

const PLATFORM_AD_UNIT: Record<'android' | 'ios', Record<RewardKind, string>> = {
  android: {
    speed4x: 'ca-app-pub-4229088811556918/3366498503',
    customerRush: 'ca-app-pub-4229088811556918/7681148035',
  },
  ios: {
    speed4x: 'ca-app-pub-4229088811556918/9671167921',
    customerRush: 'ca-app-pub-4229088811556918/7939178650',
  },
};

function adUnitId(kind: RewardKind): string | null {
  const platform = Capacitor.getPlatform();
  if (platform !== 'android' && platform !== 'ios') return null;
  return PLATFORM_AD_UNIT[platform][kind];
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
    console.info('[ads] Ödüllü reklam yalnız native (iOS/Android) derlemede çalışır; web/dev ortamında atlanıyor.');
    return false;
  }

  const unitId = adUnitId(kind);
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
