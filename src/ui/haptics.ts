/**
 * TİTREŞİM (haptik) — sunum katmanı.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * KAPSAM: yalnız titreştirir. Oyun durumunu DEĞİŞTİRMEZ, ekonomi/değerleme
 * modülü import ETMEZ. Ses gibi bu da bir geri bildirimdir.
 *
 * PLATFORM GERÇEĞİ — ÖNEMLİ:
 *   `navigator.vibrate` Android/Chrome'da vardır. **iOS Safari'de YOKTUR** ve
 *   Apple'ın web'e açtığı bir haptik API'si de yoktur. Yani iPhone'da bu ayar
 *   tarayıcıda titreşim yoktur. Native iOS/Android derlemesinde Capacitor
 *   Haptics kullanılır; web için navigator.vibrate yedeği korunur.
 *
 * NEDEN HER OLAYDA DEĞİL: titreşim sesten daha müdahalecidir. `test` (mihenk
 * ve ölçüm araçları) her dokunuşta tetikleniyor; oraya titreşim koymak
 * telefonu sürekli titretirdi. Bu yüzden desen tablosunda YOK — sessizce
 * atlanır.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { SoundId } from './audio';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/**
 * Olay → titreşim deseni (ms). Tek sayı tek darbe; dizi darbe/duraklama
 * sırasıdır. Desenler kısa tutuldu: uzun titreşim oyunda rahatsız eder.
 *
 * `test` bilerek yok (bkz. başlık). Tabloda olmayan olay titreşmez.
 */
export const HAPTIC_PATTERNS: Partial<Record<SoundId, number | number[]>> = {
  deal: 18,                        // anlaşma kapandı — tek, net
  deny: [22, 40, 22],              // reddedildi — çift darbe, farkı elde hissedilsin
  coins: 12,                       // alım onayı — hafif tık
  customer: 12,                    // müşteri geldi — dikkat çek, rahatsız etme
  chime: 30,                       // gün kapandı — tek ve biraz daha uzun
  levelup: [14, 45, 14, 45, 26],   // seviye — kutlama ritmi
};

/** Aynı desen üst üste binerse elde tek uzun titreşime dönüşür; bunu engelle. */
const MIN_REPEAT_MS = 120;
let lastAt = 0;

function supported(): boolean {
  return Capacitor.isNativePlatform() || (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function');
}

export function selectionHaptic(enabled: boolean): void {
  if (!enabled || !Capacitor.isNativePlatform()) return;
  const now = Date.now();
  if (now - lastSelection < 100) return;
  lastSelection = now;
  void Haptics.selectionStart().then(() => Haptics.selectionChanged()).then(() => Haptics.selectionEnd()).catch(() => undefined);
}
let lastSelection = 0;

/** Cihaz/tarayıcı titreşimi destekliyor mu — arayüzün dürüst konuşabilmesi için. */
export function hapticsSupported(): boolean {
  return supported();
}

/**
 * Olaya karşılık gelen deseni titreştirir.
 *
 * Kapalıysa, desen tanımlı değilse, platform desteklemiyorsa ya da çağrı
 * başarısız olursa SESSİZCE hiçbir şey yapmaz — çağıran tarafın kontrol
 * etmesi gerekmez.
 */
export function playHaptic(id: SoundId, enabled: boolean): void {
  if (!enabled || !supported()) return;
  const pattern = HAPTIC_PATTERNS[id];
  if (pattern === undefined) return;

  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (now - lastAt < MIN_REPEAT_MS) return;
  lastAt = now;

  if (Capacitor.isNativePlatform()) {
    const result = id === 'deal' || id === 'levelup'
      ? Haptics.notification({ type: NotificationType.Success })
      : id === 'deny'
        ? Haptics.notification({ type: NotificationType.Warning })
        : Haptics.impact({ style: ImpactStyle.Light });
    void result.catch(() => undefined);
    return;
  }

  try {
    navigator.vibrate(pattern);
  } catch {
    // Bazı tarayıcılar kullanıcı etkileşimi olmadan reddeder; oyun etkilenmez.
  }
}

/** Açık bir titreşimi kes — ayardan kapatılınca elde kalan darbe sürmesin. */
export function stopHaptics(): void {
  if (Capacitor.isNativePlatform()) { void Haptics.selectionEnd().catch(() => undefined); return; }
  if (!supported()) return;
  try {
    navigator.vibrate(0);
  } catch {
    // yok sayılır
  }
}

/** Testler için. */
export function resetHapticsForTests(): void {
  lastAt = 0;
  lastSelection = 0;
}
