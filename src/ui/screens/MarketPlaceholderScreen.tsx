import { useState } from 'react';
import {
  MARKET_CATALOG,
  MARKET_CATEGORIES,
  isUnlocked,
  lifestyleDailyExpense,
  marketPurchaseCashRequirement,
  type MarketCategory,
  type MarketProduct,
} from '@domain/marketplace';
import { useGame } from '@state/gameStore';
import { IconCash, IconCollection, IconLock, IconMarket } from '@ui/icons';
import { tl } from '@ui/format';

const PRODUCT_MARK: Record<MarketCategory, string> = {
  profile: '◆', frames: '◈', shop: '▣', decoration: '◇', collection: '♛', lifestyle: '✦',
};

export function MarketPlaceholderScreen() {
  const s = useGame();
  const [category, setCategory] = useState<MarketCategory>('profile');
  const [pending, setPending] = useState<MarketProduct | null>(null);
  const products = MARKET_CATALOG.filter((product) => product.category === category);
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
          <h1 className="pageHead__title">Market</h1>
          <p className="pageHead__sub">Kozmetik, prestij ve şahsi yaşam hedefleri</p>
        </div>
        <div className="marketHead__cash"><span>Nakit</span><strong className="num">{tl(s.store.cash)}</strong></div>
      </header>

      <div className="marketSummary" aria-label="Market özeti">
        <span><IconCollection size={17} /><b>{s.playerMarket.owned.length}</b> sahip olunan</span>
        <span><IconCash size={17} /><b>{tl(upkeep)}</b> günlük şahsi bakım</span>
      </div>

      <nav className="marketCategories" aria-label="Market kategorileri">
        {MARKET_CATEGORIES.map((item) => (
          <button key={item.id} type="button" className={`marketCategory ${category === item.id ? 'marketCategory--active' : ''}`}
            onClick={() => setCategory(item.id)} aria-pressed={category === item.id}>
            <span>{PRODUCT_MARK[item.id]}</span>{item.label}
          </button>
        ))}
      </nav>

      <main className="marketCatalog">
        <div className="marketCatalog__intro">
          <div><strong>{MARKET_CATEGORIES.find((item) => item.id === category)?.label}</strong><p>{MARKET_CATEGORIES.find((item) => item.id === category)?.description}</p></div>
          {category === 'lifestyle' && <span>Prestij verir · ticaret gücü vermez</span>}
        </div>

        <div className="marketGrid">
          {products.map((product) => {
            const owned = s.playerMarket.owned.includes(product.id);
            const equipped = product.equipSlot ? s.playerMarket.equipped[product.equipSlot] === product.id : false;
            const unlocked = isUnlocked(product, s.store.level, s.store.reputation);
            const affordable = s.store.cash >= marketPurchaseCashRequirement(product, s.playerMarket, s.store);
            return (
              <article key={product.id} className={`marketProduct marketProduct--${product.tier} ${!unlocked ? 'marketProduct--locked' : ''}`}>
                <div className="marketProduct__visual" aria-hidden="true"><span>{PRODUCT_MARK[product.category]}</span><small>{product.assetReference.split(':')[1]?.replaceAll('-', ' ')}</small></div>
                <div className="marketProduct__body">
                  <div className="marketProduct__topline"><span>{tierLabel(product)}</span>{product.dailyUpkeep ? <em>+{tl(product.dailyUpkeep)}/gün</em> : null}</div>
                  <h2>{product.name}</h2><p>{product.description}</p>
                  {!unlocked && <div className="marketProduct__requirement"><IconLock size={13} />{requirementLabel(product)}</div>}
                  <div className="marketProduct__actionRow">
                    <strong className="num">{tl(product.price)}</strong>
                    {owned ? (product.equipSlot ? <button type="button" disabled={equipped} onClick={() => s.equipMarketProduct(product.id)}>{equipped ? 'Kullanılıyor' : 'Kullan'}</button> : <span className="marketProduct__owned">Koleksiyonda</span>) : (
                      <button type="button" disabled={!unlocked || !affordable} onClick={() => requestPurchase(product)} title={!affordable ? 'Yetersiz nakit' : undefined}>
                        {!affordable && unlocked ? 'Nakit yetersiz' : unlocked ? 'Satın Al' : 'Kilitli'}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </main>

      {pending && (
        <div className="marketConfirmScrim" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPending(null); }}>
          <section className="marketConfirm" role="dialog" aria-modal="true" aria-labelledby="market-confirm-title">
            <span className="marketConfirm__eyebrow">Pahalı satın alma</span><h2 id="market-confirm-title">{pending.name}</h2>
            <p>{tl(pending.price)} ödenecek. İşlemden sonra kasanda <strong>{tl(Math.max(0, s.store.cash - pending.price))}</strong> kalacak.</p>
            {(pending.dailyUpkeep ?? 0) > 0 && <p className="marketConfirm__upkeep">Her gün kapanışında ayrıca {tl(pending.dailyUpkeep ?? 0)} bakım gideri işleyecek.</p>}
            <div className="marketConfirm__actions"><button type="button" className="secondary" onClick={() => setPending(null)} autoFocus>Vazgeç</button><button type="button" className="cta" onClick={confirmPurchase}>Satın Al</button></div>
          </section>
        </div>
      )}
    </div>
  );
}

function requirementLabel(product: MarketProduct): string {
  const parts: string[] = [];
  if (product.unlockRequirement.level) parts.push(`Sv ${product.unlockRequirement.level}`);
  if (product.unlockRequirement.reputation) parts.push(`İtibar ${product.unlockRequirement.reputation}`);
  return parts.join(' · ');
}

function tierLabel(product: MarketProduct): string {
  return product.tier === 'legendary' ? 'Efsanevi' : product.tier === 'elite' ? 'Elit' : product.tier === 'premium' ? 'Premium' : 'Standart';
}
