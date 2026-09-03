/**
 * Oyuncu tercihleri — ses, titreşim, dil ve para birimi.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * KAPSAM SINIRI — profil modülüyle aynı disiplin.
 *
 * Burada tutulanlar SUNUM tercihleridir; hiçbiri oyun gücü vermez, ekonomiye,
 * pazarlığa, determinizme veya ilerlemeye dokunmaz. Bu dosya hiçbir ekonomi
 * veya değerleme modülünü import ETMEZ. Böyle bir import belirirse tercih
 * sessizce bir mekaniğe dönüşmüş demektir.
 *
 * HEPSİ BAĞLI. Ses ve titreşim çalışıyor; dil `src/i18n` sözlüğünü,
 * para birimi de `src/i18n/currency` gösterim çarpanını sürüyor. Hiçbiri
 * oyun gücü vermez: dil ve para birimi yalnız EKRANI değiştirir, kasadaki
 * parayı ve ekonomiyi değil (bkz. `src/i18n/invariance.test.ts`).
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { CURRENCIES, DEFAULT_CURRENCY, type CurrencyId } from '@i18n/currency';

export { CURRENCIES, DEFAULT_CURRENCY };
export type { CurrencyId };

/** Desteklenen diller. İkisi de canlı: sözlük `src/i18n/en.ts`. */
export const LANGUAGES = [
  { id: 'tr', label: 'Türkçe' },
  { id: 'en', label: 'English' },
] as const;

export type LanguageId = (typeof LANGUAGES)[number]['id'];

export const DEFAULT_LANGUAGE: LanguageId = 'tr';

export const VOLUME_MIN = 0;
export const VOLUME_MAX = 100;
/*
  Varsayılan düzey %70: alışıldık bir başlangıç, hem yukarı hem aşağı yer
  bırakır. Tam açık başlamak, oyunu ilk kez sessiz bir ortamda açanı şaşırtır.
*/
export const DEFAULT_VOLUME = 70;
/** Kaydırıcının adımı; 21 durak, başparmakla ayarlanabilir bir hassasiyet. */
export const VOLUME_STEP = 5;

export interface PlayerPreferences {
  /**
   * EFEKT sesleri — işlem, gün ve müşteri olayları.
   *
   * Bir zamanlar bu tek anahtardı ve yorumu "müzik ile efekti ayırmak
   * oyuncuya var olmayan bir ayrım sunmak olurdu" diyordu. Artık bir fon
   * müziği var (`assets/audio/music`), yani ayrım gerçek: efektler kısa ve
   * olaya bağlıdır, müzik süreklidir ve insanların ilkini isteyip ikincisini
   * istememesi (ya da tersi) çok yaygındır.
   */
  soundEnabled: boolean;
  /** Sürekli çalan fon müziği — efektlerden AYRI açılıp kapanır. */
  musicEnabled: boolean;
  /**
   * Ses düzeyi, 0–100 tam sayı.
   *
   * ONDALIK ORAN (0–1) DEĞİL, BİLEREK: değer kayda yazılıyor ve ondalık
   * sayılar kayıt dosyasında sürüm sürüm kayabilir (0.7000000000000001).
   * Tam sayı hem kayıtta kararlı hem ekranda doğrudan okunur. Sesi bağlarken
   * çevirmek tek bölme işlemi: `gain = soundVolume / 100`.
   */
  soundVolume: number;
  /** Dokunsal geri bildirim (haptik). */
  vibrationEnabled: boolean;
  language: LanguageId;
  /**
   * GÖSTERİM para birimi. Oyunun iç birimi her koşulda TL'dir; bu alan
   * yalnız ekrana basılırken uygulanan çarpanı seçer (bkz. i18n/currency).
   */
  currency: CurrencyId;
}

/**
 * Varsayılanlar. Ses ve titreşim AÇIK başlar: oyuncu bir şeyi kapatmayı
 * seçmediyse, oyunun kendini tam hâliyle tanıtması beklenir. Bağlanana
 * kadar bunun görünür bir etkisi olmaz.
 */
export function defaultPreferences(): PlayerPreferences {
  return {
    soundEnabled: true,
    musicEnabled: true,
    soundVolume: DEFAULT_VOLUME,
    vibrationEnabled: true,
    language: DEFAULT_LANGUAGE,
    currency: DEFAULT_CURRENCY,
  };
}

/**
 * Ses düzeyini güvenli aralığa çeker.
 *
 * SNAP YAPILMAZ: değer `VOLUME_STEP`in katına yuvarlanmaz. Adım yalnız
 * kaydırıcının davranışıdır; ileride adım değişirse ya da başka bir yoldan
 * 73 yazılırsa o değer geçerli kalmalı, sessizce oynatılmamalı.
 */
export function normalizeVolume(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return DEFAULT_VOLUME;
  return Math.min(VOLUME_MAX, Math.max(VOLUME_MIN, Math.round(raw)));
}

/** Bilinmeyen dil kimliğini varsayılana çeker — bozuk kayıt çökertmez. */
export function normalizeLanguage(id: unknown): LanguageId {
  return LANGUAGES.some((l) => l.id === id) ? (id as LanguageId) : DEFAULT_LANGUAGE;
}

/** Bilinmeyen para birimi kimliğini varsayılana çeker. */
export function normalizeCurrency(id: unknown): CurrencyId {
  return CURRENCIES.some((c) => c.id === id) ? (id as CurrencyId) : DEFAULT_CURRENCY;
}

/**
 * Kaydedilmiş (veya eksik / bozuk) tercihleri güvenli hâle getirir.
 *
 * Parametre `unknown`, `Partial<PlayerPreferences>` DEĞİL — girdi diskten
 * okunmuş JSON'dur ve orada her şey olabilir (elle düzenlenmiş kayıt, eski
 * sürüm, yarım yazılmış dosya). `normalizeProfile` ile aynı gerekçe.
 *
 * Boolean alanlarda `!== false` KULLANILMIYOR: o, `"hayır"` veya `0` gibi
 * bozuk bir değeri "açık" saymak olurdu. Yalnız gerçek `boolean` kabul
 * edilir, gerisi varsayılana düşer.
 */
export function normalizePreferences(raw: unknown): PlayerPreferences {
  const source = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const fallback = defaultPreferences();
  return {
    soundEnabled:
      typeof source.soundEnabled === 'boolean' ? source.soundEnabled : fallback.soundEnabled,
    /*
      ESKİ KAYITTA BU ALAN YOK ve varsayılana düşer (açık). Bilerek: müzik
      oyuna sonradan girdi, eski oyuncunun onu "kapatmış" olması mümkün değil;
      sessizce kapalı başlatmak, eklenen şeyi hiç göstermemek olurdu.
    */
    musicEnabled:
      typeof source.musicEnabled === 'boolean' ? source.musicEnabled : fallback.musicEnabled,
    soundVolume: normalizeVolume(source.soundVolume),
    vibrationEnabled:
      typeof source.vibrationEnabled === 'boolean'
        ? source.vibrationEnabled
        : fallback.vibrationEnabled,
    language: normalizeLanguage(source.language),
    currency: normalizeCurrency(source.currency),
  };
}
