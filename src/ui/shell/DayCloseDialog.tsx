import { t } from '@i18n/index';
import { useEffect, useRef } from 'react';
import { DAY } from '@domain/balance';
import { dailyOperatingCost, dueScaleMaintenanceDebt, scaleMaintenanceCost, weekdayName } from '@domain/v5-rules';
import { isMarketOpen, isShopOpen, nextMarketOpenDay, weekdayLabel } from '@domain/calendar';
import { weekendRisk } from '@domain/overnight';
import { lifestyleDailyExpense } from '@domain/marketplace';
import { selectors, useGame } from '@state/gameStore';
import { clock, pct, tl, tlSigned } from '@ui/format';

/** Top-layer dialog: focus stays inside; the paused world cannot receive taps. */
export function DayCloseDialog() {
  const s = useGame();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const report = s.dayReportOpen ? s.lastDayReport : null;
  const risk = weekendRisk(s.market.day, selectors.position(s));
  const tomorrow = s.market.day + 1;
  const open = s.dayCloseConfirmOpen || !!report;
  const lifestyleExpense = lifestyleDailyExpense(s.playerMarket);
  const scaleMaintenance = scaleMaintenanceCost(s.store, s.market.day);
  const scaleMaintenanceDebt = dueScaleMaintenanceDebt(s.store, s.market.day);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    const previous = document.activeElement as HTMLElement | null;
    dialog.showModal();
    return () => { dialog.close(); previous?.focus(); };
  }, [open, report?.day]);
  if (!open) return null;
  return <dialog ref={dialogRef} className="dayCloseDialog" aria-labelledby="day-close-title"
    onCancel={event => { event.preventDefault(); if (!report) s.cancelDayClose(); }}>
    {report ? <>
      <h2 id="day-close-title">
        {t('Gün {gun} · {haftaGunu} kapandı', {
          gun: report.day,
          haftaGunu: t(weekdayName(report.day)),
        })}
      </h2>
      <dl className="dayCloseDialog__stats">
        <Row label={t('Gerçekleşmiş kâr')} value={tlSigned(report.realizedTradeProfit)} tone={report.realizedTradeProfit >= 0 ? 'positive' : 'negative'} />
        <Row label={t('Günlük gider')} value={tlSigned(-report.overhead)} tone="negative" />
        <Row label={t('Personel payı (gidere dahil)')} value={tl(report.personnelExpense ?? 0)} />
        {(report.lifestyleExpense ?? 0) > 0 && <Row label={t('Şahsi bakım (gidere dahil)')} value={tl(report.lifestyleExpense ?? 0)} />}
        {(report.scaleMaintenanceExpense ?? 0) > 0 && <Row label={t('Terazi bakım gideri')} value={tl(report.scaleMaintenanceExpense ?? 0)} />}
        {(report.scaleMaintenanceDeferred ?? 0) > 0 && <Row label={t('Bakım borcuna aktarıldı')} value={tl(report.scaleMaintenanceDeferred ?? 0)} tone="negative" />}
        {(report.scaleMaintenanceDebtPaid ?? 0) > 0 && <Row label={t('Eski bakım borcu ödendi')} value={tl(report.scaleMaintenanceDebtPaid ?? 0)} />}
        {/*
          C6 — "Kasa değişimi −77.336 ₺" 1. günde felaket gibi okunuyordu; oysa
          o paranın 76.136 ₺'si stoğa dönmüştü. Kasadan çıkan para ile
          KAYBEDİLEN para ayrı şeylerdir; alt satır bunu söylüyor.
        */}
        <Row
          label={t('Kasa değişimi')}
          value={tlSigned(report.netCashChange)}
          tone={report.netCashChange >= 0 ? 'positive' : 'negative'}
          note={
            (report.stockPurchaseSpend ?? 0) > 0
              ? t('Bunun {tutar} kadarı stoğa girdi — harcanmadı, mala döndü.', {
                  tutar: tl(report.stockPurchaseSpend ?? 0),
                })
              : undefined
          }
        />
        <Row label={t('Kapanış nakdi')} value={tl(report.closingCash ?? s.store.cash)} />
        <Row label={t('Stok net çıkış farkı')} value={tlSigned(report.stockPotential)} tone={report.stockPotential >= 0 ? 'positive' : 'negative'} />
        <Row label={t('Nakit Durumu')} value={pct(report.liquidity)} />
        <Row label={t('Kaçırılan Misafir')} value={String(report.missedGuestCountToday ?? 0)} />
      </dl>
      {report.overnightSummary && <p>{report.overnightSummary}</p>}
      <button type="button" className="dayCloseDialog__primary" onClick={s.startNewDay}>{t('Yeni güne başla')}</button>
    </> : <>
      <h2 id="day-close-title">{t('Günü şimdi kapat?')}</h2>
      <p>
        {t('Saat {saat}.', { saat: clock(s.market.clockMinutes) })}{' '}
        {s.market.clockMinutes < DAY.closeMinutes
          ? t('Gün daha bitmedi; kapatırsan bugün başka müşteri gelmez.')
          : t('Bugünün işlemleri kapanacak.')}{' '}
        {t('Günlük gider {tutar} her hâlükârda işler.', {
          tutar: tl(
            dailyOperatingCost(s.store) +
              lifestyleExpense +
              scaleMaintenance +
              scaleMaintenanceDebt,
          ),
        })}
      </p>
      {lifestyleExpense > 0 && (
        <p>
          {t(
            'Bu tutarın {tutar} kadarı sahip olduğun şahsi prestij varlıklarının günlük bakımıdır.',
            { tutar: tl(lifestyleExpense) },
          )}
        </p>
      )}
      {scaleMaintenance > 0 && (
        <p>
          {t('Bugün 30 günlük terazi bakım günü: {tutar}.', {
            tutar: tl(scaleMaintenance),
          })}{' '}
          {t('Nakit yetmezse bakım üç gün vadeli borca aktarılır.')}
        </p>
      )}
      {scaleMaintenanceDebt > 0 && (
        <p>{t('Vadesi gelen terazi bakım borcu: {tutar}.', { tutar: tl(scaleMaintenanceDebt) })}</p>
      )}
      <p>
        {t('Yarın {haftaGunu} · dükkân {dukkan} · piyasa {piyasa}.', {
          haftaGunu: t(weekdayLabel(tomorrow)),
          dukkan: isShopOpen(tomorrow) ? t('açık') : t('kapalı'),
          piyasa: isMarketOpen(tomorrow)
            ? t('açık')
            : t('kapalı; sonraki açılış {gun}', {
                gun: t(weekdayLabel(nextMarketOpenDay(tomorrow))),
              }),
        })}
      </p>
      {risk ? <p>{risk.note}</p> : null}
      {!isMarketOpen(tomorrow) && (
        <p>
          {t(
            t('Cuma kapanışından pazartesi açılışına kadar piyasa fiyatı donar; hafta sonu haberleri pazartesi açılışında tek seferde fiyatlanır.'),
          )}
        </p>
      )}
      {s.queue.length > 0 && (
        <p>
          {t('{n} bekleyen müşteri ayrılacak.', { n: s.queue.length })}{' '}
          {t('Bu kişiler kapasite nedeniyle kaçırılan misafir sayısına eklenmez.')}
        </p>
      )}
      <div className="dayCloseDialog__actions">
        <button type="button" className="dayCloseDialog__cancel" onClick={s.cancelDayClose} autoFocus>
          {t('Vazgeç')}
        </button>
        <button type="button" className="dayCloseDialog__primary" onClick={s.advanceDay}>
          {t('Günü Bitir')}
        </button>
      </div>
    </>}
  </dialog>;
}

function Row({ label, value, tone, note }: {
  label: string;
  value: string;
  tone?: 'positive' | 'negative';
  note?: string;
}) {
  return <div>
    <dt>{label}</dt>
    <dd className={tone ? `dayCloseDialog__${tone}` : undefined}>{value}</dd>
    {note && <p className="dayCloseDialog__rowNote">{note}</p>}
  </div>;
}
