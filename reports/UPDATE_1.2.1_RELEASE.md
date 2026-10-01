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
- Effective 430 px viewport: document scroll width 430 px, skill dialog 414 px;
  no horizontal overflow. All three disclosures default closed. Escape closes
  the skill sheet and returns focus to the main-shop shortcut. Empty journal
  navigation also verified. The temporary viewport was reset afterward.
- Browser day-close smoke used a dedicated local QA save: day 1 closed with the
  expected 900 TL expense; day 2 and 999,100 TL cash survived report continuation
  and reload, with no console errors/warnings. Web correctly did not simulate
  a native ad or an ad reward.

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

The existing 1.2.0 personnel and offline report features are retained. Safe-sales
staff use existing stock only and do not buy or borrow. Offline shifts are
calculated on return, not through continuous background execution, with at most
16 normal demand attempts in four hours. Sales are not guaranteed. Daily salaries
remain charged at game-day close. Reports separate proceeds, sold-stock cost,
profit, actual expenses and pending daily wages. Verified persistence precedes
applying economic results. No new advertising data category or IAP product was
introduced. Progress remains stored only on the device.

## External release status

Before this upload, Apple version 1.2.0 (33) was Ready for Distribution. A separate
1.2.1 version record was created, Turkish What's New and the updated English
review notes saved, with automatic release after approval selected. Existing
screenshots, contact information, Game Center and ratings were preserved.

### Native upload

- Version: **1.2.1 (34)**.
- Exact source: `caa864d8bb830a9cdd8fc7830efa9a05b5be06e9`.
- GitHub Actions run: `36939527944`, workflow number 34, completed successfully.
- Archive, signed IPA export, Apple archive validation and upload all succeeded.
  Log evidence explicitly states `UPLOAD SUCCEEDED with no errors` and `No errors
  uploading archive`.
- Workflow signing material was cleaned up. No new certificate or permission was
  created. Apple processing and review submission are verified separately below.

### TestFlight

- Apple processed build **1.2.1 (34)**, build ID
  `0ff93b9f-2e11-4aac-a5b7-af1c4b09b4e3`.
- Existing **Betatest** internal group remains linked, with **three testers**;
  no testers, permissions or new groups were added.
- Turkish What to Test saved and verified with Apple's **Saved** control.
  Includes iPhone 14 Pro touch checks, old-save/day-close/reload, shortened skills,
  both ad eligibility gates, Premium/no-fill/consent safeguards, offline staff
  and Game Center checks. Testers are warned not to repeatedly click real ads.
- Evidence:
  `C:/Users/Gaming/.codex/visualizations/2026/10/02/mihenk-1.2.1/testflight-34.png`.

### App Review submission

- Build **1.2.1 (34)** linked and saved to the new App Store version.
- Submitted to App Review on **October 2, 2026 at 02:27 AM** (Apple UI local time).
- Submission ID: `0f7c6ca4-d16d-46fe-8b53-ae524a5ddb95`.
- Final submission detail visibly shows **Waiting for Review**, with exactly one
  submitted item, iOS App 1.2.1 / 1.2.1 (34). This is a completed submission,
  not merely the intermediate Ready for Review draft.
- Automatic release after approval and immediate rollout were saved. The update
  is **not yet approved or live**; review and distribution timing belong to Apple.
- Evidence:
  `C:/Users/Gaming/.codex/visualizations/2026/10/02/mihenk-1.2.1/apple-1.2.1-waiting-review.png`.
- Documentation/ignore-only follow-up commits do not change the uploaded source
  identified above and require no duplicate native build.

### Web/Privacy deployment

- Source: `caa864d8bb830a9cdd8fc7830efa9a05b5be06e9`.
- Vercel project: `alpersonmihenk`, `prj_kvnmcTiMnNAFPEjRMqEN495DAVGB`.
- Verified preview `dpl_3z6zdwyMv5E3Ryg6y9udBwu2nipX` promoted to production
  `dpl_BdotXF1hpTR6UBFJJRXgxSuCGFLv` (READY), approximately 23-second build.
- Production alias `https://alpersonmihenk-chi.vercel.app` retained. Turkish and
  English public privacy pages both visibly show October 2 and the new two-slot
  break wording. No new data category or provider was introduced.
- A linked local Vercel configuration is ignored; no credential is committed.
- Post-deploy error-level log query returned no logs; this is not a claim that
  physical-device performance or all future sessions have been observed.
