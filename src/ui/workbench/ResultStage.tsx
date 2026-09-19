/**
 * İşlem Masası · SONUÇ (GDD 23.10.2 "Sonuç")
 *
 * "Kısa kabul/red özeti ve kritik öğrenme notu. Araç Rayı gizli/disabled.
 *  'Devam Et' veya otomatik dönüş; uzun rapor İşlem Defteri'ne gider."
 *
 * GDD 22.3 — sistem çözümü işlem ÖNCESİ söylemez. Bu ekran yalnız işlem
 * kapandıktan sonra render edilir.
 */

import { t } from '@i18n/index';
import { tl, tlSigned } from '@ui/format';
import type { CaseReview } from '@domain/deal-review';

/*
  MODÜL DÜZEYİNDE `t()` YOK. Burada çağırmak modül yüklenirken bir kez
  çalışır ve dil sonradan değişince rozet ilk dilde donardı; çeviri
  kullanıldığı yerde yapılıyor.
*/
const BADGE_TEXT: Record<CaseReview['tone'], string> = {
  good: 'İyi karar',
  neutral: 'Nötr sonuç',
  bad: 'Pahalı ders',
};

interface Props {
  review: CaseReview;
  accepted: boolean;
  paid?: number;
  estimatedGain?: number;
}

export function TradeSuccessBanner({ profitable = true }: { profitable?: boolean }) {
  return (
    <div className={`result__tradeSuccess ${profitable ? '' : 'result__tradeSuccess--neutral'}`} role="status" aria-live="polite">
      <span className="result__handshake" aria-hidden="true">🤝</span>
      <span className="result__successCopy">
        <strong>{profitable ? t('Ticaret başarılı') : t('Ticaret tamamlandı')}</strong>
        <span>{t('Anlaşma tamamlandı')}</span>
      </span>
    </div>
  );
}

export function SaleResult({ price, cost }: { price: number; cost: number }) {
  const profit = price - cost;
  return <div className="result">
    <TradeSuccessBanner profitable={profit >= 0} />
    <dl className="tradeReceipt">
      <div><dt>{t('Satış tutarı')}</dt><dd className="num">{tl(price)}</dd></div>
      <div><dt>{t('Toplam maliyet')}</dt><dd className="num">{tl(cost)}</dd></div>
      <div className={profit < 0 ? 'tradeReceipt__loss' : 'tradeReceipt__gain'}><dt>{t('Net kâr / zarar')}</dt><dd className="num">{tlSigned(profit)}</dd></div>
    </dl>
  </div>;
}

export function ResultStage({ review, accepted, paid, estimatedGain }: Props) {
  return (
    <div className="result">
      {accepted && <TradeSuccessBanner profitable={review.tone !== 'bad'} />}

      {accepted && paid !== undefined && <dl className="tradeReceipt">
        <div><dt>{t('Ödenen tutar')}</dt><dd className="num">{tl(paid)}</dd></div>
        {estimatedGain !== undefined && <div><dt>{t('Tahmini kazanç')}</dt><dd className="num">{tlSigned(estimatedGain)}</dd></div>}
        <p>{t('Ürün stoğa girdi. Kâr, ürün satıldığında gerçekleşir.')}</p>
      </dl>}

      <details className="tradeAnalysis tradeAnalysis--result">
      <summary>{t('İşlem değerlendirmesi')}</summary>
      <div className="tradeAnalysis__body">

      <span className={`result__badge result__badge--${review.tone}`}>
        {accepted ? t(BADGE_TEXT[review.tone]) : t('İşlem kapanmadı')}
      </span>

      <h2 className="result__headline">{review.headline}</h2>

      {accepted && review.valueDelta !== 0 && (
        <p className="result__note">
          Gerçek değere göre fark:{' '}
          <strong className="num">{tlSigned(review.valueDelta)}</strong>
        </p>
      )}

      <p className="result__note">{review.keyDecisionPoint}</p>

      {/* GDD 21.2 — "İşlem sonrası hangi sinyalin kaçırıldığı gösterilir." */}
      {review.missedSignals.length > 0 && (
        <div className="result__missed">
          <span className="result__missedTitle">{t('Kaçırılan sinyal')}</span>
          {review.missedSignals.slice(0, 2).map((signal) => (
            <span key={signal} className="result__missedItem">
              {signal}
            </span>
          ))}
        </div>
      )}

      {review.alternativeChannelNote && (
        <p className="result__note">{review.alternativeChannelNote}</p>
      )}
      </div>
      </details>
    </div>
  );
}
