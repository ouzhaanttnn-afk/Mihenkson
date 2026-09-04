/**
 * A — Durum Şeridi (UPDATEv1, 64–72 px)
 * "Seviye/XP, Gün-Saat, Nakit + kompakt 1x/2x/4x hız kontrolü."
 *
 * GDD 23.6: "Kompakt; ekranı domine etmez. 4x rewarded state ayrı kart açmaz."
 */

import { SPEED_STEPS, type SpeedStep } from '@domain/balance';
import { weekdayLabel, weekdayShort } from '@domain/calendar';
import { IconLock, IconPencil, IconSettings, BrandMark } from '@ui/icons';
import { Art } from '@ui/Art';
import { avatarArt } from '@ui/assets';
import { clock, tl } from '@ui/format';
import { t } from '@i18n/index';
import type { PlayerProfile } from '@domain/profile';
import type { MarketState, StoreState } from '@domain/types';

interface Props {
  store: StoreState;
  market: MarketState;
  speed: SpeedStep;
  speed4xUnlocked: boolean;
  /** Ödüllü reklam şu an gösteriliyor mu — düğmenin çift tetiklenmesini önler. */
  speed4xAdPending: boolean;
  onSpeed: (s: SpeedStep) => void;
  onUnlock4x: () => void;
  onOpenSettings: () => void;
  /** Kuyumcunun adı ve portresi — yalnız görünüm. */
  profile: PlayerProfile;
  profileFrame?: string;
  onEditProfile: () => void;
}

export function StatusStrip({
  store,
  market,
  speed,
  speed4xUnlocked,
  speed4xAdPending,
  onSpeed,
  onUnlock4x,
  onOpenSettings,
  profile,
  profileFrame,
  onEditProfile,
}: Props) {
  const xpRatio = Math.min(1, store.xp / Math.max(1, store.xpToNext));
  const profileAriaLabel = `${t('Profili düzenle — {ad}', {
    ad: profile.jewelerName,
  })}. ${t('XP')}: ${store.xp}/${store.xpToNext}`;

  return (
    <header className="statusStrip">
      {/*
        PROFİL ALANI — avatar + kuyumcu adı + düzenleme kalemi, tek düğme.

        NEDEN AD SEVİYE SATIRININ ÜSTÜNE İSTİFLENDİ:
        Şerit 390 px genişlikte ÖLÇÜLDÜĞÜNDE tam doluydu — artan
        yer 0 px. Adı yeni bir sütun olarak eklemek, tek esneyen blok olan
        saati 37 px'in altına iterdi ve "Gün 1" iki satıra kırılırdı (bu
        kırılma daha önce yaşandı ve geri alındı).

        Bu yüzden ad, marka işaretinin yerine geçen avatarın YANINDA ama
        seviye satırının ÜSTÜNDE duruyor: zaten var olan bloğun genişliğini
        paylaşıyor, yeni genişlik istemiyor. Kazanılan 16 px de şerit
        boşluğunun 12→8 px inmesinden geliyor. Saat 37 px'te kalır.

        Marka işareti şeritten çıktı: 24 px'lik o alan artık oyuncunun
        kimliğini taşıyor ve markanın kendisi zaten açılış ekranında var.
      */}
      <button
        type="button"
        className="profileChip"
        onClick={onEditProfile}
        aria-label={profileAriaLabel}
      >
        <span className={`profileChip__avatar ${profileFrame ? `profileChip__avatar--${profileFrame}` : ''}`}>
          <Art
            art={avatarArt(profile.avatarId)}
            size={52}
            decorative
            className="profileChip__img"
            fallback={<BrandMark size={20} />}
          />
          <span className="profileChip__pencil" aria-hidden="true">
            <IconPencil size={9} />
          </span>
        </span>

        <span className="profileChip__text">
          <span className="profileChip__name">{profile.jewelerName}</span>
          <span className="statusStrip__levelRow">
            <span className="statusStrip__levelNum">{t('Sv')} {store.level}</span>
            <span className="statusStrip__xp num">
              {store.xp}/{store.xpToNext}
            </span>
          </span>
          <span className="statusStrip__xpBar" aria-hidden="true">
            <span
              className="statusStrip__xpFill"
              style={{ width: `${xpRatio * 100}%` }}
            />
          </span>
        </span>
      </button>

      <div className="statusStrip__meta">
        <div
          className="statusStrip__clock"
          role="timer"
          aria-live="off"
          aria-atomic="true"
          aria-label={t('Gün {gun}, {haftaGunu}, saat {saat}', {
            gun: market.day,
            haftaGunu: t(weekdayLabel(market.day)),
            saat: clock(market.clockMinutes),
          })}
        >
          <div className="statusStrip__day">{t('Gün')} {market.day}</div>
          <span className="statusStrip__clockSep" aria-hidden="true">·</span>
          <div className="statusStrip__weekday">{t(weekdayShort(market.day))}</div>
          <span className="statusStrip__clockSep" aria-hidden="true">·</span>
          <div className="statusStrip__time num">{clock(market.clockMinutes)}</div>
        </div>

        <div className="statusStrip__cash">
          <div className="statusStrip__cashLabel">{t('Nakit')}</div>
          <div className="statusStrip__cashValue num">{tl(store.cash)}</div>
        </div>

        <SpeedControl
          speed={speed}
          unlocked={speed4xUnlocked}
          adPending={speed4xAdPending}
          onSpeed={onSpeed}
          onUnlock={onUnlock4x}
          onOpenSettings={onOpenSettings}
        />
      </div>

    </header>
  );
}

/**
 * 1x/2x temel erişimdir; 4x yalnız ödüllü reklamla geçici açılır (GDD 26.2,
 * gerçek sağlayıcı: AdMob, bkz. `@ui/ads`). `onUnlock` reklamı GÖSTERİR;
 * kilit yalnız reklam GERÇEKTEN tamamlanıp ödül kazanılınca kalkar —
 * `requestUnlock4x` (gameStore.ts) reklam yarıda bırakılırsa hızı açmaz.
 */
function SpeedControl({
  speed,
  unlocked,
  adPending,
  onSpeed,
  onUnlock,
  onOpenSettings,
}: {
  speed: SpeedStep;
  unlocked: boolean;
  adPending: boolean;
  onSpeed: (s: SpeedStep) => void;
  onUnlock: () => void;
  onOpenSettings: () => void;
}) {
  return (
    <div className="speed" role="group" aria-label={t('Oyun hızı')}>
      {SPEED_STEPS.map((step) => {
        const isLocked = step === 4 && !unlocked;
        const isActive = speed === step;
        const waiting = isLocked && adPending;
        const label = waiting
          ? t('Reklam yükleniyor…')
          : isLocked
            ? t('{n}x hızı reklamla aç', { n: step })
            : t('{n}x hız', { n: step });

        return (
          <button
            key={step}
            type="button"
            className={[
              'speed__step',
              isActive ? 'speed__step--active' : '',
              isLocked ? 'speed__step--locked' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => (isLocked ? onUnlock() : onSpeed(step))}
            disabled={waiting}
            aria-pressed={isActive}
            aria-label={label}
            title={label}
          >
            {step}x
            {isLocked && <IconLock size={9} />}
          </button>
        );
      })}

      {/*
        AYARLAR — HIZ GRUBUNUN İÇİNDE, 4x'in hemen yanında.

        Önce Dükkan ekranında yüzen bir baloncuktu; yeri yanlıştı. Ayar her
        yerden erişilebilmeli ve üst şerit dört sekmede de duran tek kalıcı
        yüzey.

        AYRI BİR SÜTUN OLARAK DENENDİ VE OLMADI: 390 px'de sütunların doğal
        toplamı 359 px'e çıkıyor, kullanılabilir alan 326 px; fark profil
        adını eziyordu ("Kuyumcu" 55 px isterken 13 px alıyordu). Grubun
        içine alınca kendi kenarlığını, boşluğunu ve dolgusunu hız grubuyla
        PAYLAŞIYOR — yer açılıyor.

        Anlamı da doğru: ikisi de "oyunu nasıl oynuyorum" ayarı, ikisi de
        oyunun içeriğine değil çerçevesine ait. Tek küme gibi okunuyorlar.
      */}
      <span className="speed__divider" aria-hidden="true" />
      <button
        type="button"
        className="speed__settings"
        onClick={onOpenSettings}
        aria-label={t('Ayarlar')}
        title={t('Ayarlar')}
      >
        <IconSettings size={16} />
      </button>
    </div>
  );
}
