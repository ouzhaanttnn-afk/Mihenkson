import { useId, useState } from 'react';
import { useGame } from '@state/gameStore';
import { t } from '@i18n/index';
import { tl, tlSigned } from '@ui/format';
import { useModalSurface } from '@ui/useModalSurface';
import type { OfflinePersonnelReport } from '@domain/offline-personnel';

export function OfflinePersonnelSummary({ report }: { report: OfflinePersonnelReport }) {
  const rows = [
    [t('Satış tahsilatı'), tl(report.revenue)],
    [t('Satılan stok maliyeti'), tl(report.stockCost)],
    [t('Ticaret kârı'), tlSigned(report.profit)],
    [t('Bu sürede kesilen gider'), tl(report.expenses)],
    [t('Kasa değişimi'), tlSigned(report.cashChange)],
  ];
  return <>
    <p>{t('{dakika} dakika mesai · en fazla 4 saat', { dakika: Math.floor(report.processedMs / 60_000) })}</p>
    {report.elapsedMs > report.processedMs && <p>{t('4 saati aşan süre işlenmedi; sonraki açılışa taşınmaz.')}</p>}
    <p className="offlineReport__sales">{t('{deneme} müşteri denemesinde {satis} güvenli satış.', { deneme: report.attempts, satis: report.sales })}</p>
    {report.sales === 0 && <p>{t('Uygun stok ve fiyatla anlaşma sağlanamadı. Personel alım veya borçlanma yapmadı.')}</p>}
    <dl className="offlineReport__rows">{rows.map(([label, amount]) => <div key={label}><dt>{label}</dt><dd>{amount}</dd></div>)}</dl>
    <p>{t('Stok maliyeti geçmiş alış maliyetidir; kasadan tekrar kesilmedi.')}</p>
    <p>{t('Günlük personel gideri: {tutar} · Gün kapanışında bir kez uygulanır; bu raporda kesilmedi.', { tutar: tl(report.pendingWages) })}</p>
    <p>{t('Oyun günü ve atölye işleri ilerletilmedi. Bekleyen müşteriler korundu.')}</p>
    <p>{t('İşlemler kaydedildi. Düğme yalnız raporu kapatır; tekrar kazanç vermez.')}</p>
  </>;
}

export function OfflinePersonnelDialog() {
  const report = useGame(s => s.offlinePersonnelReport);
  const issue = useGame(s => s.offlineSaveIssue);
  return <OfflinePersonnelSurface report={report} issue={issue}
    acknowledge={() => !!report && useGame.getState().acknowledgeOfflinePersonnel(report.id)}
    retry={() => useGame.getState().handlePersonnelLifecycle(true)}
    discard={() => useGame.getState().discardOfflinePersonnel()} />;
}

export function OfflinePersonnelSurface({ report, issue, acknowledge, retry: retrySave, discard }: {
  report: OfflinePersonnelReport | null; issue: boolean; acknowledge: () => boolean; retry: () => boolean;
  discard?: () => boolean;
}) {
  const [error, setError] = useState(false);
  const titleId = useId();
  const close = () => {
    if (issue) return;
    if (report && !acknowledge()) setError(true);
  };
  const retry = () => { setError(!retrySave()); };
  const { dialogRef, initialFocusRef } = useModalSurface<HTMLElement>(close, { closeOnEscape: !issue });
  return <div className="personnelScrim">
    <section className="page personnelSheet offlineReport" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
      <header className="personnelSheet__head"><div><span>{t('Personel mesaisi')}</span><h2 id={titleId}>{t('Sen yokken dükkânda')}</h2></div></header>
      <div className="personnelSheet__scroll">
        {issue ? <p role="status">{t('Mesai kaydedilemedi; kasa ve stok değiştirilmedi. Kaydı tekrar dene.')}</p>
          : report && <OfflinePersonnelSummary report={report} />}
        {error && <p role="status">{t('Kayıt doğrulanamadı. Rapor kapanmadı; tekrar dene.')}</p>}
      </div>
      <button className="personnelSheet__done" type="button" ref={initialFocusRef} onClick={issue ? retry : close}>
        {issue ? t('Kaydı tekrar dene') : t('Dükkâna dön')}
      </button>
      {issue && discard && <button className="personnelSheet__done" type="button" onClick={() => setError(!discard())}>
        {t('Bu mesaiyi satış yapmadan atla')}
      </button>}
    </section>
  </div>;
}
