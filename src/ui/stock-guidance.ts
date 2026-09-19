import { bullionMeta } from '@data/bullion';
import { GRAM_SUPPLY_STEP, POOL_SUPPLY } from '@domain/pool-supply';
import { offerableStock } from '@domain/purchase';
import { isMassPool, poolForItem, poolForTemplate, poolUnitGrams } from '@domain/stock-pools';
import { fromMg } from '@domain/v5-rules';
import type { CustomerDemand, InventoryPosition, ItemInstance } from '@domain/types';

/** Display-only suggestion. Never purchases, changes demand or reveals a budget. */
export function customerSupplySuggestion(
  demand: CustomerDemand | null | undefined,
  inventory: InventoryPosition[],
  items: Record<string, ItemInstance>,
) {
  if (!demand?.wantsBullion || demand.targetInventoryItemId) return null;
  const pool = demand.poolId ?? poolForTemplate(demand.templateId ?? '');
  if (!pool) return null;
  const product = POOL_SUPPLY.find(p => poolForTemplate(p.templateId) === pool);
  if (!product) return null;
  // Legacy exact-SKU demands must not be silently replaced by another size.
  if (!demand.poolId && demand.templateId !== product.templateId) return null;
  const unitGrams = poolUnitGrams(pool);
  const legacyFactor = demand.poolId || !isMassPool(pool) ? 1 : (bullionMeta(demand.templateId ?? '')?.unitWeightGrams ?? unitGrams) / unitGrams;
  const requested = demand.quantity * legacyFactor;
  if (!Number.isFinite(requested) || requested <= 0) return null;
  const held = offerableStock(demand, inventory, items)
    .filter(row => poolForItem(row.item) === pool)
    .reduce((sum, { position, item }) => sum + (position.quantityMg !== undefined
      ? fromMg(position.quantityMg) / unitGrams
      : position.quantity * (isMassPool(pool) ? (bullionMeta(item.templateId)?.unitWeightGrams ?? unitGrams) / unitGrams : 1)), 0);
  const step = product.templateId === 'gram_gold_1' ? GRAM_SUPPLY_STEP : 1;
  const missing = Math.max(0, requested - held);
  const quantity = Math.round(Math.ceil(missing / step - 1e-9) * step * 1000) / 1000;
  return { templateId: product.templateId, quantity, requested, held };
}
