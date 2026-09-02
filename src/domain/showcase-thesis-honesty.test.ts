/**
 * C1'İN BİR KATMAN YUKARISI — VAAT EDİLEN ÇIKIŞ PLANI TUTUYOR MU?
 *
 * B5'i tarayıcıda doğrularken "Vitrine Koy" seçilen bir mal ARKA STOĞA düştü.
 * İlk bakışta C1 regresyonu gibi göründü; değilmiş. `settleLine` malı vitrine
 * ancak `isCrafted` ise koyuyor (vitrin müşterisi de yalnız onu hedefliyor),
 * oysa `buildThesisOptions` "Vitrin" seçeneğini SARRAFİYEYE DE sunuyor.
 *
 * Yani oyuncu, oyunun hiçbir zaman uygulamayacağı bir plan seçebiliyor. Bu test
 * o farkı ÖLÇER ve belgeler; düzeltmesi ekonomiyi ilgilendirdiği için ayrı
 * karardır (B2 ile aynı masada).
 */

import { describe, expect, it } from 'vitest';
import { thesisFor } from './thesis';
import { isCrafted } from './customer-pricing';
import { isBullion } from '@data/bullion';
import { poolSupplyItem } from './pool-supply';
import { createMarketForDay } from './market';
import { estimateBand, initialKnowledge } from './valuation';
import { useGame } from '@state/gameStore';

function optionsFor(templateId: string) {
  const s = useGame.getState();
  const item = poolSupplyItem(templateId as never);
  const market = createMarketForDay(s.seed, 1);
  const band = estimateBand(item, market, initialKnowledge(item));
  const options = thesisFor(item, band, {
    store: { ...s.store, displaySlots: 8, cash: 1_000_000 },
    market,
    displayUsed: 0,
    workshopUsed: 0,
    liquidityRatio: 1,
  });
  return { item, channels: options.map(o => o.channel) };
}

describe('vitrin tezi ile vitrin kuralı arasındaki fark', () => {
  it('sarrafiye vitrin hedefi OLAMAZ — kural bu', () => {
    const { item } = optionsFor('quarter_gold');

    expect(isBullion(item.templateId)).toBe(true);
    expect(isCrafted(item)).toBe(false);
  });

  it('buna rağmen "Vitrin" çıkış planı sarrafiyede de sunuluyor — açık fark', () => {
    const { channels } = optionsFor('quarter_gold');

    // Belgelenen mevcut davranış. Değişirse bu test kırılır ve karar
    // yeniden konuşulur; sessizce kaymaz.
    expect(channels).toContain('retail');
  });
});
