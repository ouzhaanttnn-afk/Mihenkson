/** UI-only price shortcuts. No customer reservation, RNG or game-state writes. */
export interface PresetInput {
  direction: 'buy' | 'sell';
  anchor: number;
  boundary: number;
  min: number;
  max: number;
  step: number;
}

export function snapOffer(value: number, min: number, max: number, step: number): number {
  const safeStep = Math.max(1, Math.round(step));
  const safeMin = Math.round(min);
  const safeMax = Math.max(safeMin, Math.round(max));
  const lastStep = safeMin + Math.floor((safeMax - safeMin) / safeStep) * safeStep;
  const clamped = Math.min(lastStep, Math.max(safeMin, Math.round(value)));
  return safeMin + Math.round((clamped - safeMin) / safeStep) * safeStep;
}

export function offerPresets(input: PresetInput) {
  const { direction, anchor, boundary, min, max, step } = input;
  if (![anchor, boundary, min, max, step].every(Number.isFinite) || max <= min || boundary <= 0) return [];
  const snap = (v: number) => snapOffer(v, min, max, step);
  // Protect preset prices against crossing the player's cost/estimate solely
  // through rounding. Manual offers still retain the full original range.
  const safeEdge = direction === 'buy'
    ? min + Math.floor((boundary - min) / Math.max(1, step)) * Math.max(1, step)
    : min + Math.ceil((boundary - min) / Math.max(1, step)) * Math.max(1, step);
  if (safeEdge < min || safeEdge > max) return [];
  const protect = (v: number) => snap(direction === 'buy' ? Math.min(v, safeEdge) : Math.max(v, safeEdge));
  const balanced = protect(anchor);
  const margin = Math.abs(balanced - safeEdge);
  const sign = direction === 'buy' ? -1 : 1;
  return [
    { id: 'deal', value: protect(safeEdge + sign * margin * 0.45) },
    { id: 'balanced', value: balanced },
    { id: 'profit', value: protect(balanced + sign * Math.max(step, margin * 0.55)) },
  ] as const;
}
