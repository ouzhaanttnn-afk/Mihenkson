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
      <h2 id="day-close-title">Gün {report.day} · {weekdayName(report.day)} kapandı</h2>
      <dl className="dayCloseDialog__stats">
        <Row label="Gerçekleşmiş kâr" value={tlSigned(report.realizedTradeProfit)} tone={report.realizedTradeProfit >= 0 ? 'positive' : 'negative'} />
        <Row label="Günlük gider" value={tlSigned(-report.overhead)} tone="negative" />
        <Row label="Personel payı (gidere dahil)" value={tl(report.personnelExpense ?? 0)} />
        {(report.lifestyleExpense ?? 0) > 0 && <Row label="Şahsi bakım (gidere dahil)" value={tl(report.lifestyleExpense ?? 0)} />}
        {(report.scaleMaintenanceExpense ?? 0) > 0 && <Row label="Terazi bakım gideri" value={tl(report.scaleMaintenanceExpense ?? 0)} />}
        {(report.scaleMaintenanceDeferred ?? 0) > 0 && <Row label="Bakım borcuna aktarıldı" value={tl(report.scaleMaintenanceDeferred ?? 0)} tone="negative" />}
        {(report.scaleMaintenanceDebtPaid ?? 0) > 0 && <Row label="Eski bakım borcu ödendi" value={tl(report.scaleMaintenanceDebtPaid ?? 0)} />}
        <Row label="Kasa değişimi" value={tlSigned(report.netCashChange)} tone={report.netCashChange >= 0 ? 'positive' : 'negative'} />
        <Row label="Kapanış nakdi" value={tl(report.closingCash ?? s.store.cash)} />
        <Row label="Stok net çıkış farkı" value={tlSigned(report.stockPotential)} tone={report.stockPotential >= 0 ? 'positive' : 'negative'} />
        <Row label="Nakit Durumu" value={pct(report.liquidity)} />
        <Row label="Kaçırılan Misafir" value={String(report.missedGuestCountToday ?? 0)} />
      </dl>
      {report.overnightSummary && <p>{report.overnightSummary}</p>}
      <button type="button" className="dayCloseDialog__primary" onClick={s.startNewDay}>Yeni güne başla</button>
    </> : <>
      <h2 id="day-close-title">Günü şimdi kapat?</h2>
      <p>Saat {clock(s.market.clockMinutes)}. {s.market.clockMinutes < DAY.closeMinutes ? 'Gün daha bitmedi; kapatırsan bugün başka müşteri gelmez.' : 'Bugünün işlemleri kapanacak.'} Günlük gider {tl(dailyOperatingCost(s.store) + lifestyleExpense + scaleMaintenance + scaleMaintenanceDebt)} her hâlükârda işler.</p>
      {lifestyleExpense > 0 && <p>Bu tutarın {tl(lifestyleExpense)} kadarı sahip olduğun şahsi prestij varlıklarının günlük bakımıdır.</p>}
      {scaleMaintenance > 0 && <p>Bugün 30 günlük terazi bakım günü: {tl(scaleMaintenance)}. Nakit yetmezse bakım üç gün vadeli borca aktarılır.</p>}
      {scaleMaintenanceDebt > 0 && <p>Vadesi gelen terazi bakım borcu: {tl(scaleMaintenanceDebt)}.</p>}
      <p>
        Yarın {weekdayLabel(tomorrow)} · dükkân {isShopOpen(tomorrow) ? 'açık' : 'kapalı'} · piyasa {isMarketOpen(tomorrow) ? 'açık' : `kapalı; sonraki açılış ${weekdayLabel(nextMarketOpenDay(tomorrow))}`}.
      </p>
      {risk ? <p>{risk.note}</p> : null}
      {!isMarketOpen(tomorrow) && (
        <p>Cuma kapanışından pazartesi açılışına kadar piyasa fiyatı donar; hafta sonu haberleri pazartesi açılışında tek seferde fiyatlanır.</p>
      )}
      {s.queue.length > 0 && <p>{s.queue.length} bekleyen müşteri ayrılacak. Bu kişiler kapasite nedeniyle kaçırılan misafir sayısına eklenmez.</p>}
      <div className="dayCloseDialog__actions">
        <button type="button" className="dayCloseDialog__cancel" onClick={s.cancelDayClose} autoFocus>Vazgeç</button>
        <button type="button" className="dayCloseDialog__primary" onClick={s.advanceDay}>Günü Bitir</button>
      </div>
    </>}
  </dialog>;
}

function Row({ label, value, tone }: { label: string; value: string; tone?: 'positive' | 'negative' }) {
  return <div><dt>{label}</dt><dd className={tone ? `dayCloseDialog__${tone}` : undefined}>{value}</dd></div>;
}
