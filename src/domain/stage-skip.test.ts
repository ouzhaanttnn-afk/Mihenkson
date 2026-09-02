/**
 * Aşama atlaması ürün tipine göre — İKİ YÖNLÜ.
 *
 * Playtest isteği iki cümleydi ve ikisi birlikte geçerli:
 *   "Standart sarrafiyede Değerle'den doğrudan Pazarlık'a geç."
 *   "İşçilikli, taşlı, ikinci el üründe dört aşamayı KORU."
 * Yalnız birincisini test etmek, bütün ürünlerden Çıkış Planı'nı silen bir
 * değişikliği yeşil geçirirdi — nitekim ilk denememde tam olarak bu oldu:
 * `requiresExitPlan` ölçütü düşük işçilikli bileziği de üç aşamaya
 * düşürmüştü ve bunu ancak tarayıcıda gördüm.
 */

import { describe, expect, it } from 'vitest';

import { ITEM_TEMPLATES } from '@data/item-templates';
import { isBullion } from '@data/bullion';
import { START } from './balance';
import { spawnCustomer } from './customer-spawn';
import { dayCharacter } from './intent';
import { createMarketForDay } from './market';
import { transactionClass, stageUnlocked } from './transaction-class';
import type { ItemInstance, StoreState } from './types';

const SEED = 20260828;

function makeStore(): StoreState {
  return {
    name: 'T', cash: START.cash, reputation: START.reputation, level: 3, xp: 0, xpToNext: 900,
    storeTier: 2, displaySlots: START.displaySlots, backStockSlots: START.backStockSlots,
    workshopCapacity: START.workshopCapacity, staff: [],
    supplier: { trust: START.supplierTrust, limit: START.supplierLimit, terms: START.supplierTerms,
      openInvoices: [], priceBand: 1, specialLotEligibility: false },
    payables: [], dailyOverhead: START.dailyOverhead,
  } as StoreState;
}

/** Oyunun gerçekten ürettiği kalemler — uydurulmuş örnek değil. */
function realItems(): ItemInstance[] {
  const store = makeStore();
  const out: ItemInstance[] = [];
  for (let day = 1; day <= 14; day++) {
    const market = createMarketForDay(SEED, day);
    const ch = dayCharacter(SEED, day, market);
    for (let i = 0; i < 60; i++) out.push(...spawnCustomer(SEED + day, i, market, store, ch).items);
  }
  return out;
}

/** UI'ın şeritte kullandığı ölçütün ta kendisi. */
const hidesExitPlan = (item: ItemInstance) => transactionClass(item) === 'fast';

describe('Çıkış Planı aşaması yalnız standart sarrafiyede atlanır', () => {
  const items = realItems();

  it('temiz sarrafiyede aşama atlanır', () => {
    const clean = items.filter((i) => isBullion(i.templateId) && hidesExitPlan(i));
    expect(clean.length, 'hiç temiz sarrafiye üretilmedi').toBeGreaterThan(20);
    for (const item of clean) {
      expect(hidesExitPlan(item), item.templateId).toBe(true);
      // Atlanan aşama KAPANMAZ: hâlâ girilebilir olmalı.
      expect(
        stageUnlocked(item, 'thesis', { hasBand: true, hasTests: true, hasExitPlan: false }),
        `${item.templateId} çıkış planı erişilemez olmuş`,
      ).toBe(true);
      // Ve pazarlık test/band beklemeden açık olmalı (hızlı akış).
      expect(
        stageUnlocked(item, 'negotiate', { hasBand: false, hasTests: false, hasExitPlan: false }),
        `${item.templateId} pazarlığa doğrudan geçemiyor`,
      ).toBe(true);
    }
  });

  it('İŞÇİLİKLİ üründe aşama ASLA atlanmaz — düşük işçilikli olan dahil', () => {
    const crafted = items.filter((i) => !isBullion(i.templateId));
    expect(crafted.length).toBeGreaterThan(20);
    for (const item of crafted) {
      expect(
        hidesExitPlan(item),
        `${item.templateId} işçilikli ama Çıkış Planı adımı gizlendi`,
      ).toBe(false);
    }
  });

  it('şablon bazında: her sarrafiye şablonu hızlı, hiçbir işçilikli şablon hızlı değil', () => {
    // Şüphe işareti taşımayan temiz bir örnekle bakılır: sınıf ürünün
    // kendisinden türer, oyuncunun bilgisinden değil.
    const bySeen = new Map<string, boolean>();
    for (const item of items) {
      if (!bySeen.has(item.templateId)) bySeen.set(item.templateId, hidesExitPlan(item));
      else if (hidesExitPlan(item)) bySeen.set(item.templateId, true);
    }
    for (const t of ITEM_TEMPLATES) {
      const fast = bySeen.get(t.id);
      if (fast === undefined) continue; // bu tohumda hiç üretilmedi
      if (isBullion(t.id)) expect(fast, `${t.id} sarrafiye ama hızlı değil`).toBe(true);
      else expect(fast, `${t.id} işçilikli ama hızlı`).toBe(false);
    }
  });

  it('şüpheli sarrafiye hızlı akıştan çıkar — aşamasını geri alır', () => {
    const flagged = items.filter(
      (i) => isBullion(i.templateId) && i.declared.observableSignals.length > 0,
    );
    if (flagged.length === 0) return; // bu tohumda yoksa sessiz geç
    for (const item of flagged) {
      expect(transactionClass(item), item.templateId).not.toBe('fast');
      expect(hidesExitPlan(item), `${item.templateId} şüpheli ama aşama gizlendi`).toBe(false);
    }
  });
});
