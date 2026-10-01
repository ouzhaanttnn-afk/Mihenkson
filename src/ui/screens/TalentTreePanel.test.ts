import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setLanguage } from '@i18n/index';
import { creditMasteryWork, defaultSkillProgress, learnTalent } from '@domain/skill-tree';
import { useGame } from '@state/gameStore';
import { TalentShortcut, TalentTreePanel, TalentTreeSheet } from './TalentTreePanel';
vi.mock('@state/gameStore', async () => {
  const actual = await vi.importActual<typeof import('@state/gameStore')>('@state/gameStore');
  return { ...actual, useGame: Object.assign((selector?: (s: import('@state/gameStore').GameState) => unknown) =>
    selector ? selector(actual.useGame.getState()) : actual.useGame.getState(), actual.useGame) };
});
const initial = useGame.getState();
function points(count: number) {
  let p = defaultSkillProgress();
  for (let n = 0; n < count; n++) p = creditMasteryWork(p, `work:${n}`, 1, true);
  return p;
}
beforeEach(() => { setLanguage('tr'); useGame.setState({ ...initial, skillProgress: defaultSkillProgress(),
  activeDeal: null, activeCustomer: null, recallableGuest: null, jobs: [], dayCloseConfirmOpen: false,
  dayReportOpen: false, rewardedAdPending: null, shopTalentTreeOpen: false }, true); });
afterEach(() => { useGame.setState(initial, true); setLanguage('tr'); });
describe('live skill tree surface', () => {
  it('explains the first milestone, three real branches and disabled learning without mutating the save', () => {
    const before = structuredClone(useGame.getState().skillProgress);
    const html = renderToStaticMarkup(createElement(TalentTreePanel));
    expect(html).toContain('0 kullanılabilir puan');
    expect(html).toContain('0/5 başarılı iş');
    expect(html.match(/aria-pressed=/g)).toHaveLength(3);
    expect(html).toMatch(/disabled="" aria-label="Ayar Ustalığı kademe 1 öğren"/);
    expect(html).toContain('Personel satışları, alımlar ve reklamlar sayılmaz.');
    expect(html).not.toContain('Yakında');
    expect(useGame.getState().skillProgress).toEqual(before);
  });
  it('enables sequential learning from earned points and shows workshop percentage-point limits', () => {
    useGame.setState({ skillProgress: points(5) });
    const html = renderToStaticMarkup(createElement(TalentTreePanel, { initialBranch: 'usta_eli' }));
    expect(html).toContain('1 kullanılabilir puan');
    expect(html).toContain('6 yüzde puan');
    expect(html).toContain('aria-label="Usta Eli kademe 1 öğren"');
    expect(html).not.toMatch(/disabled="" aria-label="Usta Eli kademe 1 öğren"/);
    expect(html).toContain('Önceki kademe gerekli');
  });
  it('shows a funded capped branch and blocks reset until ready jobs are delivered', () => {
    let p = points(30);
    for (let r = 0; r < 3; r++) p = learnTalent(p, 'ayar_ustaligi', r)!;
    useGame.setState({ skillProgress: p, jobs: [{ result: 'success' }] as typeof initial.jobs });
    const html = renderToStaticMarkup(createElement(TalentTreePanel));
    expect(html).toContain('En yüksek kademe');
    expect(html).toContain('Yeniden dağıtmadan önce tüm atölye işlerini teslim et.');
    expect(html).toMatch(/disabled="">Yetenekleri yeniden dağıt/);
  });
  it('exposes a labelled modal, live shortcut and translated English content', () => {
    expect(renderToStaticMarkup(createElement(TalentTreeSheet))).toContain('aria-modal="true"');
    expect(renderToStaticMarkup(createElement(TalentTreeSheet))).toContain('aria-label="Yetenek ağacını kapat"');
    expect(renderToStaticMarkup(createElement(TalentShortcut))).toContain('aria-haspopup="dialog"');
    setLanguage('en');
    const html = renderToStaticMarkup(createElement(TalentTreePanel, { initialBranch: 'usta_eli' }));
    expect(html).toContain('Craftsmanship');
    expect(html).toContain('percentage points');
    expect(html).not.toContain('Sonraki');
  });
});
