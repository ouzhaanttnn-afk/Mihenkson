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
 *   açık olsa bile titreşim OLMAZ; bu bir hata değil, platform sınırıdır.
 *   Kod bunu sessizce ve zararsızca karşılar: API yoksa hiçbir şey yapmaz.
 *
 * NEDEN HER OLAYDA DEĞİL: titreşim sesten daha müdahalecidir. `test` (mihenk
 * ve ölçüm araçları) her dokunuşta tetikleniyor; oraya titreşim koymak
 * telefonu sürekli titretirdi. Bu yüzden desen tablosunda YOK — sessizce
 * atlanır.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { SoundId } from './audio';

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
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

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

  try {
    navigator.vibrate(pattern);
  } catch {
    // Bazı tarayıcılar kullanıcı etkileşimi olmadan reddeder; oyun etkilenmez.
  }
}

/** Açık bir titreşimi kes — ayardan kapatılınca elde kalan darbe sürmesin. */
export function stopHaptics(): void {
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
}
