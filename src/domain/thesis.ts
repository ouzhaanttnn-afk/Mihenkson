/**
 * MIHENKAYNAK — İşlem Tezi ve çıkış kanalı sistemi
 * Kaynak: GDD 8 "İşlem Tezi ve Çıkış Kanalı Sistemi", 6.4 "Alış Tavanı", EK E.
 *
 * GDD 8: "Oyuncu bir ürünü yalnız 'ucuz' olduğu için almaz; o ürünün nasıl ve
 * ne zaman paraya döneceğine dair plan kurar."
 *
 * DEĞİŞMEZ (GDD 6.4): "Aynı ürün için tek doğru alış tavanı yoktur." Tavan,
 * seçilen kanalın beklenen net gelirinden türer; oyuncunun nakdi, atölye
 * kapasitesi ve vitrin doluluğu hangi kanalın rasyonel olduğunu değiştirir.
 *
 * DEĞİŞMEZ (GDD 35.1): "Hızlı toptan çıkış normal perakende stratejisini
 * ekonomik olarak geçmemelidir." → assertChannelOrdering() bunu test eder.
 *
 * DEĞİŞMEZ (GDD 8.2): Tez bağlayıcı değildir; ürün alındıktan sonra
 * değiştirilebilir. Sistem oyuncuyu menü seçimine değil gerçek sonuçlara bağlar.
 */

import { t } from '@i18n/index';
import {
  BUY_CEILING,
  CONDITION_DEDUCTION,
  CONDITION_ORDER,
  EXIT_CHANNEL,
  TARGET_MARGIN,
} from './balance';
import { isBullion } from '@data/bullion';
import { trueBreakdown } from './valuation';
import type {
  ConditionGrade,
  ExitChannel,
  InventoryPosition,
  ItemInstance,
  LiquidityLevel,
  MarketState,
  Money,
  RiskLevel,
  StoreState,
  ThesisOption,
  ValuationBand,
} from './types';

export const CHANNEL_LABEL: Record<ExitChannel, string> = {
  wholesale: 'Toptancıya Çıkar',
  retail: 'Vitrine Koy',
  melt: 'Erit / HAS',
  serviceResale: 'Servis + Satış',
  collection: 'Beklet / Koleksiyon',
};

export const CHANNEL_SHORT: Record<ExitChannel, string> = {
  wholesale: 'Toptan',
  retail: 'Vitrin',
  melt: 'Erit',
  serviceResale: 'Servis',
  collection: 'Beklet',
};

/*
  SARRAFİYEDE "VİTRİNE KOY" TUTULMAYAN BİR VAATTİ.

  Oyun çeyrek altın için "Vitrine Koy" diyordu; oysa `settleLine` malı vitrine
  ancak `isCrafted` ise koyar ve vitrin müşterisi (`showcaseStock`) yalnız
  işçilikliyi hedefler. Yani seçilen plan hiçbir zaman uygulanmıyordu.

  İlk düşündüğüm düzeltme —kanalı sarrafiyeden kaldırmak— YANLIŞTI; ölçüm
  yakaladı. İki şey ölçüldü:

  1. Kanal kaldırılsaydı sarrafiyenin alış tavanı %12–18 düşerdi (çeyrek
     6.784 → 5.663 ₺, cumhuriyet 28.922 → 23.692 ₺). Çünkü `retail` her
     sarrafiyede ÖNERİLEN kanal ve tavanı o belirliyor.
  2. Kanalın vaadi sarrafiyede zaten DÜRÜST: 200'er örnekte, retail'in vaat
     ettiği net, tezgâh üstü müşterinin gerçekten ödediğinin %1,7–15,1
     üstünde. Arka stoktaki sarrafiye sıradan alıcıya sorunsuz satılıyor
     (`purchase.ts` hem `display` hem `backStock` eşleştiriyor).

  Yani FİYAT DOĞRU, İSİM YANLIŞTI. Sarrafiye vitrine girmez; tezgâhtan satılır.
  Düzeltme yalnızca adlandırmadır: kanal, net getiri ve tavan aynen korunur.
*/
export function channelLabel(channel: ExitChannel, bullionItem: boolean): string {
  return channel === 'retail' && bullionItem ? t('Tezgâhtan Sat') : t(CHANNEL_LABEL[channel]);
}

export function channelShort(channel: ExitChannel, bullionItem: boolean): string {
  return channel === 'retail' && bullionItem ? 'Tezgâh' : CHANNEL_SHORT[channel];
}

/** Bağlam: tezin rasyonelliği oyuncunun durumuna bağlıdır (GDD 6.4). */
export interface ThesisContext {
  store: StoreState;
  market: MarketState;
  /** Dolu vitrin slotu sayısı. */
  displayUsed: number;
  /** Dolu atölye slotu sayısı. */
  workshopUsed: number;
  /** Nakit / (nakit + stok maliyeti) — GDD 14.2. */
  liquidityRatio: number;
}

/**
 * Bir ürün için rasyonel çıkış kanallarını hesaplar.
 *
 * GDD 23.11: "Yalnız ürün için rasyonel 2–4 kanal gösterilir; anlamsız kanal
 * saklanır." Bu filtre burada uygulanır — UI'da değil.
 */
export function buildThesisOptions(
  item: ItemInstance,
  band: ValuationBand,
  ctx: ThesisContext,
): ThesisOption[] {
  const options: ThesisOption[] = [];

  // Tahmin bandının orta noktası, oyuncunun bildiği kadarıyla "adil değer".
  // Beklenen gelir hesabı gerçek değere değil bu tahmine dayanır — oyuncu
  // bilmediği bir şeyden kâr planlayamaz (GDD 6.6).
  const est = band.mid;
  // Hedef marj bandı ürüne göre seçilir (GDD 14.1) — bkz. targetMarginFor.
  const bullion = isBullion(item.templateId);
  const estMetal = band.breakdown.metal;
  const estStone = band.breakdown.stone;
  const estCraft = band.breakdown.craftsmanship;

  // --- Erit / HAS ---
  // GDD 8.1: metal odaklı, işçilik/taş kaybı. Her metal üründe geçerlidir.
  {
    const c = EXIT_CHANNEL.melt;
    const expectedNet = Math.round(estMetal * c.metalRecovery - c.refiningFee);
    options.push(
      finish({
        channel: 'melt',
        expectedNet,
        daysToCash: c.daysToCash,
        marketRisk: ctx.market.volatility > 0.018 ? 'medium' : 'low',
        demandRisk: 'low',
        capacityCost: { display: 0, workshop: 0 },
        liquidity: 'high',
        rationale:
          estCraft + estStone > estMetal * 0.15
            ? t('İşçilik ve taş değeri kaybolur.')
            : t('Yeniden satış değeri düşük; metal en güvenli çıkış.'),
        ctx,
        isBullion: bullion,
      }),
    );
  }

  // --- Toptan Likidite ---
  {
    const c = EXIT_CHANNEL.wholesale;
    const recovered =
      estMetal + estCraft * c.craftsmanshipRecovery + estStone * c.stoneRecovery;
    const expectedNet = Math.round(recovered * c.payoutRatio);
    options.push(
      finish({
        channel: 'wholesale',
        expectedNet,
        daysToCash: c.daysToCash,
        marketRisk: 'low',
        demandRisk: 'low',
        capacityCost: { display: 0, workshop: 0 },
        liquidity: 'high',
        rationale:
          ctx.liquidityRatio < 0.3
            ? t('Nakit sıkışıkken hızlı çıkış rasyonel.')
            : t('Düşük marj karşılığında anlık nakit.'),
        ctx,
        isBullion: bullion,
      }),
    );
  }

  // --- Vitrin (işçilikli) / Tezgâh (sarrafiye) ---
  /*
    KANAL, HER ZAMAN VİTRİNMİŞ GİBİ YAZILMIŞTI.

    Sarrafiye vitrine hiç girmez (`settleLine` `isCrafted` arar, vitrin
    müşterisi de yalnız onu hedefler); tezgâhtan satılır ve VİTRİN SLOTU
    TUTMAZ. Buna rağmen kanal, sarrafiyede de boş slot şartı arıyor ve
    kapasite maliyetine 1 slot yazıyordu.

    Ölçülen bedeli: vitrin işçilikli malla dolunca sarrafiyenin alış tavanı
    %13–20 düşüyordu (çeyrek 7.021 → 5.765 ₺, cumhuriyet 29.961 → 24.010 ₺).
    Yani oyuncu vitrini amacına uygun doldurduğu için, hiç ilgisi olmayan her
    sarrafiye alımında cezalandırılıyordu — üstelik bunu hiçbir yer
    söylemiyordu.

    Bu bir denge tercihi değil, tüketilmeyen bir kaynağa bağlanmış kapı:
    kaynak gerçekten harcanmadığı için şart da kalkıyor. Vitrin slotu olan
    işçilikli üründe eski davranış aynen korunur.
  */
  const displayFree = ctx.store.displaySlots - ctx.displayUsed;
  const usesDisplaySlot = !bullion;
  const retailViable =
    conditionRank(item.declared.visibleCondition) >= conditionRank('worn')
    && (!usesDisplaySlot || displayFree > 0);
  if (retailViable) {
    const c = EXIT_CHANNEL.retail;
    const days = c.daysToCash;
    const avgDays = (days[0] + days[1]) / 2;
    const demand = demandLevel(item, ctx);
    const gross = est * c.markup * c.realizationRatio;
    const expectedNet = Math.round(gross - c.holdingCostPerDay * avgDays);
    options.push(
      finish({
        channel: 'retail',
        expectedNet,
        daysToCash: days,
        marketRisk: ctx.market.volatility > 0.015 ? 'medium' : 'low',
        demandRisk: demand === 'hot' ? 'low' : demand === 'steady' ? 'medium' : 'high',
        capacityCost: { display: usesDisplaySlot ? 1 : 0, workshop: 0 },
        liquidity: 'medium',
        rationale: bullion
          ? t('Tezgâh üstü sarrafiye satışı; vitrin slotu tutmaz.')
          : demand === 'hot'
            ? t('Talep etiketi güçlü; vitrin dönüşü hızlı olabilir.')
            : t('Sermaye bağlanır; doğru müşteri beklenir.'),
        ctx,
        isBullion: bullion,
      }),
    );
  }

  // --- Servis + Satış ---
  // Yalnız düzeltilebilir bir kondisyon problemi varsa anlamlıdır (GDD 8.1).
  const repairable =
    item.declared.visibleCondition === 'worn' ||
    item.declared.visibleCondition === 'damaged' ||
    item.declared.visibleCondition === 'broken';
  const workshopFree = ctx.store.workshopCapacity - ctx.workshopUsed;
  if (repairable && displayFree > 0) {
    const c = EXIT_CHANNEL.serviceResale;
    // Servis, kondisyon kesintisinin bir kısmını geri kazandırır.
    const conditionCut = CONDITION_DEDUCTION[item.declared.visibleCondition];
    const restoredValue = est / Math.max(0.08, 1 - conditionCut);
    const recovered = est + (restoredValue - est) * c.conditionRecovery;
    const serviceCost = (restoredValue - est) * c.serviceCostRatio;
    // Atölye doluysa hata riski ve dolayısıyla beklenen maliyet artar (GDD 17.3).
    const errorRisk = c.baseErrorRisk * (workshopFree <= 0 ? 2.4 : 1);
    const gross = recovered * c.markup * c.realizationRatio;
    const expectedNet = Math.round(gross - serviceCost - gross * errorRisk);
    const days = workshopFree <= 0 ? ([c.daysToCash[0] + 2, c.daysToCash[1] + 3] as [number, number]) : c.daysToCash;

    options.push(
      finish({
        channel: 'serviceResale',
        expectedNet,
        daysToCash: days,
        marketRisk: 'medium',
        demandRisk: 'medium',
        capacityCost: { display: 1, workshop: 1 },
        liquidity: 'low',
        rationale:
          workshopFree <= 0
            ? t('Atölye dolu: süre uzar, hata riski yükselir.')
            : t('Kondisyon düzeltilebilir; yeniden satış değeri artar.'),
        ctx,
        isBullion: bullion,
      }),
    );
  }

  // --- Koleksiyon Bekletme ---
  // GDD 8.1: yalnız vintage/nadir üründe ve güçlü likidite varken rasyonel.
  const looksRare =
    item.family === 'collectible' || item.truth.rarity >= EXIT_CHANNEL.collection.minRarity;
  if (looksRare && ctx.liquidityRatio > 0.3) {
    const c = EXIT_CHANNEL.collection;
    const days = c.holdDays;
    const avgDays = (days[0] + days[1]) / 2;
    const expectedNet = Math.round(est * (1 + c.appreciationPerDay * avgDays) * c.realizationRatio);
    options.push(
      finish({
        channel: 'collection',
        expectedNet,
        daysToCash: days,
        marketRisk: 'medium',
        demandRisk: 'high',
        capacityCost: { display: 0, workshop: 0 },
        liquidity: 'low',
        rationale: t('Doğru koleksiyoner gelene kadar değer korunabilir; sermaye uzun bağlanır.'),
        ctx,
        isBullion: bullion,
      }),
    );
  }

  // GDD 23.11 — en fazla 4 kanal; en yüksek tavandan sırala ki oyuncu
  // karşılaştırmayı tek bakışta yapabilsin.
  return options.sort((a, b) => b.buyCeiling - a.buyCeiling).slice(0, 4);
}

/**
 * GDD 6.4 — Alış Tavanı =
 *   Seçilen Çıkış Kanalının Beklenen Net Geliri
 *   − Hedef Marj − Risk Rezervi − Operasyon / Zaman Maliyeti.
 */
function finish(input: {
  channel: ExitChannel;
  expectedNet: Money;
  daysToCash: [number, number];
  marketRisk: RiskLevel;
  demandRisk: RiskLevel;
  capacityCost: { display: number; workshop: number };
  liquidity: LiquidityLevel;
  rationale: string;
  ctx: ThesisContext;
  /** Ürün standart sarrafiye mi — hedef marj bandını belirler (GDD 14.1). */
  isBullion: boolean;
}): ThesisOption {
  const combinedRisk = worstRisk(input.marketRisk, input.demandRisk);
  const targetMargin = targetMarginFor(input.isBullion, combinedRisk);
  const avgDays = (input.daysToCash[0] + input.daysToCash[1]) / 2;
  const opCost = BUY_CEILING.opCostPerDay * avgDays;

  // Risk rezervi bandın genişliğinden gelir; çağıran taraf bandı bilir, ancak
  // burada kanal riskiyle birleştirilir. Band genişliği thesisFor() tarafından
  // enjekte edilir; burada kanal payını uygularız.
  const riskReserveRatio = riskReserveFor(combinedRisk);

  const buyCeiling = Math.max(
    0,
    Math.round(input.expectedNet * (1 - targetMargin - riskReserveRatio - opCost)),
  );

  return {
    channel: input.channel,
    label: channelLabel(input.channel, input.isBullion),
    shortLabel: channelShort(input.channel, input.isBullion),
    expectedNet: input.expectedNet,
    daysToCash: input.daysToCash,
    marketRisk: input.marketRisk,
    demandRisk: input.demandRisk,
    capacityCost: input.capacityCost,
    liquidity: input.liquidity,
    buyCeiling,
    rationale: input.rationale,
  };
}

/**
 * GDD 14.1 — HEDEF MARJ ÜRÜNE GÖRE DEĞİŞİR.
 *
 *   sarrafiye              %1,5 – 4
 *   ikinci el işçilikli    %8 – 20
 *
 * Alış tavanı bu bandı hiç okumuyor, ürün ne olursa olsun düz bir
 * %5/11/19 uyguluyordu. Sonuç ölçüldü: tam ölçülmüş bir sarrafiyede bile
 * müşterinin kabul eşiği tavanın %109'una düşüyor, yani çeyrek almak
 * yapısal olarak zarardı — oyuncuya müşteri "uçuk fiyat istiyor" gibi
 * görünüyordu. Oysa uçuk olan müşteri değil, dükkânın kendinden istediği
 * marjdı: bir çeyrekten %11 marj beklemek sarraflık değil.
 *
 * İşçilikli tarafta mevcut band KORUNUYOR: ölçüm orada eşiği tavanın
 * %97'sinde gösteriyor, yani çalışıyor. GDD'nin %8–20 bandına çekmek
 * tavanı daha da indirip çalışan tarafı bozardı — bu, bilinen ve
 * kayıtlı bir sapmadır.
 */
function targetMarginFor(bullion: boolean, risk: RiskLevel): number {
  if (!bullion) return BUY_CEILING.targetMarginByRisk[risk];

  const [lo, hi] = TARGET_MARGIN.bullion;
  const t = risk === 'low' ? 0 : risk === 'medium' ? 0.5 : 1;
  return lo + (hi - lo) * t;
}

function riskReserveFor(risk: RiskLevel): number {
  return risk === 'low' ? 0.02 : risk === 'medium' ? 0.05 : 0.09;
}

/**
 * Bilgi riskini alış tavanına uygular (GDD 6.4 "Risk Rezervi", 6.3 "Düşük güven
 * → risk rezervi yüksek olmalı"). Geniş band = daha düşük tavan.
 */
export function applyBandRisk(options: ThesisOption[], band: ValuationBand): ThesisOption[] {
  const bandPenalty = band.relativeWidth * BUY_CEILING.riskReservePerBandWidth;
  return options.map((o) => ({
    ...o,
    buyCeiling: Math.max(0, Math.round(o.buyCeiling * (1 - Math.min(0.6, bandPenalty)))),
  }));
}

/** Ürün + tez + bağlam → tam seçenek listesi (band riski uygulanmış). */
export function thesisFor(
  item: ItemInstance,
  band: ValuationBand,
  ctx: ThesisContext,
): ThesisOption[] {
  return applyBandRisk(buildThesisOptions(item, band, ctx), band);
}

/**
 * Sistem varsayılan en makul kanalı önerir fakat kilitlemez (GDD 23.7 "Tez").
 * En yüksek alış tavanını veren kanal önerilir — oyuncunun en fazla ödeyebileceği
 * planı gösterir.
 */
export function suggestedChannel(options: ThesisOption[]): ExitChannel | null {
  return options[0]?.channel ?? null;
}

/** Seçili tez yoksa oyuncu yine teklif verebilir (GDD 23.7). Referans tavan: en iyisi. */
export function effectiveCeiling(options: ThesisOption[], selected: ExitChannel | null): Money {
  if (selected) {
    const found = options.find((o) => o.channel === selected);
    if (found) return found.buyCeiling;
  }
  return options[0]?.buyCeiling ?? 0;
}

/**
 * Stok kalemlerini bugünkü piyasaya göre yeniden değerler.
 *
 * GDD 14.3 — "Tahmini stok değeri: bugünkü bilinen koşullarda muhtemel
 * satış/likidasyon değeri." Bu, adil değer değil GERÇEKLEŞTİRİLEBİLİR değerdir:
 * seçili tezin beklenen net getirisi kullanılır, tez yoksa mevcut en iyi kanal.
 * Böylece GDD 8.3'teki "stok ekranında her kalemin neden tutulduğu" bilgisi
 * ekonomik bir sayıya bağlanır.
 *
 * DEĞİŞMEZ (GDD 34.5): Bu fonksiyon yalnız `currentValue` yazar. Gerçekleşmiş
 * kâra hiçbir şey eklemez — stok potansiyeli realize değildir.
 */
export function revalueInventory(
  inventory: InventoryPosition[],
  items: Record<string, ItemInstance>,
  ctx: ThesisContext,
): InventoryPosition[] {
  return inventory.map((position) => {
    const item = items[position.itemId];
    if (!item) return position;

    // Stoktaki ürünün gerçeği artık dükkânın elindedir; oyuncu onu serbestçe
    // inceleyebilir. Bu yüzden mark, tahmin bandı değil gerçek değer üzerinden
    // kurulan kanal ekonomisidir.
    const band = fullKnowledgeBand(item, ctx);
    const options = thesisFor(item, band, ctx);
    if (options.length === 0) return position;

    const selected = position.thesis
      ? options.find((o) => o.channel === position.thesis)
      : undefined;
    const mark = selected ?? options.reduce((a, b) => (b.expectedNet > a.expectedNet ? b : a));

    const expectedExitValues: Partial<Record<ExitChannel, Money>> = {};
    for (const option of options) expectedExitValues[option.channel] = option.expectedNet;

    return {
      ...position,
      // Pozisyon toplam taşır; kanal ekonomisi BİRİM üzerinden kuruluyor.
      // Adetle çarpmayı unutmak, 40 çeyreklik yığını tek çeyrek gibi
      // değerlemek olurdu (Addendum §4.1).
      currentValue: mark.expectedNet * position.quantity,
      expectedExitValues,
    };
  });
}

/** Sahip olunan üründe belirsizlik yoktur; band gerçek değere oturur. */
function fullKnowledgeBand(item: ItemInstance, ctx: ThesisContext): ValuationBand {
  const b = trueBreakdown(item, ctx.market);
  const value = Math.max(
    0,
    b.metal + b.stone + b.craftsmanship + b.rarityPremium + b.riskDeduction,
  );
  return {
    min: value,
    max: value,
    mid: value,
    confidence: 'high',
    relativeWidth: 0,
    breakdown: b,
  };
}

/**
 * TALEP ETİKETLERİ VERİDİR, EKRAN METNİ DEĞİL.
 *
 * Buradaki `'düğün'`, `'yatırım'`, `'yavaş'` gibi diziler ürünün gizli
 * gerçeğinde duran KİMLİKLERDİR ve kod onlara göre dallanıyor. Bir çeviri
 * geçişinde yanlışlıkla `t()` ile sarılmışlardı; İngilizce oynayan oyuncuda
 * `tags.includes('wedding')` hiçbir zaman tutmayacağı için düğün sezonu
 * olayı talebi hiç artırmayacaktı — yani ÇEVİRİ SESSİZCE EKONOMİYİ
 * DEĞİŞTİRECEKTİ. Karşılaştırmada asla çeviri kullanılmaz.
 */
function demandLevel(item: ItemInstance, ctx: ThesisContext): 'cold' | 'steady' | 'hot' {
  const event = ctx.market.activeEvent;
  if (event) {
    const tags = item.truth.demandTags;
    if (event.id === 'wedding_season' && tags.includes('düğün')) return 'hot';
    if (event.id === 'market_rally' && tags.includes('yatırım')) return 'hot';
    if (event.id === 'fx_calm' && tags.includes('perakende')) return 'hot';
  }
  if (item.truth.demandTags.includes('likit')) return 'hot';
  if (item.truth.demandTags.includes('yavaş') || item.truth.demandTags.includes('koleksiyon')) {
    return 'cold';
  }
  return 'steady';
}

function worstRisk(a: RiskLevel, b: RiskLevel): RiskLevel {
  const rank = { low: 0, medium: 1, high: 2 } as const;
  return rank[a] >= rank[b] ? a : b;
}

function conditionRank(c: ConditionGrade): number {
  return CONDITION_ORDER.indexOf(c);
}

export const RISK_LABEL: Record<RiskLevel, string> = {
  low: 'Düşük',
  medium: 'Orta',
  high: 'Yüksek',
};

export const LIQUIDITY_LABEL: Record<LiquidityLevel, string> = {
  low: 'Düşük',
  medium: 'Orta',
  high: 'Yüksek',
};
