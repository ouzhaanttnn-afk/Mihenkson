/**
 * MIHENKAYNAK — Sarrafiye ürün metadatası
 * Kaynak: Ekonomi Ara Düzeltmesi v1.0 · §4 "Sarrafiye ürün ve hacim mantığı".
 *
 * Addendum §2.1: "Sarrafiye, oyunun yüksek frekanslı ve yüksek likiditeli ana
 * ekonomik omurgası olarak korunur."
 *
 * §4: "Her ürün; birim ağırlık/karşılık, likidite sınıfı, standart hacim bandı,
 * kanal uygunluğu ve piyasa duyarlılığı metadatası taşımalıdır."
 *
 * KAPSAM SINIRI (Addendum §10): Bu dosya temel fiyatın NASIL hesaplandığını
 * değiştirmez. Metal değeri hâlâ GDD 6.2'nin formülüdür
 * (net gram × gerçek saflık × spot). Buradaki metadata, o çıktının üzerine
 * kanal/hacim/risk davranışının nasıl uygulanacağını tarif eder.
 */

import type { TradeChannel } from '@domain/types';
import { MARKET_BASE } from '@domain/balance';

/** §4 "likidite sınıfı" — ürünün ne kadar kolay nakde döndüğü. */
export type LiquidityClass = 'high' | 'medium' | 'low';

export interface BullionMeta {
  /** Ürün şablonu kimliği. */
  templateId: string;

  /**
   * §4 "birim ağırlık/karşılık" — bir adedin gram karşılığı.
   * Sarrafiye adetle alınıp satılır; gram karşılığı sabittir.
   */
  unitWeightGrams: number;

  /** Birim başına saflık (ayar karşılığı). */
  unitPurity: number;

  /** §4 likidite sınıfı. */
  liquidityClass: LiquidityClass;

  /**
   * §4 "standart hacim bandı" — normal bir müşterinin tipik adet aralığı.
   * Toplu müşteri bu bandın dışına çıkar (bkz. bulkVolumeBand).
   */
  volumeBand: [number, number];

  /** §4.1 toplu müşterinin adet bandı. */
  bulkVolumeBand: [number, number];

  /** §4 "kanal uygunluğu" — bu ürün hangi ticari kanallarda işlem görür. */
  channelFit: TradeChannel[];

  /**
   * §4 "piyasa duyarlılığı" (0–1). Spot hareketinin ürün fiyatına ne kadar
   * doğrudan yansıdığı. Saf yatırım ürünü 1'e yakın; primli ürün biraz daha
   * sönümlü çünkü priminin bir kısmı talep kaynaklıdır.
   */
  marketSensitivity: number;

  /**
   * Ticari prim: standart sarrafiye ürünlerinin metal değeri üzerine binen
   * darphane/tanınırlık payı. Ata gibi ürünlerde daha yüksektir.
   */
  premiumRatio: number;
}

/** UPDATEv3 — satılabilir yatırım bileziği gramajlarının tek kaynağı. */
export const INVESTMENT_BANGLE_WEIGHTS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100] as const;

export function investmentBangleTemplateId(weight: number): string {
  return `investment_bangle_22k_${weight}`;
}

/**
 * §4: "Sarrafiye ürün havuzu en az gram altın, çeyrek, yarım, tam ve
 * Ata/Cumhuriyet tipi ürünleri destekleyecek biçimde genişletilir."
 *
 * Gerçek gramajlar: ziynet çeyrek 1.75 g, yarım 3.5 g, tam 7.0 g;
 * Cumhuriyet ve Ata 7.216 g. Hepsi 22 ayar (0.916).
 */
export const BULLION_META: BullionMeta[] = [
  {
    templateId: 'gram_gold_1',
    unitWeightGrams: 1,
    unitPurity: 0.995,
    liquidityClass: 'high',
    volumeBand: [1, 5],
    bulkVolumeBand: [20, 120],
    channelFit: ['retailCustomer', 'bulkCustomer', 'wholesaler', 'tradeNetwork'],
    marketSensitivity: 1,
    premiumRatio: 0.012,
  },
  {
    templateId: 'gram_gold_5',
    unitWeightGrams: 5,
    unitPurity: 0.995,
    liquidityClass: 'high',
    volumeBand: [1, 4],
    bulkVolumeBand: [8, 40],
    channelFit: ['retailCustomer', 'bulkCustomer', 'wholesaler', 'tradeNetwork'],
    marketSensitivity: 1,
    premiumRatio: 0.009,
  },
  {
    templateId: 'gram_gold_10',
    unitWeightGrams: 10,
    unitPurity: 0.995,
    liquidityClass: 'high',
    volumeBand: [1, 3],
    bulkVolumeBand: [5, 25],
    channelFit: ['retailCustomer', 'bulkCustomer', 'wholesaler', 'tradeNetwork'],
    marketSensitivity: 1,
    premiumRatio: 0.007,
  },
  {
    templateId: 'gram_gold_2_5',
    unitWeightGrams: 2.5,
    unitPurity: 0.995,
    liquidityClass: 'high',
    volumeBand: [1, 5],
    bulkVolumeBand: [15, 80],
    channelFit: ['retailCustomer', 'bulkCustomer', 'wholesaler', 'tradeNetwork'],
    marketSensitivity: 1,
    premiumRatio: 0.011,
  },
  {
    templateId: 'gram_gold_20',
    unitWeightGrams: 20,
    unitPurity: 0.995,
    liquidityClass: 'high',
    volumeBand: [1, 3],
    bulkVolumeBand: [4, 20],
    channelFit: ['retailCustomer', 'bulkCustomer', 'wholesaler', 'tradeNetwork'],
    marketSensitivity: 1,
    premiumRatio: 0.006,
  },
  {
    templateId: 'gram_gold_50',
    unitWeightGrams: 50,
    unitPurity: 0.995,
    liquidityClass: 'high',
    volumeBand: [1, 2],
    bulkVolumeBand: [2, 10],
    channelFit: ['retailCustomer', 'bulkCustomer', 'wholesaler', 'tradeNetwork'],
    marketSensitivity: 1,
    premiumRatio: 0.005,
  },
  {
    templateId: 'gram_gold_100',
    unitWeightGrams: 100,
    unitPurity: 0.995,
    liquidityClass: 'high',
    volumeBand: [1, 2],
    bulkVolumeBand: [2, 6],
    channelFit: ['retailCustomer', 'bulkCustomer', 'wholesaler', 'tradeNetwork'],
    marketSensitivity: 1,
    premiumRatio: 0.004,
  },
  {
    templateId: 'quarter_gold',
    unitWeightGrams: MARKET_BASE.quarterGoldWeight,
    unitPurity: 0.922,
    liquidityClass: 'high',
    volumeBand: [1, 6],
    bulkVolumeBand: [15, 90],
    channelFit: ['retailCustomer', 'bulkCustomer', 'wholesaler', 'tradeNetwork'],
    marketSensitivity: 0.96,
    premiumRatio: 0.045,
  },
  {
    templateId: 'half_gold',
    unitWeightGrams: 3.5,
    unitPurity: 0.916,
    liquidityClass: 'high',
    volumeBand: [1, 4],
    bulkVolumeBand: [8, 45],
    channelFit: ['retailCustomer', 'bulkCustomer', 'wholesaler', 'tradeNetwork'],
    marketSensitivity: 0.96,
    premiumRatio: 0.04,
  },
  {
    templateId: 'full_gold',
    unitWeightGrams: 7,
    unitPurity: 0.916,
    liquidityClass: 'high',
    volumeBand: [1, 3],
    bulkVolumeBand: [5, 30],
    channelFit: ['retailCustomer', 'bulkCustomer', 'wholesaler', 'tradeNetwork'],
    marketSensitivity: 0.95,
    premiumRatio: 0.038,
  },
  {
    templateId: 'republic_gold',
    unitWeightGrams: 7.216,
    unitPurity: 0.916,
    liquidityClass: 'high',
    volumeBand: [1, 3],
    bulkVolumeBand: [4, 25],
    channelFit: ['retailCustomer', 'bulkCustomer', 'wholesaler', 'tradeNetwork'],
    marketSensitivity: 0.93,
    premiumRatio: 0.052,
  },
  {
    templateId: 'ata_gold',
    unitWeightGrams: 7.216,
    unitPurity: 0.916,
    // Ata daha az standart; tanınırlığı yüksek ama derinliği Cumhuriyet'ten dar.
    liquidityClass: 'medium',
    volumeBand: [1, 2],
    bulkVolumeBand: [3, 18],
    channelFit: ['retailCustomer', 'bulkCustomer', 'wholesaler'],
    marketSensitivity: 0.9,
    premiumRatio: 0.068,
  },
  {
    templateId: 'small_ingot',
    unitWeightGrams: 20,
    unitPurity: 0.995,
    // Külçe standarttır ama tek işlemde büyük tutar bağlar; perakende derinliği dar.
    liquidityClass: 'medium',
    volumeBand: [1, 2],
    bulkVolumeBand: [2, 10],
    channelFit: ['bulkCustomer', 'wholesaler'],
    marketSensitivity: 1,
    premiumRatio: 0.005,
  },
  ...INVESTMENT_BANGLE_WEIGHTS.map((weight): BullionMeta => ({
    templateId: investmentBangleTemplateId(weight),
    unitWeightGrams: weight,
    unitPurity: 0.922,
    liquidityClass: 'high',
    volumeBand: [1, 2],
    bulkVolumeBand: [2, 8],
    channelFit: ['retailCustomer', 'bulkCustomer', 'wholesaler', 'tradeNetwork'],
    marketSensitivity: 1,
    // İşçilik ve tasarım primi yok; fiyat yalnız metal + mevcut kanal makasıdır.
    premiumRatio: 0,
  })),
];

/**
 * UPDATEv2/v3 tek doğruluk kaynağı: oyuncunun tedarik edip müşteriye
 * satabildiği katalog. Talep üretimi ve Stok > Sarrafiye Al bunu paylaşır.
 */
export const RETAIL_BULLION_CATALOG = BULLION_META
  .filter((meta) => meta.channelFit.includes('retailCustomer'))
  .map((meta) => meta.templateId);

export const BULLION_BY_TEMPLATE = new Map(BULLION_META.map((m) => [m.templateId, m]));

export function bullionMeta(templateId: string): BullionMeta | null {
  return BULLION_BY_TEMPLATE.get(templateId) ?? null;
}

export function isBullion(templateId: string): boolean {
  return BULLION_BY_TEMPLATE.has(templateId);
}

/**
 * §9 denge tablosu — işçilikli ürün için varsayılan kanal profili.
 * Sarrafiye dışındaki ürünler daha düşük likidite, daha seçici hacim ve daha
 * yüksek belirsizlik taşır; kanal uygunluğu da dardır.
 */
export const CRAFTED_DEFAULT: Omit<BullionMeta, 'templateId' | 'unitWeightGrams' | 'unitPurity'> = {
  liquidityClass: 'low',
  volumeBand: [1, 1],
  bulkVolumeBand: [1, 2],
  channelFit: ['retailCustomer', 'wholesaler'],
  marketSensitivity: 0.7,
  premiumRatio: 0,
};
