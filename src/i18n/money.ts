/**
 * PARA VE SAYI BİÇİMLENDİRME — dil ve para birimi burada uygulanır.
 *
 * NEDEN `src/ui` ALTINDA DEĞİL: alan (domain) katmanı da para yazıyor —
 * pazarlık cümleleri, işlem değerlendirmesi, gün raporu notları. Onlar
 * `@ui`'yi import EDEMEZ (katman kuralı), ama para birimini görmezden de
 * gelemezler: dolar seçiliyken müşterinin ağzından TL çıkması, tercihi
 * yarım bağlamak olurdu. Biçimlendirme ikisinin de altında, tarafsız bir
 * katmanda duruyor.
 *
 * `src/ui/format.ts` buradan yeniden dışa aktarır; mevcut çağrı yerlerinin
 * hiçbiri değişmedi.
 */

import { getLanguage } from '@i18n/index';
import { currencySymbol, displayFractionDigits, getCurrency, toDisplay } from '@i18n/currency';

/**
 * SAYI YERELİ DİLE BAĞLIDIR, PARA BİRİMİNE DEĞİL.
 *
 * Türkçede binlik ayracı nokta, ondalık virgüldür (145.000,50); İngilizcede
 * tam tersi (145,000.50). İngilizce oynayan biri "145.000" gördüğünde yüz
 * kırk beş bin değil, yüz kırk beş tam okur — bu bir biçim tercihi değil,
 * sayının YANLIŞ okunmasıdır.
 *
 * Biçimlendiriciler her çağrıda yeniden kurulmuyor: `Intl.NumberFormat`
 * kurulumu pahalıdır ve bu fonksiyonlar her karede yüzlerce kez çağrılıyor.
 * İki dil × birkaç biçim için tembel önbellek yeterli.
 */
const formatterCache = new Map<string, Intl.NumberFormat>();

function nf(digits: number, signed = false): Intl.NumberFormat {
  const locale = getLanguage() === 'en' ? 'en-US' : 'tr-TR';
  const key = `${locale}|${digits}|${signed}`;
  let found = formatterCache.get(key);
  if (!found) {
    found = new Intl.NumberFormat(locale, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
      ...(signed ? { signDisplay: 'always' as const } : {}),
    });
    formatterCache.set(key, found);
  }
  return found;
}

/**
 * Para birimi imini sayının doğru yanına koyar.
 *
 * Türkçede sondadır ve araya boşluk girer (145.000 ₺); İngilizcede dolar
 * imi sayının ÖNÜNE bitişik yazılır ($145,000). Eksi im ise her iki dilde
 * de en başta durur: −$1.350, "$−1.350" değil.
 */
function withSymbol(body: string, negative: boolean): string {
  const sign = negative ? '−' : '';
  return getCurrency() === 'usd'
    ? `${sign}${currencySymbol()}${body}`
    : `${sign}${body} ${currencySymbol()}`;
}

/** Gösterim birimine çevirir, o birimin ondalık kuralıyla biçimler. */
function moneyBody(tlAmount: number, signed = false): { body: string; negative: boolean } {
  const shown = toDisplay(tlAmount);
  const digits = displayFractionDigits(Math.abs(shown));
  const rounded = Number(shown.toFixed(digits));
  const body = nf(digits, signed).format(Math.abs(rounded));
  return { body, negative: rounded < 0 };
}

/**
 * 145.000 ₺ · −685 ₺
 *
 * Eksi imi `tlSigned` ve `pctSigned` ile AYNI karakterdir (U+2212), tire
 * değil. Ekspertiz kırılımında aynı satırda "−%7" ile "-685 ₺" yan yana
 * düşüyordu: iki farklı eksi, farklı genişlikte ve farklı yükseklikte.
 */
export function tl(n: number): string {
  const { body, negative } = moneyBody(n);
  return withSymbol(body, negative);
}

/**
 * 145.000 — sembolsüz, büyük rakam gösterimleri için.
 *
 * Girdi yine TL'dir ve yine çevrilir; eksik olan yalnız imdir. Çağıran
 * taraf imi kendi koyar (başlık, birim etiketi vs.).
 */
export function tlBare(n: number): string {
  return moneyBody(n).body;
}

/** +8.200 ₺ / −1.350 ₺ · +$253 / −$41 */
export function tlSigned(n: number): string {
  const shown = toDisplay(n);
  const digits = displayFractionDigits(Math.abs(shown));
  const rounded = Number(shown.toFixed(digits));
  /*
    SIFIR İMSİZ KALIR. "+0 ₺" bir yön varmış gibi okunur, oysa yoktur —
    `pctSigned` ile aynı kural.
  */
  if (rounded === 0) return withSymbol(nf(digits).format(0), false);
  const body = nf(digits, true).format(rounded).replace('-', '−');
  return getCurrency() === 'usd'
    ? `${body.slice(0, 1)}${currencySymbol()}${body.slice(1)}`
    : `${body} ${currencySymbol()}`;
}

/**
 * Piyasa fiyatı — kuruşlu, imsiz.
 *
 * Bu sayı bir BİRİM fiyatıdır (gram başına, adet başına) ve yanında kendi
 * birim etiketi yazar. Kuruş burada bilgi taşır: dolara çevrilince 4.244 ₺
 * → 130,79 $ olur ve iki ondalık korunur.
 */
export function price(n: number): string {
  return nf(2).format(toDisplay(n));
}

/**
 * 18,4 g — GRAM ÇEVRİLMEZ.
 *
 * Ağırlık bir para birimi değildir; dolar seçmek altını hafifletmez.
 * Yalnız sayının yerel biçimi (ondalık ayracı) dile uyar.
 */
export function grams(n: number): string {
  return `${nf(1).format(n)} g`;
}

/** Havuz / HAS bakiyeleri miligram görünürlüğünü korur. */
export function preciseGrams(n: number): string {
  const locale = getLanguage() === 'en' ? 'en-US' : 'tr-TR';
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(n)} g`;
}

/**
 * Birim etiketi — "₺/g", "$/g", "₺/adet", "$/pc".
 *
 * Sabit yazılmış "₺/g" dizeleri arayüzün her yerine dağılmıştı; dolar
 * seçildiğinde sayı değişip birimi TL kalırdı ve ortaya iki katı yanlış bir
 * satır çıkardı ("130,79 ₺/g"). Etiketin de sayının da kaynağı artık aynı.
 */
export function moneyUnit(per?: string): string {
  const symbol = currencySymbol();
  if (!per) return symbol;
  return `${symbol}/${per}`;
}

/**
 * "12.000 – 18.000 ₺" · "$370 – $555"
 *
 * Aralıkta im İKİ KEZ mi yazılır: TL'de sonda tek bir "₺" yeter ve alışılmış
 * olan odur; dolarda im sayının önünde durduğu için her iki uca da gerekir,
 * yoksa alt sınır imsiz kalır.
 */
export function tlRange(min: number, max: number): string {
  if (getCurrency() === 'usd') return `${tl(min)} – ${tl(max)}`;
  return `${tlBare(min)} – ${tlBare(max)} ${currencySymbol()}`;
}

/**
 * Fiyatı ÇEVİRMEDEN, yalnız dilin sayı biçimiyle yazar.
 *
 * Tek kullanıcısı kur panosudur: "Dolar" ve "Euro" satırları yabancı parayı
 * yerel parayla kote eder ve o kote her zaman TL'dir. Dolar seçiliyken bu
 * satırları da çevirseydik pano "Dolar · 1,00 $" derdi — doğru ama boş.
 */
export function priceRawTl(n: number): string {
  return nf(2).format(n);
}

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

/**
 * ×1,33 · ×1.33 — çarpan. Ondalık ayracı dile bağlıdır.
 *
 * `toFixed(2)` doğrudan yazılırsa Türkçe arayüzde de nokta çıkar; oyunun
 * geri kalanı virgül kullanırken tek bir satırın nokta göstermesi ölçüldü
 * ve düzeltildi (İşletme · Müşteri trafiği).
 */
export function multiplier(value: number, digits = 2): string {
  const en = getLanguage() === 'en';
  return `×${value.toFixed(digits).replace('.', en ? '.' : ',')}`;
}

/** ▲ %0,38 · ▲ 0.38% — yön işareti dahil. */
export function pctChange(value: number): string {
  const sign = value > 0 ? '▲' : value < 0 ? '▼' : '—';
  return `${sign} ${pct(Math.abs(value) / 100, 2)}`;
}
