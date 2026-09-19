/**
 * STOK ekranı (GDD 23.15)
 *
 * Kurallar:
 *  - Üst başlık: stok değeri + likiditeye bağlı KISA ÖZET; büyük dashboard
 *    kartı yok.
 *  - Sticky filtre rayı: Tümü / Vitrin / Arka Stok / Serviste / Bekleyen / Ölü Stok.
 *  - Dikey liste: ürün adı, ayar/gram, maliyet, bugünkü değer, yaş, tez etiketi.
 *  - Satır uyarısı tek satır durum olarak görünür.
 *  - Stok ekranı scroll kullanabilir; üst başlık ve filtre rayı sticky kalır.
 */

import { t } from '@i18n/index';
import { TERM } from '@ui/terms';
import { useMemo, useState } from 'react';
import { isCrafted } from '@domain/customer-pricing';
import { fromMg, toMg, roundMoney, isHasTradingDay } from '@domain/v5-rules';
import { hasQuote, maxHasBuyMg } from '@domain/has-account';
import { poolForTemplate } from '@domain/stock-pools';
import { isBullion } from '@data/bullion';
import { isShowcaseStale } from '@domain/showcase-weight';
import { showcaseTargetChancePerItem } from '@domain/purchase';

import { KARAT_LABEL } from '@domain/balance';
import { channelShort } from '@domain/thesis';
import { liquidationEstimate, liquidityBand, liquidityRatio, summarizeWealth } from '@domain/settlement';
import { getTemplate } from '@data/item-templates';
import { GRAM_SUPPLY_STEP, POOL_SUPPLY, poolSupplyQuote, maxPoolSupplyQuantity, hasPoolSupplySpace } from '@domain/pool-supply';
import { useGame } from '@state/gameStore';

import { IconStock, IconWarning, ProductSilhouette } from '@ui/icons';
import { Art } from '@ui/Art';
import { NAV_ART, productArt } from '@ui/assets';
import { grams, moneyUnit, preciseGrams, pct, tl, tlBare, tlSigned } from '@ui/format';
import type { InventoryPosition } from '@domain/types';
import { WholesalerLiquidationList } from './WholesalerLiquidation';

type Filter = 'all' | 'display' | 'backStock' | 'workshop' | 'dead';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Tümü' },
  { id: 'display', label: 'Vitrin' },
  { id: 'backStock', label: 'Arka Stok' },
  { id: 'workshop', label: 'Serviste' },
  { id: 'dead', label: 'Ölü Stok' },
];

/** GDD 15.3 — bu yaşın üstündeki kalem "ölü stok" uyarısı taşır. PLAYTEST. */
const DEAD_STOCK_AGE = 6;

export function StockScreen() {
  const s = useGame();
  const [filter, setFilter] = useState<Filter>('all');

  const wealth = summarizeWealth({
    store: s.store,
    inventory: s.inventory,
    items: s.items,
    ledger: s.ledger,
  });
  const ratio = liquidityRatio(s.store.cash, s.inventory);
  const band = liquidityBand(ratio);

  const counts = {
    all: s.inventory.length,
    display: s.inventory.filter((p) => p.location === 'display').length,
    backStock: s.inventory.filter((p) => p.location === 'backStock').length,
    workshop: s.inventory.filter((p) => p.location === 'workshop').length,
    dead: s.inventory.filter((p) => p.age >= DEAD_STOCK_AGE).length,
  };

  const visible = s.inventory.filter((p) => {
    if (filter === 'all') return true;
    if (filter === 'dead') return p.age >= DEAD_STOCK_AGE;
    return p.location === filter;
  });

  return (
    <div className="page">
      <header className="pageHead">
        <h1 className="pageHead__title" id="stock-page-title">{t('Stok')}</h1>
        <p className="pageHead__sub">
          {s.inventory.length === 0 ? t('Stok boş') : t('{n} ürün', { n: s.inventory.length })} ·{' '}
          {t('Vitrin')} {counts.display}/{s.store.displaySlots} · {t('Arka stok')}{' '}
          {counts.backStock}/{s.store.backStockSlots}
        </p>
        {/*
          B5 — VİTRİNE BİR ÜRÜN DAHA KOYMANIN GÖRÜNMEYEN BEDELİ.

          Vitrin müşterisi hedefini tek tek seçiyor (`showcaseRng.pick`), yani
          vitrindeki her yeni ürün diğerlerinin şansını böler. Mekanik çalışıyordu
          ama oyuncu hiçbir yerden göremediği için vitrini doldurmayı bedelsiz
          sanıyordu. Oran spawn sabitinden türüyor — kural değişirse yazı da değişir.

          Vitrin boşken satır hiç çıkmaz: söyleyecek bir şey yok.
        */}
        {counts.display > 0 && (
          <p className="pageHead__note">
            {counts.display === 1
              ? t('Vitrindeki tek ürün her alıcıda {oran} ilgi görür', {
                oran: pct(showcaseTargetChancePerItem(1), 1),
              })
              : t(
                'Vitrindeki {n} ürün aynı ilgiyi paylaşır · ürün başına ortalama {oran} · bekleyen mal daha az',
                {
                  n: counts.display,
                  oran: pct(showcaseTargetChancePerItem(counts.display), 1),
                },
              )}
          </p>
        )}

        <div className="summaryRow">
          <div className="summaryRow__item">
            <span className="summaryRow__label">{t('Maliyet')}</span>
            <span className="summaryRow__value num">{tl(wealth.stockCost)}</span>
          </div>
          {/*
            Bu da satır bazındaki "Hızlı Çıkışta Marj"ın toplamıdır; "Net
            Çıkış" adı hangi kanala göre olduğunu söylemiyordu.
          */}
          <div className="summaryRow__item">
            <span className="summaryRow__label">{t('Hızlı Çıkışta')}</span>
            <span
              className={`summaryRow__value num ${
                wealth.stockPotential >= 0
                  ? 'summaryRow__value--positive'
                  : 'summaryRow__value--negative'
              }`}
            >
              {tlSigned(wealth.stockPotential)}
            </span>
          </div>
          <div className="summaryRow__item">
            <span className="summaryRow__label">{t(TERM.liquidity)}</span>
            <span
              className={`summaryRow__value num ${
                band === 'red'
                  ? 'summaryRow__value--negative'
                  : band === 'caution'
                    ? 'summaryRow__value--warning'
                    : ''
              }`}
            >
              {pct(ratio)}
            </span>
          </div>
        </div>

        <div className="liquidityBar">
          <div
            className={`liquidityBar__fill liquidityBar__fill--${band}`}
            style={{ width: `${Math.min(100, ratio * 100)}%` }}
          />
        </div>
      </header>

      <div
        className="page__scroll"
        role="region"
        aria-labelledby="stock-page-title"
        tabIndex={0}
      >
        {/* Playtest revizyonu §4 — sarrafiye stoklama tezgâhı. */}
        <BullionCounter />
        <HasCounter />
        <WholesalerSellCounter />

        <div className="horizontalRailWrap filterRailWrap">
          <div className="filterRail" role="group" aria-label={t('Stok')}>
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={filter === f.id}
                className={`chip ${filter === f.id ? 'chip--active' : ''}`}
                onClick={() => setFilter(f.id)}
              >
                {t(f.label)}
                <span className="chip__count num">{counts[f.id]}</span>
              </button>
            ))}
          </div>
          <span className="horizontalRailCue" aria-hidden="true">›</span>
        </div>

        {visible.length === 0 ? (
          <div className="empty">
            <div className="empty__icon">
              <Art
                art={NAV_ART.stock}
                size={96}
                decorative
                className="art--hero"
                fallback={<IconStock size={34} />}
              />
            </div>
            <p className="empty__title">
              {s.inventory.length === 0 ? t('Stok boş') : t('Bu filtrede ürün yok')}
            </p>
            <p className="empty__text">
              {s.inventory.length === 0
                ? t('Müşteriden aldığınız her ürün buraya düşer ve çıkış planı burada yönetilir.')
                : t('Başka bir filtre deneyin.')}
            </p>
          </div>
        ) : (
          <div className="rowList">
            {visible.map((position) => (
              <StockRow key={position.itemId} position={position} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * PLAYTEST — SARRAFİYE ALIM TEZGÂHI
 * Kaynak: Hızlı Sarrafiye Fiyat Görünürlüğü revizyonu · §4.
 *
 * "Bu sistem müşteri alım-satım döngüsünün YERİNE GEÇMEZ. Sadece sarrafiye
 * stoklama, piyasa pozisyonu ve nakit-altın dengesini hızlı test etmek için
 * eklenir."
 *
 * Fiyat hardcode DEĞİL: mevcut toptancı kanalından (`supplyOffer`) türer,
 * yani piyasa, ürün tipi ve makas kuralları aynen işler.
 */
function BullionCounter() {
  const s = useGame();
  return <div className="counter">
    <button
      type="button"
      className="counter__toggle"
      onClick={() => s.setStockCatalogOpen(!s.stockCatalogOpen)}
      aria-expanded={s.stockCatalogOpen}
      aria-controls="bullion-catalog"
    >
      <span>{t('Sarrafiye Al')}</span>
      <span className="counter__meta">
        <span className="counter__hint num">{tl(s.store.cash)}</span>
        <span
          className={`counter__chevron ${s.stockCatalogOpen ? 'counter__chevron--open' : ''}`}
          aria-hidden="true"
        >
          ▼
        </span>
      </span>
    </button>
    {s.stockCatalogOpen && <BullionCatalog id="bullion-catalog" />}
  </div>;
}

/** Ana Dükkan hızlı alım sheet'i ile Stok ekranı aynı gerçek kataloğu paylaşır. */
export function BullionCatalog({ id }: { id?: string }) {
  return <div className="counter__list" id={id}>
    {POOL_SUPPLY.map(product => <BullionOffer key={product.templateId} product={product} />)}
  </div>;
}

function BullionOffer({ product }: { product: typeof POOL_SUPPLY[number] }) {
  const s = useGame();
  const { templateId, name, gramsPerUnit } = product;
  const initialAmount = counterMemory.qty[templateId] ?? '1';
  const [amount, setAmount] = useState(templateId === 'gram_gold_1' ? formatGramAmount(initialAmount) : initialAmount);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const qty = Number(amount.replace(',', '.'));
  const setQty = (next: string) => {
    counterMemory.qty[templateId] = next;
    setAmount(next);
    setConfirmation(null);
  };
  const lot = poolSupplyQuote(templateId, qty, s.market, s.store);
  const max = useMemo(() => maxPoolSupplyQuantity(templateId, s.market, s.store), [templateId, s.market, s.store]);
  const unitQuote = lot ?? poolSupplyQuote(templateId, 1, s.market, s.store)!;

  /*
    C2 — TEK KONTROL TİPİ.

    Eskiden Gram Altın satırı serbest yazı kutusu, diğerleri `− değer +`
    sayacıydı; ÜSTELİK her satırın altında ayrıca bir kaydırıcı vardı. Üç ayrı
    idiom, aynı işi yapmak için. Kaydırıcı ölçüldü: satırı 184 px'e çıkarıyor,
    6 satırlık liste 1106 px oluyor, 505 px'lik pencerede ilk satırdan sonra
    hepsi katlanın altında kalıyordu — yani kaydırıcıların çoğuna ulaşılamıyordu
    bile.

    Yerine: her satırda aynı `− [yazılabilir değer] +`. Kaydırıcının tek gerçek
    faydası (büyük miktara hızlı ulaşmak) değeri yazabilmekle zaten karşılanıyor;
    üstelik 100 g'ı yazmak kaydırıcıyla nişan almaktan doğrudur. Ulaşılabilir üst
    sınır kaybolmasın diye "en çok" bilgisi meta satırına taşındı.

    Birim SAYININ YANINDA yazıyor: bilezik satırında sayı ADET'tir (her biri
    10 g), gram altında GRAM'dır. Eski kontrol bileziğin yanında "20 g" yazıp
    değeri 2 tutuyordu; yazılabilir kutuda bu yanıltıcı olurdu.
  */
  const minQty = templateId === 'gram_gold_1' ? GRAM_SUPPLY_STEP : 1;
  const stepQty = 1;
  const unitSuffix =
    templateId === 'gram_gold_1' ? 'g' : gramsPerUnit ? `× ${gramsPerUnit} g` : t('adet');
  const maxLabel =
    templateId === 'gram_gold_1'
      ? preciseGrams(max)
      : gramsPerUnit
        ? t('{n} bilezik', { n: max })
        : t('{n} adet', { n: max });
  const shift = (delta: number) => {
    const base = Number.isFinite(qty) ? qty : minQty;
    const next = Math.min(max, Math.max(minQty, base + delta));
    setQty(templateId === 'gram_gold_1' ? next.toFixed(1) : String(Math.round(next)));
  };
  const poolId = poolForTemplate(templateId);
  const held = s.inventory.filter(p => p.poolId === poolId)
    .reduce((sum, p) => sum + (p.quantityMg === undefined ? p.quantity : fromMg(p.quantityMg)), 0);
  const space = hasPoolSupplySpace(templateId, s.inventory, s.store);
  const affordable = !!lot && lot.totalPrice <= s.store.cash && space;
  const signature = lot ? `${qty}:${lot.totalPrice}` : '';
  const expensive = !!lot && lot.totalPrice >= Math.max(100_000, Math.round(s.store.cash * .2));
  const confirmed = confirmation === signature;
  const buy = () => {
    if (!affordable || !lot) return;
    if (expensive && !confirmed) { setConfirmation(signature); return; }
    s.buyPoolStock(templateId, qty);
    setQty(templateId === 'gram_gold_1' ? '1.0' : '1');
  };
  const ad = t(name);
  return <section className="offerRow" aria-label={ad}>
    <div className="offerRow__head">
      <span className="offerRow__name">{ad}</span>
      <span className="offerRow__unit num">
        {tlBare(unitQuote.unitPrice / (gramsPerUnit || 1))} {moneyUnit(gramsPerUnit ? 'g' : t('adet'))}
      </span>
    </div>
    <div className="offerRow__meta">
      {t('Stokta {miktar}', { miktar: gramsPerUnit ? preciseGrams(held) : t('{n} adet', { n: held }) })}
      {max > 0 && <> {t('· en çok {sinir}', { sinir: maxLabel })}</>}
    </div>
    <div className="offerRow__controls">
      <div className="qtyStep" role="group" aria-label={t('{ad} miktarı', { ad })}>
        <button type="button" className="qtyStep__btn" aria-label={t('{ad} miktarını azalt', { ad })}
          disabled={!Number.isFinite(qty) || qty <= minQty} onClick={() => shift(-stepQty)}>−</button>
        <input
          className="qtyStep__value num"
          aria-label={t('{ad} miktarı', { ad })}
          type="number"
          inputMode="decimal"
          min={minQty}
          max={max || undefined}
          step={templateId === 'gram_gold_1' ? GRAM_SUPPLY_STEP : 1}
          value={amount}
          onChange={e => setQty(e.target.value)}
          onBlur={() => templateId === 'gram_gold_1' && setQty(formatGramAmount(amount))}
        />
        <span className="qtyStep__unit">{unitSuffix}</span>
        <button type="button" className="qtyStep__btn" aria-label={t('{ad} miktarını artır', { ad })}
          disabled={!space || !Number.isFinite(qty) || qty + stepQty > max} onClick={() => shift(stepQty)}>+</button>
      </div>
      <span className="offerRow__total num">{lot ? tl(lot.totalPrice) : '—'}</span>
      <button type="button" className="offerRow__buy" disabled={!affordable} onClick={buy}>{expensive && confirmed ? t('Onayla') : t('Al')}</button>
    </div>
    {expensive && confirmed && <p className="offerRow__confirm" role="status">{t('Yüksek tutar: {tutar}. Satın almak için tekrar onayla.', { tutar: tl(lot.totalPrice) })}</p>}
    {!lot && <p className="offerRow__shortfall">{t('Pozitif, geçerli bir miktar seçin. Gram altın hassasiyeti 0,1 g.')}</p>}
    {lot && !affordable && <p className="offerRow__shortfall">{!space
      ? t('Arka stokta yeni ürün ailesi için yer yok.')
      : t('Minimum {enAz} · Yetersiz Nakit · {gerekli} gerekli, {mevcut} mevcut', {
              enAz: templateId === 'gram_gold_1' ? t('0,1 g') : t('{n} adet', { n: 1 }),
              gerekli: tl(lot.totalPrice),
              mevcut: tl(s.store.cash),
            })}</p>}
  </section>;
}

function formatGramAmount(value: string): string {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? Math.max(GRAM_SUPPLY_STEP, parsed).toFixed(1) : '1.0';
}

/** Uncommitted UI choice survives tab changes; inventory is always held in game state. */
const counterMemory: { qty: Record<string, string> } = { qty: {} };

function StockRow({ position }: { position: InventoryPosition }) {
  const s = useGame();
  const item = useGame((s) => s.items[position.itemId]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  if (!item) return null;

  const template = getTemplate(item.templateId);
  const liquidation = liquidationEstimate(position);
  const delta = liquidation.value - position.costBasis;
  const isDead = position.age >= DEAD_STOCK_AGE;

  return (
    <div className="row">
      {/*
        Ürün görseli 64 px — 44 px'lik eski silüet yuvası gerçekçi bandın
        altındaydı. Satırın kendi yüksekliği (başlık + meta + üç rakam)
        zaten 64 px'i geçiyor, yani yuvayı büyütmek satırı büyütmüyor:
        stok listesi aynı sayıda kalemi aynı ekranda göstermeye devam eder.
      */}
      <span className="row__thumb">
        <Art
          art={productArt(item.templateId, template.silhouette)}
          size={64}
          alt={t(item.displayName)}
          className="art--onDark"
          fallback={<ProductSilhouette kind={template.silhouette} size={30} />}
        />
      </span>

      <div className="row__body">
        <div className="row__title">
          {t(item.displayName)}
          {/* §4.1 — yığılmış sarrafiyede adet gizlenmez; maliyet ve değer
              toplamdır, tek parçanınki değil. */}
          <span className="row__qty num"> · {position.quantityMg === undefined
            ? t('{n} adet', { n: position.quantity })
            : preciseGrams(fromMg(position.quantityMg))}</span>
        </div>
        <div className="row__meta">
          {t(KARAT_LABEL[item.declared.claimedKarat])} · {position.poolId ? t('Ortak havuz') : grams(item.truth.grossWeight)} ·{' '}
          {t('{n} gün', { n: position.age })}{' '}
          {/* GDD 8.3 — "her kalemin neden tutulduğunu görünür kılan plan etiketi" */}
          <span className={`tag ${position.thesis ? '' : 'tag--neutral'}`}>
            {position.thesis
              ? `${t(TERM.thesisShort)}: ${channelShort(position.thesis, isBullion(item.templateId))}`
              : t('{plan} yok', { plan: t(TERM.thesis) })}
          </span>
          {/*
            B4 — VİTRİNDE BEKLEYEN MALIN İLGİSİ DÜŞTÜ.

            Mekanik olmayan bir rozet değil: `showcase-weight` gerçekten
            ağırlığı tabana indirdi ve müşteri artık bu malı belirgin biçimde
            daha az hedefliyor. Söylenmezse B5'te düzelttiğimiz hatanın
            aynısı olurdu — işleyen ama görünmeyen mekanik.

            Yalnız VİTRİNDEKİ mal için: arka stoktaki mal zaten vitrin
            müşterisinin hedefi değil, orada "ilgisi düştü" demek yanlış olurdu.
          */}
          {position.location === 'display' && isShowcaseStale(position) && (
            <span className="tag tag--warn">{t('Vitrinde bayatladı')}</span>
          )}
        </div>

        {/*
          RAKAMLARIN HANGİ KANALA AİT OLDUĞU ARTIK ETİKETTE YAZIYOR.

          Eskiden "Net Satış Tahmini" ve "Tahmini Marj" yazıyordu. İkisi de
          `liquidationEstimate` üzerinden BUGÜN ERİŞİLEBİLEN EN HIZLI çıkışa
          göre hesaplanır — genelde toptancıya. Toptancı makası yüzünden taze
          alınmış sağlam bir malın marjı da eksi çıkar; etiket bunu
          söylemediği için oyuncu birinci günde açılış stoğunun üçüne birden
          bakıp "stoğum zararda" diye okuyordu (tarayıcıda ölçüldü: −3.640,
          −4.062, −4.244 ₺). Rakam doğruydu, eksik olan cümleydi.

          KANAL ADI ETİKETTE DEĞİL, ALTTAKİ CÜMLEDE. Üç etiket 256 px'lik
          satıra sığmıyor: ölçüldü, üçü de kırpılıyordu ve kap 11 px taşıyordu
          ("Gerçek Alış Maliyeti" 84 px yuvada 97 px istiyordu — bu kırpılma
          değişiklikten önce de vardı). Kanal adı zaten değişken uzunlukta
          ("Toptancı" ile "Servis + satış" arasında), yani etikete sığdırmak
          baştan kırılgandı. Kısa etiketler yuvaya giriyor, kanal adı da altta
          yeri olan cümlede tam hâliyle duruyor.
        */}
        <div className="row__figures">
          <span className="figure">
            <span className="figure__label">{t('Maliyet')}</span>
            <span className="figure__value num">{tl(position.costBasis)}</span>
          </span>
          <span className="figure">
            <span className="figure__label">{t('Bugün')}</span>
            <span className="figure__value num">{tl(liquidation.value)}</span>
          </span>
          <span className="figure">
            <span className="figure__label">{t('Marj')}</span>
            <span
              className={`figure__value num ${
                delta >= 0 ? 'figure__value--positive' : 'figure__value--negative'
              }`}
            >
              {tlSigned(delta)}
            </span>
          </span>
        </div>

        <div className="row__exitEstimate">
          {t('Bugünkü en hızlı çıkış:')} <strong>{t(liquidation.channel)}</strong>{' '}
          {t('· tahmini süre {sure}.', { sure: liquidation.time })}{' '}
          {t('Beklemek daha iyi bir kanal açabilir.')}
        </div>

        {/* Satır uyarısı — tek satır durum (GDD 23.15) */}
        {isDead && (
          <div className="rowAlert">
            <IconWarning size={12} />
            {t('Ölü stok riski · {n} gündür bekliyor', { n: position.age })}
          </div>
        )}
        <button
          type="button"
          className="rowDetailToggle"
          onClick={() => setDetailsOpen((open) => !open)}
          aria-expanded={detailsOpen}
        >
          {detailsOpen ? t('Detayı kapat') : t('Konum ve çıkış planı')}
        </button>
        {detailsOpen && (
          <div className="rowDetailPanel">
            {isCrafted(item) && position.location !== 'workshop' && <>
              <button type="button" className="chip" disabled={position.location === 'display'} onClick={() => s.displayStock(item.id)}>{t('Vitrine Koy')}</button>
              <button type="button" className="chip" onClick={() => { if (window.confirm(
                t(
                  'Ürün fiziksel stoktan çıkarılıp HAS bakiyesine dönüşecek. Mevcut {bedel} eritme bedeli alınır. Onaylıyor musunuz?',
                  { bedel: tl(180) },
                ),
              )) s.meltStock(item.id); }}>{t('Erit → HAS')}</button>
            </>}
            <p><strong>{t('Konum')}:</strong> {position.location === 'display' ? t('Vitrin') : position.location === 'backStock' ? t('Arka stok') : position.location === 'workshop' ? t('Serviste') : t('Müşteride')}</p>
            <p><strong>{t('Çıkış planı:')}</strong> {position.thesis ? channelShort(position.thesis, isBullion(item.templateId)) : t('Henüz seçilmedi.')}</p>
            {!position.thesis && <p>{t('Çıkış planı, ürünün müşteri işleminde değerlendirilip bir satış kanalı seçildiğinde atanır.')}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * HAS HESABI — KATLANIR KOMPAKT TEZGÂH.
 *
 * `hasCompact` düzeni her satırı küçülttü ama panel hâlâ TAM BOY açık
 * çiziliyordu: telefonda ölçüldü, Stok sekmesinin ilk ekranını tek başına
 * dolduruyor ve stok listesini katın altına itiyordu. Oyuncu "Stok"a basınca
 * stoğunu değil bir altın alım-satım tezgâhını görüyordu.
 *
 * Artık ekrandaki diğer iki tezgâhla (`Sarrafiye Al`, `Toptancıya Sat`) AYNI
 * desende: başlık bir düğme, gövde katlanır, kapalı açılır. Üçü bir set gibi
 * okunuyor ve ilk ekran stoğun kendisine kalıyor.
 *
 * Başlık kapalıyken de bilgilendirici — bakiye, değeri ve günün alış/satış
 * kotasyonu orada duruyor; açmak yalnız işlem yapmak isteyene gerekiyor.
 */
function HasCounter() {
  const s = useGame();
  // Panelin katlanma durumu; aşağıdaki `open` "bugün HAS işlemi açık mı"dır.
  const [expanded, setExpanded] = useState(false);
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [amountMg, setAmountMg] = useState(0);
  const [pending, setPending] = useState<string | null>(null);
  const quote = hasQuote(s.market, s.store);
  const open = isHasTradingDay(s.market.day);
  const maxMg = side === 'buy' ? maxHasBuyMg(s.store.cash, quote.buy) : s.store.hasBalanceMg ?? 0;
  const selectedMg = Math.min(amountMg, maxMg);
  const qty = fromMg(selectedMg);
  const total = roundMoney(qty * (side === 'buy' ? quote.buy : quote.sell));
  const valid = selectedMg > 0 && selectedMg <= maxMg && total > 0;
  const signature = `${s.market.day}:${side}:${selectedMg}:${total}:${s.ledger.transactions.length}`;
  const changeSide = (next: 'buy' | 'sell') => { setSide(next); setAmountMg(0); setPending(null); };
  return <section className="counter hasCompact" aria-label={t('HAS hesabı')}>
    <button
      type="button"
      className="counter__toggle"
      onClick={() => setExpanded((current) => !current)}
      aria-expanded={expanded}
      aria-controls="has-counter"
    >
      <span>HAS · {preciseGrams(fromMg(s.store.hasBalanceMg ?? 0))}</span>
      <span className="counter__meta">
        <span className="counter__hint num">
          {t('Al {alis}/g · Sat {satis}/g', { alis: tl(quote.buy), satis: tl(quote.sell) })}
        </span>
        <span className={`counter__chevron ${expanded ? 'counter__chevron--open' : ''}`} aria-hidden="true">▼</span>
      </span>
    </button>
    {expanded && <div className="hasCompact__body" id="has-counter">
      <p className="hasCompact__value">
        {t('Değer {tutar}', { tutar: tl(fromMg(s.store.hasBalanceMg ?? 0) * s.market.goldSpot) })}
      </p>
      <div className="hasCompact__segments" role="group" aria-label={t('HAS işlem yönü')}>
        <button type="button" className="hasCompact__segment" aria-pressed={side === 'buy'} onClick={() => changeSide('buy')}>{t('HAS Al')}</button>
        <button type="button" className="hasCompact__segment" aria-pressed={side === 'sell'} onClick={() => changeSide('sell')}>{t('HAS Sat')}</button>
      </div>
      <label className="hasSlider">
        <span className="hasCompact__sliderHead">
          <span>{side === 'buy' ? t('Seçilen') : t('Satılacak')}: <strong>{preciseGrams(qty)}</strong></span>
          <span>{t('En çok {miktar}', { miktar: preciseGrams(fromMg(maxMg)) })}</span>
        </span>
        <input type="range" aria-label={t('HAS miktarı')} min={0} max={fromMg(maxMg)} step={0.001} value={qty}
          disabled={maxMg <= 0} onChange={e => { setAmountMg(Math.min(maxMg, Math.max(0, toMg(Number(e.target.value))))); setPending(null); }} />
      </label>
      <div className="hasCompact__actions">
        <span className="hasCompact__total">{side === 'buy' ? t('Tutar') : t('Alınacak')}<strong className="num">{tl(total)}</strong></span>
        <button type="button" className="hasCompact__max" disabled={maxMg <= 0}
          onClick={() => { setAmountMg(maxMg); setPending(null); }}>MAX</button>
        <button type="button" className="hasCompact__continue" disabled={!open || !valid} onClick={() => setPending(signature)}>{t('Devam Et')}</button>
      </div>
      {pending === signature && open && valid && <div className="hasCompact__confirm" role="group" aria-label={t('HAS işlem onayı')}>
        <span>{preciseGrams(qty)} · {tl(total)} {side === 'buy' ? t('alınacak') : t('satılacak')}</span>
        <button type="button" className="hasCompact__confirmButton" onClick={() => {
          s.tradeHas(side, qty, `has_${s.market.day}_${s.ledger.transactions.length}_${side}`);
          setPending(null); setAmountMg(0);
        }}>{t('Onayla')}</button>
        <button type="button" className="hasCompact__cancel" onClick={() => setPending(null)}>{t('Vazgeç')}</button>
      </div>}
    </div>}
  </section>;
}

function WholesalerSellCounter() {
  const [open, setOpen] = useState(false);
  return <div className="counter counter--sell">
    <button
      type="button"
      className="counter__toggle"
      onClick={() => setOpen((current) => !current)}
      aria-expanded={open}
      aria-controls="wholesaler-stock-sale"
    >
      <span>{t('Toptancıya Sat')}</span>
      <span className="counter__meta">
        <span className="counter__hint">{t('Sarrafiyeyi nakde çevir')}</span>
        <span className={`counter__chevron ${open ? 'counter__chevron--open' : ''}`} aria-hidden="true">▼</span>
      </span>
    </button>
    {open && <div className="counter__list" id="wholesaler-stock-sale">
      <WholesalerLiquidationList emptyText={t("Toptancıya satılabilecek sarrafiye yok.")} />
    </div>}
  </div>;
}
