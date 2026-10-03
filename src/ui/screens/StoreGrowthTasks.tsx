import { useEffect, useRef, useState } from 'react';
import type { Gate, UpgradeEvaluation } from '@domain/store-growth';
import { t } from '@i18n/index';
import { tl } from '@ui/format';
import { groupStoreTasks, storeGrowthTasks, storeTaskHint, storeTaskLabel } from '@ui/store-growth-tasks';
import './StoreGrowthTasks.css';

export interface StoreGrowthTasksProps {
  evaluation: UpgradeEvaluation;
  displaySlots: number;
  backStockSlots: number;
  workshopCapacity: number;
  dailyOverhead: number;
  customerDensity: number;
  presentationBonus: number;
  onBack: () => void;
  onUpgrade: () => void;
  onTrade: () => void;
  onWholesaler: () => void;
}

function TaskRow({ gate }: { gate: Gate }) {
  const value = gate.unit === 'money'
    ? `${tl(gate.current)} / ${tl(gate.needed)}`
    : `${Math.floor(gate.current)} / ${gate.needed}`;
  return <li className="storeGrowthTasks__row" data-task={gate.key}>
    <span className="storeGrowthTasks__label">
      <span aria-hidden="true">{gate.met ? '✓ ' : '· '}</span>{storeTaskLabel(gate.key)}
      <span className="srOnly"> · {gate.met ? t('Hazır') : t('Eksik')}</span>
    </span>
    <span className="storeGrowthTasks__value">{value}</span>
  </li>;
}

export function StoreGrowthTasks(props: StoreGrowthTasksProps) {
  const { evaluation } = props;
  const tasks = storeGrowthTasks(evaluation);
  const readyCount = tasks.filter(g => g.met).length;
  const cashGate = evaluation.gates.find(g => g.key === 'investment');
  const cashMissing = Math.max(0, evaluation.investment - (cashGate?.current ?? 0));
  const bodyRef = useRef<HTMLDivElement>(null);
  const pointer = useRef(false);
  const focused = useRef(false);
  const settleTimer = useRef<ReturnType<typeof setTimeout>>();
  const [frozen, setFrozen] = useState<{ tier: number; keys: Gate['key'][] } | null>(null);
  const groups = groupStoreTasks(tasks, frozen?.tier === evaluation.current.tier ? frozen.keys : undefined);

  const freeze = () => setFrozen(previous => previous?.tier === evaluation.current.tier
    ? previous : { tier: evaluation.current.tier, keys: tasks.filter(g => !g.met).map(g => g.key) });
  const settle = () => {
    clearTimeout(settleTimer.current);
    // Do not relocate a summary before the following click or while it has focus.
    settleTimer.current = setTimeout(() => {
      if (!pointer.current && !focused.current) setFrozen(null);
    }, 180);
  };
  useEffect(() => () => clearTimeout(settleTimer.current), []);
  useEffect(() => {
    // A drag can finish outside the scroll body; always release that lock.
    const release = () => { pointer.current = false; settle(); };
    const deactivate = () => { focused.current = false; release(); };
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    window.addEventListener('blur', deactivate);
    return () => {
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
      window.removeEventListener('blur', deactivate);
    };
  }, []);

  return <div className="page storeGrowthPage">
    <header className="pageHead storeGrowthPage__head">
      <button type="button" className="storeGrowthPage__back" aria-label={t('← İşletme')} onClick={props.onBack}>←</button>
      <div>
        <h1 className="pageHead__title" id="store-tier-page-title">{t((evaluation.next ?? evaluation.current).name)}</h1>
        <p className="pageHead__sub">{evaluation.next
          ? t('Görevler · {hazir}/{toplam} hazır', { hazir: readyCount, toplam: tasks.length })
          : t('Bu sürümde son kademe.')}</p>
      </div>
    </header>
    <div ref={bodyRef} className="page__scroll storeGrowthPage__body" role="region"
      aria-labelledby="store-tier-page-title" tabIndex={0}
      onPointerDown={() => { pointer.current = true; freeze(); }}
      onPointerUp={() => { pointer.current = false; settle(); }}
      onPointerCancel={() => { pointer.current = false; settle(); }}
      onFocusCapture={event => {
        focused.current = event.target !== bodyRef.current;
        if (focused.current) freeze();
      }}
      onBlurCapture={event => {
        focused.current = event.relatedTarget instanceof Node && !!bodyRef.current?.contains(event.relatedTarget);
        settle();
      }}
      onScroll={() => { freeze(); settle(); }}>
      {evaluation.next && <>
        <h2 className="storeGrowthTasks__title">{t('Büyümek için')}</h2>
        <ul className="storeGrowthTasks__list" role="list" aria-label={t('Büyümek için')}>
          {groups.missing.map(gate => <TaskRow key={gate.key} gate={gate} />)}
        </ul>
        {groups.missing.length === 0 && <p className="storeGrowthTasks__success">✓ {t('Görevlerin hazır. Yatırımı tamamlayınca büyüyebilirsin.')}</p>}
        <details className="storeGrowthTasks__disclosure">
          <summary>{t('Hazır görevler ({n})', { n: readyCount })}</summary>
          <ul className="storeGrowthTasks__list" role="list">{groups.ready.map(gate => <TaskRow key={gate.key} gate={gate} />)}</ul>
          <p className="storeGrowthTasks__note">{t('Bunlar toplam kariyer hedefleri. Servet, itibar ve güven tekrar düşebilir.')}</p>
        </details>
        <section className="storeGrowthTasks__investment" aria-labelledby="store-investment-title">
          <div className="storeGrowthTasks__moneyRow"><h2 id="store-investment-title">{t('Yatırım')}</h2><strong>{tl(evaluation.investment)}</strong></div>
          <p>{cashMissing > 0
            ? t('Yatırım için {tutar} eksik', { tutar: tl(cashMissing) })
            : t('Yatırım nakdin hazır')}</p>
          <p>{t('Yeni günlük gider: {tutar}', { tutar: tl(evaluation.next.grants.dailyOverhead) })}</p>
        </section>
        <details className="storeGrowthTasks__disclosure">
          <summary>{t('Nasıl ilerlerim?')}</summary>
          <ul className="storeGrowthTasks__hints">{tasks.filter(g => !g.met).map(g =>
            <li key={g.key}><strong>{storeTaskLabel(g.key)}:</strong> {storeTaskHint(g.key)}</li>)}</ul>
          {readyCount === tasks.length && <p>{t('Görevlerin hazır. Yatırımı tamamlayınca büyüyebilirsin.')}</p>}
          <div className="storeGrowthTasks__links">
            <button type="button" onClick={props.onTrade}>{t('Dükkâna dön')}</button>
            <button type="button" onClick={props.onWholesaler}>{t('Toptancı hesabı')}</button>
          </div>
        </details>
      </>}
      <details className="storeGrowthTasks__disclosure" key={`details-${evaluation.current.tier}`}>
        <summary>{t('Mağaza ayrıntıları')}</summary>
        <h2 className="storeGrowthTasks__title">{t(evaluation.current.name)}</h2>
        <p>{t('Vitrin {vitrin} · Arka stok {stok} · Atölye {atolye}', {
          vitrin: props.displaySlots, stok: props.backStockSlots, atolye: props.workshopCapacity,
        })}</p>
        <p>{t('Günlük gider')}: {tl(props.dailyOverhead)}</p>
        <p>{t('Müşteri yoğunluğu')}: {props.customerDensity.toFixed(2)}×</p>
        <p>{t('Dükkan sunum katkısı')}: +{Math.round(props.presentationBonus * 100)}%</p>
        <ul>{evaluation.current.unlocks.map(u => <li key={u}>{t(u)}</li>)}</ul>
        {evaluation.next && <>
          <h2 className="storeGrowthTasks__title">{t('Büyüyünce açılır')}</h2>
          <ul>{evaluation.next.unlocks.map(u => <li key={u}>{t(u)}</li>)}</ul>
          {cashMissing === 0 && <p>{t('Yatırım sonrası nakit')}: {tl((cashGate?.current ?? 0) - evaluation.investment)}</p>}
          <p>{t('Yükseltme kalıcı bir gider taahhüdüdür: kademe büyüdükçe günlük sabit gider de büyür.')}</p>
        </>}
        <p>{t('Tema, dekorasyon ve koleksiyon kategorilerinin her biri müşteri yoğunluğuna %4 katkı verir; toplam en fazla %12. Şahsi ve gerçek para kozmetikleri güç vermez.')}</p>
        <p>{t('250–1000 g siparişler: kademe 3, itibar 65 ve toptancı güveni 65. Talep hacmi nakit ve kullanılabilir vadeye bağlıdır.')}</p>
      </details>
    </div>
    {evaluation.next && <footer className="storeGrowthPage__footer">
      <button type="button" className="storeGrowthPage__upgrade" disabled={!evaluation.ready}
        onClick={props.onUpgrade}>{t('{tutar} öde ve büyüt', { tutar: tl(evaluation.investment) })}</button>
    </footer>}
  </div>;
}
