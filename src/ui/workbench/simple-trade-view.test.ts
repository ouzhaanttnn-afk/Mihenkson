import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SaleResult, ResultStage } from './ResultStage';
import { OfferControl } from './OfferControl';
import { QuantityControl, clampQuantity } from '@ui/QuantityControl';

describe('simple trade receipts and controls', () => {
  it('analysis has one per-deal expanded control, not a closed outer accordion', () => {
    const source = readFileSync(new URL('./NegotiateStage.tsx', import.meta.url), 'utf8');
    expect(source).toContain('!s.activeDeal?.analysisCollapsed');
    expect(source).toContain('aria-expanded={analysisOpen}');
    expect(source).not.toContain('<details');
  });
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
  it('shows the short learning note before the optional detailed report', () => {
    const html = renderToStaticMarkup(createElement(ResultStage, { accepted: false,
      review: { headline: 'test', tone: 'neutral', valueDelta: 0, missedSignals: [],
        keyDecisionPoint: 'Karşı teklifi reddettiniz; işlem yapılmadı.', alternativeChannelNote: '' } }));
    expect(html.indexOf('Karşı teklifi reddettiniz')).toBeLessThan(html.indexOf('<details'));
  });
  it('offers half-gram buttons without rounding away manually entered tenths', () => {
    const html = renderToStaticMarkup(createElement(QuantityControl, {
      value: 1.1, min: 0.1, max: 10, step: 0.1, buttonStep: 0.5, unit: 'g',
      label: '24 ayar gram', onChange: () => {},
    }));
    expect(html).toContain('24 ayar gram + 0.5 g');
    expect(html).toContain('24 ayar gram − 0.5 g');
    expect(clampQuantity(1.1 + 0.5, 0.1, 10, 0.1)).toBe(1.6);
  });
  it('unaffordable buy presets are disabled, without disabling manual price access', () => {
    const html = renderToStaticMarkup(createElement(OfferControl, { value: 900, min: 100, max: 1500, step: 50,
      profitBoundary: 1000, impacts: [], onChange: () => {}, guidance: { direction: 'buy', anchor: 900, cash: 10 } }));
    expect(html.match(/disabled=""/g)).toHaveLength(3);
    expect(html).toContain('Fiyatı kendin ayarla');expect(html).toContain('Sonraki nakit');
    // Not only a screen-reader label: the action must be visible on the button.
    expect(html).toContain('<span>Fiyatı kendin ayarla</span>');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('class="simpleOffer__manual" hidden=""');
  });
});
