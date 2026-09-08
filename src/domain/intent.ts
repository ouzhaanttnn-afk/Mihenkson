/**
 * MIHENKAYNAK — Müşteri niyeti ve gün karakteri
 * Kaynak: Ekonomi Ara Düzeltmesi v1.0 · §3 "Müşteri dağılımı".
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TERMİNOLOJİ (§3, bağlayıcı):
 *   "Alış"  = OYUNCUNUN MÜŞTERİYE sarrafiye satması  → TradeSide 'shopSells'
 *   "Satış" = MÜŞTERİNİN OYUNCUYA sarrafiye satması  → TradeSide 'shopBuys'
 *
 *   "Uygulama boyunca bu terminoloji tutarlı kullanılmalıdır."
 *   Kafa karışıklığını kökten kesmek için kod tarafında yalnız
 *   `customerBuys` / `customerSells` isimleri kullanılır: niyet her zaman
 *   MÜŞTERİNİN fiilidir, dükkânın değil.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Haftalık erişilebilir ekonomi: dört satış ağırlıklı gün, bir bozdurma
 * günü ve bir hibrit gün. %20 mevcut sürpriz havuzu ayrıca korunur. Bunlar
 * ağırlıktır; kota veya catch-up değildir.
 *
 * DEĞİŞMEZ (§3): "Dinamik havuzun tamamını tek yöne yığarak fiili alış-satış
 * dengesini SÜREKLİ biçimde bozmak yasaktır; sapmalar kontrollü, sınırlı ve
 * telemetriyle izlenebilir olmalıdır."
 * Bu yüzden dinamik havuzun yön eğimi `maxDynamicTilt` ile kelepçelidir;
 * haftalık ana yön ise oyuncuya açıkça gösterilen tezgâh ritminden gelir.
 */

import { t } from '@i18n/index';
import { INTENT_MIX } from './balance';
import { dailyIntentSplit, dailyTraffic, tradeDayKind, type TradeDayKind } from './v5-rules';
import { Rng, deriveSeed } from './rng';
import type { CustomerIntent, GameDay, MarketState } from './types';

/**
 * Günün karakteri — V5'in %20'lik dinamik havuzu.
 *
 * "Dinamik havuz; toplu sipariş olasılığı, ürün karması, hacim bandı, müşteri
 * kalitesi, aciliyet ve gün içi yoğunluk gibi nitelikleri etkileyebilir."
 *
 * Dikkat: buradaki hiçbir alan günlük ana split'i değiştirmez. Havuz NİYETİN
 * PAYINI değil, niyetin NASIL göründüğünü belirler.
 */
export interface DayCharacter {
  day: GameDay;
  /** Bir müşterinin toplu sipariş getirme olasılığı (§4.1). */
  bulkOrderChance: number;
  /** Sarrafiye ağırlığı: 0 = tamamen işçilikli, 1 = tamamen sarrafiye. */
  bullionBias: number;
  /** Standart hacim bandının çarpanı. */
  volumeScale: number;
  /** Müşteri kalitesi eğimi (bütçe, bilgi, itibar): -1 .. +1. */
  qualityTilt: number;
  /** Aciliyet eğimi: -1 .. +1. */
  urgencyTilt: number;
  /** Gün içi yoğunluk — müşteri arası bekleme çarpanı (küçük = yoğun). */
  tempo: number;
  /**
   * Dinamik havuzun yön eğimi: +1 tamamen müşteri alışına, -1 tamamen
   * müşteri satışına. `INTENT_MIX.maxDynamicTilt` ile kelepçelidir.
   */
  dynamicTilt: number;
  /** Oyuncuya gösterilecek okunabilir gün etiketi (§5.2 sinyal dili). */
  label: string;
}

/**
 * Günün karakterini deterministik üretir. (rootSeed, day) ikilisi günü
 * tamamen belirler — gün içinde yeniden hesaplamak aynı sonucu verir.
 */
export function dayCharacter(rootSeed: number, day: GameDay, market: MarketState): DayCharacter {
  const rng = new Rng(deriveSeed(rootSeed, 'day/character', day));

  // Piyasa rejimi karakteri besler ama belirlemez: şok günü daha aceleci ve
  // daha sarrafiye ağırlıklı geçer, sakin gün daha seçici.
  const stress = market.regime === 'shock' ? 1 : market.regime === 'volatile' ? 0.6 : market.regime === 'calm' ? -0.4 : 0;

  const bulkOrderChance = clamp(rng.range(0.06, 0.2) + stress * 0.06, 0.02, 0.34);
  const bullionBias = clamp(rng.range(0.35, 0.7) + stress * 0.12, 0.15, 0.9);
  const volumeScale = clamp(rng.range(0.75, 1.35) + stress * 0.1, 0.5, 1.8);
  const qualityTilt = clamp(rng.range(-1, 1) - stress * 0.2, -1, 1);
  const urgencyTilt = clamp(rng.range(-1, 1) + stress * 0.35, -1, 1);
  // §3 kelepçesi: eğim asla havuzun tamamını tek yöne yığamaz.
  const dynamicTilt = clamp(rng.range(-1, 1), -1, 1) * INTENT_MIX.maxDynamicTilt;

  return {
    day,
    bulkOrderChance,
    bullionBias,
    volumeScale,
    qualityTilt,
    urgencyTilt,
    tempo: 1 / dailyTraffic(rootSeed, day).multiplier,
    dynamicTilt,
    label: characterLabel(tradeDayKind(day)),
  };
}

/**
 * Bir müşterinin niyetini üretir.
 *
 * Günlük split ilk %80'i iki yöne ayırır; son %20 mevcut sürpriz havuzudur.
 * Önceki müşteri sayıları veya stok açığı bu zarın girdisi değildir.
 */
export function rollIntent(
  rootSeed: number,
  spawnIndex: number,
  character: DayCharacter,
): { intent: CustomerIntent; fromDynamicPool: boolean } {
  const rng = new Rng(deriveSeed(rootSeed, 'customer/intent', spawnIndex));
  const roll = rng.next();

  const split = dailyIntentSplit(rootSeed, character.day);
  if (roll < split.customerBuys) {
    return { intent: 'buy', fromDynamicPool: false };
  }
  if (roll < split.customerBuys + split.customerSells) {
    return { intent: 'sell', fromDynamicPool: false };
  }

  // --- Dinamik havuz (%20) ---
  // Havuzun bir kısmı ticaret dışı niyetlere gider (servis ve ekspertiz);
  // kalanı kelepçeli eğimle alış/satış arasında paylaşılır.
  //
  // Ticaret dışı niyetler yalnız bu %20'nin içinden
  // çıkar. Günlük ana split korunur — ekspertizin eklenmesi
  // alış-satış dengesini değiştirmez, yalnız dinamik havuzun içini böler.
  const inner = rng.next();
  if (inner < INTENT_MIX.dynamicServiceShare) {
    return { intent: 'service', fromDynamicPool: true };
  }
  if (inner < INTENT_MIX.dynamicServiceShare + INTENT_MIX.dynamicAppraisalShare) {
    return { intent: 'appraisal', fromDynamicPool: true };
  }

  // tilt +1 → tamamı alışa, -1 → tamamı satışa. Kelepçe zaten uygulandı.
  const buyShare = 0.5 + character.dynamicTilt / 2;
  const pick = rng.next();
  return { intent: pick < buyShare ? 'buy' : 'sell', fromDynamicPool: true };
}

// ---------------------------------------------------------------------------
// Telemetri — §3 "Dağılım, uygun örneklem penceresinde üretilen intentler
// üzerinden izlenir; tek tek kısa seanslarda birebir yüzde garantisi aranmaz."
// ---------------------------------------------------------------------------

export interface IntentTelemetry {
  total: number;
  counts: Record<CustomerIntent, number>;
  fromDynamicPool: number;
}

export function emptyTelemetry(): IntentTelemetry {
  return {
    total: 0,
    counts: { buy: 0, sell: 0, service: 0, appraisal: 0 },
    fromDynamicPool: 0,
  };
}

export function recordIntent(
  telemetry: IntentTelemetry,
  intent: CustomerIntent,
  fromDynamicPool: boolean,
): IntentTelemetry {
  return {
    total: telemetry.total + 1,
    counts: { ...telemetry.counts, [intent]: telemetry.counts[intent] + 1 },
    fromDynamicPool: telemetry.fromDynamicPool + (fromDynamicPool ? 1 : 0),
  };
}

/** Gerçekleşen paylar — denge turlarında ve §12 kabul testlerinde okunur. */
export function intentShares(tel: IntentTelemetry): Record<CustomerIntent, number> {
  const n = Math.max(1, tel.total);
  return {
    buy: tel.counts.buy / n,
    sell: tel.counts.sell / n,
    service: tel.counts.service / n,
    appraisal: tel.counts.appraisal / n,
  };
}

/**
 * §3 "fiili alış-satış dengesi" — 1'e yakın olmalı. Sürekli tek yöne
 * yığılma bu oranı kalıcı olarak bozardı.
 */
export function tradeBalance(tel: IntentTelemetry): number {
  return tel.counts.buy / Math.max(1, tel.counts.sell);
}

/**
 * §11 "Dinamik havuz sapması: TELEMETRİ ALARMI ve SINIRLANDIRMA devreye
 * girer; ana split sürpriz havuzuna AKTARILMAZ. V5 alarmı yalnız ölçümdür."
 *
 * Alarm iki şeyi ayrı ayrı denetler:
 *   1. Sabit tabanların altına inilmiş mi (aktarım olmuş mu),
 *   2. Fiili alış-satış dengesi izin verilen bandın dışına çıkmış mı.
 *
 * Kısa seansta yüzde garantisi aranmaz (§3), bu yüzden alarm ancak yeterli
 * örneklem birikince konuşur. Erken alarm, gürültüyü sapma sanmak olurdu.
 */
export interface IntentAlarm {
  /** Örneklem alarm için yeterli mi. */
  sampled: boolean;
  /** Sabit taban korunuyor mu. */
  baseIntact: boolean;
  /** Alış-satış dengesi bandın içinde mi. */
  balanced: boolean;
  /** Ölçülen denge oranı (alış / satış). */
  balance: number;
  /** İnsan okunur uyarı; sorun yoksa null. */
  warning: string | null;
}

export function intentAlarm(tel: IntentTelemetry): IntentAlarm {
  const shares = intentShares(tel);
  const balance = tradeBalance(tel);
  const sampled = tel.total >= INTENT_MIX.alarmMinSample;

  // Örneklem hatası payı: küçük pencerede taban biraz altına inebilir.
  const tolerance = INTENT_MIX.baseTolerance;
  const baseIntact =
    shares.buy >= INTENT_MIX.minimumTradeShare - tolerance &&
    shares.sell >= INTENT_MIX.minimumTradeShare - tolerance;

  const balanced =
    balance >= .20 / .65 - tolerance && balance <= .65 / .20 + tolerance;

  let warning: string | null = null;
  if (sampled && !baseIntact) {
    warning = t('Ölçülen niyet oranı beklenen tabanın altında; kısa örneklem sapabilir. Telafi müşterisi üretilmez.');
  } else if (sampled && !balanced) {
    warning = t('Alış-satış dengesi bandın dışında ({oran}).', { oran: balance.toFixed(2) });
  }

  return { sampled, baseIntact, balanced, balance, warning };
}

function characterLabel(kind: TradeDayKind): string {
  if (kind === 'sales') return t('Bugün genellikle satış günü');
  if (kind === 'buyback') return t('Bugün genellikle alış günü');
  if (kind === 'hybrid') return t('Bugün alış ve satış dengeli');
  return t('Bugün planlama günü');
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
