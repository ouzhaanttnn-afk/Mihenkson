import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setLanguage } from '@i18n/index';
import { useGame } from '@state/gameStore';
import { PersonnelPanel, PersonnelSheet, PersonnelShortcut } from './PersonnelPanel';

// Zustand's SSR hook intentionally reads the initial snapshot. This fixture
// renderer reads the live store instead, so hired/busy crews are actually tested.
vi.mock('@state/gameStore', async () => {
  const actual = await vi.importActual<typeof import('@state/gameStore')>('@state/gameStore');
  return { ...actual, useGame: Object.assign(
    (selector?: (state: import('@state/gameStore').GameState) => unknown) =>
      selector ? selector(actual.useGame.getState()) : actual.useGame.getState(),
    actual.useGame,
  ) };
});

const initial = useGame.getState();
beforeEach(() => {
  setLanguage('tr');
  useGame.setState({ ...initial, personnelOpen: false, jobs: [],
    store: { ...initial.store, level: 9, personnelCount: 2, personnelRoles: ['reception', 'workshop'] },
  }, true);
});
afterEach(() => { useGame.setState(initial, true); setLanguage('tr'); });

describe('main-shop personnel surface', () => {
  it('shows a labelled staff shortcut with live costs without spending money or changing assignments', () => {
    const before = useGame.getState();
    const html = renderToStaticMarkup(createElement(PersonnelShortcut, { shop: true }));
    expect(html).toContain('shopPersonnelButton');
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('2 personel');
    expect(html).toContain('Günlük');
    expect(useGame.getState().store).toEqual(before.store);
  });

  it('keeps real role controls, salary confirmation and existing rewarded paths', () => {
    const html = renderToStaticMarkup(createElement(PersonnelPanel));
    expect(html).toContain('aria-label="Personel 1 görevi"');
    expect(html).toContain('value="reception" selected');
    expect(html).toContain('value="workshop" selected');
    expect(html).toContain('90 saniyelik aktif oyun');
    expect(html).toContain('90.000');
    expect(html).toContain('Reklam izle, bugün ücretsiz olsun');
    expect(html).toContain('en az %1 maliyet marjı');
  });

  it('shows but disables an assigned busy worker rather than silently moving their job', () => {
    useGame.setState({ jobs: [{ result: 'pending', assignedStaff: 'personnel_2' }] as typeof initial.jobs });
    const html = renderToStaticMarkup(createElement(PersonnelPanel));
    expect(html).toMatch(/<select aria-label="Personel 2 görevi" disabled=""/);
    expect(html).toContain('Bu personel mevcut atölye işini bitirmeli.');
  });

  it('opens the complete labelled dialog and has a close control', () => {
    const html = renderToStaticMarkup(createElement(PersonnelSheet));
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-label="Personel ekranını kapat"');
    expect(html).toContain('personnelSheet__scroll');
    expect(html).toContain('Personel sayısı');
  });
});
