/**
 * B3 — AYAR ARTIK BİR KARAR
 *
 * Dört ayarın dördü de aynı brüt marjı veriyordu (%33,8 / %33,7 / %33,7 /
 * %33,6). Sebebi bir ayar hatası değildi: bantların tamamı 14K'nin
 * oranlarından türetilip MİLYEMLE ölçeklenmişti, marj `satış/alış` olduğu
 * için milyem sadeleşiyor ve eşitlik matematiksel olarak ZORUNLU oluyordu.
 *
 * Çözüm, saf milyem orantısını bir tarafta kırmak: satış fiyatının
 * işçilikten gelen kısmı milyemle ölçeklenmez, çünkü bir yüzüğü işlemenin
 * emeği içindeki altının ayarına bağlı değildir.
 *
 * Bu testler hem yeni yayılımı hem de KORUNMASI GEREKENLERİ sabitliyor:
 * 14K çıpası ve alış bantları.
 */

import { describe, expect, it } from 'vitest';
import { CRAFTED_BANDS } from './customer-pricing';

type Karat = keyof typeof CRAFTED_BANDS;
const KARATLAR = ['8K', '14K', '18K', '22K'] as const;
const orta = (b: readonly [number, number] | readonly number[]) => (b[0]! + b[1]!) / 2;
const marj = (k: Karat) => orta(CRAFTED_BANDS[k].sell) / orta(CRAFTED_BANDS[k].buy) - 1;

describe('B3 · ayar bantları', () => {
  it('MARJ AYARLA BİRLİKTE DARALIR — maddenin kendisi bu', () => {
    const marjlar = KARATLAR.map(marj);

    for (let i = 1; i < marjlar.length; i++) {
      expect(marjlar[i]!).toBeLessThan(marjlar[i - 1]!);
    }
  });

  it('yayılım anlamlı: en düşük ile en yüksek ayar arasında en az 10 puan', () => {
    expect((marj('8K') - marj('22K')) * 100).toBeGreaterThan(10);
  });

  /*
    14K ÇIPADIR. Ekonominin tamamı 14K'nin milyemine göre kurulmuştu; onu
    oynatmak her şeyi oynatmak olurdu. Bantları birebir eski değerinde.
  */
  it('14K bantları AYNEN korunur — çıpa oynamaz', () => {
    expect(CRAFTED_BANDS['14K'].buy).toEqual([0.450, 0.575]);
    expect(CRAFTED_BANDS['14K'].sell).toEqual([0.640, 0.730]);
    expect(marj('14K') * 100).toBeCloseTo(33.7, 0);
  });

  /*
    ALIŞ TARAFINA DOKUNULMADI: dükkânın satıcıya ödediği fiyat değişmedi,
    değişen yalnız müşterinin ödediği. Alış bantları hâlâ saf milyem orantılı.
  */
  it('alış bantları hâlâ saf milyem orantılı', () => {
    const oran = (k: Karat) => orta(CRAFTED_BANDS[k].buy) / CRAFTED_BANDS[k].metal;
    const taban = oran('14K');

    for (const k of KARATLAR) expect(oran(k)).toBeCloseTo(taban, 2);
  });

  /*
    Yeni yapının imzası: SATIŞ tarafı artık saf milyem orantılı DEĞİL.

    Karşı-olgu ile ölçülüyor: saf milyem orantılı olsaydı `satış / milyem`
    dört ayarda da AYNI çıkardı. Eski yapıda öyleydi — en yüksek/en düşük
    oranı 1,004 idi, yani fiilen 1. Şimdi 1,09.

    Bu test bozulursa biri işçilik payını sessizce geri almış demektir.
  */
  it('satış bantları saf milyem orantılı DEĞİL — işçilik payı var', () => {
    const oranlar = KARATLAR.map((k) => orta(CRAFTED_BANDS[k].sell) / CRAFTED_BANDS[k].metal);
    const yayilim = Math.max(...oranlar) / Math.min(...oranlar);

    expect(yayilim).toBeGreaterThan(1.05);
  });

  it('düşük ayarda metal payı düşükken satış oranı yüksektir — işçilik ağır basar', () => {
    const metalUstuKat = (k: Karat) => orta(CRAFTED_BANDS[k].sell) / CRAFTED_BANDS[k].metal;

    expect(metalUstuKat('8K')).toBeGreaterThan(metalUstuKat('14K'));
    expect(metalUstuKat('14K')).toBeGreaterThan(metalUstuKat('18K'));
    expect(metalUstuKat('18K')).toBeGreaterThan(metalUstuKat('22K'));
  });

  it('hiçbir ayarda satış alışın altına düşmez — zararına satış yapısal olamaz', () => {
    for (const k of KARATLAR) {
      expect(CRAFTED_BANDS[k].sell[0]).toBeGreaterThan(CRAFTED_BANDS[k].buy[1]!);
    }
  });
});
