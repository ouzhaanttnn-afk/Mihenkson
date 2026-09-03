/**
 * TRAFİK ÇARPANI GERÇEK OYUN DÖNGÜSÜNDE İŞLİYOR MU?
 *
 * `customer-traffic.test.ts` çarpanın kendisini ölçüyor: doğru sayıyı
 * üretiyor mu. Bu dosya BAŞKA bir soruyu soruyor ve sorusu daha zor olanı:
 * çarpan gerçekten mağazanın kapısına kadar geliyor mu? Alan yordamı doğru
 * olup ekrana/döngüye bağlanmamış olsaydı iki dosyadan yalnız bu düşerdi.
 *
 * Bu yüzden burada `customerDelayFactor` çağrılmıyor. `useGame.tick()`
 * sürülüyor, gün baştan sona oynatılıyor ve GERÇEKTEN kaç müşteri doğduğu
 * sayılıyor (`spawnCounter` — kuyruk dolsa bile her gelişte artar).
 *
 * TICK İNCE OLMAK ZORUNDA. İlk ölçümde 1 oyun dakikalık adım atıldı ve
 * sayılar saf gecikme zincirinden 2-3 müşteri düşük çıktı: bir sonraki
 * geliş O ANKİ saate göre kuruluyor, kaba adımda her müşteride 1 dakikaya
 * kadar sürüklenme birikiyor. Gerçek oyun 60 fps'te ~0,02 oyun dakikası
 * adımlar; ölçüm de ona yakın olsun diye 0,05 kullanılıyor.
 */

import { describe, expect, it } from 'vitest';

import { useGame } from '@state/gameStore';
import { createMarketForDay } from '@domain/market';
import { dayCharacter } from '@domain/intent';
import { DAY, START } from '@domain/balance';
import { customerDensity } from '@domain/customer-traffic';

const SEED = 456;
const initial = useGame.getState();

/** Bir günü baştan sona oynatır; o gün gelen müşteri sayısını döner. */
function gunuOynat(gun: number, reputation: number, storeTier: 1 | 2 | 3 | 4 | 5, rush = false): number {
  const market = createMarketForDay(SEED, gun);
  useGame.setState(
    {
      ...initial,
      seed: SEED,
      store: { ...initial.store, reputation, storeTier, cash: 10_000_000 },
      market: { ...market, clockMinutes: DAY.openMinutes },
      dayCharacter: dayCharacter(SEED, gun, market),
      queue: [],
      activeDeal: null,
      activeCustomer: null,
      profileOpen: false,
      // Karşılama ekranı açıkken saat donuyor; ölçüm için kapalı olmalı.
      profileSetupDone: true,
      spawnCounter: 0,
      nextCustomerAtMinutes: DAY.openMinutes,
      missedGuestCountToday: 0,
      customerRushUntilMinutes: rush ? DAY.closeMinutes : null,
      speed: 1,
    },
    true,
  );

  const ince = 0.05 / DAY.minutesPerRealSecond;
  let guard = 0;
  while (useGame.getState().market.clockMinutes < DAY.closeMinutes - 0.1 && guard < 200_000) {
    useGame.getState().tick(ince);
    guard += 1;
    if (useGame.getState().market.day !== gun) break;
  }
  return useGame.getState().spawnCounter;
}

/** Aynı günlerde ölç: gün karakteri (tempo) sabit kalsın, değişen tek şey itibar olsun. */
const GUNLER = [1, 2, 4, 9];
const toplam = (rep: number, tier: 1 | 2 | 3 | 4 | 5) =>
  GUNLER.reduce((sum, gun) => sum + gunuOynat(gun, rep, tier), 0);

describe('çarpan gerçekten müşteri getiriyor', () => {
  const baz = toplam(START.reputation, 1);

  it('İTİBAR 79 (×1,33) BAŞLANGIÇTAN BELİRGİN OLARAK FAZLA MÜŞTERİ GETİRİR', () => {
    expect(customerDensity({ reputation: 79, storeTier: 1 })).toBeCloseTo(1.333, 3);
    const yuksek = toplam(79, 1);

    /*
      Gerçekleşen oran nominal çarpanın biraz ALTINDA kalır ve bu bir hata
      değil: gün 600 dakikalık KAPALI bir pencere. Kapanışın hemen ardına
      düşecek müşteri o gün hiç gelmez, yani sayı her zaman aşağı yuvarlanır.
      Bant bu yüzden geniş tutuldu; test çarpanın İŞLEDİĞİNİ kanıtlıyor,
      ondalık hassasiyette bir vaat vermiyor.
    */
    const oran = yuksek / baz;
    expect(oran).toBeGreaterThan(1.2);
    expect(oran).toBeLessThan(1.4);
  });

  it('İTİBAR SIFIRDA (×0,62) BELİRGİN OLARAK AZ MÜŞTERİ GELİR', () => {
    const dusuk = toplam(0, 1);
    expect(dusuk / baz).toBeLessThan(0.75);
    expect(dusuk).toBeGreaterThan(0); // akış hiç kesilmez
  });

  it('kademe de kapıya kadar geliyor', () => {
    expect(toplam(START.reputation, 5)).toBeGreaterThan(baz);
  });

  it('CANLANDIR düğmesi gerçekten müşteri akını başlatır', () => {
    const rushsuz = gunuOynat(1, START.reputation, 1, false);
    const rushlu = gunuOynat(1, START.reputation, 1, true);
    expect(rushlu).toBeGreaterThan(rushsuz * 1.8);
  });
});
