/**
 * GDD 25 — öğretim akışı.
 *
 * Bu testler iki ayrı sözü tutar:
 *   1. ÖĞRETİR   — doğru anda doğru ders çıkar, sıra bozulmaz.
 *   2. ÇEKİLİR   — her ders bir kez görünür, atlanabilir, atlanınca hiçbir
 *                  şey eksik kalmaz.
 * İkincisi olmadan onboarding bir öğretici değil, bir engeldir.
 */

import { describe, expect, it } from 'vitest';

import {
  LESSONS,
  nextLesson,
  onboardingComplete,
  skipAll,
  type CoachContext,
} from './onboarding';

const base: CoachContext = {
  day: 1,
  hasCustomer: false,
  queueLength: 0,
  flow: null,
  stage: null,
  transactionClass: null,
  testsRun: 0,
  hasBand: false,
  stockUnits: 0,
};

const ctx = (over: Partial<CoachContext> = {}): CoachContext => ({ ...base, ...over });

// ===========================================================================

describe('Ders tablosu bütünlüğü', () => {
  it('kimlikler tekildir', () => {
    const ids = LESSONS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('her dersin başlığı ve gövdesi vardır, gövde telefonda okunacak kadar kısadır', () => {
    for (const l of LESSONS) {
      expect(l.title.length, l.id).toBeGreaterThan(3);
      expect(l.body.length, l.id).toBeGreaterThan(20);
      // Uzun metin telefonda okunmaz; şerit de taşar.
      expect(l.body.length, `${l.id} (${l.body.length} karakter)`).toBeLessThan(190);
    }
  });

  it('GDD 25 ölçeği: 5–7 dakikalık akış, bir avuç ders', () => {
    expect(LESSONS.length).toBeGreaterThanOrEqual(5);
    expect(LESSONS.length).toBeLessThanOrEqual(10);
  });
});

describe('Doğru anda doğru ders', () => {
  it('ilk gün, müşteri yokken karşılama dersi', () => {
    expect(nextLesson(ctx(), [])?.id).toBe('welcome');
  });

  it('kuyrukta müşteri varken karşılama dersi', () => {
    expect(nextLesson(ctx({ queueLength: 1 }), ['welcome'])?.id).toBe('greet');
  });

  it('inceleme aşamasında, test yapılmadan', () => {
    const l = nextLesson(ctx({ hasCustomer: true, flow: 'trade', stage: 'inspect' }), [
      'welcome', 'greet',
    ]);
    expect(l?.id).toBe('inspect');
  });

  it('test yapıldıktan sonra inceleme dersi ARTIK çıkmaz', () => {
    const l = nextLesson(
      ctx({ hasCustomer: true, flow: 'trade', stage: 'inspect', testsRun: 2 }),
      ['welcome', 'greet'],
    );
    expect(l?.id).not.toBe('inspect');
  });

  it('hızlı işlemde sarrafiye dersi çıkar', () => {
    const l = nextLesson(
      ctx({ hasCustomer: true, flow: 'trade', stage: 'inspect', transactionClass: 'fast' }),
      ['welcome', 'greet', 'inspect'],
    );
    expect(l?.id).toBe('fastFlow');
  });

  it('pazarlıkta tavan dersi çıkar', () => {
    const l = nextLesson(
      ctx({ hasCustomer: true, flow: 'trade', stage: 'negotiate' }),
      ['welcome', 'greet', 'inspect', 'fastFlow', 'appraise', 'thesis'],
    );
    expect(l?.id).toBe('negotiate');
  });

  it('aynı anda birden çok koşul sağlansa bile TEK ders gösterilir', () => {
    // İlk gün + kuyrukta müşteri + stok var: üç koşul birden.
    const l = nextLesson(ctx({ queueLength: 2, stockUnits: 5 }), []);
    expect(l).not.toBeNull();
    // Tablonun sırası kazanır; ikisini birden göstermek boğmaktır.
    expect(l?.id).toBe('welcome');
  });
});

describe('Ders bir kez gösterilir', () => {
  it('görülmüş ders tekrar çıkmaz', () => {
    const c = ctx();
    const first = nextLesson(c, []);
    expect(first?.id).toBe('welcome');
    expect(nextLesson(c, ['welcome'])?.id).not.toBe('welcome');
  });

  it('tüm dersler görülünce hiçbir şey gösterilmez', () => {
    const seen = LESSONS.map((l) => l.id);
    // Her ders için kendi bağlamını kursak bile null dönmeli.
    for (const c of [
      ctx(),
      ctx({ queueLength: 3 }),
      ctx({ hasCustomer: true, flow: 'trade', stage: 'inspect' }),
      ctx({ hasCustomer: true, flow: 'trade', stage: 'negotiate' }),
      ctx({ stockUnits: 9 }),
    ]) {
      expect(nextLesson(c, seen)).toBeNull();
    }
  });
});

describe('Öğretim çekilebilir', () => {
  it('atla, kalan her dersi kapatır', () => {
    const seen = skipAll(['welcome']);
    expect(onboardingComplete(seen)).toBe(true);
    expect(nextLesson(ctx({ hasCustomer: true, stage: 'negotiate', flow: 'trade' }), seen)).toBeNull();
  });

  it('atlamak mükerrer kimlik üretmez', () => {
    const seen = skipAll(skipAll([]));
    expect(new Set(seen).size).toBe(seen.length);
  });

  it('boş listeyle öğretim tamamlanmış sayılmaz', () => {
    expect(onboardingComplete([])).toBe(false);
  });
});

describe('Ders koşulları SAF fonksiyondur', () => {
  it('aynı bağlam her zaman aynı dersi verir', () => {
    const c = ctx({ hasCustomer: true, flow: 'trade', stage: 'thesis' });
    const seen = ['welcome', 'greet', 'inspect', 'fastFlow', 'appraise'];
    expect(nextLesson(c, seen)?.id).toBe(nextLesson(c, seen)?.id);
  });

  it('bağlamı değiştirmez', () => {
    const c = ctx({ hasCustomer: true, stage: 'inspect', flow: 'trade' });
    const snapshot = JSON.stringify(c);
    nextLesson(c, []);
    expect(JSON.stringify(c)).toBe(snapshot);
  });
});
