/**
 * MIHENKAYNAK — Müşteri hafızası, kişisel güven ve sadakat
 * Kaynak: GDD 10 "Müşteri Hafızası, Güven ve İtibar Ekonomisi",
 *         GDD 30.2 MVP "Basit tekrar müşteri ve kişisel güven".
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * GDD 10: "Güven MIHENKAYNAK'te dekoratif sosyal puan değil, GELECEKTEKİ
 * İŞLEM KALİTESİNİ DEĞİŞTİREN EKONOMİK VARLIKTIR."
 *
 * Bu cümle bu dosyanın var olma nedeni. Önceden `visitHistory` alanı vardı
 * ama hiç yazılmıyordu: her müşteri sonsuza dek yabancıydı, güven işlem
 * içinde oynayıp işlem bitince buharlaşıyordu. Yani güven ekonomik varlık
 * değil, geçici bir sayıydı.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * DEĞİŞMEZLER (GDD 10.4 — güven exploit koruması):
 *   · Güven tek bir pahalı jestle satın alınamaz; DAVRANIŞ GEÇMİŞİNİN
 *     AĞIRLIKLI TOPLAMIdır.
 *   · Aynı müşteride küçük düşük marjlı işlemleri spam ederek hızlı VIP
 *     olmak engellenir.
 *   · Hatalı ekspertiz gibi ciddi olaylar sıradan iyi fiyatlardan daha ağır
 *     etki yaratır.
 *   · Referans müşteri olasılığı yüksek güven + YETERLİ ZİYARET GEÇMİŞİ ister.
 */

import { t } from '@i18n/index';
import { MEMORY, TRUST } from './balance';
import { Rng, deriveSeed } from './rng';
import type { ArchetypeId, Customer, GameDay, Money, VisitRecord } from './types';

/**
 * Bir müşterinin kalıcı kaydı. Müşteri gidince silinmez; geri döndüğünde
 * bu kayıttan yeniden kurulur.
 */
export interface CustomerRecord {
  id: string;
  displayName: string;
  archetype: ArchetypeId;
  /** GDD 10.1 "Kişisel Güven" — geçmişin ağırlıklı toplamından türer. */
  trust: number;
  /** GDD 10.2 — kaydedilen olaylar. */
  history: VisitRecord[];
  visits: number;
  lastVisitDay: GameDay;
  /** Bu müşteriyle dönen toplam ciro — sadakatin ekonomik ağırlığı. */
  lifetimeVolume: Money;
  /** Bu müşteriyi kim yönlendirdi (GDD 10.3 referans). */
  referredBy: string | null;
  /** Spawn'da sabitlenen kimlik parçaları — geri dönünce aynı kişi gelir. */
  spawnIndex: number;
}

export type CustomerRegistry = Record<string, CustomerRecord>;

/** İlk kez görülen müşteriden kalıcı kayıt üretir. */
export function createRecord(customer: Customer, day: GameDay, spawnIndex: number): CustomerRecord {
  return {
    id: customer.id,
    displayName: customer.displayName,
    archetype: customer.archetype,
    trust: customer.trust,
    history: [],
    visits: 0,
    lastVisitDay: day,
    lifetimeVolume: 0,
    referredBy: customer.referralSource,
    spawnIndex,
  };
}

// ---------------------------------------------------------------------------
// GDD 10.2 / 10.4 — GEÇMİŞTEN GÜVEN
// ---------------------------------------------------------------------------

/**
 * GDD 10.4: "Güven ... DAVRANIŞ GEÇMİŞİNİN AĞIRLIKLI TOPLAMIdır."
 *
 * Üç kural birlikte çalışır:
 *   1. Yakın geçmiş uzak geçmişten ağır basar (üstel sönüm) — insan hafızası
 *      böyle işler ve eski bir iyiliğin sonsuza kadar kalkan olmasını önler.
 *   2. CİDDİ olaylar ağırlıklandırılır: hatalı ekspertiz ve söz tutmama,
 *      sıradan iyi fiyattan daha ağır (10.4 üçüncü madde).
 *   3. Aynı yönde art arda gelen KÜÇÜK kazançların getirisi azalır — spam
 *      koruması (10.4 ikinci madde).
 */
export function trustFromHistory(base: number, history: VisitRecord[]): number {
  let score = 0;
  let positiveRun = 0;

  // En yeniden en eskiye doğru ilerle; sönüm yaşla artar.
  const ordered = [...history].reverse();

  ordered.forEach((visit, ageIndex) => {
    const decay = Math.pow(MEMORY.recencyDecay, ageIndex);
    const severity = SEVERITY[visit.outcome] ?? 1;

    // GDD 10.4 — "Güven TEK BİR PAHALI JESTLE SATIN ALINAMAZ."
    // Tek olayın etkisi tavanlıdır; tavan olmadan büyük tek bir hamle,
    // istikrarlı bir geçmişten daha ağır basıyordu — yani güven tam olarak
    // satın alınabiliyordu.
    let delta = clamp(
      visit.trustDelta * severity,
      -MEMORY.maxSingleEventSwing,
      MEMORY.maxSingleEventSwing,
    );

    if (delta > 0) {
      // GDD 10.4 — küçük iyi işlemleri spamlayarak hızlı VIP olunamaz.
      // Art arda gelen her küçük kazanç bir öncekinden daha az sayar.
      if (Math.abs(visit.trustDelta) <= MEMORY.smallGainThreshold) {
        positiveRun += 1;
        delta *= Math.pow(MEMORY.repeatGainFalloff, positiveRun - 1);
      } else {
        positiveRun = 0;
      }
    } else {
      positiveRun = 0;
    }

    score += delta * decay;
  });

  return clamp(Math.round(base + score), 0, 100);
}

/**
 * Olay ağırlıkları. GDD 10.4: "Hatalı ekspertiz gibi CİDDİ OLAYLAR sıradan
 * iyi fiyatlardan DAHA AĞIR etki yaratabilir."
 */
const SEVERITY: Record<VisitRecord['outcome'], number> = {
  accepted: 1,
  serviceBooked: 1.1,
  rejected: 1.2,
  // Müşterinin sabrı bitip çıkması, basit bir redden ağırdır.
  walkedOut: 1.6,
};

/** Ziyareti kaydeder ve güveni geçmişten YENİDEN türetir. */
export function recordVisit(
  record: CustomerRecord,
  visit: VisitRecord,
  volume: Money = 0,
): CustomerRecord {
  // Aynı işlem iki kez kaydedilmez (GDD 22.1 ruhu: tek olay, tek kayıt).
  if (visit.dealId && record.history.some((h) => h.dealId === visit.dealId)) return record;

  const history = [...record.history, visit].slice(-MEMORY.maxHistory);

  return {
    ...record,
    history,
    visits: record.visits + 1,
    lastVisitDay: visit.day,
    lifetimeVolume: record.lifetimeVolume + Math.max(0, volume),
    // Güven ANLIK DELTA ile değil, geçmişin tamamından türer. Böylece tek bir
    // pahalı jest kalıcı bir sıçrama yaratamaz (GDD 10.4).
    trust: trustFromHistory(MEMORY.baseTrust, history),
  };
}

// ---------------------------------------------------------------------------
// GDD 10.3 — SADAKAT VE REFERANS
// ---------------------------------------------------------------------------

/**
 * GDD 10.3: "Sadık müşteri yalnız daha sık gelmez. DAHA YÜKSEK SEPET, DAHA
 * DÜŞÜK ŞÜPHE, özel ürün getirme, servis kullanma veya YENİ MÜŞTERİ
 * YÖNLENDİRME olasılığı üretir."
 *
 * "Bu nedenle oyuncunun en düşük alış fiyatını zorlamak yerine bazı
 * müşterilerde UZUN VADELİ DEĞERİ KORUMASI rasyonel olabilir."
 * Bu cümle bir denge şartı: aşağıdaki etkiler, sert pazarlığın kısa vadeli
 * kazancını uzun vadede geri alacak kadar gerçek olmalı.
 *
 * Pazarlık toleransı BİLEREK burada yok: güven zaten `effectiveReservation`
 * üzerinden esnemeyi belirliyor. İkinci bir tolerans kanalı açmak aynı şeyi
 * iki kez saymak olurdu.
 */
export interface LoyaltyEffects {
  /** Bütçe/sepet çarpanı. */
  basketMultiplier: number;
  /** Şüphe azalması (0–100 ölçeğinde puan). */
  suspicionRelief: number;
  /** Referans müşteri getirme olasılığı. */
  referralChance: number;
  /** Oyuncuya gösterilecek kısa etiket. */
  label: string;
}

export function loyaltyEffects(record: CustomerRecord | null): LoyaltyEffects {
  if (!record || record.visits === 0) return NEUTRAL_LOYALTY;

  // Sadakat iki şeyin birlikte fonksiyonu: güven YÖNÜ verir, ziyaret sayısı
  // o yönü PEKİŞTİRİR.
  //
  // İkisini toplamak yanlıştı: dört kez gelip küsmüş bir müşteri, ziyaret
  // sayısı düşük güveni telafi ettiği için "tanıdık" görünüyordu. Oysa çok
  // görüşüp kötü ayrılmak, ilişkiyi belirsiz değil KESİN yapar.
  const trustPart = clamp((record.trust - MEMORY.baseTrust) / 50, -1, 1);
  const visitPart = Math.min(1, record.visits / MEMORY.loyalVisits);
  const conviction = MEMORY.singleVisitWeight + (1 - MEMORY.singleVisitWeight) * visitPart;
  const loyalty = clamp(trustPart * conviction, -1, 1);

  return {
    basketMultiplier: 1 + loyalty * MEMORY.basketSwing,
    suspicionRelief: Math.max(0, loyalty) * MEMORY.suspicionRelief,
    // GDD 10.4 — referans YÜKSEK GÜVEN + YETERLİ ZİYARET ister; ikisi de.
    referralChance:
      record.trust >= MEMORY.referralTrust && record.visits >= MEMORY.referralVisits
        ? MEMORY.referralChance
        : 0,
    label: loyaltyLabel(loyalty, record),
  };
}

const NEUTRAL_LOYALTY: LoyaltyEffects = {
  basketMultiplier: 1,
  suspicionRelief: 0,
  referralChance: 0,
  label: 'Yeni müşteri',
};

function loyaltyLabel(loyalty: number, record: CustomerRecord): string {
  if (record.visits === 0) return t('Yeni müşteri');
  if (loyalty >= 0.55) return `Sadık müşteri · ${record.visits}. ziyaret`;
  if (loyalty <= -0.35) return `Küsmüş müşteri · ${record.visits}. ziyaret`;
  return `Tanıdık · ${record.visits}. ziyaret`;
}

// ---------------------------------------------------------------------------
// TEKRAR ZİYARET
// ---------------------------------------------------------------------------

/**
 * GDD 10.3 "Sadık müşteri ... DAHA SIK GELİR."
 *
 * Dönüş olasılığı güvenle artar, küsmüş müşteride sıfıra yaklaşır ve son
 * ziyaretten bu yana geçen günle birlikte yavaşça toparlanır (kapıdan
 * çıkan müşteri ertesi gün geri gelmez).
 */
export function returnWeight(record: CustomerRecord, today: GameDay): number {
  const daysSince = Math.max(0, today - record.lastVisitDay);
  if (daysSince < MEMORY.minDaysBetweenVisits) return 0;

  const trustPart = (record.trust - MEMORY.baseTrust) / 50; // -1 .. +1
  const base = MEMORY.baseReturnWeight * (1 + trustPart * MEMORY.trustReturnSwing);

  // Çok uzak geçmişte kalan müşteri yavaş yavaş unutulur.
  const staleness = Math.max(0.15, 1 - daysSince / MEMORY.forgetAfterDays);

  return Math.max(0, base * staleness);
}

/**
 * Bugün gelen müşteri tanıdık mı, yabancı mı — DETERMİNİSTİK seçim.
 *
 * (rootSeed, spawnIndex) ikilisi kararı tamamen belirler; kayıt defteri de
 * kaydedilen durumun parçası olduğu için reload aynı müşteriyi üretir
 * (GDD 11.4 / 28.3).
 */
export function pickReturningCustomer(
  rootSeed: number,
  spawnIndex: number,
  registry: CustomerRegistry,
  today: GameDay,
): CustomerRecord | null {
  const candidates = Object.values(registry)
    .map((record) => ({ record, weight: returnWeight(record, today) }))
    .filter((c) => c.weight > 0);

  if (candidates.length === 0) return null;

  const rng = new Rng(deriveSeed(rootSeed, 'customer/return', spawnIndex));
  const total = candidates.reduce((sum, c) => sum + c.weight, 0);

  // Havuzun tamamı gelse bile yeni müşteri akışı kurumaz: dönüş payı
  // tavanlıdır. Aksi hâlde geç oyunda dükkâna hiç yeni yüz girmezdi.
  const returnShare = Math.min(MEMORY.maxReturnShare, total);
  if (!rng.chance(returnShare)) return null;

  let roll = rng.next() * total;
  for (const c of candidates) {
    roll -= c.weight;
    if (roll <= 0) return c.record;
  }
  return candidates[candidates.length - 1]!.record;
}

/**
 * Kalıcı kaydı bu ziyaretin müşterisine giydirir.
 *
 * Kimlik ve ilişki kayıttan gelir; davranış parametreleri (sabır, aciliyet,
 * bugünkü niyet) ziyaretin kendisinden. Aynı kişi ama aynı gün değil.
 */
export function applyMemory(customer: Customer, record: CustomerRecord): Customer {
  const effects = loyaltyEffects(record);

  return {
    ...customer,
    id: record.id,
    displayName: record.displayName,
    archetype: record.archetype,
    trust: record.trust,
    // GDD 10.3 — sadık müşteri daha yüksek sepetle gelir.
    budget: Math.round(customer.budget * effects.basketMultiplier),
    // ... ve daha az şüphelenir.
    suspicion: clamp(Math.round(customer.suspicion - effects.suspicionRelief), 0, 100),
    visitHistory: record.history,
    referralSource: record.referredBy,
  };
}

/** Tanıdık müşteri sayısı — İşletme ekranı özeti için. */
export function registrySummary(registry: CustomerRegistry): {
  known: number;
  loyal: number;
  upset: number;
  lifetimeVolume: Money;
} {
  const records = Object.values(registry);
  return {
    known: records.length,
    loyal: records.filter((r) => r.trust >= MEMORY.referralTrust && r.visits >= 2).length,
    upset: records.filter((r) => r.trust <= MEMORY.upsetTrust).length,
    lifetimeVolume: records.reduce((sum, r) => sum + r.lifetimeVolume, 0),
  };
}

/**
 * GDD 10.1 — kişisel güvenin semt itibarına yansıması.
 * "Tek işlem itibarı uçurmaz" (GDD 10.4) → transfer oranı küçüktür.
 */
export function reputationDelta(trustDelta: number): number {
  return Math.round(trustDelta * TRUST.reputationTransfer);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
