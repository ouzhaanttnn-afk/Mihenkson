# Mihenk 1.2.1 — verification and release record

## Scope (2026-10-02)

Publisher approved one package: touch/render and save-performance improvements,
two eligible automatic ad slots per engaged session, and a shorter skill-tree UI.
No talent costs/effects/unlocks, economic outcomes, staff rules or history retention
were changed. See `UPDATE_1.2.1_DESIGN.md` for the explicit placement amendment.

## Verification before upload

- `npm test`: 1,531 tests in 101 Vitest files, plus five release-preparation tests.
- `npm run typecheck`, `npm run build`, `npm run release:check`: passed; 81/81
  readiness checks. No lint script exists in this project.
- `npm run i18n`: 1,125 active keys, zero missing translations.
- `npm run i18n:audit`: 73 reviewed baseline findings, no new unwrapped text.
- Production main JS: 757.40 kB / 248.97 kB gzip; CSS: 160.76 / 27.95 kB.
  The existing >500 kB chunk-size warning remains, not a build failure.
- Independent final audit: no critical findings; 212 focused tests passed.
- Browser production-preview smoke: profile setup, main shop, three skill branches,
  closed-by-default disclosures and protected modal navigation verified. Requested
  320 px Chrome viewport has an effective 355 px minimum on this setup; do not
  describe it as a physical 320 px-device measurement. Existing responsive tests
  cover 320–430 px contracts. No physical iPhone 14 Pro frame-time claim is made.

## Synthetic save benchmark

Same complete ledger/history fixture, Node 24 with in-memory localStorage, three
warmups and nine samples. Values are median milliseconds, not mobile FPS.

| History size | Identical checkpoint before/after | Changed checkpoint before/after |
|---|---:|---:|
| 1,000 transactions | 31.76 / 4.96 | 28.64 / 26.99 |
| 10,000 transactions | 336.81 / 41.26 | 392.78 / 177.91 |

At 10,000 transactions, redundant-checkpoint CPU time decreased 87.8%; changed
checkpoints decreased 54.7%. Lossless fast compression uses about 5.63% more encoded
storage in this fixture. All history and offline high-water marks remain intact.
Tests cover external storage corruption/deletion/replacement, failed writes,
in-place mutations, backup validation, preference/profile patches and reload.

## Advertising console evidence

Mihenk AdMob app `3768104554`: high-engagement ads setting saved OFF and verified
on 2026-10-02. Evidence:
`C:/Users/Gaming/.codex/visualizations/2026/10/02/mihenk-1.2.1/admob-short-ads.png`.
This is the standard-unit setting, not a guarantee of a specific creative duration
or availability and not a partner-bidding-unit override. The native SDK owns the
creative and close control; there is no app timer that forcibly closes an ad.

Both ad slots share an actual-presentation cap. The installed bridge's completed
full-screen dismissal is also proof of exposure if its start callback is missed,
so a lost start event cannot accidentally permit a third display. No fill, no
permission, unknown/Premium entitlement or failed presentation blocks neither
gameplay nor settlement. An issued native show request cannot be cancelled; an
extremely late SDK acknowledgement still needs real-device validation.

## Store copy

### Turkish What's New

1.2.1 — Daha akıcı, daha sade

• Dokunuşlar, ekran geçişleri ve uzun oyun geçmişlerinde kayıt performansı iyileştirildi.
• Yetenek Ağacı sadeleştirildi: kısa açıklamalar, tek etki cümlesi ve isteğe bağlı ayrıntılar.
• İşlem Defteri sayfalara ayrıldı; eski kayıtların tamamına erişebilirsin.
• Tamamlanan işlemler ve gün özeti sonrasında, uygun oturumlarda en fazla iki kısa reklam arası eklendi. Pazarlık ve önemli kararlar bölünmez; Premium reklamsız kalır.
• Mevcut ilerleme, personel ve yetenekler korunur.

### English review notes

No sign-in is required for gameplay. Game Center remains optional. Version 1.2.1
preserves existing device saves, all transactions, talent ranks and offline staff
watermarks. It improves foreground save CPU work, limits journal rendering to
50 accessible records per page, removes expensive native iOS fullscreen blur,
and simplifies the three-branch skill UI without changing effects or costs.

Automatic advertising replaces the old weekly interstitial with one shared cap of
two actual fullscreen presentations per session. The first slot requires five
active foreground real minutes and five unique accepted, settled and saved manual
customer-trade visits. The second requires twelve active minutes, five additional
manual visits after the first presentation and five active minutes between ads.
1x/2x/4x game speed does not accelerate these gates. Staff, offline, wholesale,
service and rejected visits do not count. Ads can only be attempted after closing
a saved successful visit or continuing a saved day report. Opening, onboarding,
negotiation and all decision dialogs are protected. Preload never presents an ad;
a short neutral transition prevents stray taps. Premium/unknown entitlement,
non-requestable UMP consent, background state, no ready creative or failure skips
the break. Existing rewarded choices and rewards are unchanged. Settings > Ad
privacy choices reopens Google UMP. High-engagement ads are disabled in the app's
AdMob standard-unit settings; the SDK provides the creative close control.

## External release status

Before this upload, Apple version 1.2.0 (33) was Ready for Distribution. A separate
1.2.1 version record is being prepared; do not call 1.2.1 uploaded/submitted/live
until its exact signed build and Apple review state have been verified below.
