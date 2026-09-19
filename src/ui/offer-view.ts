/**
 * MIHENKAYNAK — Teklif tutarının birim karşılığı
 *
 * Karar Dock'unda tutarın altına yazılan satır. Ayrı bir modül olmasının
 * sebebi test edilebilirlik: kural dallı (gram/adet, tek/çok, karışık paket)
 * ve her dalın kendi doğruluk iddiası var; ekran bileşeninin içine gömülü
 * kalsaydı yalnız müşteri kurasıyla denenebilirdi.
 */

import { gramsFor } from '@domain/channels';
import { isBullion } from '@data/bullion';
import { unitPriceView } from '@domain/channels';
import { getLanguage, t } from '@i18n/index';
import { moneyUnit, tlBare } from '@ui/format';
import type { ItemInstance, Money } from '@domain/types';

/**
 * Tutarın birim karşılığı — Karar Dock'unda tutarın altına yazılır.
 *
 * "49.779 ₺" tek başına karar verdirmez; sarraf fiyatı gram ya da adet
 * başına konuşur. Bu satır o çeviriyi yapar.
 *
 * DÜRÜSTLÜK SINIRI: yalnız ANLAMLI olduğunda çizilir.
 *   · tek ürünlü paket / tek kalem → tam birim fiyat (₺/g veya ₺/adet)
 *   · karışık paket → yalnız adet; 100 g külçe ile çeyreği aynı "birim
 *     fiyatta" ortalamak yanlış yönlendirirdi
 *   · işçilikli ürün → adet ve anlamlıysa toplam gram karşılığı
 */
export function offerUnitLabel(
  items: ItemInstance[],
  quantities: number[],
  total: Money,
): string | null {
  const units = quantities.reduce((n, q) => n + q, 0);
  if (items.length === 0 || units <= 0) return null;

  const first = items[0]!;
  const single = items.every((it) => it.templateId === first.templateId);

  if (!single) {
    // Karışık paket: adet gerçek, birim fiyat değil.
    return t('{n} adet', { n: units });
  }

  if (!isBullion(first.templateId)) {
    const grams = items.reduce((sum, it, i) => sum + gramsFor(it, quantities[i] ?? 0), 0);
    const perItem = t('{n} adet · {birim}', { n: units, birim: `${tlBare(Math.round(total / units))} ${moneyUnit(t('adet'))}` });
    return grams > 0 ? perItem + ' · ' + numberFmt(grams) + ' g · ' + tlBare(Math.round(total / grams)) + ' ' + moneyUnit('g') : perItem;
  }

  const view = unitPriceView(first, Math.round(total / units));
  if (view.perGram || first.templateId.startsWith('investment_bangle_')) {
    const grams = view.gramsPerPiece * units;
    const gramLabel = t('{gram} g · {birim}', {
      gram: numberFmt(grams),
      birim: `${tlBare(Math.round(total / grams))} ${moneyUnit('g')}`,
    });
    return first.templateId === 'gram_gold_1' ? gramLabel :
      t('{n} adet · {birim}', { n: units, birim: `${tlBare(Math.round(total / units))} ${moneyUnit(t('adet'))}` }) + ' · ' + gramLabel;
  }
  // Tek adet ziynette de aynı birim standardı korunur.

  return t('{n} adet · {birim}', {
    n: units,
    birim: `${tlBare(view.unitPrice)} ${view.unit}`,
  });
}

/** Ağırlık sayısını dilin yereliyle yazar (ondalık ayracı). */
function numberFmt(value: number): string {
  return new Intl.NumberFormat(getLanguage() === 'en' ? 'en-US' : 'tr-TR').format(value);
}
