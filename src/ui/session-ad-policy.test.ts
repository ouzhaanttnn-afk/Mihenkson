import { describe, expect, it } from 'vitest';
import {
  beginSessionAdAttempt,
  createSessionAdPolicy,
  finishSessionAdAttempt,
  noteSessionTrade,
  sampleSessionAdTime,
  SESSION_AD_POLICY,
  sessionAdEligible,
  type SessionAdBreak,
  type SessionAdPolicyState,
} from './session-ad-policy';

function advance(state: SessionAdPolicyState, milliseconds: number): SessionAdPolicyState {
  let next = state;
  for (let elapsed = 0; elapsed < milliseconds;) {
    const delta = Math.min(1_000, milliseconds - elapsed);
    next = sampleSessionAdTime(next, {
      nowMs: next.sampledAtMs + delta, foreground: next.foreground, adPresented: next.adPresented,
    });
    elapsed += delta;
  }
  return next;
}

function visits(state: SessionAdPolicyState, count: number, prefix = 'visit'): SessionAdPolicyState {
  let next = state;
  for (let i = 0; i < count; i++) next = noteSessionTrade(next, `${prefix}-${i}`);
  return next;
}

function readyFirst(): SessionAdPolicyState {
  return visits(advance(createSessionAdPolicy(0, true), 300_000), 5);
}

function shownFirst(): SessionAdPolicyState {
  return finishSessionAdAttempt(beginSessionAdAttempt(readyFirst(), 'trade-complete'), true);
}

describe('engaged-session interstitial policy', () => {
  it.each<SessionAdBreak>(['trade-complete', 'day-report'])('requires both first thresholds at %s', kind => {
    const short = visits(advance(createSessionAdPolicy(0, true), 299_999), 5);
    expect(sessionAdEligible(short, kind)).toBe(false);
    expect(sessionAdEligible(advance(short, 1), kind)).toBe(true);
    const insufficient = visits(advance(createSessionAdPolicy(0, true), 300_000), 4);
    expect(sessionAdEligible(insufficient, kind)).toBe(false);
    expect(sessionAdEligible(noteSessionTrade(insufficient, 'fifth'), kind)).toBe(true);
  });

  it('never schedules from timing alone or accepts an arbitrary break', () => {
    const state = readyFirst();
    expect(state.shownCount).toBe(0);
    expect(state.attemptPending).toBe(false);
    expect(sessionAdEligible(state, 'launch' as SessionAdBreak)).toBe(false);
    expect(beginSessionAdAttempt(state, 'launch' as SessionAdBreak)).toBe(state);
  });

  it('deduplicates visits without mutating earlier policy snapshots', () => {
    const empty = createSessionAdPolicy(0, true);
    const once = noteSessionTrade(empty, 'settled-visit');
    expect(noteSessionTrade(once, 'settled-visit')).toBe(once);
    expect(noteSessionTrade(once, '')).toBe(once);
    expect(empty.successfulVisitIds.size).toBe(0);
    expect(once.successfulVisitIds.size).toBe(1);
    expect(sessionAdEligible(advance(once, 300_000), 'trade-complete')).toBe(false);
  });

  it('requires twelve active minutes and five new visits for the second slot', () => {
    const first = shownFirst();
    const beforeTime = visits(advance(first, 419_999), 5, 'later');
    expect(sessionAdEligible(beforeTime, 'day-report')).toBe(false);
    expect(sessionAdEligible(advance(beforeTime, 1), 'day-report')).toBe(true);
    const beforeVisits = visits(advance(first, 420_000), 4, 'later');
    expect(sessionAdEligible(beforeVisits, 'trade-complete')).toBe(false);
    expect(sessionAdEligible(noteSessionTrade(beforeVisits, 'later-fifth'), 'trade-complete')).toBe(true);
  });

  it('does not pre-credit visits completed before a late first impression', () => {
    const late = visits(advance(createSessionAdPolicy(0, true), 800_000), 15);
    const first = finishSessionAdAttempt(beginSessionAdAttempt(late, 'day-report'), true);
    expect(first.firstShownVisitCount).toBe(15);
    expect(sessionAdEligible(advance(first, 300_000), 'day-report')).toBe(false);
    expect(sessionAdEligible(visits(advance(first, 300_000), 5, 'new'), 'day-report')).toBe(true);
  });

  it('requires five active minutes since a late first impression', () => {
    const late = advance(readyFirst(), 500_000);
    const first = finishSessionAdAttempt(beginSessionAdAttempt(late, 'trade-complete'), true);
    const beforeGap = visits(advance(first, 299_999), 5, 'later');
    expect(sessionAdEligible(beforeGap, 'trade-complete')).toBe(false);
    expect(sessionAdEligible(advance(beforeGap, 1), 'trade-complete')).toBe(true);
  });

  it('caps actual shown ads at two and ignores duplicated provider results', () => {
    const first = shownFirst();
    expect(finishSessionAdAttempt(first, true)).toBe(first);
    const eligible = visits(advance(first, 420_000), 5, 'second');
    const pending = beginSessionAdAttempt(eligible, 'day-report');
    expect(sessionAdEligible(pending, 'trade-complete')).toBe(false);
    expect(beginSessionAdAttempt(pending, 'trade-complete')).toBe(pending);
    const second = finishSessionAdAttempt(pending, true);
    expect(second.shownCount).toBe(2);
    const muchLater = visits(advance(second, 1_000_000), 50, 'extra');
    expect(sessionAdEligible(muchLater, 'day-report')).toBe(false);
    expect(beginSessionAdAttempt(muchLater, 'day-report')).toBe(muchLater);
  });

  it('failed/no-fill attempts consume no slot and require both retry milestones', () => {
    const failed = finishSessionAdAttempt(beginSessionAdAttempt(readyFirst(), 'trade-complete'), false);
    expect(failed.shownCount).toBe(0);
    expect(failed.firstShownActiveMs).toBeNull();
    expect(failed.firstShownVisitCount).toBeNull();
    expect(sessionAdEligible(failed, 'day-report')).toBe(false);
    expect(sessionAdEligible(noteSessionTrade(advance(failed, 59_999), 'new'), 'day-report')).toBe(false);
    expect(sessionAdEligible(advance(failed, 60_000), 'day-report')).toBe(false);
    const retry = noteSessionTrade(advance(failed, 60_000), 'new');
    expect(sessionAdEligible(retry, 'day-report')).toBe(true);
    const shown = finishSessionAdAttempt(beginSessionAdAttempt(retry, 'day-report'), true);
    expect(shown.shownCount).toBe(1);
    expect(shown.firstShownActiveMs).toBe(360_000);
    expect(shown.firstShownVisitCount).toBe(6);
  });

  it('another failed second-slot attempt keeps the original first-impression baseline', () => {
    const first = shownFirst();
    const eligible = visits(advance(first, 420_000), 5, 'new');
    const failed = finishSessionAdAttempt(beginSessionAdAttempt(eligible, 'day-report'), false);
    expect(failed.shownCount).toBe(1);
    expect(failed.firstShownActiveMs).toBe(300_000);
    expect(failed.firstShownVisitCount).toBe(5);
    expect(sessionAdEligible(advance(failed, 60_000), 'day-report')).toBe(false);
    expect(sessionAdEligible(noteSessionTrade(advance(failed, 60_000), 'retry'), 'day-report')).toBe(true);
  });

  it('never credits background or an ad, including the transition samples', () => {
    const state = advance(createSessionAdPolicy(0, true), 10_000);
    const hidden = sampleSessionAdTime(state, { nowMs: 11_000, foreground: false, adPresented: false });
    const waiting = advance(hidden, 60_000);
    const visible = sampleSessionAdTime(waiting, { nowMs: 72_000, foreground: true, adPresented: false });
    expect(visible.activeMs).toBe(10_000);
    const ad = sampleSessionAdTime(visible, { nowMs: 73_000, foreground: true, adPresented: true });
    const adEnded = sampleSessionAdTime(advance(ad, 60_000), {
      nowMs: 134_000, foreground: true, adPresented: false,
    });
    expect(adEnded.activeMs).toBe(10_000);
    expect(advance(adEnded, 1_000).activeMs).toBe(11_000);
    expect(sessionAdEligible(sampleSessionAdTime(readyFirst(), {
      nowMs: 301_000, foreground: true, adPresented: true,
    }), 'day-report')).toBe(false);
  });

  it('preserves a session for a short background interval', () => {
    const first = shownFirst();
    const hidden = sampleSessionAdTime(first, { nowMs: 300_000, foreground: false, adPresented: false });
    const resumed = sampleSessionAdTime(hidden, {
      nowMs: 300_000 + SESSION_AD_POLICY.backgroundSessionGapMs - 1,
      foreground: true, adPresented: false,
    });
    expect(resumed.activeMs).toBe(300_000);
    expect(resumed.shownCount).toBe(1);
    expect(resumed.successfulVisitIds.size).toBe(5);
  });

  it('resets every session milestone after thirty background minutes', () => {
    const pending = beginSessionAdAttempt(readyFirst(), 'trade-complete');
    const hidden = sampleSessionAdTime(pending, { nowMs: 300_000, foreground: false, adPresented: false });
    const resumed = sampleSessionAdTime(hidden, {
      nowMs: 300_000 + SESSION_AD_POLICY.backgroundSessionGapMs,
      foreground: true, adPresented: false,
    });
    expect(resumed).toEqual(createSessionAdPolicy(resumed.sampledAtMs, true));
    expect(finishSessionAdAttempt(resumed, true)).toBe(resumed);
    expect(sessionAdEligible(resumed, 'day-report')).toBe(false);
  });

  it('cold launch starts fresh even if the preceding session used its slots', () => {
    expect(shownFirst().shownCount).toBe(1);
    const cold = createSessionAdPolicy(900_000, true);
    expect(cold.activeMs).toBe(0);
    expect(cold.shownCount).toBe(0);
    expect(cold.successfulVisitIds.size).toBe(0);
    expect(sessionAdEligible(cold, 'trade-complete')).toBe(false);
  });

  it('uses a high-water clock so rollback/recovery never credits time twice', () => {
    const state = advance(createSessionAdPolicy(0, true), 10_000);
    const rollback = sampleSessionAdTime(state, { nowMs: 5_000, foreground: true, adPresented: false });
    expect(rollback.activeMs).toBe(10_000);
    expect(rollback.sampledAtMs).toBe(10_000);
    const recovered = sampleSessionAdTime(rollback, { nowMs: 10_000, foreground: true, adPresented: false });
    expect(recovered.activeMs).toBe(10_000);
    expect(advance(recovered, 1_000).activeMs).toBe(11_000);
  });

  it('clamps a delayed foreground sample and ignores invalid clock input', () => {
    const state = createSessionAdPolicy(0, true);
    const delayed = sampleSessionAdTime(state, { nowMs: 600_000, foreground: true, adPresented: false });
    expect(delayed.activeMs).toBe(5_000);
    expect(delayed.sampledAtMs).toBe(600_000);
    expect(sampleSessionAdTime(delayed, { nowMs: NaN, foreground: true, adPresented: false }).activeMs).toBe(5_000);
    expect(sampleSessionAdTime(delayed, { nowMs: Infinity, foreground: true, adPresented: false }).activeMs).toBe(5_000);
    expect(createSessionAdPolicy(NaN).activeMs).toBe(0);
    expect(createSessionAdPolicy(-100).sampledAtMs).toBe(0);
  });

  it('short sessions and long idle sessions with no completed trades remain ad-free', () => {
    expect(sessionAdEligible(visits(advance(createSessionAdPolicy(0, true), 120_000), 50), 'day-report')).toBe(false);
    expect(sessionAdEligible(advance(createSessionAdPolicy(0, true), 3_600_000), 'day-report')).toBe(false);
  });
});
