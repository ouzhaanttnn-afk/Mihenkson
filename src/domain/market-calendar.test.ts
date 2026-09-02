import { describe, expect, it } from 'vitest';

import { MARKET_DAILY_CAP } from './balance';
import { isMarketOpen, isShopOpen, weekdayLabel } from './calendar';
import { createMarketForDay, softLimitMove, stepMarketIntraday } from './market';

function series(seed: number, throughDay: number) {
  let market = createMarketForDay(seed, 1);
  for (let day = 2; day <= throughDay; day += 1) {
    market = createMarketForDay(seed, day, market);
  }
  return market;
}

describe('takvim ve piyasa kapanışı', () => {
  it('gün 1 pazartesidir; cumartesi dükkân açık/piyasa kapalı, pazar ikisi de kapalıdır', () => {
    expect(weekdayLabel(1)).toBe('Pazartesi');
    expect(isMarketOpen(6)).toBe(false);
    expect(isShopOpen(6)).toBe(true);
    expect(isMarketOpen(7)).toBe(false);
    expect(isShopOpen(7)).toBe(false);
  });

  it('cumartesi ve pazar cuma kapanış kotasyonunu aynen taşır', () => {
    const friday = series(42, 5);
    const saturday = createMarketForDay(42, 6, friday);
    const sunday = createMarketForDay(42, 7, saturday);
    expect(saturday.goldSpot).toBe(friday.goldSpot);
    expect(sunday.goldSpot).toBe(friday.goldSpot);
    expect(saturday.marketOpen).toBe(false);
    expect(stepMarketIntraday(saturday, 16 * 60).goldSpot).toBe(friday.goldSpot);
  });

  it('her açık gün ±%3 güvenlik tavanını aşmaz; pazartesi de istisna değildir', () => {
    for (let seed = 1; seed <= 100; seed += 1) {
      const monday = series(seed, 1);
      const tuesday = createMarketForDay(seed, 2, monday);
      expect(Math.abs(tuesday.goldSpot / monday.goldSpot - 1)).toBeLessThanOrEqual(
        MARKET_DAILY_CAP + 0.00001,
      );

      const friday = series(seed, 5);
      const saturday = createMarketForDay(seed, 6, friday);
      const sunday = createMarketForDay(seed, 7, saturday);
      const nextMonday = createMarketForDay(seed, 8, sunday);
      expect(nextMonday.gapDays).toBe(2);
      expect(Math.abs(nextMonday.goldSpot / friday.goldSpot - 1)).toBeLessThanOrEqual(
        MARKET_DAILY_CAP + 0.00001,
      );
    }
  });

  it('günlük hareket tavana clamp edilmez, yaklaştıkça yumuşar', () => {
    expect(softLimitMove(0.01)).toBe(0.01);
    expect(softLimitMove(0.03)).toBeGreaterThan(0.02);
    expect(softLimitMove(0.03)).toBeLessThan(MARKET_DAILY_CAP);
    expect(softLimitMove(0.3)).toBeLessThan(MARKET_DAILY_CAP);
    expect(softLimitMove(-0.3)).toBeGreaterThan(-MARKET_DAILY_CAP);
  });

  it('günlük sonuçlar şansa bağlı dağılır ve hiçbiri doğrudan ±%3 olmaz', () => {
    const moves: number[] = [];
    for (let seed = 1; seed <= 1_000; seed += 1) {
      const first = series(seed, 1);
      const second = createMarketForDay(seed, 2, first);
      moves.push(second.goldSpot / first.goldSpot - 1);
    }
    const absolute = moves.map(Math.abs).sort((a, b) => a - b);
    const p50 = absolute[Math.floor(absolute.length * 0.5)]!;
    const p90 = absolute[Math.floor(absolute.length * 0.9)]!;
    expect(moves.some((move) => move > 0)).toBe(true);
    expect(moves.some((move) => move < 0)).toBe(true);
    expect(moves.every((move) => Math.abs(move) < MARKET_DAILY_CAP)).toBe(true);
    expect(p50).toBeLessThan(0.012);
    expect(p90).toBeLessThan(0.024);
  });
});

describe('15 dakikalık adımlar', () => {
  it('aynı zaman kovası ikinci kez fiyat uygulamaz', () => {
    const open = createMarketForDay(91, 1);
    const once = stepMarketIntraday(open, 9 * 60 + 15);
    const repeated = stepMarketIntraday(once, 9 * 60 + 19);
    expect(repeated.goldSpot).toBe(once.goldSpot);
    expect(repeated.silverSpot).toBe(once.silverSpot);
  });

  it('tek sıçrama ile ardışık çağrılar aynı sonucu verir ve gün içi bandı aşmaz', () => {
    const open = createMarketForDay(123, 1);
    let sequential = open;
    for (let minute = 9 * 60 + 15; minute <= 12 * 60; minute += 15) {
      sequential = stepMarketIntraday(sequential, minute);
    }
    const direct = stepMarketIntraday(open, 12 * 60);
    expect(direct.goldSpot).toBe(sequential.goldSpot);
    expect(Math.abs(direct.goldSpot / open.dayOpen!.goldSpot - 1)).toBeLessThanOrEqual(
      MARKET_DAILY_CAP + 0.00001,
    );
  });
});
