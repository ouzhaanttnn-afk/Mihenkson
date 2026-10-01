import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ads = vi.hoisted(() => ({ showRewardedAd: vi.fn(), showInterstitialAd: vi.fn() }));
vi.mock('@ui/ads', () => ads);
vi.mock('@ui/session-ad-runtime', () => ({ noteCompletedSessionTrade: vi.fn(),
  resetSessionAds: vi.fn(), trySessionAdBreak: vi.fn().mockResolvedValue(false) }));

import { bullionMeta } from '@data/bullion';
import { getServiceType } from '@data/service-types';
import { DAY } from '@domain/balance';
import { createRecord } from '@domain/customer-memory';
import { spawnItem } from '@domain/item-spawn';
import { createMarketForDay } from '@domain/market';
import { createSession } from '@domain/negotiation';
import { LESSONS } from '@domain/onboarding';
import { availableWorkshopStaff, PERSONNEL_ACTION_SECONDS } from '@domain/personnel';
import { personnelSale } from '@domain/personnel-sale';
import { advanceJobsOneDay, buildQuote, errorRisk, findQuote, inHouseLoad } from '@domain/service';
import { createLedger } from '@domain/settlement';
import type { Customer, CustomerDemand, InventoryPosition, ItemInstance } from '@domain/types';
import { trueValue } from '@domain/valuation';
import { quoteContext, setSimulationForeground, useGame, type GameState } from './gameStore';
import { deserialize, serialize } from './save';

const initial = useGame.getState();

function running(overrides: Partial<GameState> = {}): void {
  useGame.setState({ ...initial, seed: 42,
    market: { ...createMarketForDay(42, 1), clockMinutes: DAY.openMinutes, goldSpot: 7_100 },
    store: { ...initial.store, cash: 1_000_000, level: 9, reputation: 50,
      personnelCount: 1, personnelRoles: ['sales'], personnelElapsedSeconds: 0, staff: [],
    workshopCapacity: 3, supplier: { ...initial.store.supplier, openInvoices: [] }, payables: [] },
    tab: 'shop', speed: 1, profileSetupDone: true, seenLessons: LESSONS.map(lesson => lesson.id),
    profileOpen: false, settingsOpen: false, rankingOpen: false, stockCatalogOpen: false,
    shopTalentTreeOpen: false, personnelOpen: false, dayCloseConfirmOpen: false, dayReportOpen: false,
    rewardedAdPending: null, activeDeal: null, activeCustomer: null, recallableGuest: null,
    inventory: [], items: {}, jobs: [], jobCounter: 0, ledger: createLedger(), customers: {},
    rewardedDailyUses: {},
    queue: [], nextCustomerAtMinutes: DAY.closeMinutes + 1, lastReview: null, toasts: [],
    ...overrides }, true);
}

function visitor(id: string, intent: Customer['intent'], demand: CustomerDemand | null = null): Customer {
  return { id, displayName: id, archetype: 'investor', intent, patienceMax: 8, patience: 8,
    knowledge: 80, urgency: 50, priceSensitivity: 80, status: 50, budget: 100_000_000,
    reservationPrice: 1_000, purchaseCeilingRatio: 1.15, demand, trust: 50,
    suspicion: 0, visitHistory: [], preferences: [], referralSource: null, lineIds: [] };
}

function saleQueue(count = 1): void {
  const state = useGame.getState();
  const source = spawnItem(42, 7, 'gram_gold_1');
  const meta = bullionMeta(source.templateId)!;
  const asset: ItemInstance = { ...source, id: 'staff-stock', location: 'backStock', buyCost: 100,
    truth: { ...source.truth, actualPurity: meta.unitPurity, craftsmanship: 0, hiddenFlaws: [] } };
  const position: InventoryPosition = { itemId: asset.id, quantity: count, costBasis: 100 * count,
    currentValue: trueValue(asset, state.market) * count, age: 0, demand: 'steady',
    thesis: null, location: 'backStock', expectedExitValues: {} };
  const demand: CustomerDemand = { families: [asset.family], wantsBullion: true,
    templateId: asset.templateId, quantity: 1, minQuantity: 1, acceptsPartial: false,
    isBulk: false, summary: 'One gram', alternativesLabel: '' };
  useGame.setState({ items: { [asset.id]: asset }, inventory: [position],
    queue: Array.from({ length: count }, (_, index) => ({ customer: visitor(`buyer-${index}`, 'buy', demand),
      items: [] })) });
}

function serviceGuest(id = 'service-guest', typeId = 'chainRepair'): void {
  const asset = { ...spawnItem(42, 8, 'damaged_chain'), id: `item-${id}`, location: 'customer' as const,
    truth: { ...spawnItem(42, 8, 'damaged_chain').truth, condition: 'damaged' as const } };
  useGame.setState({ queue: [{ customer: visitor(id, 'service'), items: [asset] }] });
  useGame.getState().greetCustomer();
  useGame.getState().selectServiceType(typeId);
  useGame.getState().selectServiceVenue('inHouse');
}

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) });
  vi.stubGlobal('document', { hidden: false, visibilityState: 'visible' });
  setSimulationForeground(true);
  ads.showRewardedAd.mockReset().mockResolvedValue(true);
  ads.showInterstitialAd.mockReset().mockResolvedValue(undefined);
  running();
});

afterEach(() => {
  useGame.setState(initial, true);
  setSimulationForeground(true);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('1.2.0 personnel active-play integration', () => {
  it('settles one real profitable order only after 90 foreground seconds, independently of speed', () => {
    saleQueue(2);
    useGame.setState({ speed: 2 });
    const before = useGame.getState();
    useGame.getState().tick(PERSONNEL_ACTION_SECONDS - .5);
    expect(useGame.getState().store.cash).toBe(before.store.cash);
    expect(useGame.getState().queue).toHaveLength(2);
    expect(useGame.getState().store.personnelElapsedSeconds).toBe(89.5);
    useGame.getState().tick(.5);
    const after = useGame.getState();
    expect(after.queue).toHaveLength(1);
    expect(after.inventory[0]?.quantity).toBe(1);
    expect(after.store.personnelElapsedSeconds).toBe(0);
    expect(after.ledger.deals).toHaveLength(1);
    const record = after.ledger.deals[0]!;
    expect(after.store.cash - before.store.cash).toBe(record.price);
    expect(after.ledger.realizedProfitTotal).toBe(record.price - 100);
    expect(after.store.supplier).toEqual(before.store.supplier);
    expect(after.store.payables).toEqual(before.store.payables);
    expect(after.store.xp).toBe(before.store.xp);
  });

  it.each([
    ['management', { tab: 'business' as const }], ['modal', { rankingOpen: true }],
    ['personnel management', { personnelOpen: true }],
    ['quick stock', { stockCatalogOpen: true }], ['rewarded ad', { rewardedAdPending: 'customerRush' as const }],
  ])('does not accrue or sell during %s', (_, patch) => {
    saleQueue();
    useGame.setState({ ...patch, store: { ...useGame.getState().store, personnelElapsedSeconds: 89.5 } });
    const before = useGame.getState();
    useGame.getState().tick(180);
    const after = useGame.getState();
    expect(after.market).toEqual(before.market);
    expect(after.store).toEqual(before.store);
    expect(after.inventory).toEqual(before.inventory);
    expect(after.queue).toEqual(before.queue);
    expect(after.ledger).toEqual(before.ledger);
  });

  it('does not accrue, greet or sell while the page is hidden; resume has no offline catch-up', () => {
    saleQueue(2);
    useGame.setState({ store: { ...useGame.getState().store, personnelElapsedSeconds: 89.5 } });
    const before = useGame.getState();
    vi.stubGlobal('document', { hidden: true, visibilityState: 'hidden' });
    useGame.getState().tick(180);
    expect(useGame.getState().market).toEqual(before.market);
    expect(useGame.getState().store).toEqual(before.store);
    expect(useGame.getState().queue).toEqual(before.queue);
    expect(useGame.getState().ledger).toEqual(before.ledger);
    vi.stubGlobal('document', { hidden: false, visibilityState: 'visible' });
    useGame.getState().tick(.25);
    expect(useGame.getState().ledger.deals).toHaveLength(0);
    useGame.getState().tick(.25);
    expect(useGame.getState().ledger.deals).toHaveLength(1);
    expect(useGame.getState().queue).toHaveLength(1);
  });

  it('never loops accumulated intervals into multiple automatic transactions', () => {
    saleQueue(2);
    useGame.getState().tick(200);
    expect(useGame.getState().ledger.deals).toHaveLength(1);
    expect(useGame.getState().queue).toHaveLength(1);
    expect(useGame.getState().store.personnelElapsedSeconds).toBe(0);
    useGame.getState().tick(0);
    expect(useGame.getState().ledger.deals).toHaveLength(1);
  });

  it('native lifecycle backgrounding pauses even when the WebView document stays visible', () => {
    saleQueue();
    useGame.setState({ store: { ...useGame.getState().store, personnelElapsedSeconds: 89.5 } });
    const before = useGame.getState();
    setSimulationForeground(false);
    useGame.getState().tick(180);
    expect(useGame.getState().market).toEqual(before.market);
    expect(useGame.getState().store).toEqual(before.store);
    expect(useGame.getState().queue).toEqual(before.queue);
    expect(useGame.getState().ledger).toEqual(before.ledger);
    setSimulationForeground(true);
    useGame.getState().tick(.5);
    expect(useGame.getState().ledger.deals).toHaveLength(1);
  });

  it('reception opens a real customer dialogue and automation stays paused throughout it', () => {
    saleQueue(2);
    useGame.setState({ store: { ...useGame.getState().store, personnelRoles: ['reception'] } });
    useGame.getState().tick(90);
    const during = useGame.getState();
    expect(during.activeCustomer?.id).toBe('buyer-0');
    expect(during.activeDeal?.flow).toBe('purchase');
    expect(during.queue).toHaveLength(1);
    expect(during.ledger.transactions).toHaveLength(0);
    useGame.getState().tick(90);
    expect(useGame.getState().market).toEqual(during.market);
    expect(useGame.getState().store).toEqual(during.store);
    expect(useGame.getState().queue).toEqual(during.queue);
    expect(useGame.getState().activeDeal).toEqual(during.activeDeal);
  });

  it('save/load preserves the active timer without awarding any offline sale', () => {
    saleQueue(2);
    useGame.setState({ store: { ...useGame.getState().store, personnelElapsedSeconds: 45 } });
    const before = useGame.getState();
    const saved = JSON.parse(JSON.stringify(serialize(before)));
    const restored = deserialize(saved);
    expect(restored.store.personnelElapsedSeconds).toBe(45);
    expect(restored.store.cash).toBe(before.store.cash);
    expect(restored.inventory).toMatchObject(before.inventory);
    expect(restored.inventory).toHaveLength(before.inventory.length);
    expect(restored.queue.map(guest => ({ id: guest.customer.id, quantity: guest.customer.demand?.quantity })))
      .toEqual(before.queue.map(guest => ({ id: guest.customer.id, quantity: guest.customer.demand?.quantity })));
    expect(restored.ledger).toEqual(before.ledger);
  });

  it('a returning customer can complete a new visit without replaying the earlier staff transaction', () => {
    saleQueue();
    useGame.getState().tick(90);
    const first = useGame.getState();
    expect(first.ledger.deals).toHaveLength(1);
    expect(first.customers['buyer-0']?.visits).toBe(1);
    expect(first.customers['buyer-0']?.history.filter(visit => visit.outcome === 'accepted')).toHaveLength(1);
    const firstTransaction = first.ledger.transactions[0]!;
    // Returning visitors retain the same customer identity, but have a fresh
    // order and visit. A permanent customer id cannot be their settlement id.
    useGame.setState({ market: { ...createMarketForDay(42, 2), clockMinutes: DAY.openMinutes, goldSpot: 7_100 } });
    saleQueue();
    const secondVisit = useGame.getState();
    expect(secondVisit.queue[0]?.customer.id).toBe(first.ledger.deals[0]?.customerId);
    secondVisit.tick(90);
    const after = useGame.getState();
    expect(after.queue).toHaveLength(0);
    expect(after.inventory).toHaveLength(0);
    expect(after.ledger.deals).toHaveLength(2);
    expect(after.ledger.transactions).toHaveLength(2);
    expect(after.ledger.transactions[0]).toEqual(firstTransaction);
    expect(new Set(after.ledger.appliedTxIds).size).toBe(2);
    expect(after.customers['buyer-0']?.visits).toBe(2);
    expect(after.customers['buyer-0']?.lastVisitDay).toBe(2);
    expect(after.customers['buyer-0']?.history.filter(visit => visit.outcome === 'accepted')).toHaveLength(2);
    expect(after.customers['buyer-0']?.lifetimeVolume).toBe(after.ledger.deals.reduce((sum, deal) => sum + deal.price, 0));
    const record = after.ledger.deals[1]!;
    expect(after.store.cash - secondVisit.store.cash).toBe(record.price);
    expect(after.ledger.realizedProfitTotal - secondVisit.ledger.realizedProfitTotal).toBe(record.price - 100);
  });
});

describe('1.2.0 workshop worker assignment integration', () => {
  beforeEach(() => useGame.setState({ store: { ...useGame.getState().store,
    personnelCount: 2, personnelRoles: ['workshop', 'workshop'] } }));

  it('uses available worker risk, assigns deterministically, and excludes a busy worker from later jobs', () => {
    serviceGuest();
    const first = useGame.getState();
    const quote = findQuote(first.activeDeal!.service!.quotes, 'chainRepair', 'inHouse')!;
    expect(availableWorkshopStaff(first.store, first.jobs)).toEqual(['personnel_1', 'personnel_2']);
    expect(quote.risk).toBe(errorRisk(getServiceType('chainRepair'), quoteContext(first), 'inHouse'));
    const noWorkerRisk = errorRisk(getServiceType('chainRepair'), {
      ...quoteContext(first), store: { ...first.store, personnelRoles: ['idle', 'idle'] } }, 'inHouse');
    expect(quote.risk).toBeLessThan(noWorkerRisk);
    first.acceptServiceJob();
    const job = useGame.getState().jobs[0]!;
    expect(job.assignedStaff).toBe('personnel_1');
    expect(job.risk).toBe(quote.risk);
    expect(availableWorkshopStaff(useGame.getState().store, useGame.getState().jobs)).toEqual(['personnel_2']);
    useGame.getState().finishDeal();
    serviceGuest('second-service');
    const second = useGame.getState();
    const nextQuote = findQuote(second.activeDeal!.service!.quotes, 'chainRepair', 'inHouse')!;
    expect(inHouseLoad(second.jobs)).toBe(1);
    expect(nextQuote.risk).toBeGreaterThan(quote.risk);
    second.acceptServiceJob();
    expect(useGame.getState().jobs[1]?.assignedStaff).toBe('personnel_2');
    expect(availableWorkshopStaff(useGame.getState().store, useGame.getState().jobs)).toEqual([]);
  });

  it('cannot change or fire the worker of a pending job, including count reductions', () => {
    serviceGuest();
    useGame.getState().acceptServiceJob();
    const before = useGame.getState();
    before.setPersonnelRole(0, 'sales');
    expect(useGame.getState().store.personnelRoles).toEqual(['workshop', 'workshop']);
    useGame.getState().setPersonnelCount(0);
    expect(useGame.getState().store.personnelCount).toBe(2);
    expect(useGame.getState().jobs).toEqual(before.jobs);
    // Removing only an unassigned worker remains allowed.
    useGame.getState().setPersonnelCount(1);
    expect(useGame.getState().store.personnelCount).toBe(1);
    expect(useGame.getState().jobs).toEqual(before.jobs);
  });

  it('keeps accepted risk, costs and outcome fixed through unrelated reassignment and save/load', () => {
    serviceGuest();
    useGame.getState().acceptServiceJob();
    const snapshot = structuredClone(useGame.getState().jobs[0]!);
    useGame.getState().setPersonnelRole(1, 'sales');
    expect(useGame.getState().jobs[0]).toEqual(snapshot);
    const restored = deserialize(JSON.parse(JSON.stringify(serialize(useGame.getState()))));
    expect(restored.jobs[0]).toEqual(snapshot);
    useGame.getState().acceptServiceJob();
    expect(useGame.getState().jobs).toHaveLength(1);
    expect(useGame.getState().jobs[0]).toEqual(snapshot);
    expect(useGame.getState().ledger.appliedTxIds.filter(id => id.startsWith('service_accept_'))).toHaveLength(1);
  });

  it('an outsourced job neither reserves an in-house worker nor gains its risk reduction', () => {
    serviceGuest();
    useGame.getState().selectServiceVenue('outsourced');
    const state = useGame.getState();
    const quote = findQuote(state.activeDeal!.service!.quotes, 'chainRepair', 'outsourced')!;
    state.acceptServiceJob();
    const job = useGame.getState().jobs[0]!;
    expect(job.assignedStaff).toBeNull();
    expect(job.risk).toBe(quote.risk);
    expect(availableWorkshopStaff(useGame.getState().store, useGame.getState().jobs)).toHaveLength(2);
    expect(inHouseLoad(useGame.getState().jobs)).toBe(0);
  });

  it('refreshes the visible unaccepted quote when a free worker role changes', () => {
    serviceGuest();
    const before = findQuote(useGame.getState().activeDeal!.service!.quotes, 'chainRepair', 'inHouse')!;
    useGame.getState().setTab('business');
    useGame.getState().setPersonnelRole(0, 'sales');
    const state = useGame.getState();
    const after = findQuote(state.activeDeal!.service!.quotes, 'chainRepair', 'inHouse')!;
    const asset = state.items[state.activeDeal!.lines[0]!.itemId]!;
    expect(after.risk).toBeGreaterThan(before.risk);
    expect(after).toEqual(buildQuote(asset, getServiceType('chainRepair'), 'inHouse', quoteContext(state)));
    state.setTab('shop');
    useGame.getState().acceptServiceJob();
    expect(useGame.getState().jobs[0]?.risk).toBe(after.risk);
    expect(useGame.getState().jobs[0]?.assignedStaff).toBe('personnel_2');
  });

  it('refreshes the pending quote after a real shop upgrade changes equipment and capacity', () => {
    const state = useGame.getState();
    useGame.setState({ store: { ...state.store, reputation: 80,
      supplier: { ...state.store.supplier, trust: 80 } } });
    saleQueue();
    const withStock = useGame.getState();
    const closedSale = personnelSale(withStock, withStock.queue[0]!.customer, withStock.market)!;
    expect(closedSale).not.toBeNull();
    const record = closedSale.ledger.deals[0]!;
    useGame.setState({ ledger: { ...createLedger(), deals: Array.from({ length: 18 }, (_, index) => ({
      ...record, dealId: `past-sale-${index}` })) },
      customers: Object.fromEntries(Array.from({ length: 6 }, (_, index) => {
        const customer = visitor(`known-${index}`, 'buy');
        return [customer.id, createRecord(customer, 1, index)];
      })) });
    serviceGuest();
    const before = findQuote(useGame.getState().activeDeal!.service!.quotes, 'chainRepair', 'inHouse')!;
    useGame.getState().setTab('business');
    useGame.getState().upgradeStore();
    const after = useGame.getState();
    expect(after.store.storeTier).toBe(2);
    const refreshed = findQuote(after.activeDeal!.service!.quotes, 'chainRepair', 'inHouse')!;
    const asset = after.items[after.activeDeal!.lines[0]!.itemId]!;
    expect(refreshed.risk).toBeLessThan(before.risk);
    expect(refreshed).toEqual(buildQuote(asset, getServiceType('chainRepair'), 'inHouse', quoteContext(after)));
    after.acceptServiceJob();
    expect(useGame.getState().jobs[0]?.risk).toBe(refreshed.risk);
  });

  it('refreshes a pending quote when a workshop rush frees a worker and occupied slot', async () => {
    serviceGuest();
    useGame.getState().acceptServiceJob();
    useGame.getState().finishDeal();
    useGame.setState({ jobs: advanceJobsOneDay(useGame.getState().jobs) });
    const oldJob = structuredClone(useGame.getState().jobs[0]!);
    expect(oldJob.remainingDays).toBe(1);
    serviceGuest('waiting-service');
    const quote = findQuote(useGame.getState().activeDeal!.service!.quotes, 'chainRepair', 'inHouse')!;
    useGame.getState().setTab('workshop');
    await useGame.getState().requestWorkshopRush(oldJob.jobId);
    expect(ads.showRewardedAd).toHaveBeenCalledWith('workshopRush');
    const after = useGame.getState();
    const completed = after.jobs[0]!;
    expect(completed.predeterminedOutcome).toBe(oldJob.predeterminedOutcome);
    expect(completed.risk).toBe(oldJob.risk);
    expect(completed.fee).toBe(oldJob.fee);
    expect(completed.result).toBe(oldJob.predeterminedOutcome);
    expect(availableWorkshopStaff(after.store, after.jobs)).toHaveLength(2);
    const refreshed = findQuote(after.activeDeal!.service!.quotes, 'chainRepair', 'inHouse')!;
    const asset = after.items[after.activeDeal!.lines[0]!.itemId]!;
    expect(refreshed.risk).toBeLessThan(quote.risk);
    expect(refreshed).toEqual(buildQuote(asset, getServiceType('chainRepair'), 'inHouse', quoteContext(after)));
    after.acceptServiceJob();
    expect(useGame.getState().jobs[1]?.risk).toBe(refreshed.risk);
    expect(useGame.getState().jobs[1]?.assignedStaff).toBe('personnel_1');
  });

  it('temporary personnel expiry keeps the accepted outcome and cannot reuse its pending worker id', () => {
    useGame.setState({ store: { ...useGame.getState().store, level: 6,
      personnelCount: 3, personnelRoles: ['idle', 'idle', 'workshop'],
      personnelTempUnlockTier: 3, personnelTempUnlockUntilDay: 1 } });
    serviceGuest('expiring-worker', 'restoration');
    useGame.getState().acceptServiceJob();
    const accepted = structuredClone(useGame.getState().jobs[0]!);
    expect(accepted.assignedStaff).toBe('personnel_3');
    useGame.getState().finishDeal();
    useGame.getState().advanceDay();
    const expired = useGame.getState();
    expect(expired.market.day).toBe(2);
    expect(expired.store.personnelCount).toBe(2);
    expect(expired.jobs[0]).toMatchObject({ assignedStaff: accepted.assignedStaff,
      risk: accepted.risk, partsCost: accepted.partsCost, fee: accepted.fee,
      predeterminedOutcome: accepted.predeterminedOutcome, result: 'pending',
      remainingDays: accepted.remainingDays - 1 });
    expect(availableWorkshopStaff(expired.store, expired.jobs)).toEqual([]);
    // Later permanent eligibility exposes the same slot, but cannot lend its
    // already-reserved identity to another pending job.
    useGame.setState({ store: { ...expired.store, level: 10 } });
    useGame.getState().setPersonnelCount(3);
    const beforeRole = useGame.getState().store.personnelRoles;
    useGame.getState().setPersonnelRole(2, 'sales');
    expect(useGame.getState().store.personnelRoles).toEqual(beforeRole);
    expect(availableWorkshopStaff(useGame.getState().store, useGame.getState().jobs)).toEqual([]);
    serviceGuest('later-service', 'restoration');
    useGame.getState().acceptServiceJob();
    expect(useGame.getState().jobs[1]?.assignedStaff).toBeNull();
    expect(useGame.getState().jobs.filter(job => job.result === 'pending' && job.assignedStaff === 'personnel_3')).toHaveLength(1);
    expect(useGame.getState().jobs[0]?.predeterminedOutcome).toBe(accepted.predeterminedOutcome);
  });
});

describe('1.2.0 capacity denial reaches customer result truthfully', () => {
  it.each(['backStock', 'display'] as const)('does not report a successful purchase when %s is full', location => {
    const asset = { ...spawnItem(42, 10, 'ring_18k'), id: 'capacity-visitor-item', location: 'customer' as const };
    const ownedItems = (['display', 'backStock'] as const).map(positionLocation => ({ ...asset,
      id: `owned-${positionLocation}`, location: positionLocation, buyCost: 100 }));
    const ownedPositions: InventoryPosition[] = ownedItems.map(owned => ({ itemId: owned.id,
      location: owned.location, quantity: 1, costBasis: 100, currentValue: 1_000,
      age: 0, demand: 'steady', thesis: null, expectedExitValues: {} }));
    useGame.setState({ store: { ...useGame.getState().store, backStockSlots: 1, displaySlots: 1 },
      inventory: ownedPositions, items: Object.fromEntries(ownedItems.map(owned => [owned.id, owned])),
      queue: [{ customer: visitor('capacity-visitor', 'sell'), items: [asset] }] });
    useGame.getState().greetCustomer();
    const current = useGame.getState();
    const line = current.activeDeal!.lines[0]!;
    const deal = { ...current.activeDeal!, stage: 'negotiate' as const, lines: [{ ...line,
      selectedThesis: location === 'display' ? 'retail' as const : null,
      band: { min: 800, max: 1_200, mid: 1_000, confidence: 'medium' as const, relativeWidth: .4,
        breakdown: { metal: 900, stone: 0, craftsmanship: 100, rarityPremium: 0, riskDeduction: 0, marketInfluence: 0 } },
      negotiation: { ...createSession(line.lineId, line.itemId), activeCounter: 1_000 } }] };
    useGame.setState({ activeDeal: deal });
    const before = useGame.getState();
    before.negotiationMove({ kind: 'acceptCounter', atRound: 0 });
    const after = useGame.getState();
    expect(after.store.cash).toBe(before.store.cash);
    expect(after.inventory).toEqual(before.inventory);
    expect(after.ledger).toEqual(before.ledger);
    expect(after.activeDeal?.lines[0]?.negotiation.state).not.toBe('ACCEPTED');
    expect(after.activeDeal?.lines[0]?.status).not.toBe('accepted');
    expect(after.lastReview?.valueDelta ?? 0).toBe(0);
    expect(after.toasts.some(toast => toast.text.includes('kapasitesi dolu'))).toBe(true);
    after.finishDeal();
    const history = useGame.getState().customers['capacity-visitor']?.history ?? [];
    expect(history.some(visit => visit.outcome === 'accepted')).toBe(false);
  });
});
