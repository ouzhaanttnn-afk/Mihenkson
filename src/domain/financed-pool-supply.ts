import { maxPoolSupplyQuantity, poolSupplyItem, poolSupplyQuote } from './pool-supply';
import { applyTransaction, type EconomyState, type SettlementOutcome } from './settlement';
import { financeTerms } from './wholesaler';
import { t } from '@i18n/index';
import type { MarketState, StoreState } from './types';

/** Exact credit maximum includes rounded interest, overdue and trust gates. */
export function maxFinancedPoolSupplyQuantity(templateId: string, market: MarketState, store: StoreState): number {
  return maxPoolSupplyQuantity(templateId, market, store, amount => {
    const terms = financeTerms(store, amount, market.day);
    return !terms.blockedReason && terms.totalDue <= terms.availableLimit;
  });
}

/** Customer-context restocking; cash, interest, invoice and ownership commit together. */
export function financedPoolSupply(state: EconomyState, market: MarketState, templateId: string, quantity: number): SettlementOutcome {
  const quote = poolSupplyQuote(templateId, quantity, market, state.store);
  if (!quote) return { applied: false, state, reason: t('Geçersiz tedarik miktarı.') };
  const terms = financeTerms(state.store, quote.totalPrice, market.day);
  if (terms.blockedReason || terms.totalDue > terms.availableLimit) return { applied: false, state, reason: terms.blockedReason ?? t('Vade ve farkı için limit yetersiz.') };
  const id = `poolcredit_${market.day}_${state.ledger.appliedTxIds.length}`;
  const sample = poolSupplyItem(templateId);
  const cost = quote.totalPrice + terms.financeCost;
  // Keep the canonical unit unchanged. Explicit quantity survives consolidation
  // and one transaction item avoids save-size growth with kilogram/coin lots.
  const itemsIn = [{
    ...sample, id: `${id}_0`, buyCost: cost / quantity,
    acquiredDay: market.day, location: 'backStock' as const,
    truth: { ...sample.truth },
  }];
  const outcome = applyTransaction({ ...state, market }, { txId: id, dealId: id, day: market.day,
    cashDelta: -terms.fromCash, itemsIn, itemsOut: [], poolPurchase: { quantity, financed: true }, trustDelta: 0, reputationDelta: 0,
    xpDelta: 0, label: t('{ad} tedariki · vade farkı {fark}', { ad: t(sample.displayName), fark: terms.financeCost }) });
  return outcome.applied ? outcome : { ...outcome, state };
}
