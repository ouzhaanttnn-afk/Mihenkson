import { t } from '@i18n/index';
import type { Gate, UpgradeEvaluation } from '@domain/store-growth';
import type { GameState } from '@state/gameStore';

/** Presentation only: six existing career gates, never a new saved mission. */
export const STORE_TASK_ORDER = [
  'closedDeals', 'knownCustomers', 'level', 'supplierTrust', 'reputation', 'netWorth',
] as const;
export type StoreTaskKey = typeof STORE_TASK_ORDER[number];

export function storeGrowthTasks(evaluation: UpgradeEvaluation): Gate[] {
  return STORE_TASK_ORDER.flatMap(key => {
    const gate = evaluation.gates.find(g => g.key === key);
    return gate ? [gate] : [];
  });
}

export function storeTaskLabel(key: Gate['key']): string {
  switch (key) {
    case 'closedDeals': return t('İşlem kapat');
    case 'knownCustomers': return t('Müşteri tanı');
    case 'level': return t('Seviye yükselt');
    case 'supplierTrust': return t('Toptancı güveni');
    case 'reputation': return t('Semt itibarı');
    case 'netWorth': return t('Net servet');
    default: return t('Yatırım bedeli');
  }
}

export function storeTaskHint(key: Gate['key']): string {
  switch (key) {
    case 'closedDeals': return t('Tamamlanan ticari işlemler sayılır.');
    case 'knownCustomers': return t('İlk kez tanıştığın müşteriler sayılır; aynı kişi tekrar sayılmaz.');
    case 'level': return t('Ticaret ve atölye işleriyle XP kazan. Yetenek puanı ayrı ilerler.');
    case 'supplierTrust': return t('Anlamlı toptancı alışları ve mevcut vadeleri zamanında ödeme güven kazandırır.');
    case 'reputation': return t('İyi kapanan işlemler itibarı artırır; müşteriyi kaçırmak düşürebilir.');
    case 'netWorth': return t('Nakit, stok ve HAS değeri; tedarik ve diğer ödenecekler düşülür. Değer değişebilir.');
    default: return '';
  }
}

/** Freeze only row membership, not live values, readiness or payment eligibility. */
export function groupStoreTasks(tasks: Gate[], frozenMissingKeys?: readonly Gate['key'][]) {
  return {
    missing: tasks.filter(g => frozenMissingKeys ? frozenMissingKeys.includes(g.key) : !g.met),
    ready: tasks.filter(g => frozenMissingKeys ? !frozenMissingKeys.includes(g.key) : g.met),
  };
}

/** Ignore the personnel timer; all canonical wealth and display inputs remain live. */
export function storeGrowthInputs(s: GameState) {
  return {
    ...s.store, personnelElapsedSeconds: 0,
    inventory: s.inventory, items: s.items, ledger: s.ledger, customers: s.customers,
    spot: s.market.goldSpot, playerMarket: s.playerMarket,
    language: s.preferences.language, currency: s.preferences.currency,
  };
}
