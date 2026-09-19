import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

import { setLanguage } from '@i18n/index';
import {
  shopStageNoticeText,
  soundTestNoteText,
  type ShopStageNotice,
  type SoundTestNote,
} from './transient-copy';

afterEach(() => setLanguage('tr'));

function projectFile(path: string): string {
  return readFileSync(fileURLToPath(new URL(`../../${path}`, import.meta.url)), 'utf8');
}

describe('geçici arayüz metinleri', () => {
  it('ses testi sonucunu çevrilmiş string yerine yapısal anahtar olarak taşır', () => {
    const note: SoundTestNote = 'running-silent-device';

    setLanguage('tr');
    expect(soundTestNoteText(note)).toBe(
      'Ses açıldı. Duymuyorsanız telefonun yan tarafındaki sessiz düğmesini kontrol edin.',
    );

    setLanguage('en');
    expect(soundTestNoteText(note)).toBe(
      'Audio is on. If you hear nothing, check the silent switch on the side of your phone.',
    );
  });

  it('aşama bildirimini state değişmeden yeni dilde yeniden üretir', () => {
    const notice: ShopStageNotice = 'valuation-skipped';

    setLanguage('tr');
    expect(shopStageNoticeText(notice)).toBe(
      'Değerleme atlandı · teklif aralığı daha belirsiz ve riskli olabilir.',
    );

    setLanguage('en');
    expect(shopStageNoticeText(notice)).toBe(
      'Appraisal skipped · the offer range may be looser and riskier.',
    );
  });

  it('React state içinde çevrilmiş sonuç değil dil bağımsız durum tutar', () => {
    const settings = projectFile('src/ui/shell/SettingsDialog.tsx');
    const shop = projectFile('src/ui/screens/ShopScreen.tsx');

    expect(settings).toContain("useState<SoundTestNote>('prompt')");
    expect(settings).toContain('soundTestNoteText(sesNotu)');
    expect(settings).not.toMatch(/setSesNotu\(\s*t\(/);
    expect(shop).toContain('useState<ShopStageNotice | null>(null)');
    expect(shop).toContain("setStageNotice('valuation-skipped')");
    expect(shop).toContain('shopStageNoticeText(stageNotice)');
    expect(shop).not.toMatch(/setStageNotice\(\s*t\(/);
  });
});
