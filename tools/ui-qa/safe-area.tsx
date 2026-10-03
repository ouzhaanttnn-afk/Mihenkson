/** Development-only full-app fixture. No production query flags or storage edits.
 * ?inset=0|20|44|59|62&native=ios|web exercises the actual shell CSS. */
import { createRoot } from 'react-dom/client';
import { App } from '../../src/ui/App';

const query = new URLSearchParams(location.search);
const inset = Number(query.get('inset') ?? 59);
if (![0, 20, 44, 59, 62].includes(inset)) throw new Error('Unsupported QA inset');
const root = document.documentElement;
if (query.get('native') !== 'web') root.dataset.nativePlatform = 'ios';
root.style.setProperty('--safe-top', `${inset}px`);
root.style.setProperty('--safe-bottom', inset > 0 ? '34px' : '0px');

createRoot(document.getElementById('root')!).render(<App />);
