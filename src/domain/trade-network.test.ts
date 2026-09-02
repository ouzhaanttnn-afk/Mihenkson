/**
 * MIHENKAYNAK — Esnaf ağı kabul testleri
 * Kaynak: Ekonomi Ara Düzeltmesi v1.0 · §8, §12.6, §12.2, §11.
 */

import { describe, expect, it } from 'vitest';

import { CHANNEL, NETWORK, WHOLESALE } from './balance';
import { createMarketForDay } from './market';
import { spawnItem } from './item-spawn';
import {
  accrueNetworkOverdue,
  applyLiquidation,
  buysBullion,
  memberFeeRate,
  memberLoanCeiling,
  memberTermDays,
  networkAbsorptionCapacity,
  networkDebt,
  networkDebtCeiling,
  networkLiquidationOffer,
  networkLoanOffer,
  openLoan,
  repayLoan,
  replenishNetwork,
  spawnNetwork,
} from './trade-network';
import { creditTermDays, quoteLiquidation } from './wholesaler';
import type {
  InventoryPosition,
  ItemInstance,
  StoreState,
  TradeNetworkMember,
} from './types';

const SEED = 20260827;
const MARKET = createMarketForDay(SEED, 1);
const ITEM = spawnItem(SEED, 1, 'quarter_gold');
const ITEMS: Record<string, ItemInstance> = { [ITEM.id]: ITEM };

function member(over: Partial<TradeNetworkMember> = {}): TradeNetworkMember {
  return {
    id: 'e1',
    displayName: 'Test Sarraf',
    craft: 'sarraf',
    trust: 50,
    cashOnHand: 60_000,
    bullionAppetite: 0.9,
    loan: null,
    history: { repaidOnTime: 0, repaidLate: 0 },
    ...over,
  };
}

function position(quantity: number, unitCost = 7_000): InventoryPosition {
  return {
    itemId: ITEM.id,
    quantity,
    costBasis: unitCost * quantity,
    currentValue: unitCost * quantity,
    age: 1,
    demand: 'steady',
    thesis: null,
    location: 'backStock',
    expectedExitValues: {},
  };
}

function makeStore(over: Partial<StoreState> = {}): StoreState {
  return {
    name: 'Test',
    cash: 100_000,
    reputation: 50,
    level: 2,
    xp: 0,
    xpToNext: 580,
    storeTier: 1,
    displaySlots: 8,
    backStockSlots: 16,
    workshopCapacity: 2,
    staff: [],
    supplier: {
      trust: 50,
      limit: 100_000,
      terms: 3,
      openInvoices: [],
      priceBand: 1,
      specialLotEligibility: false,
    },
    payables: [],
    dailyOverhead: 1_200,
    ...over,
  };
}

// ===========================================================================
// §8 — AĞ, TOPTANCININ KOPYASI DEĞİLDİR
// ===========================================================================

describe('§8 — Esnaf ağı toptancının farklı ismi DEĞİLDİR', () => {
  it('ağ TEK HESAP değil, ayrı kasaları olan üyelerden oluşur', () => {
    const net = spawnNetwork(SEED, 45);
    expect(net.length).toBe(NETWORK.memberCount);
    // Üyeler birbirinin kopyası değil.
    expect(new Set(net.map((m) => m.cashOnHand)).size).toBeGreaterThan(1);
    expect(new Set(net.map((m) => m.craft)).size).toBeGreaterThan(1);
    // Her üyenin kendi ilişkisi var.
    expect(new Set(net.map((m) => m.trust)).size).toBeGreaterThan(1);
  });

  it('vade toptancınınkinden KISADIR (§8 "kısa vadeli")', () => {
    const store = makeStore();
    expect(memberTermDays(member({ trust: 100 }))).toBeLessThan(creditTermDays(store));
  });

  it('ağ tavanı toptancı limitinden ve üye tavanları TOPLAMINDAN küçüktür', () => {
    const net = spawnNetwork(SEED, 60).map((m) => ({ ...m, trust: 90 }));
    const uyeToplami = net.reduce((s, m) => s + memberLoanCeiling(m), 0);
    // Toplam olsaydı üye sayısını artırmak sınırsız bankaya giden yol olurdu.
    expect(networkDebtCeiling(net)).toBeLessThan(uyeToplami);
    expect(networkDebtCeiling(net)).toBeLessThan(WHOLESALE.minLimit * 10);
  });

  it('kanal profili de ayrıdır: ilişkiye daha duyarlı, kapasitesi çok daha dar', () => {
    expect(CHANNEL.tradeNetwork.relationshipWeight).toBeGreaterThan(
      CHANNEL.wholesaler.relationshipWeight,
    );
    expect(CHANNEL.tradeNetwork.capacityUnits).toBeLessThan(CHANNEL.wholesaler.capacityUnits);
  });

  it('ağ deterministiktir — reload ağı yeniden çekmez', () => {
    expect(spawnNetwork(SEED, 45)).toEqual(spawnNetwork(SEED, 45));
  });
});

// ===========================================================================
// §8 — ALTIN BOZDURMA: FİYAT, KAPASİTE, İLİŞKİ, PİYASA
// ===========================================================================

describe('§8 — Altın bozdurma dört sınıra bağlıdır', () => {
  it('"uygun esnafta" — iştahı düşük esnaf sarrafiye almaz', () => {
    const saatci = member({ craft: 'saatci', bullionAppetite: 0.05 });
    expect(buysBullion(saatci)).toBe(false);
    expect(
      networkLiquidationOffer(saatci, ITEM.id, 5, ITEMS, [position(10)], MARKET),
    ).toBeNull();
  });

  it('KAPASİTE: esnafın kasası fiyattan önce gelir', () => {
    const dar = member({ cashOnHand: 15_000 });
    const offer = networkLiquidationOffer(dar, ITEM.id, 40, ITEMS, [position(40)], MARKET)!;

    expect(offer.quantity).toBeGreaterThan(0);
    expect(offer.total).toBeLessThanOrEqual(dar.cashOnHand);
    expect(offer.shortfallReason).toMatch(/kasas/i);
  });

  it('KAPASİTE: kasası boş esnaf hiç alamaz ve nedeni söylenir', () => {
    const bos = member({ cashOnHand: 0 });
    const offer = networkLiquidationOffer(bos, ITEM.id, 5, ITEMS, [position(10)], MARKET)!;
    expect(offer.quantity).toBe(0);
    expect(offer.shortfallReason).toBeTruthy();
  });

  it('İLİŞKİ: güvenilen esnaf daha iyi fiyat verir', () => {
    const yeni = networkLiquidationOffer(
      member({ trust: 5, cashOnHand: 500_000 }),
      ITEM.id,
      4,
      ITEMS,
      [position(10)],
      MARKET,
    )!;
    const kadim = networkLiquidationOffer(
      member({ trust: 95, cashOnHand: 500_000 }),
      ITEM.id,
      4,
      ITEMS,
      [position(10)],
      MARKET,
    )!;
    expect(kadim.unitPrice).toBeGreaterThan(yeni.unitPrice);
  });

  it('PİYASA: şok rejiminde kanal daralır', () => {
    const sakin = networkLiquidationOffer(
      member({ cashOnHand: 5_000_000 }),
      ITEM.id,
      200,
      ITEMS,
      [position(200)],
      { ...MARKET, regime: 'calm' },
    )!;
    const sok = networkLiquidationOffer(
      member({ cashOnHand: 5_000_000 }),
      ITEM.id,
      200,
      ITEMS,
      [position(200)],
      { ...MARKET, regime: 'shock' },
    )!;
    expect(sok.quantity).toBeLessThan(sakin.quantity);
  });

  it('stokta olandan fazlası bozulamaz; negatif stok oluşmaz (§11)', () => {
    const offer = networkLiquidationOffer(
      member({ cashOnHand: 5_000_000 }),
      ITEM.id,
      999,
      ITEMS,
      [position(3)],
      MARKET,
    )!;
    expect(offer.quantity).toBeLessThanOrEqual(3);
  });

  it('maliyet tabanı yalnız bozulan adedin payıdır (GDD 31.3)', () => {
    const offer = networkLiquidationOffer(
      member({ cashOnHand: 5_000_000 }),
      ITEM.id,
      4,
      ITEMS,
      [position(10, 7_000)],
      MARKET,
    )!;
    expect(offer.costBasis).toBe(28_000);
  });

  it('§8 — ağ kapasitesi KULLANILDIKÇA daralır', () => {
    const m = member({ cashOnHand: 60_000 });
    const before = networkLiquidationOffer(m, ITEM.id, 40, ITEMS, [position(40)], MARKET)!;
    const after = applyLiquidation(m, before.total);

    expect(after.cashOnHand).toBeLessThan(m.cashOnHand);
    const second = networkLiquidationOffer(after, ITEM.id, 40, ITEMS, [position(40)], MARKET)!;
    expect(second.quantity).toBeLessThan(before.quantity);
  });

  it('ağ toplam emme kapasitesi sonludur', () => {
    const net = spawnNetwork(SEED, 50);
    const capacity = networkAbsorptionCapacity(net, ITEM.id, ITEMS, [position(9_999)], MARKET);
    expect(capacity).toBeGreaterThan(0);
    // Sonlu: stokta 9.999 adet olsa bile ağ hepsini alamaz.
    expect(capacity).toBeLessThan(9_999);
  });

  it('§12.2 — aynı ürün ve anda esnaf ağı ile toptancı FARKLI sonuç verir', () => {
    const store = makeStore();
    const inv = [position(20)];
    const esnaf = networkLiquidationOffer(
      member({ cashOnHand: 5_000_000, trust: 50 }),
      ITEM.id,
      20,
      ITEMS,
      inv,
      MARKET,
    )!;
    const toptanci = quoteLiquidation({ itemId: ITEM.id, quantity: 20 }, ITEMS, inv, MARKET, store)!;
    expect(esnaf.unitPrice).not.toBe(toptanci.slices[0]!.unitPrice);
  });
});

// ===========================================================================
// §8 — KISA VADELİ TİCARİ BORÇ
// ===========================================================================

describe('§8 — Borç güven, geçmiş davranış, açık borç ve vade ile sınırlı', () => {
  it('GÜVEN kapasiteyi büyütür', () => {
    expect(memberLoanCeiling(member({ trust: 90 }))).toBeGreaterThan(
      memberLoanCeiling(member({ trust: 10 })),
    );
  });

  it('GEÇMİŞ DAVRANIŞ kapasiteyi taşır: düzenli ödeme büyütür, gecikme daraltır', () => {
    const duzenli = member({ history: { repaidOnTime: 3, repaidLate: 0 } });
    const gecikmeli = member({ history: { repaidOnTime: 0, repaidLate: 3 } });
    expect(memberLoanCeiling(duzenli)).toBeGreaterThan(memberLoanCeiling(member()));
    expect(memberLoanCeiling(gecikmeli)).toBeLessThan(memberLoanCeiling(member()));
  });

  it('AÇIK BORÇ: aynı esnaftan ikinci borç alınamaz', () => {
    const borclu = member({
      loan: { id: 'l', memberId: 'e1', principal: 5_000, totalDue: 5_200, dueDay: 9, takenDay: 7 },
    });
    expect(networkLoanOffer(borclu, [borclu], 3_000, 7).blockedReason).toMatch(/zaten/i);
  });

  it('§8 — ağ tavanı aşılamaz: "aynı anda TÜM ESNAFTAN sınırsız borç" yok', () => {
    // Üye tavanı ağ tavanından küçük olduğu için tek borçla ağ dolmaz —
    // §8'in yasakladığı şey zaten "tüm esnaftan aynı anda" borçlanmaktır.
    // Bu yüzden test esnaf esnaf gezip tavana dayanıyor.
    let members = spawnNetwork(SEED, 60);
    const ceiling = networkDebtCeiling(members);

    let blocked: string | null = null;
    let opened = 0;

    for (const m of members) {
      const cap = Math.min(memberLoanCeiling(m), m.cashOnHand);
      const offer = networkLoanOffer(m, members, cap, 1);
      if (offer.blockedReason) {
        blocked = offer.blockedReason;
        break;
      }
      members = members.map((x) => (x.id === m.id ? openLoan(x, offer, 1) : x));
      opened += 1;
    }

    // Ağ tavanı GERÇEKTEN devreye giriyor: tüm esnaftan borç alınamıyor.
    expect(opened).toBeGreaterThan(0);
    expect(opened).toBeLessThan(members.length);
    expect(blocked).toMatch(/ağ kapasitesi/i);
    expect(networkDebt(members)).toBeLessThanOrEqual(ceiling);
  });

  it('istenen tutar üye tavanını aşarsa reddedilir ve tavan söylenir', () => {
    const m = member({ trust: 50, cashOnHand: 500_000 });
    const offer = networkLoanOffer(m, [m], memberLoanCeiling(m) + 1, 1);
    expect(offer.blockedReason).toMatch(/en çok/i);
  });

  it('esnafın kasasından fazlası ödünç alınamaz', () => {
    const fakir = member({ cashOnHand: 1_500, trust: 100 });
    expect(networkLoanOffer(fakir, [fakir], 5_000, 1).maxAmount).toBeLessThanOrEqual(1_500);
  });

  it('borç verilen para esnafın KASASINDAN çıkar — tek ortak kapasite', () => {
    const m = member({ cashOnHand: 50_000, trust: 100 });
    const tutar = Math.min(10_000, memberLoanCeiling(m));
    const offer = networkLoanOffer(m, [m], tutar, 1);
    expect(offer.blockedReason).toBeNull();

    const after = openLoan(m, offer, 1);
    expect(after.cashOnHand).toBe(50_000 - tutar);
    // Ve o para artık altın almaya da yetmez.
    const before = networkLiquidationOffer(m, ITEM.id, 40, ITEMS, [position(40)], MARKET)!;
    const now = networkLiquidationOffer(after, ITEM.id, 40, ITEMS, [position(40)], MARKET)!;
    expect(now.quantity).toBeLessThan(before.quantity);
  });

  it('ücret güvenle ucuzlar ama ASLA sıfırlanmaz', () => {
    expect(memberFeeRate(member({ trust: 100 }))).toBeLessThan(memberFeeRate(member({ trust: 0 })));
    expect(memberFeeRate(member({ trust: 100 }))).toBeGreaterThanOrEqual(NETWORK.minFeeRate);
  });

  it('koşullar işlem ÖNCESİ hesaplanır ve sonradan değişmez', () => {
    const m = member();
    const a = networkLoanOffer(m, [m], 8_000, 3);
    expect(networkLoanOffer(m, [m], 8_000, 3)).toEqual(a);
    expect(a.totalDue).toBe(a.amount + a.fee);
    expect(a.dueDay).toBe(3 + a.termDays);
  });
});

describe('§8 — Gecikme ve düzenli ödemenin sonuçları', () => {
  it('zamanında ödeme ilişkiyi ve geçmişi güçlendirir', () => {
    const base = member({ trust: 50 });
    const m = openLoan(base, networkLoanOffer(base, [base], 6_000, 1), 1);
    const { member: after, onTime } = repayLoan(m, 2);

    expect(onTime).toBe(true);
    expect(after.trust).toBeGreaterThan(50);
    expect(after.history.repaidOnTime).toBe(1);
    expect(after.loan).toBeNull();
    // Verilen para kasaya geri döner: kapasite geri açılır.
    expect(after.cashOnHand).toBeGreaterThan(m.cashOnHand);
  });

  it('geç ödeme ilişkiyi AŞINDIRIR ve kapasiteyi daraltır', () => {
    const base = member({ trust: 50 });
    const m = openLoan(base, networkLoanOffer(base, [base], 6_000, 1), 1);
    const { member: after, onTime } = repayLoan(m, 20);

    expect(onTime).toBe(false);
    expect(after.trust).toBeLessThan(50);
    expect(after.history.repaidLate).toBe(1);
    expect(memberLoanCeiling(after)).toBeLessThan(memberLoanCeiling(member({ trust: after.trust })));
  });

  it('§11 — gecikmiş borç SESSİZCE SİLİNMEZ, yükü üstüne biner', () => {
    const m = member({
      loan: { id: 'l', memberId: 'e1', principal: 10_000, totalDue: 10_000, dueDay: 3, takenDay: 1 },
    });
    const { members, penalty, lateMembers } = accrueNetworkOverdue([m], 5);

    expect(lateMembers).toEqual(['e1']);
    expect(penalty).toBe(Math.round(10_000 * NETWORK.overduePerDayRate));
    expect(members[0]!.loan!.totalDue).toBe(10_000 + penalty);
    expect(members[0]!.trust).toBeLessThan(m.trust);
  });

  it('vadesi gelmemiş borç etkilenmez — geriye dönük ücret yok', () => {
    const m = member({
      loan: { id: 'l', memberId: 'e1', principal: 10_000, totalDue: 10_000, dueDay: 9, takenDay: 1 },
    });
    const { members, penalty } = accrueNetworkOverdue([m], 5);
    expect(penalty).toBe(0);
    expect(members[0]!.loan!.totalDue).toBe(10_000);
    expect(members[0]!.trust).toBe(m.trust);
  });

  it('gecikmiş borç varken ağda YENİ borç açılmaz (erişim sonucu)', () => {
    const gec = member({
      id: 'a',
      loan: { id: 'l', memberId: 'a', principal: 5_000, totalDue: 5_000, dueDay: 2, takenDay: 1 },
    });
    const temiz = member({ id: 'b' });
    expect(networkLoanOffer(temiz, [gec, temiz], 3_000, 6).blockedReason).toMatch(/gecikmiş/i);
  });

  it('esnaf kasası gün başında tazelenir — ağ kalıcı kurumaz', () => {
    const kurumus = [member({ cashOnHand: 0 })];
    const after = replenishNetwork(kurumus);
    expect(after[0]!.cashOnHand).toBeGreaterThan(0);
    // Ama tavanı aşmaz.
    const dolu = replenishNetwork([member({ cashOnHand: NETWORK.cashBand[1] })]);
    expect(dolu[0]!.cashOnHand).toBe(NETWORK.cashBand[1]);
  });
});
