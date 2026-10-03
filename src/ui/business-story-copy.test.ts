import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { BusinessStoryDayProgress, BusinessStoryNearGoal, CustomerReturnContext } from '@domain/business-story';
import type { Gate } from '@domain/store-growth';
import { setCurrency, type CurrencyId } from '@i18n/currency';
import { missingKeys, setLanguage, t, type LanguageId } from '@i18n/index';
import { tl } from '@ui/format';
import { customerReturnCopy, dayProgressCopy, shopAgendaCopy, shopGoalCopy } from './business-story-copy';

beforeEach(() => { setLanguage('tr'); setCurrency('try'); });
afterEach(() => { setLanguage('tr'); setCurrency('try'); });

function progress(overrides: Partial<BusinessStoryDayProgress> = {}): BusinessStoryDayProgress {
  return {
    version: 1, day: 1, tierBefore: 1, tierAfter: 1, targetTier: 2,
    delta: { netWorth: 0, cash: 0, reputation: 0, level: 0, supplierTrust: 0,
      closedDeals: 0, knownCustomers: 0, masteryWorks: 0, masteryPoints: 0,
      masterySpent: 0, loyalCustomers: 0, upsetCustomers: 0 },
    newlyMetGateKeys: [], noLongerMetGateKeys: [], ...overrides,
  };
}

const returning: CustomerReturnContext = {
  key: 'customer-return', visits: 3, lastVisitDay: 4, lastOutcome: 'accepted', trust: 60,
  productNames: ['Çeyrek Altın', 'Gram Altın'], tradeSide: 'sold-to-customer',
};

describe('observed day progress copy', () => {
  it('does not invent progress without a baseline or a positive observed fact', () => {
    expect(dayProgressCopy(null)).toEqual([]);
    expect(dayProgressCopy(undefined)).toEqual([]);
    expect(dayProgressCopy(progress())).toEqual([]);
    const falling = progress();
    falling.delta = { ...falling.delta, cash: -50_000, netWorth: -10_000,
      knownCustomers: -1, supplierTrust: -3, masteryWorks: -1, masteryPoints: -1 };
    expect(dayProgressCopy(falling)).toEqual([]);
  });

  it('reports earned points instead of double-counting their qualifying jobs', () => {
    const day = progress();
    day.delta = { ...day.delta, masteryPoints: 1, masteryWorks: 5 };
    expect(dayProgressCopy(day)).toEqual(['1 yeni yetenek puanı açıldı.']);
    day.delta.masteryPoints = 0;
    expect(dayProgressCopy(day)).toEqual(['5 uygun iş ustalığı ilerletti.']);
  });

  it('prioritizes a real lost requirement and limits the summary to two facts', () => {
    setLanguage('en');
    const day = progress({ newlyMetGateKeys: ['closedDeals'],
      noLongerMetGateKeys: ['investment'] });
    day.delta = { ...day.delta, masteryWorks: 5, masteryPoints: 1, knownCustomers: 2, supplierTrust: 3 };
    const before = JSON.stringify(day);
    expect(dayProgressCopy(day)).toEqual([
      'Store requirements no longer met: 1. Check the details.',
      'Skill points newly unlocked: 1.',
    ]);
    expect(JSON.stringify(day)).toBe(before);
  });

  it('does not call the paid investment a lost requirement after a successful upgrade', () => {
    const day = progress({ tierAfter: 2, noLongerMetGateKeys: ['investment', 'netWorth'] });
    expect(dayProgressCopy(day)).toEqual(['Mağazan bir üst kademeye geçti.']);
  });

  it('localizes recorded customers and supplier trust without leaving placeholders', () => {
    setLanguage('en');
    const day = progress();
    day.delta = { ...day.delta, knownCustomers: 2, supplierTrust: 3 };
    expect(dayProgressCopy(day)).toEqual(['New customers recorded: 2.', 'Wholesaler trust +3.']);
  });
});

describe('customer return copy', () => {
  it('names purchased products only for a proved sale to this customer', () => {
    expect(customerReturnCopy(returning)).toBe('Son alışverişi: Çeyrek Altın, Gram Altın');
    setLanguage('en');
    expect(customerReturnCopy(returning)).toBe('Last purchase: Quarter Coin, Gram Gold');
  });

  it.each(['bought-from-customer', 'trade', null] as const)(
    'does not describe %s as a customer purchase', tradeSide => {
      setLanguage('en');
      const copy = customerReturnCopy({ ...returning, tradeSide });
      expect(copy).toBe('Returning customer · 3 recorded visits · Last visit: day 4');
      expect(copy).not.toMatch(/Last purchase|Quarter Coin|Gram Gold/);
    },
  );

  it('uses visit history when a legacy sale has no proved product', () => {
    expect(customerReturnCopy({ ...returning, productNames: [], lastOutcome: null }))
      .toBe('Tanıdık müşteri · 3 kayıtlı ziyaret · Son ziyaret gün 4');
  });
});

describe('near-goal and agenda localization', () => {
  const guidance: [Gate['key'], string][] = [
    ['closedDeals', 'Completed trades advance this requirement.'],
    ['knownCustomers', 'Visits are recorded in the customer register.'],
    ['level', 'Trade and service experience advance this level.'],
    ['supplierTrust', 'Qualifying supply purchases build trust.'],
    ['reputation', 'Visit outcomes affect local reputation.'],
    ['investment', 'Set aside cash for the upgrade and check the new daily expense.'],
    ['netWorth', 'Cash and owned stock are considered together.'],
  ];

  it.each(guidance)('translates the dynamic %s gate explanation at call time', (key, expected) => {
    const goal: BusinessStoryNearGoal = { key: 'upgrade-gate', gate: {
      key, label: 'Net servet', current: 2.8, needed: 5, met: false, unit: 'count',
    } };
    const tr = shopGoalCopy(goal);
    setLanguage('en');
    expect(shopGoalCopy(goal)).toEqual({ label: 'Net worth: 2/5', guidance: expected, skills: false });
    setLanguage('tr');
    expect(shopGoalCopy(goal)).toEqual(tr);
  });

  it('keeps mastery work, spendable points and the final store tier distinct', () => {
    setLanguage('en');
    expect(shopGoalCopy({ key: 'mastery-work', completed: 3, target: 5, remaining: 2 })).toEqual({
      label: 'Mastery: 3/5 qualifying jobs',
      guidance: 'Profitable manual sales, accurate appraisals or successful service deliveries.', skills: true,
    });
    expect(shopGoalCopy({ key: 'mastery-spend', available: 2 }))
      .toEqual({ label: 'Skill points ready: 2', guidance: null, skills: true });
    expect(shopGoalCopy({ key: 'career-complete' }))
      .toEqual({ label: 'This is the final store tier in this version.', guidance: null, skills: false });
  });

  it.each([
    ['tr', 'try', '324.500 ₺'], ['en', 'try', '324,500 ₺'],
    ['tr', 'usd', '$10.000'], ['en', 'usd', '$10,000'],
  ] as [LanguageId, CurrencyId, string][])(
    'formats %s/%s money live without changing the source amount', (language, currency, expectedMoney) => {
      const goal = Object.freeze({ key: 'upgrade-ready', tier: 2, investment: 324_500 } as const);
      const payment = Object.freeze({ key: 'payment', id: 'due', source: 'network', dueDay: 2,
        amount: 324_500, overdue: false } as const);
      setLanguage(language); setCurrency(currency);
      expect(tl(goal.investment)).toBe(expectedMoney);
      const moneyGate = shopGoalCopy({ key: 'upgrade-gate', gate: {
        key: 'netWorth', label: 'Net servet', current: goal.investment,
        needed: 649_000, met: false, unit: 'money',
      } });
      for (const copy of [shopGoalCopy(goal).label, moneyGate.label, shopAgendaCopy(payment, 1).detail]) {
        expect(copy).toContain(expectedMoney);
        expect(copy).not.toMatch(/\{\w+\}/);
      }
      expect(moneyGate.label).toContain(tl(649_000));
      expect(shopAgendaCopy(payment, 1).route).toBe('network');
      expect(goal.investment).toBe(324_500);
      expect(payment.amount).toBe(324_500);
    },
  );

  it('changes the same imported functions between TR and EN without frozen module copy', () => {
    const week = { key: 'week', day: 7, kind: 'planning', shopOpen: false,
      marketOpen: false, nextMarketOpenDay: 8 } as const;
    const day = progress({ newlyMetGateKeys: ['closedDeals'] });
    const first = [shopGoalCopy({ key: 'mastery-spend', available: 1 }).label,
      shopAgendaCopy(week, 7).title, customerReturnCopy(returning), ...dayProgressCopy(day)];
    setLanguage('en');
    expect([shopGoalCopy({ key: 'mastery-spend', available: 1 }).label,
      shopAgendaCopy(week, 7).title, customerReturnCopy(returning), ...dayProgressCopy(day)])
      .toEqual(['Skill points ready: 1', 'Sunday · shop closed',
        'Last purchase: Quarter Coin, Gram Gold', 'Additional store requirements met: 1.']);
    expect(shopAgendaCopy(week, 7).detail).toBe('Market closed; prices frozen. Next opening: Monday.');
    setLanguage('tr');
    expect([shopGoalCopy({ key: 'mastery-spend', available: 1 }).label,
      shopAgendaCopy(week, 7).title, customerReturnCopy(returning), ...dayProgressCopy(day)]).toEqual(first);
  });

  it('distinguishes due payments and actual delivery states with working routes', () => {
    setLanguage('en');
    const payment = { key: 'payment', id: 'invoice', source: 'supplier', dueDay: 4,
      amount: 1_000, overdue: false } as const;
    expect(shopAgendaCopy(payment, 4).title).toBe('Payment due today');
    expect(shopAgendaCopy(payment, 3).title).toBe('Payment due tomorrow');
    expect(shopAgendaCopy({ ...payment, overdue: true }, 5).title).toBe('Overdue payment');
    expect(shopAgendaCopy(payment, 4).route).toBe('wholesaler');
    const maintenance = { ...payment, id: 'scale_maintenance_1', source: 'payable' as const };
    expect(shopAgendaCopy(maintenance, 4).route).toBe('root');
    expect(shopAgendaCopy(maintenance, 4).detail).toContain('day close');
    const delivery = { key: 'delivery', id: 'job', promisedDay: 4, ready: false, overdue: false } as const;
    expect(shopAgendaCopy(delivery, 3).title).toBe('Upcoming delivery');
    expect(shopAgendaCopy({ ...delivery, overdue: true }, 5).title).toBe('Overdue delivery');
    expect(shopAgendaCopy({ ...delivery, ready: true }, 4).title).toBe('Job ready to deliver');
    expect(shopAgendaCopy(delivery, 3).route).toBe('workshop');
  });

  it('uses the already-public event description without adding a forecast', () => {
    setLanguage('en');
    const event = shopAgendaCopy({ key: 'event', id: 'wedding_season', label: 'Düğün Sezonu',
      description: 'Düğün müşterileri daha sık görülebilir; düğün ürünlerinin talep sinyali güçlü.', remainingDays: 2 }, 4);
    expect(event).toEqual({ title: 'Wedding Season · 2 days remaining',
      detail: 'Wedding customers may visit more often; wedding items show strong demand signals.', route: 'market' });
  });
});

describe('financial and public-clue vocabulary', () => {
  it('preserves cash payment, total debt and financing charge as separate values', () => {
    setLanguage('en'); setCurrency('usd');
    expect(t('Peşin ödeme {nakit} · Borç {vade} · Fark {fark} · Ödeme {gun}. gün', {
      nakit: tl(324_500), vade: tl(64_900), fark: tl(3_245), gun: 7,
    })).toBe('Upfront $10,000 · Debt $2,000 · Financing charge $100.00 · Due day 7');
    expect(t('Bugünkü stok alımlarına ödenen nakit: {tutar}.', { tutar: tl(324_500) }))
      .toBe('Cash paid for today’s stock purchases: $10,000.');
    expect(t('Stok net çıkış farkı (gerçekleşmemiş)')).toContain('(unrealized)');
    expect(t('Alım sonrası nakit: {tutar}', { tutar: tl(649_000) })).toBe('Cash after purchase: $20,000');
  });

  it('includes dynamic public-clue and operational-help keys in the English dictionary', () => {
    const keys = [
      'İşletmenin ilerleyişi', 'Mağaza: {kademe}', 'Ödeme: {tutar} · Gün {gun}', 'Finans ayrıntıları',
      'Yatırımcı ilgisi artıyor; fiyatlarda yukarı yönlü baskı var.',
      'Vitrin stoğunu gözden geçir', 'Yeni alımın maliyetini karşılaştır',
      'Fırsatçı müşteri ilgisi artıyor; şüpheli ürünü doğrula.',
      'Yeni ürün türleri: kolye, set ve taşlı yüzük',
      'Kendi atölyende risk; zorluk, doluluk, ekipman ve uzmanlıkla hesaplanır. Dış ustanın riski kendi atölye doluluğundan bağımsızdır.',
      'Doluluk kapasiteyi gösterir. Risk her işte ayrı; kabul edilen iş sonradan yeniden hesaplanmaz.',
    ];
    expect(missingKeys(keys)).toEqual([]);
    setLanguage('en');
    expect(t('Fırsatçı müşteri ilgisi artıyor; şüpheli ürünü doğrula.'))
      .toBe('Opportunist interest is rising; verify suspicious items.');
  });
});
