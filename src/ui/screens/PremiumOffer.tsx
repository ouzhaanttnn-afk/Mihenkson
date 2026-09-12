import { useEffect } from 'react';
import { t } from '@i18n/index';
import { buyPremium, initializePremium, loadPremiumProduct, premiumSupported, restorePremium, usePremium } from '@ui/premium';

const MESSAGES = {
  idle: '', loading: 'İşlem sürüyor…', purchased: 'Premium aktif. İyi oyunlar!',
  pending: 'Satın alma Apple onayı bekliyor. Onaylandığında Premium açılacak.',
  cancelled: 'Satın alma iptal edildi.', restored: 'Premium satın alımın geri yüklendi.',
  notFound: 'Bu Apple hesabında Premium satın alımı bulunamadı.',
  failed: 'İşlem doğrulanamadı. Bağlantını kontrol edip tekrar dene veya satın alımları geri yükle.',
} as const;

export function PremiumOffer() {
  const { active, known, product, busy, message } = usePremium();
  const supported = premiumSupported();
  useEffect(() => { initializePremium(); void loadPremiumProduct(); }, []);
  return (
    <article className="premiumOffer" aria-labelledby="premium-title">
      <span className="premiumOffer__seal" aria-hidden="true">✦</span>
      <div className="premiumOffer__eyebrow">MIHENK PREMIUM</div>
      <h2 id="premium-title">{t('Reklamsız kuyumculuk')}</h2>
      <p>{t('Bir kez satın al, kalıcı olarak reklamsız oyna.')}</p>
      <ul>
        <li>{t('Zorunlu reklamlar tamamen kalkar.')}</li>
        <li>{t('Ödülleri reklam izlemeden, ilgili düğmeye dokunarak alırsın.')}</li>
        <li>{t('Mevcut günlük haklar ve bekleme süreleri korunur.')}</li>
      </ul>
      <div className="premiumOffer__price">
        {active && known ? <strong>{t('Premium aktif')}</strong> : <>
          <strong>{product?.displayPrice ?? '—'}</strong>
          <span>{t('Tek seferlik · Abonelik değil')}</span>
        </>}
      </div>
      <button type="button" className="cta" disabled={!supported || !known || active || busy || !product?.canPurchase} onClick={() => void buyPremium()}>
        {busy ? t('İşlem sürüyor…') : active && known ? t('Premium aktif') : t('Premium Satın Al')}
      </button>
      <p className="premiumOffer__notice">
        {!supported ? t('Satın alma iOS uygulamasında kullanılabilir.') : !product ? t('App Store fiyatı şu anda alınamıyor. Tekrar deneyebilirsin.') : t('Gerçek para ile satın alınır; oyun içi nakit kullanılmaz.')}
      </p>
      {supported && <div className="premiumOffer__links">
        <button type="button" disabled={busy} onClick={() => void restorePremium()}>{t('Satın Alımları Geri Yükle')}</button>
        {(!product || !known) && <button type="button" disabled={busy} onClick={() => { initializePremium(); void loadPremiumProduct(); }}>{t('Tekrar Dene')}</button>}
      </div>}
      <p className="premiumOffer__status" role="status">{t(MESSAGES[message])}</p>
    </article>
  );
}
