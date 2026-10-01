/** Transient session policy. All clock values are injected monotonic milliseconds. */
export const SESSION_AD_POLICY = {
  maxShown: 2,
  firstActiveMs: 300_000,
  firstVisits: 5,
  secondActiveMs: 720_000,
  additionalVisits: 5,
  minimumShownGapMs: 300_000,
  retryActiveMs: 60_000,
  backgroundSessionGapMs: 1_800_000,
  maximumSampleDeltaMs: 5_000,
} as const;

export type SessionAdBreak = 'trade-complete' | 'day-report';

export interface SessionAdPolicyState {
  readonly activeMs: number;
  /** Only successful, manually completed visits belong here; never serialize this Set. */
  readonly successfulVisitIds: ReadonlySet<string>;
  readonly shownCount: number;
  readonly firstShownActiveMs: number | null;
  readonly firstShownVisitCount: number | null;
  readonly lastAttemptActiveMs: number | null;
  readonly lastAttemptVisitCount: number | null;
  readonly attemptPending: boolean;
  readonly sampledAtMs: number;
  readonly foreground: boolean;
  readonly adPresented: boolean;
  readonly backgroundSinceMs: number | null;
}

export interface SessionAdTimeSample {
  readonly nowMs: number;
  readonly foreground: boolean;
  readonly adPresented: boolean;
}

export function createSessionAdPolicy(nowMs: number, foreground = false): SessionAdPolicyState {
  const now = Number.isFinite(nowMs) ? Math.max(0, nowMs) : 0;
  return {
    activeMs: 0,
    successfulVisitIds: new Set(),
    shownCount: 0,
    firstShownActiveMs: null,
    firstShownVisitCount: null,
    lastAttemptActiveMs: null,
    lastAttemptVisitCount: null,
    attemptPending: false,
    sampledAtMs: now,
    foreground,
    adPresented: false,
    backgroundSinceMs: foreground ? null : now,
  };
}

/** Sample once per second and on lifecycle/ad transitions; this never presents an ad. */
export function sampleSessionAdTime(
  state: SessionAdPolicyState,
  sample: SessionAdTimeSample,
): SessionAdPolicyState {
  // A high-water mark prevents a rollback and recovery from crediting the same interval twice.
  const now = Number.isFinite(sample.nowMs)
    ? Math.max(state.sampledAtMs, sample.nowMs)
    : state.sampledAtMs;
  if (sample.foreground && state.backgroundSinceMs !== null &&
      now - state.backgroundSinceMs >= SESSION_AD_POLICY.backgroundSessionGapMs) {
    return { ...createSessionAdPolicy(now, true), adPresented: sample.adPresented };
  }
  // Both ends must be eligible. Uncertain transition intervals grant no active time.
  const delta = state.foreground && sample.foreground && !state.adPresented && !sample.adPresented
    ? Math.min(now - state.sampledAtMs, SESSION_AD_POLICY.maximumSampleDeltaMs)
    : 0;
  return {
    ...state,
    activeMs: state.activeMs + delta,
    sampledAtMs: now,
    foreground: sample.foreground,
    adPresented: sample.adPresented,
    backgroundSinceMs: sample.foreground ? null : state.backgroundSinceMs ?? now,
  };
}

/** The caller verifies successful manual settlement; one visit counts once, not once per line. */
export function noteSessionTrade(state: SessionAdPolicyState, visitId: string): SessionAdPolicyState {
  if (!visitId || state.successfulVisitIds.has(visitId)) return state;
  return { ...state, successfulVisitIds: new Set([...state.successfulVisitIds, visitId]) };
}

/** The caller additionally excludes onboarding/protected UI and checks current ad eligibility. */
export function sessionAdEligible(state: SessionAdPolicyState, breakKind: SessionAdBreak): boolean {
  if ((breakKind !== 'trade-complete' && breakKind !== 'day-report') ||
      !state.foreground || state.adPresented || state.attemptPending ||
      state.shownCount >= SESSION_AD_POLICY.maxShown) return false;
  const visits = state.successfulVisitIds.size;
  if (state.activeMs < SESSION_AD_POLICY.firstActiveMs || visits < SESSION_AD_POLICY.firstVisits) return false;
  if (state.lastAttemptActiveMs !== null &&
      (state.activeMs - state.lastAttemptActiveMs < SESSION_AD_POLICY.retryActiveMs ||
       visits <= (state.lastAttemptVisitCount ?? visits))) return false;
  if (state.shownCount === 0) return true;
  return state.firstShownActiveMs !== null && state.firstShownVisitCount !== null &&
    state.activeMs >= SESSION_AD_POLICY.secondActiveMs &&
    state.activeMs - state.firstShownActiveMs >= SESSION_AD_POLICY.minimumShownGapMs &&
    visits - state.firstShownVisitCount >= SESSION_AD_POLICY.additionalVisits;
}

/** Reserve the break before invoking the provider; failed/no-fill requests retain their retry guard. */
export function beginSessionAdAttempt(
  state: SessionAdPolicyState,
  breakKind: SessionAdBreak,
): SessionAdPolicyState {
  if (!sessionAdEligible(state, breakKind)) return state;
  return {
    ...state,
    attemptPending: true,
    lastAttemptActiveMs: state.activeMs,
    lastAttemptVisitCount: state.successfulVisitIds.size,
  };
}

/** Call once after the provider outcome is known; only an actually shown ad consumes a slot. */
export function finishSessionAdAttempt(state: SessionAdPolicyState, shown: boolean): SessionAdPolicyState {
  if (!state.attemptPending) return state;
  return {
    ...state,
    attemptPending: false,
    shownCount: state.shownCount + (shown ? 1 : 0),
    firstShownActiveMs: shown && state.shownCount === 0 ? state.activeMs : state.firstShownActiveMs,
    firstShownVisitCount: shown && state.shownCount === 0 ? state.successfulVisitIds.size : state.firstShownVisitCount,
  };
}
