import { bullionMeta } from '@data/bullion';
import type { InventoryPosition, ItemInstance, CustomerDemand } from './types';
import { toMg, fromMg } from './v5-rules';

export function poolForTemplate(id: string): CustomerDemand['poolId'] {
  if (/^gram_gold_(1|2_5|5|10|20|50|100)$/.test(id)) return '24K_GRAM_GOLD_POOL';
  if (/^investment_bangle_22k_(10|20|30|40|50|60|70|80|90|100)$/.test(id)) return '22K_INVESTMENT_BANGLE_POOL';
  if (id === 'quarter_gold') return 'QUARTER_GOLD_POOL';
  return undefined;
}
export function poolForItem(item: ItemInstance): CustomerDemand['poolId'] {
  const pool = poolForTemplate(item.templateId);
  if (!pool || !item.truth || item.truth.hiddenFlaws.length ||
      (pool !== 'QUARTER_GOLD_POOL' && item.truth.craftsmanship !== 0) || item.truth.stoneData.extractableValue > 0) return undefined;
  const meta = bullionMeta(item.templateId)!;
  // Legacy .916 investment bangles/quarters are valid migration inputs.
  const purityOk = Math.abs(item.truth.actualPurity - meta.unitPurity) < .0002 ||
    (pool !== '24K_GRAM_GOLD_POOL' && Math.abs(item.truth.actualPurity - .916) < .0002);
  return purityOk ? pool : undefined;
}
export const poolUnitGrams = (pool: CustomerDemand['poolId']): number => pool === '22K_INVESTMENT_BANGLE_POOL' ? 10 : 1;
export function validQuantity(position: InventoryPosition, quantity: number): boolean {
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > position.quantity) return false;
  return position.poolId === '24K_GRAM_GOLD_POOL'
    ? Math.abs(fromMg(toMg(quantity)) - quantity) < 1e-9
    : Number.isInteger(quantity);
}

/** Pure, idempotent migration; cost/value totals preserved, crafted objects untouched. */
export function consolidatePools(inventory: InventoryPosition[], source: Record<string, ItemInstance>) {
  const items = { ...source };
  const result: InventoryPosition[] = [];
  const aliases: Record<string, { itemId: string; factor: number }> = {};
  for (const position of inventory) {
    const item = source[position.itemId];
    const pool = item && poolForItem(item);
    if (!pool || position.location === 'workshop') { result.push(position); continue; }
    const unitGrams = poolUnitGrams(pool);
    const factor = pool === 'QUARTER_GOLD_POOL' ? 1 : bullionMeta(item.templateId)!.unitWeightGrams / unitGrams;
    const mg = pool === 'QUARTER_GOLD_POOL' ? undefined : position.quantityMg ?? toMg(position.quantity * factor * unitGrams);
    const quantity = mg === undefined ? position.quantity : fromMg(mg) / unitGrams;
    const existing = result.find(p => p.poolId === pool);
    const canonicalId = existing?.itemId ?? position.itemId;
    aliases[position.itemId] = { itemId: canonicalId, factor };
    if (existing) {
      existing.quantity += quantity;
      if (mg !== undefined) {
        existing.quantityMg = (existing.quantityMg ?? 0) + mg;
        existing.quantity = fromMg(existing.quantityMg) / unitGrams;
      }
      existing.costBasis += position.costBasis;
      existing.currentValue += position.currentValue;
      existing.averageCostPerUnit = existing.costBasis / existing.quantity;
      existing.age = Math.max(existing.age, position.age);
      continue;
    }
    const templateId = pool === '24K_GRAM_GOLD_POOL' ? 'gram_gold_1' : pool === '22K_INVESTMENT_BANGLE_POOL' ? 'investment_bangle_22k_10' : 'quarter_gold';
    const meta = bullionMeta(templateId)!;
    items[canonicalId] = { ...item, templateId,
      displayName: pool === '24K_GRAM_GOLD_POOL' ? '24 Ayar Gram Altın' : pool === '22K_INVESTMENT_BANGLE_POOL' ? '22 Ayar İşçiliksiz Bilezik' : item.displayName,
      truth: { ...item.truth, grossWeight: meta.unitWeightGrams, netMetalWeight: meta.unitWeightGrams, actualPurity: meta.unitPurity },
      declared: { ...item.declared, claimedWeight: meta.unitWeightGrams },
    };
    result.push({ ...position, quantity, quantityMg: mg, poolId: pool, averageCostPerUnit: position.poolId ? position.averageCostPerUnit ?? position.costBasis / quantity : position.costBasis / quantity });
  }
  return { inventory: result, items, aliases };
}
