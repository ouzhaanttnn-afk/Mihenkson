/**
 * Müşterinin ne istediğini AÇIK TÜRKÇE tek satırda söyler.
 *
 * NEDEN VAR: şerit daha önce "Ürün satmak / bozdurmak istiyor" gibi soyut bir
 * kalıp yazıyordu. Oyuncu tezgâhın arkasında iki şeyi bilmek zorunda:
 * NE geldi ve müşteri onunla NE yapmak istiyor. "Alış / satış" gibi ifadeler
 * ise dükkân açısından ters okunabiliyor — müşterinin "satışı" dükkânın
 * "alışı". Bu yüzden cümle her zaman MÜŞTERİNİN eylemidir:
 *
 *   "1 adet 14 Ayar Yüzük satmak istiyor"
 *   "10 Çeyrek Altın almak istiyor"
 *   "Gram Altın bozdurmak istiyor"
 *   "22 Ayar Bilezik için tamir istiyor"
 *
 * SAYI BİRİMİ ÜRÜNE GÖRE: ziynet sarrafiyede "10 Çeyrek Altın" denir,
 * "10 adet Çeyrek Altın" denmez — çeyrek zaten bir sayma birimidir.
 * İşçilikli üründe "adet" doğaldır ve belirsizliği kaldırır.
 *
 * GİZLİ GERÇEK SIZMAZ (GDD 6.6): burada yalnız müşterinin BEYAN ettiği ürün
 * adı kullanılır; ölçülmemiş ağırlık, gerçek ayar veya rezervasyon fiyatı
 * bu satıra hiç girmez.
 */

import { getLanguage, t } from '@i18n/index';
import { getTemplate } from '@data/item-templates';
import { isBullion } from '@data/bullion';
import type { Customer, ItemInstance } from '@domain/types';

/** Ziynet sarrafiyede adet, ürünün kendi adıyla sayılır: "3 Çeyrek Altın". */
function countPhrase(name: string, quantity: number, templateId: string): string {
  if (quantity <= 1) return t(name);
  return isBullion(templateId)
    ? t('{n} {ad}', { n: quantity, ad: t(name) })
    : t('{n} adet {ad}', { n: quantity, ad: t(name) });
}

/** Müşterinin getirdiği kalemleri "3 Çeyrek Altın", "2 adet 14 Ayar Yüzük" gibi sayar. */
function broughtPhrase(items: ItemInstance[]): string | null {
  if (items.length === 0) return null;

  // Aynı şablondan gelenler tek kalemde toplanır: müşteri üç çeyrek getirdiyse
  // "3 Çeyrek Altın" der, "Çeyrek Altın, Çeyrek Altın, Çeyrek Altın" demez.
  const groups = new Map<string, { name: string; count: number }>();
  for (const item of items) {
    const existing = groups.get(item.templateId);
    if (existing) existing.count += 1;
    else groups.set(item.templateId, { name: item.displayName, count: 1 });
  }

  const parts = [...groups.entries()].map(([templateId, g]) =>
    countPhrase(g.name, g.count, templateId),
  );

  if (parts.length === 1) return parts[0]!;
  if (parts.length === 2) return t('{a} ve {b}', { a: parts[0]!, b: parts[1]! });
  // Üçten fazlasında şerit taşar; ilk ikisi yazılır, gerisi sayılır.
  return t('{a}, {b} ve {n} ürün daha', {
    a: parts[0]!,
    b: parts[1]!,
    n: parts.length - 2,
  });
}

/**
 * Satış niyetinde fiil ürüne göre seçilir.
 * Sarrafiyede sarrafın kullandığı kelime "bozdurmak"tır; işçilikli üründe
 * "satmak". İkisi de doğal Türkçedir, ama yanlış yerde kullanılınca
 * kulağa oyun diliymiş gibi gelir.
 */
function sellSentence(items: ItemInstance[], what: string): string {
  const allBullion = items.length > 0 && items.every((i) => isBullion(i.templateId));
  return allBullion
    ? t('{ne} bozdurmak istiyor', { ne: what })
    : t('{ne} satmak istiyor', { ne: what });
}

/** Müşterinin ağzındaki doğal ürün adı; katalog etiketini birebir okumaz. */
function requestedPhrase(templateId: string, name: string, quantity: number): string {
  const bangle = /^investment_bangle_22k_(\d+)$/.exec(templateId);
  if (bangle) {
    const product = t('{g} gram 22 ayar işçiliksiz bilezik', { g: bangle[1]! });
    return quantity > 1 ? t('{n} adet {ad}', { n: quantity, ad: product }) : product;
  }
  const gram = /^gram_gold_(.+)$/.exec(templateId);
  if (gram) {
    // Ondalık ayracı dile uyar: Türkçede virgül, İngilizcede nokta.
    const weight = gram[1]!.replace('_', getLanguage() === 'en' ? '.' : ',');
    const product = t('{g} gram altın', { g: weight });
    return quantity > 1 ? t('{n} adet {ad}', { n: quantity, ad: product }) : product;
  }
  const articleNames: Record<string, string> = {
    quarter_gold: t('çeyrek altın'),
    half_gold: t('yarım altın'),
    full_gold: t('tam altın'),
    ata_gold: t('Ata lira'),
  };
  const natural = articleNames[templateId];
  if (natural && quantity === 1) return t('Bir {ad}', { ad: natural });
  return countPhrase(name, quantity, templateId);
}

/**
 * Şeritte gösterilecek niyet cümlesi.
 *
 * @param items Müşterinin GETİRDİĞİ kalemler (yalnız satış/servis/ekspertiz
 *              niyetinde doludur; alışta ürün oyuncunun stoğundan seçilir).
 */
export function customerIntentLine(customer: Customer, items: ItemInstance[]): string {
  switch (customer.intent) {
    case 'sell': {
      const what = broughtPhrase(items);
      return what ? sellSentence(items, what) : t('Ürün bozdurmak istiyor');
    }

    case 'buy': {
      // Talebin özeti zaten oyuncunun dilinde ("10 adet Çeyrek Altın").
      const demand = customer.demand;
      if (!demand) return t('Dükkandan ürün almak istiyor');
      if (demand.targetInventoryItemId) return demand.summary;
      if (demand.poolId) return t('{ne} almak istiyor', { ne: demand.summary });

      if (demand.templateId) {
        const name = getTemplate(demand.templateId)?.displayName ?? demand.templateId;
        const phrase = requestedPhrase(demand.templateId, name, demand.quantity);
        return demand.isBulk
          ? t('toplu olarak {ne} almak istiyor', { ne: phrase })
          : t('{ne} almak istiyor', { ne: phrase });
      }

      // Somut ürün yoksa müşteri bir KATEGORİ arıyor demektir.
      return demand.alternativesLabel
        ? t('{ne} almak istiyor', { ne: demand.alternativesLabel })
        : t('Dükkandan ürün almak istiyor');
    }

    case 'service': {
      const what = broughtPhrase(items);
      return what ? t('{ne} için tamir/servis istiyor', { ne: what }) : t('Servis / tamir istiyor');
    }

    case 'appraisal': {
      const what = broughtPhrase(items);
      return what ? t('{ne} için ekspertiz istiyor', { ne: what }) : t('Ekspertiz danışıyor');
    }
  }
}
