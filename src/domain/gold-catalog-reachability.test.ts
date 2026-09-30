import { describe, expect, it } from 'vitest';
import { BULLION_META, BULK_BULLION_CATALOG, RETAIL_BULLION_CATALOG, bullionMeta } from '@data/bullion';
import { useGame } from '@state/gameStore';
import { customerSupplySuggestion } from '@ui/stock-guidance';
import { spawnItem, templatesForTier } from './item-spawn';
import { createMarketForDay } from './market';
import { dayCharacter } from './intent';
import { consolidatePools, poolForItem, poolForTemplate } from './stock-pools';
import { availablePoolSupply, maxPoolSupplyQuantity, POOL_SUPPLY, poolSupplyItem, poolSupplyQuote } from './pool-supply';
import { channelForDemand, matchDemand, offerableStock, spawnDemand, VIP_BULK } from './purchase';
import { creditLimit, usedLimit } from './wholesaler';
import type { CustomerDemand, InventoryPosition, ItemInstance, StoreState } from './types';

const market = { ...createMarketForDay(456, 5), goldSpot: 7100 };
const initialStore = useGame.getState().store;
const character = { ...dayCharacter(456, 5, market), volumeScale: 1 };
const coins = ['quarter_gold', 'half_gold', 'full_gold', 'republic_gold', 'ata_gold'];

function cleanSpawn(templateId: string, start = 0): ItemInstance {
  const purity = bullionMeta(templateId)!.unitPurity;
  for (let index = start; index < start + 1000; index++) {
    const item = spawnItem(456, index, templateId);
    if (!item.truth.hiddenFlaws.length && Math.abs(item.truth.actualPurity - purity) < .0002) {
      return { ...item, buyCost: 10_000, acquiredDay: 1, location: 'backStock' };
    }
  }
  throw new Error(`No genuine ${templateId} sample`);
}
function position(item: ItemInstance, quantity = 1): InventoryPosition {
  return { itemId: item.id, quantity, costBasis: item.buyCost! * quantity, currentValue: 12_000 * quantity,
    age: 2, demand: 'steady', location: 'backStock', thesis: null, expectedExitValues: {} };
}
function demand(templateId: string, quantity = 1): CustomerDemand {
  return { templateId, poolId: poolForTemplate(templateId), quantity, minQuantity: quantity,
    acceptsPartial: false, isBulk: templateId === 'small_ingot', wantsBullion: true,
    families: [], summary: '', alternativesLabel: '' };
}
function store(overrides: Partial<StoreState> = {}): StoreState {
  return { ...initialStore, cash: 100_000_000, storeTier: 3, reputation: 65,
    supplier: { ...initialStore.supplier, trust: 65, openInvoices: [] }, ...overrides };
}

describe('complete gold catalog reachability', () => {
  it('every customer-channel bullion product has a canonical supply family', () => {
    for (const meta of BULLION_META) {
      const pool = poolForTemplate(meta.templateId);
      expect(pool, meta.templateId).toBeDefined();
      expect(POOL_SUPPLY.some(product => poolForTemplate(product.templateId) === pool), meta.templateId).toBe(true);
    }
  });
  it('Tam Altın returns to seller inflow and all customer catalogs', () => {
    expect(templatesForTier(1).map(template => template.id)).toContain('full_gold');
    expect(RETAIL_BULLION_CATALOG).toContain('full_gold');
    expect(BULK_BULLION_CATALOG).toContain('full_gold');
  });
  it.each(coins)('raw genuine %s pools its normal mint workmanship losslessly', templateId => {
    const first = cleanSpawn(templateId), second = cleanSpawn(templateId, 1000);
    expect(first.truth.craftsmanship).toBeGreaterThan(0);
    const source = { [first.id]: first, [second.id]: second };
    const pooled = consolidatePools([position(first, 2), position(second, 3)], source);
    expect(pooled.inventory).toHaveLength(1);
    expect(pooled.inventory[0]).toMatchObject({ poolId: poolForTemplate(templateId), quantity: 5, costBasis: 50_000, currentValue: 60_000 });
    expect(consolidatePools(pooled.inventory, pooled.items).inventory).toEqual(pooled.inventory);
    expect(matchDemand(demand(templateId), first)).toBe('exact');
    expect(customerSupplySuggestion(demand(templateId, 7), [position(first, 5)], source)).toMatchObject({ held: 5, quantity: 2 });
  });
  it.each([...coins, 'small_ingot'])('%s rejects defects, false purity and unrelated items', templateId => {
    const item = cleanSpawn(templateId);
    const wrongPurity = { ...item, truth: { ...item.truth, actualPurity: .585 } };
    const flawed: ItemInstance = { ...item, truth: { ...item.truth, hiddenFlaws: [{ kind: 'filled', severity: .25,
      readableSignal: { id: 'filled-weight', label: 'Ağırlık, hacme göre fazla geliyor', strength: 'noticeable' } }] } };
    for (const bad of [wrongPurity, flawed]) {
      expect(poolForItem(bad)).toBeUndefined();
      expect(matchDemand(demand(templateId), bad)).toBe('off');
      expect(offerableStock(demand(templateId), [position(bad)], { [bad.id]: bad })).toEqual([]);
    }
    expect(matchDemand(demand(templateId), poolSupplyItem('gram_gold_1'))).toBe('off');
  });
  it('empty or workshop stock never reports held saleable quantity', () => {
    const item = cleanSpawn('full_gold');
    const source = { [item.id]: item };
    expect(offerableStock(demand('full_gold'), [position(item, 0)], source)).toEqual([]);
    expect(customerSupplySuggestion(demand('full_gold', 2), [{ ...position(item, 5), location: 'workshop' }], source))
      .toMatchObject({ held: 0, quantity: 2 });
  });
  it('never merges a stale invalid or workshop pool row or mutates source positions', () => {
    const invalid = cleanSpawn('full_gold'), incoming = cleanSpawn('full_gold', 1000);
    const bad = { ...invalid, truth: { ...invalid.truth, actualPurity: .585 } };
    for (const first of [position(bad, 2), { ...position(invalid, 2), location: 'workshop' as const }]) {
      const source = { [invalid.id]: first.location === 'workshop' ? invalid : bad, [incoming.id]: incoming };
      const inventory = [{ ...first, poolId: poolForTemplate('full_gold') }, position(incoming, 3)];
      const before = structuredClone(inventory);
      const pooled = consolidatePools(inventory, source);
      expect(pooled.inventory).toHaveLength(2);
      expect(pooled.inventory.map(row => row.quantity)).toEqual([2, 3]);
      expect(inventory).toEqual(before);
    }
  });
  it('small ingot is tier-gated, sourced, matched and priced only for bulk customers', () => {
    expect(RETAIL_BULLION_CATALOG).not.toContain('small_ingot');
    expect(BULK_BULLION_CATALOG).toContain('small_ingot');
    expect(availablePoolSupply(1).map(product => product.templateId)).not.toContain('small_ingot');
    expect(availablePoolSupply(2).map(product => product.templateId)).toContain('small_ingot');
    expect(poolSupplyQuote('small_ingot', 1, market, store({ storeTier: 1 }))).toBeNull();
    expect(maxPoolSupplyQuantity('small_ingot', market, store({ storeTier: 1 }))).toBe(0);
    const shop = store(), seen = new Set<string>();
    for (let index = 0; index < 400; index++) {
      const retail = spawnDemand(456, index, 'investor', { ...character, bulkOrderChance: 0 }, 3, shop, market);
      const earlyBulk = spawnDemand(456, index, 'investor', { ...character, bulkOrderChance: 1 }, 1, shop, market);
      const bulk = spawnDemand(456, index, 'investor', { ...character, bulkOrderChance: 1 }, 2, shop, market);
      expect(retail.templateId).not.toBe('small_ingot');
      expect(earlyBulk.templateId).not.toBe('small_ingot');
      seen.add(bulk.templateId!);
    }
    expect(seen).toContain('small_ingot');
    const item = poolSupplyItem('small_ingot'), request = demand('small_ingot');
    expect(poolForItem(item)).toBe('SMALL_INGOT_POOL');
    expect(poolSupplyQuote('small_ingot', 2, market, shop)).not.toBeNull();
    expect(matchDemand(request, item)).toBe('exact');
    expect(matchDemand({ ...request, isBulk: false }, item)).toBe('off');
    expect(channelForDemand(request)).toBe('bulkCustomer');
  });
});

describe('mature VIP bulk gram requests', () => {
  const bulkCharacter = { ...character, bulkOrderChance: 1 };
  it('reaches 1000g without altering deterministic requests or exceeding real supply budget', () => {
    const shop = store(), grams: number[] = [];
    const budget = .42 * (shop.cash + Math.max(0, creditLimit(shop) - usedLimit(shop.supplier)));
    for (let index = 0; index < 240; index++) {
      const first = spawnDemand(456, index, 'investor', bulkCharacter, 3, shop, market);
      expect(spawnDemand(456, index, 'investor', bulkCharacter, 3, shop, market)).toEqual(first);
      if (first.poolId !== '24K_GRAM_GOLD_POOL') continue;
      grams.push(first.quantity);
      expect(first.quantity).toBeLessThanOrEqual(1000);
      expect(poolSupplyQuote('gram_gold_1', first.quantity, market, shop)!.totalPrice).toBeLessThanOrEqual(budget);
    }
    expect(grams).toContain(1000);
    expect(grams).toContain(250);
    expect(grams).toContain(500);
  });
  it.each(['tier', 'reputation', 'supplier'] as const)('does not activate below the %s threshold', threshold => {
    const shop = store();
    if (threshold === 'tier') shop.storeTier = 2;
    if (threshold === 'reputation') shop.reputation = VIP_BULK.minReputation - 1;
    if (threshold === 'supplier') shop.supplier = { ...shop.supplier, trust: VIP_BULK.minSupplierTrust - 1 };
    const quantities: number[] = [];
    for (let index = 0; index < 240; index++) {
      const request = spawnDemand(456, index, 'investor', bulkCharacter, shop.storeTier, shop, market);
      if (request.poolId === '24K_GRAM_GOLD_POOL') quantities.push(request.quantity);
    }
    expect(quantities).not.toContain(1000);
    expect(Math.max(...quantities)).toBeLessThanOrEqual(600);
  });
  it('clamps the VIP quantity to existing cash plus unused credit, without mutating either', () => {
    const shop = store({ cash: 5_000_000 });
    const before = structuredClone(shop);
    const budget = .42 * (shop.cash + Math.max(0, creditLimit(shop) - usedLimit(shop.supplier)));
    const quantities: number[] = [];
    for (let index = 0; index < 240; index++) {
      const request = spawnDemand(456, index, 'investor', bulkCharacter, 3, shop, market);
      if (request.poolId !== '24K_GRAM_GOLD_POOL') continue;
      quantities.push(request.quantity);
      expect(poolSupplyQuote('gram_gold_1', request.quantity, market, shop)!.totalPrice).toBeLessThanOrEqual(budget);
    }
    expect(quantities).not.toContain(1000);
    expect(shop).toEqual(before);
  });
});
