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

export interface PlayerPreferences {
  /** Ses efektleri ve müzik. */
  soundEnabled: boolean;
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
  return { soundEnabled: true, vibrationEnabled: true, language: DEFAULT_LANGUAGE };
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
    vibrationEnabled:
      typeof source.vibrationEnabled === 'boolean'
        ? source.vibrationEnabled
        : fallback.vibrationEnabled,
    language: normalizeLanguage(source.language),
  };
}
