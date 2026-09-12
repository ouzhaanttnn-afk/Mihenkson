import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SaleResult, ResultStage } from './ResultStage';
import { OfferControl } from './OfferControl';

describe('simple trade receipts and controls', () => {
  it('sale receipt separates proceeds, cost and realized profit', () => {
    const html = renderToStaticMarkup(createElement(SaleResult, { price: 33000, cost: 30000 }));
    expect(html).toContain('Satış tutarı');expect(html).toContain('Toplam maliyet');
    expect(html).toContain('Net kâr / zarar');expect(html).toContain('+3.000');
  });
  it('a completed loss is not celebrated as profitable', () => {
    const html = renderToStaticMarkup(createElement(SaleResult, { price: 29000, cost: 30000 }));
    expect(html).toContain('Ticaret tamamlandı');expect(html).toContain('tradeReceipt__loss');
    expect(html).not.toContain('Ticaret başarılı');expect(html).not.toContain('İyi karar');
  });
  it('buy receipt explicitly distinguishes estimated gain from realized profit', () => {
    const html = renderToStaticMarkup(createElement(ResultStage, { accepted: true, paid: 1000, estimatedGain: 200,
      review: { headline: 'test', tone: 'neutral', valueDelta: 200, missedSignals: [], keyDecisionPoint: '', alternativeChannelNote: '' } }));
    expect(html).toContain('Tahmini kazanç');expect(html).toContain('Kâr, ürün satıldığında gerçekleşir.');
    expect(html).not.toContain('Net kâr / zarar');
  });
  it('unaffordable buy presets are disabled, without disabling manual price access', () => {
    const html = renderToStaticMarkup(createElement(OfferControl, { value: 900, min: 100, max: 1500, step: 50,
      profitBoundary: 1000, impacts: [], onChange: () => {}, guidance: { direction: 'buy', anchor: 900, cash: 10 } }));
    expect(html.match(/disabled=""/g)).toHaveLength(3);
    expect(html).toContain('Kendim ayarlayayım');expect(html).toContain('Sonraki nakit');
  });
});
