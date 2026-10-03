import { t } from '@i18n/index';
import { IconChevronRight } from '@ui/icons';
import { Art } from '@ui/Art';
import { NAV_ART } from '@ui/assets';
import './BusinessIdentity.css';

export interface BusinessIdentityProps {
  /** The four shipped store stages; this does not grant or unlock a stage. */
  readonly tier?: 1 | 2 | 3 | 4;
  readonly tierName: string;
  /** Keep the trading surface free of growth actions during a customer visit. */
  readonly collapsed?: boolean;
  readonly onOpenGrowth?: () => void;
  readonly onOpenSkills?: () => void;
}

/** One slim store/talents rail; upgrade requirements remain on the Store screen. */
export function BusinessIdentity({
  tier = 1,
  tierName,
  collapsed = false,
  onOpenGrowth,
  onOpenSkills,
}: BusinessIdentityProps) {
  const tile = (
    <>
      <span className="businessIdentity__icon" aria-hidden="true">
        <Art art={NAV_ART.business} size={24} decorative
          className="businessIdentity__art" fallback={<StoreFacade tier={tier} />} />
      </span>
      <span className="businessIdentity__tier">{t(tierName)}</span>
    </>
  );
  return (
    <section
      className={`businessIdentity${collapsed ? ' businessIdentity--collapsed' : ''}`}
      aria-label={t('Mağaza')}
      data-store-tier={tier}
    >
      {!collapsed && onOpenGrowth ? (
        <button type="button" className="businessIdentity__tile"
          onClick={onOpenGrowth} aria-label={`${t('Mağaza')} · ${t(tierName)}`}>
          {tile}
        </button>
      ) : <div className="businessIdentity__tile">{tile}</div>}
      {!collapsed && onOpenSkills ? (
        <button type="button" className="businessIdentity__action"
          onClick={onOpenSkills} aria-haspopup="dialog">
          <span>{t('Yetenekler')}</span>
          <IconChevronRight size={14} />
        </button>
      ) : null}
    </section>
  );
}

/** A missing image never blocks access or leaves a broken-image glyph. */
function StoreFacade({ tier }: { tier: 1 | 2 | 3 | 4 }) {
  const width = 12 + tier * 4;
  const left = (36 - width) / 2;

  return (
    <svg
      className="businessIdentity__facade"
      viewBox="0 0 36 32"
      aria-hidden="true"
      focusable="false"
      data-store-tier={tier}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={`M${left - 1} 12 18 4 ${left + width + 1} 12`} />
      <path d={`M${left} 12v16h${width}V12Z`} />
      <path d={`M${left - 2} 28h${width + 4}`} />
      <path d="M16 28v-8h4v8" />
      <path d={`M${left} 15h${width}`} />
      {tier >= 2 && <path d={`M${left + 3} 19h3v4h-3Z`} />}
      {tier >= 3 && <path d={`M${left + width - 6} 19h3v4h-3Z`} />}
      {tier === 4 && <path d="m18 7 2 2-2 2-2-2Z" />}
    </svg>
  );
}
