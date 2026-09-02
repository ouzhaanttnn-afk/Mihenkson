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
 * B3 — AYARIN HIZ YARISI
 *
 * Yüksek ayarda metal payı baskındır: alıcı bulmak kolaydır, mal hızlı döner.
 * Düşük ayarda işçilik payı ağır basar: doğru müşteriyi beklemek gerekir.
 *
 * MARJ YARISI OLMADAN BU TABLO ZARARLIDIR ve bir ara öyle denendi: marj
 * farkı yokken yüksek ayar düpedüz üstün oluyordu — B3'ün şikâyet ettiği
 * eşitlikten de kötü bir durum. Karşılığı `customer-pricing · CRAFTED_BANDS`
 * içinde kuruldu (işçilik payı milyemle ölçeklenmez → düşük ayar geniş marj).
 * İkisi birlikte anlamlıdır; biri kaldırılırsa öbürü de kaldırılmalıdır.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { InventoryPosition, ItemInstance, Karat } from './types';

/**
 * İlginin tabana indiği gün. Stok ekranındaki "ölü stok" eşiğiyle aynı
 * tutuldu: oyuncuya "ölü" diye gösterilen mal ile vitrinde artık ilgi
 * görmeyen mal aynı şey olmalı, yoksa ekran ile mekanik ayrışır.
 */
export const SHOWCASE_STALE_AGE = 6;

/** Yaşlanmanın indirebileceği en düşük çarpan. Sıfır DEĞİL — bkz. başlık. */
export const SHOWCASE_STALE_FLOOR = 0.35;

/**
 * Ayarın likiditesi — dar marjın karşılığı hızlı devir.
 * Marj tarafı için bkz. `customer-pricing · CRAFTED_BANDS`.
 */
export const KARAT_LIQUIDITY: Partial<Record<Karat, number>> = {
  '8K': 0.75,
  '14K': 0.95,
  '18K': 1.1,
  '22K': 1.3,
};

/** Ayarı bilinmeyen (ya da sarrafiye) ürün ortalama likidite sayılır. */
export const DEFAULT_LIQUIDITY = 1;

/** Yalnız yaşlanma bileşeni — testlerin ve arayüzün ayrı ayrı okuyabilmesi için. */
export function ageFactor(position: InventoryPosition): number {
  const age = Math.max(0, position.age);
  const wear = Math.min(1, age / SHOWCASE_STALE_AGE);
  return 1 - (1 - SHOWCASE_STALE_FLOOR) * wear;
}

/**
 * Vitrindeki ürünün ilgi çarpanı: yaşlanma × ayar likiditesi.
 *
 * Yaşlanma 0. günde 1,0'dan başlar, `SHOWCASE_STALE_AGE` gününde tabana
 * (`SHOWCASE_STALE_FLOOR`) iner ve orada kalır — sonsuza dek azalmaz, çünkü
 * ürünü tamamen görünmez kılmak oyuncuya çıkışı olmayan bir slot bırakırdı.
 *
 * BEYAN EDİLEN AYAR KULLANILIR, gerçek ayar değil: vitrine bakan müşteri de
 * oyuncu gibi etiketi görür, malın içini bilmez. Gerçek ayarı kullanmak,
 * müşteriye mihenk taşından geçmiş bilgi vermek olurdu.
 */
export function showcaseWeight(item: ItemInstance, position: InventoryPosition): number {
  const liquidity = KARAT_LIQUIDITY[item.declared.claimedKarat] ?? DEFAULT_LIQUIDITY;
  return ageFactor(position) * liquidity;
}

/** Bayat mı — arayüzde "ilgisi düştü" demek için. */
export function isShowcaseStale(position: InventoryPosition): boolean {
  return position.age >= SHOWCASE_STALE_AGE;
}
