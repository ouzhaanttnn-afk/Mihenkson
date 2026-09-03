/**
 * MIHENKAYNAK — Overnight exposure
 * Kaynak: Ekonomi Ara Düzeltmesi v1.0 · §5, §5.2; GDD 14.3, 34.5.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * §5 DEĞİŞMEZ: "Gün kapanışında oyuncunun nakit ve altın dağılımı bir
 * POZİSYONDUR. Altında kalmak fiyat düşüşüne, nakitte kalmak ise fiyat
 * yükselişi karşısında FIRSAT MALİYETİNE maruz bırakır. Sistem, her iki
 * seçeneği de KOŞULSUZ GÜVENLİ veya SÜREKLİ ÜSTÜN hale getirmemelidir."
 *
 * Bu modül o cümlenin iki yarısını da görünür kılar. Yalnız altının
 * değer kaybını göstermek, nakdi koşulsuz güvenli ilan etmek olurdu;
 * fırsat maliyeti de aynı ekranda, aynı ağırlıkta durur.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * DEĞİŞMEZ (GDD 34.5): Buradaki hiçbir sayı GERÇEKLEŞMİŞ KÂRA yazılmaz.
 * Overnight sonucu bir POZİSYON RAPORUdur: altın hâlâ stoktadır, satılmamıştır.
 * Fırsat maliyeti ise hiç var olmamış bir paradır — muhasebeye girmesi
 * uydurma gelir yaratırdı.
 */

import { tl } from '@i18n/money';
import { isBullion } from '@data/bullion';
import { MARKET_DAILY_CAP } from './balance';
import { closedDaysBefore, isLastTradingDay, nextMarketOpenDay, weekdayLabel } from './calendar';
import type { GameDay, InventoryPosition, ItemInstance, MarketState, Money } from './types';

/** Gün kapanışında alınan pozisyon. */
export interface OvernightPosition {
  day: GameDay;
  /** Kasadaki nakit. */
  cash: Money;
  /** Metale bağlı değer (sarrafiye + işçilikli ürünün metal kısmı). */
  metalValue: Money;
  /** Metalin toplam pozisyona oranı: 0 = tamamen nakit, 1 = tamamen altın. */
  metalShare: number;
  /** Referans spot — ertesi günün karşılaştırma tabanı. */
  goldSpot: number;
}

/** Ertesi sabah pozisyonun ne yaptığı. */
export interface OvernightOutcome {
  position: OvernightPosition;
  /** Gecelik spot değişimi (oran). */
  spotChange: number;
  /**
   * §5 — ALTINDA KALMANIN sonucu. Pozitifse altın kazandırdı, negatifse
   * kaybettirdi. GERÇEKLEŞMEMİŞTİR: mal hâlâ stokta.
   */
  metalDelta: Money;
  /**
   * §5 — NAKİTTE KALMANIN sonucu: fiyat yükselirken elde tutulan nakdin
   * FIRSAT MALİYETİ. Bu para hiç var olmadı; kaybedilmiş bir kazançtır.
   */
  cashOpportunityCost: Money;
  /** Kapanış ile bir sonraki piyasa açılışı arasındaki kapalı gün sayısı. */
  gapDays: number;
  /** Oyuncuya gösterilecek tarafsız özet — kesinlik dili YOK. */
  summary: string;
}

/**
 * Kapanış pozisyonunu ölçer.
 *
 * Metal değeri için stok maliyeti değil GÜNCEL değer kullanılır: pozisyon
 * riski bugünün fiyatına maruzdur, geçmişte ne ödendiğine değil.
 */
export function measurePosition(
  day: GameDay,
  cash: Money,
  inventory: InventoryPosition[],
  items: Record<string, ItemInstance>,
  market: MarketState,
): OvernightPosition {
  const metalValue = inventory.reduce((sum, position) => {
    const item = items[position.itemId];
    if (!item) return sum;
    // Sarrafiye tamamen metale bağlıdır; işçilikli üründe metal payı
    // kabaca değerin bir kısmıdır — işçilik ve taş spot'la hareket etmez.
    const exposure = isBullion(item.templateId) ? 1 : METAL_SHARE_CRAFTED;
    return sum + Math.round(position.currentValue * exposure);
  }, 0);

  const total = cash + metalValue;
  return {
    day,
    cash,
    metalValue,
    metalShare: total > 0 ? metalValue / total : 0,
    goldSpot: market.goldSpot,
  };
}

/**
 * Pozisyonun gecelik sonucu.
 *
 * §5'in iki yarısı da hesaplanır ve İKİSİ DE döndürülür. Yalnız birini
 * göstermek, diğer seçeneği koşulsuz güvenli ilan etmek olurdu.
 */
export function resolveOvernight(
  position: OvernightPosition,
  nextMarket: MarketState,
): OvernightOutcome {
  const spotChange =
    position.goldSpot > 0 ? (nextMarket.goldSpot - position.goldSpot) / position.goldSpot : 0;

  // Altında kalmanın sonucu — her iki yönde de.
  // Sıfır normalize edilir: metal yokken düşen piyasada "−0 ₺" yazmak
  // olmayan bir kayıp göstermek olurdu.
  const metalDelta = normalizeZero(Math.round(position.metalValue * spotChange));

  // Nakitte kalmanın sonucu: yalnız fiyat YÜKSELDİĞİNDE bir maliyet vardır.
  // Fiyat düşerken nakit tutmak bir kazanç değil, kaçınılmış bir zarardır;
  // onu "kâr" gibi göstermek nakdi sürekli üstün gösterirdi.
  const cashOpportunityCost = spotChange > 0 ? Math.round(position.cash * spotChange) : 0;
  const gapDays = nextMarket.gapDays ?? 0;

  return {
    position,
    spotChange,
    metalDelta,
    cashOpportunityCost,
    gapDays,
    summary: describeOutcome(position, spotChange, metalDelta, cashOpportunityCost, gapDays),
  };
}

function normalizeZero(n: number): number {
  return n === 0 ? 0 : n;
}

function describeOutcome(
  position: OvernightPosition,
  spotChange: number,
  metalDelta: Money,
  opportunityCost: Money,
  gapDays: number,
): string {
  const period = gapDays > 0 ? `${gapDays} kapalı gün sonrası açılışta` : 'Gecelik';
  if (Math.abs(spotChange) < 0.0005) return `${period} fiyat neredeyse yerinde kaldı.`;

  if (spotChange > 0) {
    return position.metalShare >= 0.5
      ? `${period} fiyat yükseldi; ağırlığı altında taşımak işe yaradı.`
      : `${period} fiyat yükseldi; nakitte kalan kısım ${tl(Math.abs(opportunityCost))} tutarında fırsatı kaçırdı.`;
  }

  return position.metalShare >= 0.5
    ? `${period} fiyat düştü; altında kalan pozisyon ${tl(Math.abs(metalDelta))} geriledi.`
    : `${period} fiyat düştü; nakit ağırlığı zararı sınırladı.`;
}

export interface WeekendRisk {
  closedDays: number;
  nextOpenDay: GameDay;
  maxEstimatedExposure: Money;
  note: string;
}

/** Cuma kapanışında oyuncuya yön değil, kapalı gün boyunca taşıdığı riski gösterir. */
export function weekendRisk(day: GameDay, position: OvernightPosition): WeekendRisk | null {
  if (!isLastTradingDay(day)) return null;
  const nextOpenDay = nextMarketOpenDay(day);
  const closedDays = closedDaysBefore(nextOpenDay);
  const maxEstimatedExposure = Math.round(
    position.metalValue * MARKET_DAILY_CAP * Math.sqrt(closedDays + 1),
  );
  return {
    closedDays,
    nextOpenDay,
    maxEstimatedExposure,
    note: `Piyasa ${closedDays} gün kapalı kalacak; ${weekdayLabel(nextOpenDay)} açılışına kadar fiyat donuk görünür. Altın pozisyonunun tahmini açılış riski ±${tl(maxEstimatedExposure)} bandındadır.`,
  };
}

// ---------------------------------------------------------------------------
// §5.2 — OYUNCUYA VERİLEN SİNYALLER
// ---------------------------------------------------------------------------

export type RiskLevel = 'low' | 'medium' | 'high';

export interface MarketSignal {
  label: string;
  detail: string;
  level: RiskLevel;
}

/**
 * §5.2: "Oyuncuya rejim, volatilite, talep baskısı, olay riski ve kanal
 * koşulları hakkında OKUNABİLİR sinyaller verilir. Sinyaller karar
 * desteğidir; ertesi gün YÖNÜNÜ VEYA BÜYÜKLÜĞÜNÜ GARANTİ ETMEZ. Yanlış
 * kesinlik yaratacak 'kesin yükselecek/düşecek' dili KULLANILMAZ."
 *
 * Bu yüzden sinyaller yön değil KOŞUL bildirir. Hiçbiri "yükselecek"
 * demez; "hareket büyük olabilir" der. Fark, oyuncunun kararı kendi
 * vermesi ile sisteme uyması arasındaki farktır.
 */
export function marketSignals(
  market: MarketState,
  position: OvernightPosition | null,
): MarketSignal[] {
  const signals: MarketSignal[] = [];

  signals.push({
    label: 'Rejim',
    detail: REGIME_NOTE[market.regime],
    level: market.regime === 'shock' ? 'high' : market.regime === 'volatile' ? 'medium' : 'low',
  });

  const volLevel: RiskLevel =
    market.volatility >= 0.015 ? 'high' : market.volatility >= 0.008 ? 'medium' : 'low';
  signals.push({
    label: 'Oynaklık',
    detail:
      volLevel === 'high'
        ? 'Hareketin büyüklüğü bugün geniş bir bantta olabilir.'
        : volLevel === 'medium'
          ? 'Orta ölçekli hareket görülebilir.'
          : 'Hareketin dar kalması bekleniyor.',
    level: volLevel,
  });

  if (market.activeEvent) {
    signals.push({
      label: 'Olay',
      detail: `${market.activeEvent.label} · ${market.activeEvent.affects.join(', ')}`,
      level: 'medium',
    });
  }

  if (position) {
    // §5 — pozisyonun kendisi bir sinyaldir; ama hangisinin doğru olduğunu
    // söylemez, yalnız neye maruz kaldığını söyler.
    const share = Math.round(position.metalShare * 100);
    signals.push({
      label: 'Pozisyon',
      detail:
        share >= 65
          ? `Servetinin %${share}'sı altına bağlı; fiyat düşüşüne açıksın.`
          : share <= 35
            ? `Varlığın %${100 - share}'i nakitte; yükselişte fırsat maliyeti taşırsınız.`
            : `Altın %${share} / nakit %${100 - share} — dengeli duruyorsunuz.`,
      level: share >= 80 || share <= 15 ? 'medium' : 'low',
    });
  }

  return signals;
}

const REGIME_NOTE: Record<MarketState['regime'], string> = {
  calm: 'Sakin koşullar; alış-satış farkı dar kalma eğiliminde.',
  normal: 'Olağan koşullar.',
  volatile: 'Oynak koşullar; alış-satış farkı açılabilir.',
  shock: 'Stres koşulları; kapasite daralır, alış-satış farkı açılır.',
};

/** İşçilikli üründe değerin metale bağlı kabul edilen payı. */
const METAL_SHARE_CRAFTED = 0.72;
