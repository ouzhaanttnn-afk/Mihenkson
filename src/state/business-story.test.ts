import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { businessStoryContextOf, useGame, type GameState } from './gameStore';
import { deserialize, readSave, resumeSaves, serialize, writeSave } from './save';
import { createBusinessStoryBaseline } from '@domain/business-story';
import { createMarketForDay } from '@domain/market';
import { closeDay, createLedger } from '@domain/settlement';
import { defaultSkillProgress } from '@domain/skill-tree';
import { businessStoryInputs } from '@ui/business-story-inputs';
import { shallow } from 'zustand/shallow';

const initial = useGame.getState();
let storage: Map<string, string>;

function memoryStorage() {
  return {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => { storage.set(key, value); },
    removeItem: (key: string) => { storage.delete(key); },
  };
}
function economicSnapshot(state: GameState) {
  return { seed: state.seed, spawnCounter: state.spawnCounter, jobCounter: state.jobCounter,
    store: state.store, market: state.market, inventory: state.inventory, items: state.items,
    ledger: state.ledger, customers: state.customers, jobs: state.jobs, network: state.network,
    skillProgress: state.skillProgress, playerMarket: state.playerMarket };
}

beforeEach(() => {
  storage = new Map();
  vi.stubGlobal('localStorage', memoryStorage());
  resumeSaves();
  useGame.setState({ ...initial, seed: 20260827, market: createMarketForDay(20260827, 1),
    store: { ...initial.store, cash: 1_000_000, dailyOverhead: 900, personnelCount: 0, personnelRoles: [],
      personnelElapsedSeconds: 0, personnelTempUnlockTier: 0, personnelTempUnlockUntilDay: 0,
      supplier: { ...initial.store.supplier, openInvoices: [] }, payables: [] },
    inventory: [], items: {}, ledger: createLedger(), customers: {}, jobs: [], network: [], queue: [],
    skillProgress: defaultSkillProgress(), spawnCounter: 0, jobCounter: 0,
    lastDayReport: null, weekReports: [], dayReportOpen: false, dayCloseConfirmOpen: false,
    dayCloseIssue: null, activeDeal: null, activeCustomer: null, recallableGuest: null,
    toasts: [], tab: 'shop', tabHomeSignal: 0, businessRouteRequested: 'root',
    businessStoryBaseline: null, profileSetupDone: true,
    interstitialAdPending: false, weekTransitionPending: false, rewardedAdPending: null,
    offlinePersonnelReport: null, offlineSaveIssue: false, personnelCostWaivedToday: false,
  }, true);
  useGame.setState({ businessStoryBaseline: createBusinessStoryBaseline(businessStoryContextOf(useGame.getState())) });
});
afterEach(() => {
  useGame.setState(initial, true);
  resumeSaves();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('living shop baseline migration and serialization', () => {
  it('a genuinely fresh store begins with its actual day-one baseline', () => {
    expect(initial.businessStoryBaseline).not.toBeNull();
    expect(initial.businessStoryBaseline).toEqual(createBusinessStoryBaseline(businessStoryContextOf(initial)));
    expect(initial.businessStoryBaseline?.day).toBe(1);
  });
  it('retains the exact current baseline across save/load without changing economics', () => {
    const state = useGame.getState();
    expect(writeSave(state)).toBe(true);
    const loaded = readSave()!;
    expect(loaded.businessStoryBaseline).toEqual(state.businessStoryBaseline);
    expect(loaded.store).toEqual(state.store);
    expect(loaded.ledger).toEqual(state.ledger);
    expect(loaded.inventory).toEqual(state.inventory);
  });
  it('does not backfill progress for legacy saves missing a baseline', () => {
    const old = serialize(useGame.getState());
    delete old.businessStoryBaseline;
    const loaded = deserialize(old);
    expect(loaded.businessStoryBaseline).toBeNull();
    expect(loaded.store.cash).toBe(old.store.cash);
    expect(loaded.ledger).toEqual(old.ledger);
    useGame.setState(loaded);
    useGame.getState().advanceDay();
    expect(useGame.getState().lastDayReport?.businessStoryProgress).toBeNull();
    expect(useGame.getState().businessStoryBaseline?.day).toBe(2);
  });
  it('keeps an explicit unknown legacy baseline null during an ordinary checkpoint', () => {
    useGame.setState({ businessStoryBaseline: null });
    expect(writeSave(useGame.getState())).toBe(true);
    expect(readSave()?.businessStoryBaseline).toBeNull();
  });
  it('rejects wrong-day and malformed baselines without modifying financial fields', () => {
    const state = useGame.getState();
    for (const baseline of [{ ...state.businessStoryBaseline!, day: 2 },
      { ...state.businessStoryBaseline!, growth: { ...state.businessStoryBaseline!.growth, netWorth: null } }]) {
      const loaded = deserialize({ ...serialize(state), businessStoryBaseline: baseline as never });
      expect(loaded.businessStoryBaseline).toBeNull();
      expect(loaded.store).toEqual(state.store);
      expect(loaded.ledger).toEqual(state.ledger);
    }
  });
});

describe('living shop day checkpoint and economic equivalence', () => {
  it('stores one closing-day story and the exact next-day baseline before display', () => {
    const before = useGame.getState();
    const baseline = before.businessStoryBaseline;
    before.advanceDay();
    const after = useGame.getState();
    expect(after.market.day).toBe(2);
    expect(after.store.cash).toBe(999_100);
    expect(after.lastDayReport?.businessStoryProgress).toMatchObject({ version: 1, day: 1,
      delta: { cash: -900, netWorth: -900, masteryWorks: 0, masteryPoints: 0 } });
    expect(after.businessStoryBaseline).toEqual(createBusinessStoryBaseline(businessStoryContextOf(after)));
    expect(after.businessStoryBaseline).not.toEqual(baseline);
    expect(after.businessStoryBaseline?.day).toBe(2);
    expect(after.weekReports).toHaveLength(1);
    expect(after.weekReports[0]?.businessStoryProgress).toEqual(after.lastDayReport?.businessStoryProgress);
    const loaded = readSave()!;
    expect(loaded.dayReportOpen).toBe(true);
    expect(loaded.lastDayReport?.businessStoryProgress).toEqual(after.lastDayReport?.businessStoryProgress);
    expect(loaded.businessStoryBaseline).toEqual(after.businessStoryBaseline);
  });
  it('repeated close, reload and acknowledgment do not repeat costs, report or baseline', () => {
    useGame.getState().advanceDay();
    const closed = useGame.getState();
    const story = closed.lastDayReport?.businessStoryProgress;
    const nextBaseline = closed.businessStoryBaseline;
    closed.advanceDay();
    expect(useGame.getState().market.day).toBe(2);
    expect(useGame.getState().businessStoryBaseline).toBe(nextBaseline);
    useGame.setState(readSave()!);
    useGame.getState().startNewDay();
    useGame.getState().startNewDay();
    const acknowledged = useGame.getState();
    expect(acknowledged.market.day).toBe(2);
    expect(acknowledged.store.cash).toBe(999_100);
    expect(acknowledged.lastDayReport?.businessStoryProgress).toEqual(story);
    expect(acknowledged.businessStoryBaseline).toEqual(nextBaseline);
    expect(acknowledged.weekReports).toHaveLength(1);
    expect(acknowledged.ledger.transactions.filter(tx => tx.txId === 'dayclose_1')).toHaveLength(1);
    expect(readSave()?.businessStoryBaseline).toEqual(nextBaseline);
  });
  it('a failed checkpoint preserves the old baseline, day and economics; retry applies once', () => {
    expect(writeSave(useGame.getState())).toBe(true);
    const before = useGame.getState();
    vi.stubGlobal('localStorage', { ...memoryStorage(), setItem: () => { throw new Error('quota'); } });
    before.advanceDay();
    const blocked = useGame.getState();
    expect(blocked.dayCloseIssue).toBe('save-failed');
    expect(blocked.businessStoryBaseline).toBe(before.businessStoryBaseline);
    expect(blocked.market).toBe(before.market);
    expect(economicSnapshot(blocked)).toEqual(economicSnapshot(before));
    expect(blocked.lastDayReport).toBeNull();
    expect(blocked.dayReportOpen).toBe(false);
    expect(readSave()?.businessStoryBaseline).toEqual(before.businessStoryBaseline);
    vi.stubGlobal('localStorage', memoryStorage());
    blocked.advanceDay();
    expect(useGame.getState().market.day).toBe(2);
    expect(useGame.getState().ledger.transactions.filter(tx => tx.txId === 'dayclose_1')).toHaveLength(1);
  });
  it('insufficient funds cannot create a next baseline or a closing-day story', () => {
    useGame.setState({ store: { ...useGame.getState().store, cash: 10 } });
    const before = useGame.getState();
    before.advanceDay();
    const blocked = useGame.getState();
    expect(blocked.dayCloseIssue).toBe('insufficient-funds');
    expect(blocked.businessStoryBaseline).toBe(before.businessStoryBaseline);
    expect(blocked.market.day).toBe(1);
    expect(blocked.store.cash).toBe(10);
    expect(blocked.lastDayReport).toBeNull();
    expect(blocked.ledger.transactions).toHaveLength(0);
  });
  it('the story feature changes no economic result compared with an absent baseline', () => {
    const before = useGame.getState();
    const plainClose = closeDay(businessStoryContextOf(before).economy, 1);
    before.advanceDay();
    const withStory = economicSnapshot(useGame.getState());
    expect(withStory.store.cash).toBe(plainClose.state.store.cash);
    expect(withStory.ledger.transactions).toEqual(plainClose.state.ledger.transactions);
    useGame.setState({ ...before, businessStoryBaseline: null }, true);
    useGame.getState().advanceDay();
    expect(economicSnapshot(useGame.getState())).toEqual(withStory);
    expect(useGame.getState().lastDayReport?.businessStoryProgress).toBeNull();
  });
  it('nested corrupted story data is removed while the saved financial report survives', () => {
    useGame.getState().advanceDay();
    const closed = useGame.getState();
    const file = serialize(closed);
    const malformed = { ...closed.lastDayReport!.businessStoryProgress!, delta: { cash: 3 } };
    file.lastDayReport = { ...file.lastDayReport!, businessStoryProgress: malformed as never };
    file.weekReports = [{ ...file.weekReports![0]!, businessStoryProgress: { ...malformed, version: 99 } as never }];
    const loaded = deserialize(file);
    expect(loaded.lastDayReport?.businessStoryProgress).toBeNull();
    expect(loaded.weekReports[0]?.businessStoryProgress).toBeNull();
    expect(loaded.lastDayReport?.closingCash).toBe(closed.lastDayReport?.closingCash);
    expect(loaded.lastDayReport?.overhead).toBe(900);
    expect(loaded.lastDayReport?.netCashChange).toBe(-900);
    expect(loaded.dayReportOpen).toBe(true);
    expect(loaded.store).toEqual(closed.store);
    expect(loaded.ledger).toEqual(closed.ledger);
  });
});

describe('living shop navigation is transient UI state', () => {
  it('opens a useful business destination, closes idle sheets and never persists the request', () => {
    useGame.setState({ stockCatalogOpen: true, shopTalentTreeOpen: true, personnelOpen: true, rankingOpen: true });
    useGame.getState().openBusinessRoute('store');
    const opened = useGame.getState();
    expect(opened.tab).toBe('business');
    expect(opened.businessRouteRequested).toBe('store');
    expect(opened.tabHomeSignal).toBe(1);
    expect(opened.stockCatalogOpen).toBe(false);
    expect(opened.shopTalentTreeOpen).toBe(false);
    expect(opened.personnelOpen).toBe(false);
    expect(opened.rankingOpen).toBe(false);
    const file = serialize(opened);
    expect(file).not.toHaveProperty('businessRouteRequested');
    expect(file).not.toHaveProperty('tabHomeSignal');
    expect(deserialize(file)).not.toHaveProperty('businessRouteRequested');
  });
  it('a same-tab home tap clears the requested route and increments the home signal', () => {
    useGame.getState().openBusinessRoute('store');
    const before = useGame.getState().tabHomeSignal;
    useGame.getState().setTab('business');
    expect(useGame.getState().businessRouteRequested).toBe('root');
    expect(useGame.getState().tabHomeSignal).toBe(before + 1);
  });
  it('a different-tab change also clears the route without incrementing the home signal', () => {
    useGame.getState().openBusinessRoute('network');
    const before = useGame.getState().tabHomeSignal;
    useGame.getState().setTab('stock');
    expect(useGame.getState().tab).toBe('stock');
    expect(useGame.getState().businessRouteRequested).toBe('root');
    expect(useGame.getState().tabHomeSignal).toBe(before);
  });
});

describe('living shop subscription ignores only irrelevant clock/timer changes', () => {
  it('is shallow-equal for personnel elapsed and idle game-clock updates', () => {
    const state = useGame.getState(), inputs = businessStoryInputs(state);
    const elapsed = { ...state, store: { ...state.store, personnelElapsedSeconds: 45 } };
    const clock = { ...elapsed, market: { ...elapsed.market, clockMinutes: elapsed.market.clockMinutes + 1 } };
    expect(shallow(inputs, businessStoryInputs(elapsed))).toBe(true);
    expect(shallow(inputs, businessStoryInputs(clock))).toBe(true);
  });
  it('notices cash, public gold price and immutable ledger changes', () => {
    const state = useGame.getState(), inputs = businessStoryInputs(state);
    const cash = { ...state, store: { ...state.store, cash: state.store.cash - 1 } };
    const price = { ...state, market: { ...state.market, goldSpot: state.market.goldSpot + 1 } };
    const ledger = { ...state, ledger: { ...state.ledger, transactions: [...state.ledger.transactions] } };
    expect(shallow(inputs, businessStoryInputs(cash))).toBe(false);
    expect(shallow(inputs, businessStoryInputs(price))).toBe(false);
    expect(shallow(inputs, businessStoryInputs(ledger))).toBe(false);
  });
});
