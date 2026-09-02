/**
 * MIHENKAYNAK — Gerçekçi asset kayıt defteri
 *
 * TEK KAYNAK: asset paketindeki `assets/manifest.json`. Buradaki her yol o
 * dosyada ilan edilmiş bir varlığa karşılık gelir; uydurulmuş yol yoktur.
 *
 * NEDEN .webp: kaynak paket 1254–1672 px şeffaf PNG'lerden oluşuyor ve 58
 * dosya toplam 101 MB. Telefonda oynanacak bir oyunda bu ağırlık taşınmaz.
 * Her varlık, paketin README'sinde yazan KULLANIM TAVANININ İKİ KATINA
 * indirildi (retina netliği korunur), tamamen saydam kenarları kırpıldı ve
 * alfası korunarak WebP'ye alındı: 101 MB → 1,74 MB. Kaynak yine paketin
 * `assets/realistic` şeffaf görselleridir; değişen yalnız teslim kodlaması.
 *
 * BANT KURALI:
 *   · Ana odak ve kök navigasyon          → gerçekçi varlıklar
 *   · Çok küçük kontrol/bilgi işaretleri  → okunabilir SVG yedekleri
 * Alt navigasyon gerçekçi ikonları 29 px'de gösterir; yüklenemezlerse aynı
 * anlamdaki SVG ikonuna otomatik düşer.
 *
 * Varlık bulunamazsa <Art> bileşeni SVG ikonuna düşer — kırık görsel yok.
 */

import type { Silhouette } from '@ui/icons';

/** Paket içindeki göreli yol → uygulama URL'i. Vite `base: './'` ile uyumlu. */
function url(file: string): string {
  return `./assets/${file.replace(/\.png$/, '.webp')}`;
}

export interface Art {
  src: string;
  /** Anlamlı alt metin; dekoratif kullanımda <Art decorative> ile gizlenir. */
  alt: string;
}

const art = (file: string, alt: string): Art => ({ src: url(file), alt });

// ---------------------------------------------------------------------------
// Test ve atölye ekipmanları — manifest.realistic.tools
// ---------------------------------------------------------------------------

/** Oyun içi araç kimliği (src/data/tools.ts) → gerçekçi ekipman görseli. */
export const TOOL_ART: Record<string, Art | undefined> = {
  scale: art('realistic/tools/precision-scale.png', 'Hassas terazi'),
  touchstone: art('realistic/tools/touchstone-kit.png', 'Mihenk taşı ve asit seti'),
  magnet: art('realistic/tools/magnetic-tester.png', 'Mıknatıs test cihazı'),
  loupe: art('realistic/tools/jeweler-loupe.png', 'Kuyumcu lupu'),
  density: art('realistic/tools/density-kit.png', 'Yoğunluk ölçüm düzeneği'),
  // spectrometer: pakette karşılığı yok → SVG ikonu kullanılır.
};

/** Servis türü (src/data/service-types.ts) → atölye tezgâhı görseli. */
export const SERVICE_ART: Record<string, Art | undefined> = {
  clean: art('realistic/tools/ultrasonic-cleaner.png', 'Ultrasonik temizleme cihazı'),
  chainRepair: art('realistic/tools/soldering-station.png', 'Lehim istasyonu'),
  ringSize: art('realistic/tools/jeweler-hammer-anvil.png', 'Kuyumcu çekici ve örs'),
  restoration: art('realistic/tools/polishing-machine.png', 'Polisaj makinesi'),
  stoneSet: art('realistic/tools/jeweler-loupe.png', 'Kuyumcu lupu'),
  engraving: art('realistic/tools/digital-caliper.png', 'Dijital kumpas'),
  appraisalReport: art('realistic/tools/precision-scale.png', 'Hassas terazi'),
};

/** Eritme / HAS operasyonu. */
export const MELT_ART = art('realistic/tools/melting-crucible.png', 'Eritme potası');

// ---------------------------------------------------------------------------
// Ürünler — manifest.realistic.inventory + manifest.products + manifest.gold
// ---------------------------------------------------------------------------

/** Sarrafiye: şablon kimliği → gerçekçi ürün görseli. */
const BULLION_ART: Record<string, Art> = {
  gram_gold_1: art('realistic/inventory/gold-bar-1g.png', '1 gram külçe altın'),
  gram_gold_2_5: art('realistic/inventory/gold-bar-2-5g.png', '2,5 gram külçe altın'),
  gram_gold_5: art('realistic/inventory/gold-bar-5g.png', '5 gram külçe altın'),
  gram_gold_10: art('realistic/inventory/gold-bar-10g.png', '10 gram külçe altın'),
  gram_gold_20: art('realistic/inventory/gold-bar-20g.png', '20 gram külçe altın'),
  gram_gold_50: art('realistic/inventory/gold-bar-50g.png', '50 gram külçe altın'),
  gram_gold_100: art('realistic/inventory/gold-bar-100g.png', '100 gram külçe altın'),
  small_ingot: art('realistic/inventory/gold-bar-20g.png', 'Külçe altın'),
  quarter_gold: art('realistic/inventory/quarter-gold-v2.png', 'Çeyrek altın'),
  half_gold: art('realistic/inventory/half-gold-v2.png', 'Yarım altın'),
  full_gold: art('realistic/inventory/full-gold-v2.png', 'Tam altın'),
  republic_gold: art('realistic/inventory/full-gold-v2.png', 'Cumhuriyet altını'),
  ata_gold: art('realistic/inventory/ata-gold.png', 'Ata lira'),
  ...Object.fromEntries(
    [10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((weight) => [
      `investment_bangle_22k_${weight}`,
      art(
        'realistic/inventory/investment-bangle-22k.png',
        `${weight} gram 22 ayar işçiliksiz yatırım bileziği`,
      ),
    ]),
  ),
};

/**
 * İşçilikli ürünler siluete göre eşlenir: pakette üç adet gerçekçi takı
 * cutout'u var. Karşılığı olmayan siluetler (küpe, broş, obje, madalyon)
 * bilinçli olarak SVG siluetinde kalır — yanlış bir ürünün fotoğrafını
 * göstermek, çizimden daha kötü bilgi verir.
 */
const CRAFTED_ART: Partial<Record<Silhouette, Art>> = {
  ring: art('products/signet-ring.png', 'Altın yüzük'),
  chain: art('products/rope-chain.png', 'Altın burgu zincir'),
  necklace: art('products/rope-chain.png', 'Altın kolye'),
  bracelet: art('products/filigree-bracelet.png', 'Altın telkari bilezik'),
};

export function productArt(templateId: string, silhouette: Silhouette): Art | undefined {
  return BULLION_ART[templateId] ?? CRAFTED_ART[silhouette];
}

// ---------------------------------------------------------------------------
// Pazarlık — manifest.realistic.gameplay
// ---------------------------------------------------------------------------

/** Pazarlık hamlesi (NegotiationMoveKind) → aksiyon görseli. */
export const MOVE_ART: Record<string, Art | undefined> = {
  reason: art('realistic/gameplay/bargaining/reason.png', 'Gerekçe göster'),
  gesture: art('realistic/gameplay/bargaining/gesture.png', 'Jest yap'),
  package: art('realistic/gameplay/bargaining/package.png', 'Paket teklif'),
  requestCounter: art('realistic/gameplay/bargaining/counter-offer.png', 'Karşı teklif iste'),
};

/** Teklif seviyesi rozetleri. */
export const OFFER_TIER_ART = {
  measured: art('realistic/gameplay/offer-tiers/measured.png', 'Ölçülü teklif'),
  reasonable: art('realistic/gameplay/offer-tiers/reasonable.png', 'Makul teklif'),
  generous: art('realistic/gameplay/offer-tiers/generous.png', 'Cömert teklif'),
} as const;

export type OfferTier = keyof typeof OFFER_TIER_ART;

export const OFFER_TIER_LABEL: Record<OfferTier, string> = {
  measured: 'Ölçülü',
  reasonable: 'Makul',
  generous: 'Cömert',
};

/**
 * Teklifin müşteri gözünden seviyesi.
 *
 * EŞİKLER YENİ DEĞİL: ShopScreen'deki mevcut `relationLabel` zaten 0,80 ve
 * 0,95'i kullanıyor. Rozet o eşiklerin oyuncuya dönük yüzü; hiçbir hesabı
 * değiştirmez, yalnız aynı oranı adlandırır.
 */
export function offerTier(offer: number, ceiling: number): OfferTier | null {
  if (ceiling <= 0 || offer <= 0) return null;
  const ratio = offer / ceiling;
  if (ratio >= 0.95) return 'generous';
  if (ratio >= 0.8) return 'reasonable';
  return 'measured';
}

/** Çıkış planı kanalı (TradeChannel) → plan görseli. */
export const EXIT_ART: Record<string, Art | undefined> = {
  retail: art('realistic/gameplay/exit-plans/showcase.png', 'Vitrine koy'),
  wholesale: art('realistic/gameplay/exit-plans/wholesale.png', 'Toptancıya çıkar'),
  melt: art('realistic/gameplay/exit-plans/melt-has.png', 'Erit ve HAS yap'),
};

// ---------------------------------------------------------------------------
// Portreler — manifest.realistic.characters
// ---------------------------------------------------------------------------

const CUSTOMER_F: Art[] = [
  art('realistic/characters/customer-zeynep.png', 'Müşteri portresi'),
  art('realistic/characters/customer-nermin.png', 'Müşteri portresi'),
  art('realistic/characters/customer-selin.png', 'Müşteri portresi'),
];

const CUSTOMER_M: Art[] = [
  art('realistic/characters/customer-adnan.png', 'Müşteri portresi'),
  art('realistic/characters/customer-hasan.png', 'Müşteri portresi'),
  art('realistic/characters/customer-ahmet.png', 'Müşteri portresi'),
];

const MERCHANTS: Art[] = [
  art('realistic/characters/merchant-nadir.png', 'Esnaf portresi'),
  art('realistic/characters/merchant-sabri.png', 'Esnaf portresi'),
  art('realistic/characters/merchant-kemal.png', 'Esnaf portresi'),
  art('realistic/characters/merchant-vedat.png', 'Esnaf portresi'),
];

export const OUTSIDE_MASTER_ART = art(
  'realistic/characters/outside-master.png',
  'Dışarıdaki usta',
);

export const EMPLOYEE_ART = art('realistic/characters/first-employee.png', 'Dükkan çalışanı');

/**
 * Kimlikten portreye kararlı eşleme.
 *
 * DETERMİNİZM NOTU (GDD 28.3): bu bir RNG akışı DEĞİLDİR. Oyun durumundan
 * hiçbir şey tüketmez, hiçbir şey yazmaz; aynı isim her zaman aynı portreyi
 * verir. Kayıt dosyasına da girmez — tamamen sunum katmanındadır.
 */
function stableIndex(key: string, length: number): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % length;
}

/**
 * Müşteri portresi. Cinsiyet oyun durumunda tutulmuyor; görünen adın
 * hitabından ("… Hanım" / "… Bey") okunur — domain'e dokunmadan.
 */
export function customerArt(displayName: string): Art {
  const pool = displayName.endsWith('Hanım') ? CUSTOMER_F : CUSTOMER_M;
  const picked = pool[stableIndex(displayName, pool.length)] ?? CUSTOMER_M[0]!;
  return { src: picked.src, alt: `${displayName} portresi` };
}

export function merchantArt(memberId: string, name: string): Art {
  const picked = MERCHANTS[stableIndex(memberId, MERCHANTS.length)] ?? MERCHANTS[0]!;
  return { src: picked.src, alt: `${name} portresi` };
}

// ---------------------------------------------------------------------------
// Oyuncu avatarları — Asetv2 paketi (characters/manifest.json)
// ---------------------------------------------------------------------------

/**
 * Kuyumcu portresi. GÖRÜNÜM SEÇİMİDİR: hiçbir avatarın oyun içi etkisi yoktur.
 *
 * Kaynak 11 adet 1254×1254 şeffaf PNG (toplam 15,8 MB); her biri kareliği ve
 * saydamlığı korunarak 256 px WebP'ye alındı (toplam 141 KB). Kırpma
 * YAPILMADI — 11 portre bir seçim ızgarasında yan yana duracak ve her birini
 * kendi içeriğine kırpmak kartlara farklı en-boy oranları verirdi.
 */
export function avatarArt(avatarId: string): Art {
  return {
    src: `./assets/characters/${avatarId}.webp`,
    alt: 'Kuyumcu portresi',
  };
}

// ---------------------------------------------------------------------------
// Navigasyon — manifest.realistic.navigation
// ---------------------------------------------------------------------------

/** Kök ekran → 64 px+ başlık / boş durum görseli. */
export const NAV_ART = {
  shop: art('realistic/navigation/shop.png', 'Dükkan'),
  stock: art('realistic/navigation/stock.png', 'Stok'),
  workshop: art('realistic/navigation/workshop.png', 'Atölye'),
  market: art('realistic/icons/market-shop.png', 'Market'),
  business: art('realistic/navigation/investments.png', 'İşletme ve yatırımlar'),
  wholesaler: art('realistic/navigation/wholesaler.png', 'Toptancı'),
  skills: art('realistic/navigation/skills.png', 'Yetenekler'),
  profile: art('realistic/navigation/profile.png', 'Profil'),
} as const;
