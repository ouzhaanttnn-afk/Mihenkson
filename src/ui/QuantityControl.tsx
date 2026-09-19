import { useState } from 'react';
import { t } from '@i18n/index';

export function clampQuantity(value: number, min: number, max: number, step: number): number {
  if (max < min) return 0;
  if (!Number.isFinite(value)) return min;
  if (value >= max) return max;
  return Math.min(max, Math.max(min, Number((Math.round(value / step) * step).toFixed(3))));
}

/** Keyboard is explicit opt-in; all everyday actions work with one thumb. */
export function QuantityControl({ value, min = 1, max, step = 1, unit, onChange, label }: {
  value: number; min?: number; max: number; step?: number; unit: string;
  onChange: (value: number) => void; label: string;
}) {
  const [editing, setEditing] = useState(false);
  const qty = clampQuantity(value, min, max, step);
  const change = (n: number) => onChange(clampQuantity(n, min, max, step));
  return <div className="quantityControl" role="group" aria-label={label}>
    <button type="button" aria-label={`${label} −`} disabled={qty <= min} onClick={() => change(qty - step)}>−</button>
    {editing ? <input autoFocus type="number" inputMode={step < 1 ? 'decimal' : 'numeric'}
      aria-label={label} min={min} max={max} step={step} defaultValue={qty}
      onBlur={e => { change(Number(e.target.value)); setEditing(false); }}
      onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setEditing(false); }} />
      : <button type="button" className="quantityControl__value num" aria-label={`${label}: ${qty} ${unit}`}
          onClick={() => setEditing(true)}>{qty} <small>{unit}</small></button>}
    <button type="button" aria-label={`${label} +`} disabled={qty >= max} onClick={() => change(qty + step)}>+</button>
    <button type="button" disabled={max < min || qty === max} onClick={() => onChange(max)}>{t('TÜMÜ')}</button>
  </div>;
}
