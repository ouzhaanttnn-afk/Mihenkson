import { describe, expect, it } from 'vitest';

import { RETAIL_BULLION_CATALOG } from '@data/bullion';
import { NEGOTIATION } from './balance';
import { templatesForTier } from './item-spawn';

describe('Beta Update v1', () => {
  it('pazarlık ayarları onaylanan daha akıcı değerlere sabitlenir', () => {
    expect(NEGOTIATION.maxReservationFlex).toBe(0.10);
    expect(NEGOTIATION.counterMarginByState.OPEN).toEqual([0.11, 0.07]);
    expect(NEGOTIATION.insultThreshold).toBe(0.78);
    expect(NEGOTIATION.counterMarginByState.HARDENING).toEqual([0.06, 0.04]);
    expect(NEGOTIATION.counterMarginByState.FINAL_OFFER).toEqual([0.02, 0.02]);
  });

  it('Tam Altın yeni stok ve müşteri talebi havuzlarında yer almaz', () => {
    expect(RETAIL_BULLION_CATALOG).not.toContain('full_gold');
    for (let tier = 1; tier <= 4; tier += 1) {
      expect(templatesForTier(tier).map((template) => template.id)).not.toContain('full_gold');
    }
  });
});
