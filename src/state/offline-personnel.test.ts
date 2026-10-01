import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@ui/ads', () => ({ showRewardedAd: vi.fn(), showInterstitialAd: vi.fn() }));
vi.mock('@ui/session-ad-runtime', () => ({ noteCompletedSessionTrade: vi.fn(),
  resetSessionAds: vi.fn(), trySessionAdBreak: vi.fn().mockResolvedValue(false) }));
import { offlineFixture } from '@domain/offline-personnel-fixture';
import { emptyOfflineClock, OFFLINE_ATTEMPT_MS, OFFLINE_MAX_MS } from '@domain/offline-personnel';
import { LESSONS } from '@domain/onboarding';
import { DAY } from '@domain/balance';
import { closeDay } from '@domain/settlement';
import { useGame, clockPauseReason, offlinePersonnelSurfaceVisible, type GameState } from './gameStore';
import { deserialize, readSave, resumeSaves, serialize } from './save';

const initial = useGame.getState();
const start = 1_800_000_000_000;
let blocked = false;
beforeEach(() => {
  const data = new Map<string, string>(); blocked = false;
  vi.stubGlobal('localStorage', { getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { if (blocked) throw new Error('write unavailable'); data.set(key, value); },
    removeItem: (key: string) => data.delete(key) });
  resumeSaves();
  const fixture = offlineFixture();
  useGame.setState({ ...initial, ...fixture.economy, seed: fixture.seed, market: fixture.market,
    profileSetupDone: true, seenLessons: LESSONS.map(l => l.id), activeCustomer: null, activeDeal: null,
    recallableGuest: null, queue: [], jobs: [], dayCloseConfirmOpen: false, dayReportOpen: false,
    weekTransitionPending: false, rewardedAdPending: null, offlinePersonnelClock: emptyOfflineClock(),
    offlinePersonnelReport: null, offlineSaveIssue: false, offlineResumeAtMs: null }, true);
});
afterEach(() => { useGame.setState(initial, true); resumeSaves(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('offline personnel lifecycle, persistence and replay safety', () => {
  it('duplicate native/visibility events, reload and repeated acknowledgment never grant twice', () => {
    const before = useGame.getState();
    expect(before.handlePersonnelLifecycle(false, start)).toBe(true);
    const clock = useGame.getState().offlinePersonnelClock;
    useGame.getState().handlePersonnelLifecycle(false, start + 60_000);
    expect(useGame.getState().offlinePersonnelClock).toBe(clock);
    expect(readSave()?.offlinePersonnelClock).toEqual(clock);
    expect(useGame.getState().handlePersonnelLifecycle(true, start + OFFLINE_MAX_MS)).toBe(true);
    const after = useGame.getState(), report = after.offlinePersonnelReport!;
    expect(report.sales).toBeGreaterThan(0);
    expect(clockPauseReason(after)).toBe('shop-modal');
    expect(offlinePersonnelSurfaceVisible(after)).toBe(true);
    expect(after.market).toEqual(before.market);
    expect(after.jobs).toEqual(before.jobs);
    expect(after.skillProgress).toEqual(before.skillProgress);
    expect(after.spawnCounter).toBe(before.spawnCounter);
    useGame.getState().handlePersonnelLifecycle(true, start + OFFLINE_MAX_MS * 2);
    expect(useGame.getState().store).toBe(after.store);
    useGame.setState(deserialize(serialize(after)));
    useGame.getState().handlePersonnelLifecycle(true, start + OFFLINE_MAX_MS * 3);
    expect(useGame.getState().store.cash).toBe(after.store.cash);
    // An unread shift cannot be overwritten by another background event.
    useGame.getState().handlePersonnelLifecycle(false, start + OFFLINE_MAX_MS * 3);
    expect(useGame.getState().offlinePersonnelClock.session).toBeNull();
    expect(useGame.getState().acknowledgeOfflinePersonnel(report.id)).toBe(true);
    expect(useGame.getState().acknowledgeOfflinePersonnel(report.id)).toBe(false);
    expect(readSave()?.offlinePersonnelReport).toBeNull();
    expect(useGame.getState().store.cash).toBe(after.store.cash);
    const closed = closeDay(after, after.market.day, 0, 0, false);
    expect(closed.report.personnelExpense).toBe(report.pendingWages);
    const again = closeDay(closed.state, after.market.day, 0, 0, false);
    expect(again.state.store.cash).toBe(closed.state.store.cash);
  });
  it('arms without granting on legacy saves and resumes a saved departure at boot', () => {
    const legacy = serialize(useGame.getState()); delete legacy.offlinePersonnelClock;
    useGame.setState(deserialize(legacy));
    useGame.getState().handlePersonnelLifecycle(true, start);
    expect(useGame.getState().offlinePersonnelReport).toBeNull();
    useGame.getState().handlePersonnelLifecycle(false, start);
    const loaded = readSave()!;
    expect(loaded.offlinePersonnelClock.session).not.toBeNull();
    useGame.setState(loaded);
    useGame.getState().handlePersonnelLifecycle(true, start + OFFLINE_MAX_MS);
    expect(readSave()?.offlinePersonnelReport?.attempts).toBe(16);
  });
  it('write failure changes no economics, freezes the return endpoint across a later save/reload, then retries once', () => {
    useGame.getState().handlePersonnelLifecycle(false, start);
    const before = useGame.getState(); blocked = true;
    expect(before.handlePersonnelLifecycle(true, start + OFFLINE_ATTEMPT_MS)).toBe(false);
    expect(useGame.getState().store).toBe(before.store);
    expect(useGame.getState().ledger).toBe(before.ledger);
    expect(useGame.getState().inventory).toBe(before.inventory);
    expect(useGame.getState().offlineSaveIssue).toBe(true);
    blocked = false;
    useGame.getState().saveGame();
    useGame.setState({ ...readSave()!, offlineResumeAtMs: null, offlineSaveIssue: false });
    expect(useGame.getState().handlePersonnelLifecycle(true, start + OFFLINE_MAX_MS)).toBe(true);
    expect(useGame.getState().offlinePersonnelReport?.attempts).toBe(1);
    expect(useGame.getState().offlinePersonnelClock.highWaterMs).toBe(start + OFFLINE_MAX_MS);
  });
  it('failed arming/ack cannot create a phantom session or hide a report', () => {
    blocked = true;
    expect(useGame.getState().handlePersonnelLifecycle(false, start)).toBe(false);
    expect(useGame.getState().offlinePersonnelClock.session).toBeNull();
    blocked = false;
    useGame.getState().handlePersonnelLifecycle(false, start);
    useGame.getState().handlePersonnelLifecycle(true, start + OFFLINE_MAX_MS);
    const before = useGame.getState(); blocked = true;
    expect(before.acknowledgeOfflinePersonnel(before.offlinePersonnelReport!.id)).toBe(false);
    expect(useGame.getState().offlinePersonnelReport).toBe(before.offlinePersonnelReport);
    expect(useGame.getState().store).toBe(before.store);
  });
  it('can safely skip an unsaved shift only after a smaller cursor-only save succeeds', () => {
    useGame.getState().handlePersonnelLifecycle(false, start);
    const before = useGame.getState(); blocked = true;
    before.handlePersonnelLifecycle(true, start + OFFLINE_MAX_MS);
    expect(useGame.getState().discardOfflinePersonnel()).toBe(false);
    expect(useGame.getState().offlineSaveIssue).toBe(true);
    expect(useGame.getState().offlinePersonnelClock.session).not.toBeNull();
    blocked = false;
    expect(useGame.getState().discardOfflinePersonnel()).toBe(true);
    expect(useGame.getState().offlineSaveIssue).toBe(false);
    expect(readSave()?.offlinePersonnelClock.session).toBeNull();
    expect(useGame.getState().store).toBe(before.store);
    expect(useGame.getState().inventory).toBe(before.inventory);
    useGame.setState(readSave()!);
    useGame.getState().handlePersonnelLifecycle(true, start + OFFLINE_MAX_MS * 2);
    expect(useGame.getState().store.cash).toBe(before.store.cash);
    expect(useGame.getState().offlinePersonnelReport).toBeNull();
  });
  it.each([
    { activeCustomer: { id: 'protected' } as GameState['activeCustomer'] },
    { activeDeal: { id: 'protected' } as unknown as GameState['activeDeal'] },
    { recallableGuest: { id: 'protected' } as unknown as GameState['recallableGuest'] },
    { dayCloseConfirmOpen: true }, { dayReportOpen: true }, { weekTransitionPending: true },
    { rewardedAdPending: 'customerRush' as const },
  ])('preserves protected player state and skips arming/resume %j', patch => {
    useGame.getState().handlePersonnelLifecycle(false, start);
    useGame.setState(patch);
    const before = useGame.getState();
    before.handlePersonnelLifecycle(true, start + OFFLINE_MAX_MS);
    const after = useGame.getState();
    expect(after.store).toBe(before.store);
    expect(after.offlinePersonnelReport).toBeNull();
    expect(after.activeCustomer).toBe(before.activeCustomer);
    expect(after.activeDeal).toBe(before.activeDeal);
    expect(after.recallableGuest).toBe(before.recallableGuest);
    expect(after.queue).toBe(before.queue);
    expect(offlinePersonnelSurfaceVisible(after)).toBe(false);
    after.handlePersonnelLifecycle(false, start + OFFLINE_MAX_MS);
    expect(useGame.getState().offlinePersonnelClock.session).toBeNull();
  });
  it('closing time/Sunday/FTUE cannot create a shift; staff waiver remains zero', () => {
    const original = useGame.getState();
    for (const patch of [{ market: { ...original.market, clockMinutes: DAY.closeMinutes } },
      { market: { ...original.market, day: 7 } }, { seenLessons: [] }]) {
      useGame.setState(patch); useGame.getState().handlePersonnelLifecycle(false, start);
      expect(useGame.getState().offlinePersonnelClock.session).toBeNull();
      useGame.setState({ market: original.market, seenLessons: original.seenLessons });
    }
    useGame.setState({ personnelCostWaivedToday: true });
    useGame.getState().handlePersonnelLifecycle(false, start);
    useGame.getState().handlePersonnelLifecycle(true, start + OFFLINE_MAX_MS);
    expect(useGame.getState().offlinePersonnelReport?.pendingWages).toBe(0);
  });
  it('manual load discards old session and reset cannot rearm despite suspended saves returning true', () => {
    useGame.getState().handlePersonnelLifecycle(false, start);
    expect(useGame.getState().loadGame()).toBe(true);
    expect(useGame.getState().offlinePersonnelClock.session).toBeNull();
    useGame.getState().handlePersonnelLifecycle(true, start + OFFLINE_MAX_MS);
    expect(useGame.getState().offlinePersonnelReport).toBeNull();
    useGame.getState().resetGame();
    expect(useGame.getState().handlePersonnelLifecycle(false, start + OFFLINE_MAX_MS)).toBe(true);
    expect(readSave()).toBeNull();
  });
});
