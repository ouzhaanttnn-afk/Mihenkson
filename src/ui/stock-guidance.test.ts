import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGame } from '@state/gameStore';
import { createMarketForDay } from '@domain/market';
import { createLedger } from '@domain/settlement';
import { poolForTemplate } from '@domain/stock-pools';
import type { CustomerDemand } from '@domain/types';
import { customerSupplySuggestion } from './stock-guidance';

const initial = useGame.getState();
function demand(templateId: string, quantity: number): CustomerDemand {
  return { templateId, poolId: poolForTemplate(templateId), quantity, minQuantity: quantity,
    acceptsPartial: false, isBulk: false, wantsBullion: true, families: [], summary: '', alternativesLabel: '' };
}
const suggest = (d: CustomerDemand) => {
  const s = useGame.getState();
  return customerSupplySuggestion(d, s.inventory, s.items);
};
beforeEach(() => {
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {} });
  useGame.setState({ ...initial, store: { ...initial.store, cash: 10_000_000 },
    market: createMarketForDay(456, 5), inventory: [], items: {}, ledger: createLedger() }, true);
});
afterEach(() => { useGame.setState(initial, true); vi.unstubAllGlobals(); });
describe('display-only customer stock suggestion', () => {
  it('60g bangle request minus 20g stock suggests four 10g units', () => {
    useGame.getState().buyPoolStock('investment_bangle_22k_10', 2);
    const before = useGame.getState();
    expect(suggest(demand('investment_bangle_22k_10', 6))).toMatchObject({ quantity: 4, held: 2 });
    expect(useGame.getState()).toBe(before);
  });
  it('unit coins are not multiplied by their gold weight', () => {
    useGame.getState().buyPoolStock('quarter_gold', 2);
    expect(suggest(demand('quarter_gold', 4))).toMatchObject({ quantity: 2 });
  });
  it('fractional gram shortage rounds up to the existing 0.1g purchase step', () => {
    useGame.getState().buyPoolStock('gram_gold_1', 2.5);
    expect(suggest(demand('gram_gold_1', 3.55))).toMatchObject({ quantity: 1.1 });
  });
  it('enough inventory does not suggest another purchase', () => {
    useGame.getState().buyPoolStock('quarter_gold', 6);
    expect(suggest(demand('quarter_gold', 4))).toMatchObject({ quantity: 0 });
  });
  it('workshop inventory cannot satisfy the suggestion', () => {
    useGame.getState().buyPoolStock('quarter_gold', 2);
    useGame.setState(s => ({ inventory: s.inventory.map(p => ({ ...p, location: 'workshop' })) }));
    expect(suggest(demand('quarter_gold', 4))).toMatchObject({ quantity: 4 });
  });
  it('crafted, flexible and unavailable legacy SKUs get no invented recommendation', () => {
    expect(suggest({ ...demand('quarter_gold', 1), targetInventoryItemId: 'display-item' })).toBeNull();
    expect(suggest({ ...demand('quarter_gold', 1), wantsBullion: false })).toBeNull();
    expect(suggest({ ...demand('gram_gold_10', 1), poolId: undefined })).toBeNull();
  });
});
