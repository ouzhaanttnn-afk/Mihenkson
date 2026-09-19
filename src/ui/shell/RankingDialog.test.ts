import { afterEach, describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useGame } from '@state/gameStore';
import { RankingButton, RankingDialog } from './RankingDialog';

const initial = useGame.getState();
afterEach(() => useGame.setState(initial, true));

describe('shop trophy entry point', () => {
  it('labels the compact trophy as a dialog trigger', () => {
    useGame.setState({ rankingOpen: false });
    const html = renderToStaticMarkup(createElement(RankingButton));
    expect(html).toContain('aria-label="Aylık sıralama"');
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('aria-expanded="false"');
  });
  it('uses the real ranking panel, gold bar and iPhone-only Game Center state', () => {
    const html = renderToStaticMarkup(createElement(RankingDialog));
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-label="Kapat"');
    expect(html).toContain('g HAS');
    expect(html).toContain('gold-bar-5g.webp');
    expect(html).toContain('Game Center için iPhone uygulamasını kullan.');
    expect(html).not.toContain('monthlyRanking__list');
  });
});
