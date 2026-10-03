import { readFileSync } from 'node:fs';
import { Children, createElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setLanguage } from '@i18n/index';
import { BusinessIdentity, type BusinessIdentityProps } from './components/BusinessIdentity';

afterEach(() => { setLanguage('tr'); });

const identity: BusinessIdentityProps = { tier: 1, tierName: 'Semt Kuyumcusu' };

function buttons(node: ReactNode): ReactElement<{ onClick: () => void; type: string }>[] {
  return Children.toArray(node).flatMap((child) => {
    if (!isValidElement<{ children?: ReactNode }>(child)) return [];
    if (child.type === 'button') return [child as ReactElement<{ onClick: () => void; type: string }>];
    return buttons(child.props.children);
  });
}

describe('square store identity presentation', () => {
  it('shows only a square store identity rather than a long goal panel', () => {
    const html = renderToStaticMarkup(createElement(BusinessIdentity, identity));
    expect(html).toContain('Semt Kuyumcusu');
    expect(html).toContain('businessIdentity__tile');
    expect(html).toContain('realistic/navigation/investments.webp');
    expect(html).not.toMatch(/Sıradaki|Ustalık|businessIdentity__goal|businessIdentity__guidance/);
    expect(html).not.toContain('<button');
  });

  it('keeps the square store and skills actions separate and operable', () => {
    const onOpenGrowth = vi.fn();
    const onOpenSkills = vi.fn();
    const props = { ...identity, onOpenGrowth, onOpenSkills };
    const controls = buttons(BusinessIdentity(props));
    expect(controls).toHaveLength(2);
    expect(controls.every(control => control.props.type === 'button')).toBe(true);
    controls[0]!.props.onClick();
    expect(onOpenGrowth).toHaveBeenCalledOnce();
    expect(onOpenSkills).not.toHaveBeenCalled();
    controls[1]!.props.onClick();
    expect(onOpenSkills).toHaveBeenCalledOnce();
    expect(onOpenGrowth).toHaveBeenCalledOnce();
    const html = renderToStaticMarkup(createElement(BusinessIdentity, props));
    expect(html).toContain('aria-label="Mağaza · Semt Kuyumcusu"');
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).not.toMatch(/<button[^>]*>(?:(?!<\/button>)[\s\S])*<button/);
  });

  it('uses a compact 88 px tile without allocating a tall identity row', () => {
    const css = readFileSync(new URL('./components/BusinessIdentity.css', import.meta.url), 'utf8');
    const html = renderToStaticMarkup(createElement(BusinessIdentity, identity));
    expect(css).toMatch(/\.businessIdentity\s*\{[^}]*padding: 0;/);
    expect(css).toMatch(/\.businessIdentity__tile\s*\{[^}]*width: 88px;[^}]*aspect-ratio: 1;/);
    expect(css).not.toContain('width: 112px;');
    expect(html).toContain('width="28" height="28"');
  });

  it('removes growth and skills actions entirely when collapsed', () => {
    const props = { ...identity, collapsed: true, onOpenGrowth: vi.fn(), onOpenSkills: vi.fn() };
    const html = renderToStaticMarkup(createElement(BusinessIdentity, props));
    expect(html).toContain('Semt Kuyumcusu');
    expect(html).toContain('businessIdentity--collapsed');
    expect(html).not.toContain('Yetenekler');
    expect(buttons(BusinessIdentity(props))).toHaveLength(0);
  });

  it.each([
    [1, 'Semt Kuyumcusu'], [2, 'Cadde Mağazası'],
    [3, 'AVM / Premium Butik'], [4, 'Şehir Flagship'],
  ] as const)('keeps stage %i identity with the existing bundled game art', (tier, tierName) => {
    const html = renderToStaticMarkup(createElement(BusinessIdentity, { tier, tierName }));
    expect(html).toContain(tierName);
    expect(html).toContain(`data-store-tier="${tier}"`);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('alt=""');
    expect(html).toContain('draggable="false"');
    expect(html).toContain('<img');
    expect(html).not.toContain('http');
    expect(html).not.toMatch(/Marka Ağı|İkinci şube|Kademe 5|Sıradaki/);
  });

  it('does not render a dead growth button when only skills is available', () => {
    const onOpenSkills = vi.fn();
    const props = { ...identity, onOpenSkills };
    const controls = buttons(BusinessIdentity(props));
    expect(controls).toHaveLength(1);
    controls[0]!.props.onClick();
    expect(onOpenSkills).toHaveBeenCalledOnce();
    expect(renderToStaticMarkup(createElement(BusinessIdentity, props)))
      .toContain('<div class="businessIdentity__tile">');
  });

  it('uses the existing English identity and action labels', () => {
    setLanguage('en');
    const html = renderToStaticMarkup(createElement(BusinessIdentity, {
      ...identity, onOpenGrowth: () => undefined, onOpenSkills: () => undefined,
    }));
    for (const label of ['Neighbourhood Jeweller', 'Store', 'Talents']) expect(html).toContain(label);
    expect(html).not.toMatch(/Kuyumcusu|Mağazası|Ustalık|Yetenekler|Sıradaki/);
  });

  it('allows long names and large text to wrap instead of being clipped', () => {
    const name = 'Uzun mağaza adı '.repeat(12);
    const props = Object.freeze({ ...identity, tierName: name, onOpenGrowth: () => undefined });
    expect(renderToStaticMarkup(createElement(BusinessIdentity, props))).toContain(name);
    const css = readFileSync(new URL('./components/BusinessIdentity.css', import.meta.url), 'utf8');
    for (const rule of ['overflow-wrap: anywhere', 'flex-wrap: wrap', 'min-height: var(--touch-min)',
      'aspect-ratio: 1', 'width: 88px', 'min-height: auto', 'object-fit: contain', ':focus-visible',
      '@media (max-width: 430px)', '@media (prefers-reduced-motion: reduce)']) expect(css).toContain(rule);
    expect(css).not.toMatch(/max-height:|text-overflow:|overflow:\s*hidden|position:\s*(fixed|absolute)/);
  });

  it('keeps fallback frontage and working access if the image cannot load', () => {
    const source = readFileSync(new URL('./components/BusinessIdentity.tsx', import.meta.url), 'utf8');
    const art = readFileSync(new URL('./Art.tsx', import.meta.url), 'utf8');
    expect(source).toContain('fallback={<StoreFacade tier={tier} />}');
    expect(art).toContain('onError={() => setFailed(true)}');
    expect(art).toContain('if (!art || failed)');
  });
});
