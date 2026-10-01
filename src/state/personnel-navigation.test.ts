import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LESSONS } from '@domain/onboarding';
import { DAY } from '@domain/balance';
import { spawnCustomer } from '@domain/customer-spawn';
import { clockPauseReason, useGame } from './gameStore';
import { deserialize, serialize } from './save';

const initial = useGame.getState();
beforeEach(() => useGame.setState({ ...initial, tab: 'shop', profileSetupDone: true,
  profileOpen: false, settingsOpen: false, rankingOpen: false, stockCatalogOpen: false,
  shopTalentTreeOpen: false, personnelOpen: false, activeDeal: null, recallableGuest: null,
  dayCloseConfirmOpen: false, dayReportOpen: false, rewardedAdPending: null,
  seenLessons: LESSONS.map(lesson => lesson.id),
  market: { ...initial.market, clockMinutes: DAY.openMinutes },
}, true));
afterEach(() => useGame.setState(initial, true));

describe('personnel dialog navigation and persistence', () => {
  it('pauses while open and resumes on close without changing the active tab', () => {
    useGame.getState().setPersonnelOpen(true);
    expect(clockPauseReason(useGame.getState())).toBe('shop-modal');
    expect(useGame.getState().tab).toBe('shop');
    useGame.getState().setPersonnelOpen(false);
    expect(clockPauseReason(useGame.getState())).toBeNull();
  });

  it.each(['shop', 'stock', 'business', 'workshop', 'market'] as const)('clears on navigation to %s', tab => {
    useGame.getState().setPersonnelOpen(true);
    useGame.getState().setTab(tab);
    expect(useGame.getState().personnelOpen).toBe(false);
  });

  it('does not reopen after save/load or alter personnel economics', () => {
    const store = structuredClone(useGame.getState().store);
    useGame.getState().setPersonnelOpen(true);
    const saved = serialize(useGame.getState());
    expect(saved).not.toHaveProperty('personnelOpen');
    const loaded = deserialize(saved);
    expect(loaded).not.toHaveProperty('personnelOpen');
    expect(loaded.store.personnelCount).toBe(store.personnelCount);
    expect(loaded.store.cash).toBe(store.cash);
  });

  it('closes other shop sheets when opened and closes when a different modal opens', () => {
    useGame.setState({ stockCatalogOpen: true, shopTalentTreeOpen: true, rankingOpen: true });
    useGame.getState().setPersonnelOpen(true);
    expect(useGame.getState()).toMatchObject({ personnelOpen: true, stockCatalogOpen: false,
      shopTalentTreeOpen: false, rankingOpen: false });
    useGame.getState().openSettings();
    expect(useGame.getState().personnelOpen).toBe(false);
    useGame.getState().setPersonnelOpen(true);
    useGame.getState().setRankingOpen(true);
    expect(useGame.getState().personnelOpen).toBe(false);
  });

  it('opening and closing never replaces a live customer, deal, offer or workshop job', () => {
    const state = useGame.getState();
    const guest = spawnCustomer(state.seed, state.spawnCounter, state.market, state.store,
      state.dayCharacter, state.customers, { inventory: state.inventory, items: state.items }, state.skillProgress);
    useGame.setState({ queue: [guest] });
    useGame.getState().greetCustomer();
    const { activeCustomer: customer, activeDeal: deal } = useGame.getState();
    expect(customer).not.toBeNull();
    expect(deal).not.toBeNull();
    const jobs: typeof initial.jobs = [{ jobId: 'job-kept', type: 'chainRepair', itemId: 'item-kept',
      customerId: guest.customer.id, customerName: guest.customer.displayName, itemName: 'Zincir',
      duration: 2, remainingDays: 1, risk: 0.1, partsCost: 100, assignedStaff: 'personnel_1',
      venue: 'inHouse', outsourceCost: 0, promisedDay: 3, expectedDay: 3, fee: 1000,
      predeterminedOutcome: 'success', result: 'pending', compensation: 0, acceptedDay: 1 }];
    useGame.setState({ jobs, customerMessage: 'Son teklif' });
    useGame.getState().setPersonnelOpen(true);
    useGame.getState().tick(180);
    useGame.getState().setPersonnelOpen(false);
    expect(useGame.getState()).toMatchObject({ activeCustomer: customer, activeDeal: deal,
      jobs, customerMessage: 'Son teklif' });
  });
});
