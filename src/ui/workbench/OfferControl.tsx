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
import { useId, useState } from 'react';
import { offerPresets, snapOffer, type PresetInput } from './offer-presets';
export { snapOffer } from './offer-presets';
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
  /** Oyuncunun kârı sıfırlanmadan verebileceği sınır; müşteri eşiği değildir. */
  profitBoundary?: Money | null;
  guidance?: { direction: PresetInput['direction']; anchor: Money; cash: Money };
}

/**
 * HTML range adımını min değerine göre uygular. Böylece ekranda yazan teklif
 * ile tarayıcının gerçekte göndereceği slider değeri hiçbir zaman ayrışmaz.
 */
export function OfferControl({
  value,
  min,
  max,
  step,
  onChange,
  impacts,
  disabled,
  unitLabel,
  profitBoundary,
  guidance,
}: Props) {
  const [manual, setManual] = useState(false);
  const controlId = useId();
  const normalizedValue = snapOffer(value, min, max, step);
  const boundaryPercent = profitBoundary === null || profitBoundary === undefined || max <= min
    ? null
    : Math.max(0, Math.min(100, ((profitBoundary - min) / (max - min)) * 100));

  if (guidance) {
    const presets = offerPresets({ ...guidance, boundary: profitBoundary ?? 0, min, max, step });
    const selectedPreset = presets.find(p => p.id === 'balanced' && p.value === normalizedValue)
      ?? presets.find(p => p.value === normalizedValue);
    const cashAfter = guidance.cash + (guidance.direction === 'buy' ? -normalizedValue : normalizedValue);
    const labels = { deal: t('Anlaşma odaklı'), balanced: t('Dengeli'), profit: t('Kâr odaklı') };
    return (
      <div className="simpleOffer">
        {!manual && presets.length > 0 && <div className="simpleOffer__presets" role="group" aria-label={t('Teklif tarzı')}>
          {presets.map(preset => <button type="button" key={preset.id}
            aria-pressed={selectedPreset?.id === preset.id}
            disabled={disabled || (guidance.direction === 'buy' && preset.value > guidance.cash)}
            title={guidance.direction === 'buy' && preset.value > guidance.cash ? t('Nakit yetersiz') : t('Kabul garantisi değildir.')}
            onClick={() => onChange(preset.value)}>
            <span>{labels[preset.id]}</span><strong className="num">{tlBare(preset.value)} {currencySymbol()}</strong>
          </button>)}
        </div>}
        <div className="simpleOffer__metrics" aria-live="polite">
          <button type="button" className="simpleOffer__priceEdit" aria-label={manual ? t('Hazır tekliflere dön') : t('Fiyatı kendin ayarla')} aria-expanded={manual} aria-controls={controlId} onClick={() => setManual(current => !current)}>
            <span>{manual ? t('Hazır tekliflere dön') : t('Fiyatı kendin ayarla')}</span><strong className="num">{tlBare(normalizedValue)} {currencySymbol()}</strong>
          </button>
          <div><span>{guidance.direction === 'buy' ? t('Tahmini kazanç') : t('Satış kârı')}</span><strong className={`num impact__value--${impacts[0]?.tone ?? 'neutral'}`}>{impacts[0]?.value ?? '—'}</strong></div>
          <div><span>{t('Sonraki nakit')}</span><strong className={`num ${cashAfter < 0 ? 'impact__value--negative' : ''}`}>{tlBare(cashAfter)} {currencySymbol()}</strong></div>
        </div>
        <div id={controlId} className="simpleOffer__manual" hidden={!manual}>
          {manual && <OfferControl value={value} min={min} max={max} step={step} onChange={onChange} impacts={[]} disabled={disabled} profitBoundary={profitBoundary} unitLabel={unitLabel} />}
        </div>
        {!manual && <span className="simpleOffer__hint">{t('Kabul garantisi değildir.')}</span>}
      </div>
    );
  }

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
          {unitLabel && <span className="offer__unit num">{unitLabel}</span>}
        </span>

        <details className="offer__compactSummary">
          <summary>
            <strong className="num">{tlBare(normalizedValue)} {currencySymbol()}</strong>
            {impacts[0] && <small>{impacts[0].label} <span className={`impact__value--${impacts[0].tone}`}>{impacts[0].value}</span></small>}
          </summary>
          <div className="offer__compactDetails">
            {unitLabel && <p>{unitLabel}</p>}
            {impacts.map(impact => <p key={impact.label}>{impact.label}: <strong className={`impact__value--${impact.tone}`}>{impact.value}</strong></p>)}
          </div>
        </details>

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

      <div className="offer__track">
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
        {boundaryPercent !== null && (
          <span
            className="offer__profitMarker"
            style={{ left: `${boundaryPercent}%` }}
            title={t('Kâr sınırı')}
            aria-hidden="true"
          />
        )}
      </div>

      {boundaryPercent !== null && (
        <div className="offer__profitLegend">
          <span>{t('Kâr sınırı')}</span>
        </div>
      )}

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
