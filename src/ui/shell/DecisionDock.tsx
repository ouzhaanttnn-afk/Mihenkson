/**
 * G — Karar Dock'u (GDD 23.12, 128 px)
 *
 * GDD 23.12: "Karar Dock'u ana oyunun başparmak bölgesidir. Ana CTA her
 * aşamada aynı fiziksel bölgede kalır; yalnız etiketi ve çevresindeki karar
 * özeti değişir. Böylece oyuncu 'şimdi ne yapacağım?' sorusunun cevabını
 * ekranda aramaz."
 *
 * GDD 23.9.2: "Tahmini etki + ana CTA + en fazla 2 ikincil eylem."
 * GDD 23.12: "Tahmini sonuçlar kesinlik iddiası taşımaz."
 */

import type { ReactNode } from 'react';
import { IconChevronRight } from '@ui/icons';

export interface DockAction {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  disabledReason?: string;
  danger?: boolean;
  icon?: ReactNode;
}

interface Props {
  /** Üst özet satırı — "bu karar kabul edilirse ne değişecek?" */
  summaryLabel: string;
  summaryValue: ReactNode;
  /** Pazarlıkta teklif tutarı gibi baskın içerik buraya girer. */
  children?: ReactNode;
  primary: DockAction;
  /** En fazla 2 (GDD 23.9.2). */
  secondary?: DockAction[];
  /** Yalnız boş Dükkan dock'u; çok kısa ekranda müşteri listesine öncelik verir. */
  idle?: boolean;
  /** Boş dükkan durumunda yukarıdaki kuyruk bilgisini tekrar etme. */
  hideSummary?: boolean;
}

export function DecisionDock({ summaryLabel, summaryValue, children, primary, secondary = [], idle = false, hideSummary = false }: Props) {
  // GDD 23.9.2 sözleşmesi: en fazla 2 ikincil eylem.
  const actions = secondary.slice(0, 2);
  const hasContent = children !== undefined && children !== null && children !== false;

  return (
    <footer
      className={`dock ${idle ? 'dock--idle' : ''} ${hideSummary ? 'dock--summaryless' : ''} ${hasContent ? 'dock--withContent' : ''} ${actions.length === 2 ? 'dock--twoSecondary' : ''}`}
    >
      {!hideSummary && (
        <div className="dock__summary">
          <span className="dock__summaryLabel">{summaryLabel}</span>
          <span className="dock__summaryValue">{summaryValue}</span>
        </div>
      )}

      {hasContent && <div className="dock__content">{children}</div>}

      <div className="dock__actions">
        <button
          type="button"
          className="cta"
          onClick={primary.onPress}
          disabled={primary.disabled}
          aria-label={primary.disabled && primary.disabledReason ? `${primary.label} — ${primary.disabledReason}` : undefined}
          title={primary.disabled ? primary.disabledReason : undefined}
        >
          {primary.icon}
          {primary.label}
          {!primary.icon && <IconChevronRight size={18} />}
        </button>

        {actions.length === 1 && actions[0] && (
          <SecondaryButton action={actions[0]} />
        )}
      </div>

      {primary.disabled && primary.disabledReason && (
        <p className="dock__disabledReason" role="status">{primary.disabledReason}</p>
      )}

      {actions.length === 2 && (
        <div className="dock__secondaryRow">
          {actions.map((action) => (
            <SecondaryButton key={action.label} action={action} />
          ))}
        </div>
      )}
    </footer>
  );
}

function SecondaryButton({ action }: { action: DockAction }) {
  return (
    <button
      type="button"
      className={`secondary ${action.danger ? 'secondary--danger' : ''}`}
      onClick={action.onPress}
      disabled={action.disabled}
    >
      {action.icon}
      {action.label}
    </button>
  );
}
