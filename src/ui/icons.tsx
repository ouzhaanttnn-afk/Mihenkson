/**
 * MIHENKAYNAK — İkon seti
 * Kaynak: GDD EK H "SVG: Logo, navigasyon, durum, test, tez, aksiyon, atölye,
 * işletme ve işlem defteri ikonları" · "UI üretimi: kodla çizilir".
 *
 * Tüm arayüz ikonları aynı isimli gerçekçi WebP mikro-assetlerden gelir.
 * Ürün silüetleri ve marka işareti bilgi doğruluğu için SVG kalır.
 *
 * GDD 23.24: "İkon tek başına anlam taşımamalı; araç ve ana aksiyonlarda kısa
 * metin etiketi bulunmalı." Bu yüzden hiçbir ikon tek başına kullanılmaz;
 * çağıran bileşenler daima metin etiketi ile eşler.
 */

import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

type MicroIconName =
  | 'shop' | 'stock' | 'workshop' | 'market' | 'business'
  | 'scale' | 'magnet' | 'touchstone' | 'density' | 'loupe' | 'spectrometer'
  | 'retail' | 'wholesale' | 'melt' | 'service-resale' | 'collection'
  | 'reason' | 'gesture' | 'package' | 'counter' | 'send' | 'reject'
  | 'trust' | 'cash' | 'warning' | 'info' | 'clock' | 'liquidity'
  | 'lock' | 'pencil' | 'chevron-right' | 'video' | 'queue';

function Svg({ size = 22, children: _children, className, style, icon }: IconProps & { icon: MicroIconName }) {
  return (
    <img
      src={`./assets/realistic/icons/micro/${icon}.webp`}
      alt=""
      width={size}
      height={size}
      className={className ? `microIcon ${className}` : 'microIcon'}
      style={{ ...style, objectFit: 'contain' }}
      aria-hidden="true"
      draggable={false}
    />
  );
}

// ---------------------------------------------------------------------------
// Navigasyon — 4 kök ekran (GDD 23.9.1)
// ---------------------------------------------------------------------------

/** Dükkan — tezgâh / vitrin cephesi. */
export const IconShop = (p: IconProps) => (
  <Svg {...p} icon="shop">
    <path d="M3 9.5 4.8 4.5h14.4L21 9.5" />
    <path d="M3 9.5a2.4 2.4 0 0 0 4.5 0 2.4 2.4 0 0 0 4.5 0 2.4 2.4 0 0 0 4.5 0 2.4 2.4 0 0 0 4.5 0" />
    <path d="M4.6 11.4V20h14.8v-8.6" />
    <path d="M9.4 20v-4.6h5.2V20" />
  </Svg>
);

/** Stok — kutu / envanter. */
export const IconStock = (p: IconProps) => (
  <Svg {...p} icon="stock">
    <path d="M12 2.8 20.5 7v10L12 21.2 3.5 17V7Z" />
    <path d="M3.5 7 12 11.3 20.5 7" />
    <path d="M12 11.3v9.9" />
  </Svg>
);

/** Atölye — çekiç / operasyon. */
export const IconWorkshop = (p: IconProps) => (
  <Svg {...p} icon="workshop">
    <path d="M13.6 3.4 20.6 10.4l-2.5 2.5-7-7Z" />
    <path d="M12.4 8.1 4 16.5a2.1 2.1 0 0 0 3 3l8.4-8.4" />
    <path d="M5.2 5.4h4.6M7.5 3.1v4.6" />
  </Svg>
);

/** Market — ileride kozmetik kataloğuna dönüşecek alışveriş çantası. */
export const IconMarket = (p: IconProps) => (
  <Svg {...p} icon="market">
    <path d="M5 8.5h14l-1 12H6Z" />
    <path d="M8.5 9V6.8a3.5 3.5 0 0 1 7 0V9" />
    <path d="M9 13h6" />
  </Svg>
);

/** İşletme — sütunlu bina / finans. */
export const IconBusiness = (p: IconProps) => (
  <Svg {...p} icon="business">
    <path d="M3.2 9.2 12 4l8.8 5.2" />
    <path d="M4.8 9.8V18M9.6 9.8V18M14.4 9.8V18M19.2 9.8V18" />
    <path d="M3 20.6h18" />
  </Svg>
);

// ---------------------------------------------------------------------------
// Test araçları (GDD 7) — Bağlamsal Araç Rayı
// ---------------------------------------------------------------------------

/** Hassas terazi. */
export const IconScale = (p: IconProps) => (
  <Svg {...p} icon="scale">
    <path d="M12 3.6v16.8M7.6 20.4h8.8" />
    <path d="M4 7.2h16M4 7.2 12 5.4l8 1.8" />
    <path d="M4 7.2 1.8 13a2.9 2.9 0 0 0 4.4 0Z" />
    <path d="M20 7.2 17.8 13a2.9 2.9 0 0 0 4.4 0Z" />
  </Svg>
);

/** Mıknatıs. */
export const IconMagnet = (p: IconProps) => (
  <Svg {...p} icon="magnet">
    <path d="M5 20V10a7 7 0 0 1 14 0v10" />
    <path d="M5 20h4v-10a3 3 0 0 1 6 0v10h4" />
  </Svg>
);

/** Mihenk taşı. */
export const IconTouchstone = (p: IconProps) => (
  <Svg {...p} icon="touchstone">
    <path d="M3.6 16.4 9.2 5.2a1.5 1.5 0 0 1 2.7 0l2.6 5.2" />
    <path d="M20.4 15.6 15 20.2a1.4 1.4 0 0 1-2.2-.6l-1.6-4.4a1.4 1.4 0 0 1 .9-1.8l5.8-1.8a1.4 1.4 0 0 1 1.7 2Z" />
    <path d="M4.2 20.4h5.6" />
  </Svg>
);

/** Yoğunluk ölçümü — sıvı içinde tartım. */
export const IconDensity = (p: IconProps) => (
  <Svg {...p} icon="density">
    <path d="M6.4 3.4h11.2v11.4a5.6 5.6 0 0 1-11.2 0Z" />
    <path d="M6.4 12.6c1.7 0 1.7 1.4 3.4 1.4s1.7-1.4 3.4-1.4 1.7 1.4 3.4 1.4h1" />
    <path d="M9.6 7.4h4.8" />
  </Svg>
);

/** Lup / taş kontrol. */
export const IconLoupe = (p: IconProps) => (
  <Svg {...p} icon="loupe">
    <circle cx="10.4" cy="10.4" r="6.4" />
    <path d="M15.2 15.2 20.6 20.6" />
    <path d="m10.4 7.2 2 2.4-2 3.6-2-3.6Z" />
  </Svg>
);

/** Dijital spektrometre. */
export const IconSpectrometer = (p: IconProps) => (
  <Svg {...p} icon="spectrometer">
    <rect x="3.2" y="5" width="17.6" height="9.8" rx="1.8" />
    <path d="M6.4 11.6V8.4M9.6 11.6V7M12.8 11.6V9.2M16 11.6V7.8" />
    <path d="M8.4 18.2h7.2M12 14.8v3.4M7 20.6h10" />
  </Svg>
);

// ---------------------------------------------------------------------------
// Çıkış kanalları / İşlem Tezi (GDD 8.1)
// ---------------------------------------------------------------------------

/** Vitrin / perakende. */
export const IconRetail = (p: IconProps) => (
  <Svg {...p} icon="retail">
    <rect x="3.4" y="6" width="17.2" height="13" rx="1.6" />
    <path d="M3.4 10.4h17.2" />
    <path d="M8.6 6V3.6M15.4 6V3.6" />
    <circle cx="12" cy="14.8" r="2" />
  </Svg>
);

/** Toptancı çıkışı. */
export const IconWholesale = (p: IconProps) => (
  <Svg {...p} icon="wholesale">
    <path d="M2.6 17.2V9.6h10.8v7.6" />
    <path d="M13.4 12h4l4 3v2.2h-8Z" />
    <circle cx="6.4" cy="18.6" r="1.8" />
    <circle cx="17.2" cy="18.6" r="1.8" />
    <path d="M2.6 9.6 5 6.4h6l2.4 3.2" />
  </Svg>
);

/** Eritme / HAS. */
export const IconMelt = (p: IconProps) => (
  <Svg {...p} icon="melt">
    <path d="M5 9.4h14l-1.6 7.4a2.2 2.2 0 0 1-2.2 1.8H8.8a2.2 2.2 0 0 1-2.2-1.8Z" />
    <path d="M3.4 9.4h17.2" />
    <path d="M9.6 6.2c0-1.4 1.2-1.8 1.2-3 .9.9 1.4 1.7 1.4 2.6 0-.7.4-1.2 1-1.6.3 1 .8 1.4.8 2" />
  </Svg>
);

/** Servis + satış. */
export const IconServiceResale = (p: IconProps) => (
  <Svg {...p} icon="service-resale">
    <path d="M14.6 3.6a4.4 4.4 0 0 0-5.2 5.8L3.8 15a2 2 0 0 0 2.8 2.8l5.6-5.6a4.4 4.4 0 0 0 5.8-5.2l-2.6 2.6-2.4-.6-.6-2.4Z" />
    <path d="M15.6 15.4 20 19.8" />
  </Svg>
);

/** Beklet / koleksiyon. */
export const IconCollection = (p: IconProps) => (
  <Svg {...p} icon="collection">
    <path d="M8 3.4h8v3.2a4 4 0 0 1-8 0Z" />
    <path d="M16 4.6h2.6a2.6 2.6 0 0 1-2.6 4.2" />
    <path d="M8 4.6H5.4a2.6 2.6 0 0 0 2.6 4.2" />
    <path d="M12 10.6v4.4M8.8 20.6h6.4l-.8-2.8H9.6Z" />
  </Svg>
);

// ---------------------------------------------------------------------------
// Pazarlık hamleleri (GDD 11.2)
// ---------------------------------------------------------------------------

/** Gerekçe göster. */
export const IconReason = (p: IconProps) => (
  <Svg {...p} icon="reason">
    <path d="M6 3.4h8.4L19 8v12.6H6Z" />
    <path d="M14.2 3.4V8H19" />
    <path d="M9 12.4h6M9 16h4.2" />
  </Svg>
);

/** Jest yap. */
export const IconGesture = (p: IconProps) => (
  <Svg {...p} icon="gesture">
    <path d="M11.6 20.4 4.4 13.2a3.9 3.9 0 0 1 5.6-5.5l1.6 1.6 1.6-1.6a3.9 3.9 0 0 1 5.6 5.5Z" />
  </Svg>
);

/** Paket teklif. */
export const IconPackage = (p: IconProps) => (
  <Svg {...p} icon="package">
    <rect x="3.4" y="8.4" width="17.2" height="11.6" rx="1.4" />
    <path d="M3.4 12.4h17.2M12 8.4V20" />
    <path d="M12 8.4c-2.6 0-4.4-.8-4.4-2.4S9 3.6 12 8.4Zm0 0c2.6 0 4.4-.8 4.4-2.4S15 3.6 12 8.4Z" />
  </Svg>
);

/** Karşı teklif iste. */
export const IconCounter = (p: IconProps) => (
  <Svg {...p} icon="counter">
    <path d="M4 8.4h13.2l-3-3" />
    <path d="M20 15.6H6.8l3 3" />
  </Svg>
);

/** Teklifi gönder. */
export const IconSend = (p: IconProps) => (
  <Svg {...p} icon="send">
    <path d="M20.8 3.6 10.8 13.6" />
    <path d="M20.8 3.6 14.4 20.8l-3.6-7.2-7.2-3.6Z" />
  </Svg>
);

/** Reddet. */
export const IconReject = (p: IconProps) => (
  <Svg {...p} icon="reject">
    <circle cx="12" cy="12" r="8.6" />
    <path d="M9 9l6 6M15 9l-6 6" />
  </Svg>
);

// ---------------------------------------------------------------------------
// Durum ve bilgi
// ---------------------------------------------------------------------------

/** Semt güveni / itibar kalkanı. */
export const IconTrust = (p: IconProps) => (
  <Svg {...p} icon="trust">
    <path d="M12 3.2 19 6v5.6c0 4.2-2.8 7.4-7 9.2-4.2-1.8-7-5-7-9.2V6Z" />
    <path d="m9 12 2.2 2.2L15.4 10" />
  </Svg>
);

/** Nakit / kasa. */
export const IconCash = (p: IconProps) => (
  <Svg {...p} icon="cash">
    <rect x="2.8" y="6.4" width="18.4" height="11.2" rx="1.8" />
    <circle cx="12" cy="12" r="2.6" />
    <path d="M6.2 12h.6M17.2 12h.6" />
  </Svg>
);

/** Uyarı / risk. */
export const IconWarning = (p: IconProps) => (
  <Svg {...p} icon="warning">
    <path d="M12 3.8 21 19.4H3Z" />
    <path d="M12 9.6v4.4M12 16.8h.01" />
  </Svg>
);

/** Bilgi / açıklama. */
export const IconInfo = (p: IconProps) => (
  <Svg {...p} icon="info">
    <circle cx="12" cy="12" r="8.6" />
    <path d="M12 11v5.4M12 7.8h.01" />
  </Svg>
);

/** Zaman / süre. */
export const IconClock = (p: IconProps) => (
  <Svg {...p} icon="clock">
    <circle cx="12" cy="12" r="8.6" />
    <path d="M12 7.2V12l3.2 2" />
  </Svg>
);

/** Likidite / akış. */
export const IconLiquidity = (p: IconProps) => (
  <Svg {...p} icon="liquidity">
    <path d="M12 3.4c3.4 3.6 5.6 6.4 5.6 9.2A5.6 5.6 0 0 1 6.4 12.6c0-2.8 2.2-5.6 5.6-9.2Z" />
    <path d="M9.4 13.4a2.7 2.7 0 0 0 2.6 2.8" />
  </Svg>
);

/** Kilitli. */
export const IconLock = (p: IconProps) => (
  <Svg {...p} icon="lock">
    <rect x="4.8" y="10.4" width="14.4" height="9.6" rx="1.8" />
    <path d="M8.4 10.4V7.6a3.6 3.6 0 0 1 7.2 0v2.8" />
  </Svg>
);

/** İleri / devam. */
/** Kalem — düzenlenebilir alanların işareti. */
export const IconPencil = (p: IconProps) => (
  <Svg {...p} icon="pencil">
    <path d="M4 20.2h4.2L19.4 9a2.1 2.1 0 0 0 0-3l-1.4-1.4a2.1 2.1 0 0 0-3 0L3.8 15.8Z" />
    <path d="M13.8 5.8 18.2 10.2" />
  </Svg>
);

export const IconChevronRight = (p: IconProps) => (
  <Svg {...p} icon="chevron-right">
    <path d="M9.6 5.6 16 12l-6.4 6.4" />
  </Svg>
);

/** Video (rewarded) — GDD 26.2 "küçük ve açık bir video simgesi". */
export const IconVideo = (p: IconProps) => (
  <Svg {...p} icon="video">
    <rect x="2.8" y="6.4" width="12.8" height="11.2" rx="1.8" />
    <path d="m15.6 10.4 5.6-3v9.2l-5.6-3Z" />
  </Svg>
);

/** Müşteri kuyruğu. */
export const IconQueue = (p: IconProps) => (
  <Svg {...p} icon="queue">
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.4 19.4a5.6 5.6 0 0 1 11.2 0" />
    <path d="M16 5.4a3.2 3.2 0 0 1 0 5.6M18 19.4a5.6 5.6 0 0 0-2.4-4.6" />
  </Svg>
);

// ---------------------------------------------------------------------------
// Ürün silüetleri — placeholder hero görselleri
// GDD EK H.5'te tanımlı products/hero PNG'leri v1 asset paketinde teslim
// edilmediği için ürün görseli kodla çizilir.
// ---------------------------------------------------------------------------

export type Silhouette =
  | 'bar' | 'coin' | 'chain' | 'ring' | 'bracelet'
  | 'necklace' | 'earring' | 'object' | 'brooch';

const SILHOUETTE_PATHS: Record<Silhouette, JSX.Element> = {
  bar: (
    <>
      <path d="M14 34h68l10 30H24Z" />
      <path d="M24 64h68M22 46h72" opacity="0.55" />
    </>
  ),
  coin: (
    <>
      <circle cx="48" cy="48" r="27" />
      <circle cx="48" cy="48" r="20" opacity="0.55" />
      <path d="M42 40h12M42 48h12M42 56h12" opacity="0.4" />
    </>
  ),
  chain: (
    <>
      <ellipse cx="26" cy="48" rx="9" ry="13" />
      <ellipse cx="42" cy="48" rx="9" ry="13" />
      <ellipse cx="58" cy="48" rx="9" ry="13" />
      <ellipse cx="74" cy="48" rx="9" ry="13" />
    </>
  ),
  ring: (
    <>
      <ellipse cx="48" cy="56" rx="24" ry="22" />
      <ellipse cx="48" cy="56" rx="16" ry="15" opacity="0.55" />
      <path d="m48 20 8 12H40Z" />
    </>
  ),
  bracelet: (
    <>
      <ellipse cx="48" cy="48" rx="30" ry="24" />
      <ellipse cx="48" cy="48" rx="22" ry="17" opacity="0.55" />
      <path d="M26 34c6 4 12 6 22 6s16-2 22-6" opacity="0.4" />
    </>
  ),
  necklace: (
    <>
      <path d="M20 26c0 26 12 38 28 38s28-12 28-38" />
      <path d="m48 64 9 13-9 11-9-11Z" />
    </>
  ),
  earring: (
    <>
      <circle cx="34" cy="30" r="10" />
      <path d="M34 40v14M34 54l7 11-7 12-7-12Z" />
      <circle cx="66" cy="34" r="7" opacity="0.55" />
      <path d="M66 41v10" opacity="0.55" />
    </>
  ),
  object: (
    <>
      <path d="M30 22h36l-5 40H35Z" />
      <path d="M35 62h26l6 14H29Z" />
      <path d="M32 34h32" opacity="0.45" />
    </>
  ),
  brooch: (
    <>
      <circle cx="48" cy="44" r="20" />
      <path d="m48 24 6 12h-12ZM48 64l6-12h-12ZM28 44l12-6v12ZM68 44l-12-6v12Z" opacity="0.6" />
      <path d="M30 62 20 74" />
    </>
  ),
};

/**
 * Ürün hero silüeti. Pirinç kontur + mürekkep zemin: asset paketindeki
 * "ürün görsel kahramandır" ilkesini (GDD 23.4) kodla karşılar.
 */
export function ProductSilhouette({
  kind,
  size = 132,
}: {
  kind: Silhouette;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {SILHOUETTE_PATHS[kind]}
    </svg>
  );
}

/** Marka monogramı — MIHENKAYNAK "M" + ametist. */
export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M6 25V8.4l10 9.2 10-9.2V25"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="m16 3.2 3.4 4-3.4 4-3.4-4Z" fill="var(--amethyst-400)" />
    </svg>
  );
}
