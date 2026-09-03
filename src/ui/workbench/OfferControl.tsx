/**
 * Teklif kontrolü — Karar Dock'u içinde yaşar (GDD 23.12)
 *
 * Kurallar:
 *  - "Teklif tutarı pazarlıkta Dock'un EN BÜYÜK sayısal değeri olur; kasa ve
 *    piyasa rakamı onu görsel olarak geçmez."
 *  - "Slider kaba ayar sağlar; +/− küçük kontroller ince ayar açar."
 *  - "Tahmini sonuçlar kesinlik iddiası taşımaz: 'Tahmini +1.850 TL',
 *    'Likidite %19 → %12', 'İlişki: riskli' gibi etiketlenir."
 *
 * GDD 23.12 — sayısal giriş sheet'i sistem klavyesinin ana ekranı yukarı
 * itmemesi için ayrı bir katmandır; bu sürümde slider + ince ayar yeterlidir
 * ve klavye hiç açılmaz.
 */

import { t } from '@i18n/index';
import { TERM } from '@ui/terms';
import { tlBare, pct } from '@ui/format';
import { currencySymbol } from '@i18n/currency';
import type { Money } from '@domain/types';

export interface OfferImpact {
  label: string;
  value: string;
  tone: 'positive' | 'negative' | 'neutral' | 'warning';
}

interface Props {
  value: Money;
  min: Money;
  max: Money;
  step: Money;
  onChange: (value: Money) => void;
  impacts: OfferImpact[];
  disabled?: boolean;
  /**
   * Tutarın BİRİM karşılığı — "3 adet · 16.593 ₺/adet" ya da
   * "10,0 g · 4.257 ₺/g".
   *
   * Toplam tutar tek başına sarrafiyede karar verdirmez: 49.779 ₺'nin iyi
   * mi kötü mü olduğu ancak gram/adet başına ne ettiğine bakılınca anlaşılır
   * — sarraf da fiyatı zaten böyle konuşur. Anlamlı bir birim yoksa
   * (karışık paket, tekil işçilikli ürün) satır hiç çizilmez; uydurulmuş
   * bir "ortalama birim fiyat" yanlış yönlendirir.
   */
  unitLabel?: string | null;
}

/**
 * HTML range adımını min değerine göre uygular. Böylece ekranda yazan teklif
 * ile tarayıcının gerçekte göndereceği slider değeri hiçbir zaman ayrışmaz.
 */
export function snapOffer(value: Money, min: Money, max: Money, step: Money): Money {
  const safeStep = Math.max(1, Math.round(step));
  const safeMin = Math.round(min);
  const safeMax = Math.max(safeMin, Math.round(max));
  const lastStep = safeMin + Math.floor((safeMax - safeMin) / safeStep) * safeStep;
  const clamped = Math.min(lastStep, Math.max(safeMin, Math.round(value)));
  return safeMin + Math.round((clamped - safeMin) / safeStep) * safeStep;
}

export function OfferControl({
  value,
  min,
  max,
  step,
  onChange,
  impacts,
  disabled,
  unitLabel,
}: Props) {
  const normalizedValue = snapOffer(value, min, max, step);

  return (
    <div className="offer">
      <div className="offer__row">
        <button
          type="button"
          className="offer__nudge"
          onClick={() => onChange(snapOffer(normalizedValue - step, min, max, step))}
          disabled={disabled || normalizedValue <= min}
          aria-label={t("Teklifi azalt")}
        >
          −
        </button>

        <span className="offer__amount num">
          {tlBare(normalizedValue)}
          <span className="offer__currency">{currencySymbol()}</span>
        </span>

        <button
          type="button"
          className="offer__nudge"
          onClick={() => onChange(snapOffer(normalizedValue + step, min, max, step))}
          disabled={disabled || normalizedValue >= max}
          aria-label={t('Teklifi artır')}
        >
          +
        </button>
      </div>

      {unitLabel && <div className="offer__unit num">{unitLabel}</div>}

      <input
        type="range"
        className="offer__slider"
        min={min}
        max={max}
        step={step}
        value={normalizedValue}
        onChange={(e) => onChange(snapOffer(Number(e.target.value), min, max, step))}
        disabled={disabled}
        aria-label={t('Teklif tutarı')}
      />

      {impacts.length > 0 && (
        <div className="impacts">
          {impacts.map((impact) => (
            <span key={impact.label} className="impact">
              <span className="impact__label">{impact.label}</span>
              <span className={`impact__value impact__value--${impact.tone} num`}>
                {impact.value}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Likidite etkisi etiketi: "%19 → %12" (GDD 23.12 örneği). */
export function liquidityImpact(before: number, after: number): OfferImpact {
  const drop = before - after;
  return {
    label: t(TERM.liquidity),
    value: `${pct(before)} → ${pct(after)}`,
    tone: after < 0.15 ? 'negative' : drop > 0.12 ? 'warning' : 'neutral',
  };
}
