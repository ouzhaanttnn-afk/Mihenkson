/**
 * C1 — VİTRİN TEZİ SEÇİLDİĞİNDE MAL VİTRİNE GİRER
 *
 * Alınan her şey `backStock`a düşüyordu. Vitrin müşterisi ise YALNIZ
 * `location === 'display'` olan işçilikli ürünü hedefler (`showcaseStock`),
 * yani oyuncu işlem sırasında "Vitrin" çıkış planını seçse bile mekanik
 * kendiliğinden hiç çalışmıyordu; vitrini doldurmanın tek yolu Stok
 * ekranında satırı açıp "Vitrine Koy"a basmaktı ve bunu hiçbir yer
 * söylemiyordu.
 *
 * Alan katmanı zaten bu varsayımla yazılmış:
 *   · `thesis.ts` "Vitrin"i ancak BOŞ SLOT varken seçenek olarak sunuyor.
 *   · `applyTransaction` gelen kalemin `display` konumunu zaten taşıyor
 *     (settlement.ts · `incoming.location === 'display' ? …`).
 * Eksik olan tek halka, mağazanın kalemi `display` olarak yazmamasıydı.
 *
 * Buradaki testler o halkanın sözleşmesini korur: konum taşınır, vitrin
 * hedeflenebilir hâle gelir ve fiyat/maliyet matematiği değişmez.
 */

import { describe, expect, it } from 'vitest';
import { useGame } from '@state/gameStore';
import { spawnItem } from './item-spawn';
import { createMarketForDay } from './market';
import { applyTransaction, createLedger, type EconomyState } from './settlement';
import { showcaseStock } from './purchase';
import { isCrafted } from './customer-pricing';
import type { ItemInstance, SettlementTransaction } from './types';

const initial = useGame.getState();
const market = createMarketForDay(456, 5);

/** İşçilikli (vitrine girebilen) bir ürün. */
function crafted(id: string, location: ItemInstance['location']): ItemInstance {
  const item = spawnItem(456, 3, 'ring_18k');
  return { ...item, id, buyCost: 12_000, acquiredDay: 5, thesis: 'retail', location };
}

function economy(): EconomyState {
  return {
    store: { ...initial.store, cash: 1_000_000 },
    inventory: [],
    items: {},
    ledger: createLedger(),
    market,
  } as EconomyState;
}

const buyTx = (item: ItemInstance): SettlementTransaction => ({
  txId: `buy_${item.id}`,
  dealId: `deal_${item.id}`,
  day: 5,
  cashDelta: -(item.buyCost ?? 0),
  itemsIn: [item],
  itemsOut: [],
  trustDelta: 0,
  reputationDelta: 0,
  xpDelta: 0,
  label: 'alım',
});

describe('C1 · vitrin yönlendirmesi', () => {
  it('test ürünü gerçekten işçiliklidir — yoksa aşağıdakiler boşuna geçerdi', () => {
    expect(isCrafted(crafted('x', 'backStock'))).toBe(true);
  });

  it('mutabakat gelen kalemin display konumunu hem kaleme hem pozisyona taşır', () => {
    const item = crafted('ring_display', 'display');
    const out = applyTransaction(economy(), buyTx(item));

    expect(out.applied).toBe(true);
    expect(out.state.items[item.id]?.location).toBe('display');
    expect(out.state.inventory.find((p) => p.itemId === item.id)?.location).toBe('display');
  });

  it('vitrine giren işçilikli ürün vitrin müşterisi tarafından hedeflenebilir', () => {
    const item = crafted('ring_target', 'display');
    const out = applyTransaction(economy(), buyTx(item));

    const targets = showcaseStock(out.state.inventory, out.state.items);
    expect(targets.map((p) => p.itemId)).toContain(item.id);
  });

  it('ESKİ DAVRANIŞ: arka stoğa düşen aynı ürün hedeflenemez — kırılan halka buydu', () => {
    const item = crafted('ring_back', 'backStock');
    const out = applyTransaction(economy(), buyTx(item));

    expect(out.state.items[item.id]?.location).toBe('backStock');
    expect(showcaseStock(out.state.inventory, out.state.items)).toHaveLength(0);
  });

  it('konum maliyet ve nakit matematiğini değiştirmez', () => {
    const onDisplay = applyTransaction(economy(), buyTx(crafted('a', 'display')));
    const inBack = applyTransaction(economy(), buyTx(crafted('b', 'backStock')));

    expect(onDisplay.state.store.cash).toBe(inBack.state.store.cash);
    expect(onDisplay.state.inventory[0]?.costBasis).toBe(inBack.state.inventory[0]?.costBasis);
    expect(onDisplay.state.inventory[0]?.currentValue).toBe(inBack.state.inventory[0]?.currentValue);
  });

  it('vitrin kapasitesi mağaza tarafında sayılır; alan katmanı slot uydurmaz', () => {
    // Mağaza yerleştirmeden önce dolu slotları sayar (gameStore · settleLine).
    // Burada yalnız sayacın kaynağını sabitliyoruz: kapasite `store.displaySlots`.
    expect(initial.store.displaySlots).toBeGreaterThan(0);
  });
});
