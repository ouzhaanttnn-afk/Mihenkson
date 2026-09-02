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

import { getTemplate } from '@data/item-templates';
import { isBullion } from '@data/bullion';
import type { Customer, ItemInstance } from '@domain/types';

/** Ziynet sarrafiyede adet, ürünün kendi adıyla sayılır: "3 Çeyrek Altın". */
function countPhrase(name: string, quantity: number, templateId: string): string {
  if (quantity <= 1) return name;
  return isBullion(templateId) ? `${quantity} ${name}` : `${quantity} adet ${name}`;
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
  if (parts.length === 2) return `${parts[0]} ve ${parts[1]}`;
  // Üçten fazlasında şerit taşar; ilk ikisi yazılır, gerisi sayılır.
  return `${parts[0]}, ${parts[1]} ve ${parts.length - 2} ürün daha`;
}

/**
 * Satış niyetinde fiil ürüne göre seçilir.
 * Sarrafiyede sarrafın kullandığı kelime "bozdurmak"tır; işçilikli üründe
 * "satmak". İkisi de doğal Türkçedir, ama yanlış yerde kullanılınca
 * kulağa oyun diliymiş gibi gelir.
 */
function sellVerb(items: ItemInstance[]): string {
  const allBullion = items.length > 0 && items.every((i) => isBullion(i.templateId));
  return allBullion ? 'bozdurmak istiyor' : 'satmak istiyor';
}

/** Müşterinin ağzındaki doğal ürün adı; katalog etiketini birebir okumaz. */
function requestedPhrase(templateId: string, name: string, quantity: number): string {
  const bangle = /^investment_bangle_22k_(\d+)$/.exec(templateId);
  if (bangle) {
    const product = `${bangle[1]} gram 22 ayar işçiliksiz bilezik`;
    return quantity > 1 ? `${quantity} adet ${product}` : product;
  }
  const gram = /^gram_gold_(.+)$/.exec(templateId);
  if (gram) {
    const weight = gram[1]!.replace('_', ',');
    return quantity > 1 ? `${quantity} adet ${weight} gram altın` : `${weight} gram altın`;
  }
  const articleNames: Record<string, string> = {
    quarter_gold: 'çeyrek altın',
    half_gold: 'yarım altın',
    full_gold: 'tam altın',
    ata_gold: 'Ata lira',
  };
  const natural = articleNames[templateId];
  if (natural && quantity === 1) return `Bir ${natural}`;
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
      return what ? `${what} ${sellVerb(items)}` : 'Ürün bozdurmak istiyor';
    }

    case 'buy': {
      // Talebin özeti zaten oyuncunun dilinde ("10 adet Çeyrek Altın").
      const demand = customer.demand;
      if (!demand) return 'Dükkandan ürün almak istiyor';
      if (demand.targetInventoryItemId) return demand.summary;
      if (demand.poolId) return `${demand.summary} almak istiyor`;

      if (demand.templateId) {
        const name = getTemplate(demand.templateId)?.displayName ?? demand.templateId;
        const phrase = requestedPhrase(demand.templateId, name, demand.quantity);
        const bulk = demand.isBulk ? 'toplu olarak ' : '';
        return `${bulk}${phrase} almak istiyor`;
      }

      // Somut ürün yoksa müşteri bir KATEGORİ arıyor demektir.
      return demand.alternativesLabel
        ? `${demand.alternativesLabel} almak istiyor`
        : 'Dükkandan ürün almak istiyor';
    }

    case 'service': {
      const what = broughtPhrase(items);
      return what ? `${what} için tamir/servis istiyor` : 'Servis / tamir istiyor';
    }

    case 'appraisal': {
      const what = broughtPhrase(items);
      return what ? `${what} için ekspertiz istiyor` : 'Ekspertiz danışıyor';
    }
  }
}
