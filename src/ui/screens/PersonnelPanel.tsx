import { useId, useState } from 'react';
import { t } from '@i18n/index';
import { personnelRoles, PERSONNEL_ROLE_LABELS } from '@domain/personnel';
import {
  PERSONNEL_MONTHLY, PERSONNEL_SALARIES, PERSONNEL_TEMP_UNLOCK_DAYS,
  PERSONNEL_UNLOCK_LEVELS, canSetPersonnel, personnelCount, personnelDaily,
  personnelTempUnlockActive, personnelTempUnlockTier, queueCapacity,
} from '@domain/v5-rules';
import type { PersonnelRole } from '@domain/types';
import { useGame } from '@state/gameStore';
import { usePremium } from '@ui/premium';
import { IconBusiness, IconVideo } from '@ui/icons';
import { tl } from '@ui/format';
import { useModalSurface } from '@ui/useModalSurface';

/** Shop and Business share one surface and the existing safe personnel commands. */
export function PersonnelShortcut({ shop = false }: { shop?: boolean }) {
  const store = useGame(state => state.store);
  const open = useGame(state => state.personnelOpen);
  const setOpen = useGame(state => state.setPersonnelOpen);
  return (
    <button type="button"
      className={shop ? 'personnelDisclosure shopPersonnelButton' : 'personnelDisclosure personnelDisclosure--money'}
      onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}>
      <span className="personnelDisclosure__icon" aria-hidden="true"><IconBusiness size={18} /></span>
      <span className="personnelDisclosure__copy">
        <strong>{t('Personel')}</strong>
        <small>{t('{n} personel · Kapasite {kap} · Günlük {gunluk}', {
          n: personnelCount(store), kap: queueCapacity(store), gunluk: tl(personnelDaily(store)),
        })}</small>
      </span>
      <span className="personnelDisclosure__chevron" aria-hidden="true">›</span>
    </button>
  );
}

export function PersonnelPanel() {
  const s = useGame();
  const premium = usePremium(state => state.active && state.known);
  const [pendingPersonnel, setPendingPersonnel] = useState<number | null>(null);
  return (
    <div className="group__body v5Controls personnelControls">
    <p>{t('{n} personel · Kapasite {kap}', { n: personnelCount(s.store), kap: queueCapacity(s.store) })}</p>
    <p>
      {t('Aylık {aylik} · Günlük {gunluk}', {
        aylik: tl(PERSONNEL_MONTHLY[personnelCount(s.store)]!),
        gunluk: tl(personnelDaily(s.store)),
      })}
    </p>
    <p>
      {t('Maaşlar kişi başına eklenir: {liste} / ay. Düğmedeki tutar o kadronun aylık toplamıdır.', {
        liste: PERSONNEL_SALARIES.map((salary) => tl(salary)).join(' + '),
      })}
    </p>
    <p>
      {t(
        'Karşılama ve satış aktif oyunda 90 saniyede bir çalışır. Güvenli satış görevi, kapalı oyunda 15 dakikada bir müşteri dener; en fazla 4 saat.',
      )}
    </p>
    {personnelRoles(s.store).map((role, index) => <label key={index} className="statLine personnelRole">
      <span>{t('Personel {n}', { n: index + 1 })}{s.jobs.some(job => job.result === 'pending' && job.assignedStaff === `personnel_${index + 1}`) && <small> · {t('Bu personel mevcut atölye işini bitirmeli.')}</small>}</span>
      <select aria-label={t('Personel {n} görevi', { n: index + 1 })} value={role}
        disabled={s.jobs.some(job => job.result === 'pending' && job.assignedStaff === `personnel_${index + 1}`)}
        onChange={event => s.setPersonnelRole(index, event.target.value as PersonnelRole)}>
        {Object.entries(PERSONNEL_ROLE_LABELS).map(([id, label]) => <option key={id} value={id}>{t(label)}</option>)}
      </select>
    </label>)}
    {personnelCount(s.store) > 0 && <p className="emptyNote">{t('Güvenli satış: yalnız tam karşılanan mevcut stok, normal müşteri kabulü ve en az %1 maliyet marjı. Personel ürün almaz veya borç açmaz.')}</p>}
    {/*
      DÜĞMEDE YAZAN TUTAR O KADRONUN AYLIK TOPLAMIDIR, kişi başı maaş
      değil. Kişi başı yazsaydı "3" düğmesi 60.000 ₺ gösterirdi ama
      basınca 150.000 ₺ ödenirdi — düğmenin üstündeki sayı ile kasadan
      çıkan para birbirini tutmazdı. Onay satırı da (aşağıda) aynı
      `PERSONNEL_MONTHLY` değerini okuyor; iki yer tek kaynaktan
      besleniyor.
    */}
    <div className="personnelChoiceRow" role="group" aria-label={t('Personel sayısı')}>
      {[0, 1, 2, 3].map((count) => {
        const aylik = PERSONNEL_MONTHLY[count]!;
        const seviye = PERSONNEL_UNLOCK_LEVELS[count] ?? 0;
        const isim =
          count > 0
            ? t('{n} personel, aylık toplam {tutar}, seviye {sv} gerektirir', {
                n: count,
                tutar: tl(aylik),
                sv: seviye,
              })
            : t('Personelsiz — maaş ödenmez');
        const locked = count > 0 && !canSetPersonnel(s.store, count, s.market.day);
        return (
          <div key={count} className="personnelChoice__cell">
            <button
              type="button"
              className={`personnelChoice ${aylik > 0 ? 'personnelChoice--paid' : ''}`}
              aria-pressed={personnelCount(s.store) === count}
              aria-label={isim}
              title={isim}
              disabled={!canSetPersonnel(s.store, count, s.market.day)}
              onClick={() => setPendingPersonnel(count)}
            >
              <strong>{count}</strong>
              <small className="personnelChoice__wage">{tl(aylik)}</small>
              <small className="personnelChoice__req">
                {count > 0 ? `${t('Sv')} ${seviye}` : t('Başlangıç')}
              </small>
            </button>
            {/*
              YALNIZ 3. KADEME reklamla atlanabilir — kullanıcı isteği:
              "gerçek para ödeme sistemini kaldır. 3. personele reklam
              ekle diğerleri yine kalksın." 1. ve 2. kademede TEK yol
              seviyedir (`PERSONNEL_UNLOCK_LEVELS`), başka açılış yok.
              Gerçek parayla açma denemesi tamamen geri alındı.
            */}
            {locked && count === 3 && (
              <button
                type="button"
                className="chip personnelChoice__unlock"
                disabled={s.rewardedAdPending === 'personnelTempUnlock'}
                onClick={() => s.requestPersonnelTempUnlock(count)}
                aria-label={t(premium ? 'Premium ile {gun} gün ücretsiz aç' : 'Reklam izle, {gun} gün boyunca ücretsiz aç', {
                  gun: PERSONNEL_TEMP_UNLOCK_DAYS,
                })}
                title={t(premium ? 'Premium ile {gun} gün ücretsiz aç' : 'Reklam izle, {gun} gün boyunca ücretsiz aç', {
                  gun: PERSONNEL_TEMP_UNLOCK_DAYS,
                })}
              >
                {!premium && <IconVideo size={11} />}
                <span>{s.rewardedAdPending === 'personnelTempUnlock'
                  ? t(premium ? 'İşlem sürüyor…' : 'Reklam yükleniyor…')
                  : t('{gun} gün aç', { gun: PERSONNEL_TEMP_UNLOCK_DAYS })}</span>
              </button>
            )}
          </div>
        );
      })}
    </div>
    {/*
      GEÇİCİ AÇILIŞ DURUMU — reklamla açılan kademe hâlâ süresi
      dolmadıysa kalan gün burada görünür; ne zaman biteceğini
      bilmeden oyuncu "neden düştü" diye şaşırmasın.
    */}
    {personnelTempUnlockActive(s.store, s.market.day) && (
      <p className="personnelWaiver">
        {t('{n} personel geçici açık — {gun} gün kaldı.', {
          n: personnelTempUnlockTier(s.store),
          gun: s.store.personnelTempUnlockUntilDay! - s.market.day + 1,
        })}
      </p>
    )}
    {pendingPersonnel !== null && <div role="group" aria-label={t('Personel onayı')}>
      <p>
        {t('{n} personel · aylık toplam {tutar}.', {
          n: pendingPersonnel,
          tutar: tl(PERSONNEL_MONTHLY[pendingPersonnel]!),
        })}{' '}
        {t('Günlük gider kapanışta tahsil edilir.')}
      </p>
      <button type="button" className="chip" onClick={() => { s.setPersonnelCount(pendingPersonnel); setPendingPersonnel(null); }}>{t('Personeli Onayla')}</button>
      <button type="button" className="chip" onClick={() => setPendingPersonnel(null)}>{t('Vazgeç')}</button>
    </div>}
    {/*
      GÜNLÜK REKLAM DOLUMU — personel varsa, bugünün gideri henüz
      ücretsizleşmediyse gösterilir. Ertesi gün `advanceDay()`
      `personnelCostWaivedToday`'i sıfırlar, düğme yeniden görünür.
    */}
    {personnelCount(s.store) > 0 && (
      <p className="personnelWaiver">
        {s.personnelCostWaivedToday ? (
          t('Bugünkü personel gideri ({tutar}) ücretsizleşti.', {
            tutar: tl(personnelDaily(s.store)),
          })
        ) : (
          <>
            {t('Bugünkü personel gideri: {tutar}.', { tutar: tl(personnelDaily(s.store)) })}{' '}
            <button
              type="button"
              className="chip"
              disabled={s.rewardedAdPending === 'personnelWaiver'}
              onClick={() => s.requestPersonnelAdWaiver()}
            >
              <IconVideo size={14} />{' '}
              {s.rewardedAdPending === 'personnelWaiver'
                ? t(premium ? 'İşlem sürüyor…' : 'Reklam yükleniyor…')
                : t(premium ? 'Premium: bugün ücretsiz olsun' : 'Reklam izle, bugün ücretsiz olsun')}
            </button>
          </>
        )}
      </p>
    )}
    </div>
  );
}

export function PersonnelSheet() {
  const close = () => useGame.getState().setPersonnelOpen(false);
  const titleId = useId();
  const { dialogRef, initialFocusRef } = useModalSurface<HTMLElement>(close);
  return (
    <div className="personnelScrim" onMouseDown={event => {
      if (event.target === event.currentTarget) close();
    }}>
      <section className="page personnelSheet" ref={dialogRef} role="dialog"
        aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <header className="personnelSheet__head">
          <div><span>{t('Kadro ve görevler')}</span><h2 id={titleId}>{t('Personel')}</h2></div>
          <button type="button" ref={initialFocusRef} onClick={close}
            aria-label={t('Personel ekranını kapat')}>×</button>
        </header>
        <div className="personnelSheet__scroll"><PersonnelPanel /></div>
        <button type="button" className="personnelSheet__done" onClick={close}>{t('Kapat')}</button>
      </section>
    </div>
  );
}
