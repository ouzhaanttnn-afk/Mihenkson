/**
 * MIHENKAYNAK — Pazarlık durum makinesi
 * Kaynak: GDD 11 "Pazarlık Sistemi", 11.4 "Deterministik pazarlık hafızası",
 *         11.5 "Gerekçe Göster doğruluk kuralı", 34.2–34.3.
 *
 * GDD 11: "Pazarlık refleks mini oyunu değil; bilgi, sabır ve ilişki üzerinden
 * karar oyunudur."
 *
 * DEĞİŞMEZLER — bu dosyanın tamamı bunları korumak için yazılmıştır:
 *  34.2  Rezervasyon fiyatı spawn anında sabitlenir.
 *  34.3  Aynı teklif spam'i yeni kabul şansı üretmez.
 *  11.4  Reload / paneli kapat-aç müşteriyi yeniden üretmez.
 *  11.4  Karşı teklif; profil, state ve önceki tekliflerden TÜRETİLİR.
 *
 * Uygulama kararı: kabul/red kararında HİÇ RASTGELELİK YOKTUR. Skor eşiği
 * aşarsa kabul edilir. Bu sayede "aynı teklifi tekrar dene" hiçbir zaman yeni
 * bir sonuç veremez — çünkü atılacak bir zar yoktur.
 */

import { t } from '@i18n/index';
import { tl } from '@i18n/money';
import { NEGOTIATION, TRUST } from './balance';
import { getArchetype } from '@data/archetypes';
import type {
  Customer,
  TradeSide,
  FieldKnowledge,
  Money,
  NegotiationMove,
  NegotiationResponse,
  NegotiationSession,
  NegotiationState,
} from './types';

/**
 * Yön işareti: +1 oyuncu alıyor (yüksek teklif iyi), -1 oyuncu satıyor
 * (düşük fiyat iyi). Tüm karşılaştırmalar bu işaretle çarpılır.
 */
function dirSign(ctx: NegotiationContext): 1 | -1 {
  return ctx.direction === 'shopSells' ? -1 : 1;
}

/** Yönden bağımsız "teklif eşiği geçti mi" sınaması. */
function meetsThreshold(ctx: NegotiationContext, offer: Money, threshold: Money): boolean {
  return dirSign(ctx) * (offer - threshold) >= 0;
}

/**
 * Teklifin eşiğe göre ne kadar cömert olduğu. 1 = tam eşik, <1 = eşiğin
 * gerisinde. Yön ne olursa olsun "1'e ne kadar yakın" anlamı korunur.
 */
function offerRatio(ctx: NegotiationContext, offer: Money, threshold: Money): number {
  return dirSign(ctx) === 1
    ? offer / Math.max(1, threshold)
    : threshold / Math.max(1, offer);
}

/** Yeni bir pazarlık oturumu. */
export function createSession(lineId: string, itemId: string): NegotiationSession {
  return {
    lineId,
    itemId,
    state: 'OPEN',
    round: 0,
    offerHistory: [],
    moveHistory: [],
    activeCounter: null,
    finalOffer: null,
    settledPrice: null,
    usedReasons: [],
    gesturesUsed: 0,
  };
}

export interface NegotiationContext {
  /** UPDATEv5 economic limits; personality/relationship operate inside this band. */
  economicBand?: { min: number; max: number };
  customer: Customer;
  /**
   * Pazarlığın YÖNÜ (Addendum §3 terminolojisi).
   *   'shopBuys'  — müşteri satış intenti: müşteri satar, oyuncu alır.
   *                 Eşik bir TABANDIR; teklif eşiğe ULAŞINCA kabul edilir.
   *   'shopSells' — müşteri alış intenti: oyuncu satar, müşteri alır.
   *                 Eşik bir TAVANDIR; istenen fiyat eşiğin ALTINDA kalınca
   *                 kabul edilir.
   *
   * İki yön aynı durum makinesini paylaşır. Ayrı bir makine yazmak, GDD
   * 34.3'ün "aynı teklif spam'i yeni sonuç üretmez" garantisini iki yerde
   * ayrı ayrı korumak demekti; tek makine tek garanti demektir.
   */
  direction?: TradeSide;
  /** Semt / marka itibarı (GDD 10.1). */
  reputation: number;
  /** Oyuncunun bu kalem için hesapladığı alış tavanı — yalnız UI önizlemesi için. */
  buyCeiling: Money;
  /**
   * 'shopSells' yönünde müşterinin ÖDEME TAVANI (GDD 6.6: gösterilmez).
   * purchase.ts'in `purchaseCeiling()` çıktısıdır; paketi oyuncu seçtiği için
   * TL karşılığı orada hesaplanır, oranı spawn anında sabittir (GDD 34.2).
   */
  purchaseCeiling?: Money;
  /** Bilgi durumu — 'gerekçe' hamlesinin geçerliliğini denetler (GDD 11.5). */
  knowledge: FieldKnowledge[];

  /**
   * Pazarlık payının etrafında sıkıştığı ÇAPA — kalemin adil değeri.
   * Verilmezse sıkıştırma uygulanmaz ve davranış eskisiyle birebir aynıdır.
   */
  fairValue?: Money;

  /**
   * Ürün sınıfının pazarlık payı (0–1) — product-classes.ts'ten gelir.
   * Verilmezse 1 sayılır, yani band aynen kalır.
   */
  haggleRoom?: number;
  /** Satış yönünde adil değerin üzerindeki meşru perakende makası. */
  retailSpread?: number;
  /** Tatlı Dil 3: kârlı ama hakaret sayılmayan teklifte kaybı yumuşatır. */
  patienceLossTolerated?: boolean;
}

/**
 * Etkin rezervasyon fiyatı.
 *
 * GDD 35.1: "Yüksek güven her fiyatı kabul ettirmez; ilişki fiyat farkını
 * sınırlı ölçüde tolere eder." Bu yüzden esneme maxReservationFlex ile
 * tavanlıdır — güven biriktirerek fiyatı sınırsız kıramazsınız.
 *
 * Rezervasyonun KENDİSİ hiç değişmez (GDD 34.2); değişen yalnız müşterinin
 * o rezervasyona ne kadar yaklaşılmasını kabul edeceğidir.
 */
export function effectiveReservation(ctx: NegotiationContext, session: NegotiationSession): Money {
  const { customer } = ctx;
  const a = getArchetype(customer.archetype);
  const w = NEGOTIATION.weights;

  // Kapanış skoru bileşenleri (GDD 11.3). Skor oyuncuya gösterilmez.
  const trustPart = ((customer.trust - 50) / 50) * w.trust;
  const urgencyPart = ((customer.urgency - 50) / 50) * w.urgency;
  const reputationPart = ((ctx.reputation - 50) / 50) * w.reputation;
  const reasoningPart = session.usedReasons.length * w.reasoning * a.reasonResponsiveness;
  const gesturePart =
    Math.min(session.gesturesUsed, NEGOTIATION.maxEffectiveGestures) *
    w.gesture *
    a.gestureResponsiveness;

  // Bekleme ve şüphe kabulü zorlaştırır.
  const patienceRatio = customer.patience / Math.max(1, customer.patienceMax);
  const waitingPart = (1 - patienceRatio) * w.waiting;
  const suspicionPart = (customer.suspicion / 100) * w.suspicion;

  const rawFlex =
    trustPart + urgencyPart + reputationPart + reasoningPart + gesturePart + waitingPart + suspicionPart;

  // Esneme tavanlı ve tek yönlü değildir: şüphe negatif esneme üretir, yani
  // müşteri daha da yükseğini ister.
  const flex = clamp(rawFlex, -NEGOTIATION.maxReservationFlex, NEGOTIATION.maxReservationFlex);

  // Arketip eşiği: 1.0 = tam rezervasyon. Fırsatçı > 1, acil nakit < 1.
  //
  // Esneme HER ZAMAN oyuncunun lehinedir: alırken tabanı indirir, satarken
  // tavanı yükseltir. İşaret bu yüzden yöne bağlıdır.
  const sign = dirSign(ctx);
  const base = sign === 1 ? customer.reservationPrice : purchaseThresholdBase(ctx);
  const raw = base * a.closeThreshold * (1 - sign * flex);

  const threshold = scaleToFair(raw, ctx);
  return Math.round(ctx.economicBand ? clamp(threshold, ctx.economicBand.min, ctx.economicBand.max) : threshold);
}

/**
 * Eşiği ürünün gerçek makasına oturtur (product-classes.ts · haggleRoom).
 *
 * TEK YÖNLÜ DEĞİL — İKİ YÖNLÜ ÖLÇEK:
 *   room < 1  → adil değerden sapma DARALIR (sarrafiye: fiyat kamuya açık)
 *   room = 1  → nötr, hiçbir şey değişmez
 *   room > 1  → sapma GENİŞLER (ikinci el işçilikli: fiyatı kimse tam bilmez)
 * Önce yalnız daraltma yapıyordu ve `room >= 1` erken çıkışı genişletmeyi
 * imkânsız kılıyordu. Formül aynı; kapı artık iki yöne de açık.
 *
 * Pazarlık modeli rezervasyonu ARKETİPTEN alır ve ürüne kördür. Bu, ikinci
 * el takıda doğrudur; standart sarrafiyede değildir — çeyreğin fiyatını
 * herkes bilir. Ölçüm: Ata Lira getiren müşteri gerçek değerin %76'sına
 * razı olabiliyordu (dükkânın brüt marjı %13,8). Gerçek sektörde gram başı
 * ~100 ₺, yani ~%2,3'lük tur farkı var.
 *
 * NE YAPMAZ: hiçbir hamleyi iptal etmez. Güven, aciliyet, gerekçe ve jest
 * eşiği aynı YÖNDE aynı ORANDA oynatmaya devam eder — yalnız hepsinin
 * birlikte açtığı aralık ürüne göre ölçeklenir. Sarrafiyede gram başına
 * 5–10 ₺ pazarlık edilir, 500 ₺ değil.
 *
 * NEDEN BURADA: durum makinesine dokunmadan, tek çıkış noktasında.
 * Rezervasyonun KENDİSİ hâlâ hiç değişmez (GDD 34.2); değişen yalnız
 * müşterinin o rezervasyona ne kadar yaklaşılmasını kabul ettiğidir —
 * `effectiveReservation`ın zaten yaptığı iş budur.
 */
function scaleToFair(threshold: number, ctx: NegotiationContext): number {
  const fair = ctx.fairValue;
  const room = ctx.haggleRoom ?? 1;
  // room === 1 nötr: adil değerden sapma olduğu gibi kalır.
  if (fair === undefined || fair <= 0 || room === 1) return threshold;
  const anchor = dirSign(ctx) === -1 ? fair * (1 + (ctx.retailSpread ?? 0)) : fair;
  const scaled = anchor + (threshold - anchor) * Math.max(0, room);
  // Satış çıpası müşterinin spawn anında sabitlenen gerçek tavanını aşamaz.
  return dirSign(ctx) === -1 ? Math.min(scaled, threshold) : scaled;
}

/**
 * 'shopSells' yönünde eşiğin tabanı: müşterinin ödeme tavanı. Bağlam bunu
 * vermediyse rezervasyon fiyatına düşülür — sessizce yanlış yöne çalışmaktansa
 * makul bir taban kullanmak yeğdir.
 */
function purchaseThresholdBase(ctx: NegotiationContext): Money {
  return ctx.purchaseCeiling ?? ctx.customer.reservationPrice;
}

/** Adalet algısının referansı — yön ne olursa olsun müşterinin kendi sınırı. */
function thresholdBaseFor(ctx: NegotiationContext): Money {
  return dirSign(ctx) === 1 ? ctx.customer.reservationPrice : purchaseThresholdBase(ctx);
}

/**
 * Bir pazarlık hamlesini uygular ve müşterinin deterministik yanıtını üretir.
 * Saf fonksiyon — oturumu değiştirmez, yeni oturum + yanıt döndürür.
 */
export function applyMove(
  session: NegotiationSession,
  ctx: NegotiationContext,
  move: NegotiationMove,
): { session: NegotiationSession; response: NegotiationResponse } {
  if (isTerminal(session.state)) {
    // GDD 22.1 — terminal işlem yeniden işlenmez. Çift tap ikinci sonuç üretmez.
    return {
      session,
      response: {
        state: session.state,
        message: t('İşlem tamamlandı.'),
        counterOffer: session.activeCounter,
        patienceDelta: 0,
        trustDelta: 0,
        suspicionDelta: 0,
        wasRepeatOffer: false,
        settledPrice: session.settledPrice,
      },
    };
  }

  switch (move.kind) {
    case 'offer':
      return handleOffer(session, ctx, move);
    case 'reason':
      return handleReason(session, ctx, move);
    case 'gesture':
      return handleGesture(session, ctx, move);
    case 'requestCounter':
      return handleRequestCounter(session, ctx, move);
    case 'acceptCounter':
      return handleAcceptCounter(session, ctx, move);
    case 'reject':
      return handleReject(session, ctx, move);
    case 'package':
      // Paket teklif çoklu ürün katmanında ele alınır (GDD 12.2); tek kalemde
      // anlamsızdır ve UI tarafından zaten gösterilmez.
      return handleNoop(session, t('Bu müşteride paket teklif için yeterli kalem yok.'));
  }
}

// ---------------------------------------------------------------------------
// Teklif
// ---------------------------------------------------------------------------

function handleOffer(
  session: NegotiationSession,
  ctx: NegotiationContext,
  move: NegotiationMove,
): { session: NegotiationSession; response: NegotiationResponse } {
  const offer = Math.max(0, Math.round(move.amount ?? 0));
  const { customer } = ctx;
  const a = getArchetype(customer.archetype);

  // --- ANTI-SPAM (GDD 11.4 / 34.3) ---
  // Aynı teklifi tekrarlamak yeni kabul zarı üretmez. TAM EŞİTLİK: `offer` bu
  // fonksiyonun başında zaten `Math.round()`lanır ve `lastOffer` de aynı
  // yoldan geçmiş bir önceki turun değeridir — göreli bir yüzde eşiği eskiden
  // burada kullanılıyordu, ama pahalı kalemlerde (100.000 ₺+) tek bir slider
  // adımı (50–500 ₺) o yüzdenin altında kalıp GERÇEK bir yeni teklifi "aynı"
  // sayıyor, pazarlık durumu (SERTLEŞTİ/SON TEKLİF) hiç ilerlemiyordu.
  const lastOffer = session.offerHistory[session.offerHistory.length - 1];
  const wasRepeat = lastOffer !== undefined && offer === lastOffer;

  if (wasRepeat) {
    const next: NegotiationSession = {
      ...session,
      round: session.round + 1,
      offerHistory: [...session.offerHistory, offer],
      moveHistory: [...session.moveHistory, move],
    };
    return {
      session: next,
      response: {
        state: session.state,
        message: t('Aynı rakamı tekrar ediyorsunuz. Cevabım değişmedi.'),
        // Karşı teklif de değişmez — yeni bilgi verilmediği için.
        counterOffer: session.activeCounter,
        patienceDelta: -NEGOTIATION.repeatOfferPatiencePenalty,
        trustDelta: -NEGOTIATION.repeatOfferTrustPenalty,
        suspicionDelta: 0,
        wasRepeatOffer: true,
        settledPrice: null,
      },
    };
  }

  const threshold =
    session.state === 'FINAL_OFFER' && session.finalOffer !== null
      ? session.finalOffer
      : effectiveReservation(ctx, session);

  const round = session.round + 1;

  // --- KABUL: deterministik, zar yok ---
  if (meetsThreshold(ctx, offer, threshold)) {
    const next: NegotiationSession = {
      ...session,
      state: 'ACCEPTED',
      round,
      offerHistory: [...session.offerHistory, offer],
      moveHistory: [...session.moveHistory, move],
      settledPrice: offer,
      activeCounter: null,
    };

    // Adil fiyat algısı güveni yükseltir, sert fiyat düşürür (GDD 10.2).
    const fairness = offerRatio(ctx, offer, Math.max(1, thresholdBaseFor(ctx)));
    const trustDelta =
      fairness >= TRUST.fairPriceRatio
        ? TRUST.fairDealGain
        : fairness >= 0.97
          ? Math.round(TRUST.fairDealGain * 0.4)
          : -Math.round(TRUST.harshDealPenalty * (1 - fairness) * 10);

    return {
      session: next,
      response: {
        state: 'ACCEPTED',
        message: acceptMessage(fairness),
        counterOffer: null,
        patienceDelta: -NEGOTIATION.patiencePerRound,
        trustDelta,
        suspicionDelta: 0,
        wasRepeatOffer: false,
        settledPrice: offer,
      },
    };
  }

  // --- RED / SERTLEŞME / KARŞI TEKLİF ---
  const ratio = offerRatio(ctx, offer, threshold);
  const isInsulting = ratio < NEGOTIATION.insultThreshold;
  const badOfferCount = countBadOffers(session, ctx) + (isInsulting ? 1 : 0);

  // Fiyat hassasiyeti yüksek müşteride sabır daha hızlı erir.
  const highProfitPressure = ratio < 0.95 && customer.priceSensitivity >= 70;
  let patienceCost = NEGOTIATION.patiencePerRound + (highProfitPressure ? 1 : 0);
  // Tatlı Dil 3 yalnız makul pazarlık alanını korur. Hakaret seviyesindeki
  // teklif bedelsizleşmez; kârlı ama hâlâ ciddi teklif bir puan daha az yakar.
  if (ctx.patienceLossTolerated && !isInsulting && highProfitPressure) {
    patienceCost = Math.max(1, patienceCost - 1);
  }
  const patienceAfter = customer.patience - patienceCost;
  const patienceRatioAfter = patienceAfter / Math.max(1, customer.patienceMax);

  // --- Durum geçişi (GDD 11.1) ---
  let nextState: NegotiationState = session.state;
  if (patienceRatioAfter <= 0) {
    nextState = 'REJECTED';
  } else if (patienceRatioAfter <= NEGOTIATION.finalOfferPatienceRatio) {
    nextState = 'FINAL_OFFER';
  } else if (badOfferCount >= NEGOTIATION.hardeningTrigger || session.state === 'HARDENING') {
    nextState = 'HARDENING';
  }

  if (nextState === 'REJECTED') {
    return {
      session: {
        ...session,
        state: 'REJECTED',
        round,
        offerHistory: [...session.offerHistory, offer],
        moveHistory: [...session.moveHistory, move],
      },
      response: {
        state: 'REJECTED',
        message: t('Bu fiyatlarla olmayacak. Başka yere bakacağım.'),
        counterOffer: null,
        patienceDelta: -patienceCost,
        trustDelta: -TRUST.rejectPenalty,
        suspicionDelta: 0,
        wasRepeatOffer: false,
        settledPrice: null,
      },
    };
  }

  // --- Karşı teklif: profil + state + teklif geçmişinden TÜRETİLİR (GDD 11.4) ---
  const counter = deriveCounter(session, ctx, nextState, offer, threshold);

  const finalOffer = nextState === 'FINAL_OFFER' ? counter : null;

  const next: NegotiationSession = {
    ...session,
    state: nextState,
    round,
    offerHistory: [...session.offerHistory, offer],
    moveHistory: [...session.moveHistory, move],
    activeCounter: counter,
    finalOffer,
  };

  return {
    session: next,
    response: {
      state: nextState,
      message: counterMessage(nextState, ratio, a.demeanor, isInsulting),
      counterOffer: counter,
      patienceDelta: -patienceCost,
      // Aşırı düşük teklif güveni aşındırır (GDD 21.2 "Kötü pazarlık").
      trustDelta: isInsulting ? -6 : 0,
      suspicionDelta: 0,
      wasRepeatOffer: false,
      settledPrice: null,
    },
  };
}

/**
 * Karşı teklif tamamen türetilmiştir — RNG yoktur.
 * Müşteri rezervasyonunun üstüne, state'e bağlı bir marj koyar; marj tur
 * ilerledikçe daralır. Oyuncunun teklifi yükseldikçe müşteri de yaklaşır.
 */
function deriveCounter(
  session: NegotiationSession,
  ctx: NegotiationContext,
  state: NegotiationState,
  playerOffer: Money,
  threshold: Money,
): Money {
  const key = state === 'FINAL_OFFER' ? 'FINAL_OFFER' : state === 'HARDENING' ? 'HARDENING' : 'OPEN';
  const [startMargin, endMargin] = NEGOTIATION.counterMarginByState[key];

  // Tur ilerledikçe marj startMargin → endMargin arasında iner.
  // Fiyat hassasiyeti yüksek müşteri marjını daha yavaş bırakır — karşı teklif
  // "kendi profilinden" türer (GDD 11.4).
  const stickiness = 0.6 + (ctx.customer.priceSensitivity / 100) * 0.8;
  const progress = Math.min(1, session.round / (4 * stickiness));
  const margin = startMargin + (endMargin - startMargin) * progress;

  // Marj her zaman MÜŞTERİNİN lehine konur: satarken eşiğin üstünü ister,
  // alırken eşiğin altını teklif eder.
  const sign = dirSign(ctx);
  const anchored = threshold * (1 + sign * margin);

  // Müşteri oyuncunun teklifine kısmen yaklaşır — ama asla eşiği geçmez.
  const meetInMiddle = anchored - (anchored - playerOffer) * 0.18;

  const derived = sign === 1
    ? Math.max(threshold, Math.round(Math.max(meetInMiddle, playerOffer)))
    : Math.min(threshold, Math.round(Math.min(meetInMiddle, playerOffer)));

  // Aynı pazarlık durumunda oyuncu müşteriye yaklaşırken karşı tarafın
  // rakamı ters yöne kaçamaz. Sertleşme/son teklif durum geçişleri bu
  // korumanın dışındadır; orada değişimin nedeni ekranda açıkça görünür.
  const counter = session.activeCounter !== null && session.state === state
    ? sign === 1
      ? Math.min(session.activeCounter, derived)
      : Math.max(session.activeCounter, derived)
    : derived;
  return ctx.economicBand ? Math.round(clamp(counter, ctx.economicBand.min, ctx.economicBand.max)) : counter;
}

// ---------------------------------------------------------------------------
// Fiyat dışı hamleler (GDD 11.2)
// ---------------------------------------------------------------------------

/**
 * GDD 11.5 — "Gerekçe yalnız oyuncunun gerçekten bildiği veriye dayanabilir."
 * Doğrulanmamış veriyi kesin gerçek gibi sunmak, müşteri bilgiliyse ters teper.
 */
function handleReason(
  session: NegotiationSession,
  ctx: NegotiationContext,
  move: NegotiationMove,
): { session: NegotiationSession; response: NegotiationResponse } {
  const evidence = move.reasonEvidence;
  if (!evidence) return handleNoop(session, t('Gösterecek doğrulanmış veri yok.'));

  const reasonKey = `${evidence.field}:${evidence.toolId}`;

  // Aynı gerekçe iki kez değer üretmez.
  if (session.usedReasons.includes(reasonKey)) {
    return {
      session: {
        ...session,
        round: session.round + 1,
        moveHistory: [...session.moveHistory, move],
      },
      response: {
        state: session.state,
        message: t('Bunu zaten söylediniz.'),
        counterOffer: session.activeCounter,
        patienceDelta: -1,
        trustDelta: 0,
        suspicionDelta: 0,
        wasRepeatOffer: false,
        settledPrice: null,
      },
    };
  }

  const field = ctx.knowledge.find((k) => k.field === evidence.field);
  const isVerified = !!field && field.certainty >= 0.6 && field.testsApplied.includes(evidence.toolId);

  if (!isVerified) {
    // Yanlış/şüpheli gerekçe: bilgili müşteri fark eder ve güven kaybı olur.
    const knowledgeable = ctx.customer.knowledge >= NEGOTIATION.falseReasonKnowledgeThreshold;
    return {
      session: {
        ...session,
        round: session.round + 1,
        moveHistory: [...session.moveHistory, move],
      },
      response: {
        state: session.state,
        message: knowledgeable
          ? t('Bunu ölçmediniz. Elinizde olmayan bir veriyle konuşuyorsunuz.')
          : t('Peki, siz bilirsiniz.'),
        counterOffer: session.activeCounter,
        patienceDelta: -1,
        trustDelta: knowledgeable ? -NEGOTIATION.falseReasonTrustPenalty : -2,
        suspicionDelta: knowledgeable ? 12 : 4,
        wasRepeatOffer: false,
        settledPrice: null,
      },
    };
  }

  const a = getArchetype(ctx.customer.archetype);
  return {
    session: {
      ...session,
      round: session.round + 1,
      usedReasons: [...session.usedReasons, reasonKey],
      moveHistory: [...session.moveHistory, move],
    },
    response: {
      state: session.state,
      message: reasonReplyFor(a.id, evidence.claim),
      counterOffer: session.activeCounter,
      patienceDelta: 0,
      trustDelta: Math.round(NEGOTIATION.reasonTrustGain * a.reasonResponsiveness),
      // Doğrulanmış veri şüpheyi azaltır.
      suspicionDelta: -6,
      wasRepeatOffer: false,
      settledPrice: null,
    },
  };
}

function handleGesture(
  session: NegotiationSession,
  ctx: NegotiationContext,
  move: NegotiationMove,
): { session: NegotiationSession; response: NegotiationResponse } {
  const a = getArchetype(ctx.customer.archetype);
  // GDD 10.4 — güven tek bir pahalı jestle satın alınamaz.
  const beyondCap = session.gesturesUsed >= NEGOTIATION.maxEffectiveGestures;

  return {
    session: {
      ...session,
      round: session.round + 1,
      gesturesUsed: session.gesturesUsed + 1,
      moveHistory: [...session.moveHistory, move],
    },
    response: {
      state: session.state,
      message: beyondCap
        ? t('Nezaketiniz için sağ olun, ama mesele fiyatta.')
        : t('İnce düşünmüşsünüz, teşekkür ederim.'),
      counterOffer: session.activeCounter,
      patienceDelta: beyondCap ? -1 : 1,
      trustDelta: beyondCap ? 0 : Math.round(NEGOTIATION.gestureTrustGain * a.gestureResponsiveness),
      suspicionDelta: 0,
      wasRepeatOffer: false,
      settledPrice: null,
    },
  };
}

/**
 * GDD 11.2 — "Karşı teklif iste: Sabır tüketir. Müşterinin gerçek rezervasyon
 * bandına dair sinyal verir." Rezervasyonun kendisini asla göstermez (GDD 6.6).
 */
/**
 * "Karşı teklif iste" — SABIR BİTİNCE DURUM DEĞİŞİR.
 *
 * Sabır zaten harcanıyordu (`requestCounterPatienceCost`) ve mağaza da
 * uyguluyordu; eksik olan, DURUM MAKİNESİNİN buna tepki vermemesiydi. Bu
 * fonksiyon her çağrıda `state: session.state` döndürdüğü için müşteri sabrı
 * sıfırlansa bile sonsuza dek karşı teklif vermeye devam ediyordu. Tarayıcıda
 * ölçüldü: karşı teklif 74.744 → 74.638 ₺'ye indi, sonra üç turda hiç
 * kımıldamadı; düğme hâlâ aktifti ve hiçbir geri bildirim yoktu.
 *
 * Geçiş kuralı `handleOffer` ile AYNI — yeni bir eşik uydurmuyoruz:
 *
 *   sabır oranı ≤ 0                        → RED
 *   sabır oranı ≤ finalOfferPatienceRatio  → SON TEKLİF
 *
 * Bütçe sabit bir tur sayısı DEĞİL, müşterinin sabrıdır. Böylece "Tatlı Dil"
 * yeteneği `patienceMax`'i büyüttükçe pazarlık alanı da kendiliğinden
 * genişler (skill-tree · `startingPatience`); ayrı bir yetenek kancası
 * gerekmez.
 */
function handleRequestCounter(
  session: NegotiationSession,
  ctx: NegotiationContext,
  move: NegotiationMove,
): { session: NegotiationSession; response: NegotiationResponse } {
  const { customer } = ctx;
  const threshold = effectiveReservation(ctx, session);
  const patienceCost = NEGOTIATION.requestCounterPatienceCost;
  const patienceAfter = customer.patience - patienceCost;
  const patienceRatioAfter = patienceAfter / Math.max(1, customer.patienceMax);

  const round = session.round + 1;
  const exhausted = patienceRatioAfter <= 0;

  /*
    SON TEKLİF GÖRÜLMEDEN RED YOK.

    İlk hâlde kural `handleOffer` ile birebir aynıydı: sabır oranı 0'a
    inince RED. Gerçek müşterilerle ölçtüm — 180 satıcının **177'si** SON
    TEKLİF aşamasını hiç görmeden reddediyordu. Sebep `finalOfferPatienceRatio`
    (0,28): sabrı 3–4 olan bir müşteride tam sayı sabır o pencereye hiç
    düşmüyor, ikinci karşı teklifte 1–2 (oran 0,33–0,50), üçüncüde doğrudan 0.

    Karşı teklif istemek bir HAKARET DEĞİL, oyuncunun soru sormasıdır; alışın
    o soruyla, uyarısız kapanması hem sert hem öğretici değil. Bu yüzden
    tükenme RED'e ancak müşteri ZATEN son sözünü söylediyse dönüşür; aksi
    hâlde bu tur SON TEKLİF olur ve oyuncu bir tur uyarı alır.

    Bu, bütçeyi bir tur uzatır ve bütçe hâlâ sabırdan türer — "Tatlı Dil"
    yeteneği `patienceMax`'i büyüttükçe alan yine kendiliğinden genişler.
  */
  if (exhausted && session.state === 'FINAL_OFFER') {
    return {
      session: {
        ...session,
        state: 'REJECTED',
        round,
        moveHistory: [...session.moveHistory, move],
      },
      response: {
        state: 'REJECTED',
        message: t('Son sözümü söyledim. Başka yere bakacağım.'),
        counterOffer: null,
        patienceDelta: -patienceCost,
        trustDelta: -TRUST.rejectPenalty,
        suspicionDelta: 0,
        wasRepeatOffer: false,
        settledPrice: null,
      },
    };
  }

  const nextState: NegotiationState =
    exhausted || patienceRatioAfter <= NEGOTIATION.finalOfferPatienceRatio
      ? 'FINAL_OFFER'
      : session.state;

  const counter = deriveCounter(
    session,
    ctx,
    nextState,
    session.offerHistory[session.offerHistory.length - 1] ?? threshold,
    threshold,
  );

  return {
    session: {
      ...session,
      state: nextState,
      round,
      activeCounter: counter,
      // SON TEKLİF'e geçtiysek karşı teklif artık bağlayıcıdır; `finalOffer`
      // dolu olmadan `handleAcceptCounter` masada teklif göremezdi.
      finalOffer: nextState === 'FINAL_OFFER' ? counter : session.finalOffer,
      moveHistory: [...session.moveHistory, move],
    },
    response: {
      state: nextState,
      message:
        nextState === 'FINAL_OFFER'
          ? t('Son sözüm {tutar}. Daha fazla uzatmayalım.', { tutar: formatTl(counter) })
          : t('Benim beklentim {tutar} civarı.', { tutar: formatTl(counter) }),
      counterOffer: counter,
      patienceDelta: -patienceCost,
      trustDelta: 0,
      suspicionDelta: 0,
      wasRepeatOffer: false,
      settledPrice: null,
    },
  };
}

function handleAcceptCounter(
  session: NegotiationSession,
  ctx: NegotiationContext,
  move: NegotiationMove,
): { session: NegotiationSession; response: NegotiationResponse } {
  const price = session.finalOffer ?? session.activeCounter;
  if (price === null) return handleNoop(session, t('Masada kabul edilecek bir teklif yok.'));

  const fairness = price / Math.max(1, ctx.customer.reservationPrice);

  return {
    session: {
      ...session,
      state: 'ACCEPTED',
      round: session.round + 1,
      settledPrice: price,
      moveHistory: [...session.moveHistory, move],
      activeCounter: null,
    },
    response: {
      state: 'ACCEPTED',
      message: t('Anlaştık. Sağ olun.'),
      counterOffer: null,
      patienceDelta: 0,
      trustDelta: fairness >= TRUST.fairPriceRatio ? TRUST.fairDealGain : 3,
      suspicionDelta: 0,
      wasRepeatOffer: false,
      settledPrice: price,
    },
  };
}

function handleReject(
  session: NegotiationSession,
  _ctx: NegotiationContext,
  move: NegotiationMove,
): { session: NegotiationSession; response: NegotiationResponse } {
  return {
    session: {
      ...session,
      state: 'REJECTED',
      round: session.round + 1,
      moveHistory: [...session.moveHistory, move],
      activeCounter: null,
    },
    response: {
      state: 'REJECTED',
      message: t('Anlıyorum. Yine de teşekkürler.'),
      counterOffer: null,
      patienceDelta: 0,
      // GDD 11.2 — red bazen profesyonelliği korur; ağır ceza yoktur.
      trustDelta: -TRUST.rejectPenalty,
      suspicionDelta: 0,
      wasRepeatOffer: false,
      settledPrice: null,
    },
  };
}

function handleNoop(
  session: NegotiationSession,
  message: string,
): { session: NegotiationSession; response: NegotiationResponse } {
  return {
    session,
    response: {
      state: session.state,
      message,
      counterOffer: session.activeCounter,
      patienceDelta: 0,
      trustDelta: 0,
      suspicionDelta: 0,
      wasRepeatOffer: false,
      settledPrice: null,
    },
  };
}

// ---------------------------------------------------------------------------
// Yardımcılar
// ---------------------------------------------------------------------------

export function isTerminal(state: NegotiationState): boolean {
  return state === 'ACCEPTED' || state === 'REJECTED';
}

/**
 * Pazarlık durumunun oyuncuya görünen adı.
 *
 * ANAHTARLAR İNGİLİZCE, DEĞERLER TÜRKÇE — anahtar durum makinesinin kimliği,
 * değer ekranda okunan kelime. `OPEN` uzun süre çevrilmeden kalmıştı ve
 * pazarlık ekranının tam ortasında, dört Türkçe etiketin yanında tek başına
 * İngilizce duruyordu (tarayıcıda görüldü).
 */
export const STATE_LABEL: Record<NegotiationState, string> = {
  OPEN: 'AÇIK',
  HARDENING: 'SERTLEŞTİ',
  FINAL_OFFER: 'SON TEKLİF',
  ACCEPTED: 'KABUL',
  REJECTED: 'RED',
};

function countBadOffers(session: NegotiationSession, ctx: NegotiationContext): number {
  const threshold = effectiveReservation(ctx, session);
  return session.offerHistory.filter((o) => o / Math.max(1, threshold) < NEGOTIATION.insultThreshold)
    .length;
}

function acceptMessage(fairness: number): string {
  if (fairness >= 1.06) return t('Bu gerçekten iyi bir teklif. Anlaştık.');
  if (fairness >= 1.0) return t('Tamam, anlaştık.');
  return t('Peki. İhtiyacım olduğu için kabul ediyorum.');
}

function counterMessage(
  state: NegotiationState,
  ratio: number,
  demeanor: string,
  insulting: boolean,
): string {
  if (state === 'FINAL_OFFER') return t('Son fiyatım bu. Daha aşağısına bırakmam.');
  if (insulting) return t('Bu rakam ciddi değil. Ürünün hâlini biliyorum.');
  if (state === 'HARDENING') return t('Bakın, buradan aşağı inmem artık.');
  if (ratio > 0.95) return t('Az kaldı. Biraz daha düşünün.');
  return t('{tavir} davranmak istiyorum ama bu fiyat beklentimin altında.', {
    tavir: t(demeanor),
  });
}

function reasonReplyFor(archetypeId: string, claim: string): string {
  if (archetypeId === 'investor' || archetypeId === 'informedSeller') {
    return t('{iddia} — doğru, ölçüm mantıklı.', { iddia: claim });
  }
  if (archetypeId === 'collector')
    return t('{iddia} demek. Bunu bilmek iyi oldu.', { iddia: claim });
  return t('{iddia} diyorsunuz. Anlıyorum.', { iddia: claim });
}

/* Para birimi ve sayı yereli tek yerden — bkz. `@i18n/money`. */
const formatTl = tl;

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
