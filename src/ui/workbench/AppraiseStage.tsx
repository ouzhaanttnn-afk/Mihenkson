/**
 * İşlem Masası · DEĞERLE (GDD 23.7 "Değerle", 23.10.2)
 *
 * Kurallar:
 *  - Ana sonuç tek fiyat DEĞİL, değer aralığı + güven seviyesidir.
 *  - Metal, taş, işçilik, risk ve piyasa etkisi kısa satırlara bölünür.
 *  - Belirsizlik uzmanlık/test ile daralır.
 *
 * GDD 6.6 — motor kesin "bu fiyattan al" emri vermez; band bir karar
 * referansıdır, adil fiyat ilanı değildir.
 */

import { TERM } from '@ui/terms';
import { CONFIDENCE_LABEL } from '@domain/valuation';
import { tl, tlBare, pct } from '@ui/format';
import type { ValuationBand } from '@domain/types';

const SEGMENTS = 5;

const CONFIDENCE_SEGMENTS: Record<ValuationBand['confidence'], number> = {
  low: 2,
  medium: 3,
  high: 5,
};

interface Props {
  band: ValuationBand;
}

export function AppraiseStage({ band }: Props) {
  const rows = buildRows(band);
  const filled = CONFIDENCE_SEGMENTS[band.confidence];

  return (
    <div className="appraise">
      <div className="bandCard">
        <div className="bandCard__label">Tahmini Değer Aralığı</div>
        <div className="bandCard__range num">
          {tlBare(band.min)}
          <span className="bandCard__sep"> – </span>
          {tlBare(band.max)} ₺
        </div>

        <div className="confidence">
          <span className="confidence__label">{TERM.confidence}</span>
          <span className="confidence__bar">
            {Array.from({ length: SEGMENTS }, (_, i) => (
              <span
                key={i}
                className={`confidence__seg ${
                  i < filled ? `confidence__seg--on-${band.confidence}` : ''
                }`}
              />
            ))}
          </span>
          <span className={`confidence__value confidence__value--${band.confidence}`}>
            {CONFIDENCE_LABEL[band.confidence]}
          </span>
        </div>
      </div>

      <div className="breakdown">
        {rows.map((row) => (
          <div key={row.name} className="breakdown__row">
            <span className="breakdown__name">{row.name}</span>
            <span className="breakdown__share num">{row.share}</span>
            <span
              className={`breakdown__value num ${
                row.value < 0 ? 'breakdown__value--negative' : ''
              }`}
            >
              {tl(row.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Kırılım satırları. Pay sütunu, kalemin bandın orta noktasına oranıdır —
 * oyuncuya "değer nereden geliyor?" sorusunu tek bakışta cevaplar.
 */
function buildRows(band: ValuationBand) {
  const b = band.breakdown;
  const base = Math.max(1, band.mid);

  const rows: { name: string; value: number; share: string }[] = [
    { name: 'Metal Değeri', value: b.metal, share: pct(b.metal / base) },
  ];

  if (b.stone > 0) rows.push({ name: 'Taş Değeri', value: b.stone, share: pct(b.stone / base) });
  if (b.craftsmanship > 0) {
    rows.push({ name: 'İşçilik Değeri', value: b.craftsmanship, share: pct(b.craftsmanship / base) });
  }
  if (b.rarityPremium > 0) {
    rows.push({ name: 'Nadirlik Primi', value: b.rarityPremium, share: pct(b.rarityPremium / base) });
  }
  if (b.riskDeduction < 0) {
    rows.push({
      name: 'Kondisyon / Risk',
      value: b.riskDeduction,
      share: pct(Math.abs(b.riskDeduction) / base),
    });
  }

  // Piyasa etkisi bilgilendiricidir: rejim bandı ne kadar oynatıyor.
  rows.push({
    name: 'Piyasa Oynaklığı',
    value: b.marketInfluence,
    share: pct(b.marketInfluence / base),
  });

  return rows;
}
