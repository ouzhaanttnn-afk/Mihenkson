# Mihenk 1.3.0 — Yaşayan Dükkân release record

## Approved scope (2026-10-03)

One update connects the existing store growth, mastery, actual returning customers,
market calendar, payment/delivery agenda and day report. It does not add quests,
currencies, IAP products, ad placements, automatic buying or borrowing. Existing
device saves and staff/offline behavior are preserved. See `UPDATE_1.3.0_DESIGN.md`
and `PROGRESSION_1.3.0_CALIBRATION.md` for the explicit measured design revision.

Meaningful canonical cash and financed pool purchases now earn the same existing
capped supplier-trust increment. Store trust gates are 58/62/65; XP, personnel and
store-level gates remain 3/6/10. Other investment and upgrade conditions remain.

## Local verification

- `npm test`: 106 Vitest files / 1,616 tests and five release preparation tests.
- `npm run typecheck`, `npm run build`, `npm run release:check`: passed; 82 checks.
- `npm run i18n`: 1,162 active keys, no missing translations. The syntactic audit
  retains its 73 reviewed baseline findings; no new untranslated UI is accepted.
- No lint script is defined in this repository.
- Production main JS: 779.20 kB / 256.44 kB gzip; CSS: 163.48 / 28.46 kB. The
  existing large-chunk warning remains; this is not a physical-device FPS claim.
- Independent final bounded audit: 130 focused tests, no open P0/P1/P2 finding.
- Simulation: 6,000 actual-engine careers, 1,000 common seeds, 18,000 invariant
  checks and 48 deterministic replays. This is not a human-retention measurement.

## Browser evidence

Dedicated `127.0.0.1:4180` QA career Beta130, not the publisher's production save.
Effective DOM widths 320 and 430 px were measured without horizontal overflow.
The compact shop goal, skills access, upgrade conditions and English copy were
checked. Vibration-off was verified in settings; reduced-motion behavior is
covered by source/regression tests, not a claimed physical-device observation.

Actual cash purchase of one Tam Altın and six 10 g bangles, then the player's two
negotiation rights, produced a real 240,101 TL sale and 2,563 TL realized profit.
The first counteroffer would have lost money and was not accepted. Day 1 closed
with the real 900 TL daily expense; 974,011 TL cash, XP 55 and mastery 1/5 survived
day 2 and reload. The returning customer's prior bangle purchase was shown from
an applied transaction, not a generated story. The day report preserved detailed
accounting and correctly identified Tuesday as the following day. Browser error
logs were empty at the final shop/English check. Native ads are not simulated by
the web smoke, and no physical iPhone 14 Pro performance result is claimed.

## External status

App Store 1.2.1 was already Ready for Distribution. A separate 1.3.0 draft was
created. The native upload, processed TestFlight build and completed App Review
submission were individually verified below. This version is not yet public.

### Native build dispatch

- Exact compiled source: `f2979a29341e6a9820da2dcb7ddc6c1757b15674`.
- iOS TestFlight workflow run `37116056125`, number 35, dispatched at
  `2026-10-03T10:19:54Z`, completed successfully. Archive, signed IPA export,
  validation/upload and signing-material cleanup all succeeded. Upload completion
  is verified separately from Apple processing and review submission.
- The existing signing certificate, provisioning profile, Game Center entitlement
  and publisher credentials are used; no access was expanded.
- Turkish What's New, promotional text and English review notes were saved in
  the separate 1.3.0 version. Existing screenshots, contact details, Game Center,
  earliest compatible version, ratings and automatic-after-approval release
  settings were retained. Only the existing Turkish store localization exists.

### Production web smoke

The built release was separately opened at `127.0.0.1:4181`, using a fresh
Release130 career. Profile setup, main shop and the talent modal passed. Effective
DOM widths were exactly 320/430 px, with matching document scroll widths. Final
shop error-level logs were empty. The temporary viewport was reset. This is a
local production-build smoke, not a web production deployment or physical-iOS test.
Screenshot: `C:/Users/Gaming/.codex/visualizations/2026/10/03/mihenk-1.3.0/shop-production-430.jpg`.

### Integrated-source calibration smoke

After the code commit, `node tools/progression130-simulation.mjs --seeds=32
--days=42 --visits=24 --modes=cash-counter --workers=4 --compact` exercised the
production cash-only policy with no candidate trust/gate adapter. All 96 cash,
nonnegative balance and unique-transaction checks passed; no day close failed.
32/32 reached tier 2 and 30/32 reached tier 3; no supplier invoice was created.
Source hashes remained unchanged during the run. This bounded integration smoke
confirms the selected cash-trust rules, not a guarantee of player progression.

### TestFlight

- Apple processed **1.3.0 (35)**, build ID
  `68b1e47c-3443-4800-844f-a2c66e26f5c0`.
- The existing **Betatest** internal group is linked with **three testers**;
  no group, tester, permission or recipient was added.
- Turkish What to Test was saved and the **Saved** control verified. It covers
  device touch, old saves, actual trades/mastery, supplier trust/invoices, upgrade
  cost, agenda routing, day-close/reload, staff/offline and Game Center.
- Evidence: `C:/Users/Gaming/.codex/visualizations/2026/10/03/mihenk-1.3.0/testflight-35.jpg`.
- The same build 35 was selected and saved to the App Store 1.3.0 version.
  App Review submission was verified separately below, not inferred from this link.

### App Review — submitted

- Final Submit for Review completed on **October 3, 2026 at 13:40 GMT+3**.
- The submission detail shows **Waiting for Review**, exactly one submitted item,
  **iOS App 1.3.0 / 1.3.0 (35)**. This is a completed submission, not a draft or
  merely Ready for Review.
- Submission ID: `376005a1-fe3e-4feb-9670-59a386d5d030`.
- App Store Connect record:
  `https://appstoreconnect.apple.com/apps/6808742428/distribution/reviewsubmissions/details/376005a1-fe3e-4feb-9670-59a386d5d030`.
- Evidence: `C:/Users/Gaming/.codex/visualizations/2026/10/03/mihenk-1.3.0/apple-1.3.0-waiting-review.jpg`.
- Automatic release after approval and immediate rollout remain selected. Apple
  review/approval and public availability are not claimed or guaranteed. No new
  agreement, contact disclosure, tester access or purchase was required.

### Handoff

The code, native package, saved store/beta notes and release evidence are complete.
Existing internal testers can exercise build 35; no claim is made that those people
have already tested it. Physical-iPhone touch/performance remains a beta check.
Temporary local QA servers and tabs were closed; only the Apple result and beta
detail tabs were retained for the publisher.

### Superseding build 36 follow-up

Build 35 and its review record above are historical. On 2026-10-03 at 15:35 GMT+3,
the square store tile and Dynamic Island safe-area follow-up were uploaded as
**1.3.0 (36)**, made available to the same internal Betatest group, and submitted
as replacement review `55c47bfc-e0c6-4439-93ad-fb56f631d9de`, **Waiting for Review**.
No tester or access was added. The old build was not deleted. See
[build 36 delivery record](SAFE_AREA_BUILD_36_2026-10-03.md) for source SHA,
verification limits, CI result, saved notes and the new confirmation screenshot.
