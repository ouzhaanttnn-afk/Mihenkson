import { describe, expect, it } from 'vitest';

import { snapOffer } from './OfferControl';

describe('teklif slider adımı', () => {
  it('değeri min tabanlı geçerli adıma oturtur', () => {
    expect(snapOffer(6_116, 5_099, 9_099, 500)).toBe(6_099);
  });

  it('alt ve üst sınırı aşmaz', () => {
    expect(snapOffer(-1, 5_099, 9_099, 500)).toBe(5_099);
    expect(snapOffer(99_999, 5_099, 9_120, 500)).toBe(9_099);
  });
});
