/**
 * Mihenk 1.3.0: public, derived shop direction and consequences.
 * This module never settles, spawns, advances time or previews future market RNG.
 * Keys and numeric values belong to the read model; UI owns localized sentences.
 */
import { isMarketOpen, isShopOpen, nextMarketOpenDay } from './calendar';
import { marketEventPresentation } from './market';
import { registrySummary, type CustomerRegistry } from './customer-memory';
import type { EconomyState, Ledger } from './settlement';
import { masterySummary, type SkillProgress } from './skill-tree';
import { evaluateUpgrade, growthSnapshot, type Gate, type GrowthSnapshot } from './store-growth';
import { tradeDayKind, type TradeDayKind } from './v5-rules';
import type { ItemInstance, MarketEvent, Money, ServiceJob, StoreState, TradeNetworkMember, VisitRecord } from './types';

export interface BusinessStoryContext {
  day: number;
  economy: EconomyState;
  customers: CustomerRegistry;
  skillProgress: SkillProgress;
  jobs: readonly ServiceJob[];
  network?: readonly TradeNetworkMember[];
  /** Only the event already exposed by the current market. */
  activeEvent?: MarketEvent | null;
}

export type BusinessStoryNearGoal =
  | { key: 'upgrade-ready'; tier: StoreState['storeTier']; investment: Money }
  | { key: 'mastery-spend'; available: number }
  | { key: 'mastery-work'; completed: number; target: number; remaining: number }
  | { key: 'upgrade-gate'; gate: Gate }
  | { key: 'career-complete' };

/** One real work threshold or unmet gate, never an average of unrelated gates. */
export function businessStoryDirection(context: BusinessStoryContext) {
  const snapshot = growthSnapshot(context.economy, registrySummary(context.customers).known);
  const upgrade = evaluateUpgrade(context.economy.store, snapshot);
  const mastery = masterySummary(context.skillProgress);
  let nearGoal: BusinessStoryNearGoal;
  if (upgrade.ready && upgrade.next) {
    nearGoal = { key: 'upgrade-ready', tier: upgrade.next.tier, investment: upgrade.investment };
  } else if (mastery.available > 0) {
    nearGoal = { key: 'mastery-spend', available: mastery.available };
  } else if (mastery.earned === 0 && mastery.next === 5) {
    nearGoal = { key: 'mastery-work', completed: mastery.completed, target: mastery.next, remaining: mastery.remaining };
  } else {
    // Fixed priority keeps the cue stable instead of comparing unlike units.
    const priority: Gate['key'][] = ['closedDeals', 'knownCustomers', 'level', 'supplierTrust', 'reputation', 'investment', 'netWorth'];
    const gate = priority.map(key => upgrade.gates.find(g => g.key === key && !g.met)).find(Boolean);
    nearGoal = gate ? { key: 'upgrade-gate', gate } : mastery.next !== null
      ? { key: 'mastery-work', completed: mastery.completed, target: mastery.next, remaining: mastery.remaining }
      : { key: 'career-complete' };
  }
  return { upgrade, mastery, nearGoal };
}

export type BusinessStoryAgendaItem =
  | { key: 'payment'; id: string; source: 'payable' | 'supplier' | 'network'; dueDay: number; amount: Money; overdue: boolean }
  | { key: 'delivery'; id: string; promisedDay: number; ready: boolean; overdue: boolean }
  | { key: 'event'; id: string; label: string; description: string; remainingDays: number }
  | { key: 'week'; day: number; kind: TradeDayKind; shopOpen: boolean; marketOpen: boolean; nextMarketOpenDay: number };

/** Commitments due today/tomorrow precede public events and the known calendar. */
export function businessStoryAgenda(context: BusinessStoryContext, options: { includeReadyDeliveries?: boolean } = {}): BusinessStoryAgendaItem[] {
  const { day, economy } = context;
  const commitments: { dueDay: number; order: number; id: string; item: BusinessStoryAgendaItem }[] = [];
  const payment = (id: string, source: 'payable' | 'supplier' | 'network', dueDay: number, amount: Money) => {
    if (!Number.isSafeInteger(dueDay) || !Number.isFinite(amount) || amount <= 0 || dueDay > day + 1) return;
    commitments.push({ dueDay, order: 0, id: `payment:${source}:${id}`, item: { key: 'payment', id, source, dueDay, amount, overdue: dueDay < day } });
  };
  economy.store.payables.forEach(p => payment(p.id, 'payable', p.dueDay, p.amount));
  economy.store.supplier.openInvoices.forEach(p => payment(p.id, 'supplier', p.dueDay, p.amount));
  context.network?.forEach(member => {
    if (member.loan) payment(member.loan.id, 'network', member.loan.dueDay, member.loan.totalDue);
  });
  context.jobs.forEach(job => {
    if (job.result === 'delivered') return;
    const ready = job.result === 'success' || job.result === 'failed';
    if (ready && options.includeReadyDeliveries === false) return;
    if (!ready && job.promisedDay > day + 1) return;
    commitments.push({ dueDay: ready ? Math.min(day, job.promisedDay) : job.promisedDay, order: 1, id: `delivery:${job.jobId}`,
      item: { key: 'delivery', id: job.jobId, promisedDay: job.promisedDay, ready, overdue: job.promisedDay < day } });
  });
  commitments.sort((a, b) => a.dueDay - b.dueDay || a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const agenda = commitments.map(c => c.item);
  const event = marketEventPresentation((context.activeEvent === undefined ? economy.market?.activeEvent : context.activeEvent) ?? null);
  if (event && event.startedDay <= day && day < event.startedDay + event.durationDays) {
    agenda.push({ key: 'event', id: event.id, label: event.label, description: event.description,
      remainingDays: event.startedDay + event.durationDays - day });
  }
  agenda.push({ key: 'week', day, kind: tradeDayKind(day), shopOpen: isShopOpen(day), marketOpen: isMarketOpen(day),
    nextMarketOpenDay: isMarketOpen(day) ? day : nextMarketOpenDay(day) });
  return agenda.slice(0, 3);
}

/** Small observed baseline, without names, ledger copies or speculative rewards. */
export interface BusinessStoryBaseline {
  version: 1;
  day: number;
  storeTier: StoreState['storeTier'];
  growth: GrowthSnapshot;
  mastery: { completed: number; earned: number; spent: number };
  relationships: { known: number; loyal: number; upset: number };
}

export function createBusinessStoryBaseline(context: BusinessStoryContext): BusinessStoryBaseline {
  const relationships = registrySummary(context.customers);
  const mastery = masterySummary(context.skillProgress);
  return {
    version: 1, day: context.day, storeTier: context.economy.store.storeTier,
    growth: growthSnapshot(context.economy, relationships.known),
    mastery: { completed: mastery.completed, earned: mastery.earned, spent: mastery.spent },
    relationships: { known: relationships.known, loyal: relationships.loyal, upset: relationships.upset },
  };
}

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const count = (value: unknown, max = Number.MAX_SAFE_INTEGER): value is number => finite(value) && Number.isSafeInteger(value) && value >= 0 && value <= max;

/** Missing/invalid legacy baselines stay unknown; never backfill a day's progress. */
export function normalizeBusinessStoryBaseline(value: unknown): BusinessStoryBaseline | null {
  if (!record(value) || value.version !== 1 || !count(value.day) || value.day < 1 || !count(value.storeTier, 5) || value.storeTier < 1 ||
      !record(value.growth) || !record(value.mastery) || !record(value.relationships)) return null;
  const g = value.growth, m = value.mastery, r = value.relationships;
  if (!finite(g.netWorth) || !finite(g.cash) || g.cash < 0 || !count(g.level) || g.level < 1 ||
      !finite(g.reputation) || g.reputation < 0 || g.reputation > 100 || !finite(g.supplierTrust) || g.supplierTrust < 0 || g.supplierTrust > 100 ||
      !count(g.closedDeals) || !count(g.knownCustomers) || !count(m.completed, 120) || !count(m.earned, 6) || !count(m.spent, 6) || m.spent > m.earned ||
      !count(r.known) || !count(r.loyal) || !count(r.upset) || r.loyal + r.upset > r.known || g.knownCustomers !== r.known) return null;
  return { version: 1, day: value.day, storeTier: value.storeTier as StoreState['storeTier'],
    growth: { netWorth: g.netWorth, cash: g.cash, reputation: g.reputation, level: g.level,
      supplierTrust: g.supplierTrust, closedDeals: g.closedDeals, knownCustomers: g.knownCustomers },
    mastery: { completed: m.completed, earned: m.earned, spent: m.spent },
    relationships: { known: r.known, loyal: r.loyal, upset: r.upset } };
}

export interface BusinessStoryDayProgress {
  version: 1;
  day: number;
  tierBefore: StoreState['storeTier'];
  tierAfter: StoreState['storeTier'];
  /** The same next tier is evaluated on both sides, even after an upgrade. */
  targetTier: StoreState['storeTier'] | null;
  delta: GrowthSnapshot & { masteryWorks: number; masteryPoints: number; masterySpent: number; loyalCustomers: number; upsetCustomers: number };
  newlyMetGateKeys: Gate['key'][];
  noLongerMetGateKeys: Gate['key'][];
}

/** Call with the closing day's state, before advancing to the next market day. */
export function businessStoryDayProgress(context: BusinessStoryContext, value: unknown): BusinessStoryDayProgress | null {
  const before = normalizeBusinessStoryBaseline(value);
  if (!before || before.day !== context.day) return null;
  const after = createBusinessStoryBaseline(context);
  // A changed tier must not silently change the requirements being compared.
  const originalTierStore = { ...context.economy.store, storeTier: before.storeTier };
  const oldEvaluation = evaluateUpgrade(originalTierStore, before.growth);
  const newEvaluation = evaluateUpgrade(originalTierStore, after.growth);
  const delta = Object.fromEntries(Object.keys(before.growth).map(key => [key,
    after.growth[key as keyof GrowthSnapshot] - before.growth[key as keyof GrowthSnapshot],
  ])) as unknown as GrowthSnapshot;
  return { version: 1, day: context.day, tierBefore: before.storeTier, tierAfter: after.storeTier, targetTier: oldEvaluation.next?.tier ?? null,
    delta: { ...delta, masteryWorks: after.mastery.completed - before.mastery.completed,
      masteryPoints: after.mastery.earned - before.mastery.earned, masterySpent: after.mastery.spent - before.mastery.spent,
      loyalCustomers: after.relationships.loyal - before.relationships.loyal, upsetCustomers: after.relationships.upset - before.relationships.upset },
    newlyMetGateKeys: newEvaluation.gates.filter(g => g.met && !oldEvaluation.gates.find(old => old.key === g.key)?.met).map(g => g.key),
    noLongerMetGateKeys: newEvaluation.gates.filter(g => !g.met && oldEvaluation.gates.find(old => old.key === g.key)?.met).map(g => g.key),
  };
}

/** Nested reports are optional presentation data; corrupted summaries stay absent. */
export function normalizeBusinessStoryDayProgress(value: unknown): BusinessStoryDayProgress | null {
  if (!record(value) || value.version !== 1 || !count(value.day) || value.day < 1 ||
      !count(value.tierBefore, 5) || value.tierBefore < 1 || !count(value.tierAfter, 5) || value.tierAfter < value.tierBefore ||
      value.targetTier !== (value.tierBefore < 4 ? value.tierBefore + 1 : null) || !record(value.delta)) return null;
  const d = value.delta;
  const moneyKeys = ['cash', 'netWorth'] as const;
  const pointKeys = ['reputation', 'supplierTrust'] as const;
  const countKeys = ['level', 'closedDeals', 'knownCustomers', 'loyalCustomers', 'upsetCustomers'] as const;
  if (!moneyKeys.every(key => finite(d[key])) || !pointKeys.every(key => finite(d[key]) && Math.abs(d[key]) <= 100) ||
      !countKeys.every(key => finite(d[key]) && Number.isSafeInteger(d[key])) ||
      !finite(d.masteryWorks) || !Number.isSafeInteger(d.masteryWorks) || Math.abs(d.masteryWorks) > 120 ||
      !finite(d.masteryPoints) || !Number.isSafeInteger(d.masteryPoints) || Math.abs(d.masteryPoints) > 6 ||
      !finite(d.masterySpent) || !Number.isSafeInteger(d.masterySpent) || Math.abs(d.masterySpent) > 6) return null;
  const validKeys: Gate['key'][] = ['netWorth', 'reputation', 'level', 'supplierTrust', 'closedDeals', 'knownCustomers', 'investment'];
  const gateKeys = (keys: unknown): keys is Gate['key'][] => Array.isArray(keys) && keys.length <= validKeys.length &&
    new Set(keys).size === keys.length && keys.every(key => validKeys.includes(key));
  if (!gateKeys(value.newlyMetGateKeys) || !gateKeys(value.noLongerMetGateKeys)) return null;
  const newlyMetGateKeys = value.newlyMetGateKeys, noLongerMetGateKeys = value.noLongerMetGateKeys;
  if (newlyMetGateKeys.some(key => noLongerMetGateKeys.includes(key))) return null;
  const delta = Object.fromEntries([...moneyKeys, ...pointKeys, ...countKeys, 'masteryWorks', 'masteryPoints', 'masterySpent']
    .map(key => [key, d[key]])) as unknown as BusinessStoryDayProgress['delta'];
  return { version: 1, day: value.day, tierBefore: value.tierBefore as StoreState['storeTier'],
    tierAfter: value.tierAfter as StoreState['storeTier'], targetTier: value.targetTier as StoreState['storeTier'] | null,
    delta, newlyMetGateKeys: [...newlyMetGateKeys], noLongerMetGateKeys: [...noLongerMetGateKeys] };
}

export interface CustomerReturnContext {
  key: 'customer-return';
  visits: number;
  lastVisitDay: number;
  lastOutcome: VisitRecord['outcome'] | null;
  trust: number;
  productNames: string[];
  tradeSide: 'bought-from-customer' | 'sold-to-customer' | 'trade' | null;
}

/** Products require a matching actual visit, transaction and applied txId. */
export function customerReturnContext(
  customerId: string,
  customers: CustomerRegistry,
  ledger: Ledger,
  items: Readonly<Record<string, ItemInstance>>,
): CustomerReturnContext | null {
  const customer = customers[customerId];
  if (!customer || customer.visits <= 0) return null;
  const visit = customer.history.at(-1);
  const result: CustomerReturnContext = { key: 'customer-return', visits: customer.visits, lastVisitDay: customer.lastVisitDay,
    lastOutcome: visit?.outcome ?? null, trust: customer.trust, productNames: [], tradeSide: null };
  if (!visit?.dealId || visit.outcome !== 'accepted') return result;
  const appliedIds = new Set(ledger.appliedTxIds);
  const proofs = ledger.transactions.flatMap(tx => {
    if (tx.dealId !== visit.dealId || tx.day !== visit.day || !appliedIds.has(tx.txId)) return [];
    const ownedDeals = ledger.deals.filter(deal => deal.customerId === customerId && deal.day === visit.day && deal.finalState === 'ACCEPTED' && deal.price > 0 &&
      (deal.side === 'buy' && deal.dealId.startsWith(`${visit.dealId}_`) && tx.txId === `settle_${deal.dealId}` ||
       deal.side === 'sell' && deal.dealId === `${visit.dealId}_pkg` && tx.txId === `sale_${visit.dealId}` ||
       deal.side === 'sell' && deal.dealId === visit.dealId && tx.txId === visit.dealId));
    if (ownedDeals.length === 0) return [];
    const ownedItemIds = new Set(ownedDeals.flatMap(deal => deal.itemIds));
    const incoming = tx.itemsIn.filter(item => ownedItemIds.has(item.id));
    const outgoing = tx.itemsOut.filter(out => ownedItemIds.has(out.itemId)).flatMap(out => {
      const item = items[out.itemId];
      return item ? [item] : [];
    });
    return [{ incoming, outgoing }];
  });
  result.productNames = [...new Set(proofs.flatMap(proof => [...proof.incoming, ...proof.outgoing])
    .map(item => item.displayName).filter(Boolean))].slice(0, 3);
  if (result.productNames.length > 0) {
    const incoming = proofs.some(proof => proof.incoming.length > 0);
    const outgoing = proofs.some(proof => proof.outgoing.length > 0);
    result.tradeSide = incoming && outgoing ? 'trade' : incoming ? 'bought-from-customer' : 'sold-to-customer';
  }
  return result;
}
