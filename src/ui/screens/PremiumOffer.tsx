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
  const { active, known, product, productLoading, productError, busy, message } = usePremium();
  const supported = premiumSupported();
  useEffect(() => { initializePremium(); void loadPremiumProduct(); }, []);

  const showActionStatus = !productError && (
    message === 'purchased' || message === 'restored' || message === 'pending' || (message === 'failed' && busy === false)
  );

  return (
    <article className="premiumOffer" aria-labelledby="premium-title">
      <span className="premiumOffer__seal" aria-hidden="true">✦</span>
      <div className="premiumOffer__eyebrow">MIHENK PREMIUM</div>
      <h2 id="premium-title">{t('Reklamsız Kuyumculuk')}</h2>
      <p className="premiumOffer__subtitle">{t('Bir kez satın al, kalıcı olarak reklamsız oyna.')}</p>

      <ul className="premiumOffer__benefits">
        <li>{t('Zorunlu reklamlar kalkar.')}</li>
        <li>{t('Ödülleri reklam izlemeden alırsın.')}</li>
      </ul>

      <div className="premiumOffer__price">
        {!supported ? (
          <span>{t('Satın alma iOS uygulamasında kullanılabilir.')}</span>
        ) : active && known ? (
          <strong>{t('Premium aktif')}</strong>
        ) : product ? (
          <>
            <strong>{product.displayPrice}</strong>
            <span>{t('Tek seferlik · Abonelik değil')}</span>
          </>
        ) : productError ? (
          <div className="premiumOffer__errorBlock">
            <span className="premiumOffer__errorText">{t('App Store bağlantısı kurulamadı.')}</span>
            <button
              type="button"
              className="premiumOffer__retry"
              disabled={busy}
              onClick={() => { initializePremium(); void loadPremiumProduct(); }}
            >
              {t('Tekrar Dene')}
            </button>
          </div>
        ) : productLoading || (!product && !productError) ? (
          <div className="premiumOffer__loadingBlock">
            <span className="premiumOffer__loadingText">{t('App Store’a bağlanılıyor…')}</span>
            <span>{t('Tek seferlik · Abonelik değil')}</span>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        className={`cta ${!product || !product.canPurchase ? 'cta--disabled' : ''}`}
        disabled={!supported || !known || active || busy || !product?.canPurchase}
        onClick={() => void buyPremium()}
      >
        {busy
          ? t('İşlem sürüyor…')
          : active && known
          ? t('Premium aktif')
          : product
          ? t('{fiyat} ile Satın Al', { fiyat: product.displayPrice })
          : t('Premium Satın Al')}
      </button>

      <p className="premiumOffer__caption">
        {t('Mevcut günlük haklar ve bekleme süreleri korunur.')}
      </p>

      {supported && (
        <div className="premiumOffer__links">
          <button
            type="button"
            className="premiumOffer__restore"
            disabled={busy}
            onClick={() => void restorePremium()}
          >
            {t('Satın Alımları Geri Yükle')}
          </button>
        </div>
      )}

      {showActionStatus && (
        <p className="premiumOffer__status" role="status">
          {t(MESSAGES[message])}
        </p>
      )}
    </article>
  );
}
