/**
 * MIHENKAYNAK — Biçimlendirme yardımcıları
 *
 * GDD EK F: "UI kritik sayıları kendi ticari birimlerinde gösteriyor."
 * GDD 23.3: "Finansal sonuçlar yalnız yeşil/kırmızıyla anlatılmaz; metin +
 * ikon/etiket birlikte kullanılır." → tonWord() bu kuralın uygulama noktasıdır.
 */

const TL = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });
const TL_SIGNED = new Intl.NumberFormat('tr-TR', {
  maximumFractionDigits: 0,
  signDisplay: 'always',
});
const DEC1 = new Intl.NumberFormat('tr-TR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const DEC2 = new Intl.NumberFormat('tr-TR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * 145.000 ₺ · −685 ₺
 *
 * Eksi imi `tlSigned` ve `pctSigned` ile AYNI karakterdir (U+2212), tire
 * değil. Ekspertiz kırılımında aynı satırda "−%7" ile "-685 ₺" yan yana
 * düşüyordu: iki farklı eksi, farklı genişlikte ve farklı yükseklikte.
 */
export function tl(n: number): string {
  return `${TL.format(Math.round(n)).replace('-', '−')} ₺`;
}

/** 145.000 — sembolsüz, büyük rakam gösterimleri için. */
export function tlBare(n: number): string {
  return TL.format(Math.round(n));
}

/** +8.200 ₺ / −1.350 ₺ */
export function tlSigned(n: number): string {
  const rounded = Math.round(n);
  if (rounded === 0) return '0 ₺';
  return `${TL_SIGNED.format(rounded).replace('-', '−')} ₺`;
}

/** Piyasa fiyatı — kuruşlu. */
export function price(n: number): string {
  return DEC2.format(n);
}

/** 18,4 g */
export function grams(n: number): string {
  return `${DEC1.format(n)} g`;
}

/** Pool / HAS balances retain milligram visibility. */
export function preciseGrams(n: number): string {
  return `${new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 3 }).format(n)} g`;
}

/** %19 */
export function pct(ratio: number, digits = 0): string {
  return `%${(ratio * 100).toFixed(digits).replace('.', ',')}`;
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

/** ▲ %0,38 — yön işareti dahil. */
export function pctChange(value: number): string {
  const sign = value > 0 ? '▲' : value < 0 ? '▼' : '—';
  return `${sign} %${Math.abs(value).toFixed(2).replace('.', ',')}`;
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
