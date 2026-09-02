/**
 * MIHENKAYNAK — Servis ve atölye motoru
 * Kaynak: GDD 17 "Servis ve Atölye Sistemi", 23.14 "Servis Kabul Akışı",
 *         14.1 servis brüt marjı, 22.4 servis net katkısı, 35 hata riski formülü.
 *
 * DEĞİŞMEZ (GDD 17.4 / 34.13):
 *   "MIHENKAYNAK atölyesi havadan günlük metal veya sabit pasif gelir ÜRETMEZ.
 *    Gelir; kabul edilen gerçek iş, kullanılan kapasite, parça maliyeti, süre
 *    ve hata riskinden doğar."
 *   Bu dosyada zamana bağlı otomatik gelir üreten hiçbir fonksiyon yoktur.
 *   Para yalnız `deliverJob` ile, yalnız tamamlanmış bir iş için hareket eder.
 *
 * DEĞİŞMEZ (GDD 28.3 determinizm):
 *   İşin başarılı/başarısız sonucu KABUL ANINDA sabitlenir. Oyuncuya risk
 *   yüzdesi gösterilir, sonuç gösterilmez. Reload ile yeniden zar atılamaz —
 *   çünkü atılacak zar sonradan yoktur.
 *
 * DEĞİŞMEZ (GDD 17.3):
 *   Her iş bir kapasite slotu ve teslim zamanı kullanır. Müşteriye verilen
 *   teslim sözü kişisel güvenin parçasıdır.
 */

import { CONDITION_DEDUCTION, CONDITION_ORDER, SERVICE } from './balance';
import { getTemplate } from '@data/item-templates';
import { rulesFor } from '@data/product-classes';
import { getServiceType, SERVICE_TYPES, type ServiceTypeDef } from '@data/service-types';
import { deriveSeed, makeId, Rng } from './rng';
import { trueValue } from './valuation';
import type {
  ConditionGrade,
  GameDay,
  ItemInstance,
  MarketState,
  Money,
  ServiceDiagnosis,
  ServiceJob,
  ServiceQuote,
  ServiceSession,
  ServiceVenue,
  StoreState,
} from './types';

// ---------------------------------------------------------------------------
// 1. TANILA (GDD 23.14 "Tanıla")
// ---------------------------------------------------------------------------

/**
 * Ürün sınıfının izin verdiği servis türü kimlikleri (product-classes.ts).
 * Merkezi whitelist; servis tarafının tek giriş kapısı burasıdır.
 */
export function servicesForItem(item: ItemInstance): string[] {
  return rulesFor(getTemplate(item.templateId)).services;
}

/**
 * Bu ürün hiç atölye işi alır mı. Sarrafiyede cevap hayırdır; servis
 * niyetli müşteri havuzu bu yüzden sarrafiye getirmez (customer-spawn.ts).
 */
export function isServiceable(item: ItemInstance): boolean {
  return servicesForItem(item).length > 0;
}

/**
 * "Ürün sorunu, kondisyon, gerekirse kısa inceleme."
 *
 * Servis müşterisinde ürünün gerçeği çoğunlukla görünürdür — müşteri zaten
 * neyin bozuk olduğunu söyler. Bu yüzden servis akışı ticaret akışının
 * hidden-truth belirsizliğini taşımaz; karar süre, risk, kapasite ve teslim
 * sözü üzerinedir (GDD 23.14).
 */
export function diagnose(item: ItemInstance, storeLevel: number): ServiceDiagnosis {
  const condition = item.truth.condition;
  const hasStone = item.truth.stoneData.kind !== 'none';

  // §3 — ÜRÜN SINIFI FİLTRESİ, her şeyden önce.
  // Buradaki eksiklik "kusursuz Gram Altın'a Yüzük Ölçüsü" hatasının
  // kaynağıydı: eski filtre yalnız kondisyona ve requiresStone bayrağına
  // bakıyordu, ürünün ne olduğuna bakmıyordu. Ölçü servisi `appliesTo`
  // listesinde 'pristine' taşıdığı için kusursuz sarrafiyeye de uyuyordu.
  const allowedServices = servicesForItem(item);

  const available = SERVICE_TYPES.filter((type) => {
    if (!allowedServices.includes(type.id)) return false;
    if (type.unlockLevel > storeLevel) return false;
    if (type.requiresStone && !hasStone) return false;
    return type.appliesTo.includes(condition);
  });

  // Kondisyon hiçbir türe uymuyorsa temizlik geri düşüştür — ama yalnız
  // ürün sınıfı temizliğe izin veriyorsa. Sarrafiyede geri düşüş YOKTUR:
  // standart külçe/ziynet atölye işi almaz, boş liste doğru cevaptır.
  const usable =
    available.length > 0
      ? available
      : SERVICE_TYPES.filter(
          (t) => t.id === 'clean' && allowedServices.includes(t.id) && t.unlockLevel <= storeLevel,
        );

  const best = usable.reduce<ServiceTypeDef | null>(
    (acc, t) => (acc === null || t.conditionSteps > acc.conditionSteps ? t : acc),
    null,
  );

  return {
    problemLabel: describeProblem(item),
    availableTypeIds: usable.map((t) => t.id),
    targetCondition: best ? improveCondition(condition, best.conditionSteps) : condition,
  };
}

function describeProblem(item: ItemInstance): string {
  const mech = item.truth.hiddenFlaws.find(
    (f) => f.kind === 'brokenMechanism' || f.kind === 'solderRepair',
  );
  if (mech) return mech.readableSignal.label;

  switch (item.truth.condition) {
    case 'broken':
      return 'Parça kırık; kullanılamaz durumda.';
    case 'damaged':
      return 'Gövdede belirgin hasar var.';
    case 'worn':
      return 'Yüzey yıpranmış, parlaklığını kaybetmiş.';
    case 'good':
      return 'Genel durumu iyi; bakım isteniyor.';
    case 'pristine':
      return 'Kusur yok; isteğe bağlı işlem.';
  }
}

/** Kondisyonu n kademe yukarı taşır (üst sınır: pristine). */
export function improveCondition(from: ConditionGrade, steps: number): ConditionGrade {
  const idx = CONDITION_ORDER.indexOf(from);
  const next = Math.min(CONDITION_ORDER.length - 1, idx + Math.max(0, steps));
  return CONDITION_ORDER[next] as ConditionGrade;
}

// ---------------------------------------------------------------------------
// 2. TEKLİF (GDD 23.14 "Teklif" — süre, parça, hata riski, dış usta/kendi atölye)
// ---------------------------------------------------------------------------

export interface QuoteContext {
  store: StoreState;
  market: MarketState;
  /** Atölyede şu an açık olan iş sayısı. */
  workshopLoad: number;
  day: GameDay;
}

/**
 * GDD 35 — "Servis Hata Riski = İş zorluğu + yoğunluk − personel becerisi
 * − ekipman bonusu."
 *
 * GDD 17.3: "Aşırı iş almak bekleme süresini ve hata riskini artırır."
 * Yoğunluk terimi bunu doğrudan kodlar.
 */
export function errorRisk(
  type: ServiceTypeDef,
  ctx: QuoteContext,
  venue: ServiceVenue,
): number {
  if (venue === 'outsourced') {
    // Dış usta kendi atölyesinde çalışır: senin kapasiten onu etkilemez,
    // ama güvenilirliği sabittir ve kontrolün dışındadır (GDD 17.2).
    return clamp01(type.difficulty * SERVICE.outsource.riskFactor);
  }

  const capacity = Math.max(1, ctx.store.workshopCapacity);
  const load = ctx.workshopLoad / capacity;

  const staffSkill = ctx.store.staff.length * SERVICE.staffSkillPerMember;
  const equipmentBonus = SERVICE.equipmentBonusByTier[ctx.store.storeTier] ?? 0;

  const raw =
    type.difficulty + load * SERVICE.loadRiskWeight - staffSkill - equipmentBonus;

  return clamp01(raw);
}

/**
 * Bir servis türü + mekân için tam teklif.
 *
 * Ücret GDD 14.1'deki "%35–60 servis brüt marjı" hedefinden türer:
 *   fee = (işçilik + parça) / (1 − hedefMarj)
 * Böylece brüt marj = (fee − maliyet) / fee ≈ hedefMarj olur.
 */
export function buildQuote(
  item: ItemInstance,
  type: ServiceTypeDef,
  venue: ServiceVenue,
  ctx: QuoteContext,
): ServiceQuote {
  const itemValue = trueValue(item, ctx.market);

  const laborCost = Math.round(itemValue * type.laborRatio);
  const partsCost = Math.round(itemValue * type.partsRatio);

  // Zorluk arttıkça marj hedefi bandın üst ucuna kayar (GDD 14.1 %35–60).
  const [lo, hi] = SERVICE.grossMarginBand;
  const targetMargin = lo + (hi - lo) * clamp01(type.difficulty);

  const baseFee = Math.round((laborCost + partsCost) / (1 - targetMargin));

  const inHouseFree = ctx.store.workshopCapacity - ctx.workshopLoad;
  const capacityBlocked = venue === 'inHouse' && inHouseFree <= 0;

  // GDD 17.2 — dış usta: marj düşük, süre uzun, kapasite yatırımı gerekmez.
  const outsourceCost =
    venue === 'outsourced' ? Math.round(baseFee * SERVICE.outsource.feeShare) : 0;

  const durationDays =
    venue === 'outsourced'
      ? type.durationDays + SERVICE.outsource.extraDays
      : type.durationDays;

  const risk = errorRisk(type, ctx, venue);

  // GDD 22.4 — "Servis net katkısı = Ücret − parça − dış usta − tazmin."
  // Tazmin beklenen değeri burada gösterilmez; risk ayrı bir sütundur ve
  // oyuncu ikisini birlikte okur (GDD 23.14 "süre, parça, hata riski").
  const netContribution = baseFee - partsCost - outsourceCost;

  return {
    typeId: type.id,
    label: type.label,
    venue,
    fee: baseFee,
    laborCost,
    partsCost,
    outsourceCost,
    netContribution,
    durationDays,
    risk,
    usesCapacity: venue === 'inHouse',
    rationale:
      venue === 'outsourced'
        ? 'Kapasite tüketmez; marj düşer, süre uzar.'
        : inHouseFree <= 1
          ? 'Son slot: yeni iş alırsan risk ve süre artar.'
          : 'Kendi atölyende; tam marj, kontrol sende.',
    blockedReason: capacityBlocked ? 'Atölye dolu' : null,
  };
}

/** Tanılanan tüm türler için kendi atölye + dış usta tekliflerini üretir. */
export function buildQuotes(
  item: ItemInstance,
  diagnosis: ServiceDiagnosis,
  ctx: QuoteContext,
): ServiceQuote[] {
  const quotes: ServiceQuote[] = [];
  for (const typeId of diagnosis.availableTypeIds) {
    const type = getServiceType(typeId);
    quotes.push(buildQuote(item, type, 'inHouse', ctx));
    quotes.push(buildQuote(item, type, 'outsourced', ctx));
  }
  return quotes;
}

/** Belirli bir tür + mekân kombinasyonunun teklifi. */
export function findQuote(
  quotes: ServiceQuote[],
  typeId: string | null,
  venue: ServiceVenue,
): ServiceQuote | null {
  if (!typeId) return null;
  return quotes.find((q) => q.typeId === typeId && q.venue === venue) ?? null;
}

// ---------------------------------------------------------------------------
// 3. SÖZ (GDD 23.14 "Söz" — teslim günü ve ücret)
// ---------------------------------------------------------------------------

/**
 * Sistemin beklediği bitiş günü. Söz bu günden erken verilemez.
 * GDD 17.3 — teslim sözü kişisel güvenin parçasıdır; bu yüzden oyuncu
 * tampon ekleyerek güvenli oynayabilir ya da sıkı söz verip güven kazanabilir.
 */
export function expectedCompletionDay(quote: ServiceQuote, today: GameDay): GameDay {
  return today + quote.durationDays;
}

/** Sıkı sözün güven primi / geniş sözün güven maliyeti (GDD 17.3). */
export function promiseTrustModifier(bufferDays: number): number {
  if (bufferDays <= 0) return SERVICE.promise.tightBonus;
  if (bufferDays === 1) return 0;
  return SERVICE.promise.loosePenalty;
}

// ---------------------------------------------------------------------------
// 4. KUYRUK (GDD 23.14 "Kuyruk" — iş emri, atölyeye gönder)
// ---------------------------------------------------------------------------

/**
 * İş emrini oluşturur.
 *
 * Sonuç (`predeterminedOutcome`) BURADA sabitlenir. Girdiler:
 * (rootSeed, jobId) — yani aynı save aynı sonucu verir. Kabul anındaki
 * yoğunluk riski belirler; sonradan alınan işler bu işin riskini geriye
 * dönük değiştirmez, kendi risklerini kendi anlarındaki yoğunlukla alırlar.
 */
export function createServiceJob(input: {
  rootSeed: number;
  jobIndex: number;
  item: ItemInstance;
  customerId: string;
  customerName: string;
  quote: ServiceQuote;
  today: GameDay;
  promiseBufferDays: number;
}): ServiceJob {
  const { rootSeed, jobIndex, item, quote, today, promiseBufferDays } = input;

  const jobId = makeId('job', rootSeed, jobIndex);
  const expectedDay = expectedCompletionDay(quote, today);

  const rng = new Rng(deriveSeed(rootSeed, `service/outcome/${jobId}`, jobIndex));
  const predeterminedOutcome: ServiceJob['predeterminedOutcome'] = rng.chance(quote.risk)
    ? 'failed'
    : 'success';

  return {
    jobId,
    type: quote.typeId,
    itemId: item.id,
    customerId: input.customerId,
    customerName: input.customerName,
    itemName: item.displayName,
    duration: quote.durationDays,
    remainingDays: quote.durationDays,
    risk: quote.risk,
    partsCost: quote.partsCost,
    assignedStaff: null,
    venue: quote.venue,
    outsourceCost: quote.outsourceCost,
    promisedDay: expectedDay + Math.max(0, promiseBufferDays),
    expectedDay,
    fee: quote.fee,
    predeterminedOutcome,
    result: 'pending',
    // Tazmin GDD 21.2 — hata hâlinde müşteriye ödenen bedel.
    compensation: Math.round(quote.fee * SERVICE.compensationRatio),
    acceptedDay: today,
  };
}

/**
 * Bir günü ilerletir: kalan süreler azalır, biten işler sonucunu alır.
 *
 * Saf fonksiyon — yalnız yeni iş listesini döndürür. Para hareketi YOKTUR;
 * ekonomiye yazma işi settlement katmanının görevidir (GDD 22.1 tek settlement).
 */
export function advanceJobsOneDay(jobs: ServiceJob[]): ServiceJob[] {
  return jobs.map((job) => {
    if (job.result !== 'pending') return job;

    const remainingDays = Math.max(0, job.remainingDays - 1);
    if (remainingDays > 0) return { ...job, remainingDays };

    // Süre doldu: kabul anında sabitlenmiş sonuç açılır.
    return { ...job, remainingDays: 0, result: job.predeterminedOutcome };
  });
}

/** Teslim edilmeye hazır işler — oyuncunun aksiyon alması gerekenler. */
export function readyJobs(jobs: ServiceJob[]): ServiceJob[] {
  return jobs.filter((j) => j.result === 'success' || j.result === 'failed');
}

/** Hâlâ atölyede olan işler. */
export function activeJobs(jobs: ServiceJob[]): ServiceJob[] {
  return jobs.filter((j) => j.result === 'pending');
}

/** Kendi atölyesinde kapasite tüketen işler (GDD 17.3). */
export function inHouseLoad(jobs: ServiceJob[]): number {
  return jobs.filter((j) => j.result === 'pending' && j.venue === 'inHouse').length;
}

/** Söz verilen günü geçmiş, hâlâ teslim edilmemiş işler. */
export function overdueJobs(jobs: ServiceJob[], today: GameDay): ServiceJob[] {
  return jobs.filter((j) => j.result !== 'delivered' && today > j.promisedDay);
}

/**
 * Teslim sonucu — ekonomiye ve ilişkiye ne yazılacağı.
 * Bu fonksiyon HESAPLAR, uygulamaz. Uygulama settlement katmanındadır.
 */
export interface DeliveryOutcome {
  jobId: string;
  succeeded: boolean;
  /** Kasaya giren net tutar (başarısızlıkta ücret alınmaz, tazmin çıkar). */
  cashDelta: Money;
  /** GDD 22.4 — Ücret − parça − dış usta − tazmin. */
  netContribution: Money;
  trustDelta: number;
  reputationDelta: number;
  /** Sözden kaç gün geç teslim edildi. */
  lateDays: number;
  /** Ürünün servis sonrası ulaştığı kondisyon. */
  resultingCondition: ConditionGrade;
  message: string;
}

/**
 * GDD 31.3 invariant: "Servis geliri parça ve hata/tazmin maliyetini doğru düşer."
 *
 * Parça maliyeti kabul anında ödendiği için burada tekrar düşülmez; net katkı
 * raporlaması onu içerir ama nakit hareketi içermez. Çift sayım olmaz.
 */
export function resolveDelivery(
  job: ServiceJob,
  item: ItemInstance,
  today: GameDay,
): DeliveryOutcome {
  const type = getServiceType(job.type);
  const succeeded = job.result === 'success';
  const lateDays = Math.max(0, today - job.promisedDay);

  // Başarılı iş: ücret tahsil edilir. Başarısız iş: ücret alınmaz VE tazmin
  // ödenir (GDD 21.2 "Servis hatası → Tazmin / itibar kaybı").
  const cashDelta = succeeded ? job.fee : -job.compensation;

  // Net katkı raporu parçayı ve dış ustayı da içerir (GDD 22.4).
  const netContribution = succeeded
    ? job.fee - job.partsCost - job.outsourceCost
    : -(job.compensation + job.partsCost + job.outsourceCost);

  const latePenalty = lateDays * SERVICE.latePenaltyPerDay;
  const promiseBonus = promiseTrustModifier(job.promisedDay - job.expectedDay);

  const trustDelta = succeeded
    ? type.trustBonus + promiseBonus - latePenalty
    : -SERVICE.failureTrustPenalty - latePenalty;

  return {
    jobId: job.jobId,
    succeeded,
    cashDelta,
    netContribution,
    trustDelta,
    reputationDelta: Math.round(trustDelta * SERVICE.reputationTransfer),
    lateDays,
    resultingCondition: succeeded
      ? improveCondition(item.truth.condition, type.conditionSteps)
      : item.truth.condition,
    message: buildDeliveryMessage(succeeded, lateDays, type.label),
  };
}

function buildDeliveryMessage(succeeded: boolean, lateDays: number, label: string): string {
  if (!succeeded) {
    return `${label} işinde hata oluştu. Tazmin ödendi ve müşteri memnun ayrılmadı.`;
  }
  if (lateDays > 0) {
    return `${label} tamamlandı ama söz verilen günden ${lateDays} gün sonra teslim edildi.`;
  }
  return `${label} sözünde teslim edildi.`;
}

/** Servis sonrası ürünün kondisyonunu günceller (başarılı işlerde). */
export function applyServiceToItem(item: ItemInstance, job: ServiceJob): ItemInstance {
  if (job.result !== 'success') return item;
  const type = getServiceType(job.type);
  if (type.conditionSteps <= 0) return item;

  const nextCondition = improveCondition(item.truth.condition, type.conditionSteps);

  return {
    ...item,
    truth: {
      ...item.truth,
      condition: nextCondition,
      // Onarılan mekanik kusurlar gerçekten kalkar — servis değeri buradan doğar.
      hiddenFlaws: item.truth.hiddenFlaws.filter(
        (f) => f.kind !== 'brokenMechanism' && f.kind !== 'solderRepair',
      ),
    },
    declared: { ...item.declared, visibleCondition: nextCondition },
    flags: [...item.flags, `serviced:${job.type}`],
  };
}

// ---------------------------------------------------------------------------
// Oturum yardımcıları
// ---------------------------------------------------------------------------

export function createServiceSession(): ServiceSession {
  return {
    diagnosis: null,
    quotes: [],
    selectedTypeId: null,
    selectedVenue: 'inHouse',
    promiseBufferDays: SERVICE.promise.defaultBufferDays,
    createdJobId: null,
    outcome: 'pending',
  };
}

/** Kondisyon iyileşmesinin ürün değerine kabaca katkısı — teklif ekranında bilgi. */
export function conditionValueGain(
  item: ItemInstance,
  market: MarketState,
  steps: number,
): Money {
  if (steps <= 0) return 0;
  const before = CONDITION_DEDUCTION[item.truth.condition];
  const after = CONDITION_DEDUCTION[improveCondition(item.truth.condition, steps)];
  const base = trueValue(item, market);
  const denom = Math.max(0.08, 1 - before);
  return Math.max(0, Math.round((base / denom) * (before - after)));
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}
