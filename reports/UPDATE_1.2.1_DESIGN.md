# Mihenk 1.2.1 — publisher-approved performance and advertising revision

Authorized on 2026-10-02: fix touch/render performance, implement reasonable
automatic short ad breaks, simplify the skill-tree screen, then upload and submit
version 1.2.1 to Apple for automatic release after approval. This is a scoped
amendment to Mihenk, not TradeUp's monetization rules.

## Preserve progress and economic behavior

- Lossless gzip level 1 and verified, immutable snapshot deduplication replace
  redundant compression/backup decoding. Read actual storage before deduplication;
  in-place mutations, external storage changes and failed writes cannot bypass it.
- Preserve all transactions, customer history, gold, skills and offline watermarks.
  Journal UI shows 50 newest-first records per page, with all older pages accessible.
- Remove expensive control-flow flattening, dead-code injection and encoded string
  indirection from production JS. Keep lightweight obfuscation; never rely on it
  for security. Native iOS full-screen overlays use dimming instead of blur.
- Share unchanged valuation references after recalculating values (no stale-price
  cache), cache number formatters, narrow idle subscriptions and unmount closed
  day-report calculations. No economy, spawn timing or personnel rule changes.
- Talent UI uses short branch tabs and a single next/current effect line. Full rank
  information and earning/reset rules stay available through disclosures; no
  altered effect, price, earned-point or unlock behavior.

## One shared, transient two-slot ad budget

- Replace the old weekly automatic interstitial. No additional automatic placement
  outside the two slots below. Existing rewarded placements/benefits remain intact.
- First slot: at least five active foreground real minutes and five unique successful
  manually completed customer-trade visits. Second: at least twelve active minutes,
  five more completed manual visits since the first actual impression, and at least
  five active minutes between impressions. 1x/2x/4x game speed changes none of this.
- Attempt only at the end of a settled-and-saved customer visit, or after a saved
  day report. A timer/preload callback never presents an ad. Multi-line visits count
  once; staff/offline/wholesale/service/appraisal/rejected transactions do not count.
- Opening, onboarding, negotiation, stock supply, skill/personnel/profile/settings
  dialogs, unread offline reports, foreground loss and other unfinished decisions
  are protected. Show a brief 300ms neutral transition to prevent accidental taps.
- Maximum two actually shown interstitials per session. A cold launch or at least
  thirty minutes in the background begins a new session, with all grace periods.
  Never persist the budget into economic progress or award money for interstitials.
- Preload ahead, expire creatives after one hour, recheck native foreground, UMP
  permission and confirmed non-Premium entitlement immediately before presentation.
  Premium or uncertain entitlement means no automatic ad. Existing 120-second
  separation from rewarded presentations remains. No consent form at an automatic
  break. No ready creative/no fill/offline/failure skips the break without blocking.
- Failed attempts don't consume impressions; another attempt requires at least
  sixty more active seconds and a new manual completed visit at a later break.
- Preparation and pre-presentation checks have bounded timeouts; visible creatives
  retain the SDK close control. Standard AdMob unit/settings determine duration;
  the app cannot promise exactly five seconds or two impressions in every session.
  High-engagement ad setting should be OFF for this app's standard units, verified
  in the console before claiming it. Do not add a custom forced-close timer.

## Verification/release

Run full tests, TypeScript, production build, release and localization checks;
verify web UI at 320/430 widths and native SDK boundary tests. Desktop synthetic
benchmarks are not physical iPhone frame-time measurements. Upload the exact
verified source as 1.2.1, supply truthful review notes/new-version copy, select the
processed build and submit to Apple. Report the actual status, not a promised date.
