/**
 * MIHENKAYNAK — Toptancı kanalı
 * Kaynak: Ekonomi Ara Düzeltmesi v1.0 · §4.2 "Toptancıya toplu bozma",
 *         §7 "Toptancı finansmanı", §11 edge case'ler; GDD 22.1, 34.4.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * İKİ AYRI YÖN, TEK KANAL
 *
 * §4.2 — BOZMA (oyuncu satar): "Toptancı; yüksek hacimli, hızlı ve güvenilir
 *   likidite kanalıdır. Normal müşteriye kıyasla GENELLİKLE daha iyi veya
 *   daha istikrarlı alış fiyatı sunar; ancak bu üstünlük piyasa koşulu,
 *   hacim, ürün ve ilişkiye bağlıdır, HER İŞLEMDE MUTLAK GARANTİ DEĞİLDİR."
 *
 * §7 — FİNANSMAN (oyuncu alır): "Nakdi yetersiz olduğunda toptancıdan mal
 *   alımı yalnızca 'eksi bakiye' olarak çalışmaz. Finansman erişimi üç temel
 *   unsurla sınırlandırılır: TEDARİK GÜVENİ, KULLANILABİLİR LİMİT ve VADE."
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * KAPSAM SINIRI (Addendum §10): Fiyat bu dosyada YENİDEN HESAPLANMAZ.
 * Bozma ve alım fiyatının ikisi de channels.ts'in `priceForChannel`
 * çıktısıdır; buradaki iş kapasite dilimleme, limit, vade ve borç
 * muhasebesidir.
 *
 * DEĞİŞMEZ (§7): "Finansman, SINIRSIZ STOK ve RİSKSİZ ARBİTRAJ üretmemeli;
 * fiyat hareketi, vade ve geri ödeme baskısını korumalıdır."
 * DEĞİŞMEZ (§7): "Finansmanın maliyeti ve koşulları işlem öncesi anlaşılır
 * biçimde hesaplanır; GİZLİ veya GERİYE DÖNÜK ücret yaratılmaz."
 */

import { t } from '@i18n/index';
import { tl } from '@i18n/money';
import { WHOLESALE } from './balance';
import { roundMoney } from './v5-rules';
import { bullionMeta, isBullion } from '@data/bullion';
import {
  bullionUnitValue,
  channelCapacity,
  gramsFor,
  priceForChannel,
} from './channels';
import { unitCostBasis } from './settlement';
import { trueValue } from './valuation';
import type {
  GameDay,
  InventoryPosition,
  ItemInstance,
  MarketState,
  Money,
  StoreState,
  SupplierAccount,
} from './types';

// ---------------------------------------------------------------------------
// §4.2 — TOPLU BOZMA
// ---------------------------------------------------------------------------

/** Bozulacak bir stok satırı. */
export interface LiquidationLine {
  itemId: string;
  quantity: number;
}

/** Bir dilimin fiyat teklifi. */
export interface LiquidationSlice {
  quantity: number;
  unitPrice: Money;
  total: Money;
  /** Bu dilimin kapasiteyi aşıp aşmadığı (§11 likidite sınırı). */
  overCapacity: boolean;
}

export interface LiquidationQuote {
  itemId: string;
  quantity: number;
  /** §4.2 "tek işlem veya KONTROLLÜ DİLİMLER halinde". */
  slices: LiquidationSlice[];
  /** Tüm dilimlerin toplamı. */
  gross: Money;
  /** Bozulan malın defter maliyeti — realize kâr için (GDD 31.3). */
  costBasis: Money;
  grams: number;
  /** Toptancı kanalının bu ürün için tek seferlik kapasitesi. */
  capacityPerSlice: number;
  /**
   * §4.2 "bu üstünlük ... her işlemde mutlak garanti değildir."
   * Tezgâhta aynı hacmi satmaya kıyasla fark. Negatifse toptancı bu işlemde
   * DAHA KÖTÜ; oyuncu bunu işlem öncesi görür.
   */
  edgeVsCounter: Money;
  rationale: string;
}

/**
 * §4.2 — bozma teklifi.
 *
 * Dilimleme gerçek bir maliyet taşır: her dilim kendi hacmiyle fiyatlanır,
 * yani kapasiteyi aşan tek işlem yerine dilimlere bölmek daha iyi birim fiyat
 * verir. Bu, "kontrollü dilimler" cümlesinin oyunda bir KARAR olmasını
 * sağlar — yoksa dilim seçeneği süs olurdu.
 */
export function quoteLiquidation(
  line: LiquidationLine,
  items: Record<string, ItemInstance>,
  inventory: InventoryPosition[],
  market: MarketState,
  store: StoreState,
  sliceCount = 1,
): LiquidationQuote | null {
  const item = items[line.itemId];
  const position = inventory.find((p) => p.itemId === line.itemId);
  if (!item || !position) return null;

  const gramPool = position.poolId === '24K_GRAM_GOLD_POOL';
  if (!Number.isFinite(line.quantity) || line.quantity <= 0) return null;
  const quantity = Math.min(position.quantity, gramPool ? Math.round(line.quantity * 1000) / 1000 : Math.floor(line.quantity));
  if (quantity <= 0) return null;
  const meta = bullionMeta(item.templateId);
  const capacityPerSlice = channelCapacity('wholesaler', meta, market);
  const baseUnitValue = isBullion(item.templateId)
    ? bullionUnitValue(item, market)
    : trueValue(item, market);

  const amounts = gramPool ? splitQuantity(Math.round(quantity * 1000), Math.max(1, Math.round(sliceCount))).map(mg => mg / 1000) : splitQuantity(quantity, Math.max(1, Math.round(sliceCount)));
  const slices = amounts.map((q) => {
    const quote = priceForChannel({
      item,
      market,
      channel: 'wholesaler',
      side: 'shopSells',
      quantity: q,
      baseUnitValue,
      relationship: store.supplier.trust,
    });
    return {
      quantity: q,
      unitPrice: quote.unitPrice,
      total: quote.unitPrice * q,
      overCapacity: q > capacityPerSlice,
    };
  });

  const gross = roundMoney(slices.reduce((sum, s) => sum + s.total, 0));

  // §4.2 karşılaştırması ÖLÇÜLÜR, varsayılmaz: aynı hacmi tezgâha yığsaydık
  // ne alırdık? Fark negatif çıkabilir ve çıktığında gizlenmez.
  const counter = priceForChannel({
    item,
    market,
    channel: 'retailCustomer',
    side: 'shopSells',
    quantity,
    baseUnitValue,
    relationship: 50,
  });
  const edgeVsCounter = gross - counter.unitPrice * quantity;

  return {
    itemId: line.itemId,
    quantity,
    slices,
    gross,
    costBasis: unitCostBasis(position) * quantity,
    grams: gramsFor(item, quantity),
    capacityPerSlice,
    edgeVsCounter,
    rationale: liquidationRationale(slices, capacityPerSlice, edgeVsCounter),
  };
}

/**
 * Adedi dilimlere böler. Artık ilk dilimlere dağıtılır ki dilimler birbirine
 * yakın kalsın; tek büyük + birkaç minik dilim, dilimlemenin amacını
 * (derinlik tüketmemek) boşa çıkarırdı.
 */
export function splitQuantity(quantity: number, sliceCount: number): number[] {
  const n = Math.max(1, Math.min(sliceCount, quantity));
  const base = Math.floor(quantity / n);
  const remainder = quantity % n;
  return Array.from({ length: n }, (_, i) => base + (i < remainder ? 1 : 0));
}

/** §11 — kapasiteyi aşmayan en az dilim sayısı. Oyuncuya öneri olarak sunulur. */
export function recommendedSlices(quantity: number, capacity: number): number {
  return Math.max(1, Math.ceil(quantity / Math.max(1, capacity)));
}

function liquidationRationale(
  slices: LiquidationSlice[],
  capacity: number,
  edge: Money,
): string {
  if (slices.some((s) => s.overCapacity)) {
    return `Dilim başına kapasite ${capacity} adet; aşan dilim daha kötü fiyat alır.`;
  }
  if (edge < 0) {
    // §4.2 "her işlemde mutlak garanti değildir" — söylenmesi gereken tam bu.
    return t('Bu hacimde tezgâh daha iyi fiyat veriyor; toptancı üstünlüğü bu işlemde yok.');
  }
  return t('Hızlı ve güvenilir likidite; ödeme aynı gün.');
}

// ---------------------------------------------------------------------------
// §7 — TOPTANCI FİNANSMANI
// ---------------------------------------------------------------------------

/** §7 "Finansmanın maliyeti ve koşulları İŞLEM ÖNCESİ anlaşılır biçimde hesaplanır." */
export interface FinanceTerms {
  /** İstenen tutar. */
  amount: Money;
  /** Nakitten karşılanan kısım. */
  fromCash: Money;
  /** Vadeye yazılan kısım. */
  financed: Money;
  /** Vade farkı — peşin fiyata BİNEN maliyet, gizli değil. */
  financeCost: Money;
  /** Vade sonunda ödenecek toplam. */
  totalDue: Money;
  /** Ödeme günü. */
  dueDay: GameDay;
  /** Şu an kullanılabilir limit. */
  availableLimit: Money;
  /** Kullanımda olan limit. */
  usedLimit: Money;
  /** İşlem yapılabilir mi; yapılamıyorsa nedeni. */
  blockedReason: string | null;
}

/** §7 "Limit; oyuncunun AYNI ANDA taşıyabileceği açık toptancı borcunu sınırlar." */
export function usedLimit(supplier: SupplierAccount): Money {
  return supplier.openInvoices.reduce((sum, i) => sum + i.amount, 0);
}

/**
 * §7 "Tedarik güveni; ödeme geçmişi, işlem hacmi, gecikme, ilişki ve ana
 * GDD'deki ilgili itibar sinyallerinden beslenir."
 *
 * Güven limiti ve vadeyi birlikte belirler: güvenilen esnaf hem daha çok
 * hem daha uzun vadeyle alır.
 */
export function creditLimit(store: StoreState): Money {
  const trustFactor =
    WHOLESALE.limitFloorShare +
    (1 - WHOLESALE.limitFloorShare) * (store.supplier.trust / 100);
  const reputationBonus = 1 + ((store.reputation - 50) / 50) * WHOLESALE.reputationLimitWeight;
  return Math.max(0, Math.round(store.supplier.limit * trustFactor * reputationBonus));
}

export function creditTermDays(store: StoreState): number {
  const bonus = Math.floor((store.supplier.trust / 100) * WHOLESALE.termBonusDays);
  return Math.max(1, store.supplier.terms + bonus);
}

/**
 * §7 — vade farkı oranı. Güven arttıkça ucuzlar ama SIFIRLANMAZ:
 * bedava kredi, §7'nin yasakladığı "risksiz arbitraj"ın kapısıdır.
 */
export function financeRate(store: StoreState): number {
  const relief = (store.supplier.trust / 100) * WHOLESALE.rateTrustRelief;
  return Math.max(WHOLESALE.minRate, WHOLESALE.baseRate - relief);
}

/**
 * §7 — bir alım için finansman koşullarını İŞLEM ÖNCESİ hesaplar.
 * Buradan dönen `financeCost` sonradan değişmez; geriye dönük ücret yoktur.
 */
export function financeTerms(store: StoreState, amount: Money, today: GameDay): FinanceTerms {
  const limit = creditLimit(store);
  const used = usedLimit(store.supplier);
  const availableLimit = Math.max(0, limit - used);

  const fromCash = Math.min(store.cash, amount);
  const financed = Math.max(0, amount - fromCash);
  const rate = financeRate(store);
  const financeCost = Math.round(financed * rate);
  const dueDay = today + creditTermDays(store);

  let blockedReason: string | null = null;
  if (amount <= 0) {
    blockedReason = t('Tutar yok.');
  } else if (financed > availableLimit) {
    blockedReason = `Limit yetmiyor: kullanılabilir ${tl(availableLimit)}.`;
  } else if (store.supplier.openInvoices.some((i) => i.dueDay < today)) {
    // §7 "Gecikme; maliyet, limit, güven veya ERİŞİM üzerinde sonuç doğurur."
    blockedReason = t('Gecikmiş vadeniz var; yeni vade açılmıyor.');
  }

  return {
    amount,
    fromCash,
    financed,
    financeCost,
    totalDue: financed + financeCost,
    dueDay,
    availableLimit,
    usedLimit: used,
    blockedReason,
  };
}

/**
 * Anlamlı toptancı alışları ilişkiyi yavaşça büyütür. Küçük tekrarlarla
 * sömürülmez ve peşin ticaret kredi güveninin yerine geçmez.
 */
export function tradeTrustAfterPurchase(
  supplier: SupplierAccount,
  amount: Money,
  creditLimitNow: Money,
): SupplierAccount {
  if (amount < creditLimitNow * WHOLESALE.tradeTrustMinShare) return supplier;
  if (supplier.trust >= WHOLESALE.tradeTrustCap) return supplier;
  return {
    ...supplier,
    trust: Math.min(WHOLESALE.tradeTrustCap, supplier.trust + WHOLESALE.tradeTrustGain),
  };
}

/** Vade kaydı — settlement sonrası hesaba yazılır. */
export function openInvoice(
  supplier: SupplierAccount,
  invoice: { id: string; amount: Money; dueDay: GameDay },
): SupplierAccount {
  if (invoice.amount <= 0) return supplier;
  if (supplier.openInvoices.some((i) => i.id === invoice.id)) return supplier; // idempotent
  return { ...supplier, openInvoices: [...supplier.openInvoices, invoice] };
}

/**
 * §7 "Kullanılan limit, GERİ ÖDEME İLE serbestleşir."
 * Zamanında ödeme güveni büyütür; bu, limitin ve vadenin de büyümesi demektir.
 */
export function repayInvoice(
  supplier: SupplierAccount,
  invoiceId: string,
  today: GameDay,
): { supplier: SupplierAccount; amount: Money; onTime: boolean } {
  const invoice = supplier.openInvoices.find((i) => i.id === invoiceId);
  if (!invoice) return { supplier, amount: 0, onTime: true };

  const onTime = today <= invoice.dueDay;
  const trustDelta = onTime ? WHOLESALE.onTimeTrustGain : -WHOLESALE.lateTrustPenalty;

  return {
    supplier: {
      ...supplier,
      openInvoices: supplier.openInvoices.filter((i) => i.id !== invoiceId),
      trust: clamp(supplier.trust + trustDelta, 0, 100),
      // Zamanında ödeme limiti büyütür; gecikme daraltır. Limit bir ödül
      // değil, ölçülmüş bir risk iştahıdır.
      limit: Math.max(
        WHOLESALE.minLimit,
        Math.round(supplier.limit * (onTime ? WHOLESALE.onTimeLimitGrowth : WHOLESALE.lateLimitCut)),
      ),
    },
    amount: invoice.amount,
    onTime: onTime,
  };
}

/**
 * §7 "Gecikme; maliyet, limit, güven veya erişim üzerinde SONUÇ DOĞURUR."
 *
 * Gün devrinde çalışır. Gecikme faizi geriye dönük DEĞİLDİR: yalnız
 * geciken gün için işler ve oyuncuya gün raporunda görünür.
 */
export function accrueOverdue(
  supplier: SupplierAccount,
  today: GameDay,
): { supplier: SupplierAccount; penalty: Money; overdueIds: string[] } {
  const overdue = supplier.openInvoices.filter((i) => i.dueDay < today);
  if (overdue.length === 0) return { supplier, penalty: 0, overdueIds: [] };

  const penalty = overdue.reduce(
    (sum, i) => sum + Math.round(i.amount * WHOLESALE.overduePerDayRate),
    0,
  );

  return {
    supplier: {
      ...supplier,
      // Gecikme faizi borcun kendisine biner; ayrı bir gizli kalem açılmaz.
      openInvoices: supplier.openInvoices.map((i) =>
        i.dueDay < today
          ? { ...i, amount: i.amount + Math.round(i.amount * WHOLESALE.overduePerDayRate) }
          : i,
      ),
      trust: clamp(supplier.trust - WHOLESALE.overdueDailyTrustPenalty, 0, 100),
    },
    penalty,
    overdueIds: overdue.map((i) => i.id),
  };
}

// ---------------------------------------------------------------------------
// Toptancı stok teklifi (§4.1 "uygun ticari kanal üzerinden tedarik")
// ---------------------------------------------------------------------------

export interface SupplyLot {
  templateId: string;
  displayName: string;
  /** Oyuncunun seçtiği adet. */
  quantity: number;
  /**
   * §11 "Toptancı likidite sınırı" — tek işlemde alınabilecek azami adet.
   * Toptancı sınırsız mal satmaz; sınırsız lot, §7'nin yasakladığı
   * "sınırsız stok"un ta kendisi olurdu.
   */
  maxQuantity: number;
  unitPrice: Money;
  total: Money;
  grams: number;
}

/** §11 — bu üründe tek işlemin adet tavanı. */
export function maxLotQuantity(item: ItemInstance, market: MarketState): number {
  const capacity = channelCapacity('wholesaler', bullionMeta(item.templateId), market);
  return Math.max(1, Math.floor(capacity * WHOLESALE.lotShareOfCapacity));
}

/**
 * Toptancıdan alınacak lotun teklifi.
 *
 * Adet oyuncunun kararıdır, sabit blok değil: §4.1 "uygun ticari kanal
 * üzerinden TEDARİK EDİLEREK tamamlanabilir" diyor — eksiğini kapatmak için
 * gelen esnafa 45'lik blok dayatmak, kanalı erişilemez kılardı. Adet
 * değiştikçe fiyat §6'nın hacim katmanından yeniden geçer.
 */
export function supplyOffer(
  item: ItemInstance,
  quantity: number,
  market: MarketState,
  store: StoreState,
): SupplyLot | null {
  if (!isBullion(item.templateId)) return null;

  const maxQuantity = maxLotQuantity(item, market);
  const units = Math.max(1, Math.min(maxQuantity, Math.round(quantity)));

  const quote = priceForChannel({
    item,
    market,
    channel: 'wholesaler',
    side: 'shopBuys',
    quantity: units,
    baseUnitValue: bullionUnitValue(item, market),
    relationship: store.supplier.trust,
  });

  return {
    templateId: item.templateId,
    displayName: item.displayName,
    quantity: units,
    maxQuantity,
    unitPrice: quote.unitPrice,
    total: quote.totalPrice,
    grams: gramsFor(item, units),
  };
}

/**
 * Oyuncunun bugün gerçekten alabileceği adet: nakit + kullanılabilir limit.
 *
 * Ekranın varsayılanı budur. Karşılanamayacak bir adedi varsayılan yapmak,
 * §7'nin "koşullar işlem öncesi anlaşılır" cümlesini teknik olarak
 * karşılayıp pratikte boş bir raf göstermek olurdu.
 */
export function affordableQuantity(
  item: ItemInstance,
  market: MarketState,
  store: StoreState,
): number {
  const max = maxLotQuantity(item, market);
  const probe = supplyOffer(item, max, market, store);
  if (!probe || probe.unitPrice <= 0) return 1;

  const headroom = store.cash + Math.max(0, creditLimit(store) - usedLimit(store.supplier));
  // Vade farkı da bütçeden çıkar; tavanı ona göre daraltıyoruz.
  const budget = headroom / (1 + financeRate(store));
  return Math.max(1, Math.min(max, Math.floor(budget / probe.unitPrice)));
}

/** Toptancının vitrini — her üründe oyuncunun bugün alabileceği adetle açılır. */
export function supplyLots(market: MarketState, store: StoreState, items: ItemInstance[]): SupplyLot[] {
  return items
    .map((item) =>
      isBullion(item.templateId)
        ? supplyOffer(item, affordableQuantity(item, market, store), market, store)
        : null,
    )
    .filter((lot): lot is SupplyLot => lot !== null);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
