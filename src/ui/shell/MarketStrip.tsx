/**
 * B — Piyasa Şeridi (GDD 23.9.2, 44 px)
 * "Nakit + 3–5 varlık; yatay swipe. Dokununca Piyasa ekranı açılır."
 *
 * GDD 23.9.1: "Piyasa, ana Dükkan ekranındaki piyasa şeridine dokunularak
 * açılır; ayrı alt-nav öğesi değildir."
 * GDD 23.8: "Piyasa sayısını müşteri işleminin önüne geçirme" → şerit ince
 * kalır ve tipografik ağırlığı Karar Dock'unun altındadır.
 */

import { t } from '@i18n/index';
import { pctChange, price, tl } from '@ui/format';
import type { MarketState, Money } from '@domain/types';

interface Props {
  market: MarketState;
  cash: Money;
  onOpenMarket: () => void;
}

export function MarketStrip({ market, cash, onOpenMarket }: Props) {
  const closed = market.marketOpen === false;
  const gramAsset = market.assets.find((asset) => asset.id === 'goldGram');
  /*
   * HAS, piyasa motorundaki saf 1.000 altın spotunun kendisidir. Gram Altın
   * ise ürün saflığıyla fiyatlandığı için aynı etiket altında gösterilmesi
   * iki farklı referansı birbirine karıştırıyordu. Yeni bir fiyat üretmeden
   * canonical goldSpot'u şeritte ayrı ve açık bir kart olarak gösteriyoruz.
   */
  const visibleAssets = [
    {
      id: 'hasGold',
      label: t('HAS Altın'),
      price: market.goldSpot,
      changePct: gramAsset?.changePct ?? 0,
    },
    ...market.assets,
  ].slice(0, 5);

  /*
   * ŞERİT TEK BİR <button> DEĞİLDİR.
   *
   * Öyleydi ve 23.9.2'nin "yatay swipe" sözü fiilen çalışmıyordu: tarayıcı
   * bir butonun içindeki yatay kaydırmayı tıklamayla karıştırıyor, üstelik
   * kaydırılabilir olduğuna dair hiçbir işaret bulunmuyordu. Sonuç: 360–430
   * px'lik telefonlarda dört varlığın YALNIZ İKİSİ görünüyordu (ölçüm:
   * Gümüş right=455, Dolar right=564). Yani veri ekranda değildi.
   *
   * Şimdi kapsayıcı gerçek bir kaydırma alanı, her varlık ayrı bir buton:
   * swipe kaydırır, dokunuş Piyasa ekranını açar (23.9.1).
   */
  return (
    <div
      className={`marketStrip ${closed ? 'marketStrip--closed' : ''}`}
      role="group"
      aria-label={t('Piyasa şeridi — kaydırarak tüm varlıkları görün')}
    >
      <button
        type="button"
        className="marketStrip__cash"
        onClick={onOpenMarket}
        aria-label={t('{varlik} {fiyat} — piyasa ekranını aç', {
          varlik: t('Nakit'),
          fiyat: tl(cash),
        })}
      >
        <span className="marketStrip__cashLabel">{t('Nakit')}</span>
        <span className="marketStrip__cashValue num">{tl(cash)}</span>
      </button>

      {visibleAssets.map((asset) => (
        <button
          key={asset.id}
          type="button"
          className="marketStrip__asset"
          onClick={onOpenMarket}
          aria-label={t('{varlik} {fiyat} — piyasa ekranını aç', {
            varlik: t(asset.label),
            fiyat: price(asset.price),
          })}
        >
          <span className="marketStrip__label">{t(asset.label)}</span>
          <span className="marketStrip__row">
            <span className="marketStrip__price num">{price(asset.price)}</span>
            <span className={`marketStrip__change num ${changeClass(asset.changePct)}`}>
              {closed ? 'donuk' : pctChange(asset.changePct)}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}

function changeClass(pct: number): string {
  if (pct > 0.005) return 'marketStrip__change--up';
  if (pct < -0.005) return 'marketStrip__change--down';
  return 'marketStrip__change--flat';
}
