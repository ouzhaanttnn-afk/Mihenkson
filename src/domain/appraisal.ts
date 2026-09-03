/**
 * MIHENKAYNAK — Ekspertiz / danışma akışı
 * Kaynak: GDD 23.23 müşteri niyeti matrisi, beşinci akış:
 *   "appraisal → İncele → Test → Rapor/Ücret → Sonuç"
 * ayrıca GDD 7 (bilgi satın alma), 6.6 (gizli gerçek), 17.1 "Ekspertiz Raporu"
 * (ücret + güven), 22.1 (tek settlement), 34.3 (belirlenimli sonuç).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * BU AKIŞ NE DEĞİLDİR
 *
 * Ekspertiz bir ALIM SATIM değildir. Müşteri ürününü satmaya gelmez; ürünün
 * ne olduğunu ÖĞRENMEYE gelir ve bu bilginin karşılığını öder. Bu yüzden:
 *   · stok hareketi YOKTUR — ürün müşterinindir, müşteriyle gider
 *   · pazarlık durum makinesi kullanılmaz — pazarlık edilen bir mal yok
 *   · nakit yalnız ÜCRET kadar hareket eder
 *
 * OYUNUN ÇEKİRDEK GERİLİMİ BURADA TERSİNE DÖNER: ticaret akışında bilgi
 * eksikliği yanlış FİYAT verdirir; ekspertizde yanlış SÖZ verdirir. Oyuncu
 * ölçmediği bir şeye kesin konuşursa itibarını riske atar. GDD 7'nin "araçlar
 * doğru cevabı açan buton değildir" ilkesi burada doğrudan itibara bağlanır.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * DEĞİŞMEZ (GDD 34.3): sonuç belirlenimlidir. Aynı rapor + aynı ücret her
 * zaman aynı cevabı alır. Reddedilen bir ücreti tekrar denemek yeni bir zar
 * atmaz — atılacak zar yoktur.
 *
 * DEĞİŞMEZ (GDD 6.6): hiçbir fonksiyon gizli gerçeği oyuncuya SIZDIRMAZ.
 * Ücret önerisi oyuncunun KENDİ bandından türer, gerçek değerden değil.
 * Gerçek değer yalnız rapor verildikten SONRA, sonucu hesaplamak için okunur.
 *
 * KAPSAM SINIRI: bu dosya kasa/stok yazmaz. Yalnız bir SettlementTransaction
 * tarifi üretir; uygulamayı applyTransaction yapar (GDD 22.1).
 */

import { t } from '@i18n/index';
import { APPRAISAL } from './balance';
import { trueValue } from './valuation';
import type {
  AppraisalStance,
  Customer,
  GameDay,
  ItemInstance,
  MarketState,
  Money,
  SettlementTransaction,
  ValuationBand,
} from './types';

// ---------------------------------------------------------------------------
// 1. RAPOR DURUŞU (GDD 23.23 "Rapor/Ücret")
// ---------------------------------------------------------------------------

/**
 * Oyuncunun raporda ne kadar KESİN konuştuğu.
 *
 * Bu, ölçümün kendisi değildir — ölçüm zaten `band` içinde durur. Duruş,
 * oyuncunun o ölçümü müşteriye nasıl SUNDUĞUDUR. Oyunun kararı budur:
 * ölçtüğünden fazlasını söylersen daha çok para, daha çok risk.
 */
export interface StanceProfile {
  id: AppraisalStance;
  label: string;
  description: string;
  /** Raporlanan bandın, ölçülen banda göre genişlik çarpanı. */
  bandScale: number;
  /** Ücretin taban orana göre çarpanı. */
  feeMultiplier: number;
  /** Rapor tutarsa itibar kazancı çarpanı. */
  trustUpside: number;
  /** Rapor tutmazsa itibar kaybı çarpanı. */
  trustDownside: number;
}

export const STANCES: StanceProfile[] = [
  {
    id: 'cautious',
    label: 'Temkinli',
    description: 'Geniş bir aralık verir. Az kazandırır, neredeyse hiç yanılmaz.',
    bandScale: APPRAISAL.cautiousBandScale,
    feeMultiplier: 0.6,
    trustUpside: 0.5,
    trustDownside: 0.6,
  },
  {
    id: 'measured',
    label: 'Ölçülü',
    description: 'Ölçtüğün bandı olduğu gibi söyler. Dürüst ekspertiz.',
    bandScale: 1,
    feeMultiplier: 1,
    trustUpside: 1,
    trustDownside: 1,
  },
  {
    id: 'assertive',
    label: 'Kesin',
    description: 'Dar bir rakam verir. En yüksek ücret, en yüksek itibar riski.',
    bandScale: APPRAISAL.assertiveBandScale,
    feeMultiplier: 1.55,
    trustUpside: 1.7,
    trustDownside: 2.1,
  },
];

export const STANCE_BY_ID = new Map(STANCES.map((s) => [s.id, s]));

export function getStance(id: AppraisalStance): StanceProfile {
  const s = STANCE_BY_ID.get(id);
  if (!s) throw new Error(`Bilinmeyen rapor duruşu: ${id}`);
  return s;
}

// ---------------------------------------------------------------------------
// 2. RAPORLANAN BAND
// ---------------------------------------------------------------------------

/**
 * Oyuncunun müşteriye SÖYLEDİĞİ aralık.
 *
 * Ölçülen bandın merkezinde durur ve duruşa göre daralır/genişler. Merkez
 * kaymaz: oyuncu bandını kaydıramaz, yalnız ne kadar iddialı konuştuğunu
 * seçer. Kaydırabilseydi bu bir rapor değil bir teklif olurdu.
 */
export function reportedRange(band: ValuationBand, stance: AppraisalStance): {
  min: Money;
  max: Money;
} {
  const profile = getStance(stance);
  const scaled = ((band.max - band.min) / 2) * profile.bandScale;

  // Alt genişlik (bkz. balance.ts minReportHalfWidth): tam ölçülmüş bir üründe
  // band sıfıra çöker ve rapor 1 ₺'lik yuvarlama farkıyla "yanlış" sayılırdı.
  // Ölçmek oyuncuyu cezalandıramaz; eksper de kuruşu kuruşuna konuşmaz.
  const floor = Math.max(
    APPRAISAL.minReportHalfWidth,
    band.mid * APPRAISAL.minReportHalfWidthRatio,
  );
  const half = Math.max(scaled, floor);

  return {
    min: Math.max(0, Math.round(band.mid - half)),
    max: Math.round(band.mid + half),
  };
}

// ---------------------------------------------------------------------------
// 3. ÜCRET (GDD 17.1 "Ekspertiz Raporu — güven + ücret")
// ---------------------------------------------------------------------------

/**
 * Önerilen ücret.
 *
 * GDD 6.6 gereği oyuncunun KENDİ bandının orta noktasından türer. Gerçek
 * değerden türetseydik, ücret rakamının kendisi ölçülmemiş bir ürünün gerçek
 * değerini ele verirdi — test yapmadan fiyat okunurdu.
 */
export function suggestedFee(band: ValuationBand, stance: AppraisalStance): Money {
  const profile = getStance(stance);
  const raw = band.mid * APPRAISAL.baseFeeRatio * profile.feeMultiplier;
  return Math.max(APPRAISAL.minFee, Math.round(raw / 5) * 5);
}

/** Oyuncunun ücreti hangi aralıkta belirleyebileceği. */
export function feeBounds(band: ValuationBand, stance: AppraisalStance): {
  min: Money;
  max: Money;
} {
  const suggested = suggestedFee(band, stance);
  return {
    min: APPRAISAL.minFee,
    max: Math.max(APPRAISAL.minFee, Math.round(suggested * APPRAISAL.maxFeeOverAsk)),
  };
}

/**
 * Müşterinin ödemeyi kabul edeceği en yüksek ücret — SPAWN ANINDA SABİT
 * niteliklerden türer (GDD 9.3 / 34.2). Rapor duruşu tavanı etkiler: kesin
 * konuşan ekspertiz daha çok değer taşır, ama tavan sonsuz değildir.
 *
 * Gerçek değere bağlıdır çünkü müşteri ürününün ne ettiğini kabaca bilir;
 * bu sayı oyuncuya HİÇBİR ZAMAN gösterilmez.
 */
export function feeCeiling(
  item: ItemInstance,
  market: MarketState,
  customer: Customer,
  stance: AppraisalStance,
): Money {
  const profile = getStance(stance);
  const value = trueValue(item, market);

  // Bilgili müşteri ekspertizin ne ettiğini bilir ve fazlasını ödemez;
  // fiyata duyarlı müşteri her kalemde olduğu gibi burada da kısar.
  const knowledgeAdjust = 1 - ((customer.knowledge - 50) / 50) * APPRAISAL.knowledgeSqueeze;
  const sensitivityAdjust = 1 - (customer.priceSensitivity / 100) * APPRAISAL.sensitivitySqueeze;
  const statusAdjust = 1 + (customer.status / 100) * APPRAISAL.statusStretch;

  const ceiling =
    value *
    APPRAISAL.baseFeeRatio *
    APPRAISAL.ceilingSlack *
    profile.feeMultiplier *
    knowledgeAdjust *
    sensitivityAdjust *
    statusAdjust;

  return Math.max(APPRAISAL.minFee, Math.round(ceiling));
}

// ---------------------------------------------------------------------------
// 4. SONUÇ (GDD 23.23 "Sonuç")
// ---------------------------------------------------------------------------

export interface AppraisalVerdict {
  /** Müşteri ücreti ödedi mi. */
  paid: boolean;
  /** Ödenen tutar (reddedildiyse 0). */
  fee: Money;
  /** Raporun kapsadığı aralık. */
  reported: { min: Money; max: Money };
  /** Ürünün gerçek değeri — yalnız rapor verildikten SONRA açılır. */
  actualValue: Money;
  /** Gerçek değer raporlanan aralığın içinde mi. */
  accurate: boolean;
  /**
   * Raporun ıskası: gerçek değer bandın dışındaysa, ne kadar dışında
   * kaldığının gerçek değere oranı. İçindeyse 0.
   */
  missRatio: number;
  trustDelta: number;
  reputationDelta: number;
  /** Oyuncuya gösterilecek tek satırlık sonuç metni. */
  summary: string;
}

/**
 * Ekspertizin sonucu — TAMAMEN BELİRLENİMLİ (GDD 34.3).
 *
 * Zar yoktur: ücret tavanı müşterinin spawn'da sabitlenmiş niteliklerinden,
 * doğruluk ise ürünün spawn'da sabitlenmiş gerçeğinden çıkar. Aynı rapor
 * aynı cevabı verir; reload yeniden denemek değildir.
 */
export function resolveAppraisal(input: {
  item: ItemInstance;
  market: MarketState;
  customer: Customer;
  band: ValuationBand;
  stance: AppraisalStance;
  fee: Money;
  /** Oyuncunun bu üründe kaç test yaptığı — emeğin karşılığı. */
  testsUsed: number;
}): AppraisalVerdict {
  const { item, market, customer, band, stance, fee, testsUsed } = input;
  const profile = getStance(stance);
  const reported = reportedRange(band, stance);
  const actualValue = trueValue(item, market);

  const ceiling = feeCeiling(item, market, customer, stance);
  const paid = fee <= ceiling;

  const accurate = actualValue >= reported.min && actualValue <= reported.max;
  const missAmount = accurate
    ? 0
    : actualValue < reported.min
      ? reported.min - actualValue
      : actualValue - reported.max;
  const missRatio = actualValue > 0 ? missAmount / actualValue : 0;

  // --- İtibar ---
  // Ücret reddedilse bile rapor verilmiştir: müşteri bilgiyi almış, parayı
  // vermemiştir. Doğru rapor yine küçük bir itibar kazandırır — GDD 17.1
  // ekspertizi "güven + ücret" olarak tarif eder, ikisi ayrı kalemdir.
  let trust: number;
  if (accurate) {
    // Emek karşılığı: hiç test yapmadan tutturmak şanstır, itibarı az besler.
    const effort = Math.min(1, testsUsed / APPRAISAL.effortTests);
    trust =
      APPRAISAL.accurateTrust *
      profile.trustUpside *
      (APPRAISAL.effortFloor + (1 - APPRAISAL.effortFloor) * effort);
  } else {
    // Iska ne kadar büyükse ceza o kadar sert; ama tavanlıdır (GDD 21.1
    // "sert game over yok" — tek hatalı rapor oyunu bitirmez).
    const severity = Math.min(1, missRatio / APPRAISAL.missCap);
    trust = -APPRAISAL.inaccurateTrust * profile.trustDownside * (0.35 + 0.65 * severity);
  }
  if (!paid) trust += APPRAISAL.refusedTrustPenalty;

  const trustDelta = Math.round(clamp(trust, -APPRAISAL.maxTrustSwing, APPRAISAL.maxTrustSwing));
  const reputationDelta = Math.round(trustDelta * APPRAISAL.reputationShare);

  return {
    paid,
    fee: paid ? fee : 0,
    reported,
    actualValue,
    accurate,
    missRatio,
    trustDelta,
    reputationDelta,
    summary: summarize(paid, accurate, profile),
  };
}

function summarize(paid: boolean, accurate: boolean, profile: StanceProfile): string {
  if (!paid) {
    return accurate
      ? t('Rapor doğruydu ama ücreti fazla buldu; ödemeden ayrıldı.')
      : t('Ücreti fazla buldu ve rapora da güvenmedi.');
  }
  if (accurate) {
    return profile.id === 'assertive'
      ? t('Kesin konuştun ve tutturdun; müşteri etkilendi.')
      : t('Rapor tuttu; ücret ödendi.');
  }
  return profile.id === 'assertive'
    ? t('Kesin konuştun ve yanıldın; müşteri bunu unutmayacak.')
    : t('Rapor ürünün gerçek değerini ıskaladı.');
}

// ---------------------------------------------------------------------------
// 5. SETTLEMENT TARİFİ (GDD 22.1)
// ---------------------------------------------------------------------------

/**
 * Ekspertizin settlement işlemi.
 *
 * DİKKAT: `itemsIn` ve `itemsOut` BOŞTUR ve boş kalmalıdır. Ürün hiçbir an
 * dükkânın olmaz. Buraya bir kalem eklemek, müşterinin malını stoğa yazmak
 * ve GDD 34.4'ün "duplicate stok oluşmaz" garantisini kırmak olurdu.
 */
export function appraisalTransaction(input: {
  dealId: string;
  day: GameDay;
  verdict: AppraisalVerdict;
  xpDelta: number;
}): SettlementTransaction {
  const { dealId, day, verdict, xpDelta } = input;
  return {
    txId: `${dealId}_appraisal`,
    dealId,
    day,
    cashDelta: verdict.fee,
    itemsIn: [],
    itemsOut: [],
    trustDelta: verdict.trustDelta,
    reputationDelta: verdict.reputationDelta,
    xpDelta,
    label: verdict.paid ? t('Ekspertiz ücreti') : t('Ekspertiz — ücret alınmadı'),
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}
