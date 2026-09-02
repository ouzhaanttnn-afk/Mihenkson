/**
 * Yetenek ağacının domain temeli.
 *
 * Şimdilik yalnız ayar testi uzmanlığı tanımlıdır; herhangi bir ekran veya
 * otomatik açılma yoktur. Oyuncu kademe 0'da başlar. İleride yetenek ağacı
 * satın alma/XP kuralı yalnız `assayAccuracyRank` alanını yükseltecektir.
 */

import type { TestTool } from './types';
import { TALENT_BY_ID, type TalentEffect } from '@data/skills';

export interface SkillProgress {
  /** 0 = temel, 1–3 = gelecekte açılacak yetenek kademeleri. */
  assayAccuracyRank: number;
  /** Tatlı Dil yeteneği; ekran açılana kadar 0 kalır. */
  tatliDilLevel: number;
}

export const ASSAY_ACCURACY_STEPS = [0.6, 0.7, 0.8, 0.9] as const;
export const ASSAY_ACCURACY_MAX_RANK = ASSAY_ACCURACY_STEPS.length - 1;

export function defaultSkillProgress(): SkillProgress {
  return { assayAccuracyRank: 0, tatliDilLevel: 0 };
}

export function normalizeSkillProgress(value?: Partial<SkillProgress> | null): SkillProgress {
  const raw = Number.isFinite(value?.assayAccuracyRank) ? value!.assayAccuracyRank! : 0;
  return {
    assayAccuracyRank: Math.max(0, Math.min(ASSAY_ACCURACY_MAX_RANK, Math.trunc(raw))),
    tatliDilLevel: Math.max(0, Math.min(3, Math.trunc(value?.tatliDilLevel ?? 0))),
  };
}

export function tatliDilEffect(progress: SkillProgress): TalentEffect {
  const level = normalizeSkillProgress(progress).tatliDilLevel;
  const node = TALENT_BY_ID.get('tatli_dil');
  return node?.effects.find(effect => effect.level === level) ?? {
    level: 0,
    patienceBonus: 0,
    description: 'Yetenek henüz açılmadı.',
  };
}

export function startingPatience(base: number, progress: SkillProgress): number {
  return base + tatliDilEffect(progress).patienceBonus;
}

/** Mihenk taşıyla yanlış ayar beyanını doğru yakalama olasılığı. */
export function assayTestAccuracy(progress: SkillProgress): number {
  return ASSAY_ACCURACY_STEPS[normalizeSkillProgress(progress).assayAccuracyRank]!;
}

/**
 * Test tanımını oyuncunun yeteneğiyle birleştirir. Yalnız mihenk taşı etkilenir;
 * terazi, yoğunluk ve ileri seviye spektrometre kendi dengelerini korur.
 */
export function toolWithSkillBonuses(tool: TestTool, progress: SkillProgress): TestTool {
  if (tool.id !== 'touchstone') return tool;
  return { ...tool, reliability: assayTestAccuracy(progress) };
}
