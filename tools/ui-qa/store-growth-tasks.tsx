/** Development-only controlled component fixture; never imports a production QA flag. */
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { evaluateUpgrade, type GrowthSnapshot } from '../../src/domain/store-growth';
import { tierDef } from '../../src/data/store-tiers';
import { useGame } from '../../src/state/gameStore';
import { setLanguage } from '../../src/i18n/index';
import { setCurrency } from '../../src/i18n/currency';
import { StoreGrowthTasks } from '../../src/ui/screens/StoreGrowthTasks';
import { BottomNav } from '../../src/ui/shell/BottomNav';
import '../../src/ui/tokens.css';
import '../../src/ui/shell/AppShell.css';
import '../../src/ui/screens/Screens.css';

const base = useGame.getState().store;
document.documentElement.dataset.nativePlatform = 'ios';
document.documentElement.style.setProperty('--safe-top', '59px');
document.documentElement.style.setProperty('--safe-bottom', '34px');
function TasksQA() {
  const [tier, setTier] = useState(1);
  const [mode, setMode] = useState('missing');
  const [language, changeLanguage] = useState<'tr' | 'en'>('tr');
  const [currency, changeCurrency] = useState<'try' | 'usd'>('try');
  const [large, setLarge] = useState(false);
  const [notice, setNotice] = useState('');
  setLanguage(language); setCurrency(currency);
  const target = tierDef(Math.min(4, tier + 1));
  const snapshot: GrowthSnapshot = { ...target.requires!, cash: target.investment };
  if (mode === 'missing') Object.assign(snapshot, { closedDeals: 0, knownCustomers: 0, level: 1, supplierTrust: 50, reputation: 42, netWorth: 0 });
  if (mode === 'cash') snapshot.cash -= 1;
  if (mode === 'fall') snapshot.reputation = 0;
  const evaluation = evaluateUpgrade({ ...base, storeTier: tier }, snapshot);
  return <>
    <style>{`html {font-size:${large ? 32 : 16}px} .qaPanel { position:fixed; top:0; left:0; z-index:100; color:white; font-size:14px; background:#161923 } .qaPanel summary { padding:6px; cursor:pointer } .qaPanel button { min-height:44px; padding:8px; margin:4px; } .qaPanel[open] {max-height:90vh; overflow:auto} `}</style>
    <details className="qaPanel"><summary>QA controls</summary>
      <button onClick={() => changeLanguage(language === 'tr' ? 'en' : 'tr')}>TR / EN</button>
      <button onClick={() => changeCurrency(currency === 'try' ? 'usd' : 'try')}>TRY / USD</button>
      <button onClick={() => setLarge(!large)}>200% text</button>
      {['missing', 'ready', 'cash', 'fall'].map(m => <button key={m} onClick={() => setMode(m)}>{m}</button>)}
      {[1, 2, 3, 4].map(n => <button key={n} onClick={() => setTier(n)}>Tier {n}</button>)}
      <button onClick={() => { setMode('missing'); setTimeout(() => setMode('ready'), 5000); }}>Delayed ready</button>
      <button onClick={() => { setMode('ready'); setTimeout(() => setMode('fall'), 5000); }}>Delayed fall</button>
      <p role="status">{notice || 'Controlled QA fixture, no real purchase.'}</p>
    </details>
    <div className="deviceFrame"><div className="device"><main className="screen screen--business">
      <StoreGrowthTasks evaluation={evaluation} displaySlots={8} backStockSlots={16} workshopCapacity={2}
        dailyOverhead={900} customerDensity={1} presentationBonus={0}
        onBack={() => setNotice('Back callback')} onTrade={() => setNotice('Shop callback')}
        onWholesaler={() => setNotice('Wholesale callback')} onUpgrade={() => { setNotice('Upgrade callback'); setTier(tier + 1); }} />
    </main><BottomNav active="business" onSelect={() => setNotice('Navigation callback')} shopBadge={0} workshopBadge={0} /></div></div>
  </>;
}
createRoot(document.getElementById('root')!).render(<TasksQA />);
