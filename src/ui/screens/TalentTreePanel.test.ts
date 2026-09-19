import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { useGame } from '@state/gameStore';
import { TalentTreePanel } from './TalentTreePanel';

it('announces unavailable progression before the read-only skill preview without modifying progress', () => {
  const before = structuredClone(useGame.getState().skillProgress);
  const html = renderToStaticMarkup(createElement(TalentTreePanel));
  expect(html).toContain('<strong>Yakında</strong>');
  expect(html).toContain('Bu sürümde yetenek puanı kazanımı ve kademe açma kapalıdır.');
  expect(html.indexOf('Yakında')).toBeLessThan(html.indexOf('Ayar Ustalığı'));
  expect(html).not.toContain('<button');
  expect(useGame.getState().skillProgress).toEqual(before);
});
