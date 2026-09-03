import { Rng, deriveSeed } from './rng';
import type { GameDay, StoreState } from './types';
import { weekdayLabel } from './calendar';

/** Integer milligrams are the physical source of truth. TL is rounded only at payment. */
export const toMg = (grams: number): number => Math.round(grams * 1000);
export const fromMg = (mg: number): number => mg / 1000;
export const roundMoney = (tl: number): number => Math.round(tl);
export const PERSONNEL_SALARIES = [40_000, 50_000, 60_000] as const;
export const PERSONNEL_MONTHLY = [0, PERSONNEL_SALARIES[0], PERSONNEL_SALARIES[0] + PERSONNEL_SALARIES[1], PERSONNEL_SALARIES[0] + PERSONNEL_SALARIES[1] + PERSONNEL_SALARIES[2]] as const;
export const PERSONNEL_UNLOCK_LEVELS = [1, 3, 6, 10] as const;
export const personnelPaidUnlockLevel = (store: StoreState): number =>
  Math.min(3, Math.max(0, Math.trunc(store.personnelPaidUnlockLevel ?? 0)));
/**
 * Ödüllü reklamla geçici açılan kademe kaç gün sürer. Kullanıcı isteği bir
 * kere izleyip "1 gün ya da 1 hafta, hangisi mantıklıysa" dedi — 1 gün zaten
 * `personnelCostWaivedToday`nin (günlük gider muafiyeti) işi; burada AYRI
 * bir ödül olması için 1 HAFTA seçildi, tek bir reklamı anlamlı kılan
 * kademeyi bir sonraki güne kadar değil bir sonraki haftaya kadar açıyor.
 */
export const PERSONNEL_TEMP_UNLOCK_DAYS = 7;
export const personnelTempUnlockTier = (store: StoreState): number =>
  Math.min(3, Math.max(0, Math.trunc(store.personnelTempUnlockTier ?? 0)));
/** Geçici açılan kademe bugün (`day`) hâlâ geçerli mi. */
export const personnelTempUnlockActive = (store: StoreState, day: GameDay): boolean =>
  day <= (store.personnelTempUnlockUntilDay ?? -1);
/**
 * Üç kaynağın (seviye, kalıcı ödeme, geçici reklam) EN YÜKSEĞİ — o gün
 * oyuncunun seviye şartı olmadan erişebileceği en üst personel kademesi.
 */
export const personnelEffectiveMaxTier = (store: StoreState, day: GameDay): number => {
  let max = personnelPaidUnlockLevel(store);
  if (personnelTempUnlockActive(store, day)) max = Math.max(max, personnelTempUnlockTier(store));
  for (let count = 3; count > max; count -= 1) {
    if (store.level >= PERSONNEL_UNLOCK_LEVELS[count]!) { max = count; break; }
  }
  return max;
};
/**
 * `day` verilmezse (eski çağıranlar, testler) geçici açılış hiç SAYILMAZ —
 * varsayılan davranış bu özellikten önceki hâliyle birebir aynı kalır.
 * Varsayılan BİLEREK `Infinity`, `0` DEĞİL: `personnelTempUnlockUntilDay`
 * gerçek bir günü (ör. 5) tutuyorsa `0` onu YANLIŞLIKLA "hâlâ geçerli"
 * sayardı (`0 <= 5`); `Infinity` hiçbir sonlu `untilDay`i asla geçemez.
 */
export const canSetPersonnel = (store: StoreState, count: number, day: GameDay = Number.POSITIVE_INFINITY): boolean =>
  Number.isInteger(count) && count >= 0 && count <= 3 &&
  (count <= personnelCount(store) || count <= personnelEffectiveMaxTier(store, day));
export const personnelCount = (store: StoreState): number => Math.min(3, Math.max(0, Math.trunc(store.personnelCount ?? 0)));
export const queueCapacity = (store: StoreState): number => Math.min(10, 4 + personnelCount(store) * 2);
export const personnelDaily = (store: StoreState): number => PERSONNEL_MONTHLY[personnelCount(store)]! / 30;
/**
 * Bir personel kademesini seviye şartı olmadan, tek seferlik ödeyerek açmanın
 * bedeli — kademenin AYLIK toplamıyla AYNI rakam (`PERSONNEL_MONTHLY`).
 * Kullanıcı isteği: "40k verip açtığın personeli reklam izleyip
 * kiralayabileceksin" — açılış bedeli ile o kademenin günlük tekrar dolum
 * bedeli (bkz. `personnelDaily`, reklamla ücretsiz olabilir) BİLEREK AYNI
 * kaynaktan (`PERSONNEL_MONTHLY`) geliyor, iki ayrı sayı icat edilmedi.
 */
export const personnelPaidUnlockCost = (count: number): number => PERSONNEL_MONTHLY[count]!;
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
