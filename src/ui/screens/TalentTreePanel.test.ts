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
    expect(html).toMatch(/disabled="" aria-label="Ayar kademe 1 öğren"/);
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
  it('shows one concise upgrade effect and keeps complete previews and rules in closed disclosures', () => {
    const before = useGame.getState();
    const html = renderToStaticMarkup(createElement(TalentTreePanel));
    expect(html.match(/class="talentNode__effect"/g)).toHaveLength(1);
    expect(html).toContain('Kademe 1 öğrenince');
    expect(html).toContain('Mihenk taşı yanlış ayarı %70 olasılıkla yakalar.');
    expect(html).toContain('%80 ayar tespiti');
    expect(html).toContain('%90 ayar tespiti');
    expect(html).toContain('6 puan · 9 kademe');
    expect(html.match(/<details\b[^>]*>/g)).toHaveLength(3);
    expect(html).not.toMatch(/<details\b[^>]*\bopen=/);
    expect(html).toContain('<summary>Tüm kademeler</summary>');
    expect(html).toContain('<summary>Puanlar nasıl kazanılır?</summary>');
    expect(html).toContain('<summary>Yeniden dağıtım</summary>');
    expect(html).toContain('Ücretsiz; oyun gününde bir kez.');
    expect(html).not.toContain('Tatlı Dil &amp; Esnaf Nüktesi');
    expect(useGame.getState()).toBe(before);
  });
  it('preserves the third patience level and existing learning blockers in the compact card', () => {
    let progress = points(120);
    progress = learnTalent(progress, 'tatli_dil', 0)!;
    progress = learnTalent(progress, 'tatli_dil', 1)!;
    useGame.setState({ skillProgress: progress });
    const preview = renderToStaticMarkup(createElement(TalentTreePanel, { initialBranch: 'tatli_dil' }));
    expect(preview).toContain('Kademe 2/3');
    expect(preview).toContain('Kademe 3 öğrenince');
    expect(preview).toContain('Yeni müşterilere +2 sabır; yüksek kârlı tekliflerde daha az sabır kaybı.');
    expect(preview).toContain('aria-label="Tatlı Dil kademe 3 öğren"');
    expect(preview).not.toMatch(/disabled="" aria-label="Tatlı Dil kademe 3 öğren"/);
    useGame.setState({ activeCustomer: {} as NonNullable<typeof initial.activeCustomer> });
    const blocked = renderToStaticMarkup(createElement(TalentTreePanel, { initialBranch: 'tatli_dil' }));
    expect(blocked).toMatch(/disabled="" aria-label="Tatlı Dil kademe 3 öğren"/);
    expect(blocked).toContain('Önce mevcut müşteriyi uğurla.');
    expect(useGame.getState().skillProgress).toBe(progress);
  });
  it.each(['ayar_ustaligi', 'tatli_dil', 'usta_eli'] as const)('keeps %s maximum level and one-point budget rules', (id) => {
    let progress = points(30);
    for (let rank = 0; rank < 3; rank++) progress = learnTalent(progress, id, rank)!;
    useGame.setState({ skillProgress: progress });
    const html = renderToStaticMarkup(createElement(TalentTreePanel, { initialBranch: id }));
    expect(html).toContain('0 kullanılabilir puan');
    expect(html).toContain('Kademe 3/3');
    expect(html).toContain('aria-label="En yüksek kademe"');
    expect(html).not.toContain('Kademe 4 öğrenince');
    expect(useGame.getState().skillProgress).toBe(progress);
  });
  it('translates short titles, effect limits and collapsed help in English', () => {
    setLanguage('en');
    useGame.setState({ skillProgress: points(120) });
    const html = renderToStaticMarkup(createElement(TalentTreePanel, { initialBranch: 'usta_eli' }));
    expect(html).toContain('Karat');
    expect(html).toContain('Sweet Talk');
    expect(html).toContain('Risk in new in-house jobs drops by up to 2 percentage points.');
    expect(html).toContain('−6 percentage points of risk');
    expect(html).toContain('Learn for 1 point');
    expect(html).toContain('How do I earn points?');
    expect(html).toContain('Reset allocation');
    expect(html).not.toMatch(/kârlı|Kademe|sabır|puan|Yeniden|Tüm/);
  });
});
