import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ads = vi.hoisted(() => ({
  interstitialAllowed: vi.fn(), isAdPresenting: vi.fn(), isInterstitialAdReady: vi.fn(),
  preloadInterstitialAd: vi.fn(), showInterstitialAd: vi.fn(),
}));
vi.mock('@ui/ads', () => ads);

import { noteCompletedSessionTrade, resetSessionAds, sampleSessionEngagement, trySessionAdBreak } from './session-ad-runtime';
import type { SessionAdBreak } from './session-ad-policy';

let monotonicMs = 0;

function advance(milliseconds: number, foreground = true): void {
  for (let elapsed = 0; elapsed < milliseconds;) {
    const delta = Math.min(1_000, milliseconds - elapsed);
    monotonicMs += delta;
    sampleSessionEngagement(foreground);
    elapsed += delta;
  }
}

function visits(count: number, prefix = 'visit'): void {
  for (let index = 0; index < count; index++) noteCompletedSessionTrade(`${prefix}-${index}`);
}

function readyFirst(): void { advance(300_000); visits(5); }

async function finishBreak(kind: SessionAdBreak, safe = () => true, pending = vi.fn()): Promise<boolean> {
  const result = trySessionAdBreak(kind, safe, pending);
  monotonicMs += 300;
  await vi.advanceTimersByTimeAsync(300);
  return result;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  monotonicMs = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => monotonicMs);
  ads.interstitialAllowed.mockReset().mockReturnValue(true);
  ads.isAdPresenting.mockReset().mockReturnValue(false);
  ads.isInterstitialAdReady.mockReset().mockReturnValue(true);
  ads.preloadInterstitialAd.mockReset().mockResolvedValue(true);
  ads.showInterstitialAd.mockReset().mockImplementation(async (safe: () => boolean) => safe());
  sampleSessionEngagement(false);
  resetSessionAds();
  sampleSessionEngagement(true);
});

afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('session interstitial runtime', () => {
  it('preloads after four active minutes and at most once per minute without presenting', async () => {
    advance(239_999);
    expect(ads.preloadInterstitialAd).not.toHaveBeenCalled();
    advance(1);
    expect(ads.preloadInterstitialAd).toHaveBeenCalledTimes(1);
    advance(59_999);
    expect(ads.preloadInterstitialAd).toHaveBeenCalledTimes(1);
    advance(1);
    expect(ads.preloadInterstitialAd).toHaveBeenCalledTimes(2);
    visits(20);
    await Promise.resolve();
    expect(ads.showInterstitialAd).not.toHaveBeenCalled();
  });

  it('a completed preload cannot present until another explicit safe break', async () => {
    let completeLoad!: (loaded: boolean) => void;
    const loaded = new Promise<boolean>(resolve => { completeLoad = resolve; });
    ads.preloadInterstitialAd.mockReturnValue(loaded);
    ads.isInterstitialAdReady.mockReturnValue(false);
    readyFirst();
    const pending = vi.fn();
    expect(await trySessionAdBreak('trade-complete', () => true, pending)).toBe(false);
    ads.isInterstitialAdReady.mockReturnValue(true);
    completeLoad(true);
    await loaded;
    expect(ads.showInterstitialAd).not.toHaveBeenCalled();
    expect(pending).not.toHaveBeenCalled();

    expect(await finishBreak('day-report', () => true, pending)).toBe(true);
    expect(pending.mock.calls).toEqual([[true], [false]]);
  });

  it.each(['trade-complete', 'day-report'] as const)('requires engagement, readiness and the shared provider gap at %s', async kind => {
    visits(5);
    expect(await trySessionAdBreak(kind, () => true, vi.fn())).toBe(false);
    advance(300_000);
    ads.isInterstitialAdReady.mockReturnValue(false);
    expect(await trySessionAdBreak(kind, () => true, vi.fn())).toBe(false);
    ads.isInterstitialAdReady.mockReturnValue(true);
    ads.interstitialAllowed.mockReturnValue(false);
    expect(await trySessionAdBreak(kind, () => true, vi.fn())).toBe(false);
    ads.interstitialAllowed.mockReturnValue(true);
    expect(await finishBreak(kind)).toBe(true);
    expect(ads.showInterstitialAd).toHaveBeenCalledTimes(1);
  });

  it('holds the neutral transition for 300 milliseconds and prevents a competing break', async () => {
    readyFirst();
    const pending = vi.fn(), competingPending = vi.fn();
    const result = trySessionAdBreak('trade-complete', () => true, pending);
    expect(pending).toHaveBeenCalledWith(true);
    expect(await trySessionAdBreak('day-report', () => true, competingPending)).toBe(false);
    monotonicMs += 299;
    await vi.advanceTimersByTimeAsync(299);
    expect(ads.showInterstitialAd).not.toHaveBeenCalled();
    monotonicMs += 1;
    await vi.advanceTimersByTimeAsync(1);
    expect(await result).toBe(true);
    expect(ads.showInterstitialAd).toHaveBeenCalledTimes(1);
    expect(pending.mock.calls).toEqual([[true], [false]]);
    expect(competingPending).not.toHaveBeenCalled();
  });

  it('shares a cap of two actually shown ads across trade and day-report breaks', async () => {
    readyFirst();
    expect(await finishBreak('trade-complete')).toBe(true);
    advance(420_000);
    visits(5, 'later');
    expect(await finishBreak('day-report')).toBe(true);
    advance(600_000);
    visits(20, 'extra');

    expect(await trySessionAdBreak('trade-complete', () => true, vi.fn())).toBe(false);
    expect(await trySessionAdBreak('day-report', () => true, vi.fn())).toBe(false);
    expect(ads.showInterstitialAd).toHaveBeenCalledTimes(2);
  });

  it('keeps the five-minute spacing when the first impression happened late', async () => {
    advance(800_000); visits(5);
    expect(await finishBreak('day-report')).toBe(true);
    visits(5, 'later');
    advance(299_000);
    expect(await trySessionAdBreak('trade-complete', () => true, vi.fn())).toBe(false);
    advance(1_000);
    expect(await finishBreak('trade-complete')).toBe(true);
  });

  it.each(['background', 'navigation', 'reset'] as const)('cancels before provider presentation after %s during the transition', async change => {
    readyFirst();
    let surfaceSafe = true;
    const pending = vi.fn();
    const result = trySessionAdBreak('trade-complete', () => surfaceSafe, pending);
    monotonicMs += 100;
    await vi.advanceTimersByTimeAsync(100);
    if (change === 'background') sampleSessionEngagement(false);
    if (change === 'navigation') surfaceSafe = false;
    if (change === 'reset') resetSessionAds();
    monotonicMs += 200;
    await vi.advanceTimersByTimeAsync(200);

    expect(await result).toBe(false);
    expect(ads.showInterstitialAd).not.toHaveBeenCalled();
    expect(pending.mock.calls).toEqual([[true], [false]]);
  });

  it('passes a live safety check through asynchronous provider preparation', async () => {
    readyFirst();
    let surfaceSafe = true, providerSafe!: () => boolean, completePresentation!: (shown: boolean) => void;
    ads.showInterstitialAd.mockImplementation((safe: () => boolean) => {
      providerSafe = safe;
      return new Promise<boolean>(resolve => { completePresentation = resolve; });
    });
    const pending = vi.fn();
    const result = trySessionAdBreak('trade-complete', () => surfaceSafe, pending);
    monotonicMs += 300;
    await vi.advanceTimersByTimeAsync(300);
    expect(providerSafe()).toBe(true);
    surfaceSafe = false;
    expect(providerSafe()).toBe(false);
    completePresentation(false);

    expect(await result).toBe(false);
    expect(pending.mock.calls).toEqual([[true], [false]]);
  });

  it.each(['no-fill', 'error'] as const)('clears pending after provider %s and retries only at a later qualified break', async failure => {
    readyFirst();
    if (failure === 'no-fill') ads.showInterstitialAd.mockResolvedValueOnce(false);
    else ads.showInterstitialAd.mockRejectedValueOnce(new Error('Provider failed'));
    const pending = vi.fn();
    expect(await finishBreak('trade-complete', () => true, pending)).toBe(false);
    expect(pending.mock.calls).toEqual([[true], [false]]);
    expect(await trySessionAdBreak('day-report', () => true, vi.fn())).toBe(false);
    advance(60_000);
    expect(ads.showInterstitialAd).toHaveBeenCalledTimes(1);
    expect(await trySessionAdBreak('day-report', () => true, vi.fn())).toBe(false);
    noteCompletedSessionTrade('retry-visit');
    expect(ads.showInterstitialAd).toHaveBeenCalledTimes(1);
    expect(await finishBreak('day-report')).toBe(true);
    advance(420_000); visits(5, 'second');
    expect(await finishBreak('trade-complete')).toBe(true);
    advance(600_000); visits(5, 'extra');
    expect(await trySessionAdBreak('day-report', () => true, vi.fn())).toBe(false);
    expect(ads.showInterstitialAd).toHaveBeenCalledTimes(3);
  });

  it('does not credit foreground time while another ad is presenting', async () => {
    advance(200_000); visits(5);
    ads.isAdPresenting.mockReturnValue(true);
    advance(120_000);
    expect(await trySessionAdBreak('trade-complete', () => true, vi.fn())).toBe(false);
    ads.isAdPresenting.mockReturnValue(false);
    sampleSessionEngagement(true);
    advance(100_000);
    expect(await finishBreak('trade-complete')).toBe(true);
  });

  it('uses monotonic active time independently of wall-clock jumps', async () => {
    const wallClock = vi.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000);
    advance(120_000); visits(5);
    wallClock.mockReturnValue(1_800_000_000_000 + 120_000 * 4);
    sampleSessionEngagement(true);
    expect(await trySessionAdBreak('trade-complete', () => true, vi.fn())).toBe(false);
    advance(180_000);
    expect(await finishBreak('trade-complete')).toBe(true);
  });

  it.each(['manual', 'long-background'] as const)('starts a fresh session after %s reset', async reset => {
    readyFirst();
    expect(await finishBreak('trade-complete')).toBe(true);
    if (reset === 'manual') resetSessionAds();
    else {
      sampleSessionEngagement(false);
      advance(1_800_000, false);
      sampleSessionEngagement(true);
    }
    expect(await trySessionAdBreak('day-report', () => true, vi.fn())).toBe(false);
    advance(300_000);
    expect(await trySessionAdBreak('day-report', () => true, vi.fn())).toBe(false);
    visits(5, 'fresh');
    expect(await finishBreak('day-report')).toBe(true);
    expect(ads.showInterstitialAd).toHaveBeenCalledTimes(2);
  });
});
