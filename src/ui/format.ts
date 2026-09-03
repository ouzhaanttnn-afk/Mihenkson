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

import { getLanguage } from '@i18n/index';

/**
 * %19 · 19%
 *
 * YÜZDE İMİNİN YERİ DİLE GÖRE DEĞİŞİR: Türkçede sayının ÖNÜNDE (%19),
 * İngilizcede ARKASINDA (19%). Ekran görüntüsünde yakalandı — İngilizce
 * arayüzde ses düzeyi "%70" yazıyordu; okunuyor ama yabancı duruyor.
 * Ondalık ayracı da aynı kuralı izler: 0,38 / 0.38.
 */
export function pct(ratio: number, digits = 0): string {
  const en = getLanguage() === 'en';
  const body = (ratio * 100).toFixed(digits).replace('.', en ? '.' : ',');
  return en ? `${body}%` : `%${body}`;
}

/**
 * −%7 · +%2 — işaret YÜZDE İMİNİN ÖNÜNDE.
 *
 * `pct(-0.07)` "%-7" üretirdi; Türkçede işaret yüzde iminden önce yazılır.
 * Sıfır işaretsiz kalır: "+%0" bir yönü varmış gibi okunur, oysa yoktur.
 * Eksi imi `tlSigned` ile aynı karakterdir (U+2212), tire değil.
 */
export function pctSigned(ratio: number, digits = 0): string {
  const shown = Number((ratio * 100).toFixed(digits));
  if (shown === 0) return pct(0, digits);
  return `${shown < 0 ? '−' : '+'}${pct(Math.abs(ratio), digits)}`;
}

/** ▲ %0,38 · ▲ 0.38% — yön işareti dahil. */
export function pctChange(value: number): string {
  const sign = value > 0 ? '▲' : value < 0 ? '▼' : '—';
  return `${sign} ${pct(Math.abs(value) / 100, 2)}`;
}

/** 10:45 */
export function clock(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.floor(minutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** 3–7 gün */
export function dayRange([lo, hi]: [number, number]): string {
  if (lo === hi) return `${lo} gün`;
  if (lo === 0) return `<1 gün`;
  return `${lo}–${hi} gün`;
}

/**
 * GDD 23.3 — finansal sonuç yalnız renkle anlatılmaz.
 * Renk tonuna eşlik eden metin etiketi.
 */
export function tonWord(delta: number): string {
  if (delta > 0) return 'kâr';
  if (delta < 0) return 'zarar';
  return 'başabaş';
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
