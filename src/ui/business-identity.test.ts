import { readFileSync } from 'node:fs';
import { Children, createElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setLanguage } from '@i18n/index';
import { BusinessIdentity, type BusinessIdentityProps } from './components/BusinessIdentity';

afterEach(() => { setLanguage('tr'); });

const identity: BusinessIdentityProps = {
  tier: 1,
  tierName: 'Semt Kuyumcusu',
  nextTierName: 'Cadde Mağazası',
  goalLabel: 'Ustalık ilerlemesi',
  guidanceLabel: 'Dar, sıcak, güven odaklı',
};

function buttons(node: ReactNode): ReactElement<{ onClick: () => void; type: string }>[] {
  return Children.toArray(node).flatMap((child) => {
    if (!isValidElement<{ children?: ReactNode }>(child)) return [];
    if (child.type === 'button') {
      return [child as ReactElement<{ onClick: () => void; type: string }>];
    }
    return buttons(child.props.children);
  });
}

describe('living store identity presentation', () => {
  it('shows the current store, the supplied nearby goal and only working actions', () => {
    const html = renderToStaticMarkup(createElement(BusinessIdentity, identity));
    expect(html).toContain('Semt Kuyumcusu');
    expect(html).toContain('Cadde Mağazası');
    expect(html).toContain('Ustalık ilerlemesi');
    expect(html).toContain('Dar, sıcak, güven odaklı');
    expect(html).not.toContain('<button');

    const onOpenGrowth = vi.fn();
    const onOpenSkills = vi.fn();
    const controls = buttons(BusinessIdentity({ ...identity, onOpenGrowth, onOpenSkills }));
    expect(controls).toHaveLength(2);
    for (const control of controls) {
      expect(control.props.type).toBe('button');
      control.props.onClick();
    }
    expect(onOpenGrowth).toHaveBeenCalledOnce();
    expect(onOpenSkills).toHaveBeenCalledOnce();
  });

  it('removes growth content and actions entirely while a customer is active', () => {
    const onOpenGrowth = vi.fn();
    const onOpenSkills = vi.fn();
    const props = { ...identity, collapsed: true, onOpenGrowth, onOpenSkills };
    const html = renderToStaticMarkup(createElement(BusinessIdentity, props));
    expect(html).toContain('Semt Kuyumcusu');
    expect(html).toContain('businessIdentity--collapsed');
    expect(html).not.toContain('Cadde Mağazası');
    expect(html).not.toContain('Ustalık ilerlemesi');
    expect(html).not.toContain('Dar, sıcak, güven odaklı');
    expect(buttons(BusinessIdentity(props))).toHaveLength(0);
    expect(onOpenGrowth).not.toHaveBeenCalled();
    expect(onOpenSkills).not.toHaveBeenCalled();
  });

  it('never invents another store stage after the final available stage', () => {
    const html = renderToStaticMarkup(createElement(BusinessIdentity, {
      tier: 4,
      tierName: 'Şehir Flagship',
      nextTierName: null,
      goalLabel: 'Ustalık tamamlandı',
    }));
    expect(html).toContain('Şehir Flagship');
    expect(html).toContain('data-store-tier="4"');
    expect(html).toContain('Ustalık tamamlandı');
    expect(html).not.toContain('Sıradaki');
    expect(html).not.toMatch(/Marka Ağı|İkinci şube|Kademe 5/);
  });

  it.each([
    [1, 'Semt Kuyumcusu'],
    [2, 'Cadde Mağazası'],
    [3, 'AVM / Premium Butik'],
    [4, 'Şehir Flagship'],
  ] as const)('shows stage %i without an external asset dependency', (tier, tierName) => {
    const html = renderToStaticMarkup(createElement(BusinessIdentity, { tier, tierName }));
    expect(html).toContain(tierName);
    expect(html).toContain(`data-store-tier="${tier}"`);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('focusable="false"');
    expect(html).not.toContain('<img');
  });

  it('uses existing English translations for the identity, goal and action labels', () => {
    setLanguage('en');
    const html = renderToStaticMarkup(createElement(BusinessIdentity, {
      ...identity, onOpenGrowth: () => undefined, onOpenSkills: () => undefined,
    }));
    for (const label of ['Neighbourhood Jeweller', 'High Street Shop', 'Mastery progress',
      'Small, warm, built on trust', 'Store', 'Talents', 'Next']) {
      expect(html).toContain(label);
    }
    expect(html).not.toMatch(/Kuyumcusu|Mağazası|Ustalık|Yetenekler|Sıradaki/);
  });

  it('allows long names and large text to wrap without reserving a fixed height', () => {
    const name = 'Uzun mağaza adı '.repeat(12);
    const props = Object.freeze({ ...identity, tierName: name, onOpenGrowth: () => undefined });
    expect(renderToStaticMarkup(createElement(BusinessIdentity, props))).toContain(name);
    const css = readFileSync(new URL('./components/BusinessIdentity.css', import.meta.url), 'utf8');
    expect(css).toContain('overflow-wrap: anywhere');
    expect(css).toContain('flex-wrap: wrap');
    expect(css).toContain('min-height: var(--touch-min)');
    expect(css).toContain('max(var(--fs-label), 0.875rem)');
    expect(css).toContain(':focus-visible');
    expect(css).toContain('@media (max-width: 430px)');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).not.toMatch(/max-height:|text-overflow:|overflow:\s*hidden|position:\s*(fixed|absolute)/);
  });
});
