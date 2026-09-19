import { t } from '@i18n/index';

export type RewardedFeedback = 'loading' | 'unavailable' | 'network' | 'consent' | 'failed' | 'cancelled' | 'web' | 'premium-unknown' | null;
let feedback: RewardedFeedback = null;
export function setRewardedFeedback(value: RewardedFeedback) { feedback = value; }
/** A presentation result, not a second reward/entitlement manager. */
export function rewardedFailureMessage(fallback: string): string {
  switch (feedback) {
    case 'loading': return t('Reklam hazırlanıyor. Biraz sonra tekrar dene.');
    case 'unavailable': return t('Şu an uygun reklam bulunamadı. Daha sonra tekrar deneyebilirsin.');
    case 'network': return t('Reklam yüklenemedi. İnternet bağlantını kontrol et.');
    case 'consent': return t('Reklam şu anda gizlilik izni nedeniyle kullanılamıyor. Gizlilik ve destek bölümünü kontrol et.');
    case 'failed': return t('Reklam gösterilemedi. Ödül hakkın kullanılmadı; tekrar deneyebilirsin.');
    case 'cancelled': return t('Reklam ödül kazanılmadan kapandı. Ödül verilmedi.');
    case 'web': return t('Ödüllü reklamlar yalnız mobil uygulamada kullanılabilir.');
    case 'premium-unknown': return t('Premium durumu doğrulanamadı. Bağlantını kontrol edip tekrar dene.');
    default: return fallback;
  }
}
