/**
 * MIHENKAYNAK — Teklif tutarının birim karşılığı
 *
 * Karar Dock'unda tutarın altına yazılan satır. Ayrı bir modül olmasının
 * sebebi test edilebilirlik: kural dallı (gram/adet, tek/çok, karışık paket)
 * ve her dalın kendi doğruluk iddiası var; ekran bileşeninin içine gömülü
 * kalsaydı yalnız müşteri kurasıyla denenebilirdi.
 */

import { isBullion } from '@data/bullion';
import { unitPriceView } from '@domain/channels';
import { tlBare } from '@ui/format';
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
 *   · işçilikli tekil ürün → hiç; orada birim diye bir şey yok
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
    return `${units} adet`;
  }

  if (!isBullion(first.templateId)) {
    // İşçilikli üründe adet 1'dir ve "birim fiyat" toplamın kendisidir.
    return units > 1 ? `${units} adet · ${tlBare(Math.round(total / units))} ₺/adet` : null;
  }

  const view = unitPriceView(first, Math.round(total / units));
  if (view.perGram) {
    const grams = view.gramsPerPiece * units;
    return `${grams.toLocaleString('tr-TR')} g · ${tlBare(view.unitPrice)} ${view.unit}`;
  }
  // Tek adet ziynette birim fiyat toplamın kendisidir; aynı sayıyı iki kez
  // yazmak bilgi değil gürültüdür.
  if (units === 1) return null;
  return `${units} adet · ${tlBare(view.unitPrice)} ${view.unit}`;
}
