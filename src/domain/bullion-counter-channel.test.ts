/**
 * SARRAFİYENİN ÇIKIŞ KANALI VİTRİN DEĞİL, TEZGÂHTIR
 *
 * `retail` kanalı her zaman vitrinmiş gibi yazılmıştı: adı "Vitrine Koy",
 * boş vitrin slotu şartı arıyor ve kapasite maliyetine 1 slot yazıyordu.
 * Oysa sarrafiye vitrine hiç girmez — `settleLine` `isCrafted` arar, vitrin
 * müşterisi (`showcaseStock`) yalnız işçilikliyi hedefler.
 *
 * İLK DÜŞÜNÜLEN DÜZELTME YANLIŞTI: kanalı sarrafiyeden kaldırmak. Ölçüm
 * yakaladı — kanal kalksa sarrafiyenin alış tavanı %12–18 düşerdi, çünkü
 * `retail` her sarrafiyede önerilen kanal ve tavanı o belirliyor. Üstelik
 * kanalın vaadi sarrafiyede zaten dürüst: arka stoktaki sarrafiye sıradan
 * alıcıya satılıyor ve retail'in vaat ettiği net, tezgâh üstü müşterinin
 * ödediğinin %1,7–15,1 üstünde (200'er örnek).
 *
 * Yani fiyat doğruydu, isim ve kapasite şartı yanlıştı.
 *
 * NOT — ÖLÇÜM YÖNTEMİ: mağaza tohumu kayıt yokken rastgeledir, bu yüzden
 * goldSpot koşudan koşuya değişir (4168–4331 ölçüldü). Mutlak ₺ değerleri
 * koşular arasında karşılaştırılamaz; aşağıdaki testler bu yüzden hep TEK
 * KOŞU İÇİNDE, sabit tohumla ve oran üzerinden karşılaştırır.
 */

import { describe, expect, it } from 'vitest';
import { channelLabel, channelShort, effectiveCeiling, suggestedChannel, thesisFor } from './thesis';
import { estimateBand, initialKnowledge } from './valuation';
import { createMarketForDay } from './market';
import { spawnItem } from './item-spawn';
import { isBullion } from '@data/bullion';
import { isCrafted } from './customer-pricing';
import { useGame } from '@state/gameStore';

const SEED = 987654321;
const MARKET = createMarketForDay(SEED, 3);

function planlar(templateId: string, displayUsed: number) {
  const s = useGame.getState();
  const item = spawnItem(SEED, 1, templateId as never);
  const band = estimateBand(item, MARKET, initialKnowledge(item));
  const options = thesisFor(item, band, {
    store: { ...s.store, displaySlots: 8, cash: 5_000_000 },
    market: MARKET,
    displayUsed,
    workshopUsed: 0,
    liquidityRatio: 1,
  });
  return { item, options, tavan: effectiveCeiling(options, suggestedChannel(options)) };
}

const SARRAFIYE = ['quarter_gold', 'gram_gold_1', 'republic_gold', 'investment_bangle_22k_10'];

describe('sarrafiyede tezgâh kanalı', () => {
  it.each(SARRAFIYE)('%s vitrin dolu diye kanalını kaybetmez', (t) => {
    const bos = planlar(t, 0);
    const dolu = planlar(t, 8);

    expect(bos.options.map(o => o.channel)).toContain('retail');
    expect(dolu.options.map(o => o.channel)).toContain('retail');
  });

  /*
    KIRILAN HALKANIN KENDİSİ. Vitrin işçilikli malla dolduğunda sarrafiyenin
    alış tavanı %13–20 düşüyordu; oyuncu vitrini amacına uygun doldurduğu için
    ilgisiz her sarrafiye alımında cezalandırılıyordu.
  */
  it.each(SARRAFIYE)('%s alış tavanı vitrinin doluluğundan ETKİLENMEZ', (t) => {
    expect(planlar(t, 8).tavan).toBe(planlar(t, 0).tavan);
  });

  it.each(SARRAFIYE)('%s vitrin slotu tüketmez', (t) => {
    const { options } = planlar(t, 0);
    const retail = options.find(o => o.channel === 'retail')!;

    expect(retail.capacityCost.display).toBe(0);
  });

  it.each(SARRAFIYE)('%s planının adı "Tezgâhtan Sat"tır — vitrin değil', (t) => {
    const { item, options } = planlar(t, 0);
    const retail = options.find(o => o.channel === 'retail')!;

    expect(isBullion(item.templateId)).toBe(true);
    expect(retail.label).toBe('Tezgâhtan Sat');
    expect(retail.label).not.toContain('Vitrin');
  });
});

describe('işçilikli üründe eski davranış aynen korunur', () => {
  const ISCILIKLI = 'ring_18k';

  it('vitrin slotu tüketir', () => {
    const { item, options } = planlar(ISCILIKLI, 0);
    const retail = options.find(o => o.channel === 'retail')!;

    expect(isCrafted(item)).toBe(true);
    expect(retail.capacityCost.display).toBe(1);
  });

  it('vitrin doluyken kanal SUNULMAZ — gerçekten yer gerektiği için', () => {
    expect(planlar(ISCILIKLI, 8).options.map(o => o.channel)).not.toContain('retail');
  });

  it('adı "Vitrine Koy" olarak kalır', () => {
    const retail = planlar(ISCILIKLI, 0).options.find(o => o.channel === 'retail')!;
    expect(retail.label).toBe('Vitrine Koy');
  });
});

describe('etiket yardımcıları', () => {
  it('yalnız retail ürüne göre değişir; diğer kanallar sabittir', () => {
    expect(channelLabel('retail', true)).toBe('Tezgâhtan Sat');
    expect(channelLabel('retail', false)).toBe('Vitrine Koy');
    expect(channelShort('retail', true)).toBe('Tezgâh');
    expect(channelShort('retail', false)).toBe('Vitrin');

    for (const c of ['wholesale', 'melt', 'serviceResale', 'collection'] as const) {
      expect(channelLabel(c, true)).toBe(channelLabel(c, false));
      expect(channelShort(c, true)).toBe(channelShort(c, false));
    }
  });
});
