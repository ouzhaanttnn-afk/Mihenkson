import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { version } from '../../package.json';
import { PremiumOffer } from './screens/PremiumOffer';
import { ReleaseInfo } from './shell/ReleaseInfo';

describe('release clarity', () => {
  it('web Premium does not pretend to connect to the App Store', () => {
    const html = renderToStaticMarkup(createElement(PremiumOffer));
    expect(html).toContain('Satın alma iOS uygulamasında kullanılabilir.');
    expect(html).not.toContain('App Store’a bağlanılıyor');
    expect(html).toContain('disabled=""');
  });
  it('shows the package version and changes without inventing a native build', () => {
    const html = renderToStaticMarkup(createElement(ReleaseInfo));
    expect(html).toContain(version);
    expect(html).toContain('Web');
    expect(html).toContain('Bu sürümde yenilikler');
    expect(html).not.toContain('(22)');
  });
  it('stock quote uses the same whole-position single-slice wholesaler call', () => {
    const code = readFileSync(new URL('./screens/StockScreen.tsx', import.meta.url), 'utf8');
    expect(code).toContain('quantity: position.quantity }, s.items, s.inventory, s.market, s.store, 1)');
    expect(code).toContain('value: actualQuote.gross');
    expect(code).toContain("position.location !== 'workshop'");
  });
});
