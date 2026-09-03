/**
 * MIHENKAYNAK — Biçimlendirme yardımcıları
 *
 * GDD EK F: "UI kritik sayıları kendi ticari birimlerinde gösteriyor."
 * GDD 23.3: "Finansal sonuçlar yalnız yeşil/kırmızıyla anlatılmaz; metin +
 * ikon/etiket birlikte kullanılır." → tonWord() bu kuralın uygulama noktasıdır.
 */

/**
 * Para ve sayı biçimlendirmeleri `@i18n/money`de yaşıyor (gerekçesi orada:
 * alan katmanı da para yazıyor ve `@ui`'yi import edemez). Burada yeniden
 * dışa aktarılıyorlar ki arayüzdeki yüzlerce çağrı yeri değişmesin.
 */
import { t } from '@i18n/index';

export {
  tl,
  tlBare,
  tlSigned,
  price,
  priceRawTl,
  grams,
  preciseGrams,
  moneyUnit,
  tlRange,
} from '@i18n/money';

export { pct, pctSigned, pctChange, multiplier } from '@i18n/money';

/** 10:45 */
export function clock(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.floor(minutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** 3–7 gün · 3–7 days */
export function dayRange([lo, hi]: [number, number]): string {
  if (lo === hi) return t('{n} gün', { n: lo });
  if (lo === 0) return t('<1 gün');
  return t('{alt}–{ust} gün', { alt: lo, ust: hi });
}

/**
 * GDD 23.3 — finansal sonuç yalnız renkle anlatılmaz.
 * Renk tonuna eşlik eden metin etiketi.
 */
export function tonWord(delta: number): string {
  if (delta > 0) return t('kâr');
  if (delta < 0) return t('zarar');
  return t('başabaş');
}

export type Tone = 'positive' | 'negative' | 'neutral' | 'warning';

export function toneFor(delta: number): Tone {
  if (delta > 0) return 'positive';
  if (delta < 0) return 'negative';
  return 'neutral';
}

/**
 * Türkçe ünlü uyumuna göre ayrı yazılan "da / de" bağlacı.
 *
 * NEDEN VAR: talep satırı "klasik takı da olur" / "sarrafiye de olur"
 * diyor ve son kelime çalışma anında değişiyor. Sabit "da" yazmak
 * "sarrafiye da olur" gibi kulak tırmalayan bir cümle üretiyordu — Türkçe
 * bir oyunda dil hatası, hizalama hatası kadar görünür.
 *
 * Kural: kelimenin SON ünlüsü kalınsa (a, ı, o, u) "da", inceyse
 * (e, i, ö, ü) "de". Ünlü bulunamazsa "de" varsayılır.
 */
export function daDe(word: string): string {
  const vowels = 'aâıouAÂIOUeiöüEİÖÜ';
  let last = '';
  for (const ch of word) if (vowels.includes(ch)) last = ch;
  return 'aâıouAÂIOU'.includes(last) ? 'da' : 'de';
}
