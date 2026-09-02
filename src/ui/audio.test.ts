/**
 * SES OYNATICI — sessiz çökmeme sözleşmesi.
 *
 * Bu testlerin işi sesin DUYULDUĞUNU kanıtlamak değil (o tarayıcıda ölçüldü);
 * oynatıcının, ses çalamayacağı her durumda OYUNU BOZMADAN sessiz kalmasını
 * sabitlemek. Üçü de gerçek çökme sebebiydi: node'da `AudioContext` yok,
 * kullanıcı dokunmadan tarayıcı izin vermiyor, dosya eksik olabiliyor.
 */

import { afterEach, describe, expect, it } from 'vitest';
import {
  AUDIO_FILES,
  isAudioUnlocked,
  playSound,
  preloadAudio,
  resetAudioForTests,
  unlockAudio,
} from './audio';

afterEach(() => resetAudioForTests());

describe('ses oynatıcı · sessiz çökmeme', () => {
  /*
    TEST ORTAMINDA `window` VE `AudioContext` YOK. Modülün import edilebilmesi
    ve çağrılabilmesi şart: tek bir `throw`, sesle hiç ilgisi olmayan bütün
    mağaza testlerini düşürürdü.
  */
  it('AudioContext yokken çağrılar sessizce geçer', () => {
    expect(() => unlockAudio()).not.toThrow();
    expect(() => preloadAudio()).not.toThrow();
    expect(() => playSound('deal', true, 70)).not.toThrow();
  });

  it('desteklenmeyen ortamda kilit AÇILMIŞ görünmez', () => {
    unlockAudio();

    expect(isAudioUnlocked()).toBe(false);
  });

  it.each([
    ['ses kapalı', false, 70],
    ['düzey sıfır', true, 0],
    ['düzey negatif', true, -20],
  ])('%s → çalmaz, hata da vermez', (_ad, acik, duzey) => {
    expect(() => playSound('coins', acik, duzey)).not.toThrow();
  });

  it('her ses kimliğinin bir dosyası vardır — yazım hatası sessiz sessizliğe dönmesin', () => {
    for (const [id, dosya] of Object.entries(AUDIO_FILES)) {
      expect(dosya).toMatch(/\.(wav|ogg|mp3)$/);
      expect(dosya.startsWith(id.slice(0, 3))).toBe(true);
    }
  });

  it('tanımlı ses sayısı ve adları sabit — biri silinirse test düşer', () => {
    expect(Object.keys(AUDIO_FILES).sort()).toEqual(
      ['chime', 'coins', 'customer', 'deal', 'deny', 'levelup', 'tap', 'test'],
    );
  });
});
