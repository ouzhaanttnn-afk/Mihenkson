import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { tierDef } from '@data/store-tiers';
import { evaluateUpgrade, type GrowthSnapshot } from '@domain/store-growth';
import { useGame } from '@state/gameStore';
import { setLanguage } from '@i18n/index';
import { setCurrency } from '@i18n/currency';
import { StoreGrowthTasks } from './screens/StoreGrowthTasks';
import { groupStoreTasks, STORE_TASK_ORDER, storeGrowthInputs, storeGrowthTasks, storeTaskHint, storeTaskLabel } from './store-growth-tasks';

const initial = useGame.getState();
function evaluation(tier: 1 | 2 | 3 | 4 = 1, overrides: Partial<GrowthSnapshot> = {}) {
  const next = tierDef(Math.min(4, tier + 1) as 2 | 3 | 4);
  const r = next.requires!;
  return evaluateUpgrade({ ...initial.store, storeTier: tier }, {
    ...r, cash: next.investment, ...overrides,
  });
}
function markup(e = evaluation()) {
  return renderToStaticMarkup(createElement(StoreGrowthTasks, {
    evaluation: e, displaySlots: 8, backStockSlots: 16, workshopCapacity: 2,
    dailyOverhead: 900, customerDensity: 1, presentationBonus: 0,
    onBack() {}, onUpgrade() {}, onTrade() {}, onWholesaler() {},
  }));
}
afterEach(() => { setLanguage('tr'); setCurrency('try'); });

describe('compact store growth presentation — canonical gates only', () => {
  for (const tier of [1, 2, 3] as const) it(`keeps six career tasks and a separate cash gate at tier ${tier}`, () => {
    const e = evaluation(tier);
    expect(storeGrowthTasks(e).map(g => g.key)).toEqual(STORE_TASK_ORDER);
    expect(e.gates).toHaveLength(7);
    expect(storeGrowthTasks(e).every(g => g.met)).toBe(true);
    expect(e.ready).toBe(true);
  });
  for (const key of [...STORE_TASK_ORDER, 'cash'] as const) it(`keeps ${key} below target blocking payment`, () => {
    const e = evaluation(1, { [key]: 0 });
    expect(e.ready).toBe(false);
    expect(markup(e)).toMatch(/class="storeGrowthPage__upgrade" disabled/);
  });
  it('does not count investment in 6/6 and reports the exact remaining cash', () => {
    const e = evaluation(1, { cash: tierDef(2).investment - 1 });
    const html = markup(e);
    expect(html).toContain('Görevler · 6/6 hazır');
    expect(html).toContain('Yatırım için 1 ₺ eksik');
    expect(html).toMatch(/class="storeGrowthPage__upgrade" disabled/);
    expect(markup(evaluation())).not.toMatch(/class="storeGrowthPage__upgrade" disabled/);
  });
  for (const key of ['netWorth', 'reputation', 'supplierTrust'] as const) it(`allows ${key} readiness to fall without persisting a completion`, () => {
    expect(groupStoreTasks(storeGrowthTasks(evaluation())).missing).toHaveLength(0);
    const changed = storeGrowthTasks(evaluation(1, { [key]: 0 }));
    expect(groupStoreTasks(changed).missing.map(g => g.key)).toEqual([key]);
  });
  it('keeps lifetime totals at a changed tier, not a fresh mission counter', () => {
    const e = evaluation(2, { closedDeals: 18, knownCustomers: 6 });
    expect(storeGrowthTasks(e).find(g => g.key === 'closedDeals')).toMatchObject({ current: 18, needed: 70 });
    expect(storeGrowthTasks(e).find(g => g.key === 'knownCustomers')).toMatchObject({ current: 6, needed: 20 });
  });
  it('freezes membership only and keeps live readiness and numbers visible', () => {
    const keys = ['netWorth'] as const;
    const ready = storeGrowthTasks(evaluation());
    expect(groupStoreTasks(ready, keys).missing[0]).toMatchObject({ key: 'netWorth', met: true });
    const changed = storeGrowthTasks(evaluation(1, { reputation: 0 }));
    expect(groupStoreTasks(changed, keys).ready.find(g => g.key === 'reputation')?.met).toBe(false);
    expect(groupStoreTasks(changed).missing.map(g => g.key)).toEqual(['reputation']);
  });
  it('has exactly one scroll region and closed disclosures with one real upgrade control', () => {
    const html = markup(evaluation(1, { closedDeals: 0, knownCustomers: 0 }));
    expect(html.match(/role="region"/g)).toHaveLength(1);
    expect(html.match(/<details/g)).toHaveLength(3);
    expect(html).not.toMatch(/<details[^>]* open/);
    expect(html.match(/class="storeGrowthPage__upgrade"/g)).toHaveLength(1);
    expect(html).toContain('aria-label="← İşletme"');
    expect(html).toContain('class="srOnly"');
  });
  it('does not promise an out-of-scope fifth tier or a fake payment at the final tier', () => {
    const html = markup(evaluation(4));
    expect(html).toContain('Şehir Flagship');
    expect(html).toContain('Bu sürümde son kademe.');
    expect(html).not.toContain('Marka Ağı');
    expect(html).not.toContain('storeGrowthPage__upgrade');
    expect(html).not.toContain('Nasıl ilerlerim?');
  });
  it('shows help for only missing gates and does not confuse XP with talent points', () => {
    const html = markup(evaluation(1, { level: 1 }));
    expect(html).toContain(storeTaskHint('level'));
    expect(html).not.toContain(storeTaskHint('knownCustomers'));
    expect(storeTaskHint('level')).toContain('Yetenek puanı ayrı');
  });
  it('switches language/currency without changing the canonical evaluation', () => {
    const e = evaluation();
    const before = structuredClone(e);
    setLanguage('en'); setCurrency('usd');
    for (const key of STORE_TASK_ORDER) expect(storeTaskLabel(key)).not.toBe('');
    const html = markup(e);
    expect(html).toContain('Tasks · 6/6 ready');
    expect(html).toContain('Pay $');
    expect(html).not.toContain('₺');
    expect(e).toEqual(before);
  });
  it('does not rerender for a personnel clock tick but follows wealth/currency inputs', () => {
    const before = storeGrowthInputs(initial);
    expect(storeGrowthInputs({ ...initial, store: { ...initial.store, personnelElapsedSeconds: 45 } })).toEqual(before);
    expect(storeGrowthInputs({ ...initial, market: { ...initial.market, goldSpot: initial.market.goldSpot + 1 } })).not.toEqual(before);
    expect(storeGrowthInputs({ ...initial, preferences: { ...initial.preferences, currency: 'usd' } })).not.toEqual(before);
  });
  it('preserves store and saved ledger/customer state while deriving the view', () => {
    const before = structuredClone({ store: initial.store, ledger: initial.ledger, customers: initial.customers });
    markup(evaluation()); storeGrowthInputs(initial);
    expect({ store: initial.store, ledger: initial.ledger, customers: initial.customers }).toEqual(before);
  });
  it('keeps the footer in normal flow with one safe-area owner and pointer cancellation', () => {
    const css = readFileSync(new URL('./screens/StoreGrowthTasks.css', import.meta.url), 'utf8');
    const source = readFileSync(new URL('./screens/StoreGrowthTasks.tsx', import.meta.url), 'utf8');
    expect(css).not.toMatch(/position:\s*(fixed|absolute)/);
    expect(css).not.toContain('safe-bottom');
    expect(css).toContain('flex-wrap: wrap');
    expect(css).toContain('min-height: 44px');
    expect(css).toContain('.875rem');
    expect(source).toContain('onPointerCancel');
    expect(source).toContain('onBlurCapture');
    expect(source).toContain('onScroll');
  });
});
