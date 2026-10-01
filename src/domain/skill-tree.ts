import { TALENT_BY_ID, type TalentEffect, type TalentId } from '@data/skills';
import type { Customer, TestTool } from './types';

export interface MasteryProgress {
  version: 1;
  /** Permanently retained first 120 unique qualifying work IDs; never a rolling window. */
  creditedWorkIds: string[];
  /** Grandfathered ranks consume, rather than add to, the six-point entitlement. */
  legacyPoints: number;
  lastResetDay: number | null;
  revision: number;
}
export interface SkillProgress {
  assayAccuracyRank: number;
  tatliDilLevel: number;
  workshopCareRank?: number;
  mastery?: MasteryProgress;
}
export interface NormalizedSkillProgress extends SkillProgress {
  workshopCareRank: number;
  mastery: MasteryProgress;
}
export type VisitSkills = Pick<NormalizedSkillProgress, 'assayAccuracyRank' | 'tatliDilLevel' | 'workshopCareRank'>;
export const MASTERY_THRESHOLDS = [5, 15, 30, 50, 80, 120] as const;
export const ASSAY_ACCURACY_STEPS = [0.6, 0.7, 0.8, 0.9] as const;
export const ASSAY_ACCURACY_MAX_RANK = 3;
const boundedInteger = (value: unknown, max: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(max, Math.trunc(value))) : 0;

export function defaultSkillProgress(): NormalizedSkillProgress {
  return { assayAccuracyRank: 0, tatliDilLevel: 0, workshopCareRank: 0,
    mastery: { version: 1, creditedWorkIds: [], legacyPoints: 0, lastResetDay: null, revision: 0 } };
}
export function normalizeSkillProgress(value?: Partial<SkillProgress> | null): NormalizedSkillProgress {
  let assayAccuracyRank = boundedInteger(value?.assayAccuracyRank, 3);
  let tatliDilLevel = boundedInteger(value?.tatliDilLevel, 3);
  const hasMastery = value?.mastery?.version === 1;
  const mastery = hasMastery ? value!.mastery : undefined;
  const ids = Array.isArray(mastery?.creditedWorkIds)
    ? [...new Set(mastery.creditedWorkIds.filter((id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 256))].slice(0, 120) : [];
  const legacyPoints = hasMastery ? boundedInteger(mastery?.legacyPoints, 6) : assayAccuracyRank + tatliDilLevel;
  let workshopCareRank = hasMastery ? boundedInteger(value?.workshopCareRank, 3) : 0;
  const entitlement = Math.max(legacyPoints, MASTERY_THRESHOLDS.filter(n => ids.length >= n).length);
  let excess = Math.max(0, assayAccuracyRank + tatliDilLevel + workshopCareRank - entitlement);
  const workshopTrim = Math.min(excess, workshopCareRank); workshopCareRank -= workshopTrim; excess -= workshopTrim;
  const talkTrim = Math.min(excess, tatliDilLevel); tatliDilLevel -= talkTrim; excess -= talkTrim;
  assayAccuracyRank -= Math.min(excess, assayAccuracyRank);
  return { assayAccuracyRank, tatliDilLevel, workshopCareRank,
    mastery: { version: 1, creditedWorkIds: ids,
      legacyPoints,
      lastResetDay: typeof mastery?.lastResetDay === 'number' && Number.isSafeInteger(mastery.lastResetDay) && mastery.lastResetDay >= 1 ? mastery.lastResetDay : null,
      revision: boundedInteger(mastery?.revision, Number.MAX_SAFE_INTEGER - 1),
    } };
}
export function masterySummary(progress: SkillProgress) {
  const p = normalizeSkillProgress(progress);
  const completed = p.mastery.creditedWorkIds.length;
  const earned = Math.max(p.mastery.legacyPoints, MASTERY_THRESHOLDS.filter(n => completed >= n).length);
  const spent = p.assayAccuracyRank + p.tatliDilLevel + p.workshopCareRank;
  const next = MASTERY_THRESHOLDS[earned] ?? null;
  return { completed, earned, spent, available: Math.max(0, earned - spent), next,
    remaining: next === null ? 0 : Math.max(0, next - completed) };
}
export function creditMasteryWork(progress: SkillProgress, id: string, netContribution: number, completed: boolean): NormalizedSkillProgress {
  const p = normalizeSkillProgress(progress);
  if (!completed || !Number.isFinite(netContribution) || netContribution <= 0 || !id || id.length > 256 ||
      p.mastery.creditedWorkIds.length >= 120 || p.mastery.creditedWorkIds.includes(id)) return p;
  return { ...p, mastery: { ...p.mastery, creditedWorkIds: [...p.mastery.creditedWorkIds, id], revision: p.mastery.revision + 1 } };
}
export function learnTalent(progress: SkillProgress, id: TalentId, expectedRank: number): NormalizedSkillProgress | null {
  const p = normalizeSkillProgress(progress), node = TALENT_BY_ID.get(id);
  if (!node || !Number.isInteger(expectedRank) || p[node.field] !== expectedRank || expectedRank >= node.maxLevel || masterySummary(p).available < 1) return null;
  return { ...p, [node.field]: expectedRank + 1, mastery: { ...p.mastery, revision: p.mastery.revision + 1 } };
}
export function resetTalents(progress: SkillProgress, day: number, expectedRevision: number): NormalizedSkillProgress | null {
  const p = normalizeSkillProgress(progress);
  if (!Number.isSafeInteger(day) || day < 1 || expectedRevision !== p.mastery.revision ||
      (p.mastery.lastResetDay !== null && day <= p.mastery.lastResetDay) || masterySummary(p).spent === 0) return null;
  return { ...p, assayAccuracyRank: 0, tatliDilLevel: 0, workshopCareRank: 0,
    mastery: { ...p.mastery, lastResetDay: day, revision: p.mastery.revision + 1 } };
}
export function talentRank(progress: SkillProgress, id: string): number {
  const node = TALENT_BY_ID.get(id);
  return node ? normalizeSkillProgress(progress)[node.field] : 0;
}
export function tatliDilEffect(progress: SkillProgress): TalentEffect {
  const level = boundedInteger(progress.tatliDilLevel, 3);
  return TALENT_BY_ID.get('tatli_dil')!.effects.find(effect => effect.level === level)
    ?? { level: 0, patienceBonus: 0, description: 'Yetenek henüz açılmadı.' };
}
export function startingPatience(base: number, progress: SkillProgress): number {
  return base + tatliDilEffect(progress).patienceBonus;
}
export function assayTestAccuracy(progress: SkillProgress): number {
  const rank = boundedInteger(progress.assayAccuracyRank, 3);
  return TALENT_BY_ID.get('ayar_ustaligi')!.effects.find(effect => effect.level === rank)?.assayAccuracy ?? ASSAY_ACCURACY_STEPS[0];
}
export function workshopRiskReduction(progress?: SkillProgress): number {
  const rank = boundedInteger(progress?.workshopCareRank, 3);
  return TALENT_BY_ID.get('usta_eli')!.effects.find(effect => effect.level === rank)?.workshopRiskReduction ?? 0;
}
export function toolWithSkillBonuses(tool: TestTool, progress: SkillProgress): TestTool {
  return tool.id === 'touchstone' ? { ...tool, reliability: assayTestAccuracy(progress) } : tool;
}
export function visitSkills(progress: SkillProgress): VisitSkills {
  // A frozen snapshot carries effects, not a spendable point balance.
  return { assayAccuracyRank: boundedInteger(progress.assayAccuracyRank, 3),
    tatliDilLevel: boundedInteger(progress.tatliDilLevel, 3), workshopCareRank: boundedInteger(progress.workshopCareRank, 3) };
}
/** A visit retains its original bonuses across learning, reset and reload. */
export function freezeVisitSkills(customer: Customer, progress: SkillProgress): Customer {
  return { ...customer, skillSnapshot: visitSkills(customer.skillSnapshot ?? progress) };
}
