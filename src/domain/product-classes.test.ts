/**
 * Ürün sınıfı → izin verilen özellik / test / servis eşlemesi.
 *
 * Kaynak: İşlem Akışı ve Terminoloji Ara Düzeltmesi v1.1 §3 — "Çeyrek altına
 * yüzük ölçüsü, gram altına taş kontrolü, standart sarrafiyeye alakasız
 * kondisyon/ölçü alanları" gösterilmemelidir.
 *
 * Bu dosya NEGATİF testlerle yazılmıştır: hangi alanın çıktığı değil, hangi
 * alanın ASLA çıkmadığı sınanır. Whitelist'in işi budur.
 */

import { describe, expect, it } from 'vitest';
import { ITEM_TEMPLATES } from '@data/item-templates';
import { productClassOf, rulesFor } from '@data/product-classes';
import { SERVICE_TYPES } from '@data/service-types';
import { TEST_TOOLS } from '@data/tools';
import { START } from './balance';
import { spawnCustomer } from './customer-spawn';
import { dayCharacter } from './intent';
import { spawnItem } from './item-spawn';
import { createMarketForDay } from './market';
import type { StoreState } from './types';
import { diagnose, isServiceable } from './service';
import {
  hasSuspicionSignal,
  isFieldRelevant,
  isToolRelevant,
  relevantFields,
  relevantTools,
} from './transaction-class';

const SEED = 20260828;

/** Standart sarrafiyenin tamamı — §3'ün adıyla saydığı ürünler. */
const BULLION_IDS = [
  'gram_gold_1',
  'gram_gold_2_5',
  'gram_gold_5',
  'gram_gold_10',
  'gram_gold_20',
  'gram_gold_50',
  'gram_gold_100',
  'quarter_gold',
  'half_gold',
  'full_gold',
  'republic_gold',
  'ata_gold',
  'small_ingot',
];

/** Aynı şablonu birden çok tohumla dener: kondisyon/kusur varyantları kaçmasın. */
function samples(templateId: string, count = 12) {
  return Array.from({ length: count }, (_, i) => spawnItem(SEED, i * 7 + 1, templateId));
}

// ===========================================================================
// Sınıflandırma
// ===========================================================================

describe('Her şablon tam olarak bir ürün sınıfına düşer', () => {
  it('sınıf çözümlemesi hiçbir şablonda boş kalmaz', () => {
    for (const t of ITEM_TEMPLATES) {
      const cls = productClassOf(t);
      expect(cls, t.id).toBeTruthy();
      expect(rulesFor(t).id).toBe(cls);
    }
  });

  it('sarrafiye külçe ve ziynet olarak ayrılır', () => {
    expect(productClassOf({ family: 'bullion', silhouette: 'bar' })).toBe('bullionBar');
    expect(productClassOf({ family: 'bullion', silhouette: 'coin' })).toBe('bullionCoin');
  });

  it('yüzük silüeti aile fark etmeksizin yüzük sınıfıdır', () => {
    for (const id of ['ring_14k', 'ring_18k', 'silver_ring', 'stone_ring_entry']) {
      const t = ITEM_TEMPLATES.find((x) => x.id === id)!;
      expect(productClassOf(t), id).toBe('ring');
    }
  });
});

// ===========================================================================
// §3 — sarrafiyede alakasız alan yok
// ===========================================================================

describe('§3 — standart sarrafiyede alakasız özellik ve test çıkmaz', () => {
  it('hiçbir sarrafiye ürününde taş alanı görünmez', () => {
    for (const id of BULLION_IDS) {
      for (const item of samples(id)) {
        expect(isFieldRelevant(item, 'stone'), id).toBe(false);
        expect(relevantFields(item), id).not.toContain('stone');
      }
    }
  });

  it('hiçbir sarrafiye ürününde lup / taş kontrol aracı rayda belirmez', () => {
    const loupe = TEST_TOOLS.find((t) => t.id === 'loupe')!;
    for (const id of BULLION_IDS) {
      for (const item of samples(id)) {
        expect(isToolRelevant(item, loupe), id).toBe(false);
        expect(relevantTools(item).map((t) => t.id), id).not.toContain('loupe');
      }
    }
  });

  it('sarrafiyede ağırlık ve ayar korunur — hızlı akış doğrulamayı yasaklamaz', () => {
    for (const id of BULLION_IDS) {
      const item = spawnItem(SEED, 42, id);
      expect(relevantFields(item), id).toContain('weight');
      expect(relevantFields(item), id).toContain('purity');
      const toolIds = relevantTools(item).map((t) => t.id);
      expect(toolIds, id).toContain('scale');
      expect(toolIds, id).toContain('touchstone');
    }
  });

  it('temiz ve şüphesiz sarrafiyede kondisyon ve iç yapı satırı çizilmez', () => {
    let checked = 0;
    for (const id of BULLION_IDS) {
      for (const item of samples(id)) {
        // Gözle görülür sinyali olan sarrafiye §4 gereği kontrollü işleme
        // düşer ve iç yapı orada gerçekten ölçülecek bir şeydir.
        if (hasSuspicionSignal(item)) continue;
        expect(relevantFields(item), id).toEqual(['weight', 'purity']);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });
});

// ===========================================================================
// §3 — servis tarafı: raporlanan hata
// ===========================================================================

describe('§3 — yüzük ölçüsü yalnız yüzükte', () => {
  it('hiçbir sarrafiye ürününe yüzük ölçüsü servisi önerilmez', () => {
    for (const id of BULLION_IDS) {
      for (const item of samples(id)) {
        // Tüm seviyeler: kilit açıldıkça sızmadığını da görelim.
        for (const level of [1, 3, 5, 9]) {
          expect(diagnose(item, level).availableTypeIds, `${id}@${level}`).not.toContain('ringSize');
        }
      }
    }
  });

  it('standart sarrafiye hiçbir atölye işi almaz', () => {
    for (const id of BULLION_IDS) {
      for (const item of samples(id)) {
        expect(isServiceable(item), id).toBe(false);
        expect(diagnose(item, 9).availableTypeIds, id).toEqual([]);
      }
    }
  });

  it('bilezik, kolye, zincir ve objeye yüzük ölçüsü önerilmez', () => {
    const ids = [
      'bracelet_22k_thin',
      'bracelet_22k_burma',
      'set_piece_22k',
      'plated_bangle',
      'necklace_14k',
      'necklace_18k',
      'chain_14k',
      'silver_chain',
      'earring_14k',
      'silver_object',
      'vintage_brooch',
      'collector_coin',
    ];
    for (const id of ids) {
      for (const item of samples(id, 6)) {
        expect(diagnose(item, 9).availableTypeIds, id).not.toContain('ringSize');
      }
    }
  });

  it('yüzükte ölçü servisi kullanılabilir kalır', () => {
    const offered = samples('ring_14k', 20).some((item) =>
      diagnose(item, 9).availableTypeIds.includes('ringSize'),
    );
    expect(offered).toBe(true);
  });

  it('bilezikte taş alanı ve taş sıkıştırma servisi yoktur', () => {
    for (const id of ['bracelet_22k_thin', 'bracelet_22k_burma', 'plated_bangle']) {
      for (const item of samples(id, 6)) {
        expect(relevantFields(item), id).not.toContain('stone');
        expect(diagnose(item, 9).availableTypeIds, id).not.toContain('stoneSet');
      }
    }
  });
});

// ===========================================================================
// Whitelist bütünlüğü
// ===========================================================================

describe('Whitelist bütünlüğü', () => {
  it('her sınıfın test ve servis kimlikleri gerçek tanımlara işaret eder', () => {
    const toolIds = new Set(TEST_TOOLS.map((t) => t.id));
    const serviceIds = new Set(SERVICE_TYPES.map((t) => t.id));
    for (const t of ITEM_TEMPLATES) {
      const rules = rulesFor(t);
      for (const id of rules.tests) expect(toolIds.has(id), `${rules.id}/${id}`).toBe(true);
      for (const id of rules.services) expect(serviceIds.has(id), `${rules.id}/${id}`).toBe(true);
    }
  });

  it('gösterilen hiçbir alan sınıf whitelistinin dışına çıkamaz', () => {
    for (const t of ITEM_TEMPLATES) {
      const allowed = rulesFor(t).attributes;
      for (const item of samples(t.id, 4)) {
        for (const field of relevantFields(item)) {
          expect(allowed, `${t.id}/${field}`).toContain(field);
        }
      }
    }
  });

  it('önerilen hiçbir servis sınıf whitelistinin dışına çıkamaz', () => {
    for (const t of ITEM_TEMPLATES) {
      const allowed = rulesFor(t).services;
      for (const item of samples(t.id, 4)) {
        for (const typeId of diagnose(item, 9).availableTypeIds) {
          expect(allowed, `${t.id}/${typeId}`).toContain(typeId);
        }
      }
    }
  });

  it('gösterilen hiçbir araç sınıf whitelistinin dışına çıkamaz', () => {
    for (const t of ITEM_TEMPLATES) {
      const allowed = rulesFor(t).tests;
      for (const item of samples(t.id, 4)) {
        for (const tool of relevantTools(item)) {
          expect(allowed, `${t.id}/${tool.id}`).toContain(tool.id);
        }
      }
    }
  });
});

// ===========================================================================
// Servis niyetli müşteri havuzu
// ===========================================================================

describe('Servis niyetli müşteri, atölye işi almayan ürünle gelmez', () => {
  function makeStore(level: number, tier: StoreState['storeTier']): StoreState {
    return {
      name: 'Test',
      cash: START.cash,
      reputation: START.reputation,
      level,
      xp: 0,
      xpToNext: 580,
      storeTier: tier,
      displaySlots: START.displaySlots,
      backStockSlots: START.backStockSlots,
      workshopCapacity: START.workshopCapacity,
      staff: [],
      supplier: {
        trust: START.supplierTrust,
        limit: START.supplierLimit,
        terms: START.supplierTerms,
        openInvoices: [],
        priceBand: 1,
        specialLotEligibility: false,
      },
      payables: [],
      dailyOverhead: START.dailyOverhead,
    };
  }

  it('hiçbir servis müşterisinin elinde sarrafiye çıkmaz', () => {
    let serviceVisits = 0;

    for (const [level, tier] of [
      [1, 1],
      [3, 2],
      [6, 3],
    ] as const) {
      const store = makeStore(level, tier);
      for (let day = 1; day <= 12; day++) {
        const market = createMarketForDay(SEED, day);
        const character = dayCharacter(SEED, day, market);
        for (let i = 0; i < 40; i++) {
          const c = spawnCustomer(SEED + day, i, market, store, character);
          if (c.customer.intent !== 'service') continue;
          serviceVisits++;
          for (const item of c.items) {
            // Elinde iş alınamayacak bir ürünle gelseydi "Tanıla" ekranında
            // uygulanabilir tek bir servis bulunmaz, akış kilitlenirdi.
            expect(isServiceable(item), item.templateId).toBe(true);
            expect(diagnose(item, 9).availableTypeIds.length, item.templateId).toBeGreaterThan(0);
          }
        }
      }
    }

    // Ölçüm gerçekten yapıldı mı — boş döngü yeşil test değildir.
    expect(serviceVisits).toBeGreaterThan(50);
  });
});
