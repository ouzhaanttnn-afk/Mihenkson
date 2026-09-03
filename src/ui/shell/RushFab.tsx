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
 * KONUM — araç rayının üst kenarına oturur.
 * Bu bir tercih değil, ölçümün sonucu. Dükkân ekranı 390×844'te tepeden
 * tırnağa dolu: durum şeridi, piyasa şeridi, müşteri şeridi, aşama şeridi,
 * İşlem Masası, ray ve Karar Dock'u. Sağ kenarda her aşamada boş kalan tek
 * bant, İşlem Masası'nın dibi ile rayın üstü. Ölçüldü:
 *   · boşta        → arka plan fotoğrafı, boş
 *   · stok aşaması → masanın boş dibi
 *   · pazarlık     → değer kartının altındaki koyu boşluk
 * Dock'un ÜSTÜNE hiç binmez: ana karar yüzeyi (Teklifi Gönder, Müşteriyi
 * Gönder) örtülemez. Ray yüksekliği sabit 56 px olduğu için düğme yarısı
 * rayda yarısı masada durur ve dock'un değişken yüksekliğinden etkilenmez.
 * Bu yüzden mutlak bir "bottom" değeri yerine, akışa sıfır yükseklikli bir
 * çapa konur: ray nereye giderse düğme oraya gider.
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
  const triggerCustomerRush = useGame((s) => s.triggerCustomerRush);

  const open = isShopOpen(day);
  const active = open && remaining > 0;

  const label = active ? t('{dk} dk', { dk: remaining }) : t('Canlandır');
  const title = !open
    ? t('Dükkân kapalı — bugün müşteri akışı yok.')
    : active
      ? t('Müşteri akını sürüyor — {dk} dakika kaldı. Süreyi uzatmak için dokun.', { dk: remaining })
      : t('Dükkânı Canlandır — müşteri geliş aralığını 90 dakika boyunca kısaltır.');

  return (
    <div className="rushFabAnchor">
      <button
        type="button"
        className={`rushFab ${active ? 'rushFab--active' : ''}`}
        onClick={triggerCustomerRush}
        disabled={!open}
        aria-label={title}
        title={title}
      >
        <IconVideo size={17} />
        <span className="rushFab__label">{label}</span>
      </button>
    </div>
  );
}
