/**
 * MIHENKAYNAK — Esnaf ağı
 * Kaynak: Ekonomi Ara Düzeltmesi v1.0 · §8 "Esnaf ağı", §12.6 kabul testi,
 *         §11 edge case'ler.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * DEĞİŞMEZ (§8, ilk cümle): "Esnaf ağı, toptancının yerine geçen SINIRSIZ
 * İKİNCİ BANKA DEĞİLDİR. Yerel ilişki sermayesine dayanan, DAHA KÜÇÜK
 * ÖLÇEKLİ ve KOŞULLU bir ticari dayanışma kanalıdır."
 *
 * DEĞİŞMEZ (§8, son satır): "Toptancı ve esnaf ağı aynı fiyat/limit
 * algoritmasının yalnızca farklı isimleri olarak uygulanmaz."
 *
 * Bu iki cümle mimariyi belirledi. Toptancı TEK bir hesaptır: derin kapasite,
 * biçimsel limit, resmi vade. Esnaf ağı ise ÜYELERDEN oluşur; her birinin
 * kendi kasası, kendi iştahı, kendi ilişkisi var. Ağ düzeyinde ayrıca bir
 * tavan var ki "aynı anda tüm esnaftan sınırsız borç" mümkün olmasın.
 *
 * Tek bir "esnaf hesabı" yazmak teknik olarak kolaydı ve tam olarak §8'in
 * yasakladığı şey olurdu: toptancının küçük boy kopyası.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * KAPSAM SINIRI (Addendum §10): Fiyat burada YENİDEN HESAPLANMAZ. Bozdurma
 * fiyatı channels.ts'in 'tradeNetwork' profilinden gelir; buradaki iş
 * kapasite, ilişki, borç ve vade muhasebesidir.
 */

import { tl } from '@i18n/money';
import { NETWORK } from './balance';
import { bullionMeta, isBullion } from '@data/bullion';
import { bullionUnitValue, channelCapacity, gramsFor, priceForChannel } from './channels';
import { Rng, deriveSeed } from './rng';
import { unitCostBasis } from './settlement';
import { trueValue } from './valuation';
import type {
  GameDay,
  InventoryPosition,
  ItemInstance,
  MarketState,
  Money,
  NetworkLoan,
  TradeNetworkMember,
} from './types';

// ---------------------------------------------------------------------------
// Ağ kurulumu
// ---------------------------------------------------------------------------

const FIRST_NAMES = [
  'Kemal', 'Nadir', 'Sabri', 'Hulusi', 'Vedat', 'Muammer', 'Şükrü', 'Necdet',
  'Rıfat', 'Cevdet', 'Selahattin', 'Bahri',
];
const CRAFT_LABEL: Record<TradeNetworkMember['craft'], string> = {
  kuyumcu: 'Kuyumcu',
  sarraf: 'Sarraf',
  saatci: 'Saatçi',
  tefeci: 'Ödünççü',
  manifaturaci: 'Manifaturacı',
};

export function craftLabel(craft: TradeNetworkMember['craft']): string {
  return CRAFT_LABEL[craft];
}

/**
 * Ağı deterministik kurar. (rootSeed) ağı tamamen belirler — reload ağı
 * yeniden çekmez (GDD 11.4 / 28.3).
 */
export function spawnNetwork(rootSeed: number, reputation: number): TradeNetworkMember[] {
  return Array.from({ length: NETWORK.memberCount }, (_, i) => {
    const rng = new Rng(deriveSeed(rootSeed, 'network/member', i));
    const craft = rng.pickWeighted([
      { value: 'sarraf' as const, weight: 30 },
      { value: 'kuyumcu' as const, weight: 28 },
      { value: 'saatci' as const, weight: 16 },
      { value: 'manifaturaci' as const, weight: 14 },
      { value: 'tefeci' as const, weight: 12 },
    ]);

    // §8 "uygun esnafta": herkes altın bozmaz. Saatçi ve manifaturacı
    // sarrafiyeye yakın durmaz; ödünççünün işi zaten nakittir.
    const appetite =
      craft === 'sarraf' || craft === 'kuyumcu'
        ? rng.range(0.7, 1)
        : craft === 'tefeci'
          ? rng.range(0.25, 0.5)
          : rng.range(0, 0.2);

    return {
      id: `esnaf_${i}`,
      // İlk adlar üye indeksinden seçilir; aynı ağda iki farklı kişinin
      // aynı görünen adla oluşması oyuncunun borç/ilişki takibini bozuyordu.
      displayName: `${FIRST_NAMES[(i + (rootSeed >>> 0)) % FIRST_NAMES.length]} ${CRAFT_LABEL[craft]}`,
      craft,
      // Yerel ilişki semt itibarından türer ama kişiseldir.
      trust: clamp(Math.round(reputation * 0.5 + rng.range(-10, 18)), 5, 80),
      cashOnHand: Math.round(rng.range(NETWORK.cashBand[0], NETWORK.cashBand[1])),
      bullionAppetite: appetite,
      loan: null,
      history: { repaidOnTime: 0, repaidLate: 0 },
    };
  });
}

/** §8 "uygun esnafta" — bu üye sarrafiye alır mı. */
export function buysBullion(member: TradeNetworkMember): boolean {
  return member.bullionAppetite >= NETWORK.minAppetiteToBuy;
}

// ---------------------------------------------------------------------------
// §8 — ALTIN BOZDURMA
// ---------------------------------------------------------------------------

export interface NetworkLiquidationOffer {
  memberId: string;
  /** Bu esnafın gerçekten alabildiği adet — kasası ve kanal derinliği kadar. */
  quantity: number;
  unitPrice: Money;
  total: Money;
  grams: number;
  costBasis: Money;
  /** Talep edilen adedin tamamı karşılanamadıysa neden. */
  shortfallReason: string | null;
}

/**
 * §8 "Altın bozdurma: oyuncu uygun esnafta sarrafiyeyi nakde çevirebilir;
 * FİYAT, KAPASİTE, İLİŞKİ ve PİYASA KOŞULUNA bağlıdır."
 *
 * Dört sınır da burada iş görür ve hiçbiri sessizce yutulmaz:
 *   fiyat    → channels.ts 'tradeNetwork' profili
 *   kapasite → kanal derinliği VE esnafın kasasındaki nakit
 *   ilişki   → üyenin kişisel güveni fiyatı taşır (kanal profilinde en yüksek ağırlık)
 *   piyasa   → rejim ve volatilite kanal makasına girer
 */
export function networkLiquidationOffer(
  member: TradeNetworkMember,
  itemId: string,
  requested: number,
  items: Record<string, ItemInstance>,
  inventory: InventoryPosition[],
  market: MarketState,
): NetworkLiquidationOffer | null {
  const item = items[itemId];
  const position = inventory.find((p) => p.itemId === itemId);
  if (!item || !position) return null;
  if (!buysBullion(member) || !isBullion(item.templateId)) return null;

  if (!Number.isFinite(requested) || requested <= 0) return null;
  const granularity = position.poolId === '24K_GRAM_GOLD_POOL' ? 1000 : 1;
  const inStock = Math.min(position.quantity, Math.floor(requested * granularity) / granularity);
  const depth = channelCapacity('tradeNetwork', bullionMeta(item.templateId), market);

  const baseUnitValue = isBullion(item.templateId)
    ? bullionUnitValue(item, market)
    : trueValue(item, market);

  const probe = priceForChannel({
    item,
    market,
    channel: 'tradeNetwork',
    side: 'shopSells',
    quantity: Math.min(inStock, depth),
    baseUnitValue,
    relationship: member.trust,
  });

  // §8 "Ağ kapasitesi sonludur" — esnafın kasası fiyattan önce gelir.
  const affordable = probe.unitPrice > 0 ? Math.floor(member.cashOnHand / probe.unitPrice * granularity) / granularity : 0;
  const quantity = Math.max(0, Math.min(inStock, depth, affordable));
  if (quantity <= 0) {
    return {
      memberId: member.id,
      quantity: 0,
      unitPrice: probe.unitPrice,
      total: 0,
      grams: 0,
      costBasis: 0,
      shortfallReason: 'Kasasında bu işi çevirecek nakit yok.',
    };
  }

  // Adet daraldıysa fiyat o adetle yeniden hesaplanır — hacim katmanı
  // gerçek işlemin hacmine göre çalışmalı (§6).
  const quote = priceForChannel({
    item,
    market,
    channel: 'tradeNetwork',
    side: 'shopSells',
    quantity,
    baseUnitValue,
    relationship: member.trust,
  });

  const shortfallReason =
    quantity < inStock
      ? quantity === affordable
        ? `Kasası ${quantity} adede yetiyor.`
        : `Tek seferde en çok ${depth} adet alıyor.`
      : null;

  return {
    memberId: member.id,
    quantity,
    unitPrice: quote.unitPrice,
    total: quote.totalPrice,
    grams: gramsFor(item, quantity),
    costBasis: unitCostBasis(position) * quantity,
    shortfallReason,
  };
}

/** Ağın bu üründe toplam emebileceği adet — §8 "ağ kapasitesi sonludur". */
export function networkAbsorptionCapacity(
  members: TradeNetworkMember[],
  itemId: string,
  items: Record<string, ItemInstance>,
  inventory: InventoryPosition[],
  market: MarketState,
): number {
  return members.reduce((sum, m) => {
    const offer = networkLiquidationOffer(m, itemId, 9_999, items, inventory, market);
    return sum + (offer?.quantity ?? 0);
  }, 0);
}

// ---------------------------------------------------------------------------
// §8 — KISA VADELİ TİCARİ BORÇ
// ---------------------------------------------------------------------------

export interface NetworkLoanOffer {
  memberId: string;
  /** Bu esnaftan alınabilecek azami tutar. */
  maxAmount: Money;
  amount: Money;
  /** Dayanışma ücreti — faiz değil, ticari nezaket bedeli. Gizli değildir. */
  fee: Money;
  totalDue: Money;
  dueDay: GameDay;
  termDays: number;
  blockedReason: string | null;
}

/** Ağdaki toplam açık borç. */
export function networkDebt(members: TradeNetworkMember[]): Money {
  return members.reduce((sum, m) => sum + (m.loan?.totalDue ?? 0), 0);
}

/**
 * §8 "Ağ kapasitesi sonludur; AYNI ANDA TÜM ESNAFTAN SINIRSIZ BORÇ veya
 * likidite alınamaz."
 *
 * Ağ tavanı üye tavanlarının toplamı DEĞİLDİR — ondan belirgin küçüktür.
 * Toplam olsaydı, üye sayısını artırmak sınırsız bankaya giden yol olurdu.
 */
export function networkDebtCeiling(members: TradeNetworkMember[]): Money {
  const avgTrust = members.length
    ? members.reduce((s, m) => s + m.trust, 0) / members.length
    : 0;
  const scale = NETWORK.ceilingFloorShare + (1 - NETWORK.ceilingFloorShare) * (avgTrust / 100);
  return Math.round(NETWORK.networkDebtCeiling * scale);
}

/** §8 "güven, geçmiş davranış, açık borç ve vade sınırıyla verilir." */
export function memberLoanCeiling(member: TradeNetworkMember): Money {
  const trustPart = (member.trust / 100) * NETWORK.loanPerTrustPoint * 100;
  // Geçmiş davranış: düzenli ödeme ağı güçlendirir, gecikme daraltır.
  const historyPart =
    member.history.repaidOnTime * NETWORK.historyBonusPerRepayment -
    member.history.repaidLate * NETWORK.historyPenaltyPerLate;
  return Math.max(0, Math.round(NETWORK.loanBase + trustPart + historyPart));
}

/** §8 — kısa vadeli. Vade toptancınınkinden kısadır ve güvenle çok az uzar. */
export function memberTermDays(member: TradeNetworkMember): number {
  return NETWORK.termDays + (member.trust >= NETWORK.longTermTrust ? 1 : 0);
}

export function memberFeeRate(member: TradeNetworkMember): number {
  const relief = (member.trust / 100) * NETWORK.feeTrustRelief;
  return Math.max(NETWORK.minFeeRate, NETWORK.baseFeeRate - relief);
}

/**
 * §8 — bir esnaftan kısa vadeli borç teklifi. Koşullar işlem öncesi
 * hesaplanır (§7'nin şeffaflık kuralı burada da geçerlidir).
 */
export function networkLoanOffer(
  member: TradeNetworkMember,
  members: TradeNetworkMember[],
  amount: Money,
  today: GameDay,
): NetworkLoanOffer {
  const memberCeiling = Math.min(memberLoanCeiling(member), member.cashOnHand);
  const networkRoom = Math.max(0, networkDebtCeiling(members) - networkDebt(members));
  const maxAmount = Math.max(0, Math.min(memberCeiling, networkRoom));

  const requested = Math.max(0, Math.round(amount));
  const fee = Math.round(requested * memberFeeRate(member));
  const termDays = memberTermDays(member);

  let blockedReason: string | null = null;
  if (requested <= 0) {
    blockedReason = 'Tutar yok.';
  } else if (member.loan) {
    // §8 — üye başına tek açık borç. Aynı esnafı üst üste borçlandırmak
    // "ikinci banka"nın ta kendisi olurdu.
    blockedReason = 'Bu esnafa zaten borcunuz var.';
  } else if (members.some((m) => m.loan && m.loan.dueDay < today)) {
    // §8 "Gecikme veya kötüye kullanım ... ERİŞİMİ olumsuz etkiler."
    blockedReason = 'Ağda gecikmiş borcunuz var; yeni borç açılmıyor.';
  } else if (requested > memberCeiling) {
    blockedReason = `Bu esnaf en çok ${tl(memberCeiling)} verebilir.`;
  } else if (requested > networkRoom) {
    blockedReason = `Ağ kapasitesi doldu; kalan ${tl(networkRoom)}.`;
  }

  return {
    memberId: member.id,
    maxAmount,
    amount: requested,
    fee,
    totalDue: requested + fee,
    dueDay: today + termDays,
    termDays,
    blockedReason,
  };
}

/** Borcu açar — idempotent. */
export function openLoan(
  member: TradeNetworkMember,
  offer: NetworkLoanOffer,
  today: GameDay,
  /**
   * Borcun kimliği. ÇAĞIRAN verir çünkü tekilliği yalnız o garanti edebilir.
   *
   * Eskiden burada `nloan_<üye>_<gün>` olarak üretiliyordu: aynı gün borç
   * alıp kapatıp yeniden alındığında kimlik birebir aynı çıkıyordu ve
   * ikinci borcun KAPATMA işlemi settlement'in idempotency kapısına
   * takılıyordu — borç ekranda açık kalıyor, ödenemiyordu.
   */
  loanId: string = `nloan_${member.id}_${today}`,
): TradeNetworkMember {
  if (offer.blockedReason || member.loan) return member;
  return {
    ...member,
    // Verdiği para kasasından çıkar: aynı nakitle hem borç verip hem altın
    // alamaz. Kapasitenin tek ve ortak kaynağı budur.
    cashOnHand: Math.max(0, member.cashOnHand - offer.amount),
    loan: {
      id: loanId,
      memberId: member.id,
      principal: offer.amount,
      totalDue: offer.totalDue,
      dueDay: offer.dueDay,
      takenDay: today,
    },
  };
}

/**
 * §8 "Gecikme veya kötüye kullanım ilişkiyi, koşulları ve erişimi olumsuz
 * etkiler; DÜZENLİ ÖDEME AĞI GÜÇLENDİREBİLİR."
 */
export function repayLoan(
  member: TradeNetworkMember,
  today: GameDay,
): { member: TradeNetworkMember; amount: Money; onTime: boolean } {
  const loan = member.loan;
  if (!loan) return { member, amount: 0, onTime: true };

  const onTime = today <= loan.dueDay;
  return {
    member: {
      ...member,
      loan: null,
      cashOnHand: member.cashOnHand + loan.totalDue,
      trust: clamp(
        member.trust + (onTime ? NETWORK.onTimeTrustGain : -NETWORK.lateTrustPenalty),
        0,
        100,
      ),
      history: {
        repaidOnTime: member.history.repaidOnTime + (onTime ? 1 : 0),
        repaidLate: member.history.repaidLate + (onTime ? 0 : 1),
      },
    },
    amount: loan.totalDue,
    onTime,
  };
}

/**
 * Gün devrinde çalışır. §11 "Açık borç/vade aşımı: ... BORÇ SESSİZCE
 * SİLİNMEZ." Gecikme yükü borcun üstüne biner ve ilişki aşınır.
 */
export function accrueNetworkOverdue(
  members: TradeNetworkMember[],
  today: GameDay,
): { members: TradeNetworkMember[]; penalty: Money; lateMembers: string[] } {
  let penalty = 0;
  const lateMembers: string[] = [];

  const next = members.map((m) => {
    const loan = m.loan;
    if (!loan || loan.dueDay >= today) return m;

    const add = Math.round(loan.totalDue * NETWORK.overduePerDayRate);
    penalty += add;
    lateMembers.push(m.id);

    return {
      ...m,
      loan: { ...loan, totalDue: loan.totalDue + add } as NetworkLoan,
      trust: clamp(m.trust - NETWORK.overdueDailyTrustPenalty, 0, 100),
    };
  });

  return { members: next, penalty, lateMembers };
}

/**
 * Bozdurma sonrası esnafın kasası azalır ve ilişki bir tık güçlenir.
 * Ağın kapasitesi böylece KULLANILDIKÇA daralır — §8'in "sonlu kapasite"
 * cümlesi bir etiket değil, işleyen bir kısıt.
 */
export function applyLiquidation(
  member: TradeNetworkMember,
  paid: Money,
): TradeNetworkMember {
  return {
    ...member,
    cashOnHand: Math.max(0, member.cashOnHand - paid),
    trust: clamp(member.trust + NETWORK.tradeTrustGain, 0, 100),
  };
}

/** Gün başında esnaf kasası kısmen tazelenir — ağ kalıcı olarak kurumaz. */
export function replenishNetwork(members: TradeNetworkMember[]): TradeNetworkMember[] {
  return members.map((m) => ({
    ...m,
    cashOnHand: Math.min(
      NETWORK.cashBand[1],
      m.cashOnHand + Math.round(NETWORK.cashBand[1] * NETWORK.dailyReplenishShare),
    ),
  }));
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
