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

Pending at the time of this source commit. Upload, Apple processing, tester
access and review submission are separate verification steps.
