# Mihenk Premium — release gate (2026-09-12)

- Authorized: permanent non-consumable, TRY 299.00, all ads removed, reward actions remain user-initiated and keep existing limits/cooldowns.
- Product ID: `com.mihenkaynak.app.premium.lifetime`; Apple product ID `6811364961`.
- App Store Connect: product created; Turkish and English localization; Türkiye base price exactly TRY 299.00; Apple comparable prices elsewhere.
- No RevenueCat subscription/service or new payment-provider account. Native StoreKit 2 verifies ownership. Web/Android real-money checkout is disabled.
- Ownership is separate from game saves. Verified current entitlements, transaction updates, refund/revocation checks, explicit Restore Purchases. No stored premium flag or fake checkout.
- Ad gate covers all 14 existing reward kinds and the weekly interstitial. Unknown entitlement suppresses ads AND withholds unverified rewards.
- Gameplay, balancing and save schema unchanged. Skill progression still deferred/read-only; future feedback is in BETA_FEEDBACK_BACKLOG.md.

## Verification

- Final local suite: 71 files / 1102 tests passed, TypeScript check passed. Includes real reward-bridge tests for duplicate taps, save/reload daily caps and unknown ownership.
- Production build passed; Chrome/WebKit at 320/390/430 px: 6 Premium page scenarios, no horizontal overflow/JS errors, minimum 44 px purchase target, unavailable web checkout disabled.
- Native iOS simulator compilation passed on macOS for implementation commit `1db5b30915c421ff651ace71b80f687706d3a263`: https://github.com/ouzhaanttnn-afk/Mihenkson/actions/runs/34698105399 (success). No upload step exists in this workflow. Follow-up changes are tests and policy/report text only.
- Production navigation/onboarding/save-reload smoke tests passed in Chrome and WebKit.
- Real StoreKit purchase/cancel/restore/refund/pending and offline relaunch require sandbox device testing. Browser mocks do not prove payment processing.

## Blocking account requirement

App Store Connect Business currently shows Paid Apps Agreement = New and requires updating legal entity information before signing. Account holder must complete accurate legal, banking and tax requirements. Do not claim purchases are live; do not submit this package to TestFlight while the store product is untestable.

Apple product localization, availability and review notes were saved. First-IAP review screenshot and app-review submission remain pending; no public release or TestFlight upload was dispatched. The GitHub token lacked workflow-write scope; the unsigned verification workflow was created through the authorized signed-in browser session, and normal code push succeeded afterward.

## On-device acceptance checklist

1. Market > Special Packages: price from StoreKit is TRY 299.00 on Turkish storefront; no recurring billing.
2. Cancel sheet: no unlock. Pending approval: no unlock until verified transaction arrives.
3. Purchase: Premium active; every reward action bypasses ads; limits still enforced; Monday interstitial absent.
4. Relaunch/offline: verified owned entitlement remains usable; new game does not remove purchase.
5. Reinstall with same Apple Account and Restore: ownership restored, not game progress.
6. Refund/revocation: Premium removed on update/refresh; unknown bridge state never grants rewards.
7. Before public App Store review: attach first IAP with app version, update public description/review notes and take genuine native paywall screenshot.

Rollback: preserve previous beta tags/builds. Reverting to a pre-Premium build after actual paid sales requires care: it would remove purchased functionality.

Omni this turn: 1 request, 0 successful, HTTP 429 Felo quota limit.
