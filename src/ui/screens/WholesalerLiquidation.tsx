import { t } from '@i18n/index';
import { useState } from 'react';

import { isBullion } from '@data/bullion';
import { quoteLiquidation, recommendedSlices } from '@domain/wholesaler';
import { useGame } from '@state/gameStore';
import { tl, tlSigned } from '@ui/format';
import type { InventoryPosition, ItemInstance } from '@domain/types';

type WholesalerLiquidationListProps = {
  emptyText?: string;
};

/** İşletme ve Stok ekranlarının kullandığı tek toptancı satış görünümü. */
export function WholesalerLiquidationList({
  emptyText = t('Bozulacak sarrafiye yok.'),
}: WholesalerLiquidationListProps) {
  const s = useGame();
  const liquidatable = s.inventory
    .filter((position) => position.location !== 'workshop')
    .map((position) => ({ position, item: s.items[position.itemId] }))
    .filter(
      (row): row is { position: InventoryPosition; item: ItemInstance } =>
        !!row.item && isBullion(row.item.templateId),
    );

  if (liquidatable.length === 0) return <p className="emptyNote">{emptyText}</p>;

  return liquidatable.map(({ position, item }) => (
    <WholesalerLiquidationRow key={position.itemId} position={position} item={item} />
  ));
}

/**
 * Tek işlem veya kontrollü dilimler. Fiyat ve transaction doğrudan mevcut
 * toptancı motorundan gelir; bu bileşen yalnız iki ekranda aynı UI'ı sunar.
 */
function WholesalerLiquidationRow({
  position,
  item,
}: {
  position: InventoryPosition;
  item: ItemInstance;
}) {
  const s = useGame();
  const [quantity, setQuantity] = useState(position.quantity);
  const [slices, setSlices] = useState(1);

  const gramPool = position.poolId === '24K_GRAM_GOLD_POOL';
  const qty = Math.min(position.quantity, Math.max(gramPool ? 0.001 : 1, quantity));
  const quote = quoteLiquidation(
    { itemId: position.itemId, quantity: qty },
    s.items,
    s.inventory,
    s.market,
    s.store,
    slices,
  );
  if (!quote) return null;

  const suggested = recommendedSlices(qty, quote.capacityPerSlice);
  const profit = quote.gross - quote.costBasis;

  return (
    <div className="lotRow">
      <div className="lotRow__head">
        <span className="lotRow__name">
          {t(item.displayName)}
          {position.quantity > 1 && ` · stokta ${position.quantity}`}
        </span>
        <span className="lotRow__price num">{tl(quote.gross)}</span>
      </div>

      <div className="lotRow__terms">
        {quote.grams.toFixed(2)} gr · maliyet {tl(quote.costBasis)} ·{' '}
        <span className={profit >= 0 ? 'statLine__value--positive' : 'statLine__value--negative'}>
          {tlSigned(profit)}
        </span>
      </div>
      <div className="lotRow__terms">{quote.rationale}</div>

      <div className="lotRow__controls">
        {(gramPool || position.quantity > 1) && (
          <label className="lotRow__field">
            <span>
              {gramPool
                ? 'Gram'
                : position.poolId === '22K_INVESTMENT_BANGLE_POOL'
                  ? '10 g birim'
                  : 'Adet'}
            </span>
            <input
              type="number"
              min={gramPool ? 0.001 : 1}
              step={gramPool ? 0.001 : 1}
              max={position.quantity}
              value={qty}
              onChange={(event) => setQuantity(Number(event.target.value))}
            />
          </label>
        )}
        <label className="lotRow__field">
          <span>Dilim</span>
          <input
            type="number"
            min={1}
            max={Math.max(1, qty)}
            value={slices}
            onChange={(event) => setSlices(Number(event.target.value))}
          />
        </label>
        {suggested > slices && (
          <button type="button" className="miniBtn" onClick={() => setSlices(suggested)}>
            {suggested} dilim öner
          </button>
        )}
        <button
          type="button"
          className="lotRow__buy"
          onClick={() => s.liquidateToWholesaler(position.itemId, qty, slices)}
        >
          {t('Toptancıya Sat')}
        </button>
      </div>
    </div>
  );
}
