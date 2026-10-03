# Compact store tile — 2026-10-03

## Scope

The user's request was to make the Semt Kuyumcusu section a simple, attractive square.

- Replaced the full-width identity/goal text panel with a 112 × 112 px purple-and-gold tile in normal text size.
- Kept only the bundled store artwork and the current store name inside the tile; reused an existing asset without adding image weight.
- Tile opens the existing Store screen. The adjacent Yetenekler button independently opens the existing talent dialog.
- Upgrade conditions remain on the Store screen. Store progression, personnel, saves, economy and monetization are unchanged.
- Missing-art fallback, keyboard focus, touch targets, translation and reduced-motion behavior remain supported.
- Large accessibility text may increase tile height instead of clipping the name.

## Verification

- `npm test`: 106 Vitest files / 1,618 tests passed; 5 release-preparation tests passed.
- `npm run typecheck`: passed.
- `npm run build`: passed; existing large-chunk warning remains.
- `npm run release:check`: 82 checks passed.
- `npm run i18n`: 1,161 active keys, no missing keys.
- `git diff --check`: passed.
- Live Chrome checks at effective CSS widths 320 and 430 px: no horizontal overflow; normal tile measured approximately 112 × 112 px.
- Both Store navigation and Yetenekler dialog were exercised through the real game UI using the local Beta130 QA career. No upgrade was purchased.
- All four store names checked in Turkish and English. At 200% label size, text stayed inside the tile; at 320 px, page scroll width remained 320 px.
- Browser error logs: none during the checks.

Reproducible development-only fixture: `tools/ui-qa/square-store-card.html`. It is not imported by the production entry and is absent from `dist`.

Screenshot: `C:/Users/Gaming/.codex/visualizations/2026/10/03/mihenk-1.3.0/square-store-card.jpg`.

## Release boundary

At commit `8a93a19`, this was a local source/UI change, not a new signed native upload. The previously submitted 1.3.0 build 35 had not been replaced or withdrawn. No App Store Connect actions had been taken for this change.

The Dynamic Island safe-area issue was separate and was not changed in that commit. Browser checks do not certify a physical iPhone cutout layout.

Later follow-up: both this tile and the safe-area fix were compiled from
`d91c7cb96064c6bf5844347d8ab79b865413e7d5` into **1.3.0 (36)**, uploaded successfully
on 2026-10-03. See [safe-area and build 36 delivery record](SAFE_AREA_BUILD_36_2026-10-03.md)
for the separately verified Apple processing, tester availability and review status.
