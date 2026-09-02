/**
 * İşlem Masası · MÜŞTERİ ALIŞ AKIŞI (GDD 23.23)
 *
 * "Müşteri alış: Stok seçimi → Değer/Paket → Pazarlık."
 *
 * Ekonomi Ara Düzeltmesi §3'ün terminolojisiyle: müşteri ALIR, oyuncu SATAR.
 *
 * Bu akışın satış akışından yüzeysel farkı üç adım olması; YAPISAL farkı ise
 * belirsizliğin yer değiştirmesidir. Satış akışında bilinmeyen ürünün
 * gerçeğidir ve testlerle kapanır. Burada ürün oyuncunun kendi stoğudur;
 * bilinmeyen MÜŞTERİNİN ÖDEME TAVANIdır ve o hiçbir araçla ölçülemez —
 * yalnız doğru malı doğru pakette sunarak yükseltilebilir.
 *
 * GDD 23.24 gereği üç adım da AYNI Workbench yüzeyini kullanır.
 * GDD 6.6 gereği müşterinin tavanı hiçbir yerde sayı olarak gösterilmez.
 */

import { demandOutcome, matchDemand, type DemandMatch, type DemandOutcome } from '@domain/purchase';
import { CHANNEL_LABEL_TR } from '@domain/channels';
import { getTemplate } from '@data/item-templates';
import { IconPackage, IconWarning, ProductSilhouette } from '@ui/icons';
import { tl, tlSigned } from '@ui/format';
import type {
  CustomerDemand,
  InventoryPosition,
  ItemInstance,
  PurchaseSession,
} from '@domain/types';

const MATCH_LABEL: Record<DemandMatch, string> = {
  exact: 'Tam istediği',
  family: 'İlgili ürün',
  off: 'Aradığı değil',
};
const amountLabel = (demand: CustomerDemand, units: number): string => demand.poolId === '24K_GRAM_GOLD_POOL' ? `${units} g` : demand.poolId === '22K_INVESTMENT_BANGLE_POOL' ? `${units * 10} g` : `${units} adet`;

// ---------------------------------------------------------------------------
// 1. STOK SEÇİMİ
// ---------------------------------------------------------------------------

export function StockPickStage({
  purchase,
  rows,
  onToggle,
  onQuantity,
}: {
  purchase: PurchaseSession;
  rows: { position: InventoryPosition; item: ItemInstance }[];
  onToggle: (itemId: string) => void;
  onQuantity: (itemId: string, quantity: number) => void;
}) {
  const demand = purchase.demand;
  const picked = new Map(purchase.lines.map((l) => [l.itemId, l.quantity]));
  const available = rows
    .filter((r) => matchDemand(demand, r.item) !== 'off')
    .reduce((sum, r) => sum + r.position.quantity, 0);
  const outcome = demandOutcome(demand, available);

  return (
    <div className="svc">
      <div className="pkgDemand">
        <span className="pkgDemand__icon">
          <IconPackage size={20} />
        </span>
        <div>
          <h2 className="svc__title">{demand.summary}</h2>
          <p className="svc__meta">
            {demand.targetInventoryItemId ? '★ Vitrin Müşterisi' : `${amountLabel(demand, demand.quantity)} istiyor`}
            {demand.acceptsPartial && demand.minQuantity < demand.quantity && (
              <> · en az {amountLabel(demand, demand.minQuantity)} kabul ediyor</>
            )}
            {demand.isBulk && <> · toplu müşteri</>}
          </p>
        </div>
      </div>

      {/*
        §4.1 — "Toplu talepler stok yetersizliğinde reddedilebilir, kısmen
        karşılanabilir veya uygun ticari kanal üzerinden tedarik edilerek
        tamamlanabilir." Durum sessizce yutulmaz; oyuncu hangi yolda
        olduğunu görür.
      */}
      {outcome !== 'full' && rows.length > 0 && (
        <p className="svc__problem">
          <span className="svc__problemIcon">
            <IconWarning size={15} />
          </span>
          {outcomeText(outcome, available, demand)}
        </p>
      )}

      {/*
        `svc__note--center` bir flex kutusudur: içine DOĞRUDAN konan ikon,
        <strong> ve metin ayrı birer flex ögesi olur, yan yana sıkışır ve
        birbirine girerdi — "Stokta sunulacak ürün yok." üç satıra kırılıp
        yandaki cümleyle çakışıyordu. Tek bir çocuk düğüm bunu keser.
      */}
      {rows.length === 0 ? (
        <p className="svc__note svc__note--center">
          <span>
            <IconWarning size={16} />
            <strong>Stokta sunulacak ürün yok.</strong> Bu müşteriye verecek malınız
            bulunmuyor; talebi karşılayamadan gitmesi normaldir.
          </span>
        </p>
      ) : (
        <ul className="pickList">
          {rows.map(({ position, item }) => {
            const match = matchDemand(demand, item);
            const qty = picked.get(item.id) ?? 0;
            const isOn = qty > 0;
            // Sarrafiye adetle satılır; işçilikli ürün tektir.
            const stackable = position.quantity > 1;

            return (
              <li key={item.id}>
                <div className={`pickRow ${isOn ? 'pickRow--on' : ''}`}>
                  <button
                    type="button"
                    className="pickRow__pick"
                    onClick={() => onToggle(item.id)}
                    aria-pressed={isOn}
                  >
                    <span className="pickRow__art">
                      <ProductSilhouette
                        kind={getTemplate(item.templateId).silhouette}
                        size={30}
                      />
                    </span>
                    <span className="pickRow__body">
                      <span className="pickRow__name">{item.displayName}</span>
                      <span className={`pickRow__match pickRow__match--${match}`}>
                        {MATCH_LABEL[match]}
                        {stackable && ` · stokta ${amountLabel(demand, position.quantity)}`}
                        {position.location === 'backStock' && ' · arka stok'}
                      </span>
                    </span>
                    <span className="pickRow__value">{tl(position.currentValue)}</span>
                  </button>

                  {isOn && stackable && (
                    <div className="qtyStep" role="group" aria-label={`${item.displayName} adedi`}>
                      <button
                        type="button"
                        className="qtyStep__btn"
                        onClick={() => onQuantity(item.id, qty - 1)}
                        aria-label="Bir azalt"
                      >
                        −
                      </button>
                      {position.poolId === '24K_GRAM_GOLD_POOL' ? <input className="qtyStep__value num" aria-label="Paket gramı" type="number" min="0.001" step="0.001" max={Math.min(position.quantity, demand.quantity)} value={qty} onChange={e => onQuantity(item.id, Number(e.target.value))} /> : <span className="qtyStep__value num">{amountLabel(demand, qty)}</span>}
                      <button
                        type="button"
                        className="qtyStep__btn"
                        onClick={() => onQuantity(item.id, qty + 1)}
                        disabled={qty >= Math.min(position.quantity, demand.quantity)}
                        aria-label="Bir artır"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function outcomeText(outcome: DemandOutcome, available: number, demand: CustomerDemand): string {
  switch (outcome) {
    case 'partial':
      return `Stokta ${amountLabel(demand, available)} var; ${amountLabel(demand, demand.quantity)} isteniyor. Müşteri eksiğe razı.`;
    case 'sourceNeeded':
      return `Stokta ${amountLabel(demand, available)} var; müşteri ${amountLabel(demand, demand.quantity)} altını kabul etmiyor. Ticari kanaldan tedarik gerekir.`;
    case 'reject':
      return 'Bu talebi karşılayacak mal yok.';
    default:
      return '';
  }
}

// ---------------------------------------------------------------------------
// 2. DEĞER / PAKET
// ---------------------------------------------------------------------------

export function PackageStage({
  purchase,
  items,
}: {
  purchase: PurchaseSession;
  items: Record<string, ItemInstance>;
}) {
  const potential = purchase.suggestedPrice - purchase.packageCost;

  return (
    <div className="svc">
      <div className="pkgDemand">
        <span className="pkgDemand__icon">
          <IconPackage size={20} />
        </span>
        <div>
          <h2 className="svc__title">Paket · {amountLabel(purchase.demand, purchase.units)}</h2>
          <p className="svc__meta">{fulfilmentText(purchase, purchase.demand)}</p>
        </div>
      </div>

      <ul className="pkgLines">
        {purchase.lines.map((line) => {
          const item = items[line.itemId];
          if (!item) return null;
          return (
            <li key={line.itemId} className="pkgLines__row">
              <ProductSilhouette kind={getTemplate(item.templateId).silhouette} size={22} />
              <span>{item.displayName}</span>
              <span className="pkgLines__qty num">×{line.quantity}</span>
            </li>
          );
        })}
      </ul>

      {/*
        GDD 6.6 — müşterinin ödeme tavanı GÖSTERİLMEZ. Gösterilen her sayı
        oyuncunun kendi tarafındandır: paketin adil değeri, defter maliyeti,
        kanal makasının önerdiği fiyat ve aradaki potansiyel.
      */}
      <div className="pkgFigures">
        <Figure label="Adil değer" value={tl(purchase.packageFairValue)} />
        <Figure label="Alış Maliyetim" value={tl(purchase.packageCost)} />
        <Figure
          label="Kanal önerisi"
          value={tl(purchase.suggestedPrice)}
          tone={potential >= 0 ? 'positive' : 'negative'}
          big
        />
        <Figure label="Kâr / Zarar (öneri)" value={tlSigned(potential)} tone={potential >= 0 ? 'positive' : 'negative'} />
      </div>

      <p className="svc__note">
        <IconPackage size={16} />
        <strong>{CHANNEL_LABEL_TR[purchase.channel]}</strong> alış-satış farkıyla{' '}
        fiyatlandı. {stripRepeatedChannel(purchase.rationale, purchase.channel)} Öneri bir dayatma değildir; pazarlıkta istediğiniz
        rakamı verirsiniz.
      </p>
    </div>
  );
}

function stripRepeatedChannel(rationale: string, channel: PurchaseSession['channel']): string {
  const label = CHANNEL_LABEL_TR[channel];
  return rationale.replace(new RegExp(`^${label}\\s*[·—:-]?\\s*`, 'i'), '');
}

function Figure({
  label,
  value,
  tone,
  big,
}: {
  label: string;
  value: string;
  tone?: 'positive' | 'negative';
  big?: boolean;
}) {
  return (
    <div className={`pkgFigure ${big ? 'pkgFigure--big' : ''}`}>
      <span className="pkgFigure__label">{label}</span>
      <span className={`pkgFigure__value ${tone ? `pkgFigure__value--${tone}` : ''}`}>{value}</span>
    </div>
  );
}

function fulfilmentText(purchase: PurchaseSession, demand: CustomerDemand): string {
  switch (purchase.fulfilment) {
    case 'full':
      return 'Talep tam karşılandı.';
    case 'partial':
      // §4.1 "Toplu talepler ... kısmen karşılanabilir."
      return `Kısmi karşılama · ${amountLabel(demand, purchase.units)} / ${amountLabel(demand, demand.quantity)}.`;
    default:
      return demand.acceptsPartial
        ? `Yetersiz · en az ${amountLabel(demand, demand.minQuantity)} gerekiyor.`
        : `Yetersiz · ${amountLabel(demand, demand.quantity)} tamamı gerekiyor.`;
  }
}
