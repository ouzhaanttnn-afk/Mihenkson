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
  Varsayılan EFEKT düzeyi %50 — önceki değer %70'ti.

  Kullanıcı isteği: "Sesi bayağı kısman lazım, orijinal düzeyi 50 olsun."
  O an efekt ve müzik hâlâ aynı tek kaydırıcıdan besleniyordu; %70'te ikisi
  üst üste binince kulakta kalabalık duruyordu. Bir adım sonra müzik kendi
  düzeyine ayrıldı (aşağıdaki `DEFAULT_MUSIC_VOLUME`), ama efektin varsayılanı
  %50'de kaldı — kendi başına da makul bir başlangıç.
*/
export const DEFAULT_VOLUME = 50;
/*
  MÜZİK KENDİ DÜZEYİNE SAHİP — efekt kaydırıcısıyla ayrıştı.

  Kullanıcı isteği: "Bu müziğin sesini manuel düşürmem lazım onu da ekle,
  ses düzeyi var müzik ses düzeyi diye de olsun." Önceki tasarımda müzik
  efektin düzeyinden TÜREYEN sabit bir oranla (0,42) çalıyordu; oyuncunun
  müziği efektten bağımsız kısması mümkün değildi. %20, o eski türetilmiş
  değere yakın (%50 × 0,42 ≈ %21) seçildi — geçiş algısal bir sıçrama
  yaratmasın diye — ama artık BAĞIMSIZ bir sayı, bir oran değil.
*/
export const DEFAULT_MUSIC_VOLUME = 20;
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
  /**
   * Fon müziğinin düzeyi, 0–100 tam sayı — `soundVolume`den BAĞIMSIZ.
   *
   * Efektle aynı kaydırıcıyı paylaşsaydı oyuncu müziği efekti susturmadan
   * kısamazdı; ayrı alan olması istekti. Aynı gerekçelerle tam sayı: kayıtta
   * kararlı, ekranda doğrudan okunur.
   */
  musicVolume: number;
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
 * Varsayılanlar. Ses efektleri ve titreşim AÇIK başlar: oyuncu bir şeyi
 * kapatmayı seçmediyse, oyunun kendini tam hâliyle tanıtması beklenir.
 *
 * MÜZİK İSTİSNA — varsayılan KAPALI. Kullanıcı geri bildirimi: "açık
 * konuşayım müziği beğenmedim." Sentez altyapısı (`tools/muzik-uret.py`,
 * telifsiz) yerinde duruyor ve Ayarlar'dan istenildiğinde açılabiliyor —
 * kaldırılmadı, yalnız artık kendiliğinden çalmıyor. Oyuncuya beğenmediği
 * bir şeyi ilk açılışta dayatmamak, "özelliği göster" kaygısından önce
 * gelir.
 */
export function defaultPreferences(): PlayerPreferences {
  return {
    soundEnabled: true,
    musicEnabled: false,
    soundVolume: DEFAULT_VOLUME,
    musicVolume: DEFAULT_MUSIC_VOLUME,
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
 *
 * `fallback` PARAMETRELİ: efekt ve müzik düzeyi aynı sınırları (0–100) ve
 * aynı yuvarlama kuralını paylaşıyor ama bozuk girdide FARKLI varsayılana
 * düşmesi gerekiyor — ikisini ayrı fonksiyona kopyalamak yerine tek
 * fonksiyon parametreleşti.
 */
export function normalizeVolume(raw: unknown, fallback: number = DEFAULT_VOLUME): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return fallback;
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
      ESKİ KAYITTA BU ALAN YOK ve varsayılana düşer — artık KAPALI (bkz.
      `defaultPreferences`). Önceki gerekçe ("eklenen şeyi hiç göstermeme")
      geçerliydi ama kullanıcı geri bildirimi bunun önüne geçti: müziği
      beğenmedi. Zaten AÇIK olarak kaydedilmiş bir tercihi bu satır
      değiştirmiyor — yalnız hiç dokunmamış eski/yeni kayıtların düştüğü yer.
    */
    musicEnabled:
      typeof source.musicEnabled === 'boolean' ? source.musicEnabled : fallback.musicEnabled,
    soundVolume: normalizeVolume(source.soundVolume, fallback.soundVolume),
    /*
      ESKİ KAYITTA BU ALAN DA YOK ve `DEFAULT_MUSIC_VOLUME`e düşer — 0'a
      değil. 0'a düşseydi müzik `musicEnabled` açık gelen eski kayıtta
      sessizce çalışmayan bir özellik gibi dururdu (bkz. gain <= 0 kontrolü,
      music.ts).
    */
    musicVolume: normalizeVolume(source.musicVolume, fallback.musicVolume),
    vibrationEnabled:
      typeof source.vibrationEnabled === 'boolean'
        ? source.vibrationEnabled
        : fallback.vibrationEnabled,
    language: normalizeLanguage(source.language),
    currency: normalizeCurrency(source.currency),
  };
}
