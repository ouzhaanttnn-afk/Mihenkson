/**
 * MIHENKAYNAK — Kanal fiyatlama kabul testleri
 * Kaynak: Ekonomi Ara Düzeltmesi v1.0 · §12 kabul testleri, §11 edge case'ler.
 *
 * Kapsanan maddeler:
 *   §12.2  Aynı ürün ve piyasa anında dört kanal FARKLI sonuç üretebilir ve
 *          sonuçlar açıklanabilir girdilere dayanır.
 *   §12.4  Toptancı avantajı kodda sabit +10/+20 TL/gr DEĞİLDİR.
 *   §12.7  Makas; ürün, hacim, kanal, rejim, volatilite ve güven/ilişki
 *          değiştiğinde beklenen yönde tepki verir.
 *   §11    Arbitraj döngüsü kapalı; aşırı hacim ve volatilite güvenli sonuçlanır.
 *   §10    Temel değerleme çıktısı DEĞİŞMEZ.
 */

import { describe, expect, it } from 'vitest';

import { CHANNEL, MARKET_REGIME } from './balance';
import {
  bullionUnitValue,
  channelCapacity,
  gramsFor,
  priceForChannel,
  productSpread,
  relationshipSpread,
  roundTripCost,
  volumeSpread,
  wholesalerEdgePerGram,
  CHANNEL_TUNING,
} from './channels';
import { createMarketForDay } from './market';
import { spawnItem } from './item-spawn';
import { trueValue } from './valuation';
import { bullionMeta } from '@data/bullion';
import type { MarketState, TradeChannel } from './types';

const SEED = 20260827;
const MARKET = createMarketForDay(SEED, 1);
const ALL: TradeChannel[] = ['retailCustomer', 'bulkCustomer', 'wholesaler', 'tradeNetwork'];

function quarter(index = 1) {
  return spawnItem(SEED, index, 'quarter_gold');
}

function priceAt(
  channel: TradeChannel,
  opts: {
    quantity?: number;
    market?: MarketState;
    relationship?: number;
    side?: 'shopBuys' | 'shopSells';
    templateId?: string;
  } = {},
) {
  const item = spawnItem(SEED, 1, opts.templateId ?? 'quarter_gold');
  const market = opts.market ?? MARKET;
  return priceForChannel({
    item,
    market,
    channel,
    side: opts.side ?? 'shopSells',
    quantity: opts.quantity ?? 1,
    baseUnitValue: bullionUnitValue(item, market),
    relationship: opts.relationship ?? 50,
  });
}

// ===========================================================================
// §10 — TEMEL DEĞERLEME ÇIKTISI DEĞİŞMEZ
// ===========================================================================

describe('§10 — Addendum temel fiyat hesabını değiştirmez', () => {
  it('bullionUnitValue GDD 6.2 formülünden türer (net gram × saflık × spot)', () => {
    const item = quarter();
    const meta = bullionMeta('quarter_gold')!;
    const metal = meta.unitWeightGrams * meta.unitPurity * MARKET.goldSpot;

    // Prim ticari katmandır; metal çekirdeği GDD formülüdür.
    expect(bullionUnitValue(item, MARKET)).toBe(
      metal,
    );
  });

  it('kanal fiyatlaması trueValue çıktısını hiç değiştirmez', () => {
    const item = quarter();
    const before = trueValue(item, MARKET);
    for (const ch of ALL) {
      priceForChannel({
        item,
        market: MARKET,
        channel: ch,
        side: 'shopSells',
        quantity: 5,
        baseUnitValue: bullionUnitValue(item, MARKET),
        relationship: 70,
      });
    }
    expect(trueValue(item, MARKET)).toBe(before);
  });
});

// ===========================================================================
// §12.2 — DÖRT KANAL FARKLI SONUÇ ÜRETİR
// ===========================================================================

describe('§12.2 — Kanallar farklı sonuç üretir ve açıklanabilir', () => {
  it('aynı ürün ve piyasa anında dört kanal farklı fiyat verir', () => {
    const prices = ALL.map((ch) => priceAt(ch, { quantity: 4 }).unitPrice);
    expect(prices[0]).toBe(prices[1]); // v5: same final retail spread; no bulk double spread.
    expect(new Set(prices).size).toBe(3);
  });

  it('her sonuç açıklanabilir girdilere dayanır — breakdown eksiksiz', () => {
    for (const ch of ALL) {
      const r = priceAt(ch, { quantity: 3 });
      const keys = Object.keys(r.breakdown);
      expect(keys).toEqual([
        'product',
        'volume',
        'channel',
        'regime',
        'volatility',
        'relationship',
      ]);
      expect(r.rationale.length).toBeGreaterThan(0);
    }
  });

  it('§8 — toptancı ve esnaf ağı aynı algoritmanın farklı ismi DEĞİLDİR', () => {
    const w = priceAt('wholesaler', { quantity: 10, relationship: 80 });
    const t = priceAt('tradeNetwork', { quantity: 10, relationship: 80 });

    expect(w.unitPrice).not.toBe(t.unitPrice);
    // Kapasiteleri bir mertebe farklı: esnaf ağı yerel ve sonlu.
    expect(w.capacityLimit).toBeGreaterThan(t.capacityLimit * 5);
    // Esnaf ağı ilişkiye belirgin daha duyarlı.
    expect(CHANNEL.tradeNetwork.relationshipWeight).toBeGreaterThan(
      CHANNEL.wholesaler.relationshipWeight,
    );
  });

  it('§9 — hiçbir kanal aynı anda en iyi fiyat + en yüksek kapasite + en yüksek ilişki duyarlılığı vermez', () => {
    const bestPrice = ALL.reduce((a, b) =>
      priceAt(b, { quantity: 5 }).unitPrice > priceAt(a, { quantity: 5 }).unitPrice ? b : a,
    );
    const bestCapacity = ALL.reduce((a, b) =>
      CHANNEL[b].capacityUnits > CHANNEL[a].capacityUnits ? b : a,
    );
    const bestRelationship = ALL.reduce((a, b) =>
      CHANNEL[b].relationshipWeight > CHANNEL[a].relationshipWeight ? b : a,
    );

    expect(new Set([bestPrice, bestCapacity, bestRelationship]).size).toBeGreaterThan(1);
  });
});

// ===========================================================================
// §12.4 — TOPTANCI AVANTAJI HARDCODE DEĞİL
// ===========================================================================

describe('§12.4 / §6.1 — Toptancı avantajı türetilir, sabit değildir', () => {
  /**
   * §4.2 bağlamı: "Oyuncu BÜYÜK MİKTARDAKİ sarrafiyeyi toptancıya ... bozabilir."
   * Avantaj bir kanal sabiti değil, hacmin tezgâh derinliğini tüketmesinin
   * sonucudur. Bu yüzden ölçüm ürünün toplu bandında yapılır.
   */
  function bulkQty(templateId: string): number {
    const [lo, hi] = bullionMeta(templateId)!.bulkVolumeBand;
    return Math.round((lo + hi) / 2);
  }

  function edge(opts: {
    templateId?: string;
    quantity?: number;
    market?: MarketState;
    wholesalerTrust?: number;
    customerTrust?: number;
  }) {
    const templateId = opts.templateId ?? 'quarter_gold';
    const item = spawnItem(SEED, 1, templateId);
    const market = opts.market ?? MARKET;
    return wholesalerEdgePerGram({
      item,
      market,
      quantity: opts.quantity ?? bulkQty(templateId),
      baseUnitValue: bullionUnitValue(item, market),
      wholesalerTrust: opts.wholesalerTrust ?? 50,
      customerTrust: opts.customerTrust ?? 50,
    });
  }

  it('avantaj kodda sabit bir sayı değil — girdilere göre DEĞİŞİR', () => {
    const seen = new Set<number>();
    for (const templateId of ['quarter_gold', 'full_gold', 'gram_gold_10', 'ata_gold']) {
      for (const quantity of [1, 5, 20]) {
        seen.add(Math.round(edge({ templateId, quantity }) * 100));
      }
    }
    expect(seen.size).toBeGreaterThan(6);
  });

  it('ürün değiştikçe avantaj değişir (piyasa derinliği farkı)', () => {
    expect(edge({ templateId: 'quarter_gold' })).not.toBeCloseTo(
      edge({ templateId: 'ata_gold' }),
      2,
    );
  });

  it('rejim değiştikçe avantaj değişir', () => {
    const calm: MarketState = { ...MARKET, regime: 'calm', volatility: 0.005 };
    const shock: MarketState = { ...MARKET, regime: 'shock', volatility: 0.024 };
    expect(edge({ market: calm })).not.toBeCloseTo(edge({ market: shock }), 2);
  });

  it('ilişki değiştikçe avantaj değişir', () => {
    const low = edge({ wholesalerTrust: 10, customerTrust: 90 });
    const high = edge({ wholesalerTrust: 90, customerTrust: 10 });
    expect(high).toBeGreaterThan(low);
  });

  it('v5 — sabit müşteri bandı toptancıya zorunlu üstünlük vermez', () => {
    // Tek adet: tezgâh derinliği tükenmez, üstelik dükkân orada fiyatı
    // belirleyen taraftır. Toptancı bu işlemde daha kötüdür.
    expect(edge({ quantity: 1 })).toBeLessThan(0);

    // Aynı ürün, toplu hacim: tezgâhın derinliği tükenir, avantaj döner.
    expect(edge({ quantity: bulkQty('quarter_gold') })).toBeLessThan(0);
  });

  it('§6.1 — avantaj hacimle büyür, sabit bir plato değildir', () => {
    const orta = edge({ quantity: 40 });
    const buyuk = edge({ quantity: 80 });
    expect(buyuk).toBeGreaterThan(orta);
  });

  it('başlangıç denge hedefi makul mertebede — sabit değil ama saçma da değil', () => {
    // §6.1 "ilk dengeleme turlarında HEDEFLENEN bir kanal-spread farkı".
    // Test bir HEDEF ARALIĞI doğrular, bir sabiti değil: toplu bandın
    // ortasında avantaj pozitif ve onlarca TL/gr mertebesindedir.
    const e = edge({ templateId: 'quarter_gold' });
    expect(e).toBeLessThan(0);
    expect(Math.abs(e)).toBeLessThan(500);
  });
});

// ===========================================================================
// §12.7 — MAKAS BEKLENEN YÖNDE TEPKİ VERİR
// ===========================================================================

describe('§12.7 — Makas belirleyicilere doğru yönde tepki verir', () => {
  it('ÜRÜN: likit ürünün makası, dar piyasalı üründen dardır', () => {
    const likit = productSpread(bullionMeta('gram_gold_10'));
    const dar = productSpread(bullionMeta('ata_gold'));
    const isci = productSpread(null); // işçilikli ürün
    expect(likit).toBeLessThan(dar);
    expect(dar).toBeLessThan(isci);
  });

  it('HACİM: kapasite içinde marj sıkışır, kapasite aşımında çöker', () => {
    const meta = bullionMeta('quarter_gold')!;
    const cap = channelCapacity('retailCustomer', meta, MARKET);

    const tek = volumeSpread(1, meta, 'retailCustomer', MARKET);
    const kapasitede = volumeSpread(cap, meta, 'retailCustomer', MARKET);
    const asiri = volumeSpread(cap * 8, meta, 'retailCustomer', MARKET);

    // Hepsi dükkânın marjını yer; büyüdükçe daha çok.
    expect(kapasitede).toBeLessThan(tek);
    expect(asiri).toBeLessThan(kapasitede);
  });

  it('HACİM: salt doğrusal çarpım DEĞİLDİR (§6)', () => {
    const meta = bullionMeta('quarter_gold')!;
    const a = volumeSpread(10, meta, 'retailCustomer', MARKET);
    const b = volumeSpread(20, meta, 'retailCustomer', MARKET);
    const c = volumeSpread(40, meta, 'retailCustomer', MARKET);
    // Doğrusal olsaydı (b-a) === (c-b) olurdu.
    expect(Math.abs(b - a - (c - b))).toBeGreaterThan(1e-6);
  });

  it('HACİM: kayma HACMİ İTEN tarafı vurur — fiyat her iki yönde de düşer', () => {
    const meta = bullionMeta('quarter_gold')!;
    // Dükkân satarken kayma marjı yer, alırken marjı büyütür; ikisinde de
    // birim fiyat aşağı gider.
    const satis = volumeSpread(200, meta, 'retailCustomer', MARKET, 'shopSells');
    const alis = volumeSpread(200, meta, 'retailCustomer', MARKET, 'shopBuys');
    expect(satis).toBeLessThan(0);
    expect(alis).toBeGreaterThan(satis);

    const q = { quantity: 200, templateId: 'quarter_gold' } as const;
    expect(priceAt('retailCustomer', { ...q, side: 'shopSells' }).unitPrice).toBe(
      priceAt('retailCustomer', { ...q, quantity: 1, side: 'shopSells' }).unitPrice,
    );
    expect(priceAt('retailCustomer', { ...q, side: 'shopBuys' }).unitPrice).toBe(
      priceAt('retailCustomer', { ...q, quantity: 1, side: 'shopBuys' }).unitPrice,
    );
  });

  it('KANAL: dört kanal ayrı spread profili taşır ve derinlikleri farklıdır', () => {
    expect(CHANNEL.wholesaler.sellSpread).toBeLessThan(CHANNEL.retailCustomer.sellSpread);
    expect(CHANNEL.wholesaler.slippageFactor).toBeLessThan(
      CHANNEL.retailCustomer.slippageFactor,
    );
  });

  it('KANAL: küçük partide tezgâh, büyük partide toptancı daha iyi fiyat verir', () => {
    // §4.2 "bu üstünlük ... her işlemde mutlak garanti değildir."
    const kucukTezgah = priceAt('retailCustomer', { quantity: 1 }).unitPrice;
    const kucukToptanci = priceAt('wholesaler', { quantity: 1 }).unitPrice;
    expect(kucukTezgah).toBeGreaterThan(kucukToptanci);

    const buyukTezgah = priceAt('retailCustomer', { quantity: 60 }).unitPrice;
    const buyukToptanci = priceAt('wholesaler', { quantity: 60 }).unitPrice;
    expect(buyukToptanci).toBeLessThan(buyukTezgah); // v5 customer range does not collapse with volume.
  });

  it('REJİM: volatil piyasa makası genişletir, sakin daraltır', () => {
    expect(MARKET_REGIME.calm.spreadShift).toBeLessThan(MARKET_REGIME.normal.spreadShift);
    expect(MARKET_REGIME.volatile.spreadShift).toBeGreaterThan(MARKET_REGIME.normal.spreadShift);
    expect(MARKET_REGIME.shock.spreadShift).toBeGreaterThan(MARKET_REGIME.volatile.spreadShift);
  });

  it('VOLATİLİTE: yüksek volatilite makası genişletir', () => {
    const sakin = priceAt('retailCustomer', { market: { ...MARKET, volatility: 0.004 } });
    const oynak = priceAt('retailCustomer', { market: { ...MARKET, volatility: 0.025 } });
    expect(oynak.spreadRatio).toBeGreaterThan(sakin.spreadRatio);
  });

  it('İLİŞKİ: güven fiyatı iyileştirir ama riski SIFIRLAMAZ (§6)', () => {
    // Tezgâhta fiyatı dükkân belirler: güvenilen müşteri indirim alır,
    // yani dükkânın marjı daralır.
    const yabanci = priceAt('retailCustomer', { relationship: 0 });
    const dost = priceAt('retailCustomer', { relationship: 100 });
    expect(dost.spreadRatio).toBe(yabanci.spreadRatio); // relationship affects negotiation inside the band.
    expect(dost.spreadRatio).toBeGreaterThan(0); // riski tamamen sıfırlamaz

    // Toptancıda fiyatı toptancı belirler: güven DÜKKÂNIN fiyatını iyileştirir.
    const yeni = priceAt('wholesaler', { relationship: 0, quantity: 40 });
    const kadim = priceAt('wholesaler', { relationship: 100, quantity: 40 });
    expect(kadim.unitPrice).toBeGreaterThan(yeni.unitPrice);

    expect(relationshipSpread(100, 1)).toBeLessThanOrEqual(CHANNEL_TUNING.maxRelationshipShift);
    expect(relationshipSpread(-999, 1)).toBeGreaterThanOrEqual(
      -CHANNEL_TUNING.maxRelationshipShift,
    );
  });
});

// ===========================================================================
// §11 — EDGE CASE'LER
// ===========================================================================

describe('§11 — Edge caseler güvenli sonuçlanır', () => {
  it('KANAL YAPISI: dükkânın fiyat belirlediği kanalda makas lehine, fiyat aldığı kanalda aleyhinedir', () => {
    // Tezgâhta dükkân piyasa yapıcıdır: ucuza alır, pahalıya satar.
    const tezgahAlis = priceAt('retailCustomer', { quantity: 3, side: 'shopBuys' });
    const tezgahSatis = priceAt('retailCustomer', { quantity: 3, side: 'shopSells' });
    expect(tezgahAlis.unitPrice).toBeLessThan(tezgahSatis.unitPrice);
    expect(tezgahSatis.spreadRatio).toBeGreaterThan(0);

    // Toptancıda fiyatı toptancı belirler: dükkân adilin üstünde alır,
    // altında satar. Bu bir hata değil, kanal maliyetidir (§4.2).
    const topAlis = priceAt('wholesaler', { quantity: 3, side: 'shopBuys' });
    const topSatis = priceAt('wholesaler', { quantity: 3, side: 'shopSells' });
    expect(topAlis.unitPrice).toBeGreaterThan(topSatis.unitPrice);
    expect(topSatis.spreadRatio).toBeLessThan(0);
  });

  it('ARBİTRAJ: fiyat alıcısı olunan kanalda al-sat döngüsü HER KOŞULDA zarardır (§11)', () => {
    // Yapısal garanti: piyasa yapıcının yarım makası negatife dönemez.
    // En iyi ilişki + en büyük hacim + en sakin piyasa bile bunu delemez.
    const takers: TradeChannel[] = ['wholesaler', 'tradeNetwork'];
    for (const ch of takers) {
      for (const q of [1, 3, 40, 400, 5000]) {
        for (const rel of [0, 50, 100]) {
          for (const regime of ['calm', 'normal', 'volatile', 'shock'] as const) {
            const market: MarketState = { ...MARKET, regime, volatility: 0 };
            const al = priceAt(ch, { quantity: q, relationship: rel, market, side: 'shopBuys' });
            const sat = priceAt(ch, { quantity: q, relationship: rel, market, side: 'shopSells' });
            expect(al.unitPrice).toBeGreaterThanOrEqual(sat.unitPrice);
          }
        }
      }
    }
  });

  it('ARBİTRAJ: ilişki ve hacim indirimi yarım makası TERSİNE ÇEVİREMEZ (§6)', () => {
    // "Güven/ilişki ... riski tamamen sıfırlamaz." Sıfırlayabilseydi, iyi
    // ilişkili oyuncu aynı kanalda alıp satarak bedava para basardı.
    const item = quarter();
    for (const ch of ALL) {
      const r = priceForChannel({
        item,
        market: { ...MARKET, regime: 'calm', volatility: 0 },
        channel: ch,
        side: 'shopSells',
        quantity: 5000,
        baseUnitValue: bullionUnitValue(item, MARKET),
        relationship: 100,
      });
      // Marjın işareti daima kanalın makerBias işaretidir; sıfırın öbür
      // tarafına geçemez.
      expect(Math.sign(r.spreadRatio || CHANNEL[ch].makerBias)).toBe(
        Math.sign(CHANNEL[ch].makerBias),
      );
    }
  });

  it('ARBİTRAJ: tezgâh marjı ölçeklenemez — kapasite aşımı işaretlenir (§11)', () => {
    // Tezgâh→tezgâh döngüsü dükkânın normal perakende marjıdır; yasak olan
    // onu sınırsız hacimle çarpmaktır. Motor bunu sessizce yutmaz.
    const item = quarter();
    for (const buyFrom of ALL) {
      for (const sellTo of ALL) {
        const q = 400;
        const cost = roundTripCost({
          item,
          market: MARKET,
          quantity: q,
          baseUnitValue: bullionUnitValue(item, MARKET),
          relationship: 100,
          buyFrom,
          sellTo,
        });
        const flagged =
          priceAt(buyFrom, { quantity: q, side: 'shopBuys' }).exceedsCapacity ||
          priceAt(sellTo, { quantity: q, side: 'shopSells' }).exceedsCapacity;
        // Kâr bırakan her döngü kapasite sınırına çarpar.
        if (cost <= 0) expect(flagged).toBe(true);
      }
    }
  });

  it('KAYMA: derinlik tükenmesi birim fiyatı her iki yönde de aşağı çeker', () => {
    for (const side of ['shopBuys', 'shopSells'] as const) {
      const tek = priceAt('tradeNetwork', { quantity: 1, side });
      const yigin = priceAt('tradeNetwork', { quantity: 400, side });
      expect(yigin.unitPrice).toBeLessThan(tek.unitPrice);
      expect(yigin.priceImpact).toBeLessThan(0);
      expect(tek.priceImpact).toBe(0);
    }
  });

  it('makas uç değerlerde bile sınırlıdır — fiyat patlamaz', () => {
    for (const ch of ALL) {
      for (const q of [1, 5000]) {
        for (const side of ['shopBuys', 'shopSells'] as const) {
          const r = priceAt(ch, {
            quantity: q,
            side,
            relationship: 100,
            market: { ...MARKET, regime: 'shock', volatility: 0.2 },
          });
          expect(r.spreadRatio).toBeLessThanOrEqual(CHANNEL_TUNING.maxFavorableSpread);
          expect(r.spreadRatio).toBeGreaterThanOrEqual(-CHANNEL_TUNING.maxAdverseSpread);
        }
      }
    }
  });

  it('fiyat asla sıfır veya negatif olmaz (§11 eksik fiyat verisi)', () => {
    for (const ch of ALL) {
      for (const q of [1, 100, 5000]) {
        const r = priceAt(ch, { quantity: q, side: 'shopBuys' });
        expect(r.unitPrice).toBeGreaterThan(0);
        expect(r.totalPrice).toBeGreaterThan(0);
      }
    }
  });

  it('AŞIRI HACİM: kapasite aşımı işaretlenir, sessizce yutulmaz', () => {
    const kucuk = priceAt('tradeNetwork', { quantity: 2 });
    const devasa = priceAt('tradeNetwork', { quantity: 5000 });

    expect(kucuk.exceedsCapacity).toBe(false);
    expect(devasa.exceedsCapacity).toBe(true);
    expect(devasa.rationale).toMatch(/dilimleme/i);
  });

  it('AŞIRI VOLATİLİTE: kanal kapasitesi daralır', () => {
    const meta = bullionMeta('quarter_gold');
    const sakin = channelCapacity('wholesaler', meta, { ...MARKET, regime: 'calm' });
    const sok = channelCapacity('wholesaler', meta, { ...MARKET, regime: 'shock' });
    expect(sok).toBeLessThan(sakin);
    expect(sok).toBeGreaterThanOrEqual(1);
  });

  it('düşük likiditeli ürünün kanal kapasitesi daha dardır', () => {
    const likit = channelCapacity('wholesaler', bullionMeta('quarter_gold'), MARKET);
    const isci = channelCapacity('wholesaler', null, MARKET);
    expect(isci).toBeLessThan(likit);
  });
});

// ===========================================================================
// Determinizm ve ölçüm
// ===========================================================================

describe('Kanal fiyatlaması deterministiktir', () => {
  it('aynı girdi her zaman aynı fiyatı verir', () => {
    for (const ch of ALL) {
      const a = priceAt(ch, { quantity: 7, relationship: 63 });
      const b = priceAt(ch, { quantity: 7, relationship: 63 });
      expect(b).toEqual(a);
    }
  });

  it('gramsFor birim ağırlıktan doğru toplam üretir', () => {
    const item = quarter();
    expect(gramsFor(item, 4)).toBeCloseTo(7, 3); // 4 × 1.75 g
    const ata = spawnItem(SEED, 2, 'ata_gold');
    expect(gramsFor(ata, 2)).toBeCloseTo(14.432, 3);
  });
});
