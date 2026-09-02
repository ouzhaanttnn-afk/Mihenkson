/**
 * MIHENKAYNAK — Oyuncuya görünen dil
 * Kaynak: İşlem Akışı ve Terminoloji Ara Düzeltmesi v1.1 · §7.
 *
 * §7 teknik terimlerin oyuncuya görünen karşılıklarını bağlayıcı bir tabloyla
 * veriyor. Tablo TEK YERDE yaşar: aynı terimi on ekrana elle yazmak, birini
 * değiştirdiğinde ötekilerin sessizce eskimesi demekti.
 *
 * §9 DEĞİŞMEZ: "Teknik domain isimleri değişmek ZORUNDA DEĞİLDİR; yalnız
 * oyuncuya görünen dil sadeleştirilir." Bu yüzden `thesis`, `liquidity`,
 * `spread`, `settlement` gibi alan adları kodda AYNEN kalır — bu dosya
 * yalnız ekrana çıkan metni çevirir. Domain'i yeniden adlandırmak, §8'in
 * koruduğu mimariyi bir dil düzeltmesi için tırmalamak olurdu.
 */

export const TERM = {
  /** Likidite → Nakit Durumu */
  liquidity: 'Nakit Durumu',
  /** İşlem Tezi / Tez → Çıkış Planı */
  thesis: 'Çıkış Planı',
  /** Dar alanlarda (32 px aşama şeridi, ray etiketi) kısa biçim. */
  thesisShort: 'Çıkış',
  /** Spread / Makas → Alış-Satış Farkı */
  spread: 'Alış-Satış Farkı',
  /** Confidence → Değer Güveni */
  confidence: 'Değer Güveni',
  /** Market Regime → Piyasa Havası */
  regime: 'Piyasa Havası',
  /** Overnight Exposure → Altında Kalma Riski */
  overnight: 'Altında Kalma Riski',
  /** Supplier Trust → Toptancı Güveni */
  supplierTrust: 'Toptancı Güveni',
  /** Customer Trust → Müşteri Güveni */
  customerTrust: 'Müşteri Güveni',
  /** Hidden Truth → sistem adı olarak verilmez; gerekiyorsa "Gerçek Durum". */
  hiddenTruth: 'Gerçek Durum',
} as const;

/**
 * §7 — "Settlement: GÖSTERİLMEZ. Yalnız teknik/domain terimi."
 * Oyuncuya settlement'tan söz edilmez; sonucu söylenir.
 */
export const HIDDEN_FROM_PLAYER = ['settlement', 'hiddenTruth'] as const;
