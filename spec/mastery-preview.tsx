// Development-only fixture. Not imported by the production entry or emitted in dist.
// Open /spec/mastery-preview.html?scale=2&lang=en on a disposable local origin.
import { createRoot } from 'react-dom/client';
import { setLanguage } from '@i18n/index';
import { creditMasteryWork, defaultSkillProgress } from '@domain/skill-tree';
import { useGame } from '@state/gameStore';
import { TalentShortcut, TalentTreeSheet } from '@ui/screens/TalentTreePanel';
import '@ui/tokens.css';
import '@ui/shell/AppShell.css';
import '@ui/workbench/Workbench.css';
import '@ui/screens/Screens.css';

const params = new URLSearchParams(location.search);
setLanguage(params.get('lang') === 'en' ? 'en' : 'tr');
document.documentElement.lang = params.get('lang') === 'en' ? 'en' : 'tr';
const scale = params.get('scale') === '2' ? 2 : 1;
const fonts = { micro: 11, caption: 12, body: 15, subtitle: 17, title: 20, figure: 26, hero: 34 };
for (const [name, size] of Object.entries(fonts)) document.documentElement.style.setProperty(`--fs-${name}`, `${size * scale}px`);
let progress = defaultSkillProgress();
for (let n = 0; n < 30; n++) progress = creditMasteryWork(progress, `preview:${n}`, 1, true);
useGame.setState({ skillProgress: progress, activeCustomer: null, activeDeal: null, recallableGuest: null,
  jobs: [], rewardedAdPending: null, dayCloseConfirmOpen: false, dayReportOpen: false,
  weekTransitionPending: false, shopTalentTreeOpen: false });
function Preview() {
  const open = useGame(s => s.shopTalentTreeOpen);
  return <main style={{ padding: 12, maxWidth: 430, margin: 'auto' }}>
    <h1>Development fixture — {scale * 100}% text</h1>
    <p>Synthetic 30-work history; do not use on a player save or production origin.</p>
    <TalentShortcut />
    {open && <TalentTreeSheet />}
  </main>;
}
createRoot(document.getElementById('root')!).render(<Preview />);
