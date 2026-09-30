import type { StoreState } from './types';

export type StockCapacityLocation = 'display' | 'backStock';

export interface StockUsage {
  display: number;
  backStock: number;
}

/** Capacity is occupied by positions, not the units held in a bullion pool. */
export function stockUsage(inventory: readonly { location: string }[]): StockUsage {
  const usage: StockUsage = { display: 0, backStock: 0 };
  for (const position of inventory) {
    if (position.location === 'display' || position.location === 'backStock') {
      usage[position.location] += 1;
    }
  }
  return usage;
}

/**
 * Both inventories must use canonical pooling. Existing overflow is preserved:
 * a transaction may reduce it or keep its occupancy, but may never increase it.
 * Outgoing stock frees space within the same atomic transaction.
 */
export function stockCapacityBlock(
  before: readonly { location: string }[],
  projected: readonly { location: string }[],
  limits: Pick<StoreState, 'displaySlots' | 'backStockSlots'>,
): StockCapacityLocation | null {
  const previous = stockUsage(before);
  const next = stockUsage(projected);
  const locations: StockCapacityLocation[] = ['display', 'backStock'];
  for (const location of locations) {
    const configured = location === 'display' ? limits.displaySlots : limits.backStockSlots;
    const capacity = Number.isSafeInteger(configured) && configured >= 0 ? configured : 0;
    if (next[location] > capacity && next[location] > previous[location]) return location;
  }
  return null;
}
