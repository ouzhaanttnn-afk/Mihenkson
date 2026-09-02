import { describe, expect, it } from 'vitest';
import { getTool } from '@data/tools';
import {
  ASSAY_ACCURACY_MAX_RANK,
  assayTestAccuracy,
  defaultSkillProgress,
  normalizeSkillProgress,
  toolWithSkillBonuses,
} from './skill-tree';

describe('ayar testi yetenek altyapısı', () => {
  it('yeni oyuncu yüzde 60 doğrulukla başlar', () => {
    expect(assayTestAccuracy(defaultSkillProgress())).toBe(0.6);
    expect(toolWithSkillBonuses(getTool('touchstone'), defaultSkillProgress()).reliability).toBe(0.6);
  });

  it('gelecekteki üç kademe doğruluğu en fazla yüzde 90 yapar', () => {
    expect(assayTestAccuracy({ assayAccuracyRank: 1 })).toBe(0.7);
    expect(assayTestAccuracy({ assayAccuracyRank: 2 })).toBe(0.8);
    expect(assayTestAccuracy({ assayAccuracyRank: 3 })).toBe(0.9);
    expect(ASSAY_ACCURACY_MAX_RANK).toBe(3);
  });

  it('bozuk veya sınır dışı kayıtları güvenli aralığa çeker', () => {
    expect(normalizeSkillProgress().assayAccuracyRank).toBe(0);
    expect(normalizeSkillProgress({ assayAccuracyRank: -4 }).assayAccuracyRank).toBe(0);
    expect(normalizeSkillProgress({ assayAccuracyRank: 99 }).assayAccuracyRank).toBe(3);
  });

  it('diğer test araçlarının doğruluğunu değiştirmez', () => {
    const scale = getTool('scale');
    expect(toolWithSkillBonuses(scale, { assayAccuracyRank: 3 })).toBe(scale);
  });
});
