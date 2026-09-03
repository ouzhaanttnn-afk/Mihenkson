import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGame } from './gameStore';
import { deserialize, readSave, serialize } from './save';
import { applyTransaction, closeDay, createLedger } from '@domain/settlement';
import { createMarketForDay } from '@domain/market';
import {
  canSetPersonnel,
  dailyOperatingCost,
  PERSONNEL_MONTHLY,
  personnelAdUnlockCost,
  personnelAdUnlockLevel,
  personnelDaily,
  scaleMaintenanceCost,
  weekdayName,
} from '@domain/v5-rules';

const initial = useGame.getState();
beforeEach(() => {
  const data = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
    removeItem: (key: string) => data.delete(key),
  });
  useGame.setState({ ...initial, store: { ...initial.store, cash: 1_000_000, dailyOverhead: 1200, level: 1, personnelCount: 0 },
    market: createMarketForDay(initial.seed, 1), ledger: createLedger(), queue: [], inventory: [], items: {},
    jobs: [], activeDeal: null, activeCustomer: null, profileOpen: false, lastDayReport: null,
    dayCloseConfirmOpen: false, dayReportOpen: false }, true);
});
afterEach(() => { useGame.setState(initial, true); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('personnel additive salaries and level gates', () => {
  it.each([0, 1, 2, 3])('charges the cumulative monthly salary for %i personnel', count => {
    const store = { ...initial.store, dailyOverhead: 1200, personnelCount: count };
    const monthly = [0, 40000, 90000, 150000][count]!;
    expect(PERSONNEL_MONTHLY[count]).toBe(monthly);
    expect(personnelDaily(store)).toBe(monthly / 30);
    expect(dailyOperatingCost(store)).toBe(Math.round(1200 + monthly / 30));
  });
  it.each([[1, 3], [2, 6], [3, 10]])('gates count %i at level %i in the state action as well as UI', (count, level) => {
    useGame.setState({ store: { ...useGame.getState().store, level: level - 1 } });
    useGame.getState().setPersonnelCount(count);
    expect(useGame.getState().store.personnelCount).toBe(0);
    useGame.setState({ store: { ...useGame.getState().store, level } });
    useGame.getState().setPersonnelCount(count);
    expect(useGame.getState().store.personnelCount).toBe(count);
    expect(readSave()?.store.personnelCount).toBe(count);
  });
  it('retains existing staff below unlock levels but does not allow rehire above them', () => {
    const store = { ...initial.store, level: 1, personnelCount: 3 };
    expect(canSetPersonnel(store, 3)).toBe(true);
    expect(canSetPersonnel(store, 2)).toBe(true);
    expect(canSetPersonnel({ ...store, personnelCount: 2 }, 3)).toBe(false);
    expect(deserialize(serialize({ ...useGame.getState(), store })).store.personnelCount).toBe(3);
  });
  it.each([-1, 4, 1.5, NaN, Infinity])('rejects invalid personnel count %s', count => {
    expect(canSetPersonnel({ ...initial.store, level: 99 }, count)).toBe(false);
  });
});

describe('personnel ad-unlock + daily waiver (kullanıcı: "40k verip açtığın personel...")', () => {
  it('unlock cost equals the tier\'s cumulative monthly total, not a new number', () => {
    expect(personnelAdUnlockCost(1)).toBe(PERSONNEL_MONTHLY[1]);
    expect(personnelAdUnlockCost(2)).toBe(PERSONNEL_MONTHLY[2]);
    expect(personnelAdUnlockCost(3)).toBe(PERSONNEL_MONTHLY[3]);
    expect([personnelAdUnlockCost(1), personnelAdUnlockCost(2), personnelAdUnlockCost(3)]).toEqual([40000, 90000, 150000]);
  });

  it('canSetPersonnel bypasses the level gate up to the ad-unlocked tier, no further', () => {
    const store = { ...initial.store, level: 1, personnelAdUnlockLevel: 2 };
    expect(canSetPersonnel(store, 2)).toBe(true); // seviye 6 gerekirdi, ad-unlock ile geçildi
    expect(canSetPersonnel(store, 3)).toBe(false); // 3. kademe hâlâ kilitli — ne seviye ne ad-unlock yeterli
  });

  it('unlockPersonnelTier charges cash once, sets both unlock level and headcount, never twice for the same tier', () => {
    useGame.setState({ store: { ...useGame.getState().store, cash: 200_000, level: 1, personnelCount: 0, personnelAdUnlockLevel: 0 } });
    const ok = useGame.getState().unlockPersonnelTier(2);
    expect(ok).toBe(true);
    expect(useGame.getState().store.cash).toBe(200_000 - PERSONNEL_MONTHLY[2]!);
    expect(personnelAdUnlockLevel(useGame.getState().store)).toBe(2);
    expect(useGame.getState().store.personnelCount).toBe(2);
    expect(canSetPersonnel(useGame.getState().store, 2)).toBe(true);

    // İkinci çağrı aynı kademeyi tekrar tekrar açmaz — çift ödeme yok.
    const cashAfterFirst = useGame.getState().store.cash;
    const again = useGame.getState().unlockPersonnelTier(2);
    expect(again).toBe(false);
    expect(useGame.getState().store.cash).toBe(cashAfterFirst);
  });

  it('unlockPersonnelTier fails without charging when cash is insufficient', () => {
    useGame.setState({ store: { ...useGame.getState().store, cash: 10_000, level: 1, personnelAdUnlockLevel: 0 } });
    const ok = useGame.getState().unlockPersonnelTier(1);
    expect(ok).toBe(false);
    expect(useGame.getState().store.cash).toBe(10_000);
    expect(personnelAdUnlockLevel(useGame.getState().store)).toBe(0);
  });

  it.each([0, 4, 1.5, NaN])('rejects an invalid tier %s', count => {
    useGame.setState({ store: { ...useGame.getState().store, cash: 1_000_000 } });
    expect(useGame.getState().unlockPersonnelTier(count)).toBe(false);
  });

  it('closeDay waives the personnel expense for the day when personnelCostWaived is true, without touching headcount', () => {
    const store = { ...initial.store, dailyOverhead: 1200, personnelCount: 3, cash: 1_000_000 };
    const state = { ...initial, store, market: createMarketForDay(initial.seed, 1) } as any;

    const normal = closeDay(state, 1, 0, 0, false);
    expect(normal.report.personnelExpense).toBe(personnelDaily(store));
    expect(normal.report.overhead).toBe(Math.round(1200 + personnelDaily(store)));

    const waived = closeDay(state, 1, 0, 0, true);
    expect(waived.report.personnelExpense).toBe(0);
    expect(waived.report.overhead).toBe(1200);
    expect(waived.state.store.personnelCount).toBe(3); // yalnız gider 0, kadro DEĞİŞMEZ
  });

  it('closeDay defaults to charging the personnel expense when the waiver flag is omitted (old call sites unaffected)', () => {
    const store = { ...initial.store, dailyOverhead: 0, personnelCount: 1, cash: 1_000_000 };
    const state = { ...initial, store, market: createMarketForDay(initial.seed, 1) } as any;
    const result = closeDay(state, 1, 0, 0);
    expect(result.report.personnelExpense).toBe(personnelDaily(store));
  });

  it('requestPersonnelAdWaiver is a no-op when there is no personnel to waive', async () => {
    useGame.setState({ store: { ...useGame.getState().store, personnelCount: 0 }, personnelCostWaivedToday: false });
    await useGame.getState().requestPersonnelAdWaiver();
    expect(useGame.getState().personnelCostWaivedToday).toBe(false);
    expect(useGame.getState().rewardedAdPending).toBeNull();
  });

  it('requestPersonnelAdWaiver never grants the waiver outside a native build (no free ride in web/dev)', async () => {
    useGame.setState({ store: { ...useGame.getState().store, personnelCount: 2 }, personnelCostWaivedToday: false });
    await useGame.getState().requestPersonnelAdWaiver();
    expect(useGame.getState().personnelCostWaivedToday).toBe(false);
    expect(useGame.getState().rewardedAdPending).toBeNull();
  });
});

describe('shop quick stock disclosure', () => {
  it('opens the shared catalog without navigating away from the shop', () => {
    useGame.setState({ tab: 'shop', stockCatalogOpen: false });

    useGame.getState().openStockCatalog();

    expect(useGame.getState().tab).toBe('shop');
    expect(useGame.getState().stockCatalogOpen).toBe(true);
  });
});

describe('day confirmation and persistent summary', () => {
  it('keeps simultaneous equal-length notification keys unique without game RNG', () => {
    vi.spyOn(Date, 'now').mockReturnValue(123);
    for (let i = 0; i < 5; i++) useGame.getState().notify('Bildirim', 'info');
    expect(new Set(useGame.getState().toasts.map(toast => toast.id)).size).toBe(3);
  });
  it('pauses at confirmation and cancellation makes no financial change', () => {
    const before = useGame.getState();
    before.requestDayClose();
    useGame.getState().tick(60);
    expect(useGame.getState().market).toEqual(before.market);
    useGame.getState().cancelDayClose();
    expect(useGame.getState().store.cash).toBe(before.store.cash);
    expect(useGame.getState().ledger.transactions).toHaveLength(0);
    expect(useGame.getState().dayCloseConfirmOpen).toBe(false);
  });
  it('deducts total expense once, persists the summary and acknowledges without charging again', () => {
    useGame.setState({ store: { ...useGame.getState().store, personnelCount: 3, level: 10 } });
    useGame.getState().requestDayClose();
    useGame.getState().advanceDay();
    const closed = useGame.getState();
    expect(closed.store.cash).toBe(993800);
    expect(closed.market.day).toBe(2);
    expect(closed.lastDayReport).toMatchObject({ day: 1, overhead: 6200, personnelExpense: 5000, closingCash: 993800, netCashChange: -6200 });
    expect(closed.dayReportOpen).toBe(true);
    expect(closed.dayCloseConfirmOpen).toBe(false);
    closed.advanceDay();
    useGame.getState().tick(120);
    expect(useGame.getState().store.cash).toBe(993800);
    expect(useGame.getState().market).toEqual(closed.market);
    const restored = readSave()!;
    expect(restored.dayReportOpen).toBe(true);
    expect(restored.lastDayReport).toEqual(closed.lastDayReport);
    useGame.setState(restored);
    useGame.getState().startNewDay();
    useGame.getState().startNewDay();
    expect(useGame.getState().dayReportOpen).toBe(false);
    expect(readSave()?.dayReportOpen).toBe(false);
    expect(useGame.getState().market.day).toBe(2);
    expect(useGame.getState().store.cash).toBe(993800);
    expect(useGame.getState().ledger.transactions.filter(tx => tx.txId === 'dayclose_1')).toHaveLength(1);
  });
  it('keeps the previous day on write failure', () => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => { throw new Error('full'); } });
    useGame.getState().advanceDay();
    expect(useGame.getState().market.day).toBe(1);
    expect(useGame.getState().store.cash).toBe(1000000);
    expect(useGame.getState().dayReportOpen).toBe(false);
  });
  it('keeps summary open if acknowledging cannot be saved', () => {
    useGame.getState().advanceDay();
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => { throw new Error('full'); } });
    useGame.getState().startNewDay();
    expect(useGame.getState().dayReportOpen).toBe(true);
    expect(useGame.getState().store.cash).toBe(998800);
  });
  it('old saves without the summary flag open normally', () => {
    const old = serialize(useGame.getState());
    delete old.dayReportOpen;
    expect(deserialize(old).dayReportOpen).toBe(false);
  });
  it('reports cash movement separately from realized profit', () => {
    const s = useGame.getState();
    const bought = applyTransaction(s, { txId: 'cash-out', dealId: 'cash-out', day: 1, cashDelta: -10000,
      itemsIn: [], itemsOut: [], trustDelta: 0, reputationDelta: 0, xpDelta: 0, label: 'cash movement' }).state;
    const closed = closeDay(bought, 1);
    expect(closed.report.netCashChange).toBe(-11200);
    expect(closed.report.closingCash).toBe(988800);
    expect(closeDay(closed.state, 1).state.store.cash).toBe(988800);
  });
  it('uses the same weekday convention as Friday HAS trading', () => {
    expect(weekdayName(1)).toBe('Pazartesi');
    expect(weekdayName(5)).toBe('Cuma');
    expect(weekdayName(12)).toBe('Cuma');
    expect(weekdayName(24)).toBe('Çarşamba');
  });
});

describe('30 günlük terazi bakımı', () => {
  it('yalnız 30 gün arayla ve seviyeye göre ücret üretir', () => {
    expect(scaleMaintenanceCost({ ...initial.store, level: 1 }, 29)).toBe(0);
    expect(scaleMaintenanceCost({ ...initial.store, level: 1 }, 30)).toBe(10_000);
    expect(scaleMaintenanceCost({ ...initial.store, level: 3 }, 60)).toBe(15_000);
  });

  it('bakımı gün kapanışında bir kez tahsil eder', () => {
    const state = { ...useGame.getState(), store: { ...useGame.getState().store, cash: 1_000_000, level: 1 } };
    const closed = closeDay(state, 30);
    expect(closed.report).toMatchObject({
      overhead: 11_200,
      scaleMaintenanceExpense: 10_000,
      scaleMaintenanceDeferred: 0,
      closingCash: 988_800,
    });
    expect(closeDay(closed.state, 30).applied).toBe(false);
    expect(closeDay(closed.state, 30).state.store.cash).toBe(988_800);
  });

  it('nakit bakım için yetmezse oyunu kilitlemeden üç gün vadeli borç açar', () => {
    const state = { ...useGame.getState(), store: { ...useGame.getState().store, cash: 5_000, level: 1 } };
    const closed = closeDay(state, 30);
    expect(closed.applied).toBe(true);
    expect(closed.state.store.cash).toBe(3_800);
    expect(closed.report.scaleMaintenanceDeferred).toBe(10_000);
    expect(closed.state.store.payables).toContainEqual({
      id: 'scale_maintenance_30',
      amount: 10_000,
      dueDay: 33,
      label: 'Terazi bakım borcu',
    });

    const funded = {
      ...closed.state,
      store: { ...closed.state.store, cash: 20_000 },
    };
    const repaid = closeDay(funded, 33);
    expect(repaid.report.scaleMaintenanceDebtPaid).toBe(10_000);
    expect(repaid.state.store.cash).toBe(8_800);
    expect(repaid.state.store.payables.some(p => p.id === 'scale_maintenance_30')).toBe(false);
  });
});
