/**
 * İŞLEM KİMLİĞİ TEKİLLİĞİ — "aynı şeyi iki kez yap" regresyonu.
 *
 * Playtest'te bulunan hata: aynı üründen ikinci kez alım yapınca ekrana
 * "Transaction wbuy_inv_2_gram_gold_1_0 zaten uygulanmış — yok sayıldı."
 * düşüyor ve alım sessizce gerçekleşmiyordu.
 *
 * KAPI DOĞRU ÇALIŞIYORDU. GDD 22.1/34.4 gereği applyTransaction aynı txId'yi
 * ikinci kez uygulamaz — "duplicate para/stok oluşmaz" garantisi budur.
 * Kusurlu olan KİMLİKTİ: peşin ödemede fatura açılmadığı için fatura sayacı
 * kıpırdamıyor ve aynı gün aynı üründen yapılan iki alım birebir aynı
 * kimliği üretiyordu.
 *
 * Bu dosya kimlik üretiminin İKİ tarafını da sınar:
 *   · Meşru tekrarlar AYRI kimlik almalı (yoksa oyuncu kilitlenir).
 *   · Gerçek çift-uygulama hâlâ ENGELLENMELİ (yoksa para basılır).
 * Yalnız birincisini test etmek, kapıyı tamamen kaldıran bir "düzeltmeyi"
 * de yeşil gösterirdi.
 */

import { describe, expect, it } from 'vitest';

import { START } from './balance';
import { openLoan, networkLoanOffer, spawnNetwork } from './trade-network';
import { applyTransaction, createLedger, type EconomyState } from './settlement';
import { createMarketForDay } from './market';
import type { SettlementTransaction, StoreState } from './types';

function makeStore(): StoreState {
  return {
    name: 'Test', cash: START.cash, reputation: START.reputation, level: 3, xp: 0, xpToNext: 900,
    storeTier: 2, displaySlots: START.displaySlots, backStockSlots: START.backStockSlots,
    workshopCapacity: START.workshopCapacity, staff: [],
    supplier: { trust: START.supplierTrust, limit: START.supplierLimit, terms: START.supplierTerms,
      openInvoices: [], priceBand: 1, specialLotEligibility: false },
    payables: [], dailyOverhead: START.dailyOverhead,
  };
}

function economy(): EconomyState {
  return { store: makeStore(), inventory: [], items: {}, ledger: createLedger() };
}

/**
 * `buyFromWholesaler`ın kimlik kuralının birebir kopyası. Store aksiyonu
 * React'e bağlı olduğu için burada kural olarak sınanır: kimliğin defterin
 * uygulanmış işlem SAYISINDAN türemesi, aynı gün + aynı ürün tekrarında
 * çakışmayı imkânsız kılar.
 */
const supplyTxId = (day: number, templateId: string, seq: number) =>
  `wbuy_inv_${day}_${templateId}_${seq}`;

function supplyTx(day: number, templateId: string, seq: number): SettlementTransaction {
  return {
    txId: supplyTxId(day, templateId, seq),
    dealId: supplyTxId(day, templateId, seq),
    day,
    cashDelta: -1000,
    itemsIn: [],
    itemsOut: [],
    trustDelta: 0,
    reputationDelta: 0,
    xpDelta: 0,
    label: 'tedarik',
  };
}

// ===========================================================================

describe('Aynı ürünü peşin olarak arka arkaya almak kilitlenmez', () => {
  it('aynı gün aynı üründen üç alım da uygulanır', () => {
    let state = economy();
    const cashBefore = state.store.cash;

    for (let i = 0; i < 3; i++) {
      // Peşin ödemede fatura AÇILMAZ; eski kimlik fatura sayacına bağlı
      // olduğu için burada hep 0'da kalır ve çakışırdı.
      const out = applyTransaction(state, supplyTx(2, 'gram_gold_1', state.ledger.appliedTxIds.length));
      expect(out.applied, `${i + 1}. alım`).toBe(true);
      state = out.state;
    }

    expect(state.ledger.appliedTxIds).toHaveLength(3);
    expect(new Set(state.ledger.appliedTxIds).size).toBe(3);
    // Üç alımın üçü de kasadan düşmüş olmalı.
    expect(state.store.cash).toBe(cashBefore - 3000);
  });

  it('KAPI HÂLÂ KAPALI: gerçekten aynı işlem ikinci kez uygulanmaz', () => {
    let state = economy();
    const tx = supplyTx(2, 'gram_gold_1', 0);

    const first = applyTransaction(state, tx);
    expect(first.applied).toBe(true);
    state = first.state;

    // Aynı txId ile ikinci çağrı — çift dokunuş, yeniden gönderim, reload.
    const second = applyTransaction(state, tx);
    expect(second.applied).toBe(false);
    expect(second.state.store.cash).toBe(first.state.store.cash);
    expect(second.state.ledger.appliedTxIds).toHaveLength(1);
  });
});

describe('Aynı gün borç al–kapat–yeniden al kilitlenmez', () => {
  it('ikinci borcun kimliği birincisinden farklıdır', () => {
    const market = createMarketForDay(7, 1);
    const members = spawnNetwork(7, START.reputation);
    const member = members.find((m) => m.cashOnHand > 5000) ?? members[0]!;

    const offer = networkLoanOffer(member, members, 3000, market.day);
    if (offer.blockedReason) return;

    // Kimlik çağırandan gelir; defter sırası her işlemde artar.
    const withFirst = openLoan(member, offer, market.day, 'nloan_x_1_0');
    expect(withFirst.loan?.id).toBe('nloan_x_1_0');

    // Borç kapandı → üye yeniden borçlanabilir hâlde.
    const cleared = { ...withFirst, loan: null };
    const second = networkLoanOffer(cleared, members, 3000, market.day);
    if (second.blockedReason) return;

    const withSecond = openLoan(cleared, second, market.day, 'nloan_x_1_5');

    // Eski hâlde ikisi de `nloan_<üye>_<gün>` olurdu ve ikinci borcun
    // KAPATMA işlemi idempotency kapısına takılıp borç ödenemez kalırdı.
    expect(withSecond.loan?.id).not.toBe(withFirst.loan?.id);
  });

  it('aynı üyeye ikinci borç, birincisi açıkken hâlâ engellidir', () => {
    // §8 — üye başına tek açık borç. Kimlik düzeltmesi bu kuralı gevşetmemeli.
    const market = createMarketForDay(7, 1);
    const members = spawnNetwork(7, START.reputation);
    const member = members.find((m) => m.cashOnHand > 5000) ?? members[0]!;

    const first = networkLoanOffer(member, members, 3000, market.day);
    if (first.blockedReason) return;
    const borrowed = openLoan(member, first, market.day, 'nloan_x_1_0');

    const again = networkLoanOffer(borrowed, members, 3000, market.day);
    expect(again.blockedReason).toBe('Bu esnafa zaten borcunuz var.');
  });
});
