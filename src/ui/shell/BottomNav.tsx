/**
 * H — Alt Navigasyon (UPDATEv1, 64 px)
 *
 * UPDATEv1: Beş kök içerir: Dükkan / Stok / Atölye / Market / İşletme.
 *   "Piyasa, Toptancı, Kariyer ve İşlem Defteri ikincil rotalardır."
 *
 * GDD 23.9.2: "Aktif işlemde de yerini korur."
 *
 * NOT: Asset paketindeki stok ekranı referansı Dükkan/Stok/Yetenekler/Profil
 * gösterir. GDD tek doğruluk kaynağı olduğu için 23.9.1'deki dört kök
 * uygulanmıştır; Yetenekler ve Profil İşletme'nin ikincil rotalarıdır.
 */

import { IconBusiness, IconMarket, IconShop, IconStock, IconWorkshop } from '@ui/icons';
import { Art } from '@ui/Art';
import { NAV_ART, type Art as ArtAsset } from '@ui/assets';
import type { RootTab } from '@state/gameStore';

const ROOTS: { id: RootTab; label: string; Icon: typeof IconShop; art: ArtAsset }[] = [
  { id: 'shop', label: 'Dükkan', Icon: IconShop, art: NAV_ART.shop },
  { id: 'stock', label: 'Stok', Icon: IconStock, art: NAV_ART.stock },
  { id: 'workshop', label: 'Atölye', Icon: IconWorkshop, art: NAV_ART.workshop },
  { id: 'market', label: 'Market', Icon: IconMarket, art: NAV_ART.market },
  { id: 'business', label: 'İşletme', Icon: IconBusiness, art: NAV_ART.business },
];

interface Props {
  active: RootTab;
  onSelect: (tab: RootTab) => void;
  shopBadge?: number;
  workshopBadge?: number;
}

export function BottomNav({ active, onSelect, shopBadge = 0, workshopBadge = 0 }: Props) {
  return (
    <nav className="bottomNav" aria-label="Ana navigasyon">
      {ROOTS.map(({ id, label, Icon, art }) => {
        const badge = id === 'shop' ? shopBadge : id === 'workshop' ? workshopBadge : 0;
        const badgeLabel = id === 'shop'
          ? `${badge} bekleyen müşteri`
          : `${badge} teslim bekleyen iş`;
        return (
        <button
          key={id}
          type="button"
          className={`bottomNav__item ${active === id ? 'bottomNav__item--active' : ''}`}
          onClick={() => onSelect(id)}
          aria-current={active === id ? 'page' : undefined}
        >
          <Art
            art={art}
            size={29}
            decorative
            className="bottomNav__art art--onDark"
            fallback={<Icon size={21} />}
          />
          {badge > 0 && (
            <span className="bottomNav__badge" aria-label={badgeLabel}>
              {Math.min(9, badge)}
            </span>
          )}
          <span className="bottomNav__label">{label}</span>
        </button>
        );
      })}
    </nav>
  );
}
