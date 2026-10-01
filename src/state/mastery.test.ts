import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@ui/ads', () => ({ showRewardedAd: vi.fn(), showInterstitialAd: vi.fn() }));
import { bullionMeta } from '@data/bullion';
import { DAY } from '@domain/balance';
import { spawnItem } from '@domain/item-spawn';
import { createMarketForDay } from '@domain/market';
import { LESSONS } from '@domain/onboarding';
import { advanceJobsOneDay } from '@domain/service';
import { creditMasteryWork, defaultSkillProgress, learnTalent, masterySummary } from '@domain/skill-tree';
import { createLedger } from '@domain/settlement';
import type { Customer, CustomerDemand, InventoryPosition, ItemInstance } from '@domain/types';
import { trueValue } from '@domain/valuation';
import { quoteContext, setSimulationForeground, useGame } from './gameStore';
import { deserialize, readSave, serialize } from './save';
const initial = useGame.getState();
const works = (count: number) => {
  let p = defaultSkillProgress();
  for (let n = 0; n < count; n++) p = creditMasteryWork(p, `fixture:${n}`, 1, true);
  return p;
};
function visitor(id: string, intent: Customer['intent'], demand: CustomerDemand | null = null): Customer {
  return { id: 'returning-customer', visitId: id, displayName: 'Fixture', archetype: 'investor', intent,
    patienceMax: 4, patience: 4, knowledge: 80, urgency: 50, priceSensitivity: 80, status: 50,
    budget: 100_000_000, reservationPrice: 1_000, purchaseCeilingRatio: 1.15, demand, trust: 50,
    suspicion: 0, visitHistory: [], preferences: [], referralSource: null, lineIds: [],
    skillSnapshot: { assayAccuracyRank: 0, tatliDilLevel: 0, workshopCareRank: 0 } };
}
function saleQueue(count = 5, cost = 100) {
  const s = useGame.getState(), source = spawnItem(42, 7, 'gram_gold_1'), meta = bullionMeta(source.templateId)!;
  const item: ItemInstance = { ...source, id: 'stock', location: 'backStock', buyCost: cost,
    truth: { ...source.truth, actualPurity: meta.unitPurity, craftsmanship: 0, hiddenFlaws: [] } };
  const position: InventoryPosition = { itemId: item.id, quantity: count, costBasis: cost * count,
    currentValue: trueValue(item, s.market) * count, age: 0, demand: 'steady', thesis: null,
    location: 'backStock', expectedExitValues: {} };
  const demand: CustomerDemand = { families: [item.family], wantsBullion: true, templateId: item.templateId,
    quantity: 1, minQuantity: 1, acceptsPartial: false, isBulk: false, summary: 'One gram', alternativesLabel: '' };
  useGame.setState({ items: { stock: item }, inventory: [position], queue: Array.from({ length: count },
    (_, n) => ({ customer: visitor(`arrival-${n}`, 'buy', demand), items: [] })) });
}
function completeSale() {
  useGame.getState().greetCustomer();
  useGame.getState().togglePackageItem('stock');
  useGame.getState().setStage('negotiate');
  const before = useGame.getState();
  const amount = before.activeDeal!.purchase!.suggestedPrice;
  useGame.getState().negotiationMove({ kind: 'offer', amount, atRound: 0 });
  expect(useGame.getState().activeDeal?.lines[0]?.negotiation.state).toBe('ACCEPTED');
  useGame.getState().finishDeal();
}
beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => values.set(k, v), removeItem: (k: string) => values.delete(k) });
  vi.stubGlobal('document', { hidden: false, visibilityState: 'visible' });
  setSimulationForeground(true);
  useGame.setState({ ...initial, seed: 42, market: { ...createMarketForDay(42, 1), clockMinutes: DAY.openMinutes, goldSpot: 7_100 },
    store: { ...initial.store, cash: 1_000_000, level: 9, reputation: 50, personnelCount: 0,
      personnelRoles: [], personnelElapsedSeconds: 0, staff: [], workshopCapacity: 3,
      supplier: { ...initial.store.supplier, openInvoices: [] }, payables: [] },
    tab: 'shop', speed: 1, profileSetupDone: true, seenLessons: LESSONS.map(l => l.id),
    profileOpen: false, settingsOpen: false, rankingOpen: false, stockCatalogOpen: false, personnelOpen: false,
    shopTalentTreeOpen: false, dayCloseConfirmOpen: false, dayReportOpen: false, weekTransitionPending: false,
    rewardedAdPending: null, activeDeal: null, activeCustomer: null, recallableGuest: null,
    inventory: [], items: {}, jobs: [], jobCounter: 0, ledger: createLedger(), customers: {},
    queue: [], nextCustomerAtMinutes: DAY.closeMinutes + 1, lastReview: null, toasts: [],
    skillProgress: defaultSkillProgress() }, true);
});
afterEach(() => { useGame.setState(initial, true); vi.unstubAllGlobals(); });
describe('skill actions and verified persistence', () => {
  it('spends only earned points, persists before mutation and rejects repeated stale taps', () => {
    useGame.setState({ skillProgress: works(15) });
    const before = useGame.getState();
    expect(before.learnSkill('usta_eli', 0)).toBe(true);
    expect(useGame.getState().learnSkill('usta_eli', 0)).toBe(false);
    expect(useGame.getState().skillProgress.workshopCareRank).toBe(1);
    expect(readSave()?.skillProgress).toEqual(useGame.getState().skillProgress);
    expect(useGame.getState().store).toEqual(before.store);
    expect(useGame.getState().ledger).toEqual(before.ledger);
  });
  it('leaves both ranks and points unchanged on storage failures for learning and reset', () => {
    const learned = learnTalent(works(15), 'tatli_dil', 0)!;
    useGame.setState({ skillProgress: learned });
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => { throw new Error('quota'); }, removeItem: () => {} });
    expect(useGame.getState().learnSkill('usta_eli', 0)).toBe(false);
    expect(useGame.getState().resetSkills(learned.mastery.revision)).toBe(false);
    expect(useGame.getState().skillProgress).toEqual(learned);
  });
  it('guards visits, recall, transitions and undelivered jobs; resets once daily', () => {
    const p = learnTalent(works(15), 'tatli_dil', 0)!;
    useGame.setState({ skillProgress: p, activeCustomer: visitor('current', 'buy') });
    expect(useGame.getState().learnSkill('usta_eli', 0)).toBe(false);
    expect(useGame.getState().resetSkills(p.mastery.revision)).toBe(false);
    useGame.setState({ activeCustomer: null, jobs: [{ result: 'success' }] as typeof initial.jobs });
    expect(useGame.getState().resetSkills(p.mastery.revision)).toBe(false);
    useGame.setState({ jobs: [] });
    expect(useGame.getState().resetSkills(p.mastery.revision)).toBe(true);
    expect(useGame.getState().learnSkill('usta_eli', 0)).toBe(true);
    const now = useGame.getState().skillProgress;
    expect(useGame.getState().resetSkills(now.mastery!.revision)).toBe(false);
    expect(masterySummary(now)).toMatchObject({ earned: 2, spent: 1, available: 1 });
  });
});
describe('real manual settlement mastery', () => {
  it('credits five distinct visits by the same customer, yields one point, and survives reload without duplication', () => {
    saleQueue();
    for (let n = 0; n < 5; n++) completeSale();
    const s = useGame.getState();
    expect(s.ledger.deals).toHaveLength(5);
    expect(new Set(s.ledger.appliedTxIds).size).toBe(5);
    expect(masterySummary(s.skillProgress)).toMatchObject({ completed: 5, earned: 1 });
    expect(s.skillProgress.mastery!.creditedWorkIds).toEqual(Array.from({ length: 5 }, (_, n) => `deal:deal_arrival-${n}`));
    const restored = deserialize(JSON.parse(JSON.stringify(serialize(s))));
    expect(restored.ledger).toEqual(s.ledger);
    expect(restored.skillProgress).toEqual(s.skillProgress);
    useGame.setState(restored);
    useGame.getState().finishDeal();
    expect(useGame.getState().skillProgress).toEqual(s.skillProgress);
  });
  it('does not award loss-making sales or automated staff sales', () => {
    saleQueue(1, 10_000_000); completeSale();
    expect(masterySummary(useGame.getState().skillProgress).completed).toBe(0);
    saleQueue(1);
    useGame.setState({ store: { ...useGame.getState().store, personnelCount: 1, personnelRoles: ['sales'] } });
    useGame.getState().tick(90);
    expect(useGame.getState().queue).toHaveLength(0);
    expect(masterySummary(useGame.getState().skillProgress).completed).toBe(0);
  });
  it('holds old queued and malformed saved visit patience fixed after learning', () => {
    saleQueue(1);
    useGame.setState({ skillProgress: works(5) });
    expect(useGame.getState().learnSkill('tatli_dil', 0)).toBe(true);
    const saved = serialize(useGame.getState());
    const restored = deserialize(JSON.parse(JSON.stringify(saved)));
    expect(restored.queue[0]!.customer.patienceMax).toBe(4);
    expect(restored.queue[0]!.customer.skillSnapshot?.tatliDilLevel).toBe(0);
    saved.queue![0]!.customer.patienceMax = NaN; saved.queue![0]!.customer.patience = NaN;
    expect(deserialize(saved).queue[0]!.customer.patienceMax).toBe(4);
    useGame.setState(restored); useGame.getState().greetCustomer();
    expect(useGame.getState().activeCustomer?.patienceMax).toBe(4);
    expect(quoteContext(useGame.getState()).skills?.tatliDilLevel).toBe(0);
  });
});
describe('workshop and appraisal proof', () => {
  it('awards only delivered successful net-profitable jobs and never rerolls an accepted job', () => {
    const asset = { ...spawnItem(42, 8, 'damaged_chain'), location: 'customer' as const };
    useGame.setState({ queue: [{ customer: visitor('service', 'service'), items: [asset] }] });
    useGame.getState().greetCustomer(); useGame.getState().selectServiceType('chainRepair');
    useGame.getState().selectServiceVenue('inHouse'); useGame.getState().acceptServiceJob();
    expect(useGame.getState().jobs).toHaveLength(1);
    expect(masterySummary(useGame.getState().skillProgress).completed).toBe(0);
    useGame.getState().finishDeal();
    const accepted = structuredClone(useGame.getState().jobs[0]!);
    expect(accepted.predeterminedOutcome).toBe('success');
    useGame.setState({ skillProgress: works(30) });
    expect(useGame.getState().learnSkill('usta_eli', 0)).toBe(true);
    expect(readSave()?.jobs[0]).toEqual(accepted);
    let jobs = [accepted]; for (let day = 0; day < 10; day++) jobs = advanceJobsOneDay(jobs);
    useGame.setState({ jobs });
    const net = accepted.fee - accepted.partsCost - accepted.outsourceCost;
    expect(net).toBeGreaterThan(0);
    useGame.getState().deliverJob(accepted.jobId); useGame.getState().deliverJob(accepted.jobId);
    expect(masterySummary(useGame.getState().skillProgress).completed).toBe(30 + (accepted.predeterminedOutcome === 'success' && net > 0 ? 1 : 0));
    expect(useGame.getState().ledger.appliedTxIds.filter(id => id === `service_deliver_${accepted.jobId}`)).toHaveLength(1);
  });
  it.each([['correct', true, 60, 0, true], ['inaccurate', false, 60, 0, false],
    ['unpaid', true, 1_000_000, 0, false], ['tests cost more than fee', true, 60, 61, false]])('%s appraisal credit', (_, accurate, fee, testCost, credited) => {
    const asset = spawnItem(42, 3, 'bracelet_22k_thin');
    useGame.setState({ queue: [{ customer: visitor('appraisal', 'appraisal'), items: [asset] }] });
    useGame.getState().greetCustomer();
    const s = useGame.getState(), deal = s.activeDeal!, actual = trueValue(s.items[deal.lines[0]!.itemId]!, s.market);
    const mid = accurate ? actual : actual * 3;
    useGame.setState({ activeDeal: { ...deal, lines: deal.lines.map(l => ({ ...l, band: {
      min: mid * .98, mid, max: mid * 1.02, confidence: 'high', relativeWidth: .04,
      breakdown: { metal: mid, stone: 0, craftsmanship: 0, rarityPremium: 0, riskDeduction: 0, marketInfluence: 0 } } })),
      appraisal: { ...deal.appraisal!, stance: 'measured', fee } } });
    if (testCost) useGame.setState({ ledger: { ...s.ledger, transactions: [{ txId: `test_${deal.dealId}_1`,
      dealId: deal.dealId, day: 1, cashDelta: -testCost, itemsIn: [], itemsOut: [], trustDelta: 0,
      reputationDelta: 0, xpDelta: 0, label: 'test' }], appliedTxIds: [`test_${deal.dealId}_1`] } });
    useGame.getState().issueReport(); useGame.getState().issueReport();
    expect(masterySummary(useGame.getState().skillProgress).completed).toBe(credited ? 1 : 0);
  });
});
