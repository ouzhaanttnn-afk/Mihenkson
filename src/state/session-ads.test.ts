import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const runtime = vi.hoisted(() => ({
  noteCompletedSessionTrade: vi.fn(), resetSessionAds: vi.fn(), trySessionAdBreak: vi.fn(),
}));
vi.mock('@ui/session-ad-runtime', () => runtime);
vi.mock('@ui/ads', () => ({ showRewardedAd: vi.fn().mockResolvedValue(true), showInterstitialAd: vi.fn() }));

import { DAY } from '@domain/balance';
import { emptyOfflineClock, OFFLINE_MAX_MS } from '@domain/offline-personnel';
import { offlineFixture } from '@domain/offline-personnel-fixture';
import { spawnItem } from '@domain/item-spawn';
import { createMarketForDay } from '@domain/market';
import { LESSONS } from '@domain/onboarding';
import { PERSONNEL_ACTION_SECONDS } from '@domain/personnel';
import { createLedger } from '@domain/settlement';
import type { Customer, CustomerDemand } from '@domain/types';
import { clockPauseReason, offlinePersonnelEligible, setSimulationForeground, useGame, type GameState } from './gameStore';
import { clearSave, readSave, resumeSaves, serialize, suspendSaves } from './save';

const initial = useGame.getState();
let blocked = false;

function running(overrides: Partial<GameState> = {}): void {
  useGame.setState({ ...initial, seed: 42,
    market: { ...createMarketForDay(42, 1), clockMinutes: DAY.openMinutes, goldSpot: 7_100 },
    store: { ...initial.store, cash: 10_000_000, level: 9, reputation: 50, personnelCount: 0,
      personnelRoles: [], personnelElapsedSeconds: 0, staff: [], workshopCapacity: 3,
      supplier: { ...initial.store.supplier, openInvoices: [] }, payables: [] },
    tab: 'shop', speed: 1, profileSetupDone: true, seenLessons: LESSONS.map(lesson => lesson.id),
    profileOpen: false, settingsOpen: false, rankingOpen: false, stockCatalogOpen: false,
    shopTalentTreeOpen: false, personnelOpen: false, dayCloseConfirmOpen: false, dayReportOpen: false,
    weekTransitionPending: false, interstitialAdPending: false, rewardedAdPending: null,
    activeDeal: null, activeCustomer: null, recallableGuest: null, inventory: [], items: {}, jobs: [],
    ledger: createLedger(), customers: {}, queue: [], nextCustomerAtMinutes: DAY.closeMinutes + 1,
    lastReview: null, lastDayReport: null, toasts: [], offlinePersonnelClock: emptyOfflineClock(),
    offlinePersonnelReport: null, offlineSaveIssue: false, offlineResumeAtMs: null, ...overrides }, true);
}

function visitor(id: string, intent: Customer['intent'], demand: CustomerDemand | null = null): Customer {
  return { id, displayName: id, archetype: 'investor', intent, patienceMax: 20, patience: 20,
    knowledge: 80, urgency: 50, priceSensitivity: 80, status: 50, budget: 100_000_000,
    reservationPrice: 1_000, purchaseCeilingRatio: 1.15, demand, trust: 50,
    suspicion: 0, visitHistory: [], preferences: [], referralSource: null, lineIds: [] };
}

function seller(count = 1): string {
  const items = Array.from({ length: count }, (_, index) => ({
    ...spawnItem(42, 100 + index, 'ring_18k'), id: `manual-item-${index}`, location: 'customer' as const,
  }));
  useGame.setState({ queue: [{ customer: visitor('manual-seller', 'sell'), items }] });
  useGame.getState().greetCustomer();
  return useGame.getState().activeDeal!.dealId;
}

function acceptSeller(count = 1): string {
  const dealId = seller(count);
  for (const line of [...useGame.getState().activeDeal!.lines]) {
    useGame.getState().setActiveLine(line.lineId);
    useGame.getState().setStage('appraise');
    useGame.getState().setStage('negotiate');
    const deal = useGame.getState().activeDeal!;
    useGame.setState({ activeDeal: { ...deal, lines: deal.lines.map(candidate => candidate.lineId === line.lineId
      ? { ...candidate, negotiation: { ...candidate.negotiation, activeCounter: 1_000 } } : candidate) } });
    useGame.getState().negotiationMove({ kind: 'acceptCounter', atRound: 0 });
  }
  expect(useGame.getState().ledger.transactions.filter(tx => tx.dealId === dealId)).toHaveLength(count);
  return dealId;
}

beforeEach(() => {
  const data = new Map<string, string>();
  blocked = false;
  vi.stubGlobal('localStorage', { getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { if (blocked) throw new Error('Save unavailable'); data.set(key, value); },
    removeItem: (key: string) => data.delete(key) });
  vi.stubGlobal('document', { hidden: false, visibilityState: 'visible' });
  resumeSaves(); clearSave(); setSimulationForeground(true);
  runtime.noteCompletedSessionTrade.mockReset();
  runtime.resetSessionAds.mockReset();
  runtime.trySessionAdBreak.mockReset().mockResolvedValue(false);
  running();
});

afterEach(() => { useGame.setState(initial, true); resumeSaves(); setSimulationForeground(true);
  vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('session ads require completed manual visits and durable saves', () => {
  it('counts a settled multiline manual visit once only after saving the closed visit', () => {
    const dealId = acceptSeller(3);
    runtime.noteCompletedSessionTrade.mockImplementation((id: string) => {
      expect(id).toBe(dealId);
      const saved = readSave()!;
      expect(saved.activeDeal).toBeNull();
      expect(saved.activeCustomer).toBeNull();
      expect(saved.ledger.transactions.filter(tx => tx.dealId === dealId)).toHaveLength(3);
      expect(saved.store.cash).toBe(useGame.getState().store.cash);
    });

    useGame.getState().finishDeal();
    useGame.getState().finishDeal();

    expect(runtime.noteCompletedSessionTrade).toHaveBeenCalledTimes(1);
    expect(runtime.trySessionAdBreak).toHaveBeenCalledTimes(1);
    expect(runtime.trySessionAdBreak).toHaveBeenCalledWith('trade-complete', expect.any(Function), expect.any(Function));
  });

  it('an accepted-looking visit without a settlement transaction cannot count', () => {
    acceptSeller();
    useGame.setState({ ledger: createLedger() });
    useGame.getState().finishDeal();
    expect(runtime.noteCompletedSessionTrade).not.toHaveBeenCalled();
    expect(runtime.trySessionAdBreak).not.toHaveBeenCalled();
  });

  it.each([1, 4] as const)('counts one manual visit independently of %sx game speed', speed => {
    useGame.setState({ speed });
    const dealId = acceptSeller();
    useGame.getState().finishDeal();
    expect(runtime.noteCompletedSessionTrade.mock.calls).toEqual([[dealId]]);
    expect(runtime.trySessionAdBreak).toHaveBeenCalledTimes(1);
  });

  it('a nonmanual transaction cannot authorize a manual visit impression', () => {
    acceptSeller();
    const ledger = useGame.getState().ledger;
    useGame.setState({ ledger: { ...ledger, transactions: ledger.transactions.map(tx => ({ ...tx, txId: 'personnel_sale_fixture' })) } });
    useGame.getState().finishDeal();
    expect(runtime.noteCompletedSessionTrade).not.toHaveBeenCalled();
    expect(runtime.trySessionAdBreak).not.toHaveBeenCalled();
  });

  it.each(['failed', 'suspended'] as const)('does not count or request an ad when the completed visit save is %s', problem => {
    acceptSeller();
    if (problem === 'failed') blocked = true;
    else suspendSaves();
    useGame.getState().finishDeal();
    expect(runtime.noteCompletedSessionTrade).not.toHaveBeenCalled();
    expect(runtime.trySessionAdBreak).not.toHaveBeenCalled();
  });

  it('a rejected visit never counts', () => {
    seller();
    useGame.getState().setStage('appraise');
    useGame.getState().setStage('negotiate');
    useGame.getState().negotiationMove({ kind: 'reject', atRound: 0 });
    useGame.getState().finishDeal();
    expect(useGame.getState().ledger.transactions).toHaveLength(0);
    expect(runtime.noteCompletedSessionTrade).not.toHaveBeenCalled();
    expect(runtime.trySessionAdBreak).not.toHaveBeenCalled();
  });

  it('a genuinely booked service is excluded from manual trade engagement', () => {
    const item = { ...spawnItem(42, 8, 'damaged_chain'), id: 'service-item', location: 'customer' as const };
    useGame.setState({ queue: [{ customer: visitor('service-guest', 'service'), items: [item] }] });
    useGame.getState().greetCustomer();
    useGame.getState().selectServiceType('chainRepair');
    useGame.getState().selectServiceVenue('inHouse');
    useGame.getState().acceptServiceJob();
    expect(useGame.getState().jobs).toHaveLength(1);
    expect(useGame.getState().ledger.transactions[0]?.txId).toMatch(/^service_accept_/);
    useGame.getState().finishDeal();
    expect(runtime.noteCompletedSessionTrade).not.toHaveBeenCalled();
    expect(runtime.trySessionAdBreak).not.toHaveBeenCalled();
  });

  it('a staffed sale does not count toward session visits', () => {
    const fixture = offlineFixture();
    running({ ...fixture.economy, market: fixture.market });
    const item = Object.values(fixture.economy.items).find(asset => asset.templateId === 'gram_gold_1')!;
    const demand: CustomerDemand = { families: [item.family], wantsBullion: true, templateId: item.templateId,
      quantity: 1, minQuantity: 1, acceptsPartial: false, isBulk: false, summary: 'One gram', alternativesLabel: '' };
    useGame.setState({ queue: [{ customer: visitor('staff-buyer', 'buy', demand), items: [] }] });
    useGame.getState().tick(PERSONNEL_ACTION_SECONDS);
    expect(useGame.getState().ledger.transactions[0]?.txId).toMatch(/^personnel_sale_/);
    expect(runtime.noteCompletedSessionTrade).not.toHaveBeenCalled();
    expect(runtime.trySessionAdBreak).not.toHaveBeenCalled();
  });

  it('offline personnel settlement does not count toward session visits', () => {
    const fixture = offlineFixture(), start = 1_800_000_000_000;
    running({ ...fixture.economy, market: fixture.market });
    expect(useGame.getState().handlePersonnelLifecycle(false, start)).toBe(true);
    expect(useGame.getState().handlePersonnelLifecycle(true, start + OFFLINE_MAX_MS)).toBe(true);
    expect(useGame.getState().offlinePersonnelReport?.sales).toBeGreaterThan(0);
    expect(runtime.noteCompletedSessionTrade).not.toHaveBeenCalled();
    expect(runtime.trySessionAdBreak).not.toHaveBeenCalled();
  });

  it('offers the day-report break only after the report dismissal is persisted', () => {
    useGame.getState().advanceDay();
    expect(useGame.getState().dayReportOpen).toBe(true);
    expect(readSave()?.dayReportOpen).toBe(true);
    expect(runtime.trySessionAdBreak).not.toHaveBeenCalled();
    runtime.trySessionAdBreak.mockImplementation((kind: string, safe: () => boolean) => {
      expect(kind).toBe('day-report');
      expect(readSave()?.dayReportOpen).toBe(false);
      expect(readSave()?.market.day).toBe(2);
      expect(safe()).toBe(true);
      return Promise.resolve(false);
    });
    useGame.getState().startNewDay();
    useGame.getState().startNewDay();
    expect(runtime.trySessionAdBreak).toHaveBeenCalledTimes(1);
  });

  it.each(['failed', 'suspended'] as const)('skips the day-report ad when saves are %s', problem => {
    useGame.getState().advanceDay();
    if (problem === 'failed') blocked = true;
    else suspendSaves();
    useGame.getState().startNewDay();
    expect(runtime.trySessionAdBreak).not.toHaveBeenCalled();
    if (problem === 'failed') expect(useGame.getState().dayReportOpen).toBe(true);
  });

  it('pending presentation pauses ticks and cannot arm an offline sales shift', () => {
    const fixture = offlineFixture(), start = 1_800_000_000_000;
    running({ ...fixture.economy, market: fixture.market, interstitialAdPending: true, speed: 4 });
    const before = useGame.getState();
    expect(clockPauseReason(before)).toBe('shop-modal');
    expect(offlinePersonnelEligible(before)).toBe(false);
    useGame.getState().tick(120);
    expect(useGame.getState().market).toBe(before.market);
    expect(useGame.getState().store).toBe(before.store);
    expect(useGame.getState().ledger).toBe(before.ledger);
    expect(useGame.getState().handlePersonnelLifecycle(false, start)).toBe(true);
    expect(useGame.getState().offlinePersonnelClock.session).toBeNull();
  });

  it('the break callback controls the transient pause and protects newly opened surfaces', () => {
    acceptSeller();
    useGame.getState().finishDeal();
    const [, safe, pending] = runtime.trySessionAdBreak.mock.calls[0]! as [string, () => boolean, (value: boolean) => void];
    expect(safe()).toBe(true);
    pending(true);
    expect(useGame.getState().interstitialAdPending).toBe(true);
    expect(safe()).toBe(true);
    useGame.setState({ settingsOpen: true });
    expect(safe()).toBe(false);
    useGame.setState({ settingsOpen: false, tab: 'business' });
    expect(safe()).toBe(false);
    useGame.setState({ tab: 'shop' });
    setSimulationForeground(false);
    expect(safe()).toBe(false);
    pending(false);
    expect(useGame.getState().interstitialAdPending).toBe(false);
  });

  it('never persists the transient pending gate and clears it immediately on reset', () => {
    useGame.setState({ interstitialAdPending: true });
    expect(serialize(useGame.getState())).not.toHaveProperty('interstitialAdPending');
    useGame.getState().resetGame();
    expect(runtime.resetSessionAds).toHaveBeenCalledTimes(1);
    expect(useGame.getState().interstitialAdPending).toBe(false);
    expect(readSave()).toBeNull();
  });
});
