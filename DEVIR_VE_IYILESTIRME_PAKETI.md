# Devir Notu ve İyileştirme Paketi

Bu dosya iki iş görür:

1. **Devir notu** — yeni bir sohbet bu depoyu sıfırdan devraldığında bilmesi gereken her şey.
2. **İyileştirme paketi** — cila dışında kalan, ölçülmüş ve yeri belli bütün öneriler tek listede.

Tarih: 2 Eylül 2026 · Depo: `ouzhaanttnn-afk/Mihenkson` · Dal: `main`

---

## BÖLÜM 0 — BU DEPO NEREDEN GELDİ

`Mihenkson` boş bir depoydu. İçeriği, `ouzhaanttnn-afk/clonemihenk` deposunun
`292467e` commit'indeki izlenen ağacının birebir kopyasıdır (`git archive` ile salt
okunur alındı; **kaynak depoya dokunulmadı ve dokunulmayacak**).

**Düzeltmeler bundan sonra bu depoda yürütülür.** `Mihenkaynak` ve `clonemihenk`
değişmeden duruyor.

Bu tabanın `Mihenkaynak`'tan farkı:

- **Var olanlar:** hafta sonu takvimi (`src/domain/calendar.ts`) ve √t tavan
  ölçeklemesi (`src/domain/market.ts:119`) bu tabanda zaten mevcut.
- **Olmayanlar:** Mihenkaynak tarafında yazılan ~217 ek test (hafta sonu testleri
  dâhil), pazarlıkta alış tarafı çıpası (`referenceBuy`), talep ağırlıklandırması
  (`demandWeightFor` / `stockAffinityPool`), eski kayıt kimliği göçü
  (`stock-pools.ts`) ve depolama erişilemediğinde günün kilitlenmesini önleyen
  düzeltme (`isStorageAvailable`). Gerekirse tek tek taşınabilir.
- **Karar bekleyen:** bu tabandaki **Market sekmesi** oyun içi TL harcıyor ve günde
  1.000–60.000 ₺ gider yazıyor (`lifestyleDailyExpense`, gün kapanışına bağlı).
  Orijinal için konulan "Market boş rota kalacak" kuralıyla çelişiyor. Aşağıdaki
  **C4** maddesi. Dokunmadan önce kullanıcıya sorulacak.

Referans depolar:

| Depo | Rol |
|---|---|
| `ouzhaanttnn-afk/Mihenkson` | **Çalışma deposu** — düzeltmeler burada |
| `ouzhaanttnn-afk/clonemihenk` | Bu ağacın kaynağı · **salt okunur** |
| `ouzhaanttnn-afk/Mihenkaynak` | Önceki çalışma deposu · dal `claude/mobile-game-shop-system-8kyrmi` · son commit `518e003` |

### İlerleme

| Madde | Durum |
|---|---|
| A1 · Bildirim balonları kapanmıyor | ✅ yapıldı |
| A2 · İşletme alt rotasından çıkılamıyor | ✅ yapıldı |
| A5 · Pazarlıkta çevrilmemiş `OPEN` etiketi | ✅ yapıldı |
| A6 · Ekspertiz kırılımı okunmuyor | ✅ yapıldı |
| A7 · Pazar günü çelişkili metin | ✅ yapıldı |
| A3 · Stok sekmesi stoğu göstermiyor | ✅ yapıldı |
| A4 · Stok düğmeleri yumurta gibi duruyor | ✅ yapıldı |
| A9 · Stok marjı hangi kanala göre, yazmıyor | ✅ yapıldı |
| C1 · Vitrin tezi seçilince mal vitrine girmiyordu | ✅ yapıldı |
| C5 · Karşılanan satıcıdan vazgeçilemiyordu | ✅ yapıldı |
| YENİ · Ayarlar baloncuğu (Dükkan ekranı) | ✅ yapıldı |

### Yeni taban (45a499b) üstünde yeniden ölçüm

Düzeltmeler eski tabanda (292467e) teşhis edilmişti; yeni tabanda hepsi baştan ölçüldü.

| Madde | Yeni tabanda durum |
|---|---|
| A1 balon ömrü | ✓ tarayıcıda: 3 gün üst üste kapatıldı, 5,5 sn sonra **0** balon |
| A2 alt rota | ✓ tarayıcıda: Piyasa ve İşlem Defteri'nden sekmeyle köke dönüş |
| A3 HAS paneli | clone `45a499b` ile kendi çözmüş (`hasCompact`) — benimki geri çekildi |
| A4 chip yüksekliği | ✓ tarayıcıda: 46 px, filtre çipiyle eşit |
| A5 `AÇIK` | ✓ tarayıcıda: pazarlık rozeti "AÇIK" |
| A6 kırılım | ✓ tarayıcıda: `Kondisyon/Risk −%2 · −431 ₺` · `Oynaklık +%1` · not satırı var |
| A7 | çelişkili metin clone `de16ae1` ile kökten kalkmış; "Canlandır" kilidi duruyor |
| A9 etiketler | ✓ tarayıcıda: kırpılma yok, kap taşmıyor |
| C1 vitrin | domain testleri ✓ · tarayıcı doğrulaması hâlâ açık |
| A8 karşı teklif | ✗ hâlâ açık — tur bütçesi yok |
| A10 ses | ✗ clone tabanında ses altyapısı hiç yok (`public/assets/audio` klasörü de yok) |

**Spawn ölçümü** (800 müşteri, tohum 12345): `sell 349 · buy 362 · service 57 · appraisal 32`;
satıcıların **%24,9'u işçilikli** → tüm müşterilerin ~%11'i. Yani işçilikli satıcı bol;
tarayıcı doğrulamalarının takılma sebebi spawn değil, C5'ti.
| Geri kalanı | ⏳ sırada (aşağıdaki "Önerilen sıra") |

---

## BÖLÜM 1 — DEVİR NOTU

### Proje

**MIHENKAYNAK** — Türk sarraf/kuyumcu simülasyon oyunu. Vite 5 + React 18 + TypeScript 5.6 + zustand 4.5 + vitest 2.1.
Takma adlar: `@domain/*`, `@data/*`, `@state/*`, `@ui/*`.

Katman ayrımı:

| Katman | Yol | Kural |
|---|---|---|
| Alan | `src/domain/` | Saf TypeScript, React yok |
| Durum | `src/state/gameStore.ts` | Tek orkestrasyon noktası (3700+ satır) |
| İçerik | `src/data/` | Şablonlar, katalog, sabitler |
| Sunum | `src/ui/` | Yalnız çizim |

### Bozulmaması gereken kurallar

Bunlar oyuncunun kaydını, ekonomiyi ya da projenin kapsamını doğrudan etkiler. Hiçbiri
"iyileştirme" gerekçesiyle esnetilmez.

- **Ekonomi, mutabakat, gizli gerçek ve pazarlık matematiği bozulmaz.**
- **Oyuncunun parası, stoğu, seviyesi, XP'si, güveni, itibarı ve ilerlemesi sıfırlanmaz.**
- **Eski kayıtlar bozulmaz** — eksik alanlar varsayılana düşer (`src/state/save.ts`).
- **Determinizm (GDD 28.3):** `new Rng(deriveSeed(rootSeed, 'ns', index))`. Bir düzeltme
  fazladan RNG çekimi tüketemez. Kapalı piyasa günleri **hiç** RNG tüketmez.
- **Tek mutabakat yolu:** `applyTransaction()` + `appliedTxIds` idempotency.
  `realizeProfit()` ayrı bir çağrıdır (GDD 34.5).
- **Karakterler ve avatarlar yalnız görseldir**, oyun gücü vermez.
- **Market sekmesi boş bir rotadır.** Katalog yok, ürün modeli yok, satın alma yok,
  oyun içi TL işlemi yok, sahiplik/kuşanma yok, gerçek para yok. Piyasa ile birleştirilmez.
  ⚠️ **Bu depodaki taban bu kurala uymuyor** (Bölüm 0 ve madde C4). Kural askıya
  alınmadı — karar kullanıcınındır, o karar verilene kadar Market'e dokunulmaz.
- **İşçilikli ve taşlı ürünler asla toptancı kataloğuna girmez.**
- **`ouzhaanttnn-afk/clonemihenk` deposuna dokunulmaz** — yalnız okunur.
- Test ortamı `node`; **`localStorage` yok**, tüm depolama try/catch içinde.
- Açıkça istenmedikçe **pull request açılmaz**.
- Anlaşılmayan her şey kullanıcıya sorulur.

### Mihenkaynak tarafında yapılanlar (bu depoda yok)

Aşağıdakiler `ouzhaanttnn-afk/Mihenkaynak` deposunun
`claude/mobile-game-shop-system-8kyrmi` dalındadır. Buraya taşınmadılar; bir kısmı
bu tabanda zaten mevcut (Bölüm 0).

| Commit | İş |
|---|---|
| `7221f03` | Hafta sonu boşluğu mekaniği (√t ölçekleme, takvim katmanı) |
| `b1d25d4` | "Sonraki müşteri ~N dk" sayacının kaldırılması |
| `a193bd5` | Clone'daki UPDATEv5 çalışmasının orijinale birleştirilmesi (146 çatışma) |
| `a72232c` | Birleştirmenin bıraktığı kopyaların temizlenmesi |
| `2dafe6b` | İşletme ekranındaki çift "Rotalar" bloğunun kaldırılması |
| `518e003` | Bu devir notu ve iyileştirme paketi |

O daldaki durum: 928 test / 55 dosya. **Bu depodaki taban: 711 test / 37 dosya**,
`tsc --noEmit` temiz, üretim derlemesi temiz (ölçüldü).

### Hafta sonu mekaniği — ölçülmüş değerler

Gün 1 = Pazartesi. Piyasa Pzt–Cum açık, dükkân Pzt–Cmt açık.
Cumartesi = kör ticaret günü (dükkân açık, piyasa donuk). Pazar = her şey kapalı.

Kapalı gün sayısına göre günlük tavan √t ile genişler:

```ts
const span = closedDaysBefore(day) + 1;
const cap  = MARKET_DAILY_CAP * Math.sqrt(span);   // hafta içi %3 · pazartesi %5,2
```

Ölçüm: hafta içi standart sapma **%1,10**, pazartesi **%1,93** (1,74× ≈ √3), hafta sonu **%0,00**.
İlk denemede (üç bağımsız çekim) pazartesi sapması %4,52 ve en kötü gün −%8,73 çıkmıştı; √t
ölçekleme bunu düzeltti.

### Yerelde nasıl oynanır

Vercel adresleri bu ortamdan kapalı (proxy CONNECT'e 403 veriyor). Yerelde:

```bash
npm install                 # ilk kez
npx vite build && npx vite preview --port 5241 --strictPort
```

Karşılaştırma için başka bir checkout'u aynı anda servis edeceksen `package.json`
üç depoda da aynı, yani `node_modules` paylaşılabilir:

```bash
ln -sfn /yol/olan/node_modules node_modules
npx vite build && npx vite preview --port 5242 --strictPort
```

Chromium: `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`. Telefon ölçüsü 390 × 844.

### Yayımlanmış rapor

Clone'un tek başına denetimi: <https://claude.ai/code/artifact/e2599f72-81d7-44b1-b808-fbf45163cdfa>
(Bu oturum artifact'e abone olamadı; sayfaya gelen yorumlar otomatik ulaşmaz.)

Puanlar: **bizim taraf 80/100**, **clone 65/100**.

---

## BÖLÜM 2 — İYİLEŞTİRME PAKETİ

Cila maddeleri (sayı biçimi tutarsızlıkları, satır kaymaları, tek ürünün iki adla anılması,
ölü boşluklar, ses dosyalarının hiç olmaması) bu listeye **alınmadı** — istenen buydu.
Aşağıdaki her madde ya bir davranış hatası ya da bir tasarım kararı.

Öncelik: **E** = engel (sunumda takılınır) · **A** = anlaşılırlık · **T** = tasarım/oynanış.

---

### Z. Ayarlar yüzeyi — ✅ YAPILDI
`src/ui/shell/SettingsDialog.tsx` · `src/ui/screens/ShopScreen.tsx` · `src/ui/icons.tsx`

Bu tabanda **hiç ayar yüzeyi yoktu**: ne Ayarlar rotası, ne ayar durumu, ne ses sistemi.
Profil yalnız üst şeritteki avatardan, kayıt yalnız İşletme'nin alt rotasından açılıyordu;
ikisini de bilmeyen oyuncunun gidecek yeri yoktu.

**Yapıldı:** Dükkan ekranına, piyasa şeridinin altına sabit bir **ayarlar baloncuğu**
(38 × 38, `aria-label="Ayarlar"`). Pencere cihaz seviyesinde çiziliyor — profil penceresiyle
aynı sebep: ekranın içine konsa Dükkan'ın `overflow: hidden` gövdesine hapsolurdu.

İçerik yalnız **gerçekten ayarlanabilen** üç şey:

| Satır | Yaptığı |
|---|---|
| Profil | Kuyumcu adı ve portresi — `ProfileDialog`'a devreder |
| Öğretici ipuçları | Açık/kapalı anahtar, **iki yöne de** çalışır |
| Yeni oyun | Kaydı siler — onay adımlı, yıkıcı eylem tek dokunuşla olmaz |

**Ses, müzik, titreşim ve dil anahtarları KOYULMADI.** Bu tabanda ses altyapısı hiç yok
(`public/assets/audio` klasörü bile yok) ve arayüz tek dilli. Çalışmayan bir anahtar
göstermek, oyuncuya kapattığını sandığı bir şeyi kapattırmak olurdu.

Yeni `restoreOnboarding()` eklendi: `skipOnboarding` tek yönlüydü, bir kez öğretiyi kapatan
oyuncu ipuçlarını bir daha göremiyordu. Anahtar sunacaksak iki yöne de çalışması gerekir.

`settingsOpen` `SaveFile` alanlarına girmiyor — kayda sızmıyor, eski kayıtları bozmuyor.
Dişli ikonu SVG çizildi: mikro-ikon setinde dişli asseti yok, var olmayan dosyaya işaret
etmek yerine kodla çizildi.

**Testler:** `src/state/settings.test.ts` — 8 test (aç/kapa, §4 zaman durması ve **tekrar
akması**, öğreticinin iki yönlü çalışması, kayda sızmama).

**Tarayıcıda doğrulandı:** baloncuk 38 × 38 ve tıklanabilir · pencere açıkken saat
`09:02 → 09:02` **durdu**, kapanınca `09:03 → 09:07` **aktı** · öğretici anahtarı
Açık → Kapalı → Açık · "Yeni oyun" onay adımı (Vazgeç / Kaydı sil) · Escape kapatıyor ·
konsolda hata yok.

---

### A. Ortak kod tabanı — hatalar

Bu maddeler `Mihenkaynak` üzerinde ölçüldü. **A1, A2, A3, A4, A5 ve A6 bu depoda da
birebir aynı koddan geliyor** (Bölüm D). A7–A10'un bu tabandaki karşılığı düzeltmeden
önce ayrıca doğrulanmalı.

#### A1 · E · Bildirim balonları kapanmıyor, içeriği örtüyor — ✅ YAPILDI
`src/ui/App.tsx:69-105`

Tek bir 4 saniyelik zamanlayıcı vardı ve `toasts` her değiştiğinde sıfırlanıyordu. Arka
arkaya balon gelince hiçbiri kapanmıyordu; 7. günde ekranda hâlâ "Gün 5 kapandı" duruyor
ve balon dükkân kartının başlığını örtüyordu.

**Yapıldı:** zamanlayıcılar balon kimliğine göre bir `useRef` haritasında tutuluyor. Yeni
bir balon öncekinin ömrünü uzatmıyor; her balon `TOAST_LIFETIME_MS` (4 sn) sonra düşüyor.
Bileşen sökülürken bekleyen zamanlayıcılar temizleniyor.

**Tarayıcıda doğrulandı:** üç gün arka arkaya kapatıldı, balonlar göründü; 5,5 sn sonra
ekranda **0** balon kaldı (önceki davranışta hiç düşmüyorlardı).

**Yapılmadı:** balon katmanının konumu değiştirilmedi. Ölçülen zarar balonun *kalıcı*
olmasıydı; o giderildi. Katmanı aşağı almak Dükkan'daki CTA'yı örterdi, o yüzden
yerinde bırakıldı.

#### A2 · E · İşletme alt rotasından çıkılamıyor — ✅ YAPILDI
`src/state/gameStore.ts:495-500` · `src/ui/screens/BusinessScreen.tsx:82-95`

Piyasa / İşlem Defteri / Toptancı gibi bir alt rotaya girdikten sonra alttaki **İşletme**
sekmesine basmak hiçbir şey yapmıyordu: rota bileşenin kendi state'inde durduğu için
`setTab('business')` çağrılıyor ama sekme zaten 'business' olduğundan hiçbir şey
değişmiyordu. Tek çıkış "← İşletme" bağlantısıydı.

**Yapıldı:** `setTab` artık iki olayı ayırıyor — başka sekme sekmeyi değiştirir, **aynı
sekme** ise yeni `tabHomeSignal` sayacını bir artırır. `BusinessScreen` bu sayacı izleyip
rotasını köke çekiyor. Sayaç `SaveFile`'a girmiyor, dolayısıyla eski kayıtlara dokunmuyor.

**Testler:** `src/state/tab-navigation.test.ts` — 6 test, sözleşmenin mağaza tarafını
koruyor.

**Tarayıcıda doğrulandı:** Piyasa → İşletme sekmesi → kök ✓ · İşlem Defteri → İşletme
sekmesi → kök ✓ · diğer sekmelere geçiş bozulmadı ✓.

**Not:** aynı sayaç başka kök ekranlarda da kullanılabilir (Stok'un filtreleri gibi);
şimdilik yalnız İşletme bağlandı.

#### A3 · A · Stok sekmesi stoğu göstermiyor — ✅ YAPILDI
`src/ui/screens/StockScreen.tsx` · `HasCounter`

Sekme açıldığında ilk ekranı HAS altın alım–satım paneli dolduruyordu; gerçek stok listesi
altta kalıyordu. Üstelik HAS işlemleri yalnız **cuma** onaylanır — panel haftanın altı günü
karar verilemeyen bir yüzeydi.

**Yapıldı:** `Sarrafiye Al` ile aynı desende katlanır oldu ve **kapalı açılıyor**. Başlık
bakiyeyi ve günün durumunu ("Cuma günü açılır" / "Cuma · işlem açık") yazdığı için panel
kapalıyken de bilgilendirici.

**Tarayıcıda doğrulandı:** ilk ekranda HAS gövdesi yok, `Çeyrek Altın · 10 adet` satırı
görünüyor.

#### A4 · A · Stok düğmeleri yumurta gibi duruyor — ✅ YAPILDI
`src/ui/screens/Screens.css` · `.v5Controls .chip`

Kök sebep: `.chip` `box-sizing: content-box` ve `.v5Controls .chip { min-height: 44px }`
vardı; content-box'ta `min-height` **içerik** kutusuna uygulanır, yani 44 + 14 padding + 2
kenarlık = **60 px**. Aynı sınıfın filtre şeridindeki hâli 46 px'ti. `.chip` zaten
30 + 14 + 2 = 46 px, GDD 23.22'nin istediği 44 px'in üstünde — override hem gereksiz hem
zararlıydı, kaldırıldı.

**Tarayıcıda ölçüldü:** önce 64 × 60 · sonra 64 × 46, dört düğme de filtre çipiyle eşit.

#### A5 · A · Pazarlıkta çevrilmemiş etiket — ✅ YAPILDI
`src/domain/negotiation.ts:714-728`

```ts
export const STATE_LABEL: Record<NegotiationState, string> = {
  OPEN: 'OPEN',            // ← tek çevrilmemiş
  HARDENING: 'SERTLEŞTİ',
  FINAL_OFFER: 'SON TEKLİF',
  ACCEPTED: 'KABUL',
  REJECTED: 'RED',
};
```

**Yapıldı:** `OPEN: 'AÇIK'`. Anahtar (`OPEN`) durum makinesinin kimliğidir ve
değişmedi — CSS sınıfı `.stateBadge__value--OPEN` ile `STATE_ORDER` dizisi anahtarı
kullanıyor, ikisi de etkilenmiyor.

#### A6 · A · Ekspertiz kırılımı okunmuyor — ✅ YAPILDI
`src/ui/workbench/AppraiseStage.tsx:81-131` · `src/ui/format.ts:23-72`

Ölçülen örnek: Metal %78 · İşçilik %24 · Nadirlik %5 · Kondisyon/Risk %7 · Oynaklık %2 =
**%116**. Üstelik "Kondisyon / Risk %7" satırının tutarı **−999 ₺** — artı yüzde, eksi tutar.
Sebep: paylar `band.mid`'e oran olarak hesaplanıyor ama ekranda bu yazmıyor, risk satırının
payı da `Math.abs()` ile alınıyor.

**Yapıldı:** yeni `pctSigned()` yardımcısı işareti yüzde iminin ÖNÜNE koyuyor (`pct(-0.07)`
"%-7" üretiyordu; Türkçede işaret önde yazılır). Risk satırı artık `−%7`, oynaklık satırı
`+%1`. Tablonun altına kuralı söyleyen bir not eklendi. `tl()` de eksi imini `tlSigned` ile
aynı karaktere (U+2212) çevirdi — aynı satırda `−%7` ile `-685 ₺` yan yana düşüyordu.

**Testler:** `src/ui/format.test.ts` — `pctSigned` için 7 test (işaret yeri, sıfırın
işaretsizliği, yuvarlamada `pct` ile birebir aynı davranış, tek tip eksi imi).

**Tarayıcıda doğrulandı:** `Metal %89 · İşçilik %16 · Nadirlik %2 · Kondisyon/Risk −%7 ·
−685 ₺ · Oynaklık +%1` — yüzde ile tutar artık aynı yöne bakıyor, not görünüyor.

#### A7 · A · Pazar günü çelişkili metin — ✅ YAPILDI
`src/ui/shell/CustomerStrip.tsx:38-80` · `src/ui/screens/ShopScreen.tsx:200-204, 489-502, 638-656`

Dükkân kapalıyken müşteri şeridi hâlâ "Kapı açık — gün akıyor" diyordu; iki satır altta
"Dükkân bugün kapalı" yazarken. Ayrıca pazar günü "Dükkânı Canlandır" düğmesi duruyordu —
müşteri akışı olmayan günde geliş aralığını kısaltmayı öneren, hiçbir şey yapmayan bir çağrı.

**Not:** paketin ilk hâlinde "kapalı yazısı iki kez çiziliyor" da yazıyordu. O, Mihenkaynak
sürümündeki ikinci karta aitti; bu tabanda öyle bir kart yok, tek kopya vardı.

**Yapıldı:** `CustomerStrip` artık `shopOpen` alıyor ve boş şeridin üç hâlini ayırıyor —
kapalı ("Dükkân bugün kapalı · Kapı kapalı — bugün müşteri gelmez"), bekleyen, sakin.
"Dükkânı Canlandır" kapalı günde çizilmiyor. Alt uyarı satırı da artık aynı cümleyi
tekrarlamıyor; kapalı günün ne getirdiğini söylüyor: "Pazar · piyasa da kapalı — Fiyat cuma
kapanışında donuk. Stok, atölye ve toptancı açık."

**Tarayıcıda doğrulandı (dokuz gün oynandı):** Cumartesi dükkân açık, "Kapı açık" ve
"Canlandır" yerinde ✓ · Pazar "Kapı açık" yok, "Canlandır" yok, kapalı cümlesi tam **1**
kez ✓.

#### A8 · A · "Karşı Teklif" sınırsız basılıyor
`src/ui/workbench/NegotiateStage.tsx`

Ölçüm: karşı teklif 74.744 → 74.638 ₺'ye indi, sonra üç turda hiç kımıldamadı. Düğme hâlâ
aktif ve hiçbir geri bildirim vermiyor.

**Yapılacak:** karşı teklif turu bir bütçeye bağlansın (örn. 3 tur) ve bütçe bitince düğme
gerekçesiyle kilitlensin: "Müşteri son sözünü söyledi."

#### A9 · A · Stok marjı hangi kanala göre, yazmıyor — ✅ YAPILDI
`src/ui/screens/StockScreen.tsx`

"Net Satış Tahmini" ve "Tahmini Marj" `liquidationEstimate` üzerinden **bugün erişilebilen
en hızlı** çıkışa göre hesaplanır — genelde toptancıya. Toptancı makası yüzünden taze
alınmış sağlam malın marjı da eksi çıkar; etiket bunu söylemediği için oyuncu 1. günde
açılış stoğunun üçüne birden bakıp "stoğum zararda" okuyordu (−3.640 / −4.062 / −4.244 ₺).

**Yapıldı:** üstteki özet "Net Çıkış" → **"Hızlı Çıkışta"**. Satır cümlesi kanalı adıyla
söylüyor: *"Bugünkü en hızlı çıkış: **Toptancı** · tahmini süre 1–2 gün. Beklemek daha iyi
bir kanal açabilir."*

**Ara adım ve düzeltmesi:** kanal adını önce etikete koydum ("Bugün Toptancı", "Hızlı
Çıkışta Marj"). Ölçünce üç etiketin de kırpıldığı ve kabın 11 px taştığı çıktı — "Gerçek
Alış Maliyeti" 84 px yuvada 97 px istiyordu, **yani kırpılma değişiklikten önce de vardı**.
Kanal adı zaten değişken uzunlukta ("Toptancı" ↔ "Servis + satış"), etikete sığdırmak
kırılgandı. Etiketler **Maliyet · Bugün · Marj**'a indi, kanal adı alttaki cümleye taşındı.

**Tarayıcıda ölçüldü:** üç etiket de 48 px yuvada 48 px — kırpılma yok, kap taşmıyor.

#### A10 · A · Ses altyapısı bağlı, dosya yok
`src/ui/audio.ts` · `public/assets/audio/{sfx,music}/`

9 SFX ve müzik için yollar tanımlı, klasörler **boş**. İşletme ekranı ise "Müzik açık ·
Efekt açık" diyor.

**Yapılacak:** ya dosyalar eklensin, ya ayar varsayılanı kapalı gelsin ve "Ses paketi
yüklenmedi" yazsın. Oyuncuya çalışmayan bir açık/kapalı düğmesi gösterilmesin.

---

### B. Tasarım ve oynanış önerileri

#### B1 · T · Cumartesi riski oyuncunun baktığı yerde yazmıyor
Hafta sonu boşluğu mekaniğinin bütün amacı, cuma kapanışıyla pazartesi açılışı arasında
körlemesine alım yapmanın riskini oyuncuya yaşatmak. Ama cumartesi günü dükkân kartında bu
hiç geçmiyor; tek işaret üst şeritteki "Cmt · Piyasa Kapalı … donuk" damgası.

**Öneri:** cumartesi dükkân kartına tek satır — *"Piyasa kapalı. Bugün aldığın mal pazartesi
açılışına kadar fiyat riski taşır."* Mekanik zaten çalışıyor; görünür değil.

#### B2 · T · İşçilikli ürün mekaniği ekonomik olarak baskılanmış
Ölçüldü: vitrin müşterisi hedeflemesi %19,7 oranında çalışıyor, toplanabilir değil ve vitrin
slotlarına bölünüyor. Buna karşılık otomatik perakende kanalı aynı işçilikli ürünü **3. günde
vitrin müşterisinin ödeyeceğinden daha yüksek fiyata** satıyor. Yani oyuncunun vitrin
mekaniğini kullanması için ekonomik bir sebep yok — yeni mekanik kendi kendini gereksiz
kılıyor.

**Öneri:** otomatik perakende kanalı **yalnız sarrafiyeye** kısıtlansın. İşçilikli ürün
yalnız vitrin müşterisine ya da esnaf ağına satılsın. Tek ve kapalı bir değişiklik;
ekonominin geri kalanına dokunmaz. **Bu, paketteki en önemli tasarım maddesi.**

#### B3 · T · Ayar bantları birbirinden ayrışmıyor
`src/domain/customer-pricing.ts` · `CRAFTED_BANDS`

8K, 14K, 18K ve 22K'nın dördü de **aynı %34 brüt marjı** veriyor. Ayar, kârlılık açısından
hiçbir şey ifade etmiyor; oyuncunun "hangi ayarı alayım" diye düşünmesi için sebep yok.

**Öneri:** düşük ayarda işçilik payı yüksek → marj geniş ama satışı yavaş; yüksek ayarda
metal payı baskın → marj dar ama hızlı döner. Aynı ürünü almanın iki farklı gerekçesi olsun.

#### B4 · T · Vitrin yaşlanması yok
Vitrine konan işçilikli ürün süresiz olarak aynı çekiciliği koruyor. Vitrin bir karar değil,
bir depo.

**Öneri:** vitrindeki ürünün hedeflenme olasılığı günlerle düşsün; oyuncu "bunu indireyim mi,
eritip sarrafiyeye mi döneyim" diye düşünsün. Ölü stok kavramı zaten var, bağlanabilir.

#### B5 · T · Vitrin slot seyrelmesi oyuncuya gösterilmiyor
Vitrinde ne kadar çok ürün varsa her birinin hedeflenme şansı o kadar düşüyor. Oyuncu bunu
hiçbir yerden göremiyor, dolayısıyla vitrini doldurmanın bir bedeli olduğunu bilmiyor.

**Öneri:** vitrin başlığına "8 slotta 5 ürün · her biri ~%4 hedeflenme" gibi tek satır.

---

### C. Clone — hatalar ve öneriler

Clone'a **dokunulmaz**; bu maddeler ya oraya taşınacak düzeltmeler ya da bizim tarafa
alınacak fikirler olarak listelendi. Ayrıntılı gerekçeler yayımlanmış raporda.

#### C1 · E · Vitrin tezi seçilince mal vitrine girmiyordu — ✅ YAPILDI
`src/state/gameStore.ts` · `settleLine`

**Maddenin ilk hâli yanlıştı, düzeltmesi:** "İlk Stoğunu Al ile alınan çeyrek vitrine değil
arka stoğa düşüyor, vitrin mekaniği devre dışı kalıyor" yazmıştım. Ekrandaki
`Vitrin 0/8 · Arka stok 1/16` satırına bakıp yorumlamıştım; kodu okumadan. Kod şunu
söylüyor:

- `purchase.ts · showcaseStock` vitrin hedefini seçerken **`isCrafted`** şartı arıyor —
  sarrafiye (çeyrek, gram, yatırım bileziği) **hiçbir zaman** vitrin hedefi olamaz.
- `purchase.ts:207` sıradan talep `display` VE `backStock` pozisyonlarının ikisini de
  eşleştiriyor — yani arka stoktaki sarrafiye zaten sorunsuz satılıyor.

Yani alınan sarrafiyenin arka stoğa düşmesi bir hata değil. Kalan gerçek sorun anlaşılırlık:
oyuncu `Vitrin 0/8` görüp bir şeyin ters gittiğini sanıyor.

**Asıl kırık halka başkaymış.** Müşteriden alınan **işçilikli** ürün de `backStock`a
düşüyordu (`settleLine` · `location: 'backStock'` sabitti). Vitrin müşterisi yalnız
`location === 'display'` olan işçilikli ürünü hedeflediği için, oyuncu işlem sırasında
**"Vitrin" çıkış planını seçse bile** mekanik kendiliğinden hiç çalışmıyordu; vitrini
doldurmanın tek yolu Stok ekranında satırı açıp "Vitrine Koy"a basmaktı ve bunu hiçbir yer
söylemiyordu.

Alan katmanı zaten bu varsayımla yazılmış:
- `thesis.ts:144` "Vitrin"i ancak **boş slot varken** seçenek olarak sunuyor (`displayFree > 0`).
- `settlement.ts:152` gelen kalemin `display` konumunu zaten taşıyor.

Eksik olan tek halka, mağazanın kalemi `display` yazmamasıydı.

**Yapıldı:** `settleLine` artık tez `retail` ve ürün işçilikliyse, boş slot varsa kalemi
doğrudan vitrine koyuyor. Slot işlem sırasında dolmuş olabileceği için tekrar bakılıyor; yer
yoksa mal arka stokta kalıyor ve oyuncuya balonla söyleniyor — sessizce yutulmuyor.

**Testler:** `src/domain/showcase-routing.test.ts` — 6 test. Konumun kaleme ve pozisyona
taşınması, vitrine girenin hedeflenebilir olması, arka stoktakinin hedeflenememesi (kırılan
halkanın kendisi) ve **konumun maliyet/nakit matematiğini değiştirmediği**.

**Kalan (ayrı iş):** Stok satırına "Vitrinde değil" rozeti ve tek dokunuşla taşıma; ayrıca
`displayStock` hâlâ yalnız işçilikliyi kabul ediyor — sarrafiye için vitrin zaten anlamsız
olduğundan bu doğru, ama Hızlı Stok penceresi `Vitrin 0/8`'in neden 0 kaldığını söylemiyor.

#### C2 · A · Hızlı Stok penceresi üç farklı giriş biçimi kullanıyor
Gram Altın satırı serbest yazı kutusu, Çeyrek satırı `− 1 +` sayacı, Bilezik satırı
`− 10 g +` sayacı; üçünün de altında ayrıca kaydırıcı. Pencere krem, oyunun geri kalanı
lacivert. Üçüncü satırın kaydırıcısı alttaki çubuğun altında kalıyor.

**Yapılacak:** tek kontrol tipi (`− değer +`), kaydırıcı kaldırılsın, pencere koyu temaya
alınsın, alt boşluk eklensin.

#### C3 · A · "Alımı Bitir" hiçbir şey almıyor
Satın alma satır satır "Al" ile yapılıyor; "Alımı Bitir" yalnızca pencereyi kapatıyor.
İsim, yapmadığı şeyi vaat ediyor.

**Yapılacak:** düğme adı **"Kapat"**.

#### C4 · A · Market'in 18 ürününden 11'i hiçbir yerde görünmüyor
Kodda yalnız 7 ürünün kuşanma yuvası var (3 çerçeve, 2 tema, 2 rozet); rozetlerin CSS'i yok,
ekrana çıplak bir `◆` karakteri çiziliyor. Dekorasyon, koleksiyon ve tüm şahsi yaşam
hedefleri — 11 ürün — yalnız bir sayacı artırıyor. 25.000.000 ₺'lik villanın karşılığı
"sahip olunan: 1" ve günde 8.000 ₺ gider. İkonların altında `WATCH · SEDAN · SPORTSCAR ·
FOUNDER` gibi İngilizce kod adları duruyor. Sekmeyi ilk açan 18 üründen 17'sini kilitli görüyor.

**Yapılacak (clone'da tutulacaksa):** İngilizce kod adları ekrandan kaldırılsın; görsel
karşılığı olmayan ürünler gizlensin; şahsi hedefler için bir koleksiyon/vitrin ekranı
eklensin; ikonlar ürüne özgü olsun.

**Kapsam uyarısı:** bu sekme oyun içi TL harcıyor ve şahsi ürünler günde 1.000–60.000 ₺
gider yazıyor (`lifestyleDailyExpense`, gün kapanışına bağlı). Orijinaldeki "Market boş rota
kalacak" kuralıyla doğrudan çelişiyor. **Bu sekme orijinale alınmaz** — karar verilecekse
ayrıca konuşulmalı.

#### C5 · T · Karşılanan müşteriden vazgeçilemiyor — ✅ YAPILDI
`src/ui/screens/ShopScreen.tsx` · `inspect` aşaması dock'u
"Bozdurmak istiyor" diyen müşteride birinci aşamanın düğmeleri: Terazi · Mihenk · Yoğunluk ·
Fiyata Geç · Yine de değerle. Reddetme yok. Değerleme ve pazarlığı geçmeden çıkış yok.
"Müşteriyi Gönder" yalnız satış tarafında var.

**Yapıldı:** birinci aşamaya **"İlgilenmiyorum"** eklendi. `finishDeal` akıştan bağımsız:
ekonomiye dokunmuyor, ziyareti deftere yazıyor ve itibar farkını uyguluyor (GDD 10.2) — bedel
uydurulmadı, var olan ziyaret muhasebesi işliyor.

**Tarayıcıda doğrulandı:** 1. aşama düğmeleri `… Fiyata Geç · Yine de değerle ·
İlgilenmiyorum`; art arda **6 müşteri** elden çıkarıldı, 7.'de işçilikli satıcıya ulaşıldı.
Bu aynı zamanda A6'nın tarayıcı doğrulamasını açtı — o doğrulama tam da bu eksik yüzünden
tıkanıyordu.

**Kalan:** bedeli düğmenin yanında yazmak ("Semt itibarın 1 puan düşer") henüz yok; itibar
farkı ziyaret muhasebesinden geliyor ama oyuncuya önceden söylenmiyor.

#### C6 · A · Gün raporu 1. günde felaket gibi okunuyor
"Kasa değişimi −77.336 ₺" yazıyor; bunun 76.136 ₺'si stoğa giden para. Hiçbir satır bunu
söylemiyor.

**Öneri (ikisine de):** kasa değişimi satırının altına "bunun 76.136 ₺'si stoğa girdi" alt
satırı.

#### C7 · Clone'dan bize alınabilecekler
- **Gün raporundaki ek satırlar:** "Personel payı (gidere dahil)", "Kaçırılan Misafir",
  "Stok net çıkış farkı". Bizim raporumuzda yok, faydalı.
- **Profil çipinde XP okuması:** clone `0/580` gösteriyor, biz `%0`. Clone'unki daha bilgilendirici.
- **İşlem sonu değerlendirmesindeki kanal karşılaştırması:** *"Vitrin en yüksek net getiriyi
  verdi; Erit 1.764 ₺ daha az ama 1–2 günde nakde dönerdi."* Oyunun en iyi öğretme anı.

---

### D. İkisinde de ortak olan kökler

Aynı hatayı iki yerde düzeltmemek için: **A1** (balon zamanlayıcısı), **A2** (İşletme alt
rota), **A5** (`OPEN`), **A6** (ekspertiz yüzdeleri), **A3/A4** (Stok sekmesi HAS paneli ve
düğme yüksekliği) her iki depoda da birebir aynı kodtan geliyor.

---

### E. Önerilen sıra

| Sıra | Maddeler | Neden |
|---|---|---|
| 1 | A1, A2 | Sunumda takılınacak iki yer. Yarım günlük iş. |
| 2 | A5, A6, A7 | Metin ve tablo güveni. Birkaç satır. |
| 3 | A3, A4, A9 | Stok sekmesi bir bütün olarak toparlanır. |
| 4 | **B2** | Tasarımın en önemli maddesi: vitrin mekaniği çalışsın. |
| 5 | A8, C5 | Pazarlık ve müşteri akışında oyuncuya gerçek seçenek. |
| 6 | B1, B5 | Var olan mekanikler görünür olsun. |
| 7 | B3, B4 | Yeni tasarım işi; ayrıca konuşulmalı. |
| 8 | A10 | Ses — dosya gerektirir, karar kullanıcının. |

**B2, B3 ve B4 tasarım kararıdır; uygulamadan önce onay alınmalı.** Geri kalanı kapalı,
ölçülmüş ve sınırlı düzeltmelerdir.
