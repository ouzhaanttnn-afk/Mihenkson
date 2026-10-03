import { memo, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { t } from '@i18n/index';
import { businessStoryAgenda, businessStoryDirection, customerReturnContext } from '@domain/business-story';
import { masterySummary, normalizeSkillProgress } from '@domain/skill-tree';
import { businessStoryContextOf, useGame } from '@state/gameStore';
import { BusinessIdentity } from '@ui/components/BusinessIdentity';
import { customerReturnCopy, shopAgendaCopy } from '@ui/business-story-copy';
import { businessStoryInputs } from '@ui/business-story-inputs';

/** No full-ledger traversal on the 500 ms clock: subscribe to economic inputs. */
function useStory() {
  const inputs = useGame(useShallow(businessStoryInputs));
  const context = useMemo(() => businessStoryContextOf({ ...useGame.getState(), store: inputs }), [inputs]);
  const direction = useMemo(() => businessStoryDirection(context), [context, inputs.language]);
  // Ready deliveries already have a direct reminder. Do not let that duplicate
  // hide the next real payment/event in the daily agenda.
  const agenda = useMemo(() => businessStoryAgenda(context, { includeReadyDeliveries: false })[0], [context]);
  return { inputs, direction, agenda };
}

export const ShopDirection = memo(function ShopDirection() {
  const { direction } = useStory();
  const openGrowth = useGame(s => s.openBusinessRoute);
  const openSkills = useGame(s => s.setShopTalentTreeOpen);
  return <BusinessIdentity tier={Math.min(4, direction.upgrade.current.tier) as 1 | 2 | 3 | 4}
    tierName={direction.upgrade.current.name}
    onOpenGrowth={() => openGrowth('store')}
    onOpenSkills={() => openSkills(true)} />;
});

export const ShopAgenda = memo(function ShopAgenda() {
  const { agenda, inputs } = useStory();
  const openBusiness = useGame(s => s.openBusinessRoute);
  const setTab = useGame(s => s.setTab);
  if (!agenda) return null;
  const copy = shopAgendaCopy(agenda, inputs.day);
  return <div className="alert alert--warning businessAgenda">
    <span className="alert__body"><span className="alert__title">{copy.title}</span>
      <span className="alert__detail"> · {copy.detail}</span></span>
    <button type="button" className="chip" onClick={() => {
      if (copy.route === 'workshop' || copy.route === 'stock') setTab(copy.route);
      else openBusiness(copy.route);
    }}>{t('İncele')}</button>
  </div>;
});

/** Only during the initial decision. Never adds a card above negotiation CTA. */
export const ReturningCustomerContext = memo(function ReturningCustomerContext() {
  const s = useGame(useShallow(state => ({ customer: state.activeCustomer, customers: state.customers,
    ledger: state.ledger, items: state.items, event: state.market.activeEvent, language: state.preferences.language })));
  const history = useMemo(() => s.customer ? customerReturnContext(s.customer.id, s.customers, s.ledger, s.items) : null,
    [s.customer?.id, s.customers, s.ledger, s.items]);
  // One relevant public clue, not hidden budgets, defects or future prices.
  const risk = s.event?.id === 'fake_wave' ? t('Fırsatçı müşteri ilgisi artıyor; şüpheli ürünü doğrula.') : null;
  const text = risk ?? (history ? customerReturnCopy(history) : null);
  return text ? <p className="businessContext">{text}</p> : null;
});

/** A settled, qualifying manual sale only; staff sales cannot award mastery. */
export function SaleMasteryNote({ dealId }: { dealId: string }) {
  const s = useGame(useShallow(state => ({ skills: state.skillProgress, language: state.preferences.language })));
  if (!normalizeSkillProgress(s.skills).mastery.creditedWorkIds.includes(`deal:${dealId}`)) return null;
  const mastery = masterySummary(s.skills);
  return <p className="businessContext" role="status">{mastery.available > 0
    ? t('{n} yetenek puanın hazır', { n: mastery.available })
    : mastery.next !== null ? t('Ustalık: {n}/{hedef} uygun iş', { n: mastery.completed, hedef: mastery.next })
      : t('Ustalık puanlarının tamamı açıldı.')}</p>;
}
