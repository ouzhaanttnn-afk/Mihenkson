import type { GameDay } from './types';

/** 0 = Pazartesi … 6 = Pazar. Oyun günü 1 pazartesidir. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const WEEKDAY_LABEL = [
  'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar',
] as const;

export const WEEKDAY_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'] as const;

export function weekdayOf(day: GameDay): Weekday {
  return ((((day - 1) % 7) + 7) % 7) as Weekday;
}

export function weekOf(day: GameDay): number {
  return Math.floor((day - 1) / 7) + 1;
}

export function weekdayLabel(day: GameDay): string {
  return WEEKDAY_LABEL[weekdayOf(day)]!;
}

export function weekdayShort(day: GameDay): string {
  return WEEKDAY_SHORT[weekdayOf(day)]!;
}

/** Spot kotasyonu yalnız pazartesi–cuma çalışır. */
export function isMarketOpen(day: GameDay): boolean {
  return weekdayOf(day) <= 4;
}

/** Dükkân pazartesi–cumartesi açıktır; pazar planlama günüdür. */
export function isShopOpen(day: GameDay): boolean {
  return weekdayOf(day) <= 5;
}

export function isBlindTradingDay(day: GameDay): boolean {
  return isShopOpen(day) && !isMarketOpen(day);
}

export function isLastTradingDay(day: GameDay): boolean {
  return weekdayOf(day) === 4;
}

/** Pazartesi için 2, diğer açık günler ve kapalı günler için 0. */
export function closedDaysBefore(day: GameDay): number {
  if (!isMarketOpen(day)) return 0;
  let count = 0;
  for (let d = day - 1; d >= 1 && !isMarketOpen(d); d -= 1) count += 1;
  return count;
}

export function nextMarketOpenDay(day: GameDay): GameDay {
  let next = day + 1;
  while (!isMarketOpen(next)) next += 1;
  return next;
}
