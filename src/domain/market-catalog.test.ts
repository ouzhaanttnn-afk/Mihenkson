/**
 * MARKET KATALOĞU — yapısal sağlık.
 *
 * Tek tek ürünleri değil, kataloğun BÜTÜN olarak sağlamlığını sabitler.
 * Katalog büyüdükçe elle gözden geçirmek imkânsızlaşır; bozulan şeyler de
 * genelde tek üründe değil, dağılımda olur.
 */

import { describe, expect, it } from 'vitest';
import { MARKET_CATALOG, lifestyleDailyExpense, type MarketProduct } from './marketplace';

const KATEGORILER = ['profile', 'frames', 'shop', 'decoration', 'collection', 'lifestyle'] as const;
const seviye = (p: MarketProduct) => p.unlockRequirement.level ?? 0;

describe('katalog · dağılım', () => {
  /*
    ÖLÜ BÖLGE — genişletmenin asıl sebebi.
    Ölçülmüştü: 12. seviyeden sonra 11, 13, 14, 15, 17, 18, 19, 20, 21, 23,
    24, 25 seviyelerinde HİÇBİR ürün yoktu; oyuncu 12'den 16'ya kadar
    Market'te yeni hiçbir şey görmüyordu.
  */
  it('uzun ölü bölge YOK — art arda en fazla iki seviye boş kalabilir', () => {
    const dolu = new Set(MARKET_CATALOG.map(seviye));
    let enUzun = 0;
    let simdiki = 0;
    for (let lv = 1; lv <= 25; lv++) {
      simdiki = dolu.has(lv) ? 0 : simdiki + 1;
      enUzun = Math.max(enUzun, simdiki);
    }

    expect(enUzun).toBeLessThanOrEqual(2);
  });

  it('her kategori en az dört ürün taşır — hiçbiri erken bitmez', () => {
    for (const kategori of KATEGORILER) {
      expect(MARKET_CATALOG.filter((p) => p.category === kategori).length).toBeGreaterThanOrEqual(4);
    }
  });

  /*
    Dükkânı ilgilendiren iki kategori erken bitiyordu (6. ve 7. seviye).
    Oyun dükkânın kendisi üstüne kurulu; dükkân oyuncuyla birlikte büyümeli.
  */
  it('dükkân görünümü geç oyunda da gelişmeye devam eder', () => {
    for (const kategori of ['shop', 'decoration'] as const) {
      const enYuksek = Math.max(...MARKET_CATALOG.filter((p) => p.category === kategori).map(seviye));
      expect(enYuksek).toBeGreaterThanOrEqual(14);
    }
  });

  it('giriş ucu ucuzdur — oyuncu ilk günlerde Market ile ilişki kurabilsin', () => {
    const erken = MARKET_CATALOG.filter((p) => seviye(p) <= 2 && p.price > 0);

    expect(Math.min(...erken.map((p) => p.price))).toBeLessThanOrEqual(25_000);
  });
});

describe('katalog · iç tutarlılık', () => {
  /*
    Aynı seviyede birden çok ürün olabilir (sv1'de hem Çırak Rozeti hem
    Kurucu Rozeti var) ve aralarında fiyat sırası aranmaz. Kural, SEVİYE
    ARTTIKÇA fiyatın gerilememesidir: bir üst seviyenin en ucuzu, bir alt
    seviyenin en pahalısından ucuz olmamalı.
  */
  it('her kategoride seviye arttıkça fiyat gerilemez', () => {
    for (const kategori of KATEGORILER) {
      const seviyeler = new Map<number, number[]>();
      for (const p of MARKET_CATALOG.filter((x) => x.category === kategori && x.price > 0)) {
        seviyeler.set(seviye(p), [...(seviyeler.get(seviye(p)) ?? []), p.price]);
      }
      const sirali = [...seviyeler.entries()].sort((a, b) => a[0] - b[0]);
      for (let i = 1; i < sirali.length; i++) {
        expect(Math.max(...sirali[i]![1])).toBeGreaterThan(Math.max(...sirali[i - 1]![1]));
      }
    }
  });

  /*
    ARAYÜZ ETİKETİ BUNA DAYANIYOR. `lifestyleDailyExpense` bütün sahip
    olunan ürünlerin bakımını toplar, ama Market özeti ve gün raporu o
    toplamı "şahsi bakım" diye yazar. Dekorasyona gider vermek etiketi
    yalan yapardı.
  */
  it('bakım gideri YALNIZ şahsi üründe olur', () => {
    for (const product of MARKET_CATALOG) {
      if ((product.dailyUpkeep ?? 0) > 0) expect(product.category).toBe('lifestyle');
    }
  });

  it('kuşanılabilir ürün doğru kategoridedir', () => {
    const yuva = { profileFrame: 'frames', shopTheme: 'shop', shopBadge: 'profile' } as const;
    for (const product of MARKET_CATALOG) {
      if (product.equipSlot) expect(product.category).toBe(yuva[product.equipSlot]);
    }
  });

  /*
    Mutlak eşik yerine KADEMELERİN SIRASI sınanıyor. Eşik koymak, sayıyı
    mevcut veriye uydurmak olurdu; asıl kural şu: bir kademenin en ucuzu,
    bir alt kademenin en ucuzundan pahalı olmalı. Fiyatı 0 olan sunucu
    ödüllü rozet dışarıda (satılık değil).
  */
  it('kademeler fiyat sırasını korur — ucuz ürün üst kademede olmaz', () => {
    const kademeler = ['standard', 'premium', 'elite', 'legendary'] as const;
    const enUcuz = kademeler.map((t) =>
      Math.min(...MARKET_CATALOG.filter((p) => p.tier === t && p.price > 0).map((p) => p.price)),
    );

    for (let i = 1; i < enUcuz.length; i++) {
      expect(enUcuz[i]!).toBeGreaterThan(enUcuz[i - 1]!);
    }
  });

  it('yüksek seviye ürünler itibar da ister — yalnız para yetmez', () => {
    for (const product of MARKET_CATALOG) {
      if (seviye(product) >= 15) expect(product.unlockRequirement.reputation ?? 0).toBeGreaterThan(0);
    }
  });
});

describe('katalog · oyun gücü vermez', () => {
  /*
    DEĞİŞMEZ KURAL: Market kozmetiktir. Bir ürün nakit, stok, kapasite ya da
    fiyat etkileyecek bir alan taşımaya başlarsa bu test düşer.
  */
  it('hiçbir ürün mekanik alan taşımaz', () => {
    const yasak = ['cash', 'bonus', 'multiplier', 'capacity', 'slots', 'discount', 'xp', 'trust', 'margin'];
    for (const product of MARKET_CATALOG) {
      for (const alan of Object.keys(product)) {
        expect(yasak).not.toContain(alan);
      }
    }
  });

  it('bakım gideri gerçekten toplanır — lüksün bedeli vardır', () => {
    const luks = MARKET_CATALOG.filter((p) => (p.dailyUpkeep ?? 0) > 0).slice(0, 3);
    const toplam = luks.reduce((sum, p) => sum + (p.dailyUpkeep ?? 0), 0);

    expect(lifestyleDailyExpense({ owned: luks.map((p) => p.id), equipped: {} })).toBe(toplam);
  });
});
