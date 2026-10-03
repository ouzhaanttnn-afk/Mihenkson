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

## Approved rail — minor vertical thinning

The user approved the shared rail and requested only a slight top/bottom reduction before TestFlight. Outer and inner block padding changed from 4 to 2 px; horizontal spacing, art, typography, divider and both callbacks are unchanged. The collapsed rail uses the same padding. Both controls retain the 44 px minimum; no fixed height or clipping was introduced.

- `npm test`: 1,644 Vitest tests in 107 suites and 5 release-preparation tests passed. Production build/typecheck and all 82 `release:check` checks passed; existing chunk-size advisory remains. No lint script is present.
- All four Turkish stages at actual CSS viewport widths 320/390/430: 50.21 px rail, approximately 44 px controls, no horizontal overflow or clipped text. Normal English at 320 also stays at 50.21 px.
- 200% root text at 320: Turkish rows 123.59 px, English 85.80–123.59 px, no overflow or clipped text. Collapsed identities have no interactive controls.
- Real App at 390×844 with simulated iOS 59/34 px safe areas: 50.21 px rail and 44 px controls. Talents open/close, store tasks and home return work; no console errors. No other home spacing, safe areas, economy or ads changed.
- Screenshot: `C:/Users/Gaming/.codex/visualizations/2026/10/03/mihenk-1.3.0/thin-home-store-talents.png`. Temporary viewport override reset and QA tabs closed.
- New TestFlight upload authorized. App Review remains on hold until the user explicitly says okay; this is not authorization to cancel or replace an older review submission.

## TestFlight 1.3.0 (38) delivery

- Source: `a41c53ce8b126bdfc6cf69b37e3a5b86b7dd855f`, branch `codex/mihenk-personnel-home`. Includes the approved slim shared rail and compact store tasks.
- CI: https://github.com/ouzhaanttnn-afk/Mihenkson/actions/runs/37135095845 — success, 5m34s. All 1,644 Vitest tests and release checks also passed on the macOS runner.
- Apple validation: 2026-10-03 16:02:12 UTC. Upload: 16:03:27 UTC (19:03:27 Istanbul), `UPLOAD SUCCEEDED with no errors`.
- Delivery UUID: `07c24663-4518-4609-b063-65f4061a2b99`.
- Apple processing completed. iOS Builds shows build 38 as Ready to Submit (external beta status, not an App Review submission). Build detail verifies the existing Betatest internal group with 3 testers attached; its automatic Xcode-build distribution setting was preserved.
- Turkish What to Test notes were saved; Apple's disabled Saved button was verified. Proof: `C:/Users/Gaming/.codex/visualizations/2026/10/03/mihenk-1.3.0/testflight-38-ready.png`. Build detail was left open for the user.
- App Review was not submitted, replaced or cancelled. The user must explicitly approve the new build before any review submission.

## App Review 1.3.0 (38) submission

- The user's subsequent "Yükle baba" approved submitting the delivered build 38. This approval supersedes the earlier App Review hold above.
- The prior pending 1.3.0 (36) submission (`55c47bfc-e0c6-4439-93ad-fb56f631d9de`) was cancelled to replace its selected build. Apple's intermediate Developer Rejected status resulted from that developer cancellation, not a new Apple rejection.
- App Store Connect now selects 1.3.0 (38), UUID `07c24663-4518-4609-b063-65f4061a2b99`, built from `a41c53ce8b126bdfc6cf69b37e3a5b86b7dd855f`. No new source changes or binary upload were needed.
- Turkish What's New and English reviewer notes were updated to describe the slim shared store/Talents rail and six career tasks plus a separate investment gate accurately. Only Turkish is localized in the current product metadata; no localization was added.
- Submitted 2026-10-03 at 19:42 Istanbul (16:42 UTC). Submission ID: `89b9cbf0-bfa5-4507-a104-56ac40a01e37`.
- Apple showed "1 Item Submitted"; the submission detail then explicitly showed `1.3.0 (38)` and **Waiting for Review**. This is an actual App Review submission, not only Ready for Review or a TestFlight status.
- Existing automatic release after approval, immediate release to all users, existing rating, Game Center association and other metadata were preserved. The version is not live yet; publication depends on Apple's approval.
- Proof: `C:/Users/Gaming/.codex/visualizations/2026/10/03/mihenk-1.3.0/app-review-38-submitted.png`. The submitted review detail was left open for the user.
