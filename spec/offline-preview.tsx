// Disposable development origin only. This entry is never emitted by production builds.
import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import { setLanguage } from '@i18n/index';
import { offlineFixture } from '@domain/offline-personnel-fixture';
import { emptyOfflineClock, OFFLINE_MAX_MS } from '@domain/offline-personnel';
import { LESSONS } from '@domain/onboarding';
import { useGame, offlinePersonnelSurfaceVisible } from '@state/gameStore';
import { OfflinePersonnelDialog } from '@ui/shell/OfflinePersonnelDialog';
import { resumeSaves } from '@state/save';
import '@ui/tokens.css';
import '@ui/shell/AppShell.css';
import '@ui/screens/Screens.css';

const params = new URLSearchParams(location.search);
setLanguage(params.get('lang') === 'en' ? 'en' : 'tr');
const scale = params.get('scale') === '2' ? 2 : 1;
for (const [name, size] of Object.entries({ micro: 11, caption: 12, body: 15, subtitle: 17, title: 20, figure: 26, hero: 34 }))
  document.documentElement.style.setProperty(`--fs-${name}`, `${size * scale}px`);
document.documentElement.lang = params.get('lang') === 'en' ? 'en' : 'tr';
const fixture = offlineFixture();
resumeSaves();
useGame.setState({ ...fixture.economy, seed: fixture.seed, market: fixture.market,
  profileSetupDone: true, seenLessons: LESSONS.map(l => l.id), activeDeal: null, activeCustomer: null,
  recallableGuest: null, jobs: [], queue: [], dayCloseConfirmOpen: false, dayReportOpen: false,
  weekTransitionPending: false, rewardedAdPending: null, offlinePersonnelClock: emptyOfflineClock(),
  offlinePersonnelReport: null, offlineSaveIssue: false, offlineResumeAtMs: null });

function Preview() {
  const open = useGame(offlinePersonnelSurfaceVisible);
  const cash = useGame(s => s.store.cash);
  const [ran, setRan] = useState(false);
  const [failReturn, setFailReturn] = useState(params.get('failure') === 'return');
  const simulate = () => {
    const now = Date.now();
    useGame.getState().handlePersonnelLifecycle(false, now - OFFLINE_MAX_MS);
    if (failReturn) Storage.prototype.setItem = () => { throw new Error('development save failure'); };
    try { useGame.getState().handlePersonnelLifecycle(true, now); }
    finally { Storage.prototype.setItem = originalSetItem; }
    setRan(true);
  };
  return <main style={{ padding: 12, maxWidth: 430, margin: 'auto' }}>
    <h1>Development fixture — {scale * 100}% text</h1>
    <p>Synthetic 4-hour shift. Not a player save. Cash: {cash}</p>
    <button type="button" disabled={ran} onClick={simulate}>Simulate 4-hour shift</button>
    <label><input type="checkbox" checked={failReturn} disabled={ran} onChange={event => setFailReturn(event.target.checked)} />Fail return save once</label>
    {open && <OfflinePersonnelDialog />}
  </main>;
}
const originalSetItem = Storage.prototype.setItem;
createRoot(document.getElementById('root')!).render(<Preview />);
