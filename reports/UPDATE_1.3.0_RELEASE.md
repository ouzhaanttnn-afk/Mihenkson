# Mihenk 1.3.0 — Yaşayan Dükkân release record

## Approved scope (2026-10-03)

One update connects the existing store growth, mastery, actual returning customers,
market calendar, payment/delivery agenda and day report. It does not add quests,
currencies, IAP products, ad placements, automatic buying or borrowing. Existing
device saves and staff/offline behavior are preserved. See `UPDATE_1.3.0_DESIGN.md`
and `PROGRESSION_1.3.0_CALIBRATION.md` for the explicit measured design revision.

Meaningful canonical cash and financed pool purchases now earn the same existing
capped supplier-trust increment. Store trust gates are 58/62/65; XP, personnel and
store-level gates remain 3/6/10. Other investment and upgrade conditions remain.

## Local verification

- `npm test`: 106 Vitest files / 1,616 tests and five release preparation tests.
- `npm run typecheck`, `npm run build`, `npm run release:check`: passed; 82 checks.
- `npm run i18n`: 1,162 active keys, no missing translations. The syntactic audit
  retains its 73 reviewed baseline findings; no new untranslated UI is accepted.
- No lint script is defined in this repository.
- Production main JS: 779.20 kB / 256.44 kB gzip; CSS: 163.48 / 28.46 kB. The
  existing large-chunk warning remains; this is not a physical-device FPS claim.
- Independent final bounded audit: 130 focused tests, no open P0/P1/P2 finding.
- Simulation: 6,000 actual-engine careers, 1,000 common seeds, 18,000 invariant
  checks and 48 deterministic replays. This is not a human-retention measurement.

## Browser evidence

Dedicated `127.0.0.1:4180` QA career Beta130, not the publisher's production save.
Effective DOM widths 320 and 430 px were measured without horizontal overflow.
The compact shop goal, skills access, upgrade conditions and English copy were
checked. Vibration-off was verified in settings; reduced-motion behavior is
covered by source/regression tests, not a claimed physical-device observation.

Actual cash purchase of one Tam Altın and six 10 g bangles, then the player's two
negotiation rights, produced a real 240,101 TL sale and 2,563 TL realized profit.
The first counteroffer would have lost money and was not accepted. Day 1 closed
with the real 900 TL daily expense; 974,011 TL cash, XP 55 and mastery 1/5 survived
day 2 and reload. The returning customer's prior bangle purchase was shown from
an applied transaction, not a generated story. The day report preserved detailed
accounting and correctly identified Tuesday as the following day. Browser error
logs were empty at the final shop/English check. Native ads are not simulated by
the web smoke, and no physical iPhone 14 Pro performance result is claimed.

## External status

App Store 1.2.1 was already Ready for Distribution. A separate 1.3.0 draft was
created. The native upload, TestFlight availability and completed review submission
must be recorded below only after each external state is actually verified.
