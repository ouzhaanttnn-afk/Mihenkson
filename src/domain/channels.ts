/**
 * MIHENKAYNAK — Kanal fiyatlama ve makas motoru
 * Kaynak: Ekonomi Ara Düzeltmesi v1.0 · §6 "Makas ve kanal fiyatlama",
 *         §6.1 "Toptancı avantajı", §9 "Denge ilkeleri".
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * KAPSAM SINIRI (Addendum §10) — BU DOSYA NE YAPMAZ:
 *   "Bu addendum, temel fiyatın nasıl hesaplandığını değil; bu çıktı üzerinde
 *    kanal, hacim, risk ve ilişki davranışının nasıl genişletileceğini tarif
 *    eder."
 *
 *   Metal değeri hâlâ GDD 6.2'nin formülüdür ve valuation.ts'te yaşar:
 *       net gram × gerçek saflık × spot
 *   Bu dosya O ÇIKTIYI GİRDİ OLARAK ALIR ve üzerine makas uygular.
 *   HAS/ayar/değerleme/settlement formülleri burada yeniden yazılmaz.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * §6: "Alış-satış makası sabit tek bir değer değildir. Nihai kanal fiyatı
 *      ... ürün, hacim, kanal, piyasa rejimi, volatilite ve güven/ilişki
 *      çarpan veya ayarlama katmanlarından türetilir."
 *
 * §6.1 DEĞİŞMEZ: "Toptancının +10–20 TL/gr avantajı ... HARDCODE EDİLMEZ."
 *      Bu dosyada hiçbir yerde sabit bir TL/gr farkı yoktur; fark kanal
 *      profillerinden türer ve `wholesalerEdgePerGram()` ile ÖLÇÜLÜR.
 */

import { moneyUnit } from '@i18n/money';
import { t } from '@i18n/index';
import { CHANNEL, MARKET_REGIME } from './balance';
import { bullionMeta, CRAFTED_DEFAULT, type BullionMeta, type LiquidityClass } from '@data/bullion';
import { spotFor } from './market';
import { customerPriceBand } from './customer-pricing';
import { roundMoney } from './v5-rules';
import type {
  ItemInstance,
  MarketState,
  Money,
  TradeChannel,
  TradeSide,
} from './types';

// ---------------------------------------------------------------------------
// Girdi ve çıktı
// ---------------------------------------------------------------------------

export interface PricingInput {
  item: ItemInstance;
  market: MarketState;
  channel: TradeChannel;
  side: TradeSide;
  /** Kaç adet. Sarrafiyede adet, işçilikli üründe 1. */
  quantity: number;
  /**
   * GDD 6.2'nin çıktısı — temel adil değer (BİRİM BAŞINA).
   * Bu değeri bu dosya HESAPLAMAZ, yalnız tüketir (§10).
   */
  baseUnitValue: Money;
  /** İlgili kanalın güven/ilişki seviyesi (0–100). */
  relationship: number;
}

export interface PricingResult {
  channel: TradeChannel;
  side: TradeSide;
  quantity: number;

  /** Yuvarlanmamış birim fiyatı; final ödeme totalPrice alanındadır. */
  unitPrice: Money;
  /** Merkezi TL yuvarlaması uygulanmış quantity × unitPrice. */
  totalPrice: Money;

  /**
   * Dükkânın adil değer üzerindeki İŞARETLİ marjı. Pozitif = makas dükkânın
   * lehine (tezgâh); negatif = fiyatı karşı taraf belirliyor (toptancı).
   */
  spreadRatio: number;

  /**
   * Derinlik tükenmesinin referans fiyata etkisi (her zaman ≤ 0).
   * Marjdan ayrı tutulur: bu bir pazarlık sonucu değil, likidite maliyetidir.
   */
  priceImpact: number;

  /** §6 belirleyicilerinin tek tek katkısı — telemetri ve UI açıklaması için. */
  breakdown: {
    product: number;
    volume: number;
    channel: number;
    regime: number;
    volatility: number;
    relationship: number;
  };

  /** Bu kanalın bu işlemi karşılayabildiği azami adet (§11 likidite sınırı). */
  capacityLimit: number;
  /** Talep edilen adet kapasiteyi aşıyorsa true — dilimleme gerekir. */
  exceedsCapacity: boolean;

  /** Oyuncuya gösterilecek kısa gerekçe. */
  rationale: string;
}

// ---------------------------------------------------------------------------
// Ana hesap
// ---------------------------------------------------------------------------

/**
 * §6 tablosundaki altı belirleyiciyi sırayla uygular.
 *
 * MODEL — `spreadRatio` DÜKKÂNIN adil değer üzerindeki MARJIDIR (işaretli):
 *   shopSells (dükkân satar) → fiyat = adil × (1 + marj)
 *   shopBuys  (dükkân alır)  → fiyat = adil × (1 − marj)
 *
 * Marj NEGATİF olabilir ve olmalıdır. Dükkân 40 çeyreği tezgâha yığmaya
 * çalışırsa derinlik tükenir ve adil değerin ALTINA satar. Bu bir hata değil,
 * §4.2'nin kanal seçimi kararının ta kendisidir: küçük parti tezgâha, büyük
 * parti toptancıya. Marjı yapay olarak pozitife kelepçelemek, oyuncunun
 * likidite riskini görünmez kılardı.
 *
 * Arbitraj kapısı (§11) marj işaretiyle değil, aynı anda alıp satmanın her
 * zaman maliyetli olmasıyla kapanır: `roundTripCost()` bkz.
 */
export function priceForChannel(input: PricingInput): PricingResult {
  const { item, market, channel, side, quantity, baseUnitValue, relationship } = input;

  const meta = bullionMeta(item.templateId);
  const profile = CHANNEL[channel];
  const capacityLimit = channelCapacity(channel, meta, market);
  const direction = side === 'shopBuys' ? -1 : 1;
  const customerBand = (channel === 'retailCustomer' || channel === 'bulkCustomer')
    ? customerPriceBand(item, market, side) : null;
  if (customerBand) {
    // Final customer spread REPLACES the legacy stack of channel premiums.
    const unitPrice = side === 'shopBuys' ? customerBand.min : customerBand.max;
    const spreadRatio = Math.abs(unitPrice - customerBand.reference) / Math.max(1, customerBand.reference);
    return { channel, side, quantity, unitPrice, totalPrice: roundMoney(unitPrice * quantity),
      spreadRatio, priceImpact: 0,
      breakdown: { product: 0, volume: 0, channel: spreadRatio, regime: 0, volatility: 0, relationship: 0 },
      capacityLimit, exceedsCapacity: quantity > capacityLimit,
      rationale: t('Güncel HAS referansı ve müşteri alış-satış bandı.') };
  }

  // --- 1. ÜRÜN: likidite, standartlık, piyasa derinliği (§6 "Ürün") ---
  const productWidth = productSpread(meta);

  // --- 2. REJİM + VOLATİLİTE (§6 "Rejim + volatilite") ---
  const regimeWidth = MARKET_REGIME[market.regime].spreadShift;
  const volatilityWidth = market.volatility * CHANNEL_TUNING.volatilityToSpread;

  // --- 3. GÜVEN / İLİŞKİ (§6 "Güven/ilişki") ---
  const relationshipShift = relationshipSpread(relationship, profile.relationshipWeight);

  // --- 4. HACİM (§6 "Hacim") — iki ayrı kademe ---
  const { discount, slippage } = volumeTerms(quantity, capacityLimit, channel);

  const channelBase = side === 'shopBuys' ? profile.buySpread : profile.sellSpread;

  // PİYASA YAPICININ YARIM MAKASI.
  //
  // Ödün (ilişki + hacim kaldıracı) makası daraltır ama makasın kendi
  // ORANINA göre tavanlıdır — mutlak bir sayıya göre değil. İki nedeni var:
  //   1. §6 "riski tamamen sıfırlamaz": ödün payı ne olursa olsun makasın
  //      bir kısmı ayakta kalır, yani §11'in arbitraj kapısı yapısal olarak
  //      kapalıdır. Sıfıra kelepçelemek yerine oranla sınırlamak, kelepçenin
  //      hiç devreye girmemesini sağlar.
  //   2. §8 "toptancı ve esnaf ağı aynı algoritmanın farklı ismi değildir":
  //      mutlak tavan, dar makaslı kanalların ödününü doyurup profilleri
  //      birbirine EŞİTLERDİ. Oransal tavan kanal kimliğini korur.
  const grossHalfSpread = channelBase + productWidth + regimeWidth + volatilityWidth;
  const rawConcession = relationshipShift + discount;
  const concession = clamp(
    rawConcession,
    -grossHalfSpread * profile.maxConcessionShare,
    grossHalfSpread * profile.maxConcessionShare,
  );
  const makerHalfSpread = Math.max(0, grossHalfSpread - concession);

  // Kelepçe devreye girdiyse ödünlerin RAPORLANAN payları da aynı oranda
  // kısılır. Ham değerleri raporlamak, dökümün açıkladığı sayıya toplanmaması
  // demekti — §12.2 "sonuçlar AÇIKLANABİLİR girdilere dayanır" bunu kaldırmaz:
  // toplamı tutmayan bir döküm açıklama değil, süstür.
  const concessionScale = rawConcession === 0 ? 1 : concession / rawConcession;

  // Yarım makası KİM tahsil eder? §6'nın "kanal" belirleyicisi budur.
  // Tezgâhta dükkân (bias +1), toptancıda toptancı (bias negatif).
  const shopMargin = clamp(
    profile.makerBias * makerHalfSpread,
    -CHANNEL_TUNING.maxAdverseSpread,
    CHANNEL_TUNING.maxFavorableSpread,
  );

  // Derinlik tükenmesi bir MARJ değil, FİYAT ETKİSİdir: referans fiyatı
  // aşağı çeker. Bu yüzden yönden bağımsızdır — hacmi iten taraf öder.
  // Dükkân yığıyorsa daha ucuza satar; müşteri yığıyorsa dükkân daha ucuza alır.
  const priceImpact = -Math.min(slippage, CHANNEL_TUNING.maxPriceImpact);

  const unitPrice = Math.max(
    1,
    baseUnitValue * (1 + priceImpact + direction * shopMargin),
  );

  const bias = profile.makerBias;
  return {
    channel,
    side,
    quantity,
    unitPrice,
    totalPrice: roundMoney(unitPrice * quantity),
    spreadRatio: round4(shopMargin),
    priceImpact: round4(priceImpact),
    // Döküm marja TOPLANIR: product + volume + channel + regime + volatility
    // + relationship === spreadRatio. Fiyat etkisi ayrı raporlanır çünkü o
    // bir marj değil, referans fiyatın kayması.
    breakdown: {
      product: round4(bias * productWidth),
      volume: round4(-bias * discount * concessionScale),
      channel: round4(bias * channelBase),
      regime: round4(bias * regimeWidth),
      volatility: round4(bias * volatilityWidth),
      relationship: round4(-bias * relationshipShift * concessionScale),
    },
    capacityLimit,
    exceedsCapacity: quantity > capacityLimit,
    rationale: buildRationale(channel, side, quantity, capacityLimit, market),
  };
}

/**
 * §11 "Arbitraj döngüsü: Aynı anda bir kanaldan alıp diğerine satarak risksiz
 * kâr üretilememelidir."
 *
 * Gidiş-dönüş maliyeti: bir birimi `buyFrom` kanalından alıp `sellTo`
 * kanalına satmanın adil değere oranla net kaybı. Pozitifse arbitraj kapalı.
 */
export function roundTripCost(
  input: Omit<PricingInput, 'channel' | 'side'> & {
    buyFrom: TradeChannel;
    sellTo: TradeChannel;
    buyRelationship?: number;
    sellRelationship?: number;
  },
): number {
  const { buyFrom, sellTo, buyRelationship, sellRelationship, ...common } = input;
  // Dükkân `buyFrom` kanalından alır (shopBuys), `sellTo` kanalına satar.
  const bought = priceForChannel({
    ...common,
    channel: buyFrom,
    side: 'shopBuys',
    relationship: buyRelationship ?? common.relationship,
  });
  const sold = priceForChannel({
    ...common,
    channel: sellTo,
    side: 'shopSells',
    relationship: sellRelationship ?? common.relationship,
  });
  if (common.baseUnitValue <= 0) return 0;
  return (bought.unitPrice - sold.unitPrice) / common.baseUnitValue;
}

// ---------------------------------------------------------------------------
// §6 belirleyicileri
// ---------------------------------------------------------------------------

/**
 * §6 "Ürün | Likidite, standartlık, birim/hacim yapısı ve piyasa derinliği
 * dikkate alınır."
 *
 * Likit ve standart ürün (gram altın, çeyrek) dar makas; dar piyasalı ürün
 * (Ata, külçe, işçilikli) geniş makas taşır.
 */
export function productSpread(meta: BullionMeta | null): number {
  const liquidity: LiquidityClass = meta?.liquidityClass ?? CRAFTED_DEFAULT.liquidityClass;
  const base = CHANNEL_TUNING.liquiditySpread[liquidity];

  // Primli ürünün priminin bir kısmı talebe bağlıdır → makas biraz genişler.
  const premium = (meta?.premiumRatio ?? 0) * CHANNEL_TUNING.premiumToSpread;

  return base + premium;
}

/**
 * §6 "Hacim | Kademeli fiyatlama, kapasite ve likidite etkisi uygulanabilir;
 * SALT DOĞRUSAL ÇARPIM YETERLİ DEĞİLDİR."
 *
 * §4.1 "Hacim büyüdükçe fiyat etkisi ve makas doğrusal olmak zorunda değildir.
 * Kademe, likidite ve ilişki seviyesine göre marj sıkışabilir veya işlem riski
 * artabilir."
 *
 * İki ayrı kademe — ikisi de DÜKKÂNIN marjını yer:
 *   1. `discount`  — karşı tarafın hacim kaldıracı. Kanal kapasitesine göre
 *      doyar: tezgâhta 5 adet zaten tam kaldıraçtır, toptancıda 40 adet
 *      kaldıracın ancak yarısıdır.
 *   2. `slippage`  — kapasite AŞILDIĞINDA derinlik tükenir. Karekökle sönümlü
 *      ama kanalın sığlığıyla (`slippageFactor`) çarpılır. Tezgâha yığılan
 *      hacmin bedeli budur; §6.1'in tersine dönebilen avantajı buradan doğar.
 */
export function volumeTerms(
  quantity: number,
  capacity: number,
  channel: TradeChannel,
): { discount: number; slippage: number } {
  if (quantity <= 1) return { discount: 0, slippage: 0 };

  const tuning = CHANNEL_TUNING.volume;
  const within = Math.min(quantity, capacity);
  const excess = Math.max(0, quantity - capacity);

  // Kapasiteye göre normalize edilmiş kaldıraç: kapasitede doyar.
  const leverage = capacity > 1 ? Math.sqrt(Math.max(0, within - 1)) / Math.sqrt(capacity - 1) : 1;
  const discount = tuning.maxVolumeDiscount * Math.min(1, leverage);

  const slippage =
    excess > 0 ? tuning.slippagePerUnit * Math.sqrt(excess) * CHANNEL[channel].slippageFactor : 0;

  return { discount, slippage };
}

/**
 * Hacmin birim fiyata toplam etkisi (adil değere oranla, işaretli).
 * Hem karşı tarafın kaldıraç indirimini hem de derinlik kaymasını içerir.
 */
export function volumeSpread(
  quantity: number,
  meta: BullionMeta | null,
  channel: TradeChannel,
  market: MarketState,
  side: TradeSide = 'shopSells',
): number {
  const capacity = channelCapacity(channel, meta, market);
  const { discount, slippage } = volumeTerms(quantity, capacity, channel);
  const direction = side === 'shopBuys' ? -1 : 1;
  return -Math.min(slippage, CHANNEL_TUNING.maxPriceImpact) - direction * CHANNEL[channel].makerBias * discount;
}

/**
 * §6 "Güven/ilişki | ... riski TAMAMEN SIFIRLAMAZ."
 * Bu yüzden katkı `maxRelationshipShift` ile tavanlıdır.
 */
export function relationshipSpread(relationship: number, weight: number): number {
  const normalized = (clamp(relationship, 0, 100) - 50) / 50; // -1 .. +1
  const raw = normalized * weight;
  return clamp(raw, -CHANNEL_TUNING.maxRelationshipShift, CHANNEL_TUNING.maxRelationshipShift);
}

/**
 * §11 "Toptancı likidite sınırı: Çok büyük bozma işlemi dilimlenebilir, fiyat
 * kademelenebilir veya kapasite nedeniyle reddedilebilir."
 */
export function channelCapacity(
  channel: TradeChannel,
  meta: BullionMeta | null,
  market: MarketState,
): number {
  const base = CHANNEL[channel].capacityUnits;
  const liquidity: LiquidityClass = meta?.liquidityClass ?? CRAFTED_DEFAULT.liquidityClass;
  const liquidityFactor = CHANNEL_TUNING.capacityByLiquidity[liquidity];

  // §11 "Aşırı volatilite: ... fiyat geçerlilik süresi kısalabilir ve risk
  // sinyali güçlenebilir." Volatil piyasada kanallar daha az risk alır.
  const regimeFactor = MARKET_REGIME[market.regime].capacityFactor;

  return Math.max(1, Math.floor(base * liquidityFactor * regimeFactor));
}

// ---------------------------------------------------------------------------
// §6.1 Toptancı avantajı — ÖLÇÜLÜR, hardcode EDİLMEZ
// ---------------------------------------------------------------------------

/**
 * §6.1: "Toptancının normal müşteriye göre yaklaşık +10–20 TL/gr avantajı,
 * ilk dengeleme turlarında HEDEFLENEN bir kanal-spread farkıdır. HARDCODE
 * EDİLMEZ. Ürün, hacim, rejim, volatilite, ilişki ve piyasa derinliği bu farkı
 * daraltabilir, genişletebilir veya istisnai koşullarda TERSİNE ÇEVİREBİLİR."
 *
 * Bu fonksiyon bir hedef DEĞİL, bir ÖLÇÜMdür: iki kanalın fiyatlarını hesaplar
 * ve gram başına farkı döndürür. Telemetri ve denge turları bunu raporlar.
 *
 * §12.4 kabul testi: "Toptancı avantajı kodda sabit +10 veya +20 TL/gr
 * değildir; konfigürasyon ve belirleyici faktörlerle türetilir."
 */
export function wholesalerEdgePerGram(input: {
  item: ItemInstance;
  market: MarketState;
  quantity: number;
  baseUnitValue: Money;
  wholesalerTrust: number;
  customerTrust: number;
}): number {
  const common = {
    item: input.item,
    market: input.market,
    // Oyuncunun elindeki sarrafiyeyi BOZDURMASI: oyuncu satar.
    side: 'shopSells' as const,
    quantity: input.quantity,
    baseUnitValue: input.baseUnitValue,
  };

  const viaWholesaler = priceForChannel({
    ...common,
    channel: 'wholesaler',
    relationship: input.wholesalerTrust,
  });
  const viaCustomer = priceForChannel({
    ...common,
    channel: 'retailCustomer',
    relationship: input.customerTrust,
  });

  const meta = bullionMeta(input.item.templateId);
  const gramsPerUnit = meta?.unitWeightGrams ?? input.item.truth.netMetalWeight;
  if (gramsPerUnit <= 0) return 0;

  return (viaWholesaler.unitPrice - viaCustomer.unitPrice) / gramsPerUnit;
}

// ---------------------------------------------------------------------------
// Yardımcılar
// ---------------------------------------------------------------------------

/** Sarrafiye biriminin adil değeri — GDD 6.2 formülünden türer, onu değiştirmez. */
export function bullionUnitValue(item: ItemInstance, market: MarketState): Money {
  const meta = bullionMeta(item.templateId);
  if (!meta) return 0;

  // GDD 6.2: net gram × gerçek saflık × spot. Prim ticari katmandır.
  const metal = meta.unitWeightGrams * meta.unitPurity * spotFor(market, item.metal);
  return metal;
}

/** Bir işlemin gram karşılığı — telemetri ve kanal raporları için (§4.1). */
export function gramsFor(item: ItemInstance, quantity: number): number {
  const meta = bullionMeta(item.templateId);
  const perUnit = meta?.unitWeightGrams ?? item.truth.netMetalWeight;
  return round3(perUnit * quantity);
}

/**
 * Sarrafiye birim fiyat gösterimi.
 * Kaynak: Hızlı Sarrafiye Fiyat Görünürlüğü revizyonu · §1.
 *
 * Gram bazlı ürün ₺/g, adet bazlı ürün (çeyrek, yarım, tam, Ata) ₺/adet
 * okunur. Ayrım ürünün nasıl ticaret edildiğinden gelir: gram altını
 * gramıyla, çeyreği adediyle konuşuruz.
 */
export interface UnitPriceView {
  /** Birim başına fiyat — gram bazlıda gram başına, adet bazlıda adet başına. */
  unitPrice: Money;
  /** Etkin para biriminde '₺/g' · '$/g' · '₺/adet' · '$/pc'. */
  unit: string;
  /** Gram bazlı ürün mü. */
  perGram: boolean;
  /** Bir adedin gram karşılığı. */
  gramsPerPiece: number;
}

/** Gram bazlı sayılan şablonlar: adı gram olan külçe/gram altın ailesi. */
export function isPerGramProduct(templateId: string): boolean {
  return templateId.startsWith('gram_gold') || templateId.includes('ingot');
}

/**
 * Bir kalemin birim fiyat görünümü.
 * `pieceTotal` bir ADEDİN toplam fiyatıdır; bölme yalnız gösterim içindir,
 * fiyatlama mantığına dokunmaz.
 */
export function unitPriceView(item: ItemInstance, pieceTotal: Money): UnitPriceView {
  const meta = bullionMeta(item.templateId);
  const gramsPerPiece = meta?.unitWeightGrams ?? item.truth.netMetalWeight ?? 1;
  const perGram = isPerGramProduct(item.templateId);

  return {
    unitPrice:
      perGram && gramsPerPiece > 0 ? Math.round(pieceTotal / gramsPerPiece) : Math.round(pieceTotal),
    /*
      Birim etiketi para birimine göre üretilir; sabit '₺/g' yazmak dolar
      seçildiğinde sayıyı dolara, etiketi TL'ye bırakırdı.
    */
    unit: perGram ? moneyUnit('g') : moneyUnit(t('adet')),
    perGram,
    gramsPerPiece,
  };
}

/**
 * §2 — PİYASA REFERANS ALIŞ.
 *
 * "İlgili ürünün mevcut piyasa koşullarına ve normal alış-satış farkına göre
 * hesaplanan TİPİK KUYUMCU ALIŞ FİYATI."
 *
 * DEĞİŞMEZ: "Bu değer müşterinin gizli kabul fiyatı veya rezervasyon fiyatı
 * DEĞİLDİR." Bu yüzden fonksiyon müşteriyi hiç görmez — yalnız ürün, piyasa
 * ve kanal makasını alır. Rezervasyonu sızdırmak GDD 6.6'yı delerdi.
 *
 * Hardcode yok: fiyat mevcut piyasadan ve §6 makas kurallarından türer.
 */
export function marketReferenceBuy(
  item: ItemInstance,
  market: MarketState,
  baseUnitValue: Money,
  quantity = 1,
): Money {
  return priceForChannel({
    item,
    market,
    // Tipik tezgâh alışı: dükkân alıcı, karşısında sıradan bir müşteri.
    channel: 'retailCustomer',
    side: 'shopBuys',
    quantity,
    baseUnitValue,
    // Referans NÖTR ilişkiyle hesaplanır; belirli bir müşteriye ait değildir.
    relationship: 50,
  }).unitPrice;
}

/**
 * §2 referansının SATIŞ yönü — dükkân satarken tipik tezgâh fiyatı.
 *
 * `marketReferenceBuy`in aynası. İki ayrı fonksiyon olmasının sebebi
 * makasın simetrik OLMAMASI: alış makası ile satış makası ayrı katsayılardır
 * (CHANNEL.retailCustomer buySpread 0.02 / sellSpread 0.014). Tek fonksiyonu
 * işaret çevirerek kullanmak, olmayan bir simetri uydurmak olurdu.
 */
export function marketReferenceSell(
  item: ItemInstance,
  market: MarketState,
  baseUnitValue: Money,
  quantity = 1,
): Money {
  return priceForChannel({
    item,
    market,
    channel: 'retailCustomer',
    side: 'shopSells',
    quantity,
    baseUnitValue,
    // Referans NÖTR ilişkiyle hesaplanır; belirli bir müşteriye ait değildir.
    relationship: 50,
  }).unitPrice;
}

export const CHANNEL_LABEL_TR: Record<TradeChannel, string> = {
  retailCustomer: 'Tezgâh müşterisi',
  bulkCustomer: 'Toplu müşteri',
  wholesaler: 'Toptancı',
  tradeNetwork: 'Esnaf ağı',
};

function buildRationale(
  channel: TradeChannel,
  side: TradeSide,
  quantity: number,
  capacity: number,
  market: MarketState,
): string {
  if (quantity > capacity) {
    return `${CHANNEL_LABEL_TR[channel]} bu hacmi tek seferde karşılayamıyor; dilimleme gerekir.`;
  }
  if (market.regime === 'volatile' || market.regime === 'shock') {
    // §7 — oyuncuya görünen metinde teknik terim kullanılmaz.
    return t('Oynak piyasa alış-satış farkını açıyor.');
  }
  if (channel === 'wholesaler') {
    return side === 'shopSells'
      ? t('Yüksek hacimli, hızlı likidite kanalı.')
      : t('Planlı stok; ödeme baskısı taşır.');
  }
  if (channel === 'tradeNetwork') {
    return t('Yerel ilişkiye dayalı; kapasitesi sonlu.');
  }
  if (channel === 'bulkCustomer') {
    return t('Hacim büyük; marj sıkışır.');
  }
  return t('Standart tezgâh koşulları.');
}

/**
 * Kanal fiyatlama tuning yüzeyi.
 * §9: "Denge ayarları veri odaklıdır: sabit kod yerine konfigürasyon,
 * telemetri ve kontrollü iterasyon tercih edilir."
 */
export const CHANNEL_TUNING = {
  /** Ürün likiditesinin taban makasa katkısı. */
  liquiditySpread: { high: 0.004, medium: 0.011, low: 0.024 } as Record<LiquidityClass, number>,

  /** Ticari primin makasa yansıma oranı. */
  premiumToSpread: 0.18,

  volume: {
    /** Karşı tarafın hacim kaldıracının azami makas etkisi (kapasitede doyar). */
    maxVolumeDiscount: 0.006,
    /** Kapasite aşımında fazla adet başına kayma (karekökle sönümlü). */
    slippagePerUnit: 0.0034,
  },

  /** Günlük volatilitenin makasa çevrim katsayısı. */
  volatilityToSpread: 0.35,

  /** §6 "riski tamamen sıfırlamaz" — tek başına ilişki katkısının tavanı. */
  maxRelationshipShift: 0.02,


  /**
   * Marjın uç sınırları. Dükkân lehine tavan, aleyhine taban.
   * Aleyhine sınır daha geniştir: likidite riski gerçek bir kayıptır ve
   * oyuncu onu görmelidir; ama dipsiz değildir.
   */
  maxFavorableSpread: 0.18,
  maxAdverseSpread: 0.12,

  /** Derinlik kaymasının azami fiyat etkisi — dipsiz kuyu değildir. */
  maxPriceImpact: 0.22,

  /** Likidite sınıfının kanal kapasitesine çarpanı. */
  capacityByLiquidity: { high: 1, medium: 0.55, low: 0.25 } as Record<LiquidityClass, number>,
} as const;

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
function round4(n: number): number {
  const r = Math.round(n * 10000) / 10000;
  return r === 0 ? 0 : r; // -0 normalize
}
