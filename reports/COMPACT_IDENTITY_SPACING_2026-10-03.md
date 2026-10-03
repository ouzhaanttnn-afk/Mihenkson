# Compact home identity spacing

## Change

User requested correcting the excessive horizontal gap while keeping scrolling minimal. The production change is only `justify-content: flex-start` on BusinessIdentity. The existing 8 px gap, 88 px tile, wrapping, touch targets, callbacks and safe areas remain unchanged. No new text, row, economy or progression change was introduced.

## Verification

- `npm test`: 1,643 Vitest tests in 107 suites and 5 release-preparation tests passed.
- `npm run build`: typecheck and production build passed. Existing >500 kB chunk advisory remains. This repo has no lint script.
- Regression contract pins start alignment and the 8 px gap, rejects row height/margin additions and an auto margin that would push skills to the far edge.
- Controlled fixture at actual CSS viewport widths 320, 390 and 430: all four store stages keep both controls on one row; height 87.99 px, gap 7.99 px, no horizontal overflow. Browser zoom was left unchanged; viewport dimensions were adjusted to verify actual CSS pixels.
- At 320 px with 200% root text, both Turkish and English labels remain readable without clipping or horizontal overflow. Existing accessibility height growth is preserved rather than shrinking or hiding text. Collapsed identities have no interactive actions.
- Real App at 390×844: 87.99 px identity row and 7.99 px gap. Store tile opens compact tasks, skills opens the talent dialog, close/return work; no console errors. CSS alignment adds no vertical height or scrolling.
- Screenshot: `C:/Users/Gaming/.codex/visualizations/2026/10/03/mihenk-1.3.0/compact-home-skills-spacing.png`.
- Browser verification guidance was used for the real navigation and responsive checks. Temporary viewport overrides were reset and test tabs closed.

## Delivery

Local production build verified. This change is not in the previously uploaded TestFlight 1.3.0 (37); no new Apple upload or review submission was performed in this package.
