import { Rng, deriveSeed } from './rng';
import type { StoreState } from './types';
import { weekdayLabel } from './calendar';

/** Integer milligrams are the physical source of truth. TL is rounded only at payment. */
export const toMg = (grams: number): number => Math.round(grams * 1000);
export const fromMg = (mg: number): number => mg / 1000;
export const roundMoney = (tl: number): number => Math.round(tl);
export const PERSONNEL_SALARIES = [40_000, 50_000, 60_000] as const;
export const PERSONNEL_MONTHLY = [0, PERSONNEL_SALARIES[0], PERSONNEL_SALARIES[0] + PERSONNEL_SALARIES[1], PERSONNEL_SALARIES[0] + PERSONNEL_SALARIES[1] + PERSONNEL_SALARIES[2]] as const;
export const PERSONNEL_UNLOCK_LEVELS = [1, 3, 6, 10] as const;
export const canSetPersonnel = (store: StoreState, count: number): boolean => Number.isInteger(count) && count >= 0 && count <= 3 &&
  (count <= personnelCount(store) || store.level >= PERSONNEL_UNLOCK_LEVELS[count]!);
export const personnelCount = (store: StoreState): number => Math.min(3, Math.max(0, Math.trunc(store.personnelCount ?? 0)));
export const queueCapacity = (store: StoreState): number => Math.min(10, 4 + personnelCount(store) * 2);
export const personnelDaily = (store: StoreState): number => PERSONNEL_MONTHLY[personnelCount(store)]! / 30;
export const dailyOperatingCost = (store: StoreState): number => roundMoney(store.dailyOverhead + personnelDaily(store));
export const SCALE_MAINTENANCE_INTERVAL_DAYS = 30;
export const scaleMaintenanceCost = (store: StoreState, day: number): number =>
  day > 0 && day % SCALE_MAINTENANCE_INTERVAL_DAYS === 0
    ? roundMoney(10_000 + Math.max(0, store.level - 1) * 2_500)
    : 0;
export const dueScaleMaintenanceDebt = (store: StoreState, day: number): number =>
  roundMoney(store.payables
    .filter(payable => payable.id.startsWith('scale_maintenance_') && payable.dueDay <= day)
    .reduce((sum, payable) => sum + payable.amount, 0));
export const weekdayName = weekdayLabel;

export function dailyTraffic(seed: number, day: number) {
  const roll = new Rng(deriveSeed(seed, 'dailyTraffic', day)).next();
  return roll < .15 ? { label: 'Durgun', multiplier: .65 }
    : roll < .65 ? { label: 'Normal', multiplier: 1 }
    : roll < .90 ? { label: 'Hareketli', multiplier: 1.25 }
    : { label: 'Yoğun', multiplier: 1.5 };
}
export function dailyIntentSplit(seed: number, day: number) {
  const x = new Rng(deriveSeed(seed, 'dailyIntentSplit', day)).int(0, 10);
  return { x, customerSells: (35 + x) / 100, customerBuys: (45 - x) / 100, surprise: .20 };
}
export function dailyPurchaseMix(seed: number, day: number) {
  const y = new Rng(deriveSeed(seed, 'dailyPurchaseMix', day)).int(0, 15);
  return { y, bullion: (67 + y) / 100, crafted: (33 - y) / 100 };
}
/** Toptancı HAS masası her oyun günü açıktır; yalnız geçersiz günleri reddeder. */
export const isHasTradingDay = (day: number): boolean => Number.isInteger(day) && day > 0;
