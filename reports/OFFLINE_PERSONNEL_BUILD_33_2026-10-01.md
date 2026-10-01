# Mihenk 1.2.0 (33) — signed offline-personnel release

## Scope and source

The publisher requested a fresh TestFlight build, withdrawal of the existing
1.2.0 (31) App Review submission, replacement with the completed personnel,
skill-tree and offline safe-sales work, and prompt release after approval.
Additional speculative personnel ideas remain deferred.

- App Store app: `6808742428` / `com.mihenkaynak.app`.
- Marketing version / build: **1.2.0 (33)**.
- Source: `65b0e56d9b13946ff74aba455bac3345f8d0ed5f`.
- Branch: `codex/mihenk-personnel-home`.
- Fresh workflow dispatch, not a rerun with a duplicate build number.
- Workflow: https://github.com/ouzhaanttnn-afk/Mihenkson/actions/runs/36843659222

## Signed native evidence

GitHub macOS job `110308579328` completed successfully. Sanitized log evidence:

| Marker | UTC, 2026-10-01 | Istanbul (UTC+3) |
| --- | --- | --- |
| `ARCHIVE SUCCEEDED` | 09:40:03.625 | 12:40:03.625 |
| `EXPORT SUCCEEDED` | 09:40:10.966 | 12:40:10.966 |
| `VERIFY SUCCEEDED with no errors` | 09:41:50.939 | 12:41:50.939 |
| `UPLOAD SUCCEEDED with no errors` | 09:43:13.985 | 12:43:13.985 |

Job completion: 09:43:22 UTC. Apple delivery UUID:
`f14f62fb-2ab3-43b0-aa63-7f139b38534d`.

The workflow repeats the full automated test/release gates, web build, native
sync, Game Center-enabled signing, Swift resolution, archive, export, validation
and upload. Prior local verification: 1,425 Vitest tests + 5 release tests,
TypeScript, production build, 81 release checks and localization pass. A separate
read-only pre-release check also passed all 30 offline tests, TypeScript and the
81 release checks. Browser tests are not physical iPhone lifecycle testing.

## Apple state

- Build 33 was visibly received by App Store Connect at **12:43 TRT**. Processing
  completed; the upload is **Complete**, and the build is **Ready to Submit**
  with the existing **Betatest internal group / 3 testers** attached.
- Build-specific Turkish **What to Test** was saved, including save migration,
  Personnel/Skill Tree access, real 15-minute background return, stock/cost/wage
  reporting, duplicate-payment checks and the main gold/Game Center flows.
- Existing 1.2.0 (31) submission `f89083de-7225-431f-9350-546e96d05ff1`
  was **Waiting for Review** at the start. **Cancel Submission** was confirmed;
  the version became **Developer Rejected** and editable. This is publisher
  withdrawal, not an Apple review rejection. The old build was detached from
  the version only, not expired/deleted from TestFlight.
- Public 1.1.3 remains unchanged until the new version is approved/released.
- Replacement Turkish What's New and English review notes were saved and accurately
  describe direct Personnel/Skill Tree access and the bounded offline shift.
  The obsolete claim that staff never sell offline was replaced.
- **1.2.0 (33)** was selected/saved; Game Center remains enabled and existing
  screenshots/contact/privacy/IAP settings were preserved.
- Release preference was saved as **Automatically release this version**, with
  **Release update to all users immediately** and existing ratings preserved.
- **Submit for Review** completed at **12:55 TRT / 09:55 UTC, 2026-10-01**.
  Apple confirmed **1 Item Submitted**. The new submission visibly lists
  **1.2.0 (33) — Waiting for Review**.
- Submission: https://appstoreconnect.apple.com/apps/6808742428/distribution/reviewsubmissions/details/9659beef-c2c9-438b-b4b1-e1c0a231649d
- The binary is not yet publicly released. Apple review/release timing cannot
  be guaranteed for tonight. No further manual release action is planned under
  the saved automatic-release preference.

Saved browser proof (local artifact folder
`C:/Users/Gaming/.codex/visualizations/2026/10/01/mihenk-build-33`):
`testflight-33.jpg` and `apple-review-33.jpg`. These show the actual TestFlight
group and Apple review result, not a simulated screen. Physical device playback
of build 33 has not been performed by the assistant.

## Offline behavior in this binary

See `OFFLINE_PERSONNEL_2026-10-01.md` for the complete contract and tests. This is
return-time catch-up, not uninterrupted background CPU. Safe-sales staff attempt
one regular demand per 15 real minutes, capped at 16 attempts/four hours. Actual
stock, full orders, buyer acceptance and minimum recorded-cost margin apply;
sales are not guaranteed. Verified persistence precedes economic application.
The report separates proceeds, stock cost, profit, actual expenses and pending
daily wages. No offline day/market/debt/workshop/XP/mastery progression occurs.
