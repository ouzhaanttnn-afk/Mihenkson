import { useEffect, useRef } from 'react';
import { useGame } from '@state/gameStore';
import { t } from '@i18n/index';

/** A brief neutral surface; native AdMob owns the real creative and its close control. */
export function InterstitialBreakDialog() {
  const pending = useGame(s => s.interstitialAdPending);
  return pending ? <OpenInterstitialBreak /> : null;
}

function OpenInterstitialBreak() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previous = document.activeElement as HTMLElement | null;
    dialog.showModal();
    return () => { dialog.close(); previous?.focus(); };
  }, []);
  return <dialog ref={dialogRef} className="dayCloseDialog adBreakDialog"
    aria-labelledby="ad-break-title" onCancel={event => event.preventDefault()}>
    <div role="status" aria-live="polite">
      <h2 id="ad-break-title">{t('Kısa reklam arası')}</h2>
      <p>{t('İşlemin kaydedildi. Birazdan dükkâna döneceksin.')}</p>
    </div>
  </dialog>;
}
