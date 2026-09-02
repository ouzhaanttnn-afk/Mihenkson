/**
 * Oyuncu tercihleri — ses, titreşim ve dil.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * KAPSAM SINIRI — profil modülüyle aynı disiplin.
 *
 * Burada tutulanlar SUNUM tercihleridir; hiçbiri oyun gücü vermez, ekonomiye,
 * pazarlığa, determinizme veya ilerlemeye dokunmaz. Bu dosya hiçbir ekonomi
 * veya değerleme modülünü import ETMEZ. Böyle bir import belirirse tercih
 * sessizce bir mekaniğe dönüşmüş demektir.
 *
 * DAVRANIŞ HENÜZ BAĞLI DEĞİL — BİLEREK. Bu tabanda ses altyapısı yok
 * (`public/assets/audio` klasörü bile yok) ve arayüz tek dilli. Anahtarlar
 * tercihi SAKLAR; sesi çalan, titreten ve metni çeviren katman sonra
 * bağlanacak. Ayarlar penceresi bunu oyuncuya açıkça söyler: çalışmayan bir
 * anahtarı çalışıyormuş gibi göstermek, ayarlar ekranının güvenilirliğini
 * tam da orada kırardı.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Desteklenen diller. Şimdilik yalnız Türkçe içerik var; İngilizce seçeneği
 * tercihin saklandığını göstermek için burada duruyor, çeviri katmanı
 * bağlanınca anlam kazanacak.
 */
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
   * Ses — TEK anahtar. Müzik ve efekt AYRI AYRILMADI: bu tabanda hiç ses
   * dosyası yok, ikiye bölmek oyuncuya var olmayan bir ayrım sunmak olurdu.
   */
  soundEnabled: boolean;
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
}

/**
 * Varsayılanlar. Ses ve titreşim AÇIK başlar: oyuncu bir şeyi kapatmayı
 * seçmediyse, oyunun kendini tam hâliyle tanıtması beklenir. Bağlanana
 * kadar bunun görünür bir etkisi olmaz.
 */
export function defaultPreferences(): PlayerPreferences {
  return {
    soundEnabled: true,
    soundVolume: DEFAULT_VOLUME,
    vibrationEnabled: true,
    language: DEFAULT_LANGUAGE,
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
    soundVolume: normalizeVolume(source.soundVolume),
    vibrationEnabled:
      typeof source.vibrationEnabled === 'boolean'
        ? source.vibrationEnabled
        : fallback.vibrationEnabled,
    language: normalizeLanguage(source.language),
  };
}
