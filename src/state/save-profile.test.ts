/**
 * Profilin kayıt sistemine eklenmesi — ESKİ KAYITLARI BOZMAMALI.
 *
 * Bu testin asıl işi bir REGRESYON kapısı: profil alanı SaveFile'a
 * eklendiğinde, alanı olmayan mevcut kayıtların hâlâ yüklenebildiğini ve
 * içindeki para/seviye/XP/güven/stok değerlerinin bit bit aynı kaldığını
 * kanıtlar.
 */

import { describe, expect, it } from 'vitest';

import { deserialize, serialize, type SaveFile } from './save';
import { defaultProfile } from '@domain/profile';
import { createMarketForDay, stepMarketIntraday } from '@domain/market';
import { createLedger } from '@domain/settlement';
import { emptyTelemetry } from '@domain/intent';
import { START } from '@domain/balance';
import type { GameState } from './gameStore';
import type { MarketState, StoreState } from '@domain/types';

function makeStore(): StoreState {
  return {
    name: 'MIHENKAYNAK Kuyumculuk',
    cash: 123_456, reputation: 61, level: 4, xp: 340, xpToNext: 900,
    storeTier: 2, displaySlots: START.displaySlots, backStockSlots: START.backStockSlots,
    workshopCapacity: START.workshopCapacity, staff: [],
    supplier: { trust: 73, limit: START.supplierLimit, terms: START.supplierTerms,
      openInvoices: [], priceBand: 1, specialLotEligibility: false },
    payables: [], dailyOverhead: START.dailyOverhead,
  } as StoreState;
}

function makeState(profile = defaultProfile()): GameState {
  return {
    seed: 4242, spawnCounter: 17, jobCounter: 3,
    market: { day: 6, clockMinutes: 620 },
    store: makeStore(),
    inventory: [{ itemId: 'i1', quantity: 3, costBasis: 9000, currentValue: 9600,
      age: 2, location: 'display', thesis: 'retail' }],
    items: { i1: { id: 'i1', templateId: 'quarter_gold', displayName: 'Çeyrek Altın' } },
    ledger: createLedger(),
    jobs: [], network: [], customers: { c1: { visits: 3, trust: 55 } },
    speed4xUnlocked: true, seenLessons: ['welcome', 'greet'],
    profile,
  } as unknown as GameState;
}

/** İlerlemeyi taşıyan her alanın parmak izi. */
const progressOf = (s: { store: StoreState; inventory: unknown; items: unknown;
  customers: unknown; seenLessons: unknown; speed4xUnlocked: unknown; seed: number }) =>
  JSON.stringify({
    cash: s.store.cash, level: s.store.level, xp: s.store.xp,
    reputation: s.store.reputation, supplierTrust: s.store.supplier.trust,
    storeName: s.store.name, tier: s.store.storeTier,
    inventory: s.inventory, items: s.items, customers: s.customers,
    seenLessons: s.seenLessons, speed4x: s.speed4xUnlocked, seed: s.seed,
  });

describe('profil kayıtla birlikte taşınır', () => {
  it('kaydedilen profil geri yüklenir', () => {
    const state = makeState({ jewelerName: 'Ahmet Usta', avatarId: 'male-07' });
    const back = deserialize(serialize(state));
    expect(back.profile).toEqual({ jewelerName: 'Ahmet Usta', avatarId: 'male-07' });
  });

  it('gidiş-dönüş ilerlemeyi bit bit korur', () => {
    const state = makeState({ jewelerName: 'Ahmet Usta', avatarId: 'male-07' });
    const back = deserialize(serialize(state));
    expect(progressOf(back as never)).toBe(progressOf(state as never));
  });

  it('gün içi piyasa snapshotını yeniden zar atmadan korur', () => {
    const state = makeState();
    const intraday = stepMarketIntraday(createMarketForDay(state.seed, 6), 777);

    const back = deserialize(serialize({ ...state, market: intraday }));

    expect(back.market).toEqual(intraday);
  });
});

describe('ESKİ KAYITLAR BOZULMAZ', () => {
  /** Profil alanı eklenmeden ÖNCE yazılmış bir kayıt. */
  function legacySave(): SaveFile {
    const file = serialize(makeState());
    delete (file as Partial<SaveFile>).profile;
    return file;
  }

  it('profil alanı olmayan kayıt yüklenir ve varsayılana düşer', () => {
    const back = deserialize(legacySave());
    expect(back.profile).toEqual(defaultProfile());
  });

  it('eski piyasa snapshotı fiyatı sıfırlanmadan yeni takvime taşınır', () => {
    const state = makeState();
    const snapshot = createMarketForDay(state.seed, 6);
    const file = serialize({ ...state, market: snapshot });
    const legacy = file.market as Partial<MarketState>;
    delete legacy.dayOpen;
    delete legacy.marketOpen;
    delete legacy.gapDays;
    delete legacy.lastIntradayStepIndex;

    const back = deserialize(file);
    expect(back.market.goldSpot).toBe(snapshot.goldSpot);
    expect(back.market.marketOpen).toBe(false);
    expect(back.market.dayOpen?.goldSpot).toBe(snapshot.goldSpot);
  });

  it('eski kaydın para/seviye/XP/güven/stok değerleri aynen gelir', () => {
    const original = makeState();
    const back = deserialize(legacySave());
    expect(progressOf(back as never)).toBe(progressOf(original as never));
    expect(back.store.cash).toBe(123_456);
    expect(back.store.level).toBe(4);
    expect(back.store.xp).toBe(340);
    expect(back.store.reputation).toBe(61);
    expect(back.store.supplier.trust).toBe(73);
  });

  it('bozuk profil taşıyan kayıt çökertmez, ilerlemeyi de bozmaz', () => {
    const file = serialize(makeState());
    (file as { profile?: unknown }).profile = { jewelerName: '', avatarId: 'yok-boyle-biri' };
    const back = deserialize(file);
    expect(back.profile).toEqual(defaultProfile());
    expect(progressOf(back as never)).toBe(progressOf(makeState() as never));
  });

  it('profil DEĞİŞMESİ kaydın geri kalanını değiştirmez', () => {
    // Aynı oyun durumu, yalnız profili farklı iki kayıt: ilerleme parmak
    // izleri birebir aynı olmalı. Profil değiştirmek yeni oyun başlatmaz.
    const a = deserialize(serialize(makeState({ jewelerName: 'Kuyumcu', avatarId: 'male-01' })));
    const b = deserialize(serialize(makeState({ jewelerName: 'Zeynel Usta', avatarId: 'male-11' })));
    expect(progressOf(b as never)).toBe(progressOf(a as never));
    expect(b.profile).not.toEqual(a.profile);
  });

  it('telemetri yüklemede sıfırlanır — profil bunu değiştirmez', () => {
    const back = deserialize(serialize(makeState()));
    expect(back.intentTelemetry).toEqual(emptyTelemetry());
  });
});
