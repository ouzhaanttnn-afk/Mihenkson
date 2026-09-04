import { t } from '@i18n/index';

export type SoundTestNote =
  | 'prompt'
  | 'unsupported'
  | 'running'
  | 'running-silent-device'
  | 'blocked';

/** Dil değişse bile ses testi sonucu eski çevrilmiş metne kilitlenmez. */
export function soundTestNoteText(note: SoundTestNote): string {
  switch (note) {
    case 'prompt':
      return t('Kısa bir tıngırtı çalar; ses yolunun çalışıp çalışmadığını gösterir.');
    case 'unsupported':
      return t('Bu tarayıcı ses çalamıyor.');
    case 'running':
      return t('Ses açıldı — kısa bir tıngırtı duymalısınız.');
    case 'running-silent-device':
      return t('Ses açıldı. Duymuyorsanız telefonun yan tarafındaki sessiz düğmesini kontrol edin.');
    case 'blocked':
      return t('Ses açılamadı; tarayıcı izin vermedi.');
  }
}

export type ShopStageNotice = 'valuation-skipped';

/** Geçici aşama bildirimi etkin dilde her render'da yeniden üretilir. */
export function shopStageNoticeText(notice: ShopStageNotice): string {
  switch (notice) {
    case 'valuation-skipped':
      return t('Değerleme atlandı · teklif aralığı daha belirsiz ve riskli olabilir.');
  }
}
