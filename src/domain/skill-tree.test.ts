import { describe, expect, it } from 'vitest';
import { getTool } from '@data/tools';
import { ARCHETYPES } from '@data/archetypes';
import { TALENT_BY_ID } from '@data/skills';
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
    expect(assayTestAccuracy({ assayAccuracyRank: 1, tatliDilLevel: 0 })).toBe(0.7);
    expect(assayTestAccuracy({ assayAccuracyRank: 2, tatliDilLevel: 0 })).toBe(0.8);
    expect(assayTestAccuracy({ assayAccuracyRank: 3, tatliDilLevel: 0 })).toBe(0.9);
    expect(ASSAY_ACCURACY_MAX_RANK).toBe(3);
  });

  it('bozuk veya sınır dışı kayıtları güvenli aralığa çeker', () => {
    expect(normalizeSkillProgress()).toEqual({ assayAccuracyRank: 0, tatliDilLevel: 0 });
    expect(normalizeSkillProgress({ assayAccuracyRank: -4 }).assayAccuracyRank).toBe(0);
    expect(normalizeSkillProgress({ assayAccuracyRank: 99 }).assayAccuracyRank).toBe(3);
  });

  it('Tatlı Dil sabır bonusunu 0, 1, 2, 2 olarak üretir', async () => {
    const { startingPatience, tatliDilEffect } = await import('./skill-tree');
    expect(startingPatience(3, { assayAccuracyRank: 0, tatliDilLevel: 0 })).toBe(3);
    expect(startingPatience(3, { assayAccuracyRank: 0, tatliDilLevel: 1 })).toBe(4);
    expect(startingPatience(3, { assayAccuracyRank: 0, tatliDilLevel: 2 })).toBe(5);
    expect(startingPatience(3, { assayAccuracyRank: 0, tatliDilLevel: 3 })).toBe(5);
    expect(tatliDilEffect({ assayAccuracyRank: 0, tatliDilLevel: 3 }).patienceLossTolerated).toBe(true);
  });

  it('diğer test araçlarının doğruluğunu değiştirmez', () => {
    const scale = getTool('scale');
    expect(toolWithSkillBonuses(scale, { assayAccuracyRank: 3, tatliDilLevel: 0 })).toBe(scale);
  });
});

describe('Tatlı Dil müşteri sabrı temeli', () => {
  it('yetenek kaydı istenen üç kademeyi taşır', () => {
    const node = TALENT_BY_ID.get('tatli_dil');
    expect(node).toMatchObject({
      name: 'Tatlı Dil & Esnaf Nüktesi',
      category: 'sarraflik',
      maxLevel: 3,
    });
    expect(node?.effects.map(effect => effect.patienceBonus)).toEqual([1, 2, 2]);
    expect(node?.effects[2]?.patienceLossTolerated).toBe(true);
  });

  it('aceleci 2, genel müşteriler 3, VIP 4 sabırla başlar', () => {
    const patience = Object.fromEntries(ARCHETYPES.map(a => [a.id, a.patienceBand]));
    expect(patience.urgentCash).toEqual([2, 2]);
    expect(patience.investor).toEqual([3, 3]);
    expect(patience.giftBuyer).toEqual([3, 3]);
    expect(patience.weddingShopper).toEqual([3, 3]);
    expect(patience.collector).toEqual([3, 3]);
    expect(patience.informedSeller).toEqual([3, 3]);
    expect(patience.opportunist).toEqual([3, 3]);
    expect(patience.vip).toEqual([4, 4]);
  });
});
