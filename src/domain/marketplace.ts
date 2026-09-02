import type { EconomyState } from './settlement';
import { applyTransaction } from './settlement';
import type { GameDay, Money, StoreState } from './types';
import { dailyOperatingCost } from './v5-rules';

export type MarketCategory =
  | 'profile'
  | 'frames'
  | 'shop'
  | 'decoration'
  | 'collection'
  | 'lifestyle';

export type MarketEquipSlot = 'profileFrame' | 'shopTheme' | 'shopBadge';

export interface UnlockRequirement {
  level?: number;
  reputation?: number;
}

export interface MarketProduct {
  id: string;
  category: MarketCategory;
  name: string;
  description: string;
  price: Money;
  unlockRequirement: UnlockRequirement;
  assetReference: string;
  equipSlot?: MarketEquipSlot;
  /** Şahsi prestij ürünlerinin gün kapanışında yarattığı kalıcı gider. */
  dailyUpkeep?: Money;
  tier: 'standard' | 'premium' | 'elite' | 'legendary';
}

export interface PlayerMarketState {
  owned: string[];
  equipped: Partial<Record<MarketEquipSlot, string>>;
}

export const MARKET_CATEGORIES: { id: MarketCategory; label: string; description: string }[] = [
  { id: 'profile', label: 'Profil', description: 'Rozet ve oyuncu kimliği' },
  { id: 'frames', label: 'Çerçeveler', description: 'Avatar çerçeveleri' },
  { id: 'shop', label: 'Dükkan', description: 'Dükkan temaları ve tabelalar' },
  { id: 'decoration', label: 'Dekorasyon', description: 'Tezgâh ve ekipman görünümleri' },
  { id: 'collection', label: 'Koleksiyon', description: 'Prestij koleksiyonları' },
  { id: 'lifestyle', label: 'Şahsi', description: 'Saatten özel jete yaşam hedefleri' },
];

/**
 * İlk Market kataloğu. Ürünler mekanik güç vermez; yalnız görünüm, koleksiyon
 * ve prestij sağlar. Şahsi üst segment ürünler bakım gideri üretir.
 */
export const MARKET_CATALOG: MarketProduct[] = [
  { id: 'badge_founder', category: 'profile', name: 'Kurucu Rozeti', description: 'Profilinde ilk dönem kuyumcu rozeti gösterir.', price: 25_000, unlockRequirement: { level: 1 }, assetReference: 'badge:founder', equipSlot: 'shopBadge', tier: 'standard' },
  { id: 'badge_master', category: 'profile', name: 'Usta Sarraf Rozeti', description: 'Tecrübeyi simgeleyen mor-altın profil rozeti.', price: 240_000, unlockRequirement: { level: 6, reputation: 55 }, assetReference: 'badge:master', equipSlot: 'shopBadge', tier: 'premium' },
  { id: 'frame_brass', category: 'frames', name: 'Pirinç Çerçeve', description: 'Avatar çevresine sıcak pirinç işçiliği uygular.', price: 60_000, unlockRequirement: { level: 2 }, assetReference: 'frame:brass', equipSlot: 'profileFrame', tier: 'standard' },
  { id: 'frame_amethyst', category: 'frames', name: 'Ametist Çerçeve', description: 'Mor taş ve altın ışıklı premium avatar çerçevesi.', price: 185_000, unlockRequirement: { level: 4 }, assetReference: 'frame:amethyst', equipSlot: 'profileFrame', tier: 'premium' },
  { id: 'frame_crown', category: 'frames', name: 'Hanedan Çerçevesi', description: 'Üst düzey itibarı görünür kılan koleksiyon çerçevesi.', price: 750_000, unlockRequirement: { level: 9, reputation: 70 }, assetReference: 'frame:crown', equipSlot: 'profileFrame', tier: 'elite' },
  { id: 'theme_nocturne', category: 'shop', name: 'Gece Ametisti', description: 'Ana dükkan fonunu koyu ametist vitrin temasına dönüştürür.', price: 320_000, unlockRequirement: { level: 4 }, assetReference: 'theme:nocturne', equipSlot: 'shopTheme', tier: 'premium' },
  { id: 'theme_ivory', category: 'shop', name: 'Fildişi Saray', description: 'Açık taş, pirinç ve yumuşak vitrin ışığı teması.', price: 680_000, unlockRequirement: { level: 7, reputation: 60 }, assetReference: 'theme:ivory', equipSlot: 'shopTheme', tier: 'elite' },
  { id: 'decor_scale', category: 'decoration', name: 'Usta Terazisi', description: 'Tezgâhta sergilenen premium terazi görünümü.', price: 125_000, unlockRequirement: { level: 3 }, assetReference: 'decor:master-scale', tier: 'standard' },
  { id: 'decor_safe', category: 'decoration', name: 'Prestij Kasası', description: 'Dükkan kimliğine ağır çelik ve altın detaylı kasa ekler.', price: 480_000, unlockRequirement: { level: 6 }, assetReference: 'decor:prestige-safe', tier: 'premium' },
  { id: 'collection_coins', category: 'collection', name: 'Osmanlı Sikke Seti', description: 'Koleksiyon defterine tarihî sikke seti ekler.', price: 450_000, unlockRequirement: { level: 5, reputation: 50 }, assetReference: 'collection:ottoman-coins', tier: 'premium' },
  { id: 'collection_gems', category: 'collection', name: 'Nadir Taş Arşivi', description: 'Yakut, safir ve zümrüt prestij koleksiyonu.', price: 2_400_000, unlockRequirement: { level: 10, reputation: 75 }, assetReference: 'collection:rare-gems', tier: 'elite' },
  { id: 'life_watch', category: 'lifestyle', name: 'İsviçre Saati', description: 'İlk şahsi prestij hedefi; bakım gideri yoktur.', price: 180_000, unlockRequirement: { level: 1 }, assetReference: 'lifestyle:watch', tier: 'standard' },
  { id: 'life_sedan', category: 'lifestyle', name: 'Premium Sedan', description: 'Şehir içi prestij otomobili.', price: 1_200_000, unlockRequirement: { level: 4 }, assetReference: 'lifestyle:sedan', dailyUpkeep: 1_000, tier: 'premium' },
  { id: 'life_sportscar', category: 'lifestyle', name: 'Spor Otomobil', description: 'Yüksek servetin görünür ama ekonomik güç vermeyen simgesi.', price: 4_500_000, unlockRequirement: { level: 7 }, assetReference: 'lifestyle:sportscar', dailyUpkeep: 2_500, tier: 'elite' },
  { id: 'life_apartment', category: 'lifestyle', name: 'Şehir Rezidansı', description: 'Merkezde prestijli bir şahsi yaşam alanı.', price: 8_000_000, unlockRequirement: { level: 8, reputation: 60 }, assetReference: 'lifestyle:apartment', dailyUpkeep: 3_000, tier: 'elite' },
  { id: 'life_villa', category: 'lifestyle', name: 'Boğaz Villası', description: 'End-game serveti için kalıcı prestij hedefi.', price: 25_000_000, unlockRequirement: { level: 12, reputation: 75 }, assetReference: 'lifestyle:villa', dailyUpkeep: 8_000, tier: 'legendary' },
  { id: 'life_yacht', category: 'lifestyle', name: 'Lüks Yat', description: 'Çok yüksek serveti tüketen koleksiyon ve yaşam hedefi.', price: 80_000_000, unlockRequirement: { level: 16, reputation: 85 }, assetReference: 'lifestyle:yacht', dailyUpkeep: 20_000, tier: 'legendary' },
  { id: 'life_jet', category: 'lifestyle', name: 'Özel Jet', description: 'En üst seviye şahsi prestij ve bakım sorumluluğu.', price: 250_000_000, unlockRequirement: { level: 22, reputation: 95 }, assetReference: 'lifestyle:private-jet', dailyUpkeep: 60_000, tier: 'legendary' },
];

export function defaultPlayerMarket(): PlayerMarketState {
  return { owned: [], equipped: {} };
}

export function productById(id: string): MarketProduct | undefined {
  return MARKET_CATALOG.find((product) => product.id === id);
}

export function isUnlocked(product: MarketProduct, level: number, reputation: number): boolean {
  return level >= (product.unlockRequirement.level ?? 1) && reputation >= (product.unlockRequirement.reputation ?? 0);
}

export function lifestyleDailyExpense(state: PlayerMarketState): Money {
  return state.owned.reduce((sum, id) => sum + (productById(id)?.dailyUpkeep ?? 0), 0);
}

/** Satın alımdan sonra gün kapanışını kilitlememek için korunacak toplam nakit. */
export function marketPurchaseCashRequirement(
  product: MarketProduct,
  playerMarket: PlayerMarketState,
  store: StoreState,
): Money {
  const nextOwned = playerMarket.owned.includes(product.id)
    ? playerMarket.owned
    : [...playerMarket.owned, product.id];
  const nextUpkeep = lifestyleDailyExpense({ ...playerMarket, owned: nextOwned });
  return product.price + dailyOperatingCost(store) + nextUpkeep;
}

export interface MarketPurchaseOutcome {
  applied: boolean;
  economy: EconomyState;
  playerMarket: PlayerMarketState;
  reason?: string;
}

export function purchaseMarketProduct(
  economy: EconomyState,
  playerMarket: PlayerMarketState,
  productId: string,
  day: GameDay,
): MarketPurchaseOutcome {
  const product = productById(productId);
  if (!product) return { applied: false, economy, playerMarket, reason: 'Ürün bulunamadı.' };
  if (playerMarket.owned.includes(productId)) return { applied: false, economy, playerMarket, reason: 'Bu ürün zaten sende.' };
  if (!isUnlocked(product, economy.store.level, economy.store.reputation)) return { applied: false, economy, playerMarket, reason: 'Ürün henüz açılmadı.' };
  if (economy.store.cash < marketPurchaseCashRequirement(product, playerMarket, economy.store)) {
    return { applied: false, economy, playerMarket, reason: 'Satın alma sonrası gün sonu gideri için yeterli nakit kalmıyor.' };
  }

  const transaction = applyTransaction(economy, {
    txId: `market_${product.id}`,
    dealId: `market_${product.id}`,
    day,
    cashDelta: -product.price,
    itemsIn: [],
    itemsOut: [],
    trustDelta: 0,
    reputationDelta: 0,
    xpDelta: 0,
    label: `Market · ${product.name}`,
  });

  if (!transaction.applied) return { applied: false, economy, playerMarket, reason: transaction.reason };
  return {
    applied: true,
    economy: transaction.state,
    playerMarket: {
      owned: [...playerMarket.owned, product.id],
      equipped: product.equipSlot
        ? { ...playerMarket.equipped, [product.equipSlot]: product.id }
        : playerMarket.equipped,
    },
  };
}

export function equipMarketProduct(
  state: PlayerMarketState,
  productId: string,
): PlayerMarketState | null {
  const product = productById(productId);
  if (!product?.equipSlot || !state.owned.includes(productId)) return null;
  return { ...state, equipped: { ...state.equipped, [product.equipSlot]: product.id } };
}
