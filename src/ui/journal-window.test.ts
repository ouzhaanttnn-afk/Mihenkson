import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DealRecord } from '@domain/types';
import type { GameState } from '@state/gameStore';
import { useGame } from '@state/gameStore';
import { setLanguage } from '@i18n/index';
import { JournalRoute } from './screens/BusinessScreen';
import { JOURNAL_PAGE_SIZE, journalWindow } from './journal-window';

const subscriptions = vi.hoisted(() => ({ selectors: [] as Array<(state: GameState) => unknown> }));
// Read the live fixture store rather than Zustand's initial SSR snapshot.
vi.mock('@state/gameStore', async () => {
  const actual = await vi.importActual<typeof import('@state/gameStore')>('@state/gameStore');
  return { ...actual, useGame: Object.assign((selector?: (state: GameState) => unknown) => {
    if (selector) subscriptions.selectors.push(selector);
    return selector ? selector(actual.useGame.getState()) : actual.useGame.getState();
  }, actual.useGame) };
});

const initial = useGame.getState();
beforeEach(() => {
  subscriptions.selectors.length = 0;
  setLanguage('tr');
  useGame.setState(initial, true);
});
afterEach(() => { useGame.setState(initial, true); setLanguage('tr'); });

function record(index: number): DealRecord {
  return {
    dealId: `deal:${index}`, customerId: `customer:${index}`, lineIds: [], itemIds: [],
    side: 'sell', day: index + 1, clockMinutes: 600, testsUsed: [],
    estimateBand: { min: 100, max: 120 }, confidence: 'medium', actualValue: 110,
    offerHistory: [100], finalState: 'ACCEPTED', movesUsed: [], thesisAtDeal: null,
    price: 100, costBasis: 80, units: 1, grams: 1, channel: null, isBulk: false,
    realizedProfit: 20, trustDelta: 0, reputationDelta: 0,
    reviewData: { missedSignals: [], keyDecisionPoint: `Review ${index}`, alternativeChannelNote: '' },
  };
}

describe('bounded latest-first journal window', () => {
  it('keeps every record accessible once and in order across partial pages without changing history', () => {
    const history = Object.freeze(Array.from({ length: 123 }, (_, index) => Object.freeze(record(index))));
    const snapshots = Array.from({ length: journalWindow(history, 0).pageCount },
      (_, page) => journalWindow(history, page));
    const visible = snapshots.flatMap((window) => window.entries);
    expect(snapshots.map((window) => window.entries.length)).toEqual([50, 50, 23]);
    expect(visible.map((deal) => deal.dealId)).toEqual(history.map((deal) => deal.dealId).reverse());
    expect(new Set(visible.map((deal) => deal.dealId)).size).toBe(history.length);
    expect(history[0]?.dealId).toBe('deal:0');
    expect(visible[0]).toBe(history[122]);
  });

  it('touches at most one page even when the ledger has 100,000 records', () => {
    let touched = 0;
    const history = new Proxy(Array.from({ length: 100_000 }, (_, index) => index), {
      get(target, property, receiver) {
        if (typeof property === 'string' && /^\d+$/.test(property)) touched += 1;
        return Reflect.get(target, property, receiver);
      },
    });
    const window = journalWindow(history, 1_500);
    expect(window.total).toBe(100_000);
    expect(window.entries).toHaveLength(JOURNAL_PAGE_SIZE);
    expect(window.entries[0]).toBe(24_999);
    expect(window.entries[49]).toBe(24_950);
    expect(touched).toBe(JOURNAL_PAGE_SIZE);
  });

  it('handles empty/exact-page histories and clamps stale or invalid pages after a shorter load', () => {
    expect(journalWindow([], 200)).toEqual({ entries: [], total: 0, page: 0, pageCount: 1 });
    const history = Array.from({ length: 100 }, (_, index) => index);
    expect(journalWindow(history, 0).pageCount).toBe(2);
    expect(journalWindow(history, 3).entries).toEqual(history.slice(0, 50).reverse());
    for (const page of [-5, NaN, Infinity]) expect(journalWindow(history, page).page).toBe(0);
    expect(journalWindow(history, 1.9).page).toBe(1);
    expect(journalWindow(history.slice(0, 10), 1).entries).toEqual([9, 8, 7, 6, 5, 4, 3, 2, 1, 0]);
  });
});

describe('journal rendering', () => {
  it('renders only the latest 50 of 5,000 records, with enabled older-page access and unchanged economics', () => {
    const deals = Array.from({ length: 5_000 }, (_, index) => record(index));
    useGame.setState({ ledger: { ...initial.ledger, deals } });
    const before = useGame.getState();
    const html = renderToStaticMarkup(createElement(JournalRoute, { onBack: () => undefined }));
    expect(html.match(/class="row"/g)).toHaveLength(JOURNAL_PAGE_SIZE);
    expect(html).toContain('5000 kayıt');
    expect(html).toContain('Review 4999');
    expect(html).toContain('Review 4950');
    expect(html).not.toContain('Review 4949');
    expect(html).toContain('Sayfa 1/100');
    expect(html).toMatch(/disabled="">Önceki<\/button>/);
    expect(html).toMatch(/class="chip">Sonraki<\/button>/);
    expect(useGame.getState()).toBe(before);
    expect(useGame.getState().ledger.deals).toBe(deals);
  });

  it('ignores simulation-only state changes while subscribing to data and display preferences', () => {
    renderToStaticMarkup(createElement(JournalRoute, { onBack: () => undefined }));
    const state = useGame.getState();
    const tick = { ...state, market: { ...state.market, clockMinutes: state.market.clockMinutes + 1 },
      queue: [...state.queue] };
    expect(subscriptions.selectors.length).toBeGreaterThan(0);
    for (const selector of subscriptions.selectors) expect(selector(tick)).toBe(selector(state));
    const changes: GameState[] = [
      { ...state, ledger: { ...state.ledger, deals: [record(1)] } },
      { ...state, items: { ...state.items } },
      { ...state, preferences: { ...state.preferences, language: state.preferences.language === 'tr' ? 'en' : 'tr' } },
      { ...state, preferences: { ...state.preferences, currency: state.preferences.currency === 'try' ? 'usd' : 'try' } },
    ];
    for (const change of changes) {
      expect(subscriptions.selectors.some((selector) => selector(change) !== selector(state))).toBe(true);
    }
  });

  it('keeps the empty explanation and single-page history free of inactive paging controls', () => {
    useGame.setState({ ledger: { ...initial.ledger, deals: [] } });
    const empty = renderToStaticMarkup(createElement(JournalRoute, { onBack: () => undefined }));
    expect(empty).toContain('Henüz kayıt yok');
    expect(empty).not.toContain('journalPagination');
    useGame.setState({ ledger: { ...initial.ledger, deals: [record(1)] } });
    const single = renderToStaticMarkup(createElement(JournalRoute, { onBack: () => undefined }));
    expect(single.match(/class="row"/g)).toHaveLength(1);
    expect(single).not.toContain('journalPagination');
  });
});
