import { describe, expect, it } from 'vitest';
import { buildCaseReview } from './deal-review';
import { spawnItem } from './item-spawn';
import { createMarketForDay } from './market';
import { estimateBand, initialKnowledge } from './valuation';

describe('closed trade learning note', () => {
  const market = createMarketForDay(20260926, 1);
  const item = spawnItem(20260926, 1, 'quarter_gold');
  const base = {
    item,
    market,
    band: estimateBand(item, market, initialKnowledge(item)),
    price: 1000,
    accepted: false,
    testsUsed: [],
    selectedThesis: null,
    thesisOptions: [],
  };

  it('distinguishes a player decline from a customer rejecting an offer', () => {
    expect(buildCaseReview({ ...base, playerRejected: true }).keyDecisionPoint)
      .toBe('Karşı teklifi reddettiniz; işlem yapılmadı.');
    expect(buildCaseReview(base).keyDecisionPoint)
      .toBe('Teklifiniz müşterinin kabul sınırının altında kaldı.');
  });
});
