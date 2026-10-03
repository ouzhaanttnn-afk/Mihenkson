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

## Redesign after user rejected the adjacent-square layout

The user rejected the screenshot of the first spacing correction. Merely moving the talents button beside the square was not an acceptable visual result. That presentation is superseded by a slim shared rail:

- One outer surface and border, two sibling controls with a subtle divider. A 36 px square icon sits beside the stage name; talents is the distinct right action. No new captions, tasks or gameplay.
- Both controls retain a 44 px minimum hit target. Text wraps rather than clipping. Talents width is capped at `max(104px, 34%)` to preserve room for long stage names at larger text sizes.
- All four Turkish stages at actual 320/390/430 CSS px widths: 54.20 px normal row height, with tier 3 reaching 55.97 px at 320. Normal English at 320 also remains within 54.20–55.97 px. No horizontal overflow or clipped text. Relative to the rejected 87.99 px row, this saves roughly 32–34 px.
- At 320 with 200% root text, final English rows remain within 93.78–131.58 px and Turkish within 131.58 px, without clipping or horizontal overflow. Accessibility height growth is intentional. Collapsed identities still have no interactive actions.
- Actual App at 390×844 with simulated iOS 59 px top and 34 px bottom safe areas: row is 54.20 px; talents dialog, store tasks and return navigation work; no console errors. The existing idle stack still has 38 px of scrolling in this fixture, so this is not a claim that the entire home page is scroll-free. No unrelated header, tool-rail or ad placement changed.
- Final `npm test`: 1,643 tests in 107 Vitest suites plus 5 release-preparation tests passed. Final production build/typecheck passed, with only the existing chunk advisory. React guidance preserved separate accessible buttons, stateless presentation and existing callbacks.
- Final screenshot: `C:/Users/Gaming/.codex/visualizations/2026/10/03/mihenk-1.3.0/slim-home-store-talents.png`. Viewport override reset, temporary test tabs closed.
- This redesign is source/local-build complete, not yet uploaded to TestFlight and not submitted to Apple review.
