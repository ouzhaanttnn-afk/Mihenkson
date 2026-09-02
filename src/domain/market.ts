/**
 * MIHENKAYNAK — Piyasa ve rejim motoru
 * Kaynak: GDD 13 "Piyasa ve Ekonomi Rejimleri".
 *
 * Değişmezler:
 *  - 13.3: Rejim ve ana yön gün başında belirlenir; gün içi adımlar rejim
 *    sınırları içinde hareket eder.
 *  - 13.4: Oyun yeniden açıldığında piyasa oyuncuya özel avantaj üretecek
 *    şekilde reroll edilmez → tüm hareket (day, seed) üzerinden türetilir.
 *  - 13.4: Event fiyat hareketleri tavanlıdır ve önceden kısmi sinyal verir.
 */

import {
  EVENT_DIRECTION,
  MARKET_BASE,
  MARKET_COMPOSITION,
  MARKET_DAILY_CAP,
  MARKET_MEAN_REVERSION,
  MARKET_NOMINAL_DRIFT,
  MARKET_REGIME,
  REGIME_DRIFT,
  REGIME_TRANSITIONS,
  REGIME_WEIGHTS,
} from './balance';
import { closedDaysBefore, isMarketOpen } from './calendar';
import { Rng, deriveSeed } from './rng';
import { bullionMeta } from '@data/bullion';
import type { MarketAsset, MarketEvent, MarketState, GameDay } from './types';

/** GDD 20.2 — dinamik olay en az iki sistemi etkiler ve karşı oyun sunar. */
const EVENT_POOL: Omit<MarketEvent, 'startedDay'>[] = [
  {
    id: 'wedding_season',
    label: 'Düğün Sezonu',
    description: 'Bilezik ve set talebi ile birlikte servis yoğunluğu artıyor.',
    affects: ['talep: klasik takı', 'atölye kapasitesi'],
    counterplay: ['Önceden stok kur', 'Vitrin önceliğini değiştir', 'Servis kapasitesi ayır'],
    durationDays: 3,
  },
  {
    id: 'market_rally',
    label: 'Piyasa Rallisi',
    description: 'Yatırım ürünü talebi artıyor, tedarik pahalanıyor.',
    affects: ['talep: yatırım altını', 'toptancı fiyat bandı'],
    counterplay: ['Likiditeyi koru', 'Kısa vade riskini azalt'],
    durationDays: 2,
  },
  {
    id: 'fx_calm',
    label: 'Kur Sakinleşmesi',
    description: 'Takı ve perakende talebi güçlenebilir.',
    affects: ['talep: perakende', 'vitrin dönüş hızı'],
    counterplay: ['Vitrin kampanyası', 'Servis + satış paketi'],
    durationDays: 2,
  },
  {
    id: 'fake_wave',
    label: 'Sahte Ürün Dalgası',
    description: 'Riskli müşteri oranı yükseliyor. Doğrulama daha değerli.',
    affects: ['müşteri havuzu riski', 'ekspertiz değeri'],
    counterplay: ['Daha fazla doğrulama testi', 'Alış tavanını düşür'],
    durationDays: 2,
  },
];

/**
 * Bir gün için piyasa durumunu deterministik olarak üretir.
 * Aynı (rootSeed, day) her zaman aynı rejim, trend ve spot üretir — reload
 * avantajı imkânsızdır (GDD 13.4 / 28.3).
 */
export function createMarketForDay(rootSeed: number, day: GameDay, prev?: MarketState): MarketState {
  // Cumartesi–pazar kotasyonu cuma kapanışında donar; kapalı gün RNG tüketmez.
  if (!isMarketOpen(day)) {
    if (prev) return frozenMarket(day, prev);
    // Test, eski kayıt yeniden kurma ve doğrudan gün açılışları da aynı takvim
    // zincirini izlemeli; kapalı günü tek başına üretmek piyasa açmamalıdır.
    let reconstructed = createMarketForDay(rootSeed, 1);
    for (let d = 2; d <= day; d += 1) {
      reconstructed = createMarketForDay(rootSeed, d, reconstructed);
    }
    return reconstructed;
  }

  const rng = new Rng(deriveSeed(rootSeed, 'market/day', day));

  // --- 1. REJİM: bir DURUM, günlük çekiliş değil (§5.1) ---
  const regime = nextRegime(rng, prev?.regime ?? null);

  // --- 2. TREND: momentumla taşınır (§5.1) ---
  const trend = nextTrend(rng, prev?.trend ?? 0, regime);

  const cfg = MARKET_REGIME[regime];
  // Volatilite bandın her noktasında eşit olasılıklı değildir. Üç örneğin
  // ortalaması normal günleri merkeze toplar, uç günleri doğal olarak seyrek
  // bırakır.
  const volatility = rng.centered(...cfg.dailyMove);

  // --- 3. OLAY: "SÜRELİ değişken" (§5.1) ---
  // Olay her gün yeniden çekilmez; süresi dolana kadar taşınır ve etkisi
  // sönümlenir. Her gün yeni olay çekmek, olayı bir haber değil bir zar
  // yapardı.
  const activeEvent = carryEvent(rng, prev?.activeEvent ?? null, day, regime);

  const prevGold = prev?.goldSpot ?? MARKET_BASE.goldGram;
  const prevSilver = prev?.silverSpot ?? MARKET_BASE.silverGram;
  const prevFx = prev?.fxIndex ?? MARKET_BASE.usd;
  const previousAnchor = prev?.macroAnchor ?? {
    goldSpot: MARKET_BASE.goldGram,
    silverSpot: MARKET_BASE.silverGram,
    fxIndex: MARKET_BASE.usd,
  };
  const macroAnchor = {
    goldSpot: followMacroAnchor(previousAnchor.goldSpot, prevGold),
    silverSpot: followMacroAnchor(previousAnchor.silverSpot, prevSilver),
    fxIndex: followMacroAnchor(previousAnchor.fxIndex, prevFx),
  };

  // Pazartesi iki kapalı günün haberini tek açılışta fiyatlar: √3 ölçeği.
  const span = closedDaysBefore(day) + 1;
  const spanScale = Math.sqrt(span);

  // --- 4. AĞIRLIKLI BİLEŞİM (§5.1) ---
  //
  // §5.1 DEĞİŞMEZ: "Ertesi gün fiyatı basit ve BAĞIMSIZ bir 50/50 yükseliş-
  // düşüş çekilişiyle belirlenmez." Dört bileşenin ağırlıklı sonucudur ve
  // hiçbiri tek başına yönü belirlemez:
  const move = composeDailyMove(rng, { regime, trend, volatility, activeEvent, day });

  // Hafta sonu haber yükü hareketin olasılığını/büyüklüğünü artırabilir; ancak
  // pazartesi de tek bir işlem günüdür ve ±%3 güvenlik tavanını aşamaz.
  const cap = MARKET_DAILY_CAP;
  const goldMove =
    (move.total +
      MARKET_NOMINAL_DRIFT.gold +
      meanReversionNudge(prevGold, macroAnchor.goldSpot)) *
    spanScale;
  const silverMove =
    (move.total * rng.range(0.8, 1.6) +
      MARKET_NOMINAL_DRIFT.silver +
      meanReversionNudge(prevSilver, macroAnchor.silverSpot)) *
    spanScale;
  const fxMove =
    (move.total * 0.3 +
      MARKET_NOMINAL_DRIFT.fx +
      meanReversionNudge(prevFx, macroAnchor.fxIndex)) *
    spanScale;
  const goldSpot = priceAfterSoftLimit(prevGold, goldMove, cap);
  const silverSpot = priceAfterSoftLimit(prevSilver, silverMove, cap);
  const fxIndex = priceAfterSoftLimit(prevFx, fxMove, cap);
  const dayOpen = { goldSpot, silverSpot, fxIndex };

  const assets = buildAssets(
    { goldSpot, silverSpot, fxIndex },
    { goldSpot: prevGold, silverSpot: prevSilver, fxIndex: prevFx },
    prev,
  );

  return {
    day,
    clockMinutes: 9 * 60,
    goldSpot,
    silverSpot,
    fxIndex,
    regime,
    trend,
    volatility,
    activeEvent,
    assets,
    dayOpen,
    macroAnchor,
    marketOpen: true,
    gapDays: span - 1,
    lastIntradayStepIndex: Math.floor((9 * 60) / 15) - 1,
    seed: rootSeed,
  };
}

function followMacroAnchor(anchor: number, observedPrice: number): number {
  if (!(anchor > 0)) return observedPrice;
  if (!(observedPrice > 0)) return anchor;
  return anchor + (observedPrice - anchor) * MARKET_MEAN_REVERSION.anchorFollow;
}

/**
 * Referans fiyatın çevresindeki serbest banttan sonra çalışan tavanlı geri
 * çağırma kuvveti. Pozitif değer düşük fiyatı yukarı, negatif değer yüksek
 * fiyatı aşağı iter. Saf ve test edilebilir tutulur.
 */
export function meanReversionNudge(current: number, reference: number): number {
  if (!(current > 0) || !(reference > 0)) return 0;
  const deviation = (reference - current) / reference;
  const excess = Math.max(0, Math.abs(deviation) - MARKET_MEAN_REVERSION.freeBand);
  if (excess === 0) return 0;
  const raw = Math.sign(deviation) * excess * MARKET_MEAN_REVERSION.strength;
  return Math.max(-MARKET_MEAN_REVERSION.dailyCap, Math.min(MARKET_MEAN_REVERSION.dailyCap, raw));
}

/** Kapalı piyasa: fiyat, rejim ve trend değişmez; yalnız takvim ilerler. */
function frozenMarket(day: GameDay, prev: MarketState): MarketState {
  const quote = { goldSpot: prev.goldSpot, silverSpot: prev.silverSpot, fxIndex: prev.fxIndex };
  const activeEvent =
    prev.activeEvent && day - prev.activeEvent.startedDay < prev.activeEvent.durationDays
      ? prev.activeEvent
      : null;
  return {
    ...prev,
    day,
    clockMinutes: 9 * 60,
    ...quote,
    activeEvent,
    assets: prev.assets.map((asset) => ({ ...asset, changePct: 0 })),
    dayOpen: quote,
    marketOpen: false,
    gapDays: 0,
    lastIntradayStepIndex: Math.floor((9 * 60) / 15) - 1,
  };
}

/**
 * Hareketin merkezdeki bölümünü aynen bırakır; tavanın son %28'ine girince
 * üstel biçimde yumuşatır. Böylece ±%3 bir sonuç seçeneği değil güvenlik
 * sınırıdır: fiyat yaklaşabilir ama clamp yüzünden tam %3'e yapışmaz.
 */
export function softLimitMove(move: number, cap = MARKET_DAILY_CAP): number {
  if (!(cap > 0) || !Number.isFinite(move)) return 0;
  const sign = Math.sign(move);
  const magnitude = Math.abs(move);
  const inner = cap * 0.72;
  if (magnitude <= inner) return move;
  const room = cap - inner;
  const softened = inner + room * (1 - Math.exp(-(magnitude - inner) / room));
  return sign * Math.min(softened, cap * (1 - 1e-9));
}

function priceAfterSoftLimit(anchor: number, move: number, cap = MARKET_DAILY_CAP): number {
  if (!(anchor > 0)) return round2(anchor);
  return round2(anchor * (1 + softLimitMove(move, cap)));
}

/** Gün içi ham fiyatı açılışa göre aynı yumuşak güvenlik bandına alır. */
function softBoundedPrice(raw: number, anchor: number, cap = MARKET_DAILY_CAP): number {
  if (!(anchor > 0)) return round2(raw);
  return priceAfterSoftLimit(anchor, raw / anchor - 1, cap);
}

/** §5.1 fiyat bileşenlerinin tek tek katkısı — §5.2 sinyalleri buradan okur. */
export interface DailyMove {
  regimeDrift: number;
  trendMomentum: number;
  eventImpact: number;
  noise: number;
  total: number;
}

/**
 * §5.1 — dört bileşenin AĞIRLIKLI sonucu.
 *
 * "Kontrollü RNG: rejim ve olay sınırları içinde belirsizlik üretir; sonucu
 * KEYFİ veya TAMAMEN BAĞIMSIZ yapmaz." Bu yüzden gürültü bağımsız bir yön
 * çekilişi değil, toplam hareketin sınırlı bir payıdır ve rejimin
 * volatilitesiyle ölçeklenir.
 */
export function composeDailyMove(
  rng: Rng,
  input: {
    regime: MarketState['regime'];
    trend: -1 | 0 | 1;
    volatility: number;
    activeEvent: MarketEvent | null;
    day: GameDay;
  },
): DailyMove {
  const cfg = MARKET_REGIME[input.regime];
  const w = MARKET_COMPOSITION;

  // Rejim kayması: stres rejimleri aşağı eğilimlidir, sakin rejim nötre yakın.
  const regimeDrift = REGIME_DRIFT[input.regime] * input.volatility * w.regime;

  // Trend momentumu: dünün yönü bugüne taşınır, ama tek başına yetmez.
  const trendMomentum = input.trend * input.volatility * w.trend;

  // Olay etkisi: süresi ilerledikçe sönümlenir; tavanı rejim tarafından
  // belirlenir (GDD 13.4 "event hareketleri tavanlıdır").
  let eventImpact = 0;
  if (input.activeEvent) {
    const age = input.day - input.activeEvent.startedDay;
    const decay = Math.max(0, 1 - age / Math.max(1, input.activeEvent.durationDays));
    // Tanımsız olay yönü sessizce 0 olur; bilinmeyen bir haber fiyatı itmez.
    const direction = EVENT_DIRECTION[input.activeEvent.id] ?? 0;
    eventImpact = direction * rng.band(cfg.eventMove) * decay * w.event;
  }

  // Kontrollü RNG: yönü değil, sapmayı üretir.
  const noise = rng.centered(-1, 1) * input.volatility * w.noise;

  return {
    regimeDrift,
    trendMomentum,
    eventImpact,
    noise,
    total: regimeDrift + trendMomentum + eventImpact + noise,
  };
}

/**
 * §5.1 "Piyasa rejimi: ... DURUM." Rejim bir durumdur; her gün sıfırdan
 * çekilmez, geçiş olasılıklarıyla evrilir. Sıfırdan çekmek, rejimi bir
 * durum değil ikinci bir zar yapardı.
 */
export function nextRegime(rng: Rng, prev: MarketState['regime'] | null): MarketState['regime'] {
  if (!prev) return rng.pickWeighted(REGIME_WEIGHTS);
  const row = REGIME_TRANSITIONS[prev];
  return rng.pickWeighted(row.map((r) => ({ value: r.to, weight: r.weight })));
}

/**
 * §5.1 — yön de momentumla taşınır. Bağımsız 34/32/34 çekilişi, §5.1'in
 * açıkça reddettiği "bağımsız 50/50" ile aynı şeydi.
 */
export function nextTrend(
  rng: Rng,
  prev: -1 | 0 | 1,
  regime: MarketState['regime'],
): -1 | 0 | 1 {
  // Stresli rejimde yön daha kaygan; sakin rejimde daha ısrarcı.
  const persistence =
    regime === 'calm' ? 0.72 : regime === 'normal' ? 0.6 : regime === 'volatile' ? 0.44 : 0.3;

  if (rng.chance(persistence)) return prev;
  return rng.pickWeighted([
    { value: -1 as const, weight: regime === 'shock' ? 42 : 34 },
    { value: 0 as const, weight: 32 },
    { value: 1 as const, weight: regime === 'shock' ? 26 : 34 },
  ]);
}

/**
 * §5.1 "Olay etkisi: ... SÜRELİ değişken." Aktif olay süresi dolana kadar
 * taşınır; yeni olay ancak eskisi bittiğinde çıkabilir.
 */
export function carryEvent(
  rng: Rng,
  prev: MarketEvent | null,
  day: GameDay,
  regime: MarketState['regime'],
): MarketEvent | null {
  if (prev && day - prev.startedDay < prev.durationDays) return prev;

  const eventChance = regime === 'shock' ? 0.85 : regime === 'volatile' ? 0.45 : 0.14;
  if (day <= 1 || !rng.chance(eventChance)) return null;

  const template = rng.pick(EVENT_POOL);
  return { ...template, startedDay: day };
}

/**
 * Gün içi mikro adım. GDD 13.3 — "gün içinde küçük fiyat adımları bu rejimin
 * sınırları içinde hareket eder". Adım da (day, clock) ile deterministiktir.
 */
export function stepMarketIntraday(market: MarketState, newClockMinutes: number): MarketState {
  if (market.marketOpen === false) return { ...market, clockMinutes: newClockMinutes };

  const targetStep = Math.floor(newClockMinutes / 15);
  const open = market.dayOpen ?? {
    goldSpot: market.goldSpot,
    silverSpot: market.silverSpot,
    fxIndex: market.fxIndex,
  };

  /*
   * Aynı 15 dakikalık kova yalnız BİR KEZ uygulanır. Eski kod her render/tick
   * çağrısında aynı deterministik hareketi mevcut fiyatın üzerine yeniden
   * çarpıyordu; sonuç FPS ve cihaz hızına göre bileşikleşebiliyordu.
   *
   * Saat birden fazla kovayı atlarsa aradaki kovalar sırayla işlenir. Böylece
   * 1x/4x hız veya geciken bir frame aynı kapanış fiyatını üretir.
   */
  const fallbackLast = market.dayOpen
    ? Math.floor((9 * 60) / 15) - 1
    : targetStep - 1;
  const lastApplied = market.lastIntradayStepIndex ?? fallbackLast;
  if (targetStep <= lastApplied) return { ...market, clockMinutes: newClockMinutes };

  let goldSpot = market.goldSpot;
  let silverSpot = market.silverSpot;
  let fxIndex = market.fxIndex;
  const stepScale = market.volatility * 0.12;

  for (let stepIndex = lastApplied + 1; stepIndex <= targetStep; stepIndex += 1) {
    const rng = new Rng(deriveSeed(market.seed, `market/intraday/${market.day}`, stepIndex));
    const nudge = (rng.next() - 0.5) * 2 * stepScale + market.trend * stepScale * 0.35;
    goldSpot = softBoundedPrice(goldSpot * (1 + nudge), open.goldSpot);
    silverSpot = softBoundedPrice(
      silverSpot * (1 + nudge * rng.range(0.9, 1.4)),
      open.silverSpot,
    );
    fxIndex = softBoundedPrice(fxIndex * (1 + nudge * 0.25), open.fxIndex);
  }

  const assets = market.assets.map((asset) => {
    const value = priceForAsset(asset.id, { goldSpot, silverSpot, fxIndex });
    const base = priceForAsset(asset.id, open);
    return {
      ...asset,
      price: value,
      changePct: base === 0 ? 0 : ((value - base) / base) * 100,
      history: [...asset.history.slice(-23), value],
    };
  });

  return {
    ...market,
    clockMinutes: newClockMinutes,
    goldSpot,
    silverSpot,
    fxIndex,
    assets,
    dayOpen: open,
    lastIntradayStepIndex: targetStep,
  };
}

type Spots = { goldSpot: number; silverSpot: number; fxIndex: number };

function priceForAsset(id: MarketAsset['id'], spots: Spots): number {
  switch (id) {
    case 'goldGram':
      return round2(spots.goldSpot * bullionMeta('gram_gold_1')!.unitPurity);
    case 'silverGram':
      return round2(spots.silverSpot);
    case 'quarterGold':
      // GDD 13.1 — ürün fiyatları ayar/saflık ve ticari spread üzerinden
      // ana referanstan türer. Bağımsız fiyat = arbitraj açığı olurdu (13.4).
      return round2(
        spots.goldSpot *
          MARKET_BASE.quarterGoldWeight *
          bullionMeta('quarter_gold')!.unitPurity,
      );
    case 'usd':
      return round2(spots.fxIndex);
    case 'eur':
      return round2(spots.fxIndex * (MARKET_BASE.eur / MARKET_BASE.usd));
  }
}

function buildAssets(spots: Spots, prevSpots: Spots, prev?: MarketState): MarketAsset[] {
  const defs: { id: MarketAsset['id']; label: string; unit: string }[] = [
    { id: 'goldGram', label: 'Gram Altın', unit: '₺/g' },
    { id: 'quarterGold', label: 'Çeyrek', unit: '₺' },
    { id: 'silverGram', label: 'Gümüş', unit: '₺/g' },
    { id: 'usd', label: 'Dolar', unit: '₺' },
    { id: 'eur', label: 'Euro', unit: '₺' },
  ];

  return defs.map((def) => {
    const price = priceForAsset(def.id, spots);
    const prevPrice = priceForAsset(def.id, prevSpots);
    const prevHistory = prev?.assets.find((a) => a.id === def.id)?.history ?? [];
    return {
      id: def.id,
      label: def.label,
      unit: def.unit,
      price,
      changePct: prevPrice === 0 ? 0 : ((price - prevPrice) / prevPrice) * 100,
      // Gün açılışında history yeniden başlar; ilk eleman günün referansıdır.
      history: [price, ...prevHistory.slice(0, 11)],
    };
  });
}

/** Ürünün metal cinsine göre anlık gram spotu. */
export function spotFor(market: MarketState, metal: 'gold' | 'silver'): number {
  return metal === 'gold' ? market.goldSpot : market.silverSpot;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
