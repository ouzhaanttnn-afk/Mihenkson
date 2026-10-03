import type { GameState } from '@state/gameStore';

/** Flatten store fields so Zustand shallow equality ignores only its timer. */
export function businessStoryInputs(s: GameState) {
  return { ...s.store, personnelElapsedSeconds: 0,
    ledger: s.ledger, items: s.items, inventory: s.inventory, customers: s.customers,
    skills: s.skillProgress, jobs: s.jobs, network: s.network, day: s.market.day,
    spot: s.market.goldSpot, event: s.market.activeEvent,
    language: s.preferences.language, currency: s.preferences.currency };
}
