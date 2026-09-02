/**
 * AYARLAR — mağaza sözleşmesi.
 *
 * Pencerenin kendisi React; buradaki testler onun dayandığı mağaza
 * davranışını korur:
 *
 *   · açık/kapalı bayrağı,
 *   · pencere açıkken oyun zamanının DURMASI (§4),
 *   · öğreticinin İKİ YÖNE de çalışması,
 *   · bayrağın kayda sızmaması.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGame } from './gameStore';
import { serialize } from './save';

const initial = useGame.getState();

beforeEach(() => {
  const data = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => data.set(k, v),
    removeItem: (k: string) => data.delete(k),
  });
  useGame.setState({ ...initial, settingsOpen: false, seenLessons: [] }, true);
});
afterEach(() => {
  useGame.setState(initial, true);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('ayarlar penceresi', () => {
  it('kapalı başlar', () => {
    expect(useGame.getState().settingsOpen).toBe(false);
  });

  it('açılır ve kapanır', () => {
    useGame.getState().openSettings();
    expect(useGame.getState().settingsOpen).toBe(true);
    useGame.getState().closeSettings();
    expect(useGame.getState().settingsOpen).toBe(false);
  });

  it('AÇIKKEN OYUN ZAMANI DURUR — §4', () => {
    const before = useGame.getState().market.clockMinutes;

    useGame.getState().openSettings();
    useGame.getState().tick(60);
    expect(useGame.getState().market.clockMinutes).toBe(before);

    // Kapatınca zaman kaldığı yerden akmalı; kalıcı donma bir hata olurdu.
    useGame.getState().closeSettings();
    useGame.getState().tick(60);
    expect(useGame.getState().market.clockMinutes).toBeGreaterThan(before);
  });

  it('profil penceresiyle aynı kuralı paylaşır ama ondan bağımsızdır', () => {
    useGame.getState().openSettings();
    expect(useGame.getState().profileOpen).toBe(false);
    useGame.getState().closeSettings();
    expect(useGame.getState().settingsOpen).toBe(false);
  });
});

describe('öğretici ipuçları anahtarı', () => {
  it('kapatmak tüm dersleri görülmüş sayar', () => {
    useGame.getState().skipOnboarding();
    expect(useGame.getState().seenLessons.length).toBeGreaterThan(0);
  });

  it('GERİ AÇILABİLİR — kapatma tek yönlü kalmaz', () => {
    useGame.getState().skipOnboarding();
    expect(useGame.getState().seenLessons.length).toBeGreaterThan(0);

    useGame.getState().restoreOnboarding();
    expect(useGame.getState().seenLessons).toEqual([]);
  });

  it('aç–kapa–aç aynı noktaya döner', () => {
    const start = useGame.getState().seenLessons;
    useGame.getState().skipOnboarding();
    useGame.getState().restoreOnboarding();
    expect(useGame.getState().seenLessons).toEqual(start);
  });
});

describe('kayıt uyumu', () => {
  it('settingsOpen kayda yazılmaz — eski kayıtlar etkilenmez', () => {
    useGame.getState().openSettings();
    // `serialize` nesne döndürür, metin değil — SaveFile alanlarını tek tek
    // sayar; bayrağın oraya sızmadığını doğrudan o nesnede kontrol ediyoruz.
    const file = serialize(useGame.getState()) as unknown as Record<string, unknown>;
    expect('settingsOpen' in file).toBe(false);
    expect('profileOpen' in file).toBe(false);
  });
});
