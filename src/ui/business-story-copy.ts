import { t } from '@i18n/index';
import { tl } from '@ui/format';
import { weekdayLabel } from '@domain/calendar';
import type { BusinessStoryAgendaItem, BusinessStoryDayProgress, BusinessStoryNearGoal, CustomerReturnContext } from '@domain/business-story';
import type { Gate } from '@domain/store-growth';

const GATE_HELP: Record<Gate['key'], string> = {
  closedDeals: 'Tamamlanan ticaretler bu şartı ilerletir.',
  knownCustomers: 'Gerçek ziyaretler müşteri defterine eklenir.',
  level: 'İşlem ve hizmet deneyimi bu seviyeyi ilerletir.',
  supplierTrust: 'Anlamlı tedarik alışları güveni artırır.',
  reputation: 'Müşteri ziyaretinin sonucu semt itibarını etkiler.',
  investment: 'Yatırım için nakit ayır; yeni günlük gideri de kontrol et.',
  netWorth: 'Nakit ve eldeki mal birlikte değerlendirilir.',
};

export function shopGoalCopy(goal: BusinessStoryNearGoal): { label: string; guidance: string | null; skills: boolean } {
  switch (goal.key) {
    case 'mastery-spend': return { label: t('{n} yetenek puanın hazır', { n: goal.available }), guidance: null, skills: true };
    case 'mastery-work': return { label: t('Ustalık: {n}/{hedef} uygun iş', { n: goal.completed, hedef: goal.target }),
      guidance: t('Kârlı manuel satış, doğru ekspertiz veya başarılı servis teslimi.'), skills: true };
    case 'upgrade-ready': return { label: t('Mağaza yükseltmeye hazır · {tutar}', { tutar: tl(goal.investment) }), guidance: null, skills: false };
    case 'upgrade-gate': return { label: t('{kosul}: {simdi}/{hedef}', { kosul: t(goal.gate.label),
      simdi: goal.gate.unit === 'money' ? tl(goal.gate.current) : Math.floor(goal.gate.current),
      hedef: goal.gate.unit === 'money' ? tl(goal.gate.needed) : goal.gate.needed }), guidance: t(GATE_HELP[goal.gate.key]), skills: false };
    case 'career-complete': return { label: t('Bu sürümde son mağaza kademesindesin.'), guidance: null, skills: false };
  }
}

export function shopAgendaCopy(item: BusinessStoryAgendaItem, day: number) {
  switch (item.key) {
    case 'payment': return { title: item.overdue ? t('Geciken ödeme') : item.dueDay === day ? t('Bugün ödeme günü') : t('Yarın ödeme günü'),
      detail: item.source === 'payable' && item.id.startsWith('scale_maintenance_')
        ? t('{tutar} · Terazi bakım borcu; nakit yeterliyse vadesinde gün kapanışında ödenir.', { tutar: tl(item.amount) })
        : t('{tutar} · Borç ve vadeleri kontrol et.', { tutar: tl(item.amount) }),
      route: item.source === 'network' ? 'network' as const : item.source === 'payable' ? 'root' as const : 'wholesaler' as const };
    case 'delivery': return { title: item.ready ? t('Teslime hazır iş') : item.overdue ? t('Geciken teslim') : t('Yaklaşan teslim'),
      detail: t('Atölyede sonucu ve verilen sözü kontrol et.'), route: 'workshop' as const };
    case 'event': return { title: t('{olay} · {n} gün kaldı', { olay: t(item.label), n: item.remainingDays }), detail: t(item.description), route: 'market' as const };
    case 'week': return { title: t('{gun} · dükkân {durum}', { gun: t(weekdayLabel(day)), durum: item.shopOpen ? t('açık') : t('kapalı') }),
      detail: item.marketOpen ? t('Piyasa açık. Stok ve nakit dengesini planla.') : t('Piyasa kapalı; fiyat donuk. Sonraki açılış: {gun}.', { gun: t(weekdayLabel(item.nextMarketOpenDay)) }), route: 'stock' as const };
  }
}

export function customerReturnCopy(context: CustomerReturnContext): string {
  if (context.productNames.length && context.tradeSide === 'sold-to-customer') {
    return t('Son alışverişi: {urun}', { urun: context.productNames.map(name => t(name)).join(', ') });
  }
  // Do not label service, appraisal, rejection or unproved old data as a sale.
  return t('Tanıdık müşteri · {n} kayıtlı ziyaret · Son ziyaret gün {gun}', { n: context.visits, gun: context.lastVisitDay });
}

/** Two short observed facts; do not infer a change without a day baseline. */
export function dayProgressCopy(progress: BusinessStoryDayProgress | null | undefined): string[] {
  if (!progress) return [];
  const lines: string[] = [];
  if (progress.tierAfter > progress.tierBefore) lines.push(t('Mağazan bir üst kademeye geçti.'));
  if (progress.delta.masteryPoints > 0) lines.push(t('{n} yeni yetenek puanı açıldı.', { n: progress.delta.masteryPoints }));
  else if (progress.delta.masteryWorks > 0) lines.push(t('{n} uygun iş ustalığı ilerletti.', { n: progress.delta.masteryWorks }));
  if (progress.newlyMetGateKeys.length) lines.push(t('{n} mağaza şartı daha tamamlandı.', { n: progress.newlyMetGateKeys.length }));
  if (progress.delta.knownCustomers > 0) lines.push(t('{n} yeni müşteri deftere eklendi.', { n: progress.delta.knownCustomers }));
  if (progress.delta.supplierTrust > 0) lines.push(t('Toptancı güveni +{n}.', { n: progress.delta.supplierTrust }));
  if (progress.noLongerMetGateKeys.length && (progress.targetTier === null || progress.tierAfter < progress.targetTier))
    lines.unshift(t('{n} mağaza şartı yeniden eksik; ayrıntıları kontrol et.', { n: progress.noLongerMetGateKeys.length }));
  return lines.slice(0, 2);
}
