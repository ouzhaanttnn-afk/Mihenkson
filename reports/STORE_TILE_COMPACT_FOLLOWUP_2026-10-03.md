# Mihenk — smaller store identity follow-up

## Requested change

The build 36 square tile was still too tall in the user's screenshot. The user
also asked what follows Semt Kuyumcusu and how store progression works.

- Store tile reduced from 112 to 88 px; artwork and missing-image fallback are
  28 px. Row padding removed, reducing the normal row from 120 to 88 px.
- A 72 px trial split the Turkish word Kuyumcusu and was rejected after rendered
  verification. 88 px retains the full Turkish name on two lines.
- No new main-screen explanations, requirements list or progression mechanics.
  Existing Store and Talents actions remain separate and working.
- Font size, accessibility height growth, focus, reduced motion and safe-area
  header behavior are preserved. No economy, save, personnel or ad changes.

## Existing progression, confirmed from source and real Store UI

Semt Kuyumcusu → Cadde Mağazası → AVM / Premium Butik → Şehir Flagship.
Marka Ağı is defined but unavailable; it is not promised as an active stage.

Cadde requires all gates at once: level 3, net worth 600,000 TL, reputation 52,
supplier trust 58, 18 closed positive-price transactions, six known customers and
220,000 TL cash investment. The player must explicitly purchase the upgrade;
meeting the conditions does not auto-upgrade the shop.

Cadde grants display 8→14, back stock 16→28, workshop 2→3 and per-transaction
product-line limit 2→3. It unlocks necklace/set/gem-ring families; collector
customer eligibility additionally requires reputation 55. Daily store overhead
rises from 900 to 1,800 TL. No thresholds were changed by this follow-up.

Canonical sources: `src/data/store-tiers.ts`, `src/domain/store-growth.ts`;
navigation: `src/ui/screens/BusinessStoryPanel.tsx`, `BusinessScreen.tsx`.

## Verification

- `npm test`: 106 Vitest files / 1,619 tests plus five preparation tests passed.
- `npm run typecheck`, `npm run build`: passed. Existing bundle-size warning
  remains. There is no lint script in this repository.
- `npm run release:check`: 82 checks passed.
- `npm run i18n`: 1,161 active keys, none missing.
- `git diff --check`: passed.
- Actual full-app dev fixture, native iOS simulated 59 px safe top: effective
  CSS 320×568, 390×844 and 430×932. Tile and row measured 87.986 px; label
  contained, document width equal to viewport, no horizontal overflow.
- Exercised actual tile→Store and Talents→dialog navigation using the local
  Beta130 QA career. No upgrade purchased; no production save accessed.
- All four tier labels in Turkish and English measured square at normal text.
  At 200% label size, tiles grew vertically (133–196 px) to preserve text;
  labels stayed inside and the 320 px document did not overflow.
- Browser error logs empty. No physical iPhone/WKWebView claim is made.
- Screenshot: `C:/Users/Gaming/.codex/visualizations/2026/10/03/mihenk-1.3.0/compact-store-88.png`.
- Browser verification skill guided the live rendering/navigation/error checks.
  Temporary viewport reset and own QA tabs/server closed after verification.

## Delivery boundary

This is a local source follow-up, not a newly uploaded native build. The build 36
record remains accurate for its 112 px tile. No App Store Connect action, review
withdrawal, TestFlight replacement or publication was performed for this change.
