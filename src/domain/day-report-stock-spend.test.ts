/**
 * C6 — GÜN RAPORU 1. GÜNDE FELAKET GİBİ OKUNUYORDU
 *
 * Rapor "Kasa değişimi −77.336 ₺" diyordu; o paranın 76.136 ₺'si aslında
 * stoğa dönmüştü. Hiçbir satır bunu söylemediği için ilk günü normal oynayan
 * oyuncu batmış gibi görünüyordu.
 *
 * Düzeltme AYRI BİR DEFTER TUTMUYOR: sayı günün kendi hareketlerinden türüyor
 * — içeri mal giren ve kasayı eksilten işlemler. Bu testler tam olarak o
 * türetmenin sınırlarını sabitliyor; özellikle "kasadan çıkan her para stoğa
 * gitmiş sayılmaz" kuralını.
 */

import { describe, expect, it } from 'vitest';
import { applyTransaction, closeDay, createLedger, type EconomyState } from './settlement';
import { createMarketForDay } from './market';
import { poolSupplyItem, poolSupplyQuote } from './pool-supply';
import type { SettlementTransaction } from './types';
import { useGame } from '@state/gameStore';

function baseState(): EconomyState {
  const s = useGame.getState();
  return {
    ...s,
    store: { ...s.store, cash: 1_000_000, dailyOverhead: 1200, personnelCount: 0, backStockSlots: 40 },
    market: createMarketForDay(s.seed, 1),
    ledger: createLedger(),
    inventory: [],
    items: {},
  } as unknown as EconomyState;
}

/** Toptancıdan çeyrek alımı — kasadan para çıkar, içeri MAL girer. */
function stockIntake(state: EconomyState, quantity: number, txId = 'intake'): SettlementTransaction {
  const total = poolSupplyQuote('quarter_gold', quantity, state.market!, state.store)!.totalPrice;
  return {
    txId, dealId: txId, day: 1, cashDelta: -total, poolPurchase: { quantity },
    itemsIn: [{ ...poolSupplyItem('quarter_gold'), id: `${txId}-item`, location: 'backStock', buyCost: total / quantity }],
    itemsOut: [], trustDelta: 0, reputationDelta: 0, xpDelta: 0, label: txId,
  };
}

describe('C6 · kasa değişiminin stoğa giden kısmı', () => {
  it('stok alımı raporda ayrı görünür', () => {
    const state = baseState();
    const tx = stockIntake(state, 10);
    const bought = applyTransaction(state, tx);
    expect(bought.applied).toBe(true);

    const { report } = closeDay(bought.state, 1);

    expect(report.stockPurchaseSpend).toBe(-tx.cashDelta);
    // Kasa değişimi hem malı hem günlük gideri taşır; stok payı ondan küçüktür.
    expect(report.netCashChange).toBeLessThan(report.stockPurchaseSpend!);
  });

  it('MAL GİRMEYEN nakit çıkışı stok sayılmaz — ayrımın kendisi bu', () => {
    const state = baseState();
    const moved = applyTransaction(state, {
      txId: 'cash-out', dealId: 'cash-out', day: 1, cashDelta: -10_000,
      itemsIn: [], itemsOut: [], trustDelta: 0, reputationDelta: 0, xpDelta: 0, label: 'nakit hareketi',
    });

    const { report } = closeDay(moved.state, 1);

    expect(report.netCashChange).toBeLessThan(0);
    expect(report.stockPurchaseSpend).toBe(0);
  });

  it('hiç alım yoksa satır çıkmaz (sıfır)', () => {
    const { report } = closeDay(baseState(), 1);

    expect(report.stockPurchaseSpend).toBe(0);
  });

  it('birden çok alım toplanır', () => {
    const state = baseState();
    const first = stockIntake(state, 4, 'intake-1');
    const afterFirst = applyTransaction(state, first).state;
    const second = stockIntake(afterFirst, 6, 'intake-2');
    const afterSecond = applyTransaction(afterFirst, second).state;

    const { report } = closeDay(afterSecond, 1);

    expect(report.stockPurchaseSpend).toBe(-(first.cashDelta + second.cashDelta));
  });

  it('gün sonu gideri stok payına karışmaz — kapanış işleminde mal yok', () => {
    const state = baseState();
    const bought = applyTransaction(state, stockIntake(state, 10)).state;

    const { report } = closeDay(bought, 1);

    // Aradaki fark tam olarak günlük giderdir: kasa = stok + gider.
    expect(report.netCashChange).toBe(-(report.stockPurchaseSpend! + report.overhead));
  });

  it('önceki günün alımı bugünün raporuna yazılmaz', () => {
    const state = baseState();
    const dun = applyTransaction(state, { ...stockIntake(state, 10), txId: 'dun', dealId: 'dun', day: 1 }).state;
    const bugun = { ...dun, market: { ...dun.market!, day: 2 } } as EconomyState;

    const { report } = closeDay(bugun, 2);

    expect(report.day).toBe(2);
    expect(report.stockPurchaseSpend).toBe(0);
  });
});
