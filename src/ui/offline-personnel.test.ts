import { afterEach, describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { OfflinePersonnelSurface, OfflinePersonnelSummary } from './shell/OfflinePersonnelDialog';
import { setLanguage } from '@i18n/index';
import { useGame } from '@state/gameStore';
import type { OfflinePersonnelReport } from '@domain/offline-personnel';

const initial = useGame.getState();
const report: OfflinePersonnelReport = { id: 'offline_personnel_1', elapsedMs: 8 * 60 * 60_000,
  processedMs: 4 * 60 * 60_000, attempts: 16, sales: 2, revenue: 24_000, stockCost: 20_000,
  profit: 4_000, expenses: 0, cashChange: 24_000, pendingWages: 1333.333333 };
afterEach(() => { useGame.setState(initial, true); setLanguage('tr'); });

describe('offline staff report presentation', () => {
  it('separates historical stock cost from actual cash changes and pending wages in Turkish', () => {
    const html = renderToStaticMarkup(createElement(OfflinePersonnelSummary, { report }));
    for (const text of ['Satış tahsilatı', 'Satılan stok maliyeti', 'Ticaret kârı', 'Bu sürede kesilen gider',
      'Kasa değişimi', 'kasadan tekrar kesilmedi', 'bu raporda kesilmedi', '4 saati aşan']) expect(html).toContain(text);
    expect(html).toContain('16 müşteri denemesinde 2 güvenli satış');
    expect(html).not.toContain('Kazancı al');
  });
  it('localizes English and explains zero sales without promising money', () => {
    setLanguage('en');
    const html = renderToStaticMarkup(createElement(OfflinePersonnelSummary, {
      report: { ...report, sales: 0, revenue: 0, stockCost: 0, profit: 0, cashChange: 0 } }));
    expect(html).toContain('0 safe sales from 16 customer attempts');
    expect(html).toContain('No agreement was reached');
    expect(html).toContain('not charged in this report');
    expect(html).not.toContain('kesilmedi');
  });
  it('renders a real modal with one acknowledgment and accessible inline save retry', () => {
    const html = renderToStaticMarkup(createElement(OfflinePersonnelSurface, {
      report, issue: false, acknowledge: () => true, retry: () => true }));
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-labelledby=');
    expect(html).toContain('Dükkâna dön');
    const failure = renderToStaticMarkup(createElement(OfflinePersonnelSurface, {
      report: null, issue: true, acknowledge: () => true, retry: () => false }));
    expect(failure).toContain('role="status"');
    expect(failure).toContain('kasa ve stok değiştirilmedi');
    expect(failure).toContain('Kaydı tekrar dene');
    expect(failure).not.toContain('Dükkâna dön');
  });
});
