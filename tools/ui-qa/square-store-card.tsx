/** Dev-only fixture: the normal production entry does not include this page. */
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { setLanguage } from '../../src/i18n/index';
import { BusinessIdentity } from '../../src/ui/components/BusinessIdentity';
import '../../src/ui/tokens.css';

const tiers = ['Semt Kuyumcusu', 'Cadde Mağazası', 'AVM / Premium Butik', 'Şehir Flagship'] as const;

function SquareCardQA() {
  const [language, changeLanguage] = useState<'tr' | 'en'>('tr');
  const [large, changeLarge] = useState(false);
  const [collapsed, changeCollapsed] = useState(false);
  const [notice, setNotice] = useState('No action yet');
  setLanguage(language);
  return <>
    <style>{`
      #root { padding: 12px; overflow-y: auto; color: var(--text-dark-1); }
      .qaControls { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
      .qaControls button { min-height: 44px; padding: 8px; color: white; background: #302541; }
      html { font-size: ${large ? 32 : 16}px; }
      .qaControls, .qaNotice { font-size: 14px; }
      .qaCases { width: 100%; }
      .qaCases .businessIdentity { margin-bottom: 12px; }
    `}</style>
    <div className="qaControls">
      <button type="button" onClick={() => changeLanguage('tr')}>Türkçe</button>
      <button type="button" onClick={() => changeLanguage('en')}>English</button>
      <button type="button" aria-pressed={large} onClick={() => changeLarge(!large)}>200% text</button>
      <button type="button" aria-pressed={collapsed} onClick={() => changeCollapsed(!collapsed)}>Collapsed</button>
    </div>
    <p className="qaNotice" role="status">{notice}</p>
    <div className={`qaCases${large ? ' qaLarge' : ''}`}>
      {tiers.map((tierName, index) => <BusinessIdentity key={`${language}-${index}`}
        tier={(index + 1) as 1 | 2 | 3 | 4} tierName={tierName} collapsed={collapsed}
        onOpenGrowth={() => setNotice(`Growth ${index + 1}`)}
        onOpenSkills={() => setNotice(`Skills ${index + 1}`)} />)}
    </div>
  </>;
}

createRoot(document.getElementById('root')!).render(<SquareCardQA />);
