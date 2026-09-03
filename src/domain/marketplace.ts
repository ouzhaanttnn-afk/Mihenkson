import { t } from '@i18n/index';
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
  /** Oyuncunun hesabında bulunması gereken en düşük HAS miktarı. */
  hasGrams?: number;
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
  /** Global kotayı yerel save'in sahte biçimde dağıtmaması için sunucu talebi gerekir. */
  serverClaim?: {
    globalQuota: number;
    claimKey: string;
  };
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
  {
    id: 'badge_first_5kg_has',
    category: 'profile',
    name: 'İlk 5 KG HAS Rozeti',
    description: '5 kg HAS biriktiren ilk 100 oyuncuya ayrılmış, global sınırlı prestij rozeti.',
    price: 0,
    unlockRequirement: { hasGrams: 5_000 },
    assetReference: 'badge:first-5kg-has-placeholder',
    equipSlot: 'shopBadge',
    tier: 'legendary',
    serverClaim: { globalQuota: 100, claimKey: 'first_100_reach_5kg_has' },
  },
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
  { id: 'life_villa', category: 'lifestyle', name: 'Boğaz Villası', description: 'Oyunun ileri aşamasındaki servet için kalıcı prestij hedefi.', price: 25_000_000, unlockRequirement: { level: 12, reputation: 75 }, assetReference: 'lifestyle:villa', dailyUpkeep: 8_000, tier: 'legendary' },
  { id: 'life_yacht', category: 'lifestyle', name: 'Lüks Yat', description: 'Çok yüksek serveti tüketen koleksiyon ve yaşam hedefi.', price: 80_000_000, unlockRequirement: { level: 16, reputation: 85 }, assetReference: 'lifestyle:yacht', dailyUpkeep: 20_000, tier: 'legendary' },
  { id: 'life_jet', category: 'lifestyle', name: 'Özel Jet', description: 'En üst seviye şahsi prestij ve bakım sorumluluğu.', price: 250_000_000, unlockRequirement: { level: 22, reputation: 95 }, assetReference: 'lifestyle:private-jet', dailyUpkeep: 60_000, tier: 'legendary' },

  /*
    ═════════════════════════════════════════════════════════════════════════
    GENİŞLETME — ölçülen boşluklara göre.

    Katalog 19 üründe duruyordu ve seviye kapsaması ölçüldüğünde iki gerçek
    sorun çıktı:

      1. 12. seviyeden sonra ON SEVİYELİK ÖLÜ BÖLGE vardı: 11, 13, 14, 15,
         17, 18, 19, 20, 21, 23, 24, 25 seviyelerinde HİÇBİR ürün yoktu.
         Oyuncu 12'den 16'ya kadar Market'te yeni hiçbir şey görmüyordu.
      2. DEKORASYON ve TEMA 6–7. seviyede bitiyordu. Oyun dükkânın kendisi
         üstüne kurulu, ama dükkân bir yerden sonra gelişmeyi bırakıyordu.

    Ayrıca giriş ucu pahalıydı: ilk çerçeve 60.000, ilk tema 320.000. Yeni
    ürünler alt uca da eklendi ki oyuncu daha ilk günlerde Market'le bir
    ilişki kurabilsin.

    KURAL DEĞİŞMEDİ: hiçbiri oyun gücü vermez — görünüm, koleksiyon ve
    prestij. Bakım gideri YALNIZ şahsi ürünlerde; arayüz o toplamı "şahsi
    bakım" diye etiketliyor, dekorasyona gider yazmak o etiketi yalan yapardı.
    ═════════════════════════════════════════════════════════════════════════
  */

  // --- Rozetler: çırakla başlar, efsaneyle biter -------------------------
  { id: 'badge_apprentice', category: 'profile', name: 'Çırak Rozeti', description: 'Tezgâh arkasında geçen ilk günlerin sade rozeti.', price: 8_000, unlockRequirement: { level: 1 }, assetReference: 'badge:apprentice', equipSlot: 'shopBadge', tier: 'standard' },
  { id: 'badge_touchstone', category: 'profile', name: 'Mihenk Ustası', description: 'Ayarı taşla okuyan eli simgeleyen rozet.', price: 700_000, unlockRequirement: { level: 9, reputation: 60 }, assetReference: 'badge:touchstone', equipSlot: 'shopBadge', tier: 'premium' },
  { id: 'badge_guild', category: 'profile', name: 'Çarşı Reisi', description: 'Esnaf arasında sözü geçenin rozeti.', price: 9_000_000, unlockRequirement: { level: 15, reputation: 80 }, assetReference: 'badge:guild', equipSlot: 'shopBadge', tier: 'elite' },
  { id: 'badge_legend', category: 'profile', name: 'Efsane Sarraf', description: 'Adı çarşıdan taşan sarrafın rozeti.', price: 120_000_000, unlockRequirement: { level: 23, reputation: 92 }, assetReference: 'badge:legend', equipSlot: 'shopBadge', tier: 'legendary' },

  // --- Çerçeveler: telkariden pırlantaya --------------------------------
  { id: 'frame_telkari', category: 'frames', name: 'Gümüş Telkari', description: 'İnce gümüş tel işçiliğiyle örülmüş sade çerçeve.', price: 22_000, unlockRequirement: { level: 1 }, assetReference: 'frame:telkari', equipSlot: 'profileFrame', tier: 'standard' },
  { id: 'frame_enamel', category: 'frames', name: 'Mine İşi Çerçeve', description: 'Renkli mine ve altın kontur.', price: 300_000, unlockRequirement: { level: 6 }, assetReference: 'frame:enamel', equipSlot: 'profileFrame', tier: 'premium' },
  { id: 'frame_nacre', category: 'frames', name: 'Sedef Kakma', description: 'Ceviz üstüne sedef kakma; usta işi bir çerçeve.', price: 2_800_000, unlockRequirement: { level: 13, reputation: 70 }, assetReference: 'frame:nacre', equipSlot: 'profileFrame', tier: 'elite' },
  { id: 'frame_diamond', category: 'frames', name: 'Pırlanta Çerçeve', description: 'Işığı kıran taşlarla çevrili en üst çerçeve.', price: 30_000_000, unlockRequirement: { level: 19, reputation: 88 }, assetReference: 'frame:diamond', equipSlot: 'profileFrame', tier: 'legendary' },

  // --- Dükkan temaları: çarşıdan altın çağa ------------------------------
  { id: 'theme_bazaar', category: 'shop', name: 'Kapalıçarşı Klasiği', description: 'Kemerli tavan, ahşap dolap ve sıcak sarı ışık.', price: 95_000, unlockRequirement: { level: 2 }, assetReference: 'theme:bazaar', equipSlot: 'shopTheme', tier: 'standard' },
  { id: 'theme_deco', category: 'shop', name: 'Art Deco Pirinç', description: 'Geometrik pirinç kaplama ve siyah cam.', price: 1_400_000, unlockRequirement: { level: 10, reputation: 55 }, assetReference: 'theme:deco', equipSlot: 'shopTheme', tier: 'premium' },
  { id: 'theme_marble', category: 'shop', name: 'Mermer ve Cam', description: 'Damarlı mermer tezgâh, kenarsız cam vitrin.', price: 5_500_000, unlockRequirement: { level: 14, reputation: 70 }, assetReference: 'theme:marble', equipSlot: 'shopTheme', tier: 'elite' },
  { id: 'theme_goldenage', category: 'shop', name: 'Altın Çağ', description: 'Kubbeli tavan ve baştan aşağı varak; çarşının en görkemli dükkânı.', price: 40_000_000, unlockRequirement: { level: 20, reputation: 90 }, assetReference: 'theme:golden-age', equipSlot: 'shopTheme', tier: 'legendary' },

  // --- Dekorasyon: dükkân oyuncuyla birlikte büyür -----------------------
  { id: 'decor_tea', category: 'decoration', name: 'Çay Ocağı', description: 'Her müşteriye uzatılan ince belli bardak; çarşının asıl âdeti.', price: 45_000, unlockRequirement: { level: 2 }, assetReference: 'decor:tea-stove', tier: 'standard' },
  { id: 'decor_velvet', category: 'decoration', name: 'Kadife Tezgâh Örtüsü', description: 'Altını üstünde en iyi gösteren koyu kadife.', price: 90_000, unlockRequirement: { level: 3 }, assetReference: 'decor:velvet-cloth', tier: 'standard' },
  { id: 'decor_carpet', category: 'decoration', name: 'Hereke Halısı', description: 'İpek dokuma; ayak sesini alır, dükkâna ağırlık verir.', price: 850_000, unlockRequirement: { level: 8 }, assetReference: 'decor:hereke-carpet', tier: 'premium' },
  { id: 'decor_chandelier', category: 'decoration', name: 'Kristal Avize', description: 'Vitrindeki taşı kırk yerden parlatan kristal.', price: 1_600_000, unlockRequirement: { level: 11, reputation: 60 }, assetReference: 'decor:chandelier', tier: 'premium' },
  { id: 'decor_walnut', category: 'decoration', name: 'Ceviz Vitrin Takımı', description: 'Elde oyulmuş ceviz gövde, müzelik cam.', price: 3_200_000, unlockRequirement: { level: 13, reputation: 65 }, assetReference: 'decor:walnut-cases', tier: 'elite' },
  { id: 'decor_vault', category: 'decoration', name: 'Çelik Kasa Dairesi', description: 'Dükkânın arkasına açılan zırhlı kapılı kasa dairesi.', price: 12_000_000, unlockRequirement: { level: 17, reputation: 80 }, assetReference: 'decor:vault-room', tier: 'elite' },

  // --- Koleksiyon: sarrafın biriktirdikleri ------------------------------
  { id: 'collection_tesbih', category: 'collection', name: 'Kehribar Tesbih Koleksiyonu', description: 'Sıkışta satılmayan, camekânda durup sohbet açan taneler.', price: 160_000, unlockRequirement: { level: 3 }, assetReference: 'collection:amber-beads', tier: 'standard' },
  { id: 'collection_scales', category: 'collection', name: 'Antika Terazi Arşivi', description: 'Kefeli el terazilerinden dijital hassas teraziye kadar.', price: 900_000, unlockRequirement: { level: 7, reputation: 50 }, assetReference: 'collection:antique-scales', tier: 'premium' },
  { id: 'collection_seals', category: 'collection', name: 'Mühür Yüzük Kabinesi', description: 'Adı kazınmış taşlar; her biri bir imza.', price: 6_500_000, unlockRequirement: { level: 14, reputation: 72 }, assetReference: 'collection:signet-rings', tier: 'elite' },
  { id: 'collection_imperial', category: 'collection', name: 'Saray İşçiliği Arşivi', description: 'Sarayın kuyumcubaşılarından kalma işçilik örnekleri.', price: 90_000_000, unlockRequirement: { level: 21, reputation: 90 }, assetReference: 'collection:imperial-craft', tier: 'legendary' },

  // --- Şahsi: lüks basamağı uzatıldı ------------------------------------
  { id: 'life_horse', category: 'lifestyle', name: 'Safkan At', description: 'Şehrin dışında bir tay; bakımı seviyor, kâr getirmiyor.', price: 2_000_000, unlockRequirement: { level: 5 }, assetReference: 'lifestyle:horse', dailyUpkeep: 1_500, tier: 'elite' },
  { id: 'life_boat', category: 'lifestyle', name: 'Motoryat', description: 'Boğazda hafta sonu; yatın küçük ama gerçek hâli.', price: 14_000_000, unlockRequirement: { level: 10, reputation: 55 }, assetReference: 'lifestyle:motorboat', dailyUpkeep: 5_000, tier: 'elite' },
  { id: 'life_art', category: 'lifestyle', name: 'Sanat Koleksiyonu', description: 'Duvara asılan servet; sigortası her gün işler.', price: 30_000_000, unlockRequirement: { level: 13, reputation: 70 }, assetReference: 'lifestyle:art', dailyUpkeep: 4_000, tier: 'elite' },
  { id: 'life_mansion', category: 'lifestyle', name: 'Tarihî Yalı', description: 'Denize sıfır ahşap yalı; her kışı bir onarım ister.', price: 55_000_000, unlockRequirement: { level: 15, reputation: 80 }, assetReference: 'lifestyle:waterfront-mansion', dailyUpkeep: 15_000, tier: 'legendary' },
  { id: 'life_helicopter', category: 'lifestyle', name: 'Helikopter', description: 'Trafiği aşan ama kasayı da aşan bir tercih.', price: 120_000_000, unlockRequirement: { level: 18, reputation: 85 }, assetReference: 'lifestyle:helicopter', dailyUpkeep: 35_000, tier: 'legendary' },
  { id: 'life_island', category: 'lifestyle', name: 'Özel Ada', description: 'Servetin gidebileceği son yer; günlük gideri bir dükkânı döndürür.', price: 750_000_000, unlockRequirement: { level: 25, reputation: 98 }, assetReference: 'lifestyle:private-island', dailyUpkeep: 150_000, tier: 'legendary' },
];

export function defaultPlayerMarket(): PlayerMarketState {
  return { owned: [], equipped: {} };
}

export function productById(id: string): MarketProduct | undefined {
  return MARKET_CATALOG.find((product) => product.id === id);
}

export function isUnlocked(product: MarketProduct, level: number, reputation: number, hasBalanceMg = 0): boolean {
  return level >= (product.unlockRequirement.level ?? 1)
    && reputation >= (product.unlockRequirement.reputation ?? 0)
    && hasBalanceMg >= (product.unlockRequirement.hasGrams ?? 0) * 1_000;
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
  if (!product) return { applied: false, economy, playerMarket, reason: t('Ürün bulunamadı.') };
  if (playerMarket.owned.includes(productId)) return { applied: false, economy, playerMarket, reason: t('Bu ürün zaten sende.') };
  if (product.serverClaim) return { applied: false, economy, playerMarket, reason: t('Bu sınırlı rozet sunucu sıralaması doğrulanınca verilir.') };
  if (!isUnlocked(product, economy.store.level, economy.store.reputation, economy.store.hasBalanceMg)) return { applied: false, economy, playerMarket, reason: t('Ürün henüz açılmadı.') };
  if (economy.store.cash < marketPurchaseCashRequirement(product, playerMarket, economy.store)) {
    return { applied: false, economy, playerMarket, reason: t('Satın alma sonrası gün sonu gideri için yeterli nakit kalmıyor.') };
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
