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
  onSpeed,
  onUnlock4x,
  onOpenSettings,
  profile,
  profileFrame,
  onEditProfile,
}: Props) {
  const xpRatio = Math.min(1, store.xp / Math.max(1, store.xpToNext));

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
        aria-label={t('Profili düzenle — {ad}', { ad: profile.jewelerName })}
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
          <span className="statusStrip__xpBar">
            <span className="statusStrip__xpFill" style={{ width: `${xpRatio * 100}%` }} />
          </span>
        </span>
      </button>

      <div
        className="statusStrip__clock"
        aria-label={t('Gün {gun}, {haftaGunu}, saat {saat}', {
          gun: market.day,
          haftaGunu: weekdayLabel(market.day),
          saat: clock(market.clockMinutes),
        })}
      >
        <div className="statusStrip__day">{t('Gün')} {market.day}</div>
        <div className="statusStrip__weekday">{t(weekdayShort(market.day))}</div>
        <div className="statusStrip__time num">{clock(market.clockMinutes)}</div>
      </div>

      <div className="statusStrip__cash">
        <div className="statusStrip__cashLabel">{t('Nakit')}</div>
        <div className="statusStrip__cashValue num">{tl(store.cash)}</div>
      </div>

      <SpeedControl
        speed={speed}
        unlocked={speed4xUnlocked}
        onSpeed={onSpeed}
        onUnlock={onUnlock4x}
        onOpenSettings={onOpenSettings}
      />

    </header>
  );
}

/**
 * 1x/2x temel erişimdir; 4x isteğe bağlı açılır. Bu prototip gerçek bir
 * reklam sağlayıcısına bağlı olmadığı için arayüz "video izle" iddiasında
 * bulunmaz; kilit yalnız hızın henüz açılmadığını anlatır.
 */
function SpeedControl({
  speed,
  unlocked,
  onSpeed,
  onUnlock,
  onOpenSettings,
}: {
  speed: SpeedStep;
  unlocked: boolean;
  onSpeed: (s: SpeedStep) => void;
  onUnlock: () => void;
  onOpenSettings: () => void;
}) {
  return (
    <div className="speed" role="group" aria-label={t('Oyun hızı')}>
      {SPEED_STEPS.map((step) => {
        const isLocked = step === 4 && !unlocked;
        const isActive = speed === step;

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
            aria-pressed={isActive}
            aria-label={
              isLocked ? t('{n}x hızı aç', { n: step }) : t('{n}x hız', { n: step })
            }
            title={isLocked ? t('{n}x hızı aç', { n: step }) : t('{n}x hız', { n: step })}
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
