import { bullionMeta, isBullion } from '@data/bullion';
import { MARKET_REGIME } from './balance';
import type { ItemInstance, MarketState, TradeSide } from './types';

/**
 * İŞÇİLİKLİ ÜRÜN BANTLARI — ayar artık bir KARAR.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ÖNCEKİ YAPI VE NEDEN DÖRT AYAR DA AYNI MARJI VERİYORDU
 *
 * Bantların tamamı 14K'nin oranlarından türetilip MİLYEMLE ölçeklenmişti
 * (doğrulandı: her dört ayarda sapma %0,5 altında). Yani:
 *
 *     alış(k)  = milyem(k) × 0,876
 *     satış(k) = milyem(k) × 1,171
 *
 * Marj `satış / alış` olduğu için milyem SADELEŞİYOR ve dördü de zorunlu
 * olarak aynı çıkıyordu (%33,8 / %33,7 / %33,7 / %33,6). Bu bir ayar hatası
 * değil, yapının matematiksel sonucuydu: ayarı kârlılıkta anlamlı kılmanın
 * yolu, saf milyem orantısını BİR TARAFTA kırmaktan geçiyor.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * YENİ YAPI — İŞÇİLİK MİLYEMLE ÖLÇEKLENMEZ
 *
 * Gerçek hayatta bir yüzüğü işlemenin emeği, içindeki altının ayarına bağlı
 * değildir: aynı model 8K da olsa 22K da olsa tezgâhta aynı işi ister.
 * Dolayısıyla satış fiyatının işçilikten gelen kısmı milyemle ORANTILI
 * OLMAMALI. Formül bu gerçeği yansıtıyor:
 *
 *     satış(k) = milyem(k) × taban + işçilik payı        (işçilik payı sabit)
 *
 * Sonuç kendiliğinden çıkıyor — elle ayarlanmış bir marj tablosu değil:
 *
 *     düşük ayar → metal az, işçilik payı ağır basar → MARJ GENİŞ
 *     yüksek ayar → metal baskın                     → MARJ DAR
 *
 * Karşılığı `showcase-weight · KARAT_LIQUIDITY`te: yüksek ayar HIZLI döner,
 * düşük ayar doğru müşteriyi bekler. İkisi birlikte anlamlıdır; yalnız biri
 * uygulanırsa bir ayar düpedüz üstün olur.
 *
 * 14K ÇIPA OLARAK AYNEN KORUNDU (bantları birebir eski değerinde), çünkü
 * ekonominin tamamı 14K'nin milyemine göre kurulmuştu. Alış bantlarına hiç
 * dokunulmadı: dükkânın satıcıya ödediği fiyat değişmedi, değişen müşterinin
 * ödediği.
 *
 *     ayar   marj eski → yeni
 *     8K     %33,8 → %41,9
 *     14K    %33,7 → %33,7   (çıpa, değişmedi)
 *     18K    %33,7 → %31,3
 *     22K    %33,6 → %29,2
 * ═══════════════════════════════════════════════════════════════════════════
 */
export const CRAFTED_BANDS = {
  '8K': { metal: .333, buy: [.256, .327], sell: [.386, .441] },
  '14K': { metal: .585, buy: [.450, .575], sell: [.640, .730] },
  '18K': { metal: .750, buy: [.577, .737], sell: [.806, .919] },
  '22K': { metal: .912, buy: [.705, .900], sell: [.969, 1.105] },
} as const;
export const CUSTOMER_SPREAD = { calm: [200, 250], normal: [300, 350], volatile: [350, 450], shock: [450, 500] } as const;
export function customerSpread(market: MarketState): number {
  const band = CUSTOMER_SPREAD[market.regime];
  const volatilityBand = MARKET_REGIME[market.regime].dailyMove;
  const t = Math.max(0, Math.min(1, (market.volatility - volatilityBand[0]) / (volatilityBand[1] - volatilityBand[0] || 1)));
  return band[0] + (band[1] - band[0]) * t;
}
export function isCrafted(item: ItemInstance): boolean {
  return item.metal === 'gold' && !isBullion(item.templateId) && item.truth.actualKarat in CRAFTED_BANDS;
}
export function customerPriceBand(item: ItemInstance, market: MarketState, side: TradeSide, quantity = 1): { min: number; max: number; reference: number } | null {
  const meta = bullionMeta(item.templateId);
  if (meta && Math.abs(item.truth.actualPurity - meta.unitPurity) > .0002) return null;
  if (meta) {
    const reference = meta.unitWeightGrams * meta.unitPurity * market.goldSpot * quantity;
    const halfSpread = customerSpread(market) * meta.unitWeightGrams * quantity / 2;
    return side === 'shopBuys' ? { min: reference - halfSpread, max: reference, reference }
      : { min: reference, max: reference + halfSpread, reference };
  }
  if (!isCrafted(item)) return null;
  const rule = CRAFTED_BANDS[item.truth.actualKarat as keyof typeof CRAFTED_BANDS];
  const weightValue = item.truth.netMetalWeight * market.goldSpot * quantity;
  const band = side === 'shopBuys' ? rule.buy : rule.sell;
  return { min: weightValue * band[0], max: weightValue * band[1], reference: weightValue * rule.metal };
}
