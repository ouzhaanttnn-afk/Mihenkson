/**
 * PARA BİÇİMİ — dört bileşimin hepsi (tr/en × ₺/$) doğru okunmalı.
 *
 * Buradaki testlerin çoğu "sayı doğru mu"yu değil, SAYININ YANLIŞ
 * OKUNMASINI engelleyen ayrıntıları koruyor: binlik ayracının dile göre
 * dönmesi, imin doğru yana gitmesi, ve dolarda pazarlık adımlarının
 * birbirine yapışmaması.
 */

import { afterEach, describe, expect, it } from 'vitest';

import { setLanguage } from './index';
import { setCurrency, USD_RATE } from './currency';
import { grams, moneyUnit, price, priceRawTl, tl, tlBare, tlRange, tlSigned } from './money';

function mode(lang: 'tr' | 'en', cur: 'try' | 'usd'): void {
  setLanguage(lang);
  setCurrency(cur);
}

afterEach(() => mode('tr', 'try'));

describe('Türkçe · ₺', () => {
  it('im sonda, binlik nokta', () => {
    mode('tr', 'try');
    expect(tl(1_000_000)).toBe('1.000.000 ₺');
    expect(tl(145_000)).toBe('145.000 ₺');
  });

  it('eksi im U+2212 ve en başta', () => {
    mode('tr', 'try');
    expect(tl(-685)).toBe('−685 ₺');
    expect(tlSigned(-1_350)).toBe('−1.350 ₺');
    expect(tlSigned(8_200)).toBe('+8.200 ₺');
  });

  it('sıfır imsiz kalır — yön yokken yön gösterilmez', () => {
    mode('tr', 'try');
    expect(tlSigned(0)).toBe('0 ₺');
  });
});

describe('İngilizce · $', () => {
  it('im başta ve bitişik, binlik virgül', () => {
    mode('en', 'usd');
    expect(tl(1_000_000)).toBe('$30,817');
    expect(tl(324_500)).toBe('$10,000');
  });

  it('işaretli tutarda im, imin ARDINDAN gelir', () => {
    mode('en', 'usd');
    expect(tlSigned(324_500)).toBe('+$10,000');
    expect(tlSigned(-324_500)).toBe('−$10,000');
  });

  it('aralıkta imi iki uca da koyar — alt sınır imsiz kalmasın', () => {
    mode('en', 'usd');
    expect(tlRange(324_500, 649_000)).toBe('$10,000 – $20,000');
  });

  it('birim etiketi de dolara döner', () => {
    mode('en', 'usd');
    expect(moneyUnit('g')).toBe('$/g');
    expect(moneyUnit()).toBe('$');
  });
});

describe('İngilizce · ₺ (dil değişti, birim değişmedi)', () => {
  it('sayı İngilizce biçimde ama para hâlâ TL', () => {
    mode('en', 'try');
    expect(tl(1_000_000)).toBe('1,000,000 ₺');
  });
});

describe('küçük tutarlar dolarda kuruş gösterir', () => {
  /*
    ASIL SEBEP: TL'de 1 ₺ farkı görünmez, dolarda aynı yuvarlama 32 kat
    kabalaşır. Tam sayıya yuvarlasaydık pazarlıkta ARDIŞIK İKİ TEKLİF aynı
    sayıya düşerdi — oyuncu teklifini artırır, ekran değişmez.
  */
  it('ardışık teklifler dolarda birbirine yapışmaz', () => {
    mode('tr', 'usd');
    const a = tl(12_500);
    const b = tl(12_550);
    expect(a).not.toBe(b);
  });

  it('büyük tutarda kuruş yazılmaz — okunmaz uzunlukta olurdu', () => {
    mode('en', 'usd');
    expect(tl(1_000_000)).not.toContain('.');
  });
});

describe('çevrilmeyenler', () => {
  it('GRAM ÇEVRİLMEZ — dolar seçmek altını hafifletmez', () => {
    mode('tr', 'try');
    const trGram = grams(18.4);
    mode('tr', 'usd');
    expect(grams(18.4)).toBe(trGram);
  });

  it('kur panosu ham TL yazar — "Dolar · 1,00 $" saçma olurdu', () => {
    mode('tr', 'usd');
    expect(priceRawTl(USD_RATE)).toBe('32,45');
    expect(price(USD_RATE)).toBe('1,00');
  });
});

describe('imsiz gösterim', () => {
  it('tlBare imi çağırana bırakır ama çevrimi yapar', () => {
    mode('tr', 'usd');
    expect(tlBare(324_500)).toBe('10.000');
    expect(tlBare(324_500)).not.toContain('$');
  });
});

describe('yüzde imi dile göre yer değiştirir', () => {
  /*
    Bu testin sebebi bir EKRAN GÖRÜNTÜSÜ. Ölçümler temizdi, sızıntı
    dedektörü sıfır diyordu; görüntüde ses düzeyi "%70" yazıyordu ve
    İngilizce arayüzde yabancı duruyordu. Yüzde imi Türkçede sayının
    önünde, İngilizcede arkasındadır.
  */
  it('Türkçede önde, İngilizcede arkada', async () => {
    const { pct, pctSigned, pctChange } = await import('@ui/format');

    setLanguage('tr');
    expect(pct(0.19)).toBe('%19');
    expect(pctSigned(-0.07)).toBe('−%7');
    expect(pctChange(0.38)).toBe('▲ %0,38');

    setLanguage('en');
    expect(pct(0.19)).toBe('19%');
    expect(pctSigned(-0.07)).toBe('−7%');
    expect(pctChange(0.38)).toBe('▲ 0.38%');
  });

  it('ondalık ayracı da dile uyar', async () => {
    const { pct } = await import('@ui/format');
    setLanguage('tr');
    expect(pct(0.125, 1)).toBe('%12,5');
    setLanguage('en');
    expect(pct(0.125, 1)).toBe('12.5%');
  });
});
