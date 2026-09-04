import { afterEach, describe, expect, it } from 'vitest';

import {
  documentLanguage,
  localizeCustomerName,
  setLanguage,
  syncDocumentLanguage,
} from './index';
import { localizedDemandSummary } from '@domain/purchase';
import { customerIntentLine } from '@ui/intent-line';
import type { Customer, CustomerDemand } from '@domain/types';

function demand(partial: Partial<CustomerDemand> = {}): CustomerDemand {
  return {
    families: [],
    wantsBullion: true,
    templateId: 'quarter_gold',
    quantity: 3,
    isBulk: false,
    acceptsPartial: true,
    minQuantity: 1,
    // Eski dilde kaydedilmiş bir özet özellikle bırakılıyor. Görünür metin
    // bunu kullanırsa aşağıdaki İngilizce beklentiler kırılmalı.
    summary: '3 adet Çeyrek Altın',
    alternativesLabel: '',
    ...partial,
  };
}

afterEach(() => setLanguage('tr'));

describe('dinamik müşteri ve ürün metinleri', () => {
  it('kayıttaki Türkçe özeti değil semantik talebi etkin dilde çizer', () => {
    const saved = demand();

    setLanguage('en');

    expect(localizedDemandSummary(saved)).toBe('3 × Quarter Coin');
    expect(
      customerIntentLine({ intent: 'buy', demand: saved } as Customer, []),
    ).toBe('wants to buy 3 Quarter Coin');
  });

  it('gram havuzu ve vitrin hedefi dil değişiminden sonra yeniden yerelleşir', () => {
    const grams = demand({
      poolId: '24K_GRAM_GOLD_POOL',
      templateId: 'gram_gold_1',
      quantity: 12.5,
      summary: '12,5 gram altın',
    });
    const showcase = demand({
      targetInventoryItemId: 'item_1',
      templateId: 'ring_14k',
      quantity: 1,
      summary: '★ Vitrindeki 14 Ayar Yüzük ile ilgileniyor',
    });

    setLanguage('tr');
    expect(localizedDemandSummary(grams)).toBe('12,5 gram altın');

    setLanguage('en');

    expect(localizedDemandSummary(grams)).toBe('12.5 grams of gold');
    expect(localizedDemandSummary(showcase)).toBe('★ Interested in the 14K Ring on display');
  });

  it('müşteri adı değil, yalnız Türkçe hitap eki yerelleşir', () => {
    setLanguage('en');
    expect(localizeCustomerName('Zeynep Hanım')).toBe('Ms Zeynep');
    expect(localizeCustomerName('Kemal Bey')).toBe('Mr Kemal');
    expect(localizeCustomerName('Alex')).toBe('Alex');

    setLanguage('tr');
    expect(localizeCustomerName('Zeynep Hanım')).toBe('Zeynep Hanım');
  });
});

describe('belge dili', () => {
  it('İngilizce tercih CSS büyük harf dönüşümüne İngilizce yereli verir', () => {
    setLanguage('en');
    const root = { lang: 'tr' };

    syncDocumentLanguage(root);

    expect(root.lang).toBe('en');
    expect('Undecided'.toLocaleUpperCase(documentLanguage())).toBe('UNDECIDED');
    expect('Undecided'.toLocaleUpperCase(documentLanguage())).not.toContain('İ');
  });
});
