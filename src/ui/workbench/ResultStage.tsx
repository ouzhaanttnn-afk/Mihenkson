/**
 * İşlem Masası · SONUÇ (GDD 23.10.2 "Sonuç")
 *
 * "Kısa kabul/red özeti ve kritik öğrenme notu. Araç Rayı gizli/disabled.
 *  'Devam Et' veya otomatik dönüş; uzun rapor İşlem Defteri'ne gider."
 *
 * GDD 22.3 — sistem çözümü işlem ÖNCESİ söylemez. Bu ekran yalnız işlem
 * kapandıktan sonra render edilir.
 */

import { tlSigned } from '@ui/format';
import type { CaseReview } from '@domain/deal-review';

const BADGE_TEXT: Record<CaseReview['tone'], string> = {
  good: 'İyi karar',
  neutral: 'Nötr sonuç',
  bad: 'Pahalı ders',
};

interface Props {
  review: CaseReview;
  accepted: boolean;
}

export function ResultStage({ review, accepted }: Props) {
  return (
    <div className="result">
      <span className={`result__badge result__badge--${review.tone}`}>
        {accepted ? BADGE_TEXT[review.tone] : 'İşlem kapanmadı'}
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
          <span className="result__missedTitle">Kaçırılan sinyal</span>
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
  );
}
