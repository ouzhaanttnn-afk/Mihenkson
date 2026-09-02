/**
 * VİTRİN AĞIRLIĞI — vitrindeki hangi ürünün müşteri ilgisini çekeceği.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * B4 — VİTRİN BİR KARAR OLSUN, DEPO OLMASIN
 *
 * Vitrin müşterisi hedefini DÜZGÜN DAĞILIMLA seçiyordu (`showcaseRng.pick`),
 * yani vitrine konan ürün süresiz olarak aynı çekiciliği koruyordu. Koy ve
 * unut: vitrin bir karar değil, bir depoydu.
 *
 * Artık ilgi bekledikçe azalıyor. Oyuncu "bunu indireyim mi, toptancıya mı
 * vereyim, eritip sarrafiyeye mi döneyim" diye düşünmek zorunda.
 *
 * DETERMİNİZM (GDD 28.3): `Rng.pickWeighted` tam olarak `pick` kadar, yani
 * BİR çekim harcar. Çekim sayısı değişmediği için tohum zinciri aynen korunur;
 * değişen tek şey hangi ürünün seçildiğidir.
 *
 * AĞIRLIK ASLA SIFIR OLMAZ. Sıfır ağırlık ürünü vitrinde ulaşılamaz kılardı:
 * oyuncu satamadığı bir malı slot işgal ederken seyrederdi. Yaşlanma ilgiyi
 * AZALTIR, yok etmez.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * AYAR (B3) BURAYA GİRMEDİ — ÖLÇÜM SONUCU
 *
 * İlk hâlinde bu dosyada bir `KARAT_LIQUIDITY` tablosu vardı: yüksek ayar
 * hızlı döner, düşük ayar yavaş. B3'ün "hız" yarısı buydu ve marj yarısıyla
 * (`CRAFTED_BANDS`) BİRLİKTE anlamlıydı — yavaşlığın karşılığı geniş marj
 * olacaktı.
 *
 * Marj yarısı denendi ve GERİ ALINDI: tezin vaadi ile müşterinin ödediği
 * arasındaki uyum bozuluyordu. Ölçüm (ayar başına, vaat/ödeme):
 *
 *     mevcut hâl        8K +%40,0   14K −%9,5   18K +%2,6
 *     denemeden sonra   8K +%13,1   14K −%25,8  18K −%29,0
 *
 * Yani ayar bantları ayrışmadan ÖNCE bile vaat ile ödeme tutmuyor; `estMetal`
 * içinde ürüne göre değişen (~0,76–0,79) ayrı bir temkin indirimi var ve
 * müşteri fiyatı formülüyle aynı tabana oturmuyor. Bu çözülmeden ayarı
 * ayrıştırmak uyumu daha da bozuyor.
 *
 * Hız yarısını TEK BAŞINA bırakmak ise daha kötüydü: marj farkı olmadan
 * yüksek ayar düpedüz üstün olurdu — B3'ün şikâyet ettiği eşitlikten de kötü.
 * Bu yüzden ayar buraya girmedi; yaşlanma tek başına tutarlı ve yeterli.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { InventoryPosition } from './types';

/**
 * İlginin tabana indiği gün. Stok ekranındaki "ölü stok" eşiğiyle aynı
 * tutuldu: oyuncuya "ölü" diye gösterilen mal ile vitrinde artık ilgi
 * görmeyen mal aynı şey olmalı, yoksa ekran ile mekanik ayrışır.
 */
export const SHOWCASE_STALE_AGE = 6;

/** Yaşlanmanın indirebileceği en düşük çarpan. Sıfır DEĞİL — bkz. başlık. */
export const SHOWCASE_STALE_FLOOR = 0.35;

/**
 * Vitrindeki ürünün ilgi çarpanı.
 *
 * 0. günde 1,0'dan başlar, `SHOWCASE_STALE_AGE` gününde tabana
 * (`SHOWCASE_STALE_FLOOR`) iner ve orada kalır — sonsuza dek azalmaz, çünkü
 * ürünü tamamen görünmez kılmak oyuncuya çıkışı olmayan bir slot bırakırdı.
 */
export function showcaseWeight(position: InventoryPosition): number {
  const age = Math.max(0, position.age);
  const wear = Math.min(1, age / SHOWCASE_STALE_AGE);
  return 1 - (1 - SHOWCASE_STALE_FLOOR) * wear;
}

/** Bayat mı — arayüzde "ilgisi düştü" demek için. */
export function isShowcaseStale(position: InventoryPosition): boolean {
  return position.age >= SHOWCASE_STALE_AGE;
}
