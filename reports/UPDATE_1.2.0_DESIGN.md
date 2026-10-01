# Mihenk 1.2.0 — owner-approved update contract

Approved by the publisher on 2026-10-01. This scoped revision supersedes the
older UI-only remaster freeze for the feedback in FEEDBACK_UPDATE_PLAN_2026-09-30.md.
TradeUp design rules do not apply to this separate game.

- Restore Tam Altın and bulk-only small ingot availability; retain denomination
  pooling and real costs. Never pool flawed, wrong-purity or special stone pieces.
- Retire new tradable silver. Refund legacy owned silver once at the greater of
  its recorded cost and saved current value, as an explicit migration credit,
  not realized trading profit. Historical objects and existing service jobs stay
  readable. Never delete gold or clamp overflow by destroying ownership.
- Every stock intake validates projected canonical positions before cash/debt
  changes. Legacy overflow may decrease or stay flat, never worsen.
- Personnel keep existing salaries/unlocks. Roles are idle, reception, sales,
  workshop. Foreground counter tasks run once per 90 active real seconds, not on
  paused screens or catch-up bursts. Automatic sales use only exact full-stock
  requests, normal negotiation acceptance and at least 1% recorded-cost margin.
  No automatic purchases, debt or guaranteed sales. Default old hires to idle.
- Additional publisher approval on 2026-10-01: safe-sales personnel can run a
  bounded offline shift, calculated on return, without continuous background CPU.
  Explicitly save the departure session; never use generic save timestamps.
  One regular customer attempt per 15 real minutes, at most 16 over four hours,
  independent of worker count or game speed. Use a separate deterministic spawn
  chain and preserve the player's live queue. No forced buyer/guaranteed acceptance.
  Use actual full-stock sales and the existing margin/settlement contract.
  Do not advance the day, market, debt, workshop, XP or mastery. Day-close wages
  remain once per game day; report any pending wages separately, not as cash paid.
  Skip shifts around active customers, recall, tutorials, closed shops/day close
  or rewarded ads. Unread reports block another shift (no report overwrite).
  Missing/invalid anchors and clock rollback grant nothing. Consume excess time
  once, with no carryover. Manual load discards old departure anchors. A verified
  save must precede economic application; acknowledgment only closes the report.
  Failed shift saves offer retry or a verified smaller save that skips the shift
  without sales. Never simply dismiss an unresolved redeemable session.
- Workshop personnel apply only to new quoted/accepted jobs; outcome is fixed
  at acceptance. One available worker is assigned; previous outcomes never reroll.
- Mature shops (tier 3+, reputation 65+, supplier trust 65+) may receive large
  gram-gold orders up to 1kg, constrained by existing cash/credit affordability.
  Fulfilment uses the real wholesale route, including its costs and capacity.
- Shop tier/reputation traffic bonuses remain. In-game shop/decoration/collection
  ownership contributes a bounded presentation bonus (maximum +12% traffic),
  never double-stacked per item. Real-money cosmetics remain cosmetic-only.
- Preserve current negotiation difficulty and allowances; correct direction,
  fixed-final-offer and buyer-budget inconsistencies. Historical cost is not a
  promise that a customer must accept the player's price.
- Version 1.2.0 is authorized for signed iOS upload and Apple App Review submission.
  Run full tests, typecheck, production build and release checks before upload.
