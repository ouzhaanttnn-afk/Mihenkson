/**
 * MIHENKAYNAK — Settlement ve muhasebe
 * Kaynak: GDD 22 "Settlement, Muhasebe ve İşlem Kaydı", 34.4–34.6, EK F.
 *
 * GDD 22: "Ekonomi motorunun güvenilirliği oyunun tasarım kalitesidir. Her
 * ekonomik olay tek ve izlenebilir biçimde uygulanmalıdır."
 *
 * DEĞİŞMEZLER:
 *  22.1 / 34.4  Kabul edilen işlem yalnız BİR KEZ kasa/stok/güven/XP'ye yazılır.
 *  22.1         Çift tap ikinci işlem oluşturmaz.
 *  22.1         Reload sonrası terminal işlem yeniden settlement edilmez.
 *  22.1         Maliyet tabanı aynı stok birleştiğinde ağırlıklı maliyetle güncellenir.
 *  12.3         Çoklu üründe settlement ve cost basis KALEM BAZINDADIR.
 *  34.5         Gerçekleşmiş kâr ile stok potansiyeli ayrı kavramlardır.
 *
 * Uygulama: Ledger, uygulanmış txId kümesini tutar. applyTransaction() aynı
 * txId ile ikinci kez çağrılırsa hiçbir şey yapmaz ve `applied: false` döner.
 * Bu, çift tap ve reload senaryolarının ikisini birden kapatır.
 */

import { t } from '@i18n/index';
import { LIQUIDITY_BANDS, XP } from './balance';
import { hasPoolSupplySpace, poolSupplyQuote, validPoolSupplyItem, validPoolSupplyQuantity } from './pool-supply';
import { isBullion } from '@data/bullion';
import { consolidatePools, poolForItem, validQuantity, poolUnitGrams } from './stock-pools';
import { toMg, fromMg, roundMoney, personnelDaily, isHasTradingDay, dailyOperatingCost, scaleMaintenanceCost, dueScaleMaintenanceDebt } from './v5-rules';
import type {
  DealRecord,
  GameDay,
  InventoryPosition,
  ItemInstance,
  Money,
  SettlementTransaction,
  StockOut,
  StoreState,
} from './types';

/** Muhasebe defteri. Uygulanmış işlemlerin tek kaydı. */
export interface Ledger {
  /** Uygulanmış transaction ID'leri — idempotency anahtarı. */
  appliedTxIds: string[];
  transactions: SettlementTransaction[];
  deals: DealRecord[];
  /** GDD 14.3 — yalnız tamamlanmış satışlardan gelen kâr. */
  realizedProfitToday: Money;
  realizedProfitTotal: Money;
}

export function createLedger(): Ledger {
  return {
    appliedTxIds: [],
    transactions: [],
    deals: [],
    realizedProfitToday: 0,
    realizedProfitTotal: 0,
  };
}

export interface EconomyState {
  market?: import('./types').MarketState;
  store: StoreState;
  inventory: InventoryPosition[];
  items: Record<string, ItemInstance>;
  ledger: Ledger;
}

export interface SettlementOutcome {
  /** false ise işlem zaten uygulanmıştı; hiçbir durum değişmedi. */
  applied: boolean;
  state: EconomyState;
  reason?: string;
}

/**
 * Tek settlement kuralının uygulama noktası (GDD 22.1).
 *
 * Bu fonksiyon ekonomik durumu değiştiren TEK yoldur. Kasa, stok, güven ve XP
 * başka hiçbir yerden yazılmaz; böylece "duplicate para/stok oluşmaz" (34.4)
 * garantisi tek bir yerde denetlenebilir kalır.
 */
export function applyTransaction(
  state: EconomyState,
  tx: SettlementTransaction,
): SettlementOutcome {
  // --- İdempotency kapısı ---
  if (state.ledger.appliedTxIds.includes(tx.txId)) {
    return {
      applied: false,
      state,
      reason: `Transaction ${tx.txId} zaten uygulanmış — yok sayıldı.`,
    };
  }

  // --- Nakit ---
  const cash = state.store.cash + tx.cashDelta;
  if (!Number.isFinite(cash) || cash < 0) {
    return { applied: false, state, reason: t('Yetersiz nakit; işlem uygulanmadı.') };
  }

  if (tx.poolPurchase) {
    const item = tx.itemsIn[0];
    const quantity = tx.poolPurchase.quantity;
    const quote = item && state.market && poolSupplyQuote(item.templateId, quantity, state.market, state.store);
    if (!item || !quote || tx.itemsIn.length !== 1 || tx.itemsOut.length || tx.hasOperation ||
        !validPoolSupplyQuantity(item.templateId, quantity) || !validPoolSupplyItem(item) || !poolForItem(item) ||
        item.location !== 'backStock' || state.items[item.id] || tx.day !== state.market?.day ||
        !hasPoolSupplySpace(item.templateId, state.inventory, state.store) ||
        tx.cashDelta !== -quote.totalPrice || !Number.isFinite(item.buyCost) ||
        Math.abs((item.buyCost ?? 0) * quantity - quote.totalPrice) > 1e-6)
      return { applied: false, state, reason: t('Geçersiz sarrafiye miktarı, tutarı veya stok kapasitesi.') };
  }

  const requested = new Map<string, number>();
  for (const out of tx.itemsOut) {
    const position = state.inventory.find(p => p.itemId === out.itemId);
    if (!position || !validQuantity(position, out.quantity)) return { applied: false, state, reason: t('Geçersiz stok miktarı.') };
    requested.set(out.itemId, (requested.get(out.itemId) ?? 0) + out.quantity);
    if (!validQuantity(position, requested.get(out.itemId)!)) return { applied: false, state, reason: t('Stok yetersiz.') };
  }
  if (tx.targetInventoryItemId) {
    const target = state.inventory.find(p => p.itemId === tx.targetInventoryItemId);
    if (!target || target.location !== 'display' || tx.itemsOut.length !== 1 ||
      tx.itemsOut[0]?.itemId !== target.itemId || tx.itemsOut[0].quantity !== 1)
      return { applied: false, state, reason: t('Vitrin ürünü artık satışta değil.') };
  }
  const hasDelta = tx.hasDeltaMg ?? 0;
  const hasBalanceMg = (state.store.hasBalanceMg ?? 0) + hasDelta;
  if (!Number.isSafeInteger(hasDelta) || !Number.isSafeInteger(hasBalanceMg) || hasBalanceMg < 0 ||
      !Number.isFinite(tx.hasCostDelta ?? 0) ||
      (hasDelta !== 0 && !tx.hasOperation) ||
      (tx.hasOperation && tx.hasOperation !== 'melt' && !isHasTradingDay(tx.day)) ||
      (tx.hasOperation === 'buy' && (hasDelta <= 0 || tx.cashDelta >= 0 || tx.itemsIn.length > 0 || tx.itemsOut.length > 0)) ||
      (tx.hasOperation === 'sell' && (hasDelta >= 0 || tx.cashDelta <= 0 || tx.itemsIn.length > 0 || tx.itemsOut.length > 0)) ||
      (tx.hasOperation === 'melt' && (hasDelta <= 0 || tx.cashDelta > 0 || tx.itemsOut.length !== 1 || tx.itemsIn.length > 0)))
    return { applied: false, state, reason: t('Geçersiz HAS işlemi veya işlem günü.') };

  // --- Stok girişleri: cost basis kalem bazında yazılır (GDD 12.3) ---
  const items = { ...state.items };
  let inventory = [...state.inventory];

  for (const incoming of tx.itemsIn) {
    items[incoming.id] = incoming;
    inventory = upsertPosition(
      inventory,
      {
        itemId: incoming.id,
        quantity: tx.poolPurchase?.quantity ?? 1,
        costBasis: (incoming.buyCost ?? 0) * (tx.poolPurchase?.quantity ?? 1),
        currentValue: (incoming.buyCost ?? 0) * (tx.poolPurchase?.quantity ?? 1),
        age: 0,
        demand: 'steady',
        thesis: incoming.thesis,
        location: incoming.location === 'display' ? 'display' : 'backStock',
        expectedExitValues: {},
      },
      items,
    );
  }

  // --- Stok çıkışları: adet bazlı (Addendum §4.1 kısmi karşılama) ---
  for (const out of tx.itemsOut) {
    inventory = removeUnits(inventory, out);
    // Kalem yalnız pozisyonun tamamı tükendiğinde 'sold' olur; kısmi satışta
    // stokta hâlâ aynı üründen var demektir.
    const stillHeld = inventory.some((p) => p.itemId === out.itemId);
    const item = items[out.itemId];
    if (item && !stillHeld) items[out.itemId] = { ...item, location: 'sold' };
  }

  // --- İlişki ve ilerleme ---
  const reputation = clamp(state.store.reputation + tx.reputationDelta, 0, 100);
  const { level, xp, xpToNext } = applyXp(state.store, tx.xpDelta);

  const pooled = consolidatePools(inventory, items);
  const store: StoreState = { ...state.store, cash, reputation, level, xp, xpToNext,
    hasBalanceMg, hasCostBasis: Math.max(0, (state.store.hasCostBasis ?? 0) + (tx.hasCostDelta ?? 0)) };

  const ledger: Ledger = {
    ...state.ledger,
    appliedTxIds: [...state.ledger.appliedTxIds, tx.txId],
    transactions: [...state.ledger.transactions, tx],
  };

  return { applied: true, state: { ...state, store, inventory: pooled.inventory, items: pooled.items, ledger } };
}

/**
 * Satıştan gerçekleşmiş kârı yazar.
 *
 * GDD 34.5 — "Gerçekleşmiş kâr ile stok potansiyeli ayrı kavramlardır."
 * Bu fonksiyon YALNIZ tamamlanmış satış/likidasyonda çağrılır. Stoktaki bir
 * ürünün değer artışı buraya asla yazılmaz.
 *
 * GDD 31.3 — "Item cost basis satışta yalnız satılan miktar kadar realize olur."
 */
export function realizeProfit(ledger: Ledger, revenue: Money, costBasis: Money): Ledger {
  const profit = revenue - costBasis;
  return {
    ...ledger,
    realizedProfitToday: ledger.realizedProfitToday + profit,
    realizedProfitTotal: ledger.realizedProfitTotal + profit,
  };
}

export function recordDeal(ledger: Ledger, deal: DealRecord): Ledger {
  // Aynı dealId iki kez kaydedilmez (GDD 31.3 invariant).
  if (ledger.deals.some((d) => d.dealId === deal.dealId)) return ledger;
  return { ...ledger, deals: [...ledger.deals, deal] };
}

/**
 * GDD 22.1 — "Maliyet tabanı aynı stok birleştiğinde ağırlıklı/gerçek maliyetle
 * güncellenir." Ayrılabilir kalemler (takı) ayrı pozisyon kalır; yalnız
 * birbirinin aynısı olan yığın ürünler (gram altın) birleşir.
 */
function upsertPosition(
  inventory: InventoryPosition[],
  incoming: InventoryPosition,
  items: Record<string, ItemInstance>,
): InventoryPosition[] {
  const incomingItem = items[incoming.itemId];
  if (incomingItem && poolForItem(incomingItem)) return [...inventory, incoming];
  const key = incomingItem ? stackKey(incomingItem, incoming.location) : null;
  if (!key) return [...inventory, incoming];

  const index = inventory.findIndex((p) => {
    const item = items[p.itemId];
    return !!item && stackKey(item, p.location) === key;
  });
  if (index < 0) return [...inventory, incoming];

  const existing = inventory[index]!;
  const merged: InventoryPosition = {
    ...existing,
    quantity: existing.quantity + incoming.quantity,
    // Toplamlar toplanır; birim maliyet böylece kendiliğinden AĞIRLIKLI
    // ortalamadır (GDD 22.1). Ayrı bir formül yazmak, aynı gerçeği iki yerde
    // tutup birinin ötekinden sapmasına izin vermek olurdu.
    costBasis: existing.costBasis + incoming.costBasis,
    currentValue: existing.currentValue + incoming.currentValue,
    // Yığın yaşı en yeni girişe göre değil, en eskiye göre sayılır: stok
    // yaşlanma maliyeti gizlenmemeli (GDD 8.3).
    age: Math.max(existing.age, incoming.age),
  };
  return inventory.map((p, i) => (i === index ? merged : p));
}

/**
 * Yığılabilirlik anahtarı. Yalnız STANDART ürün yığılır: aynı şablon, aynı
 * gerçek ayar, aynı kondisyon, aynı konum ve gizli kusursuz.
 *
 * İşçilikli ürün asla yığılmaz — iki 22 ayar bilezik birbirinin aynısı
 * değildir ve maliyetlerini ortalamak, hangi bileziği kâra sattığınızı
 * ölçülemez hale getirirdi (GDD 12.3 "cost basis KALEM BAZINDADIR").
 */
export function stackKey(item: ItemInstance, location: InventoryPosition['location']): string | null {
  if (!isBullion(item.templateId)) return null;
  if (item.truth.hiddenFlaws.length > 0) return null;
  return [
    item.templateId,
    item.truth.actualKarat,
    item.truth.condition,
    location,
  ].join('|');
}

/**
 * Bir pozisyondan adet düşer. Toplam maliyet ve değer BİRİM oranında iner —
 * GDD 31.3: "Item cost basis satışta yalnız SATILAN MİKTAR kadar realize olur."
 *
 * Miktar biterse pozisyon düşer. Geçersiz/aşırı çıkış değiştirilmeden reddedilir.
 */
export function removeUnits(inventory: InventoryPosition[], out: StockOut): InventoryPosition[] {
  const index = inventory.findIndex((p) => p.itemId === out.itemId);
  if (index < 0) return inventory;

  const position = inventory[index]!;
  if (!validQuantity(position, out.quantity)) return inventory;
  const taken = out.quantity;
  if (taken <= 0) return inventory;
  if (taken >= position.quantity) return inventory.filter((_, i) => i !== index);

  const quantityMg = position.quantityMg === undefined ? undefined : position.quantityMg - toMg(taken * poolUnitGrams(position.poolId));
  const remaining = quantityMg === undefined ? position.quantity - taken : fromMg(quantityMg) / poolUnitGrams(position.poolId);
  const share = remaining / position.quantity;
  return inventory.map((p, i) =>
    i === index
      ? {
          ...p,
          quantity: remaining,
          quantityMg,
          averageCostPerUnit: p.averageCostPerUnit ?? p.costBasis / p.quantity,
          costBasis: (p.averageCostPerUnit ?? p.costBasis / p.quantity) * remaining,
          currentValue: p.currentValue * share,
        }
      : p,
  );
}

/** Satılan adedin realize olan maliyet tabanı (GDD 31.3). */
export function costBasisForUnits(position: InventoryPosition, quantity: number): Money {
  if (position.quantity <= 0) return 0;
  const taken = Math.min(position.quantity, Math.max(0, quantity));
  return (position.averageCostPerUnit ?? position.costBasis / position.quantity) * taken;
}

/** Bir pozisyonun birim maliyeti. */
export function unitCostBasis(position: InventoryPosition): Money {
  return position.quantity > 0 ? position.averageCostPerUnit ?? position.costBasis / position.quantity : 0;
}

/** Ağırlıklı ortalama maliyet — dış çağrılar ve testler için. */
export function weightedCostBasis(
  existing: { qty: number; costBasis: Money },
  incoming: { qty: number; costBasis: Money },
): Money {
  const totalQty = existing.qty + incoming.qty;
  if (totalQty <= 0) return 0;
  return (existing.costBasis * existing.qty + incoming.costBasis * incoming.qty) / totalQty;
}

// ---------------------------------------------------------------------------
// §4.1 — KANAL VE HACİM TELEMETRİSİ
// ---------------------------------------------------------------------------

/**
 * Addendum §4.1: "Toplu işlemler tekil müşteri metriğini ŞİŞİRMEMELİ; adet,
 * gram karşılığı, ciro, brüt marj ve kanal bazında AYRICA ölçülmelidir."
 *
 * Addendum §6.1: "Telemetri, gerçekleşen ortalama ve dağılımı KANAL BAZINDA
 * raporlamalıdır."
 */
export interface ChannelMetrics {
  deals: number;
  units: number;
  grams: number;
  revenue: Money;
  costBasis: Money;
  /** Brüt marj oranı — ciro üzerinden. */
  grossMargin: number;
}

function emptyMetrics(): ChannelMetrics {
  return { deals: 0, units: 0, grams: 0, revenue: 0, costBasis: 0, grossMargin: 0 };
}

function accumulate(m: ChannelMetrics, deal: DealRecord): ChannelMetrics {
  const revenue = m.revenue + deal.price;
  const costBasis = m.costBasis + deal.costBasis;
  return {
    deals: m.deals + 1,
    units: m.units + (deal.units || 1),
    grams: Math.round((m.grams + deal.grams) * 1000) / 1000,
    revenue,
    costBasis,
    grossMargin: revenue > 0 ? (revenue - costBasis) / revenue : 0,
  };
}

/**
 * Satış işlemlerini kanal bazında toplar. Yalnız GERÇEKLEŞMİŞ satışlar
 * sayılır — reddedilen pazarlık ciro üretmez.
 */
export function channelMetrics(ledger: Ledger): Record<string, ChannelMetrics> {
  const out: Record<string, ChannelMetrics> = {};
  for (const deal of ledger.deals) {
    if (deal.side !== 'sell' || deal.price <= 0) continue;
    const key = deal.channel ?? 'unknown';
    out[key] = accumulate(out[key] ?? emptyMetrics(), deal);
  }
  return out;
}

/**
 * §4.1 "toplu işlemler tekil müşteri metriğini şişirmemeli" — bu yüzden iki
 * havuz AYRI tutulur ve hiçbir ortalama ikisini karıştırmaz.
 */
export function volumeSplitMetrics(ledger: Ledger): { single: ChannelMetrics; bulk: ChannelMetrics } {
  let single = emptyMetrics();
  let bulk = emptyMetrics();
  for (const deal of ledger.deals) {
    if (deal.side !== 'sell' || deal.price <= 0) continue;
    if (deal.isBulk) bulk = accumulate(bulk, deal);
    else single = accumulate(single, deal);
  }
  return { single, bulk };
}

// ---------------------------------------------------------------------------
// Likidite ve servet (GDD 14.2, 14.3)
// ---------------------------------------------------------------------------

/** GDD 14.2 — Likidite Oranı = Nakit / (Nakit + Stok Maliyet Tabanı). */
export function liquidityRatio(cash: Money, inventory: InventoryPosition[]): number {
  const stockCost = inventory.reduce((s, p) => s + p.costBasis, 0);
  const denom = cash + stockCost;
  return denom <= 0 ? 1 : cash / denom;
}

export type LiquidityBand = 'red' | 'caution' | 'healthy' | 'veryLiquid';

export function liquidityBand(ratio: number): LiquidityBand {
  if (ratio < LIQUIDITY_BANDS.red) return 'red';
  if (ratio < LIQUIDITY_BANDS.caution) return 'caution';
  if (ratio <= LIQUIDITY_BANDS.healthy) return 'healthy';
  return 'veryLiquid';
}

export const LIQUIDITY_BAND_LABEL: Record<LiquidityBand, string> = {
  red: 'Kırmızı risk',
  caution: 'Dikkat',
  healthy: 'Sağlıklı',
  veryLiquid: 'Çok likit',
};

/**
 * GDD 14.3 — Servet ve kâr ayrımı.
 * Stok potansiyeli net servete girer ama gerçekleşmiş kâra ASLA eklenmez.
 */
export interface WealthSummary {
  hasEstimatedValue: Money;
  cash: Money;
  stockCost: Money;
  stockEstimatedValue: Money;
  /** Henüz satılmamış varlıkların olası kâr/zararı — realize DEĞİLDİR. */
  stockPotential: Money;
  liabilities: Money;
  netWorth: Money;
  realizedProfitToday: Money;
}

export interface LiquidationEstimate {
  value: Money;
  channel: 'Toptancı' | 'Eritme / HAS' | 'Servis + satış' | 'Vitrin' | 'Koleksiyon';
  time: string;
}

/**
 * Stok ekranının muhasebe markı: teorik en yüksek getiri değil, bugün
 * erişilebilen en hızlı net çıkış. `expectedExitValues` birim değerdir;
 * pozisyon adedi burada açıkça çarpılır.
 */
export function liquidationEstimate(position: InventoryPosition): LiquidationEstimate {
  const candidates = [
    /*
      KANAL ADI BİR BİRLİK TÜRÜDÜR, ekran metni değil: `LiquidationEstimate`
      onu sabit dizelerle sınırlıyor ve kod bu değere göre dallanıyor.
      Çevirisi çizim anında `t(channel)` ile yapılır. Süre etiketi ise
      yalnız ekrana çıkar, o burada çevrilir.
    */
    { id: 'wholesale', channel: 'Toptancı', time: t('1–2 gün') },
    { id: 'melt', channel: 'Eritme / HAS', time: t('1–2 gün') },
    { id: 'serviceResale', channel: 'Servis + satış', time: t('2–5 gün') },
    { id: 'retail', channel: 'Vitrin', time: t('3–7 gün') },
    { id: 'collection', channel: 'Koleksiyon', time: t('7+ gün') },
  ] as const;

  for (const candidate of candidates) {
    const perUnit = position.expectedExitValues[candidate.id];
    if (perUnit !== undefined && perUnit > 0) {
      return {
        value: roundMoney(perUnit * position.quantity),
        channel: candidate.channel,
        time: candidate.time,
      };
    }
  }

  // Eski kayıtların expectedExitValues alanı boş olabilir. Bu durumda mevcut
  // markı hızlı çıkış iskontosuyla kullanmak, teorik değeri aynen taşımaktan
  // daha güvenli ve geriye uyumludur.
  return {
    value: roundMoney(position.currentValue * 0.88),
    /*
      KANAL ADI BİR BİRLİK TÜRÜDÜR, ekran metni değil: tipi sabit dizelerle
      sınırlı ve karşılaştırmalarda kullanılıyor. Çeviri, çizim anında
      `t(channel)` ile yapılır.
    */
    channel: 'Toptancı',
    time: t('1–2 gün'),
  };
}

export function summarizeWealth(state: EconomyState): WealthSummary {
  const hasEstimatedValue = state.market ? fromMg(state.store.hasBalanceMg ?? 0) * state.market.goldSpot : state.store.hasCostBasis ?? 0;
  const stockCost = state.inventory.reduce((s, p) => s + p.costBasis, 0);
  const stockEstimatedValue = state.inventory.reduce(
    (sum, position) => sum + liquidationEstimate(position).value,
    0,
  );
  const liabilities =
    state.store.payables.reduce((s, p) => s + p.amount, 0) +
    state.store.supplier.openInvoices.reduce((s, i) => s + i.amount, 0);

  return {
    hasEstimatedValue,
    cash: state.store.cash,
    stockCost,
    stockEstimatedValue,
    stockPotential: stockEstimatedValue - stockCost,
    liabilities,
    netWorth: state.store.cash + stockEstimatedValue + hasEstimatedValue - liabilities,
    realizedProfitToday: state.ledger.realizedProfitToday,
  };
}

// ---------------------------------------------------------------------------
// XP ve seviye (GDD 18.1)
// ---------------------------------------------------------------------------

function applyXp(store: StoreState, delta: number): { level: number; xp: number; xpToNext: number } {
  let level = store.level;
  let xp = store.xp + Math.max(0, delta);
  let xpToNext = store.xpToNext;

  while (xp >= xpToNext) {
    xp -= xpToNext;
    level += 1;
    xpToNext = XP.levelCurve(level);
  }

  return { level, xp, xpToNext };
}

/** Bir işlemin XP karşılığı (GDD 18.1). */
export function xpForDeal(input: {
  testsUsed: number;
  confidence: 'low' | 'medium' | 'high';
  margin: number;
}): number {
  let xp = XP.dealClosed + input.testsUsed * XP.perTestUsed;
  if (input.confidence === 'high') xp += XP.highConfidenceBonus;
  if (input.margin > 0.08) xp += XP.goodMarginBonus;
  // Zararına kapanan işlem XP vermez ama cezalandırmaz (GDD 21.1 "sert game over yok").
  return Math.max(XP.lossFloor, xp);
}

// ---------------------------------------------------------------------------
// Gün kapanışı (GDD 22.4) — idempotent olmalıdır (GDD 22.1 / EK F)
// ---------------------------------------------------------------------------

export interface DayCloseResult {
  applied: boolean;
  state: EconomyState;
  report: DayReport;
}

export interface DayReport {
  closingCash?: Money;
  overnightSummary?: string;
  personnelExpense?: Money;
  lifestyleExpense?: Money;
  scaleMaintenanceExpense?: Money;
  scaleMaintenanceDeferred?: Money;
  scaleMaintenanceDebtPaid?: Money;
  missedGuestCountToday?: number;
  day: GameDay;
  realizedTradeProfit: Money;
  overhead: Money;
  netCashChange: Money;
  /**
   * Bugün kasadan çıkıp MAL OLARAK içeri giren para (C6).
   *
   * `netCashChange` tek başına 1. günde felaket gibi okunuyordu: −77.336 ₺'nin
   * 76.136 ₺'si aslında stoğa dönmüş parayken rapor bunu hiçbir yerde
   * söylemiyordu. Ayrı bir defter tutmuyoruz — sayı günün kendi
   * hareketlerinden türüyor: içeri mal giren ve kasayı eksilten işlemler.
   *
   * Takas (hem `itemsIn` hem `itemsOut`) tek bir net tutar taşır; o tutarın
   * tamamı buraya yazılır, çünkü kasadan çıkan net para karşılığında içeri mal
   * girmiştir.
   */
  stockPurchaseSpend?: Money;
  stockPotential: Money;
  liquidity: number;
  liquidityBand: LiquidityBand;
  upcomingLiabilities: { label: string; amount: Money; dueDay: GameDay }[];
}

/**
 * Gün kapanışı. GDD 22.1: "Gün sonu servis/vade/gelir işlemleri idempotent
 * olmalıdır." Aynı gün için ikinci kez çağrılırsa kasa tekrar eksilmez.
 */
export function closeDay(
  state: EconomyState,
  day: GameDay,
  missedGuestCountToday = 0,
  lifestyleExpense: Money = 0,
): DayCloseResult {
  const txId = `dayclose_${day}`;
  const personnelExpense = personnelDaily(state.store);
  const regularExpense = roundMoney(dailyOperatingCost(state.store) + Math.max(0, lifestyleExpense));
  const maintenanceDue = scaleMaintenanceCost(state.store, day);
  const maintenanceDebtDue = dueScaleMaintenanceDebt(state.store, day);
  // Aylık bakım oyunu kilitlemez: düzenli gider karşılanabiliyorsa bakımın
  // yetmeyen kısmı üç gün vadeli borca dönüşür.
  let maintenanceBudget = Math.max(0, state.store.cash - regularExpense);
  const maintenanceDebtPaid = maintenanceBudget >= maintenanceDebtDue ? maintenanceDebtDue : 0;
  maintenanceBudget -= maintenanceDebtPaid;
  const maintenancePaid = maintenanceBudget >= maintenanceDue ? maintenanceDue : 0;
  const maintenanceDeferred = maintenanceDue - maintenancePaid;
  const overhead = roundMoney(regularExpense + maintenanceDebtPaid + maintenancePaid);

  const tx: SettlementTransaction = {
    txId,
    dealId: txId,
    day,
    cashDelta: -overhead,
    itemsIn: [],
    itemsOut: [],
    trustDelta: 0,
    reputationDelta: 0,
    xpDelta: 0,
    label: t('Gün {gun} kira + sabit gider + personel + şahsi bakım + terazi bakımı', {
      gun: day,
    }),
  };

  const outcome = applyTransaction(state, tx);
  const paidDebtIds = maintenanceDebtPaid > 0
    ? outcome.state.store.payables
        .filter(p => p.id.startsWith('scale_maintenance_') && p.dueDay <= day)
        .map(p => p.id)
    : [];
  const nextState = outcome.applied && (maintenanceDeferred > 0 || paidDebtIds.length > 0)
    ? {
        ...outcome.state,
        store: {
          ...outcome.state.store,
          payables: [
            ...outcome.state.store.payables.filter(p => !paidDebtIds.includes(p.id)),
            ...(maintenanceDeferred > 0 && !outcome.state.store.payables.some(p => p.id === `scale_maintenance_${day}`) ? [{
                id: `scale_maintenance_${day}`,
                amount: maintenanceDeferred,
                dueDay: day + 3,
                label: t('Terazi bakım borcu'),
              }] : []),
          ],
        },
      }
    : outcome.state;
  const wealth = summarizeWealth(nextState);
  const ratio = liquidityRatio(nextState.store.cash, nextState.inventory);
  const todayTransactions = nextState.ledger.transactions.filter(tx => tx.day === day);

  return {
    applied: outcome.applied,
    state: nextState,
    report: {
      personnelExpense,
      lifestyleExpense: Math.max(0, lifestyleExpense),
      scaleMaintenanceExpense: maintenanceDue,
      scaleMaintenanceDeferred: maintenanceDeferred,
      scaleMaintenanceDebtPaid: maintenanceDebtPaid,
      missedGuestCountToday,
      day,
      realizedTradeProfit: nextState.ledger.realizedProfitToday,
      overhead,
      netCashChange: roundMoney(todayTransactions.reduce((sum, tx) => sum + tx.cashDelta, 0)),
      stockPurchaseSpend: roundMoney(
        todayTransactions
          .filter(tx => tx.itemsIn.length > 0 && tx.cashDelta < 0)
          // İşareti toplama sırasında çeviriyoruz: dışarıdan `-0` dönmesin.
          .reduce((sum, tx) => sum - tx.cashDelta, 0),
      ),
      closingCash: nextState.store.cash,
      stockPotential: wealth.stockPotential,
      liquidity: ratio,
      liquidityBand: liquidityBand(ratio),
      upcomingLiabilities: [
        ...nextState.store.payables.map((p) => ({ label: p.label, amount: p.amount, dueDay: p.dueDay })),
        ...nextState.store.supplier.openInvoices.map((i) => ({
          label: t('Toptancı vadesi'),
          amount: i.amount,
          dueDay: i.dueDay,
        })),
      ].sort((a, b) => a.dueDay - b.dueDay),
    },
  };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
