import { afterEach, describe, expect, it } from 'vitest';
import { rewardedFailureMessage, setRewardedFeedback, type RewardedFeedback } from './ad-feedback';
afterEach(() => setRewardedFeedback(null));
describe('honest rewarded feedback', () => {
  it.each<[RewardedFeedback, string]>([
    ['loading', 'hazırlanıyor'], ['unavailable', 'bulunamadı'], ['network', 'İnternet'],
    ['cancelled', 'ödül kazanılmadan kapandı'], ['web', 'mobil uygulamada'],
    ['consent', 'gizlilik'], ['premium-unknown', 'Premium durumu'], ['failed', 'Ödül hakkın kullanılmadı'],
  ])('%s has a distinct player-facing explanation', (reason, expected) => {
    setRewardedFeedback(reason);
    expect(rewardedFailureMessage('fallback')).toContain(expected);
  });
  it('unknown result keeps the caller fallback', () => {
    setRewardedFeedback(null);
    expect(rewardedFailureMessage('fallback')).toBe('fallback');
  });
});
