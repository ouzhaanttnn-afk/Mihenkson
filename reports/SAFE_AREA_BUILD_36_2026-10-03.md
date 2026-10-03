# Mihenk 1.3.0 — safe-area and store tile follow-up

## Changes

The native iOS zero top inset and fixed 76 px / 26 px cutout offsets were removed.
The existing header now consumes the actual `--safe-top` once through its height
and top padding, painting its background to the screen edge. Native clock/speed
grouping remains compact even above the 430 px breakpoint. WKWebView inset,
status-bar policy, bottom inset, saves and economy are unchanged.

This package also contains the square store tile from commit `8a93a19`.
No version increment: the marketing version remains 1.3.0; CI assigns a fresh
build number. A new upload does not by itself replace the review build.

Reference: [WebKit safe-area guidance](https://webkit.org/blog/7929/designing-websites-for-iphone-x/).

## Verification

- 106 Vitest files / 1,618 tests plus five release-preparation tests passed.
- Typecheck, production build and 82 release checks passed.
- 1,161 active translation keys; none missing.
- Independent read-only review: no blocker; 33 responsive/readiness tests passed.
- Full-app dev fixture: `tools/ui-qa/safe-area.html?inset=59&native=ios`.
  Fixture is not imported by the production entry and adds no production query flags.
- Measured DOM widths 320/390/430/431/440 with top insets 0/20/44/59/62;
  all 25 native and 25 web cases kept profile, clock and speed inside the header
  below the safe inset, with no horizontal document overflow. Native header
  height matched status-strip content height + inset (within 0.1 px).
- The existing local Beta130 QA career, not a production save, exercised stock
  procurement for a 40 g customer and the actual negotiation route. At 390×844
  with 59 px inset the workbench measured 235 px and all offer/decision controls
  remained visible. At synthetic 320×568 with 59 px inset all price and decision
  controls stayed visible, but the workbench body had no spare height; this
  stress configuration is not claimed as a physical Dynamic Island device.
- Browser error logs were empty during the matrix check.
- Evidence: `C:/Users/Gaming/.codex/visualizations/2026/10/03/mihenk-1.3.0/safe-area-390.jpg`
  and `safe-area-negotiate-390.jpg` in the same directory.

This verifies the actual rendered CSS with simulated insets, not a physical
iPhone or the WKWebView's device-reported env value. The real-device check remains
part of TestFlight verification. Existing large-bundle warning remains.

## External delivery

Exact compiled source: `d91c7cb96064c6bf5844347d8ab79b865413e7d5`.
The existing iOS workflow run `37122266871`, number 36, completed successfully
on 2026-10-03. Archive, signed IPA export, validation/upload and signing cleanup
all completed successfully. No credential or tester access was expanded.

Apple received **1.3.0 (36)**, build ID
`de66c81c-8d40-4f8c-bece-9c2522e6e9ca`, and initially showed **Processing**.
Apple completed processing. **1.3.0 (36)** is available to the existing
**Betatest** internal group with **three testers**; no new recipient or access
was added. Turkish What to Test was saved and the **Saved** control verified.
Evidence: `C:/Users/Gaming/.codex/visualizations/2026/10/03/mihenk-1.3.0/testflight-36.jpg`.

The old build 35 review was removed to allow replacement. Build 36 and corrected
Turkish What's New / English review notes were selected, saved and read back from
Apple. Existing screenshots, contacts, Game Center, earliest compatibility 1.1.0,
ratings, automatic-after-approval release and immediate rollout were retained.

Final **Submit for Review** completed on **October 3, 2026 at 15:35 GMT+3**.
The submission detail explicitly shows **Waiting for Review**, one submitted
item, **iOS App 1.3.0 / 1.3.0 (36)**. This supersedes the earlier build 35
submission `376005a1-fe3e-4feb-9670-59a386d5d030`, without deleting that build.

- New submission ID: `55c47bfc-e0c6-4439-93ad-fb56f631d9de`.
- [Apple submission](https://appstoreconnect.apple.com/apps/6808742428/distribution/reviewsubmissions/details/55c47bfc-e0c6-4439-93ad-fb56f631d9de).
- [CI run 36](https://github.com/ouzhaanttnn-afk/Mihenkson/actions/runs/37122266871).
- Evidence: `C:/Users/Gaming/.codex/visualizations/2026/10/03/mihenk-1.3.0/apple-build-36-waiting-review.jpg`.

This is submitted, not Apple-approved or publicly released. Automatic release
after approval remains selected. Physical Dynamic Island/WKWebView verification
is still the tester follow-up; no physical-device result is inferred from upload.
The local QA server/tab were closed and the temporary viewport reset. Only the
Apple result and new beta detail tabs were retained for the publisher.
