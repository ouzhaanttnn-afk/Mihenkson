/**
 * FON MÜZİĞİ — sessiz çökmeme sözleşmesi.
 *
 * Aynı üç gerçek kısıt `audio.ts` ile paylaşılıyor: node ortamında `document`
 * ve `Audio` yok, tarayıcı jestsiz oynatmayı reddedebilir, dosya sorunlu
 * olabilir. Bu testler sesin DUYULDUĞUNU değil, modülün bu durumların
 * hiçbirinde oyunu çökertmediğini sabitler.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { applyMusic, musicStatus, resetMusicForTests, resumeMusic } from './music';

afterEach(() => resetMusicForTests());

describe('fon müziği · sessiz çökmeme', () => {
  it('Audio yokken çağrılar sessizce geçer', () => {
    expect(() => applyMusic(true, 70)).not.toThrow();
    expect(() => applyMusic(false, 0)).not.toThrow();
    expect(() => resumeMusic()).not.toThrow();
  });

  it('desteklenmeyen ortamda durum dürüst kalır', () => {
    applyMusic(true, 70);

    const durum = musicStatus();
    expect(durum.supported).toBe(false);
    expect(durum.playing).toBe(false);
    // İstek KAYDEDİLİR — desteklenmiyor olması "istenmedi" anlamına gelmez.
    expect(durum.requested).toBe(true);
  });

  it.each([
    ['müzik kapalı', false, 70],
    ['düzey sıfır', true, 0],
    ['düzey negatif', true, -20],
    ['düzey 100 üstü', true, 500],
  ])('%s → çalmaz, hata da vermez', (_ad, acik, duzey) => {
    expect(() => applyMusic(acik, duzey)).not.toThrow();
    expect(musicStatus().playing).toBe(false);
  });

  it('resetMusicForTests sonrası durum başlangıca döner', () => {
    applyMusic(true, 70);
    resetMusicForTests();

    const durum = musicStatus();
    expect(durum.requested).toBe(false);
    expect(durum.playing).toBe(false);
  });
});
