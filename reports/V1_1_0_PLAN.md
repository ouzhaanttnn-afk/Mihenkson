# Mihenk 1.1.0 implementation map

Initial base: `58ef2cb` on `mihenk-classic-update`. Work is isolated on `mihenk-v1.1.0`. Integration update: merged current production/TestFlight 1.0.3 (21), verified successful workflow commit `8ec41bb`, to preserve Premium/AdMob/icon and gameplay fixes from main. Main and classic branch tips remain unchanged.

- React/Vite/Capacitor 8, Zustand `src/state/gameStore.ts`; domain functions own pricing/settlement. Keep these formulas.
- Save v3 in `src/state/save.ts` persists economy, RNG, active deals and queue. Extend optional fields/default normalization; never clear saves.
- Time: game minutes, central `clockPauseReason`, speed multiplier already drives market and arrivals. Preserve active decision pause.
- Ads: `src/ui/ads.ts`, native AdMob via Swift packages; real production IDs already configured. Add exclusive presentation, cooldown, consent retry, callback coverage. No runtime device proof yet.
- Recall exists but reconstructs a new visit. Extend with original deal snapshot, stable visit identity and one retry; do not mint a new customer.
- Wealth: existing liquidation valuation includes inventory and HAS, but ranking must also account for network debts. Use current liquidation quotes where available.
- Game Center: absent. Apple recurring boards support fixed intervals up to 30 days, not calendar months. Use separately configured classic boards per real UTC calendar month (latest score, descending), explicit real ID mapping. No fake leaderboard IDs; no paid backend. This needs monthly App Store Connect administration; client-only scores cannot be cheat-proof.
- Audio: existing Web Audio SFX; no licensed background music asset. Extend audio module with separate loop gain and lifecycle. Asset config stays empty until a rights-cleared file is supplied.
- Haptics: web vibration only. Add native Capacitor Haptics and App lifecycle plugins.
- Theme: tokens exist, alongside literal CSS colors. Extend central tokens and replace literal surface palettes mechanically rather than redesigning components.
- Stock: shared wholesaler component has primary number inputs. Replace with reusable quantity steppers/manual opt-in.
- Classic negotiation has no preset cards or analysis accordion. Add presentation-only presets and an initially open per-session analysis accordion.

Baseline: 1068/1070 tests pass; two source-text tests assume LF but checkout uses CRLF. Normalize test input line endings.

Validation: targeted logic tests per package, full suite/build, browser walkthrough at 320/390/430px and light/dark. Native archive requires macOS; actual ads, Game Center and haptics require signed iPhone testing.
