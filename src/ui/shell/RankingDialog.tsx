import { useId } from 'react';
import { useGame } from '@state/gameStore';
import { t } from '@i18n/index';
import { useModalSurface } from '@ui/useModalSurface';
import { MonthlyLeaderboard } from '@ui/screens/MonthlyLeaderboard';

export function RankingButton() {
  const open = useGame(s => s.rankingOpen);
  const setOpen = useGame(s => s.setRankingOpen);
  return <button type="button" className="rankingButton" onClick={() => setOpen(true)}
    aria-label={t('Aylık sıralama')} title={t('Aylık sıralama')}
    aria-haspopup="dialog" aria-expanded={open}>
    <svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor"
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 3h10v5a5 5 0 0 1-10 0V3Z" fill="currentColor" fillOpacity=".14" />
      <path d="M7 5H4v2a4 4 0 0 0 4 4m9-6h3v2a4 4 0 0 1-4 4m-4 2v5m-4 3h8m-6-3h4l1 3H9l1-3Z" />
    </svg>
  </button>;
}

export function RankingDialog() {
  const setOpen = useGame(s => s.setRankingOpen);
  const close = () => setOpen(false);
  const { dialogRef, initialFocusRef } = useModalSurface<HTMLDivElement>(close);
  const titleId = useId();
  return <div className="settingsScrim" onClick={event => { if (event.target === event.currentTarget) close(); }}>
    <div className="settingsBox rankingDialog" ref={dialogRef} role="dialog"
      aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
      <div className="rankingDialog__top">
        <h2 id={titleId}>{t('Aylık sıralama')}</h2>
        <button type="button" className="rankingDialog__close" ref={initialFocusRef}
          aria-label={t('Kapat')} onClick={close}>×</button>
      </div>
      <div className="settingsBox__scroll"><MonthlyLeaderboard /></div>
    </div>
  </div>;
}
