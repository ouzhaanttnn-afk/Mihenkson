/**
 * PARA BİRİMİ — yalnız GÖSTERİM. Oyunun iç birimi her zaman TL'dir.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * EN ÖNEMLİ KURAL: OYUNUN PARASI ÇEVRİLMEZ, YAZISI ÇEVRİLİR.
 *
 * Kasa, maliyet, teklif, defter, kayıt dosyası — hepsi TL cinsinden kalır.
 * Dolar seçimi, aynı sayının başka bir birimle YAZILMASIDIR; bölme işlemi
 * ekrana basılmadan hemen önce, tek bir yerde yapılır.
 *
 * Neden böyle:
 *   · Ekonomi, mutabakat ve pazarlık matematiği hiç etkilenmez.
 *   · Kayıt dosyası birimden bağımsızdır — dolarla oynanmış bir kayıt
 *     TL'ye geçilince kuruşu kuruşuna aynı parayı gösterir.
 *   · GERİ DÖNÜŞ KENDİLİĞİNDEN MÜMKÜN: ₺'ye dönmek bir dönüşüm değil,
 *     çarpanı 1 yapmaktır. Kaybedilen bilgi yoktur.
 *
 * Ekonomiyi dolara ÇEVİRMEK (kasayı bölüp saklamak) bunun tam tersi
 * olurdu: yuvarlama hataları kayda yazılır, geri dönüşte para kaybolur ve
 * "oyuncunun parası sıfırlanmaz" kuralı ilk gün kırılırdı.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const CURRENCIES = [
  { id: 'try', symbol: '₺', label: 'Türk Lirası' },
  { id: 'usd', symbol: '$', label: 'ABD Doları' },
] as const;

export type CurrencyId = (typeof CURRENCIES)[number]['id'];

export const DEFAULT_CURRENCY: CurrencyId = 'try';

/**
 * SABİT KUR — 1 $ = 32,45 ₺.
 *
 * Sayı uydurma değil: oyunun kendi piyasa verisindeki başlangıç dolar kuru
 * (`MARKET_BASE.usd`). `src/i18n/currency.test.ts` ikisinin ayrışmadığını
 * kontrol eder — buraya elle yazılmasının sebebi import yönü: `balance.ts`
 * ileride çeviri çağırırsa (içinde Türkçe etiketler var) karşılıklı import
 * halkası oluşurdu.
 *
 * NEDEN CANLI KUR (`market.fxIndex`) DEĞİL — ölçülmüş bir tercih, kolaycılık
 * değil. Oyunun dolar kuru gün içinde de günden güne de oynuyor. Canlı kurla
 * gösterseydik:
 *   · oyuncu hiçbir şey yapmadan kasası değişir görünürdü,
 *   · dünkü "3.000 $ kâr" bugün başka bir sayı olurdu — gün raporları
 *     birbiriyle karşılaştırılamaz hâle gelirdi,
 *   · aynı malın fiyatı iki bakışta iki farklı sayı olurdu.
 * Sabit kurda gösterim BİREBİR yeniden adlandırmadır: her TL tutarının tek
 * bir dolar karşılığı vardır, hep aynıdır. Kurun kendi hareketi zaten
 * piyasa panosunda "Dolar" satırı olarak duruyor; orada anlamlı, kasada
 * gürültü olurdu.
 */
export const USD_RATE = 32.45;

let activeCurrency: CurrencyId = DEFAULT_CURRENCY;

export function setCurrency(id: CurrencyId): void {
  activeCurrency = id === 'usd' ? 'usd' : 'try';
}

export function getCurrency(): CurrencyId {
  return activeCurrency;
}

export function currencySymbol(): string {
  return activeCurrency === 'usd' ? '$' : '₺';
}

/** TL tutarını gösterim birimine çevirir. TL seçiliyken hiçbir şey yapmaz. */
export function toDisplay(tl: number): number {
  return activeCurrency === 'usd' ? tl / USD_RATE : tl;
}

/**
 * Gösterim biriminden TL'ye döner — oyuncunun GİRDİĞİ değerler için.
 *
 * Teklif kaydırıcısı gibi girdiler dolar okunurken dolar yazar; ekonomiye
 * ulaşmadan önce buradan geçip TL'ye döner. Tur kapanışı tamdır:
 * `fromDisplay(toDisplay(x)) === x`.
 */
export function fromDisplay(shown: number): number {
  return activeCurrency === 'usd' ? shown * USD_RATE : shown;
}

/**
 * Dolarda kaç ondalık gösterilmeli.
 *
 * TL'de tam sayı yeterliydi: 1 ₺'lik fark zaten görünmez. Dolarda aynı
 * yuvarlama 32 kat kabalaşıyor ve pazarlıkta ARDIŞIK İKİ TEKLİF AYNI SAYIYA
 * DÜŞEBİLİYOR — oyuncu teklifini artırıyor ama ekran değişmiyor. Küçük
 * tutarlarda iki ondalık bunu engelliyor; büyük tutarlarda kuruş göstermek
 * ise sayıyı okunmaz uzunlukta yapardı.
 */
export function displayFractionDigits(shownAbs: number): number {
  if (activeCurrency !== 'usd') return 0;
  return shownAbs < 1000 ? 2 : 0;
}
