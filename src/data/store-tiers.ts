/**
 * MIHENKAYNAK — Mağaza kademeleri
 * Kaynak: GDD 19 "Mağaza Büyümesi ve Kariyer Katmanları", 19.1–19.3;
 *         GDD 18.1 (sermaye ekseni "mağaza yatırımı"), GDD 30.2 MVP.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * GDD 19.2 DEĞİŞMEZ: "Mağaza kademesi YALNIZ LEVEL SAYISINA BAĞLANMAZ.
 * Sermaye, itibar ve bazı operasyon/tedarik eşikleri BİRLİKTE istenir.
 * Böylece 'XP kastım, mağaza büyüdü' yerine işletmenin GERÇEKTEN HAZIR
 * olması gerekir."
 *
 * Bu yüzden her kademenin birden çok kapısı var ve hepsi aynı anda açık
 * olmalı. Tek kapı (level) bırakmak, GDD'nin açıkça reddettiği şeydi.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * GDD 19.3 SCOPE: "1.0 için tam Marka Ağı / çoklu şube yönetimi ZORUNLU
 * DEĞİLDİR." Kademe 5 bu yüzden tanımlı ama ERİŞİLEMEZ; ladder 4'te durur.
 */

import type { Money, StoreState } from '@domain/types';

export type StoreTier = StoreState['storeTier'];

export interface TierRequirement {
  /** Net servet (nakit + stok) — GDD 18.1 "sermaye" ekseni. */
  netWorth: Money;
  /** Semt/marka itibarı — GDD 18.1 "itibar" ekseni. */
  reputation: number;
  /** Ustalık seviyesi — tek başına YETMEZ, sadece kapılardan biri. */
  level: number;
  /** Tedarik güveni — GDD 18.1 "tedarik güveni" ekseni. */
  supplierTrust: number;
  /** Kapanmış işlem sayısı — operasyon eşiği. */
  closedDeals: number;
  /** Tanıdık müşteri sayısı — GDD 10.1 kişisel güven ekseni. */
  knownCustomers: number;
}

export interface TierGrant {
  displaySlots: number;
  backStockSlots: number;
  workshopCapacity: number;
  /** Büyük mağaza daha pahalı: yükseltme sabit gideri de artırır. */
  dailyOverhead: Money;
}

export interface StoreTierDef {
  tier: StoreTier;
  name: string;
  theme: string;
  /** GDD 19.1 "Ana açılım" sütunu. */
  unlocks: string[];
  /** Bu kademeye geçmek için ödenen yatırım (GDD 18.1 "mağaza yatırımı"). */
  investment: Money;
  /** Bu kademeye geçmek için sağlanması gereken kapılar. */
  requires: TierRequirement | null;
  grants: TierGrant;
  /** GDD 19.3 — 1.0 kapsamı dışındaysa erişilemez. */
  inScope: boolean;
}

/** GDD 19.1 tablosu. */
export const STORE_TIERS: StoreTierDef[] = [
  {
    tier: 1,
    name: 'Semt Kuyumcusu',
    theme: 'Dar, sıcak, güven odaklı',
    unlocks: ['Temel al-sat', 'Terazi ve mihenk', 'Vitrin 8 · arka stok 16', 'Pakete 2 kalem'],
    investment: 0,
    requires: null,
    grants: { displaySlots: 8, backStockSlots: 16, workshopCapacity: 2, dailyOverhead: 1_200 },
    inScope: true,
  },
  {
    tier: 2,
    name: 'Cadde Mağazası',
    theme: 'Daha geniş vitrin ve operasyon',
    unlocks: [
      'Vitrin 14 · arka stok 28',
      'Atölyede 3 iş birden',
      'Pakete 3 kalem',
      'Yeni ürün türleri: kolye, set, gümüş obje ve taşlı yüzük',
      'Koleksiyoncu müşteri (itibar 55+)',
      'Toptancı limiti büyür',
    ],
    investment: 220_000,
    requires: {
      netWorth: 600_000,
      reputation: 52,
      level: 3,
      supplierTrust: 58,
      closedDeals: 18,
      knownCustomers: 6,
    },
    grants: { displaySlots: 14, backStockSlots: 28, workshopCapacity: 3, dailyOverhead: 2_100 },
    inScope: true,
  },
  {
    tier: 3,
    name: 'AVM / Premium Butik',
    theme: 'Premium sunum',
    unlocks: [
      'Vitrin 22 · arka stok 44',
      'Atölyede 4 iş birden',
      'Pakete 4 kalem',
      'Premium taşlı ürün, vintage broş ve koleksiyon parası',
    ],
    investment: 850_000,
    requires: {
      netWorth: 2_200_000,
      reputation: 64,
      level: 6,
      supplierTrust: 70,
      closedDeals: 70,
      knownCustomers: 20,
    },
    grants: { displaySlots: 22, backStockSlots: 44, workshopCapacity: 4, dailyOverhead: 4_400 },
    inScope: true,
  },
  {
    tier: 4,
    name: 'Şehir Flagship',
    theme: 'Yüksek hacim ve uzmanlık',
    unlocks: ['Vitrin 32 · arka stok 70', 'Atölyede 6 iş birden', 'Pakete 5 kalem'],
    investment: 2_600_000,
    requires: {
      netWorth: 7_000_000,
      reputation: 78,
      level: 10,
      supplierTrust: 82,
      closedDeals: 180,
      knownCustomers: 45,
    },
    grants: { displaySlots: 32, backStockSlots: 70, workshopCapacity: 6, dailyOverhead: 9_200 },
    inScope: true,
  },
  {
    tier: 5,
    name: 'Marka Ağı',
    theme: 'Yönetim katmanı',
    unlocks: ['İkinci şube', 'Bölgesel hedefler'],
    investment: 0,
    requires: null,
    grants: { displaySlots: 32, backStockSlots: 70, workshopCapacity: 6, dailyOverhead: 9_200 },
    // GDD 19.3 — post-1.0 büyüme katmanı. Tanımlı ama açılmaz.
    inScope: false,
  },
];

export const TIER_BY_ID = new Map(STORE_TIERS.map((t) => [t.tier, t]));

export function tierDef(tier: StoreTier): StoreTierDef {
  const def = TIER_BY_ID.get(tier);
  if (!def) throw new Error(`Bilinmeyen mağaza kademesi: ${tier}`);
  return def;
}

/** Sıradaki kademe — kapsam dışıysa null (GDD 19.3). */
export function nextTierDef(tier: StoreTier): StoreTierDef | null {
  const next = TIER_BY_ID.get((tier + 1) as StoreTier);
  return next && next.inScope ? next : null;
}
