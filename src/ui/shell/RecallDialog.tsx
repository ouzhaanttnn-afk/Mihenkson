import { useGame } from '@state/gameStore';
import { useModalSurface } from '@ui/useModalSurface';
import { t } from '@i18n/index';

export function RecallDialog() {
  const guest = useGame(s => s.recallableGuest);
  const busy = useGame(s => s.rewardedAdPending !== null);
  const dismiss = useGame(s => s.dismissCustomerRecall);
  const recall = useGame(s => s.requestCustomerRecall);
  const close = () => { if (!busy) dismiss(); };
  const { dialogRef, initialFocusRef } = useModalSurface<HTMLDivElement>(close, { active: !!guest });
  if (!guest) return null;
  return <div className="settingsScrim"><div className="settingsBox recallDialog" ref={dialogRef}
    role="dialog" aria-modal="true" aria-labelledby="recall-title" tabIndex={-1}>
    <h2 id="recall-title">{t('Fırsat kaçtı')}</h2>
    <p>{t('Müşteri dükkândan ayrıldı. Bir reklam izleyerek aynı müşteriyi geri çağır ve son teklifini yap.')}</p>
    <button ref={initialFocusRef} className="dayCloseDialog__primary" disabled={busy || !guest.deal} onClick={() => void recall()}>
      {busy ? t('Reklam yükleniyor…') : t('Müşteriyi geri çağır')}
    </button>
    <button className="settingsTextButton" disabled={busy} onClick={close}>{t('Bırak gitsin')}</button>
  </div></div>;
}
