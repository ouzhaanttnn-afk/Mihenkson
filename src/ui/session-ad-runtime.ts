import {
  beginSessionAdAttempt, createSessionAdPolicy, finishSessionAdAttempt,
  noteSessionTrade, sampleSessionAdTime, sessionAdEligible, type SessionAdBreak,
} from './session-ad-policy';
import { interstitialAllowed, isAdPresenting, isInterstitialAdReady,
  preloadInterstitialAd, showInterstitialAd } from './ads';

const now = () => performance.now();
let policy = createSessionAdPolicy(now());
let foreground = false;
let epoch = 0;
let preloadAt = -Infinity;

/** Presentation-only state: never persisted and never changes game time or money. */
export function sampleSessionEngagement(active: boolean): void {
  foreground = active;
  const previous = policy;
  policy = sampleSessionAdTime(policy, { nowMs: now(), foreground,
    adPresented: policy.attemptPending || isAdPresenting() });
  if (policy.activeMs < previous.activeMs || policy.successfulVisitIds.size < previous.successfulVisitIds.size) epoch++;
  if (foreground && policy.activeMs >= 240_000 && policy.shownCount < 2 &&
      !isAdPresenting() && now() - preloadAt >= 60_000) {
    preloadAt = now();
    void preloadInterstitialAd().catch(() => false);
  }
}

/** Called only after a successful manual visit and a verified save. */
export function noteCompletedSessionTrade(visitId: string): void {
  policy = noteSessionTrade(policy, visitId);
}

export function resetSessionAds(): void {
  epoch++;
  policy = createSessionAdPolicy(now(), foreground);
  preloadAt = -Infinity;
}

/** No timer ever calls this. A settled trade/day-report is the only entry point. */
export async function trySessionAdBreak(
  breakKind: SessionAdBreak,
  isSurfaceSafe: () => boolean,
  setPending: (pending: boolean) => void,
): Promise<boolean> {
  sampleSessionEngagement(foreground);
  if (!isSurfaceSafe() || !sessionAdEligible(policy, breakKind) ||
      !isInterstitialAdReady() || !interstitialAllowed()) return false;
  policy = beginSessionAdAttempt(policy, breakKind);
  const attemptEpoch = epoch;
  setPending(true);
  let shown = false;
  try {
    // Neutral, non-interactive transition prevents a rapid tap becoming an ad click.
    await new Promise(resolve => setTimeout(resolve, 300));
    const safe = () => foreground && epoch === attemptEpoch && isSurfaceSafe();
    if (safe()) shown = await showInterstitialAd(safe);
    return shown;
  } catch { return false; }
  finally {
    if (epoch === attemptEpoch) policy = finishSessionAdAttempt(policy, shown);
    setPending(false);
  }
}
