/**
 * ATÖLYE ekranı (GDD 23.18)
 *
 * Bölgeler (GDD 23.18 tablosu):
 *   Kapasite şeridi | Aktif slot / toplam slot, bugün teslim, gecikme riski. Sticky.
 *   İş kuyruğu      | Müşteri/ürün, servis tipi, kalan süre, söz verilen gün, hata riski.
 *   Dış Usta        | Ayrı kısa alt görünüm; ücret + süre + güvenilirlik.
 *   Ekipman         | Yükseltmeler kapasite/hata/süreyi etkiler; pasif HAS üretimi YOKTUR.
 *
 * "Atölye ekranı fabrika üretim bandı gibi görünmez; aktif iş emri ve teslim
 *  sözleri ön plandadır."
 *
 * DEĞİŞMEZ (GDD 17.4 / 34.13): bu ekranda pasif gelir sayacı yoktur. Para
 * yalnız "Teslim Et" ile, yalnız tamamlanmış bir iş için hareket eder.
 */

import { t } from '@i18n/index';
import { SERVICE } from '@domain/balance';
import { activeJobs, inHouseLoad, overdueJobs, readyJobs } from '@domain/service';
import { getServiceType } from '@data/service-types';
import { useGame } from '@state/gameStore';

import { IconClock, IconServiceResale, IconWarning, IconWorkshop } from '@ui/icons';
import { Art } from '@ui/Art';
import { NAV_ART, OUTSIDE_MASTER_ART, SERVICE_ART } from '@ui/assets';
import { pct, tl } from '@ui/format';
import type { ServiceJob } from '@domain/types';

export function WorkshopScreen() {
  const s = useGame();

  const active = activeJobs(s.jobs);
  const ready = readyJobs(s.jobs);
  const overdue = overdueJobs(s.jobs, s.market.day);
  const load = inHouseLoad(s.jobs);
  const capacity = s.store.workshopCapacity;

  const dueToday = active.filter((j) => j.promisedDay === s.market.day).length;
  const equipmentBonus = SERVICE.equipmentBonusByTier[s.store.storeTier] ?? 0;
  const outsourcedCount = active.filter((j) => j.venue === 'outsourced').length;

  return (
    <div className="page">
      {/* Kapasite şeridi — sticky (GDD 23.18) */}
      <header className="pageHead">
        <h1 className="pageHead__title">{t('Atölye')}</h1>
        <p className="pageHead__sub">{t('Servis kuyruğu, kapasite ve teslim sözleri')}</p>

        <div className="summaryRow">
          <div className="summaryRow__item">
            <span className="summaryRow__label">Kapasite</span>
            <span
              className={`summaryRow__value num ${
                load >= capacity ? 'summaryRow__value--warning' : ''
              }`}
            >
              {load}/{capacity} slot
            </span>
          </div>
          <div className="summaryRow__item">
            <span className="summaryRow__label">{t('Bugün Teslim')}</span>
            <span className="summaryRow__value num">{t('{n} iş', { n: dueToday })}</span>
          </div>
          <div className="summaryRow__item">
            <span className="summaryRow__label">Gecikme</span>
            <span
              className={`summaryRow__value num ${
                overdue.length > 0 ? 'summaryRow__value--negative' : ''
              }`}
            >
              {overdue.length > 0 ? t('{n} iş', { n: overdue.length }) : t('Yok')}
            </span>
          </div>
        </div>

        <div className="liquidityBar">
          <div
            className={`liquidityBar__fill liquidityBar__fill--${
              load >= capacity ? 'caution' : 'healthy'
            }`}
            style={{ width: `${capacity > 0 ? Math.min(100, (load / capacity) * 100) : 0}%` }}
          />
        </div>
      </header>

      <div className="page__scroll">
        {s.lastServiceDelivery && (
          <section className={`deliveryResult ${s.lastServiceDelivery.succeeded ? 'deliveryResult--success' : 'deliveryResult--failed'}`} aria-live="polite">
            <div className="deliveryResult__head">
              <div>
                <span className="deliveryResult__eyebrow">Son teslimat</span>
                <h2>{s.lastServiceDelivery.jobName}</h2>
                <p>{s.lastServiceDelivery.customerName} · {s.lastServiceDelivery.succeeded ? t('Başarılı') : t('Hatalı sonuç')}</p>
              </div>
              <span className="tag">{s.lastServiceDelivery.succeeded ? 'BAŞARILI' : 'HATALI'}</span>
            </div>
            <div className="deliveryResult__grid">
              <span>{t('Ücret')} <strong>{tl(s.lastServiceDelivery.fee)}</strong></span>
              <span>Tazmin <strong>{tl(s.lastServiceDelivery.compensation)}</strong></span>
              <span>{t('Net nakit')} <strong>{tl(s.lastServiceDelivery.cashDelta)}</strong></span>
              <span>{t('Net katkı')} <strong>{tl(s.lastServiceDelivery.netContribution)}</strong></span>
              <span>{t('İlişki')} <strong>{s.lastServiceDelivery.trustDelta > 0 ? '+' : ''}{s.lastServiceDelivery.trustDelta}</strong></span>
              <span>{t('İtibar')} <strong>{s.lastServiceDelivery.reputationDelta > 0 ? '+' : ''}{s.lastServiceDelivery.reputationDelta}</strong></span>
            </div>
            <p className="deliveryResult__message">Risk {pct(s.lastServiceDelivery.risk)} · {s.lastServiceDelivery.message}</p>
            <button type="button" className="secondary" onClick={s.dismissServiceDelivery}>Devam Et</button>
          </section>
        )}
        {/* Teslime hazır işler önce — oyuncunun aksiyon alması gerekenler. */}
        {ready.length > 0 && (
          <div className="group">
            <h2 className="group__title">{t('Teslime Hazır')}</h2>
            <div className="rowList">
              {ready.map((job) => (
                <JobRow key={job.jobId} job={job} today={s.market.day} onDeliver={s.deliverJob} />
              ))}
            </div>
          </div>
        )}

        {/* İş kuyruğu */}
        <div className="group">
          <h2 className="group__title">
            {t('İş Kuyruğu')}
            {active.length > 0 ? ` · ${active.length}` : ''}
          </h2>

          {active.length === 0 ? (
            <div className="empty empty--compact">
              <div className="empty__icon">
                <Art
                  art={NAV_ART.workshop}
                  size={56}
                  decorative
                  className="art--hero"
                  fallback={<IconWorkshop size={34} />}
                />
              </div>
              <p className="empty__title">{t('Kuyruk boş')}</p>
              <p className="empty__text">
                {t(
                  'Kabul ettiğin servis işleri burada görünür. Gelir yalnız tamamlanan gerçek işlerden doğar.',
                )}
              </p>
            </div>
          ) : (
            <div className="rowList">
              {active.map((job) => (
                <JobRow key={job.jobId} job={job} today={s.market.day} onDeliver={s.deliverJob} />
              ))}
            </div>
          )}
        </div>

        {/* Dış Usta — ayrı kısa alt görünüm (GDD 23.18) */}
        <div className="group">
          <h2 className="group__title">{t('Dış Usta')}</h2>
          <div className="group__body">
            {/*
              GDD 23.18 Dış Usta ayrı bir alt görünüm. Portre 72 px: işi
              devrettiğin kişinin bir yüzü olması, "kapasite dışı" soyut
              bir satırı bir ilişkiye çeviriyor.
            */}
            <div className="masterLine">
              <Art
                art={OUTSIDE_MASTER_ART}
                size={72}
                className="masterLine__portrait art--portrait"
                fallback={<IconServiceResale size={26} />}
              />
              <span className="masterLine__text">
                {t('Kendi tezgâhın dolduğunda işi devredebileceğin usta.')}
              </span>
            </div>
            <div className="statLine">
              <span className="statLine__label">
                <IconServiceResale size={15} />
                {t('Devredilen iş')}
              </span>
              <span className="statLine__value num">{outsourcedCount}</span>
            </div>
            <div className="statLine">
              <span className="statLine__label">{t('Ek süre')}</span>
              <span className="statLine__value num">
                +{t('{n} gün', { n: SERVICE.outsource.extraDays })}
              </span>
            </div>
            <div className="statLine">
              <span className="statLine__label">{t('Ücret payı')}</span>
              <span className="statLine__value statLine__value--warning num">
                {pct(SERVICE.outsource.feeShare)}
              </span>
            </div>
            <div className="statLine">
              <span className="statLine__label">{t('Kapasite tüketimi')}</span>
              <span className="statLine__value statLine__value--positive">{t('Yok')}</span>
            </div>
          </div>
        </div>

        {/* Ekipman — kapasite/hata/süreyi etkiler; pasif üretim yok (GDD 23.18) */}
        <div className="group">
          <h2 className="group__title">Ekipman</h2>
          <div className="group__body">
            <div className="statLine">
              <span className="statLine__label">Kademe {s.store.storeTier} ekipman bonusu</span>
              <span
                className={`statLine__value num ${
                  equipmentBonus > 0 ? 'statLine__value--positive' : ''
                }`}
              >
                {equipmentBonus > 0
                  ? t('−{oran} hata riski', { oran: pct(equipmentBonus) })
                  : t('Yok')}
              </span>
            </div>
            <div className="statLine">
              <span className="statLine__label">Personel</span>
              <span className="statLine__value num">
                {s.store.staff.length === 0
                  ? t('Yok')
                  : t('{n} kişi', { n: s.store.staff.length })}
              </span>
            </div>
            <div className="statLine">
              <span className="statLine__label">{t('Yoğunluk risk etkisi')}</span>
              <span className="statLine__value statLine__value--warning num">
                +{pct(SERVICE.loadRiskWeight)} tam kapasitede
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Bir iş emri satırı — GDD 23.18: "Müşteri/ürün, servis tipi, kalan süre,
 * söz verilen gün, hata riski."
 */
function JobRow({
  job,
  today,
  onDeliver,
}: {
  job: ServiceJob;
  today: number;
  onDeliver: (jobId: string) => void;
}) {
  const type = getServiceType(job.type);
  const isReady = job.result === 'success' || job.result === 'failed';
  const isLate = today > job.promisedDay && job.result !== 'delivered';
  const daysToPromise = job.promisedDay - today;

  return (
    <div className="row">
      {/*
        Yuvada işin YAPILDIĞI ekipman durur: polisaj işi polisaj makinesi,
        zincir tamiri lehim istasyonu. Hangi işin tezgâhta olduğu satırı
        okumadan görünür. İş bittiyse ekipman yerine "hazır" ikonu — o an
        okunması gereken şey ekipman değil, teslim edilebilirliktir.
      */}
      <span className="row__thumb">
        {isReady ? (
          <IconWorkshop size={20} />
        ) : (
          <Art
            art={SERVICE_ART[job.type]}
            size={64}
            decorative
            className="art--onDark"
            fallback={<IconClock size={20} />}
          />
        )}
      </span>

      <div className="row__body">
        <div className="row__title">
          {type.label}{' '}
          <span className={`tag ${job.venue === 'outsourced' ? 'tag--neutral' : ''}`}>
            {job.venue === 'inHouse' ? t('Kendi atölyem') : t('Dış usta')}
          </span>
        </div>
        <div className="row__meta">
          {job.itemName} · {job.customerName}
        </div>

        <div className="row__figures">
          <span className="figure">
            <span className="figure__label">{t('Kalan süre')}</span>
            <span className="figure__value num">
              {job.result === 'pending' ? t('{n} gün', { n: job.remainingDays }) : t('Bitti')}
            </span>
          </span>
          <span className="figure">
            <span className="figure__label">{t('Söz verilen')}</span>
            <span
              className={`figure__value num ${isLate ? 'figure__value--negative' : ''}`}
            >
              {job.promisedDay}. gün
            </span>
          </span>
          <span className="figure">
            <span className="figure__label">Hata riski</span>
            <span
              className={`figure__value num ${
                job.risk >= 0.3 ? 'figure__value--negative' : ''
              }`}
            >
              {pct(job.risk)}
            </span>
          </span>
          <span className="figure">
            <span className="figure__label">{t('Ücret')}</span>
            <span className="figure__value num">{tl(job.fee)}</span>
          </span>
        </div>

        {/* Satır uyarısı — tek satır durum */}
        {isLate && (
          <div className="rowAlert">
            <IconWarning size={12} />
            Söz verilen gün geçti · her gün {SERVICE.latePenaltyPerDay} puan güven kaybı
          </div>
        )}
        {!isLate && job.result === 'pending' && daysToPromise <= 1 && (
          <div className="rowAlert">
            <IconClock size={12} />
            {daysToPromise === 0 ? t('Bugün teslim sözü var') : t('Yarın teslim sözü var')}
          </div>
        )}
      </div>

      {isReady && (
        <button
          type="button"
          className="secondary"
          onClick={() => onDeliver(job.jobId)}
          style={{ flex: '0 0 auto' }}
        >
          {t('Teslim Et')}
        </button>
      )}
    </div>
  );
}
