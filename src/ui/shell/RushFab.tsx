/** Contextual customer-rush opportunity, separate from recalling a lost guest. */

import { useGame } from '@state/gameStore';
import { isShopOpen } from '@domain/calendar';
import { IconVideo } from '@ui/icons';
import { t } from '@i18n/index';
import { usePremium } from '@ui/premium';

export function RushFab() {
  const premium = usePremium((s) => s.active && s.known);
  const day = useGame((s) => s.market.day);
  /*
    Kalan süre SEÇİCİDE yuvarlanır. Ham `clockMinutes` her tick'te değişir;
    onu doğrudan seçseydik düğme saniyede onlarca kez yeniden çizilirdi.
    Tam dakikaya yuvarlanınca yeniden çizim oyun dakikasında bir olur.
  */
  const remaining = useGame((s) =>
    s.customerRushUntilMinutes === null
      ? 0
      : Math.max(0, Math.ceil(s.customerRushUntilMinutes - s.market.clockMinutes)),
  );
  const requestCustomerRush = useGame((s) => s.requestCustomerRush);
  const adPending = useGame((s) => s.rewardedAdPending === 'customerRush');

  const decisionActive = useGame(s => s.activeDeal !== null || s.recallableGuest !== null);
  const queueFull = useGame(s => s.queue.length >= 3);
  const open = isShopOpen(day);
  if (!open || decisionActive || queueFull) return null;
  const active = open && remaining > 0;

  const label = adPending ? (premium ? t('İşlem sürüyor…') : t('Reklam…')) : active ? t('{dk} dk', { dk: remaining }) : t('Müşteri Akını');
  const title = adPending
    ? t(premium ? 'İşlem sürüyor…' : 'Reklam yükleniyor…')
    : !open
      ? t('Dükkân kapalı — bugün müşteri akışı yok.')
      : active
        ? t('Müşteri akını sürüyor — {dk} dakika kaldı.', { dk: remaining })
        : premium ? t('Premium: müşteri akınını reklamsız başlat.') : t('Müşteri Akını — reklam izle, 90 oyun dakikası boyunca daha sık müşteri gelsin.');

  return (
    <div className="rushFabAnchor">
      <button
        type="button"
        className={`rushFab ${active ? 'rushFab--active' : ''}`}
        onClick={requestCustomerRush}
        disabled={!open || adPending || active}
        aria-label={title}
        title={title}
      >
        <IconVideo size={17} />
        <span className="rushFab__label">{label}</span>
      </button>
    </div>
  );
}
