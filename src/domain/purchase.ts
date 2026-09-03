/**
 * MIHENKAYNAK — Müşteri alış akışı (oyuncu müşteriye satar)
 * Kaynak: GDD 23.23 intent matrisi "Stok seçimi → Değer/Paket → Pazarlık",
 *         Ekonomi Ara Düzeltmesi v1.0 · §3 (terminoloji), §4.1 (kısmi
 *         karşılama), §6 (kanal fiyatlaması).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * BU AKIŞIN SATIŞ AKIŞINDAN YAPISAL FARKI
 *
 * Satış akışında (müşteri satar) ürünü müşteri getirir; oyuncunun bilmediği
 * şey ÜRÜNÜN GERÇEĞİdir ve testler bu belirsizliği kapatır.
 *
 * Alış akışında ürün oyuncunun kendi stokudur — gerçeği zaten bilinir.
 * Belirsizlik yer değiştirir: bilinmeyen artık MÜŞTERİNİN ÖDEME TAVANIdır.
 * Bu yüzden burada test aşaması yoktur; onun yerine stok seçimi ve paketleme
 * vardır. Oyuncunun kaldıracı bilgi değil, DOĞRU MALI DOĞRU PAKETTE sunmaktır.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * KAPSAM SINIRI (Addendum §10): Paketin adil değeri GDD 6.2'nin çıktısıdır ve
 * valuation.ts'te hesaplanır. Bu dosya o değeri girdi alır, kanal katmanını
 * (channels.ts) uygular ve pazarlığa devreder. Değerleme formülü burada
 * yeniden yazılmaz.
 */

import { t } from '@i18n/index';
import { PURCHASE } from './balance';
import { isMassPool, poolForItem, poolForTemplate, poolUnitGrams, validQuantity } from './stock-pools';
import { customerPriceBand, isCrafted } from './customer-pricing';
import { roundMoney } from './v5-rules';
import { costBasisForUnits } from './settlement';
import { bullionMeta, isBullion, RETAIL_BULLION_CATALOG } from '@data/bullion';
import { getTemplate } from '@data/item-templates';
import { bullionUnitValue, gramsFor, priceForChannel, CHANNEL_LABEL_TR } from './channels';
import { trueValue } from './valuation';
import { creditLimit, usedLimit } from './wholesaler';
import { Rng, deriveSeed } from './rng';
import type { DayCharacter } from './intent';
import type {
  Customer,
  CustomerDemand,
  InventoryPosition,
  ItemInstance,
  MarketState,
  Money,
  PackageLine,
  PurchaseSession,
  StoreState,
  TradeChannel,
} from './types';

// ---------------------------------------------------------------------------
// Talep üretimi
// ---------------------------------------------------------------------------

/**
 * Müşterinin ne aradığını spawn anında sabitler (GDD 9.3).
 *
 * §4.1: "Toplu müşteri, normal tekil müşterinin sadece yüksek adetli kopyası
 * değildir; ayrı hacim bandı, bütçe, fiyat hassasiyeti, KISMİ KARŞILAMA ve
 * güven davranışı kullanır."
 */
export function spawnDemand(
  rootSeed: number,
  spawnIndex: number,
  _archetypeId: Customer['archetype'],
  character: DayCharacter,
  /**
   * Mağaza kademesi — işçilikli talep havuzunu sınırlar. Kademe 1
   * dükkânının müşterisi flagship ürünü sormaz (GDD 19).
   */
  storeTier = 1,
  store?: StoreState,
  market?: MarketState,
): CustomerDemand {
  const rng = new Rng(deriveSeed(rootSeed, 'customer/demand', spawnIndex));

  // UPDATEv2: Oyuncu müşteriye yalnız ortak perakende kataloğundaki
  // ürünleri satar. İşçilikli takılar alış/servis/ekspertizde kalır.
  const wantsBullion = true;

  // §4.1 toplu sipariş — gün karakterinden gelir, niyet payından değil.
  const isBulk = wantsBullion && rng.chance(character.bulkOrderChance);

  let templateId: string | null = null;
  let quantity = 1;

  if (wantsBullion) {
    const tierCatalog = RETAIL_BULLION_CATALOG.filter(
      (id) => getTemplate(id).minTier <= storeTier,
    );

    // Talep yalnız satılabilir katalogdan gelir; ayrıca erken oyunda müşterinin
    // sermayenin tamamını bağlayan 80–100 gramlık anlamsız siparişler vermesini
    // önler. Bu bir fiyat motoru değildir: mevcut spot + ürün metadatasından
    // yalnızca talep büyüklüğü için yaklaşık tedarik bütçesi türetilir.
    const headroom = store
      ? store.cash + Math.max(0, creditLimit(store) - usedLimit(store.supplier))
      : Number.POSITIVE_INFINITY;
    const budgetShare = isBulk ? 0.42 : 0.24 + Math.max(0, storeTier - 1) * 0.035;
    const demandBudget = Math.max(60_000, headroom * budgetShare);
    const estimatedUnit = (id: string) => {
      const meta = bullionMeta(id);
      if (!meta || !market) return 0;
      return Math.round(
        meta.unitWeightGrams *
          meta.unitPurity *
          market.goldSpot *
          (1 + meta.premiumRatio),
      );
    };
    const affordableCatalog = market
      ? tierCatalog.filter((id) => estimatedUnit(id) <= demandBudget)
      : tierCatalog;
    const sellable = affordableCatalog.length > 0 ? affordableCatalog : tierCatalog;
    templateId = rng.pick(sellable);
    const meta = bullionMeta(templateId);
    const band = isBulk ? meta?.bulkVolumeBand : meta?.volumeBand;
    const [lo, hi] = band ?? [1, 2];
    const rolledQuantity = Math.max(1, Math.round(rng.range(lo, hi) * character.volumeScale));
    const unitEstimate = estimatedUnit(templateId);
    const affordableQuantity = unitEstimate > 0 ? Math.max(1, Math.floor(demandBudget / unitEstimate)) : rolledQuantity;
    quantity = Math.min(rolledQuantity, affordableQuantity);
  }

  // §4.1 kısmi karşılama: toplu müşteri stok yetmezse azıyla da çıkabilir.
  const poolId = templateId ? poolForTemplate(templateId) : undefined;
  if (poolId && isMassPool(poolId)) {
    quantity *= bullionMeta(templateId!)!.unitWeightGrams / poolUnitGrams(poolId);
    templateId = poolId === '24K_GRAM_GOLD_POOL' ? 'gram_gold_1' : 'investment_bangle_22k_10';
  }
  const acceptsPartial = poolId === '22K_INVESTMENT_BANGLE_POOL' ? false : isBulk ? rng.chance(PURCHASE.bulkPartialChance) : quantity > 1;
  const minQuantity = acceptsPartial
    ? Math.max(1, Math.ceil(quantity * PURCHASE.partialFloorShare))
    : quantity;

  const families: string[] = [];

  return {
    families,
    poolId,
    wantsBullion,
    templateId,
    quantity,
    isBulk,
    acceptsPartial,
    minQuantity,
    /*
      ÖZET METNİ ÜRETİM ANINDA ÇEVRİLİR ve müşteriyle birlikte durumda
      saklanır. Bunun bilinen sınırı şudur: oyuncu tezgâhta bir müşteri
      varken dili değiştirirse O MÜŞTERİNİN özeti eski dilde kalır, sonraki
      müşteriden itibaren yeni dil gelir. Alternatifi özeti çizim anında
      yeniden kurmaktı; talep nesnesi kayda da giriyor ve oradaki metnin
      üretildiği anla tutarlı kalması, dille tutarlı kalmasından daha
      önemli — sayı ve ürün eşleşmesi o metne bakılarak doğrulanıyor.
    */
    summary:
      poolId === '24K_GRAM_GOLD_POOL'
        ? t('{g} gram altın', { g: quantity })
        : poolId === '22K_INVESTMENT_BANGLE_POOL'
          ? t('{g} gram 22 ayar işçiliksiz bilezik', { g: quantity * 10 })
          : demandSummary(templateId, families, quantity, isBulk),
    alternativesLabel: '',
  };
}

function demandSummary(
  templateId: string | null,
  families: string[],
  quantity: number,
  isBulk: boolean,
): string {
  if (templateId) {
    const name = t(getTemplate(templateId)?.displayName ?? templateId);
    const withCount = quantity > 1 ? t('{n} adet {ad}', { n: quantity, ad: name }) : name;
    return isBulk ? t('Toplu: {ne}', { ne: withCount }) : withCount;
  }
  // Buraya yalnız hiçbir şablonun eşleşmediği hâlde düşülür; aile listesi
  // son çare olarak kalır ama artık oyuncunun dilinde yazılır.

  if (families.length > 0) return t('Katalog ürünü arıyor');
  return t('Vitrine bakıyor');
}

// ---------------------------------------------------------------------------
// Stok eşleşmesi
// ---------------------------------------------------------------------------

/**
 * Bir stok kalemi talebi ne kadar karşılıyor.
 *   'exact'   — tam istediği ürün
 *   'family'  — aradığı ailede ama tam ürün değil
 *   'off'     — alakasız; müşteriye sunmak sabır ve ilgi yakar
 */
export type DemandMatch = 'exact' | 'family' | 'off';

export function matchDemand(demand: CustomerDemand, item: ItemInstance): DemandMatch {
  if (demand.targetInventoryItemId) return item.id === demand.targetInventoryItemId && isCrafted(item) && item.location === 'display' ? 'exact' : 'off';
  // Gram altın ve yatırım bileziği fiziksel gram havuzudur; burada yalnız
  // standart/saf havuz ürünü kabul edilir. Adetli ziynetlerde ise müşterinin
  // söylediği somut ürün adı belirleyicidir (Yarım ≠ Cumhuriyet ≠ Ata).
  if (demand.poolId && isMassPool(demand.poolId) && demand.poolId === poolForTemplate(demand.templateId ?? '')) {
    return poolForItem(item) === demand.poolId ? 'exact' : 'off';
  }
  if (demand.templateId && item.templateId === demand.templateId) return 'exact';
  if (demand.poolId) return poolForItem(item) === demand.poolId ? 'exact' : 'off';
  // UPDATEv1: Somut bir ürün isteyen müşteriye yalnız o SKU sunulur.
  // "Bilezik" talebine gram altın ya da başka bir bilezik önermek hem
  // metni hem de stok kararını anlamsızlaştırıyordu.
  if (demand.templateId) return 'off';
  if (demand.wantsBullion) return isBullion(item.templateId) ? 'family' : 'off';

  const template = getTemplate(item.templateId);
  if (!template) return 'off';
  if (demand.families.length === 0) return 'family';
  return demand.families.includes(template.family) ? 'family' : 'off';
}

/** Talebi karşılayabilecek stok kalemleri — vitrin ve arka stok. */
export function offerableStock(
  demand: CustomerDemand,
  inventory: InventoryPosition[],
  items: Record<string, ItemInstance>,
): { position: InventoryPosition; item: ItemInstance; match: DemandMatch }[] {
  const rank: Record<DemandMatch, number> = { exact: 0, family: 1, off: 2 };
  const rows: { position: InventoryPosition; item: ItemInstance; match: DemandMatch }[] = [];
  for (const position of inventory) {
    if (position.location !== 'display' && position.location !== 'backStock') continue;
    const item = items[position.itemId];
    if (!item) continue;
    if (demand.targetInventoryItemId && position.location !== 'display') continue;
    const match = matchDemand(demand, item);
    if (match === 'off') continue;
    rows.push({ position, item, match });
  }
  return rows.sort(
    (a, b) => rank[a.match] - rank[b.match] || b.position.currentValue - a.position.currentValue,
  );
}

// ---------------------------------------------------------------------------
// Paket fiyatlaması
// ---------------------------------------------------------------------------

/**
 * Paketin adil değeri — GDD 6.2'nin çıktısı. Sarrafiyede birim değer ×
 * adet, işçilikli üründe kalemin gerçek değeri. Bu dosya formülü YENİDEN
 * YAZMAZ, yalnız toplar (Addendum §10).
 */
export function packageFairValue(
  lines: PackageLine[],
  items: Record<string, ItemInstance>,
  market: MarketState,
): Money {
  return lines.reduce((sum, line) => {
    const item = items[line.itemId];
    if (!item) return sum;
    const unit = isBullion(item.templateId)
      ? bullionUnitValue(item, market)
      : trueValue(item, market);
    return sum + unit * line.quantity;
  }, 0);
}

/**
 * §4.1: "Toplu müşteri ... ayrı hacim bandı, bütçe, fiyat hassasiyeti ...
 * kullanır." Adet bandın üstüne çıktığında kanal profili de değişir.
 */
export function channelForDemand(demand: CustomerDemand): TradeChannel {
  return demand.quantity >= PURCHASE.bulkChannelThreshold ? 'bulkCustomer' : 'retailCustomer';
}

/**
 * Oyuncuya önerilen satış fiyatı. Addendum §6'nın kanal katmanı burada
 * devreye girer: aynı paket, aynı gün, farklı adet → farklı makas.
 *
 * Öneri bir DAYATMA DEĞİLDİR: oyuncu pazarlıkta istediği rakamı ister.
 * Öneri yalnız kanal makasının nereye düştüğünü gösterir.
 */
export function quotePackage(
  lines: PackageLine[],
  demand: CustomerDemand,
  customer: Customer,
  market: MarketState,
  items: Record<string, ItemInstance>,
): { fair: Money; suggested: Money; channel: TradeChannel; rationale: string } {
  const fair = packageFairValue(lines, items, market);
  const units = packageUnits(lines);
  const channel = channelForDemand(demand);
  const first = lines.length > 0 ? items[lines[0]!.itemId] : undefined;

  if (units === 0 || fair <= 0 || !first) {
    return { fair: 0, suggested: 0, channel, rationale: 'Pakette ürün yok.' };
  }

  // Kanal motoru BİRİM fiyatlar. Paketin birim adil değeri üzerinden
  // fiyatlayıp adetle çarpmak, §6'nın hacim katmanının gerçekten çalışmasını
  // sağlar: 40 adet, 1 adedin 40 katı DEĞİLDİR.
  const unitFair = fair / units;
  const quote = priceForChannel({
    item: first,
    market,
    channel,
    side: 'shopSells',
    quantity: units,
    baseUnitValue: unitFair,
    relationship: customer.trust,
  });
  const bulkDiscount =
    channel === 'bulkCustomer' && Number.isInteger(units)
      ? Math.min(
          PURCHASE.bulkUnitDiscountMax,
          Math.max(1, units - PURCHASE.bulkChannelThreshold + 1) *
            PURCHASE.bulkUnitDiscountPerExtraUnit,
        )
      : 0;

  return {
    fair,
    suggested: roundMoney(quote.totalPrice * (1 - bulkDiscount)),
    channel,
    rationale: `${CHANNEL_LABEL_TR[channel]} · ${quote.rationale}${
      bulkDiscount > 0 ? ` · Hacim indirimi %${(bulkDiscount * 100).toFixed(1)}` : ''
    }`,
  };
}

/**
 * MÜŞTERİNİN ÖDEME TAVANI — bu akışın gizli gerçeği (GDD 6.6: oyuncuya
 * asla doğrudan gösterilmez).
 *
 * GDD 34.2 "rezervasyon spawn anında sabitlenir" burada ORAN olarak uygulanır:
 * paketi oyuncu seçtiği için tavarın TL karşılığı ancak paket belli olunca
 * hesaplanabilir; ama oranı ve bütçesi spawn anında sabittir. Oyuncu paketi
 * değiştirip tavanı "yeniden zar atarak" yükseltemez.
 */
export function purchaseCeiling(customer: Customer, fair: Money): Money {
  return Math.min(customer.budget, Math.round(fair * customer.purchaseCeilingRatio));
}

export function packagePriceBand(lines: PackageLine[], items: Record<string, ItemInstance>, market: MarketState) {
  let min = 0, max = 0, reference = 0;
  for (const line of lines) {
    const item = items[line.itemId];
    const band = item && customerPriceBand(item, market, 'shopSells', line.quantity);
    if (!band) return undefined;
    min += band.min; max += band.max; reference += band.reference;
  }
  return lines.length ? { min: roundMoney(min), max: roundMoney(max), reference } : undefined;
}

export function showcaseStock(inventory: InventoryPosition[], items: Record<string, ItemInstance>) {
  return inventory.filter(p => p.location === 'display' && p.quantity >= 1 && !!items[p.itemId] &&
    items[p.itemId]!.location === 'display' && isCrafted(items[p.itemId]!) && items[p.itemId]!.buyCost !== null);
}
/**
 * Bir ALICI müşterinin vitrindeki bir ürünü hedefleme olasılığı
 * (customer-spawn · `showcaseRng.chance`). Vitrin dolduruldukça bu pay ürünler
 * ARASINDA BÖLÜŞÜLÜR — hedef tek tek seçildiği için (`showcaseRng.pick`).
 */
export const SHOWCASE_TARGET_CHANCE = 0.20;

/**
 * B5 — vitrine bir ürün daha koymanın görünmeyen bedeli.
 *
 * Vitrinde n ürün varsa toplam ilgi (%20) aralarında bölüşülür; oyuncu bunu
 * hiçbir yerden göremediği için vitrini doldurmanın bir bedeli olduğunu
 * bilmiyordu. Sayı burada türetiliyor ki ekranda yazan oran spawn kuralıyla
 * aynı yerden gelsin; sabit değişirse ekran da onunla değişir.
 *
 * DÖNEN DEĞER ORTALAMADIR. Hedef seçimi B3/B4 ile AĞIRLIKLANDI
 * (`showcase-weight`): taze ve yüksek ayarlı mal payın büyüğünü alır. Ama
 * toplam sabit olduğu için ürün başına ORTALAMA hâlâ tam olarak `%20 / n`'dir
 * — ağırlıklar payı yeniden dağıtır, büyütmez. Arayüz de "ortalama" der.
 */
export function showcaseTargetChancePerItem(displayCount: number): number {
  return displayCount > 0 ? SHOWCASE_TARGET_CHANCE / displayCount : 0;
}

export function showcaseDemand(item: ItemInstance): CustomerDemand {
  return { targetInventoryItemId: item.id, families: [item.family], wantsBullion: false,
    templateId: item.templateId, quantity: 1, minQuantity: 1, acceptsPartial: false, isBulk: false,
    summary: t('★ Vitrindeki {ad} ile ilgileniyor', { ad: t(item.displayName) }),
    alternativesLabel: '' };
}

/**
 * §4.1 "Toplu talepler stok yetersizliğinde REDDEDİLEBİLİR, KISMEN
 * KARŞILANABİLİR veya uygun ticari kanal üzerinden tedarik edilerek
 * tamamlanabilir."
 */
export function fulfilmentOf(demand: CustomerDemand, count: number): PurchaseSession['fulfilment'] {
  if (count <= 0) return 'none';
  if (count >= demand.quantity) return 'full';
  return count >= demand.minQuantity && demand.acceptsPartial ? 'partial' : 'none';
}

/**
 * Paketin defter maliyeti — kâr ve settlement için (GDD 22.1).
 * GDD 31.3: "cost basis satışta yalnız SATILAN MİKTAR kadar realize olur."
 * Bu yüzden pozisyonun tamamı değil, satılan adedin payı sayılır.
 */
export function packageCost(lines: PackageLine[], inventory: InventoryPosition[]): Money {
  const byId = new Map(inventory.map((p) => [p.itemId, p]));
  return lines.reduce((sum, line) => {
    const position = byId.get(line.itemId);
    return sum + (position ? costBasisForUnits(position, line.quantity) : 0);
  }, 0);
}

/** Pakete konan toplam adet. */
export function packageUnits(lines: PackageLine[]): number {
  return lines.reduce((sum, l) => sum + l.quantity, 0);
}

/**
 * Paketin gram karşılığı — §4.1 "adet, GRAM KARŞILIĞI, ciro, brüt marj ...
 * ayrıca ölçülmelidir."
 */
export function packageGrams(lines: PackageLine[], items: Record<string, ItemInstance>): number {
  const total = lines.reduce((sum, line) => {
    const item = items[line.itemId];
    if (!item) return sum;
    return sum + gramsFor(item, line.quantity);
  }, 0);
  return Math.round(total * 1000) / 1000;
}

/** Yeni bir alış oturumu. */
export function createPurchaseSession(demand: CustomerDemand): PurchaseSession {
  return {
    demand,
    lines: [],
    packageFairValue: 0,
    suggestedPrice: 0,
    channel: channelForDemand(demand),
    packageCost: 0,
    units: 0,
    fulfilment: 'none',
    rationale: 'Paket henüz boş.',
  };
}

/**
 * Paket değiştikçe oturumu yeniden türetir — saf fonksiyon.
 *
 * §4.1 "Hacim büyüdükçe fiyat etkisi ve makas doğrusal olmak zorunda
 * değildir." Fiyat her seferinde ADET üzerinden yeniden hesaplanır; paketi
 * büyütmek fiyatı çarpmaz, kanal makasını yeniden çalıştırır.
 */
export function repricePackage(
  session: PurchaseSession,
  lines: PackageLine[],
  items: Record<string, ItemInstance>,
  inventory: InventoryPosition[],
  customer: Customer,
  market: MarketState,
): PurchaseSession {
  const clean = lines.filter((l) => {
    const item = items[l.itemId];
    const position = inventory.find(p => p.itemId === l.itemId);
    return !!position && validQuantity(position, l.quantity) && l.quantity <= session.demand.quantity && !!item && matchDemand(session.demand, item) !== 'off';
  });
  const units = packageUnits(clean);
  const quote = quotePackage(clean, session.demand, customer, market, items);

  return {
    ...session,
    lines: clean,
    packageFairValue: quote.fair,
    suggestedPrice: quote.suggested,
    channel: quote.channel,
    packageCost: packageCost(clean, inventory),
    units,
    fulfilment: fulfilmentOf(session.demand, units),
    rationale: quote.rationale,
  };
}

/**
 * Talebe uymayan mal sunmanın bedeli. §9 "hiçbir kanal her koşulda en iyi
 * sonucu vermez" ilkesinin müşteri tarafındaki karşılığı: yanlış paket
 * sabır yakar ve tavanı düşürür.
 */
export function packageFitPenalty(
  demand: CustomerDemand,
  lines: PackageLine[],
  items: Record<string, ItemInstance>,
): { patienceCost: number; ceilingMultiplier: number } {
  if (lines.length === 0) return { patienceCost: 0, ceilingMultiplier: 1 };

  let offUnits = 0;
  let exactUnits = 0;
  for (const line of lines) {
    const item = items[line.itemId];
    if (!item) continue;
    const match = matchDemand(demand, item);
    if (match === 'off') offUnits += line.quantity;
    if (match === 'exact') exactUnits += line.quantity;
  }

  const patienceCost = offUnits * PURCHASE.offMatchPatienceCost;
  const ceilingMultiplier =
    1 - offUnits * PURCHASE.offMatchCeilingCut + exactUnits * PURCHASE.exactMatchCeilingBonus;

  return { patienceCost, ceilingMultiplier: Math.max(0.7, Math.min(1.12, ceilingMultiplier)) };
}

/**
 * §4.1 "Toplu talepler STOK YETERSİZLİĞİNDE reddedilebilir, kısmen
 * karşılanabilir veya uygun ticari kanal üzerinden tedarik edilerek
 * tamamlanabilir."
 *
 * Kaç ADET verilebilir — pozisyon sayısı değil. Sarrafiye yığıldığı için
 * tek pozisyon 40 adet taşıyabilir; pozisyon saymak stoğu yok saymaktı.
 */
export function availableUnits(
  demand: CustomerDemand,
  inventory: InventoryPosition[],
  items: Record<string, ItemInstance>,
): number {
  return offerableStock(demand, inventory, items)
    .filter((r) => r.match !== 'off')
    .reduce((sum, r) => sum + r.position.quantity, 0);
}

/** §4.1 üç sonuçtan hangisi mümkün. */
export type DemandOutcome = 'full' | 'partial' | 'sourceNeeded' | 'reject';

/**
 * §4.1'in üç yolunu ayırt eder. `sourceNeeded`, stok yetmediği ama müşterinin
 * eksiğe razı OLMADIĞI durumdur: talep ancak ticari kanaldan tedarikle
 * tamamlanabilir (§4.2 toptancı). O tedarik akışı ayrı bir sistemdir; burada
 * yalnız durum teşhis edilir, sessizce "reddedildi"ye çevrilmez.
 */
export function demandOutcome(demand: CustomerDemand, available: number): DemandOutcome {
  if (available >= demand.quantity) return 'full';
  if (available <= 0) return 'reject';
  if (demand.acceptsPartial && available >= demand.minQuantity) return 'partial';
  return 'sourceNeeded';
}

export function storeCanServe(demand: CustomerDemand, available: number): boolean {
  const outcome = demandOutcome(demand, available);
  return outcome === 'full' || outcome === 'partial';
}

/** Mağaza kademesi paketin üst sınırını belirler (GDD 12). */
export function maxPackageLines(store: StoreState): number {
  return PURCHASE.maxPackageLinesByTier[store.storeTier] ?? 3;
}

// ---------------------------------------------------------------------------
// §4.1 — TOPLU MÜŞTERİ AYRI BİR MÜŞTERİDİR
// ---------------------------------------------------------------------------

/**
 * §4.1 DEĞİŞMEZ: "Toplu müşteri, normal tekil müşterinin sadece YÜKSEK ADETLİ
 * KOPYASI DEĞİLDİR; ayrı hacim bandı, bütçe, fiyat hassasiyeti, kısmi
 * karşılama ve GÜVEN DAVRANIŞI kullanır."
 *
 * Bu fonksiyon spawn edilmiş bir müşteriyi toplu profiline çevirir. Adedi
 * büyütüp bırakmak, addendum'un açıkça yasakladığı şeydi.
 *
 * Toplu müşterinin karakteri:
 *   · Fiyata çok daha duyarlı — birim farkı adetle çarpılıyor.
 *   · Daha sabırlı — büyük iş pazarlık ister, kapıdan dönmez.
 *   · Jeste değil rakama bakar — ilişki primi tekil müşterininkinden düşük.
 *   · Ödeme tavanı DAR — piyasayı biliyor, perakende primini ödemez.
 */
export function applyBulkProfile(customer: Customer): Customer {
  if (!customer.demand?.isBulk) return customer;
  const b = PURCHASE.bulk;

  return {
    ...customer,
    priceSensitivity: clamp(Math.round(customer.priceSensitivity * b.priceSensitivityFactor), 0, 100),
    patienceMax: Math.round(customer.patienceMax * b.patienceFactor),
    patience: Math.round(customer.patienceMax * b.patienceFactor),
    // Toplu alıcı dükkâna güvenmekten çok fiyatına bakar: yeni ilişkiye
    // tekil müşteriden daha temkinli başlar ve jestle hızlı ısınmaz.
    trust: clamp(Math.round(customer.trust * b.trustFactor), 0, 100),
    purchaseCeilingRatio: clamp(
      1 + (customer.purchaseCeilingRatio - 1) * b.ceilingCompression,
      0.95,
      1.45,
    ),
  };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
