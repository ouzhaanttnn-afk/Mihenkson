/**
 * İŞLEM SONUCU BALONU — "satış/alım yapıldı, yapılmadı".
 *
 * Balon `settleLine` ve `settlePurchase`in içinde, `applyTransaction`
 * başarılı olduktan SONRA basılıyor. Bu testin asıl işi, o balonun
 * arkasından gelen `set(...)` çağrısıyla EZİLMEDİĞİNİ sabitlemek: iki
 * yordam da balondan sonra ekonomiyi yazıyor ve `toasts` alanını
 * taşımıyor. Kısmi `set` birleştirmesi bozulursa balon sessizce kaybolur
 * ve bunu tarayıcıda fark etmek zordur.
 *
 * Ayrıca YÖNÜN karışmadığını sabitler: müşteri satarken oyuncu ALIR;
 * o akışta "satış yapıldı" demek defteri yanlış okumak olurdu.
 */

import { afterEach, describe, expect, it } from 'vitest';

import { useGame } from '@state/gameStore';
import { createMarketForDay } from '@domain/market';
import { dayCharacter } from '@domain/intent';
import { spawnCustomer } from '@domain/customer-spawn';
import { spawnItem } from '@domain/item-spawn';
import { showcaseDemand } from '@domain/purchase';
import { createLedger, type EconomyState } from '@domain/settlement';
import type { InventoryPosition, ItemInstance } from '@domain/types';

const SEED = 456;
const GUN = 5;
const market = { ...createMarketForDay(SEED, GUN), goldSpot: 7100 };
const character = dayCharacter(SEED, GUN, market);
const initial = useGame.getState();

afterEach(() => useGame.setState(initial, true));

function ekonomi(): EconomyState {
  return {
    store: { ...initial.store, cash: 10_000_000, personnelCount: 0, hasBalanceMg: 0, hasCostBasis: 0 },
    inventory: [],
    items: {},
    ledger: createLedger(),
  };
}

/**
 * Satan bir müşteri bulup pazarlığa kadar getirir.
 *
 * DEĞERLEME ADIMI ATLANAMAZ: `settleLine`, bandı olmayan kalemde hiç
 * çalışmadan döner (ölçüldü — band'sız teklif ACCEPTED'a gidiyor ama
 * mutabakat da balon da olmuyor). Yani akış burada oyuncunun yaptığının
 * aynısını yapar: incele → değerle → tez → pazarlık.
 */
function satanMusteriyiKarsila(): void {
  const eko = ekonomi();
  for (let index = 1; index < 60; index++) {
    const spawned = spawnCustomer(SEED, index, market, eko.store, character, undefined, {
      inventory: eko.inventory,
      items: eko.items,
    });
    if (spawned.customer.intent !== 'sell' || spawned.items.length === 0) continue;

    useGame.setState({
      ...eko,
      seed: SEED,
      market,
      dayCharacter: character,
      queue: [spawned],
      activeDeal: null,
      activeCustomer: null,
      profileOpen: false,
      profileSetupDone: true,
      toasts: [],
    });
    const oyun = useGame.getState();
    oyun.greetCustomer();
    useGame.getState().setStage('appraise');
    const secenek = useGame.getState().activeDeal?.lines[0]?.thesisOptions[0];
    if (secenek) useGame.getState().selectThesis(secenek.channel);
    useGame.getState().setStage('negotiate');
    return;
  }
  throw new Error('satan müşteri bulunamadı');
}

/**
 * Üç bağımsız kalem getiren bir satıcı kurar. Spawn edilmiş gerçek müşteri
 * profili kullanılır; yalnız taşıdığı ürün sayısı sabitlenir ki çoklu kalem
 * ilerleme regresyonu rastgele müşteri dağılımına bağlı kalmasın.
 */
function cokluSatanMusteriyiKarsila(): string[] {
  const eko = ekonomi();
  let seller = null as ReturnType<typeof spawnCustomer> | null;
  for (let index = 1; index < 60; index++) {
    const spawned = spawnCustomer(SEED, index, market, eko.store, character, undefined, {
      inventory: eko.inventory,
      items: eko.items,
    });
    if (spawned.customer.intent === 'sell') {
      seller = spawned;
      break;
    }
  }
  if (!seller) throw new Error('çoklu satıcı için müşteri bulunamadı');

  const products = [
    spawnItem(SEED, 101, 'bracelet_22k_thin'),
    spawnItem(SEED, 102, 'bracelet_22k_thin'),
    spawnItem(SEED, 103, 'bracelet_22k_thin'),
  ];
  const lineIds = products.map((_, i) => `${seller!.customer.id}_multi_${i + 1}`);

  useGame.setState({
    ...eko,
    seed: SEED,
    market,
    dayCharacter: character,
    queue: [
      {
        customer: {
          ...seller.customer,
          intent: 'sell' as const,
          lineIds,
        },
        items: products,
      },
    ],
    activeDeal: null,
    activeCustomer: null,
    profileOpen: false,
    profileSetupDone: true,
    toasts: [],
  });
  useGame.getState().greetCustomer();

  // Her kalemi değerleyip tezini seç; üçüncü kalemi pazarlıkta bırak.
  for (const lineId of lineIds) {
    useGame.getState().setActiveLine(lineId);
    useGame.getState().setStage('appraise');
    const current = useGame.getState().activeDeal?.lines.find((line) => line.lineId === lineId);
    const thesis = current?.thesisOptions[0];
    if (thesis) useGame.getState().selectThesis(thesis.channel);
    useGame.getState().setStage('negotiate');
  }

  return lineIds;
}

/** Vitrinde duran tek bir işçilikli ürün — satış akışının konusu. */
function vitrindekiUrun(): ItemInstance {
  const item = spawnItem(SEED, 1, 'bracelet_22k_thin');
  return {
    ...item,
    id: 'bracelet_22k_thin_1',
    buyCost: 30_000,
    acquiredDay: 1,
    location: 'display',
    truth: { ...item.truth, hiddenFlaws: [] },
  };
}

function pozisyon(item: ItemInstance): InventoryPosition {
  return {
    itemId: item.id,
    quantity: 1,
    costBasis: item.buyCost ?? 0,
    currentValue: item.buyCost ?? 0,
    age: 2,
    demand: 'steady',
    location: 'display',
    thesis: null,
    expectedExitValues: {},
  };
}

/** Vitrindeki ürünü isteyen bir müşteri kurar ve paketi hazırlar. */
function alanMusteriyiKarsila(): void {
  const item = vitrindekiUrun();
  const eko: EconomyState = {
    ...ekonomi(),
    inventory: [pozisyon(item)],
    items: { [item.id]: item },
  };
  const spawned = spawnCustomer(SEED, 2, market, eko.store, character, undefined, {
    inventory: eko.inventory,
    items: eko.items,
  });
  const entry = {
    ...spawned,
    customer: { ...spawned.customer, intent: 'buy' as const, demand: showcaseDemand(item) },
    items: [],
  };

  useGame.setState({
    ...eko,
    seed: SEED,
    market,
    dayCharacter: character,
    queue: [entry],
    activeDeal: null,
    activeCustomer: null,
    profileOpen: false,
    profileSetupDone: true,
    toasts: [],
  });
  useGame.getState().greetCustomer();
  useGame.getState().togglePackageItem(item.id);
  useGame.getState().setStage('negotiate');
}

const balonlar = () => useGame.getState().toasts.map((t) => t.text);

describe('alım balonu', () => {
  it('KABUL EDİLEN PAZARLIK "Alım yapıldı" balonu bırakır', () => {
    satanMusteriyiKarsila();
    // Tavanın üstünde bir teklif kabul edilir; amaç fiyat dengesi değil,
    // durum makinesini ACCEPTED'a götürmek.
    useGame.getState().submitOffer(5_000_000);

    const cikan = balonlar();
    expect(cikan.some((t) => t.startsWith('Alım yapıldı'))).toBe(true);
    // YÖN KARIŞMASIN: bu akışta satış yoktur.
    expect(cikan.some((t) => t.includes('Satış'))).toBe(false);
  });

  it('REDDEDİLEN PAZARLIK "Alım yapılmadı" balonu bırakır', () => {
    satanMusteriyiKarsila();
    useGame.getState().negotiationMove({ kind: 'reject', atRound: 0 });

    expect(balonlar()).toContain('Alım yapılmadı');
  });

  it('BALON ARKASINDAN GELEN set() İLE EZİLMEZ — defter de yazılmış olur', () => {
    satanMusteriyiKarsila();
    useGame.getState().submitOffer(5_000_000);

    const s = useGame.getState();
    expect(s.toasts.length).toBeGreaterThan(0);
    // Balon "yapıldı" diyorsa arkasında gerçek bir mutabakat kaydı olmalı.
    expect(s.ledger.transactions.length).toBeGreaterThan(0);
  });
});

describe('satış balonu', () => {
  it('KABUL EDİLEN SATIŞ "Satış yapıldı" balonu bırakır', () => {
    alanMusteriyiKarsila();
    // Cüzi bir fiyat müşteri tarafından kabul edilir; ölçülen şey fiyat
    // değil, akışın ACCEPTED'a gidip balonu bırakması.
    useGame.getState().submitOffer(1);

    const cikan = balonlar();
    expect(cikan.some((t) => t.startsWith('Satış yapıldı'))).toBe(true);
    // Bu akışta oyuncu SATAR; "alım" demek defteri ters okumak olurdu.
    expect(cikan.some((t) => t.startsWith('Alım'))).toBe(false);
  });

  it('REDDEDİLEN SATIŞ "Satış yapılmadı" balonu bırakır', () => {
    alanMusteriyiKarsila();
    useGame.getState().negotiationMove({ kind: 'reject', atRound: 0 });

    expect(balonlar()).toContain('Satış yapılmadı');
  });
});

describe('çoklu ürün pazarlığı', () => {
  it('biten kalemden sıradaki açık kaleme geçer ve terminal satırda donmaz', () => {
    const [first, second, third] = cokluSatanMusteriyiKarsila();
    if (!first || !second || !third) throw new Error('üç kalem kurulamadı');

    // Ekran görüntüsündeki durum: üçüncü ürün reddedildi, ilk ikisi açık.
    useGame.getState().negotiationMove({ kind: 'reject', atRound: 0 });

    let s = useGame.getState();
    expect(s.activeDeal?.lines.find((line) => line.lineId === third)?.negotiation.state).toBe('REJECTED');
    expect(s.activeDeal?.activeLineId).toBe(first);
    expect(s.activeDeal?.stage).toBe('negotiate');
    expect(s.customerMessage).toMatchObject({
      key: 'Bu parçayı kapattık. Sıradakine bakalım.',
    });

    // Bitmiş ürün pill'ine basmak terminal durum makinesini yeniden açmaz.
    useGame.getState().setActiveLine(third);
    s = useGame.getState();
    expect(s.activeDeal?.activeLineId).toBe(first);
    expect(s.activeDeal?.stage).toBe('negotiate');

    // Eski bir kayıt terminal kalemi aktif bırakmışsa ilk hamlede toparlanır.
    useGame.setState({
      activeDeal: s.activeDeal
        ? { ...s.activeDeal, activeLineId: third, stage: 'negotiate' }
        : null,
    });
    useGame.getState().negotiationMove({ kind: 'reject', atRound: 0 });
    expect(useGame.getState().activeDeal?.activeLineId).toBe(first);

    // Son açık kalem de kapanınca ancak o zaman sonuç ekranına geçilir.
    useGame.getState().negotiationMove({ kind: 'reject', atRound: 0 });
    expect(useGame.getState().activeDeal?.activeLineId).toBe(second);
    useGame.getState().negotiationMove({ kind: 'reject', atRound: 0 });
    expect(useGame.getState().activeDeal?.stage).toBe('result');
  });
});
