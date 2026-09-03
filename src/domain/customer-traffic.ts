/**
 * MÜŞTERİ TRAFİĞİ — itibar ve mağaza kademesi kaç müşteri getirir.
 *
 * GDD 10.1: *"Semt/Marka İtibarı → müşteri trafiği, premium segment."*
 * Bu cümlenin İKİNCİ yarısı zaten kuruluydu: itibar yükseldikçe havuzdaki
 * arketipler değişiyor, VIP ve koleksiyoncu açılıyordu (`pickArchetype`).
 * BİRİNCİ yarısı — trafiğin kendisi — hiçbir yerde yoktu: geliş aralığı
 * yalnız tohuma, günün karakterine ve "Müşteri Akını" düğmesine bakıyordu.
 * Yani tanınan bir sarrafla ilk günkü sarraf aynı sayıda müşteri
 * görüyordu. Bu dosya o eksiği kapatır.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * BAŞLANGIÇ NOKTASI TAM OLARAK 1,0'DIR.
 *
 * Çarpan `START.reputation` ve 1. kademeye göre çıpalanmıştır: yeni oyun
 * açan biri için hiçbir şey değişmez, bugünkü denge aynen korunur. Formül
 * yalnız İLERLEMEYİ ödüllendirir ve gerilemeyi hissettirir.
 *
 * DETERMİNİZM BOZULMAZ: burada zar atılmaz. `nextCustomerDelay` yine tam
 * bir `next()` çekilişi tüketir; bu çarpan onun SONUCUNU ölçekler. Aynı
 * tohum, aynı mağaza durumu → aynı gün.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { START } from './balance';
import type { StoreState } from './types';

/**
 * İtibarın taşıdığı ağırlık. 100 itibarda yoğunluk çarpanı
 * `1 + (100 − 42) / 100 × 0,9 ≈ 1,52` olur — yani gün başına müşteri
 * yaklaşık yarı yarıya artar. Sıfır itibarda `1 − 0,38 = 0,62`ye düşer:
 * adı kötüye çıkmış dükkâna daha az kişi girer.
 */
const REPUTATION_WEIGHT = 0.9;

/**
 * Her mağaza kademesi ayrı bir basamak ekler. Kademe yatırımı yalnız vitrin
 * ve kapasite açmakla kalmaz, dükkânı görünür de kılar.
 */
const TIER_STEP = 0.1;

/**
 * Uçlar kelepçelenir. Üst sınır kuyruk kapasitesinin büyüme oranıyla
 * uyumlu (4 → 10 kişi); alt sınır ise oyunu kilitlememek için var —
 * itibarı dibe vurmuş oyuncuya "hiç müşteri gelmiyor" cezası vermek,
 * toparlanma yolunu da kapatırdı.
 */
const MIN_DENSITY = 0.6;
const MAX_DENSITY = 1.9;

/**
 * Gün başına düşen müşteri yoğunluğu çarpanı.
 * 1,0 = başlangıç dükkânı. Büyüdükçe artar.
 */
export function customerDensity(store: Pick<StoreState, 'reputation' | 'storeTier'>): number {
  const rep = (store.reputation - START.reputation) / 100;
  const tier = Math.max(0, store.storeTier - 1);
  const density = 1 + rep * REPUTATION_WEIGHT + tier * TIER_STEP;
  return Math.min(MAX_DENSITY, Math.max(MIN_DENSITY, density));
}

/**
 * Geliş aralığına uygulanacak çarpan — yoğunluğun tersi.
 *
 * Yoğunluk arttıkça aralık kısalır: 1,5 yoğunluk, aralığı üçte iki
 * uzunluğuna indirir.
 */
export function customerDelayFactor(
  store: Pick<StoreState, 'reputation' | 'storeTier'>,
): number {
  return 1 / customerDensity(store);
}
