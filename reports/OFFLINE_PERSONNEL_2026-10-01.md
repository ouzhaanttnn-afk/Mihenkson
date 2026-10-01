# Mihenk 1.2.0 — offline safe-sales shift

Publisher-approved implementation on 2026-10-01, on `codex/mihenk-personnel-home`.
This changes Mihenk only, not TradeUp. The scoped product amendment is recorded
in UPDATE_1.2.0_DESIGN.md.

## What works

- Assigned safe-sales personnel attempt normal customer demand every 15 real
  offline minutes, capped at 16 attempts / four hours. Headcount and speed do not
  multiply attempts. No successful sale is guaranteed.
- Sales use existing `personnelSale`: exact full-stock orders, normal acceptance,
  real book cost and at least 1% cost margin. No purchases, credit or fake stock.
- The browser/native departure event saves an explicit session. On return or
  cold boot the pure bounded calculation verifies persistence BEFORE changing
  cash, stock or the journal. It never executes an offline game-day tick.
- Duplicate lifecycle events/reload do not redeem a consumed session. Dedicated
  sequence, transaction IDs and a monotonic wall-clock high-water mark protect
  replay and rollback. Excess time is discarded, not carried into another shift.
- A failed save freezes the observed return endpoint in the persisted session,
  including when a later generic save succeeds. Retry cannot count time spent
  foreground on the save-error dialog as a longer offline shift.
- Existing queue, active visits/negotiations, recall, day-close, workshops and
  debts are protected. No XP/mastery credit. Daily salaries remain at day-close;
  the report labels pending wages separately from expenses actually deducted.
- The return report shows attempts/sales, proceeds, sold-stock cost, trade profit,
  actual expenses and cash change. Acknowledgment only closes a verified report;
  it does not grant money. Unread reports block another departure session.
- Save failures offer retry or a verified smaller cursor-only save that skips the
  shift without sales. If neither save can be verified, the error stays visible.
- Legacy/unarmed saves grant no inferred earnings. Manual load clears/reanchors
  old departure sessions; reset disables arming. Only the current clock/report
  are stored, not an accumulating archive of shifts.

## Verification

- `npm test`: 1,425 Vitest tests in 97 files + 5 Node release-preparation tests pass.
- New domain, lifecycle/persistence and report coverage: 30 tests, including
  replay/reload, interval cap, rollback/invalid clock, stock/margin, no worker
  multiplier, active-flow protection, salary waiver/day-close, save/ack failure,
  frozen failed-return endpoint, safe skip, migration and manual load/reset.
- `npm run typecheck`: passes, including development fixtures.
- `npm run build`: passes. Existing large-bundle warning remains; no claim of a
  signed native build. Development fixture HTML is absent from `dist`.
- `npm run release:check`: 81 checks pass.
- `npm run i18n`: 1,109 keys translated, none missing.
- `npm run i18n:audit`: passes unchanged reviewed baseline of 73 literals.
- Actual browser clicks on a disposable local fixture: normal four-hour return,
  acknowledgment, keyboard Tab trap/Escape, save failure with unchanged cash,
  successful retry and successful skip. Synthetic fixture values are NOT a
  prediction of player earnings.
- At actual 320 CSS px × 700 px: no horizontal overflow; dialog stays within the
  viewport, internal scroll works, footer remains visible. Verified Turkish
  100% and English 200% text. Browser console contains no errors/warnings in the
  fixture. The real app entry renders normally and respects its HTML day-close
  dialog. Native iOS/Android lifecycle behavior has not been tested on a device.
- Screenshot capture timed out twice through the browser API. Layout evidence is
  DOM measurements and interactions, not a saved pixel screenshot.
- React review checked stable lifecycle cleanup, modal priority, actual action
  wiring and inline errors. Read-only parallel audits found the failed-return
  endpoint and failed-load locale ordering issues; both were corrected and tested.

## Limits and release status

- This is bounded catch-up, not continuous iOS/Android background execution.
  A departure must be saved successfully; an abrupt process kill before any
  departure callback cannot create retroactive earnings.
- Device time is local. Rollback grants nothing and forward jumps are capped,
  but edited saves/system time cannot be made tamper-proof without trusted time.
- Game day, market and service progress stay frozen. No offline salary accrual
  separate from existing day-close wages. Missing stock or refused offers can
  produce zero sales, honestly reported.
- Permanent storage failure still needs storage recovery: neither a reward nor
  an unverified dismissal is applied. The smaller skip-save can help when extra
  journal/report space, rather than all storage, is the limiting factor.
- The previous signed TestFlight upload is **1.2.0 (32)** and does NOT contain
  this addition. A new signed native build is required. No TestFlight upload,
  App Review replacement or public release was performed for this work block.
