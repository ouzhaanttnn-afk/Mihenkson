/**
 * MIHENKAYNAK — Mağaza yükseltme
 * Kaynak: GDD 19.2 "Mağaza yükseltme koşulları", 19.3 kapsam;
 *         GDD 18.1 sermaye ekseni; GDD 22.1 tek settlement.
 *
 * GDD 19.2 DEĞİŞMEZ: "Mağaza kademesi YALNIZ LEVEL SAYISINA BAĞLANMAZ.
 * Sermaye, itibar ve bazı operasyon/tedarik eşikleri BİRLİKTE istenir."
 *
 * Bu yüzden `evaluateUpgrade` tek bir boolean döndürmez: her kapıyı AYRI
 * AYRI raporlar. Oyuncu neyin eksik olduğunu görmeden "işletmenin gerçekten
 * hazır olması" diye bir hedefe çalışamaz.
 */

import { t } from '@i18n/index';
import { nextTierDef, tierDef, type StoreTierDef, type TierRequirement } from '@data/store-tiers';
import { summarizeWealth, type EconomyState } from './settlement';
import type { Money, StoreState } from './types';

/** Yükseltmeyi değerlendirmek için gereken işletme fotoğrafı. */
export interface GrowthSnapshot {
  netWorth: Money;
  reputation: number;
  level: number;
  supplierTrust: number;
  closedDeals: number;
  knownCustomers: number;
  cash: Money;
}

export function growthSnapshot(economy: EconomyState, knownCustomers: number): GrowthSnapshot {
  const wealth = summarizeWealth(economy);
  return {
    netWorth: wealth.netWorth,
    reputation: economy.store.reputation,
    level: economy.store.level,
    supplierTrust: economy.store.supplier.trust,
    // Yalnız KAPANMIŞ işlem sayılır; reddedilen pazarlık operasyon değildir.
    closedDeals: economy.ledger.deals.filter((d) => d.price > 0).length,
    knownCustomers,
    cash: economy.store.cash,
  };
}

/** Tek bir kapının durumu. */
export interface Gate {
  key: keyof TierRequirement | 'investment';
  label: string;
  current: number;
  needed: number;
  met: boolean;
  /** Para birimi mi, puan mı, adet mi — UI biçimlendirmesi için. */
  unit: 'money' | 'points' | 'count';
}

export interface UpgradeEvaluation {
  current: StoreTierDef;
  next: StoreTierDef | null;
  gates: Gate[];
  /** Tüm kapılar açık mı. */
  ready: boolean;
  /** Yükseltme bedeli. */
  investment: Money;
  /** Neden yapılamıyor — hazırsa null. */
  blockedReason: string | null;
}

export function evaluateUpgrade(
  store: StoreState,
  snapshot: GrowthSnapshot,
): UpgradeEvaluation {
  const current = tierDef(store.storeTier);
  const next = nextTierDef(store.storeTier);

  if (!next || !next.requires) {
    return {
      current,
      next: null,
      gates: [],
      ready: false,
      investment: 0,
      // GDD 19.3 — Marka Ağı post-1.0. Bunu "yakında" diye göstermek
      // olmayan bir hedefi varmış gibi göstermek olurdu.
      blockedReason: t('Bu sürümde son kademe.'),
    };
  }

  const r = next.requires;
  const gates: Gate[] = [
    gate('netWorth', t('Net servet'), snapshot.netWorth, r.netWorth, 'money'),
    gate('reputation', t('Semt itibarı'), snapshot.reputation, r.reputation, 'points'),
    gate('level', t('Ustalık seviyesi'), snapshot.level, r.level, 'count'),
    gate('supplierTrust', t('Toptancı güveni'), snapshot.supplierTrust, r.supplierTrust, 'points'),
    gate('closedDeals', t('Kapanmış işlem'), snapshot.closedDeals, r.closedDeals, 'count'),
    gate('knownCustomers', t('Tanıdık müşteri'), snapshot.knownCustomers, r.knownCustomers, 'count'),
    // Yatırım da bir kapıdır: hazır olmak parayı ayırabilmeyi de içerir.
    gate('investment', t('Yatırım bedeli'), snapshot.cash, next.investment, 'money'),
  ];

  const unmet = gates.filter((g) => !g.met);

  return {
    current,
    next,
    gates,
    ready: unmet.length === 0,
    investment: next.investment,
    blockedReason:
      unmet.length === 0
        ? null
        : unmet.length === 1
          ? `${unmet[0]!.label} yetersiz.`
          : `${unmet.length} koşul eksik.`,
  };
}

function gate(
  key: Gate['key'],
  label: string,
  current: number,
  needed: number,
  unit: Gate['unit'],
): Gate {
  return { key, label, current, needed, met: current >= needed, unit };
}

/**
 * Yükseltmenin mağaza durumuna etkisi.
 *
 * Kasa hareketi BURADA YAPILMAZ — o `applyTransaction`'ın işi (GDD 22.1
 * tek settlement yolu). Bu fonksiyon yalnız kademenin getirdiği kapasite
 * ve gider değişimini üretir.
 */
export function applyTierGrants(store: StoreState, next: StoreTierDef): StoreState {
  return {
    ...store,
    storeTier: next.tier,
    displaySlots: next.grants.displaySlots,
    backStockSlots: next.grants.backStockSlots,
    workshopCapacity: next.grants.workshopCapacity,
    // Büyük mağaza daha pahalıdır: yükseltme bedava bir güç artışı değil,
    // kalıcı gider taahhüdüdür (GDD 21 — kaybetme tasarımı bunu ister).
    dailyOverhead: next.grants.dailyOverhead,
  };
}
