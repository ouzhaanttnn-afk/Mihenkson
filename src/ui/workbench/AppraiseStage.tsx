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

import { t } from '@i18n/index';
import { TERM } from '@ui/terms';
import { CONFIDENCE_LABEL } from '@domain/valuation';
import { moneyUnit, pct, pctSigned, tl, tlBare } from '@ui/format';
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
        <div className="bandCard__label">{t('Tahmini Değer Aralığı')}</div>
        <div className="bandCard__range num">
          {tlBare(band.min)}
          <span className="bandCard__sep"> – </span>
          {tlBare(band.max)} {moneyUnit()}
        </div>

        <div className="confidence">
          <span className="confidence__label">{t(TERM.confidence)}</span>
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
            {t(CONFIDENCE_LABEL[band.confidence])}
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

        {/*
          Payların toplamı %100 etmez ve bu bir hata değildir (bkz. buildRows).
          Oyuncunun tabloyu bir toplam sanıp tutmadığını görmesi, tabloya
          duyduğu güveni yiyordu; kuralı burada açıkça söylüyoruz.
        */}
        <p className="breakdown__note">
          {t('Paylar band ortasına orandır; toplamları %100 olmak zorunda değildir.')}
        </p>
      </div>
    </div>
  );
}

/**
 * Kırılım satırları. Pay sütunu, kalemin bandın ORTA NOKTASINA oranıdır.
 *
 * PAYLAR NEDEN %100 ETMEZ: her kalem aynı paydaya (band ortası) bölünür ama
 * bir kısmı değeri artırır, bir kısmı düşürür; üstelik piyasa oynaklığı satırı
 * bilgilendiricidir, toplama girmez. Bu yüzden toplam %100'ün üstüne de altına
 * da çıkabilir. Ekranda ölçülen bir örnek: 78 + 24 + 5 + 7 + 2 = %116.
 *
 * ESKİDEN OKUNMUYORDU: değeri DÜŞÜREN kalem `Math.abs` ile ARTI yüzde
 * gösteriliyordu — "Kondisyon / Risk %7" satırının tutarı −999 ₺ idi. Oyuncu
 * tabloyu bir toplam sanıyor, tutmuyor, tabloya güvenmeyi bırakıyordu.
 *
 * Artık işaret yüzdeye de taşınıyor (−%7): satırın yüzdesi ile tutarı aynı
 * yöne bakıyor. Toplamın neden %100 olmadığını da tablonun altındaki not
 * söylüyor; oyuncuya tahmin ettirmiyoruz.
 */
function buildRows(band: ValuationBand) {
  const b = band.breakdown;
  const base = Math.max(1, band.mid);

  const rows: { name: string; value: number; share: string }[] = [
    { name: t('Metal Değeri'), value: b.metal, share: pct(b.metal / base) },
  ];

  if (b.stone > 0) rows.push({ name: t('Taş Değeri'), value: b.stone, share: pct(b.stone / base) });
  if (b.craftsmanship > 0) {
    rows.push({ name: t('İşçilik Değeri'), value: b.craftsmanship, share: pct(b.craftsmanship / base) });
  }
  if (b.rarityPremium > 0) {
    rows.push({ name: t('Nadirlik Primi'), value: b.rarityPremium, share: pct(b.rarityPremium / base) });
  }
  if (b.riskDeduction < 0) {
    // Değeri DÜŞÜREN kalem: yüzde de eksi yazılır, tutarla aynı yöne baksın.
    rows.push({
      name: t('Kondisyon / Risk'),
      value: b.riskDeduction,
      share: pctSigned(b.riskDeduction / base),
    });
  }

  // Piyasa etkisi bilgilendiricidir: rejim bandı ne kadar oynatıyor. İki yöne
  // de gidebildiği için işaretli gösterilir.
  rows.push({
    name: t('Piyasa Oynaklığı'),
    value: b.marketInfluence,
    share: pctSigned(b.marketInfluence / base),
  });

  return rows;
}
