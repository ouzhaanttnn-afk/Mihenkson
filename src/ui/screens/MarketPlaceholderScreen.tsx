import { getLanguage, t } from '@i18n/index';
import { useState } from 'react';
import {
  MARKET_CATALOG,
  MARKET_CATEGORIES,
  isUnlocked,
  lifestyleDailyExpense,
  marketPurchaseCashRequirement,
  productById,
  type MarketCategory,
  type MarketProduct,
} from '@domain/marketplace';
import { useGame } from '@state/gameStore';
import { IconCash, IconCollection, IconLock, IconMarket } from '@ui/icons';
import { tl } from '@ui/format';
import { useModalSurface } from '@ui/useModalSurface';

const PRODUCT_MARK: Record<MarketCategory, string> = {
  profile: '◆', frames: '◈', shop: '▣', decoration: '◇', collection: '♛', lifestyle: '✦',
};

/**
 * ÜRÜNE ÖZEL İŞARET.
 *
 * Katalog 19'dan 47 ürüne çıkınca kategori işareti yetmez oldu: 13 şahsi
 * ürünün hepsi aynı `✦` ile çiziliyordu, kartlar birbirinden ayrışmıyordu.
 * Gerçek görseller gelene kadar her ürüne kendi simgesi veriliyor.
 *
 * Tabloda olmayan ürün KATEGORİ işaretine düşer — yeni ürün eklendiğinde
 * kart boş çizilmez, yalnız daha az ayırt edici olur.
 *
 * Simgelerin hepsi tarayıcıda ölçüldü: canvas'a çizilip mürekkep bırakıp
 * bırakmadıklarına bakıldı (141–1310 piksel; çizilemeyen karakter 0 bırakır).
 */
const ITEM_MARK: Record<string, string> = {
  badge_apprentice: '✧', badge_founder: '✜', badge_master: '❖', badge_touchstone: '⬖',
  badge_guild: '⚜', badge_legend: '★',
  frame_telkari: '❋', frame_brass: '◍', frame_enamel: '❀', frame_nacre: '✿',
  frame_crown: '♔', frame_diamond: '❂',
  theme_bazaar: '⌂', theme_nocturne: '☾', theme_ivory: '▤', theme_deco: '▧',
  theme_marble: '▦', theme_goldenage: '☀',
  decor_tea: '☕', decor_velvet: '▬', decor_scale: '⚖', decor_safe: '▣',
  decor_carpet: '▩', decor_chandelier: '✵', decor_walnut: '▢', decor_vault: '⛨',
  collection_tesbih: '⛓', collection_coins: '◎', collection_scales: '⚗',
  collection_gems: '♦', collection_seals: '⊛', collection_imperial: '♛',
  life_watch: '⏱', life_sedan: '⛃', life_horse: '♞', life_sportscar: '⚡',
  life_apartment: '⌸', life_boat: '⛵', life_villa: '⌘', life_art: '❦',
  life_mansion: '⛩', life_yacht: '⚓', life_helicopter: '✈', life_jet: '➤',
  life_island: '⌬',
};

/** Ürünün işareti; yoksa kategori işaretine düşer. */
function productMark(product: MarketProduct): string {
  return ITEM_MARK[product.id] ?? PRODUCT_MARK[product.category];
}

export function MarketPlaceholderScreen() {
  const s = useGame();
  const [category, setCategory] = useState<MarketCategory>('profile');
  const [pending, setPending] = useState<MarketProduct | null>(null);
  const [collectionOpen, setCollectionOpen] = useState(false);
  /*
    UCUZDAN PAHALIYA — kullanıcı isteği.

    Katalog daha önce TANIM SIRASINDA geliyordu; o sıra ürünler eklendikçe
    oluşmuştu ve okuyana hiçbir şey söylemiyordu. Fiyat sırası ise vitrinin
    kendi mantığı: oyuncu önce alabileceğini görür, listenin sonuna doğru
    hedefleri sıralanır.

    `slice()` şart: `MARKET_CATALOG` modül düzeyinde paylaşılan bir dizidir
    ve `sort` yerinde sıralar — kopyalamadan sıralamak katalogun kendisini
    kalıcı olarak yeniden dizerdi.

    Eşit fiyatta ad sırası devreye girer; aksi halde iki ürün her çizimde
    yer değiştirebilirdi.
  */
  const products = MARKET_CATALOG.filter((product) => product.category === category)
    .slice()
    .sort((a, b) => a.price - b.price || a.name.localeCompare(b.name, 'tr'));
  const upkeep = lifestyleDailyExpense(s.playerMarket);

  const requestPurchase = (product: MarketProduct) => {
    const expensive = product.price >= 500_000 || product.price > s.store.cash * 0.15;
    if (expensive) setPending(product);
    else s.buyMarketProduct(product.id);
  };

  const confirmPurchase = () => {
    if (!pending) return;
    if (s.buyMarketProduct(pending.id)) setPending(null);
  };

  return (
    <div className="page marketPage">
      <header className="pageHead marketHead">
        <span className="marketHead__icon" aria-hidden="true"><IconMarket size={28} /></span>
        <div>
          <h1 className="pageHead__title">{t('Market')}</h1>
          <p className="pageHead__sub">{t('Kozmetik, prestij ve şahsi yaşam hedefleri')}</p>
        </div>
        <div className="marketHead__cash"><span>{t('Nakit')}</span><strong className="num">{tl(s.store.cash)}</strong></div>
      </header>

      <div className="marketSummary" aria-label={t('Market özeti')}>
        <span>
          <IconCollection size={17} />
          <b>{s.playerMarket.owned.length}</b> {t('sahip olunan')}
        </span>
        <span><IconCash size={17} /><b>{tl(upkeep)}</b> {t('günlük şahsi bakım')}</span>
      </div>

      {/*
        C4 — SAHİP OLUNAN 11 ÜRÜNÜN GİDECEK YERİ YOKTU.

        Kataloğun 19 ürününden yalnız 8'inin kuşanma yuvası var (çerçeve, tema,
        rozet); dekorasyon, koleksiyon ve şahsi hedefler satın alınıp yalnız
        bir SAYACI artırıyordu. 25.000.000 ₺'lik villanın oyundaki karşılığı
        "sahip olunan: 1" idi.

        Katlanır tutuldu: koleksiyon büyüdükçe katalogla arasına girmesin,
        ama bir dokunuşla görülebilsin. Boşken hiç basılmaz.
      */}
      {s.playerMarket.owned.length > 0 && (
        <section className="marketOwned">
          <button
            type="button"
            className="marketOwned__toggle"
            aria-expanded={collectionOpen}
            aria-controls="market-owned-list"
            onClick={() => setCollectionOpen((open) => !open)}
          >
            <span>Koleksiyonum · {s.playerMarket.owned.length} ürün</span>
            <span aria-hidden="true">{collectionOpen ? '▲' : '▼'}</span>
          </button>
          {collectionOpen && (
            <ul className="marketOwned__list" id="market-owned-list">
              {s.playerMarket.owned.map((id) => {
                const product = productById(id);
                if (!product) return null;
                const slotta = product.equipSlot
                  ? s.playerMarket.equipped[product.equipSlot] === product.id
                  : false;
                return (
                  <li key={id}>
                    <span className="marketOwned__mark" aria-hidden="true">{productMark(product)}</span>
                    <span className="marketOwned__name">{t(product.name)}</span>
                    {slotta && <span className="marketOwned__badge">{t('Kullanılıyor')}</span>}
                    {product.dailyUpkeep ? (
                      <span className="marketOwned__upkeep num">{tl(product.dailyUpkeep)}/gün</span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      <div className="horizontalRailWrap marketCategoriesWrap">
        <nav className="marketCategories" aria-label={t('Market kategorileri')}>
          {MARKET_CATEGORIES.map((item) => (
            <button key={item.id} type="button" className={`marketCategory ${category === item.id ? 'marketCategory--active' : ''}`}
              onClick={() => setCategory(item.id)} aria-pressed={category === item.id}>
              <span>{PRODUCT_MARK[item.id]}</span>{t(item.label)}
            </button>
          ))}
        </nav>
        <span className="horizontalRailCue" aria-hidden="true">›</span>
      </div>

      <section className="marketCatalog" aria-label={t('Market')}>
        <div className="marketCatalog__intro">
          <div>
            <strong>{t(MARKET_CATEGORIES.find((item) => item.id === category)?.label ?? '')}</strong>
            <p>{t(MARKET_CATEGORIES.find((item) => item.id === category)?.description ?? '')}</p>
          </div>
          {category === 'lifestyle' && <span>{t('Prestij verir · ticaret gücü vermez')}</span>}
        </div>

        <div className="marketGrid">
          {products.map((product) => {
            const owned = s.playerMarket.owned.includes(product.id);
            const equipped = product.equipSlot ? s.playerMarket.equipped[product.equipSlot] === product.id : false;
            const unlocked = isUnlocked(product, s.store.level, s.store.reputation, s.store.hasBalanceMg);
            const affordable = s.store.cash >= marketPurchaseCashRequirement(product, s.playerMarket, s.store);
            const requiresServerClaim = Boolean(product.serverClaim);
            return (
              <article key={product.id} className={`marketProduct marketProduct--${product.tier} ${!unlocked ? 'marketProduct--locked' : ''}`}>
                {/*
                  C4 — İÇ ASSET KİMLİĞİ EKRANA BASILIYORDU.

                  Burada `assetReference`in ikinci yarısı yazdırılıyordu:
                  `lifestyle:watch` → "WATCH", `lifestyle:private-jet` →
                  "PRIVATE JET" (CSS `text-transform: uppercase`). Yani
                  oyunun geri kalanı Türkçeyken kartın üstünde İngilizce kod
                  adları duruyordu — üstelik hemen altında ürünün gerçek adı
                  ZATEN yazılıydı ("İsviçre Saati"). Biri de
                  `badge:first-5kg-has-placeholder` idi: ekranda "PLACEHOLDER"
                  kelimesi görünüyordu.

                  Satır bilgi taşımıyor, yalnız iç kimliği sızdırıyordu.
                */}
                <div className="marketProduct__visual" aria-hidden="true"><span>{productMark(product)}</span></div>
                <div className="marketProduct__body">
                  <div className="marketProduct__topline"><span>{t(tierLabel(product))}</span>{product.dailyUpkeep ? <em>{t('+{tutar}/gün', { tutar: tl(product.dailyUpkeep) })}</em> : null}</div>
                  <h2>{t(product.name)}</h2>
                  <p>{t(product.description)}</p>
                  {(!unlocked || requiresServerClaim) && <div className="marketProduct__requirement"><IconLock size={13} />{requirementLabel(product, s.store.hasBalanceMg ?? 0)}</div>}
                  <div className="marketProduct__actionRow">
                    <strong className="num">{requiresServerClaim
                        ? t('{n} adet', { n: product.serverClaim?.globalQuota ?? 0 })
                        : tl(product.price)}</strong>
                    {owned ? (product.equipSlot ? <button type="button" disabled={equipped} onClick={() => s.equipMarketProduct(product.id)}>{equipped ? t('Kullanılıyor') : t('Kullan')}</button> : <span className="marketProduct__owned">{t('Koleksiyonda')}</span>) : (
                      <button type="button" disabled={!unlocked || !affordable || requiresServerClaim} onClick={() => requestPurchase(product)} title={
                          requiresServerClaim
                            ? t('Global sıra için sunucu doğrulaması gerekir')
                            : !affordable
                              ? t('Yetersiz nakit')
                              : undefined
                        }>
                        {requiresServerClaim ? (unlocked ? t('Doğrulama bekliyor') : t('Hedef kilitli')) : !affordable && unlocked ? t('Nakit yetersiz') : unlocked ? t('Satın Al') : t('Kilitli')}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {pending && (
        <MarketPurchaseDialog
          product={pending}
          cash={s.store.cash}
          onClose={() => setPending(null)}
          onConfirm={confirmPurchase}
        />
      )}
    </div>
  );
}

function MarketPurchaseDialog({
  product,
  cash,
  onClose,
  onConfirm,
}: {
  product: MarketProduct;
  cash: number;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { dialogRef, initialFocusRef } = useModalSurface(onClose);

  return (
    <div
      className="marketConfirmScrim"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        className="marketConfirm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="market-confirm-title"
        aria-describedby="market-confirm-description"
        tabIndex={-1}
      >
        <span className="marketConfirm__eyebrow">{t('Pahalı satın alma')}</span>
        <h2 id="market-confirm-title">{t(product.name)}</h2>
        <p id="market-confirm-description">
          {t('{tutar} ödenecek.', { tutar: tl(product.price) })}{' '}
          {t('İşlemden sonra kasanda {kalan} kalacak.', {
            kalan: tl(Math.max(0, cash - product.price)),
          })}
        </p>
        {(product.dailyUpkeep ?? 0) > 0 && (
          <p className="marketConfirm__upkeep">
            {t('Her gün kapanışında ayrıca {tutar} bakım gideri işleyecek.', {
              tutar: tl(product.dailyUpkeep ?? 0),
            })}
          </p>
        )}
        <div className="marketConfirm__actions">
          <button
            ref={initialFocusRef}
            type="button"
            className="secondary"
            onClick={onClose}
          >
            {t('Vazgeç')}
          </button>
          <button type="button" className="cta" onClick={onConfirm}>{t('Satın Al')}</button>
        </div>
      </section>
    </div>
  );
}

function requirementLabel(product: MarketProduct, hasBalanceMg: number): string {
  const parts: string[] = [];
  if (product.unlockRequirement.level)
    parts.push(`${t('Sv')} ${product.unlockRequirement.level}`);
  if (product.unlockRequirement.reputation)
    parts.push(`${t('İtibar')} ${product.unlockRequirement.reputation}`);
  if (product.unlockRequirement.hasGrams) {
    const targetKg = product.unlockRequirement.hasGrams / 1_000;
    const currentKg = Math.min(targetKg, hasBalanceMg / 1_000_000);
    parts.push(
      t('{simdi} / {hedef} kg HAS', {
        simdi: numberFmt(currentKg, 2),
        hedef: numberFmt(targetKg, 0),
      }),
    );
  }
  if (product.serverClaim)
    parts.push(t('İlk {n} · sunucu doğrulamalı', { n: product.serverClaim.globalQuota }));
  return parts.join(' · ');
}

function tierLabel(product: MarketProduct): string {
  return product.tier === 'legendary'
    ? 'Efsanevi'
    : product.tier === 'elite'
      ? 'Elit'
      : product.tier === 'premium'
        ? 'Premium'
        : 'Standart';
}

/**
 * Sayıyı DİLİN yereliyle yazar. Burada `toLocaleString('tr-TR')` sabitti;
 * İngilizce oynayan biri "1.5 kg" yerine "1,5 kg" görürdü — ve bu, virgülü
 * binlik ayracı sanan biri için yanlış bir sayıdır.
 */
function numberFmt(value: number, digits: number): string {
  return new Intl.NumberFormat(getLanguage() === 'en' ? 'en-US' : 'tr-TR', {
    maximumFractionDigits: digits,
  }).format(value);
}
