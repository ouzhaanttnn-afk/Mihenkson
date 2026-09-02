/**
 * MIHENKAYNAK — Piyasa, overnight exposure ve RNG kabul testleri
 * Kaynak: Ekonomi Ara Düzeltmesi v1.0 · §5, §5.1, §5.2, §11; GDD 13.4, 34.5.
 */

import { describe, expect, it } from 'vitest';

import { MARKET_COMPOSITION, REGIME_TRANSITIONS } from './balance';
import { Rng, deriveSeed } from './rng';
import {
  carryEvent,
  composeDailyMove,
  createMarketForDay,
  nextRegime,
  nextTrend,
} from './market';
import { spawnItem } from './item-spawn';
import {
  marketSignals,
  measurePosition,
  resolveOvernight,
  type OvernightPosition,
} from './overnight';
import type { InventoryPosition, ItemInstance, MarketRegime, MarketState } from './types';

const SEED = 20260827;

function days(count: number, seed = SEED): MarketState[] {
  const out: MarketState[] = [];
  let prev: MarketState | undefined;
  for (let d = 1; d <= count; d += 1) {
    prev = createMarketForDay(seed, d, prev);
    out.push(prev);
  }
  return out;
}

function position(over: Partial<OvernightPosition> = {}): OvernightPosition {
  return { day: 1, cash: 100_000, metalValue: 100_000, metalShare: 0.5, goldSpot: 4_000, ...over };
}

function market(over: Partial<MarketState> = {}): MarketState {
  return { ...createMarketForDay(SEED, 1), ...over };
}

// ===========================================================================
// §5.1 — ERTESİ GÜN FİYATI BAĞIMSIZ ÇEKİLİŞ DEĞİLDİR
// ===========================================================================

describe('§5.1 — Fiyat dört bileşenin ağırlıklı sonucudur', () => {
  it('rejim bir DURUMDUR: günden güne taşınır, sıfırdan çekilmez', () => {
    const series = days(400).map((m) => m.regime);

    // Aynı rejimin ertesi gün de sürme oranı, bağımsız çekilişinkinden
    // belirgin yüksek olmalı — yoksa "rejim" bir durum değil zar olurdu.
    let sticky = 0;
    for (let i = 1; i < series.length; i += 1) if (series[i] === series[i - 1]) sticky += 1;
    expect(sticky / (series.length - 1)).toBeGreaterThan(0.35);
  });

  it('geçiş matrisi her rejimden çıkış bırakır — kilitlenme yok', () => {
    for (const regime of Object.keys(REGIME_TRANSITIONS) as MarketRegime[]) {
      const row = REGIME_TRANSITIONS[regime];
      expect(row.length).toBeGreaterThan(1);
      expect(row.every((r) => r.weight > 0)).toBe(true);
      // Kendi üstünde kalma en ağır seçenek ama tek seçenek değil.
      const others = row.filter((r) => r.to !== regime).reduce((s, r) => s + r.weight, 0);
      expect(others).toBeGreaterThan(0);
    }
  });

  it('trend MOMENTUMLA taşınır — bağımsız 34/32/34 çekilişi değil', () => {
    const series = days(400).map((m) => m.trend);
    let sticky = 0;
    for (let i = 1; i < series.length; i += 1) if (series[i] === series[i - 1]) sticky += 1;
    // Bağımsız çekilişte bu oran ~0.33 olurdu.
    expect(sticky / (series.length - 1)).toBeGreaterThan(0.45);
  });

  it('sakin rejimde yön daha ısrarcı, şokta daha kaygandır', () => {
    const persistence = (regime: MarketRegime) => {
      let same = 0;
      for (let i = 0; i < 3_000; i += 1) {
        const rng = new Rng(deriveSeed(SEED, `trend/${regime}`, i));
        if (nextTrend(rng, 1, regime) === 1) same += 1;
      }
      return same / 3_000;
    };
    expect(persistence('calm')).toBeGreaterThan(persistence('shock'));
  });

  it('olay SÜRELİ değişkendir: süresi dolana kadar taşınır', () => {
    const event = { ...EVENT_STUB, startedDay: 5, durationDays: 3 };

    // Süresi içindeyken aynı olay nesnesi taşınır — her gün yeni zar yok.
    expect(carryEvent(new Rng(1), event, 5, 'normal')).toBe(event);
    expect(carryEvent(new Rng(2), event, 6, 'normal')).toBe(event);
    expect(carryEvent(new Rng(3), event, 7, 'normal')).toBe(event);

    // Süresi dolduğunda bırakılır.
    expect(carryEvent(new Rng(4), event, 8, 'normal')).not.toBe(event);
  });

  it('rejim geçişi önceki rejimden türer', () => {
    // Sakinden şoka doğrudan sıçrama nadirdir; normale geçiş sık.
    const from = (prev: MarketRegime, target: MarketRegime) => {
      let hits = 0;
      for (let i = 0; i < 4_000; i += 1) {
        if (nextRegime(new Rng(deriveSeed(SEED, `reg/${prev}`, i)), prev) === target) hits += 1;
      }
      return hits / 4_000;
    };
    expect(from('calm', 'shock')).toBeLessThan(from('calm', 'normal'));
    expect(from('calm', 'calm')).toBeGreaterThan(from('shock', 'calm'));
  });

  it('olay etkisi süre ilerledikçe SÖNÜMLENİR', () => {
    const base = {
      regime: 'normal' as const,
      trend: 0 as const,
      volatility: 0.01,
      activeEvent: { ...EVENT_STUB, startedDay: 10 },
    };
    const taze = Math.abs(composeDailyMove(new Rng(7), { ...base, day: 10 }).eventImpact);
    const eski = Math.abs(composeDailyMove(new Rng(7), { ...base, day: 12 }).eventImpact);
    expect(eski).toBeLessThan(taze);
  });

  it('kontrollü RNG tek başına yönü belirleyemez', () => {
    // §5.1 "Kontrollü RNG ... sonucu KEYFİ veya TAMAMEN BAĞIMSIZ yapmaz."
    // Gürültü payı, diğer üç bileşenin toplam ağırlığından küçüktür.
    const others =
      MARKET_COMPOSITION.regime + MARKET_COMPOSITION.trend + MARKET_COMPOSITION.event;
    expect(MARKET_COMPOSITION.noise).toBeLessThan(others);
  });

  it('bileşenler ayrı ayrı okunabilir — sonuç açıklanabilir', () => {
    const move = composeDailyMove(new Rng(3), {
      regime: 'volatile',
      trend: 1,
      volatility: 0.012,
      activeEvent: { ...EVENT_STUB, startedDay: 4 },
      day: 4,
    });
    expect(move.total).toBeCloseTo(
      move.regimeDrift + move.trendMomentum + move.eventImpact + move.noise,
      10,
    );
  });

  it('GDD 13.4 — aynı (seed, gün) her zaman aynı piyasayı verir', () => {
    expect(days(30)).toEqual(days(30));
    // Ve farklı seed farklı seri üretir.
    expect(days(30, SEED + 1)).not.toEqual(days(30));
  });

  it('fiyat hiçbir günde sıfıra veya negatife düşmez (§11)', () => {
    for (const m of days(500)) {
      expect(m.goldSpot).toBeGreaterThan(0);
      expect(m.silverSpot).toBeGreaterThan(0);
      expect(m.fxIndex).toBeGreaterThan(0);
    }
  });

  it('uzun seride fiyat patlamaz veya çökmez — rejim sınırları tutuyor', () => {
    const series = days(500).map((m) => m.goldSpot);
    const first = series[0]!;
    const max = Math.max(...series);
    const min = Math.min(...series);
    expect(max / first).toBeLessThan(12);
    expect(min / first).toBeGreaterThan(0.08);
  });
});

// ===========================================================================
// §5 — OVERNIGHT EXPOSURE
// ===========================================================================

describe('§5 — Kapanış dağılımı bir pozisyondur', () => {
  it('pozisyon nakit ve metal payını ölçer', () => {
    const item = spawnItem(SEED, 1, 'quarter_gold');
    const items: Record<string, ItemInstance> = { [item.id]: item };
    const inv: InventoryPosition[] = [
      {
        itemId: item.id,
        quantity: 4,
        costBasis: 28_000,
        currentValue: 30_000,
        age: 1,
        demand: 'steady',
        thesis: null,
        location: 'display',
        expectedExitValues: {},
      },
    ];

    const p = measurePosition(1, 70_000, inv, items, market());
    expect(p.metalValue).toBe(30_000);
    expect(p.cash).toBe(70_000);
    expect(p.metalShare).toBeCloseTo(0.3, 6);
  });

  it('§5 — ALTINDA kalmak fiyat düşüşüne maruz bırakır', () => {
    const out = resolveOvernight(
      position({ cash: 0, metalValue: 100_000, metalShare: 1 }),
      market({ goldSpot: 3_800 }), // %-5
    );
    expect(out.metalDelta).toBeLessThan(0);
    expect(out.metalDelta).toBe(-5_000);
    // Düşüşte nakdin fırsat maliyeti YOKTUR.
    expect(out.cashOpportunityCost).toBe(0);
  });

  it('§5 — NAKİTTE kalmak yükseliş karşısında fırsat maliyeti üretir', () => {
    const out = resolveOvernight(
      position({ cash: 100_000, metalValue: 0, metalShare: 0 }),
      market({ goldSpot: 4_200 }), // %+5
    );
    expect(out.cashOpportunityCost).toBe(5_000);
    expect(out.metalDelta).toBe(0);
  });

  it('§5 DEĞİŞMEZ — hiçbir seçenek KOŞULSUZ GÜVENLİ değildir', () => {
    const yukselis = market({ goldSpot: 4_200 });
    const dusus = market({ goldSpot: 3_800 });

    const tamAltin = position({ cash: 0, metalValue: 100_000, metalShare: 1 });
    const tamNakit = position({ cash: 100_000, metalValue: 0, metalShare: 0 });

    // Altın: yükselişte kazanır, düşüşte kaybeder.
    expect(resolveOvernight(tamAltin, yukselis).metalDelta).toBeGreaterThan(0);
    expect(resolveOvernight(tamAltin, dusus).metalDelta).toBeLessThan(0);

    // Nakit: düşüşte bedelsiz, yükselişte bedelli.
    expect(resolveOvernight(tamNakit, dusus).cashOpportunityCost).toBe(0);
    expect(resolveOvernight(tamNakit, yukselis).cashOpportunityCost).toBeGreaterThan(0);
  });

  it('§5 DEĞİŞMEZ — hiçbir seçenek SÜREKLİ ÜSTÜN değildir', () => {
    // Gerçek fiyat serisinde iki uç pozisyonu karşılaştır: ikisi de kazandığı
    // ve kaybettiği geceler görmeli.
    const series = days(200);
    let altinKazandi = 0;
    let nakitKazandi = 0;

    for (let i = 1; i < series.length; i += 1) {
      const p = position({ goldSpot: series[i - 1]!.goldSpot });
      const out = resolveOvernight(p, series[i]!);
      if (out.spotChange > 0) altinKazandi += 1;
      if (out.spotChange < 0) nakitKazandi += 1;
    }

    expect(altinKazandi).toBeGreaterThan(20);
    expect(nakitKazandi).toBeGreaterThan(20);
  });

  it('GDD 34.5 — overnight sonucu gerçekleşmiş kâr DEĞİLDİR', () => {
    const out = resolveOvernight(position(), market({ goldSpot: 4_400 }));
    // Bu modül ledger'a dokunmaz; yalnız rapor üretir.
    expect(Object.keys(out)).toEqual([
      'position',
      'spotChange',
      'metalDelta',
      'cashOpportunityCost',
      'gapDays',
      'summary',
    ]);
  });

  it('fiyat yerinde kalırsa iki taraf da nötrdür', () => {
    const out = resolveOvernight(position(), market({ goldSpot: 4_000 }));
    expect(out.metalDelta).toBe(0);
    expect(out.cashOpportunityCost).toBe(0);
    expect(out.summary).toMatch(/yerinde/i);
  });

  it('sıfır pozisyonda bölme hatası olmaz (§11)', () => {
    const bos = position({ cash: 0, metalValue: 0, metalShare: 0, goldSpot: 0 });
    const out = resolveOvernight(bos, market());
    expect(out.spotChange).toBe(0);
    expect(out.metalDelta).toBe(0);
  });
});

// ===========================================================================
// §5.2 — SİNYALLER KESİNLİK İDDİA ETMEZ
// ===========================================================================

describe('§5.2 — Sinyaller karar desteğidir, garanti değildir', () => {
  const FORBIDDEN = /kesin|garanti|mutlaka|kesinlikle|yükselecek|düşecek|artacak|azalacak/i;

  it('hiçbir sinyal metni kesinlik dili kullanmaz', () => {
    for (const m of days(120)) {
      for (const signal of marketSignals(m, position())) {
        expect(signal.detail).not.toMatch(FORBIDDEN);
        expect(signal.label).not.toMatch(FORBIDDEN);
      }
    }
  });

  it('rejim, oynaklık ve pozisyon sinyalleri her zaman verilir', () => {
    const labels = marketSignals(market(), position()).map((x) => x.label);
    expect(labels).toContain('Rejim');
    expect(labels).toContain('Oynaklık');
    expect(labels).toContain('Pozisyon');
  });

  it('olay varsa olay sinyali eklenir', () => {
    const withEvent = market({ activeEvent: { ...EVENT_STUB, startedDay: 1 } });
    expect(marketSignals(withEvent, null).map((x) => x.label)).toContain('Olay');
  });

  it('şok rejim yüksek risk, sakin rejim düşük risk işaretlenir', () => {
    const sok = marketSignals(market({ regime: 'shock' }), null)[0]!;
    const sakin = marketSignals(market({ regime: 'calm' }), null)[0]!;
    expect(sok.level).toBe('high');
    expect(sakin.level).toBe('low');
  });

  it('pozisyon sinyali maruz kalınan riski söyler, doğru seçimi DEĞİL', () => {
    const altinAgir = marketSignals(market(), position({ metalShare: 0.9 })).find(
      (x) => x.label === 'Pozisyon',
    )!;
    const nakitAgir = marketSignals(market(), position({ metalShare: 0.1 })).find(
      (x) => x.label === 'Pozisyon',
    )!;

    expect(altinAgir.detail).toMatch(/düşüşüne açık/i);
    expect(nakitAgir.detail).toMatch(/fırsat maliyeti/i);
    // Hiçbiri "şunu yap" demiyor.
    expect(altinAgir.detail).not.toMatch(/satın|sat |al /i);
  });
});

const EVENT_STUB = {
  id: 'market_rally',
  label: 'Piyasa Rallisi',
  description: 'test',
  affects: ['talep'],
  counterplay: ['likidite'],
  durationDays: 2,
};
