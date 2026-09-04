/**
 * DEĞİŞMEZLİK — dil ve para birimi OYUNU DEĞİŞTİRMEZ.
 *
 * Bu dosyanın tek işi var ve paketin en önemli testi odur: aynı tohumla
 * oynanan iki oyun, biri Türkçe/₺ diğeri İngilizce/$ olsa bile BİRE BİR
 * aynı sayıları üretmelidir.
 *
 * Neden bu kadar önemli: çeviri katmanı alan (domain) katmanına da girdi.
 * Oradaki bir `t()` çağrısı yanlışlıkla bir DEĞERİ etkilerse — dile göre
 * farklı bir dal, farklı bir yuvarlama, fazladan bir zar çekilişi — oyun
 * sessizce ikiye ayrılır ve bu, kayıt uyumluluğundan pazarlık adaletine
 * kadar her şeyi bozar. Aşağıdaki karşılaştırmalar o kapıyı kapatıyor.
 *
 * "Geri dönüşü mümkün kıl" isteğinin teknik karşılığı da budur: gösterim
 * tercihleri oyunun durumuna hiç dokunmadığı için, her an geri alınabilir.
 */

import { afterEach, describe, expect, it } from 'vitest';

import { getLanguage, setLanguage } from './index';
import { getCurrency, setCurrency, fromDisplay, toDisplay, USD_RATE } from './currency';
import { MARKET_BASE } from '@domain/balance';
import { createMarketForDay, stepMarketIntraday } from '@domain/market';
import { spawnItem } from '@domain/item-spawn';
import { ITEM_TEMPLATES } from '@data/item-templates';
import { useGame } from '@state/gameStore';
import { LESSONS } from '@domain/onboarding';
import type { MarketState } from '@domain/types';

const initial = useGame.getState();

afterEach(() => {
  useGame.setState(initial, true);
  setLanguage('tr');
  setCurrency('try');
});

/** Piyasa zinciri — 90 gün, gün içi adımlarıyla birlikte. */
function marketFingerprint(seed: number): string {
  let market: MarketState = createMarketForDay(seed, 1);
  const rows: number[] = [];
  for (let day = 2; day <= 90; day += 1) {
    market = createMarketForDay(seed, day, market);
    for (let step = 0; step < 3; step += 1) market = stepMarketIntraday(market, 60);
    rows.push(market.goldSpot, market.silverSpot, market.fxIndex);
  }
  return rows.map((n) => n.toFixed(6)).join('|');
}

/** Ürün üretimi — gizli gerçek, kusurlar, beyan ve değer. */
function spawnFingerprint(seed: number): string {
  const rows: string[] = [];
  for (let index = 0; index < 60; index += 1) {
    const template = ITEM_TEMPLATES[index % ITEM_TEMPLATES.length]!;
    rows.push(JSON.stringify(spawnItem(seed, index, template.id)));
  }
  return rows.join('|');
}

/**
 * Mağaza akışı — ZAR TÜKETİMİNİN kendisi.
 *
 * Sayıları değil, RNG'nin kaç kez ve hangi sırayla çekildiğini ölçer:
 * `spawnCounter`, kuyruk ve tohum. Çeviri fazladan bir çekiliş yapsaydı
 * (ya da bir çekilişi atlasaydı) buradaki parmak izi ayrışırdı.
 */
function storeFingerprint(): string {
  useGame.setState({
    ...initial,
    seed: 777_777,
    profileSetupDone: true,
    seenLessons: LESSONS.map((lesson) => lesson.id),
  }, true);
  const rows: string[] = [];
  for (let round = 0; round < 40; round += 1) {
    useGame.getState().tick(30);
    const s = useGame.getState();
    rows.push(
      [
        s.spawnCounter,
        s.jobCounter,
        s.queue.length,
        s.missedGuestCountToday,
        s.market.clockMinutes,
        s.market.goldSpot.toFixed(6),
        s.store.cash,
        s.store.xp,
        s.store.reputation,
      ].join(','),
    );
  }
  return rows.join('|');
}

function underSettings<T>(lang: 'tr' | 'en', cur: 'try' | 'usd', fn: () => T): T {
  setLanguage(lang);
  setCurrency(cur);
  return fn();
}

describe('dil ve para birimi oyunu değiştirmez', () => {
  it('PİYASA ZİNCİRİ birebir aynı — 90 gün, gün içi adımlar dahil', () => {
    const tr = underSettings('tr', 'try', () => marketFingerprint(4242));
    const en = underSettings('en', 'usd', () => marketFingerprint(4242));
    expect(en).toBe(tr);
  });

  it('ÜRÜN ÜRETİMİ birebir aynı — gizli gerçek dile bakmaz', () => {
    const tr = underSettings('tr', 'try', () => spawnFingerprint(9_001));
    const en = underSettings('en', 'usd', () => spawnFingerprint(9_001));
    expect(en).toBe(tr);
  });

  it('ZAR TÜKETİMİ birebir aynı — fazladan veya eksik çekiliş yok', () => {
    const tr = underSettings('tr', 'try', storeFingerprint);
    const en = underSettings('en', 'usd', storeFingerprint);
    expect(en).toBe(tr);
  });
});

describe('para birimi çevrimi', () => {
  it('TL seçiliyken hiçbir şey yapmaz — çarpan 1', () => {
    setCurrency('try');
    expect(toDisplay(145_000)).toBe(145_000);
    expect(fromDisplay(145_000)).toBe(145_000);
  });

  it('TUR KAPANIŞI TAM — gösterimden dönen değer aynı TL tutarıdır', () => {
    setCurrency('usd');
    for (const amount of [1, 37, 1_200, 145_000, 1_000_000, 750_000_000]) {
      expect(fromDisplay(toDisplay(amount))).toBeCloseTo(amount, 6);
    }
  });

  it('kur oyunun kendi dolar kurudur — uydurma bir sayı değil', () => {
    expect(USD_RATE).toBe(MARKET_BASE.usd);
  });

  it('bozuk kimlik varsayılana düşer, çökmez', () => {
    setCurrency('yok' as never);
    expect(getCurrency()).toBe('try');
    setLanguage('klingon' as never);
    expect(getLanguage()).toBe('tr');
  });
});

// ---------------------------------------------------------------------------
/*
  ÇEVİRİ KARŞILAŞTIRMAYA GİREMEZ.

  Bu test gerçek bir hatadan doğdu. Toplu bir çeviri geçişinde
  `tags.includes('düğün')` yanlışlıkla `tags.includes(t('düğün'))` olmuştu.
  Talep etiketi bir VERİ kimliğidir, ekran metni değil: İngilizce oynayan
  oyuncuda karşılaştırma `'wedding'` arayacak, ürünün etiketi ise `'düğün'`
  kalacaktı — düğün sezonu olayı talebi hiç artırmayacaktı. Yani çeviri
  sessizce EKONOMİYİ değiştirecekti.

  Kaynağı tarayan bir testtir, çünkü hatanın kendisi çalışma anında
  görünmez: iki dil karşılaştırıldığında bile ancak o olay çıkarsa ayrışır.
*/
describe('çeviri karşılaştırmada kullanılmaz', () => {
  it('kaynakta `includes(t(`, `=== t(` gibi bir kalıp yok', async () => {
    const { readdirSync, readFileSync, statSync } = await import('node:fs');
    const { join } = await import('node:path');

    const walk = (dir: string, out: string[] = []): string[] => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p, out);
        else if (/\.(ts|tsx)$/.test(name) && !name.includes('.test.')) out.push(p);
      }
      return out;
    };

    /*
      `t(` ÖNÜNDE SÖZCÜK SINIRI ŞART. İlk hâlinde yoktu ve
      `personnelCount(s.store) === count` yanlış alarm verdi: "Count(" da
      "t(" ile bitiyor. Yanlış alarm, gerçek bulguyu gürültüye gömer.
    */
    const kalip =
      /(?:includes|startsWith|endsWith|indexOf)\(\s*(?<![A-Za-z0-9_$])t\(|[=!]==\s*(?<![A-Za-z0-9_$])t\(/;
    const kirli = walk('src').filter((p) => kalip.test(readFileSync(p, 'utf8')));

    expect(kirli, `çeviri karşılaştırmada kullanılmış: ${kirli.join(', ')}`).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
describe('çıkış planı dile bakmaz', () => {
  /*
    Yukarıdaki hatanın davranışa yansıyan hâli: talep seviyesi ve dolayısıyla
    kanal beklentileri iki dilde de aynı olmalı.
  */
  it('AYNI ÜRÜN, AYNI PİYASA → aynı kanal beklentileri', async () => {
    const { buildThesisOptions } = await import('@domain/thesis');
    const { createMarketForDay } = await import('@domain/market');
    const { spawnItem } = await import('@domain/item-spawn');
    const { estimateBand } = await import('@domain/valuation');
    const { ITEM_TEMPLATES } = await import('@data/item-templates');

    const parmakIzi = () => {
      const market = createMarketForDay(31_337, 12);
      const rows: string[] = [];
      for (let index = 0; index < 24; index += 1) {
        const template = ITEM_TEMPLATES[index % ITEM_TEMPLATES.length]!;
        const item = spawnItem(31_337, index, template.id);
        const band = estimateBand(item, market, []);
        const options = buildThesisOptions(item, band, {
          market,
          store: useGame.getState().store,
          skills: useGame.getState().skillProgress,
        } as never);
        rows.push(
          options
            .map((o) => `${o.channel}:${o.expectedNet}:${o.buyCeiling}:${o.demandRisk}`)
            .join(','),
        );
      }
      return rows.join('|');
    };

    const tr = underSettings('tr', 'try', parmakIzi);
    const en = underSettings('en', 'usd', parmakIzi);
    expect(en).toBe(tr);
  });
});
