/**
 * DÜKKÂNI CANLANDIR — kalıcı yuvarlak kenar düğmesi (GDD 23.10.1)
 *
 * NEDEN AYRI BİR BİLEŞEN?
 * Bu çağrı önce uyarı yığınının içinde, alerts'in altında duran ince bir
 * çubuktu. Orada iki kusuru vardı:
 *   1. Müşteri karşılanır karşılanmaz kayboluyordu — oyuncu düğmeyi
 *      "bazen çıkan" bir şey sanıyordu.
 *   2. Uyarılar üç taneye çıkınca aşağı itiliyor, yeri her gün değişiyordu.
 * Oyuncu isteği: düğme ekranın kenarında, yuvarlak ve KALICI dursun.
 *
 * KONUM — araç rayının sağındaki ayrılmış yuvadır.
 * Önce daire yarı tezgâh/yarı ray üzerinde duruyordu; kısa ekran ve ders
 * şeridinde Karar Dock'una kadar taşıp "Günü Bitir" hedefini örtüyordu.
 * Araç rayı sabit yükseklikte olduğu için 52 px düğme artık bütünüyle bu
 * banda oturur; rayın sağ dolgusu da araçların düğmenin altına kaymasını
 * engeller. Böylece dock yüksekliği değişse bile iki eylem kesişmez.
 *
 * GDD 23.24 — ikon tek başına anlam taşımaz. Daire ikonu TEK BAŞINA
 * göstermez; altında 11 px (GDD 23.22 mutlak alt sınırı) etiket vardır.
 *
 * DÜKKÂN KAPALIYKEN KAYBOLMAZ, SÖNER. Pazar günü müşteri akışı yoktur;
 * düğme o gün hiçbir şey yapmaz. Eski davranış düğmeyi tamamen gizlemekti,
 * ama oyuncu "kalıcı" istedi: kalıcılıkla dürüstlüğü birlikte tutmanın yolu
 * düğmeyi yerinde bırakıp devre dışı ve soluk göstermek, nedeni de erişilebilir
 * isme yazmaktır.
 */

import { useGame } from '@state/gameStore';
import { isShopOpen } from '@domain/calendar';
import { IconVideo } from '@ui/icons';
import { t } from '@i18n/index';

export function RushFab() {
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

  const open = isShopOpen(day);
  const active = open && remaining > 0;

  const label = adPending ? t('Reklam…') : active ? t('{dk} dk', { dk: remaining }) : t('Canlandır');
  const title = adPending
    ? t('Reklam yükleniyor…')
    : !open
      ? t('Dükkân kapalı — bugün müşteri akışı yok.')
      : active
        ? t('Müşteri akını sürüyor — {dk} dakika kaldı. Süreyi uzatmak için dokun.', { dk: remaining })
        : t('Dükkânı Canlandır — ödüllü reklam izle, müşteri geliş aralığı 90 dakika boyunca kısalsın.');

  return (
    <div className="rushFabAnchor">
      <button
        type="button"
        className={`rushFab ${active ? 'rushFab--active' : ''}`}
        onClick={requestCustomerRush}
        disabled={!open || adPending}
        aria-label={title}
        title={title}
      >
        <IconVideo size={17} />
        <span className="rushFab__label">{label}</span>
      </button>
    </div>
  );
}
