import { t } from '@i18n/index';
import { IconChevronRight } from '@ui/icons';
import './BusinessIdentity.css';

export interface BusinessIdentityProps {
  /** The four shipped store stages; this does not grant or unlock a stage. */
  readonly tier?: 1 | 2 | 3 | 4;
  readonly tierName: string;
  /** The caller supplies only an available, in-scope next stage. */
  readonly nextTierName?: string | null;
  readonly goalLabel?: string | null;
  readonly guidanceLabel?: string | null;
  /** Keep the trading surface free of growth actions during a customer visit. */
  readonly collapsed?: boolean;
  readonly onOpenGrowth?: () => void;
  readonly onOpenSkills?: () => void;
}

/** Presentation only: one store identity and the caller's current nearby goal. */
export function BusinessIdentity({
  tier = 1,
  tierName,
  nextTierName,
  goalLabel,
  guidanceLabel,
  collapsed = false,
  onOpenGrowth,
  onOpenSkills,
}: BusinessIdentityProps) {
  return (
    <section
      className={`businessIdentity${collapsed ? ' businessIdentity--collapsed' : ''}`}
      aria-label={t('Mağaza')}
    >
      <div className="businessIdentity__identity">
        <StoreFacade tier={tier} />
        <span className="businessIdentity__tier">{t(tierName)}</span>
      </div>

      {!collapsed && (
        <>
          {nextTierName && (
            <p className="businessIdentity__next">
              <span>{t('Sıradaki')}</span>
              <strong>{t(nextTierName)}</strong>
            </p>
          )}
          {goalLabel && <p className="businessIdentity__goal">{t(goalLabel)}</p>}
          {guidanceLabel && <p className="businessIdentity__guidance">{t(guidanceLabel)}</p>}
          {(onOpenGrowth || onOpenSkills) && (
            <div className="businessIdentity__actions">
              {onOpenGrowth && (
                <button type="button" className="businessIdentity__action" onClick={onOpenGrowth}>
                  <span>{t('Mağaza')}</span>
                  <IconChevronRight size={14} />
                </button>
              )}
              {onOpenSkills && (
                <button
                  type="button"
                  className="businessIdentity__action businessIdentity__action--secondary"
                  onClick={onOpenSkills}
                >
                  <span>{t('Yetenekler')}</span>
                  <IconChevronRight size={14} />
                </button>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

/** Small static frontage: extra windows distinguish the existing four stages. */
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
