import { afterEach, describe, expect, it, vi } from 'vitest';
import { unlockAudio, setAudioForeground, setAdAudioPaused, syncMusic, musicAvailable, resetAudioForTests } from './audio';
afterEach(() => { resetAudioForTests(); vi.unstubAllGlobals(); });
describe('müzik yaşam döngüsü', () => {
 it('asset yokken müzik yerine sahte ses indirmez', () => {
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  syncMusic(true,25); setAdAudioPaused(true); setAudioForeground(false); setAudioForeground(true);
  expect(musicAvailable()).toBe(false); expect(fetch).not.toHaveBeenCalled();
 });
 it('arka plana geçince suspend, dönüşte resume; yeni oynatıcı açmaz', () => {
  const suspend=vi.fn().mockResolvedValue(undefined), resume=vi.fn().mockResolvedValue(undefined);
  const construct=vi.fn();
  class Context {
   state='running'; destination={}; suspend=suspend; resume=resume;
   constructor(){construct();}
   createGain(){return {connect:vi.fn()};}
  }
  vi.stubGlobal('window',{AudioContext:Context});
  unlockAudio(); setAudioForeground(false); setAudioForeground(true); unlockAudio();
  expect(construct).toHaveBeenCalledOnce(); expect(suspend).toHaveBeenCalledOnce(); expect(resume).toHaveBeenCalledOnce();
 });
});
