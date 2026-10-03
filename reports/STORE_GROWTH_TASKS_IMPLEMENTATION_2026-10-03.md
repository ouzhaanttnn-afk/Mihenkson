# 1.3.0 — compact growth tasks / TestFlight follow-up

## Scope

User authorized applying `STORE_GROWTH_TASKS_PLAN_2026-10-03.md` and sending the combined result to TestFlight. The new build must **not** be submitted to App Review before the user's explicit okay. No cancellation of an older review submission is inferred from this.

- Includes the previously committed 88 px home store tile and Dynamic Island safe-area fix.
- Home tile and Business → Store open the same compact screen.
- Six canonical career gates are now short task rows, in a fixed order. Investment remains a seventh, separate eligibility gate.
- Ready tasks, help and store details start closed. One payment CTA stays above navigation in normal flex flow.
- Tier targets, customer/ledger counts, save format, economy, talents, ads and IAP are unchanged. The existing upgrade action rechecks live gates and applies its existing settlement.
- Target: next store name. Final store: no fifth-tier promise or fake payment button.
- Row membership freezes during active interaction; values/count/readiness continue updating. Outside pointer release, cancellation, focus exit and idle scrolling release the lock. Successful target changes discard stale grouping.
- Selective inputs omit personnel timer churn but retain wealth, gold spot, customer, ledger, presentation and language/currency changes.

## Verification

- `npm test`: 1,642 Vitest tests plus 5 release-preparation tests passed (107 suites).
- 23 new task view/contract tests: all tiers, all seven independent gates, six-ready/cash-short, non-monotonic readiness, lifetime counters, frozen membership/live values, final tier, closed details, language/currency and read-only state.
- Typecheck/build passed. Existing >500 kB chunk advisory remains; no new dependency.
- Release check: 82/82. Translation keys: 1,173/1,173. Translation audit remains at reviewed baseline (73); no new unwrapped text.
- Browser: production App with simulated native iOS top 59 / bottom 34; home tile → tasks, Business → Store, back and help → real wholesale route passed; no console errors.
- Controlled presentation fixture: 390×844 and 430×932, six missing tasks, default disclosures closed, no body scroll or horizontal overflow. Footer meets navigation exactly without overlay or duplicate safe-bottom.
- 320×568 with 200% English root type and longest heading: one scrolling body, no horizontal overflow; all detail/help disclosures together remain scrollable to their last line; footer stays reachable.
- Delayed all-ready update while Ready Tasks summary focused: summary y=375.52 before/after; six original rows stay in place, live values become ready, CTA enables, no success paragraph insertion during interaction. Focus exit releases regrouping.
- Actual UI screenshot: `C:/Users/Gaming/.codex/visualizations/2026/10/03/mihenk-1.3.0/compact-growth-tasks.png`.

The React review guidance influenced narrow subscriptions and derived state. Browser verification guidance was used for real navigation, safe-area, text-scaling and scroll checks.

## Release delivery

Marketing version remains **1.3.0**, build **37**.

- Source commit: `8924ab8f25c28487263aa5ff6baf63402b283cb7` (`codex/mihenk-personnel-home`). Includes earlier compact-home and safe-area commits.
- GitHub Actions: https://github.com/ouzhaanttnn-afk/Mihenkson/actions/runs/37129345418 — completed successfully, job duration 7m42s.
- Validation passed at 2026-10-03 14:28:26 UTC. Apple upload confirmed at 14:29:53 UTC (17:29:53 Istanbul): `UPLOAD SUCCEEDED with no errors`.
- Delivery UUID: `c97a2576-7ead-4525-aa5d-f35409198c51`.
- After the user restored the Apple session, processing was verified complete: build 37 appears under iOS Builds as Ready to Submit (external beta status, not an App Review submission). The build detail shows the existing Betatest internal group with 3 testers attached.
- Turkish What to Test notes were saved and Apple's Saved state was verified. Proof: `C:/Users/Gaming/.codex/visualizations/2026/10/03/mihenk-1.3.0/testflight-37-ready.png`.
- New build **not submitted to App Review**. User's okay is required. Older build 36's existing review submission was not modified; the separate cancellation question has not been answered.
- CI annotations: runner-capacity advisory and action runtime deprecation warning were non-blocking. No credential/access/signing change was made.
