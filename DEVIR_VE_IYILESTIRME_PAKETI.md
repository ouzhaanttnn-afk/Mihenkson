# Devir Notu ve İyileştirme Paketi

Bu dosya iki iş görür:

1. **Devir notu** — yeni bir sohbet bu depoyu sıfırdan devraldığında bilmesi gereken her şey.
2. **İyileştirme paketi** — cila dışında kalan, ölçülmüş ve yeri belli bütün öneriler tek listede.

Tarih: 2 Eylül 2026 · Depo: `ouzhaanttnn-afk/Mihenkson` · Dal: `main`

---

## BÖLÜM 0 — BU DEPO NEREDEN GELDİ

`Mihenkson` boş bir depoydu. İçeriği `ouzhaanttnn-afk/clonemihenk` deposundan salt okunur
alındı (`git archive`; **kaynak depoya dokunulmadı ve dokunulmayacak**).

⚠️ **İlk import yanlış commit'ten yapıldı.** Elimdeki eski checkout'un işaret ettiği
`292467e` alınmış, kopyanın doğruluğu ona karşı ölçülmüş ama kopyalananın deponun HEAD'i
olup olmadığı kontrol edilmemişti. Deponun varsayılan dalı
`claude/mobile-game-shop-system-8kyrmi`, HEAD'i **`45a499b`**. Eksik kalan 11 commit
(35 dosya, +1055/−370) `f413950` ile getirildi; ağaç hash'i clone'unkiyle birebir
(`52566a6d…`). **Bundan sonra her oturumda clone'un HEAD'i kontrol edilmeli.**

**Düzeltmeler bundan sonra bu depoda yürütülür.** `Mihenkaynak` ve `clonemihenk`
değişmeden duruyor.

Bu tabanın `Mihenkaynak`'tan farkı:

- **Var olanlar:** hafta sonu takvimi (`src/domain/calendar.ts`) ve √t tavan
  ölçeklemesi (`src/domain/market.ts:119`) bu tabanda zaten mevcut.
- **Olmayanlar:** Mihenkaynak tarafında yazılan ek testler (hafta sonu testleri
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
| YENİ · Ayarlar düğmesi — üst şeride, hız kontrolünün içine taşındı | ✅ yapıldı |
| A8 · Karşı Teklif sınırsız basılıyordu | ✅ yapıldı |
| A3-2 · HAS tezgâhı katlanır oldu | ✅ yapıldı |
| C3 · "Alımı Bitir" hiçbir şey almıyordu | ✅ yapıldı |
| C6 · Gün raporu 1. günde felaket gibi okunuyordu | ✅ yapıldı |
| C2 · Hızlı Stok penceresi üç farklı giriş biçimi kullanıyordu | ✅ yapıldı |
| YENİ · HAS gövdesindeki sayılar okunmuyordu (1,05:1) | ✅ yapıldı |
| B1 · Cumartesi riski oyuncunun baktığı yerde yazmıyordu | ✅ yapıldı |
| B5 · Vitrin slot seyrelmesi gösterilmiyordu | ✅ yapıldı |
| YENİ · Sarrafiyede "Vitrin" planı ve vitrin slotu şartı | ✅ yapıldı |
| B2 · İşçilikli ürün ekonomik olarak baskılanmış | ❌ **ölçümle çürütüldü** |
| B3 · Ayar bantları ayrışmıyor | ✅ **yapıldı** — sebebi milyem orantısıymış |
| B4 · Vitrin yaşlanması | ✅ yapıldı |
| C4 · Market | ✅ yapıldı — sekme kalıyor, koleksiyon + katalog 19→47 ürün |
| C7 · Clone'dan alınacaklar | ✅ bu tabanda zaten mevcut — alınacak bir şey yok |
| YENİ · Ayarlar: ses, ses düzeyi, titreşim | ✅ tercih saklanıyor **ve çalışıyor** |
| YENİ · Ayarlar: dil | ✅ tercih saklanıyor · çeviri katmanı bekliyor |

### Yeni taban (45a499b) üstünde yeniden ölçüm

Düzeltmeler eski tabanda (292467e) teşhis edilmişti; yeni tabanda hepsi baştan ölçüldü.

| Madde | Yeni tabanda durum |
|---|---|
| A1 balon ömrü | ✓ tarayıcıda: 3 gün üst üste kapatıldı, 5,5 sn sonra **0** balon |
| A2 alt rota | ✓ tarayıcıda: Piyasa ve İşlem Defteri'nden sekmeyle köke dönüş |
| A3 HAS paneli | ✅ katlanır yapıldı — `hasCompact` her satırı küçültmüştü ama panel hâlâ tam boy açıktı; telefonda ölçüldü, ilk ekranı tek başına dolduruyordu |
| A4 chip yüksekliği | ✓ tarayıcıda: 46 px, filtre çipiyle eşit |
| A5 `AÇIK` | ✓ tarayıcıda: pazarlık rozeti "AÇIK" |
| A6 kırılım | ✓ tarayıcıda: `Kondisyon/Risk −%2 · −431 ₺` · `Oynaklık +%1` · not satırı var |
| A7 | çelişkili metin clone `de16ae1` ile kökten kalkmış; "Canlandır" kilidi duruyor |
| A9 etiketler | ✓ tarayıcıda: kırpılma yok, kap taşmıyor |
| C1 vitrin | ✓ tarayıcıda uçtan uca: "Vitrine Koy" seçilen mal `Vitrin 0/8 → 1/8`, "Toptancıya Çıkar" seçilen mal `Arka stok 0 → 1` |
| A8 karşı teklif | ✅ yapıldı — bütçe sabırdan türüyor |
| A10 ses | ✅ yapıldı — sesler SENTEZLE üretildi, altyapı kuruldu, olaylara bağlandı |

**Spawn ölçümü** (800 müşteri, tohum 12345): `sell 349 · buy 362 · service 57 · appraisal 32`;
satıcıların **%24,9'u işçilikli** → tüm müşterilerin ~%11'i. Yani işçilikli satıcı bol;
tarayıcı doğrulamalarının takılma sebebi spawn değil, C5'ti.

**Kalan tek madde:** A10 (ses) — bu tabanda ses altyapısı hiç yok; dosya eklemek ya da
ayarı kapatmak kullanıcının kararı. Cila maddeleri kapsam dışı.

#### YENİ · Sarrafiyenin çıkış kanalı vitrin değil tezgâhtır — ✅ YAPILDI
`src/domain/thesis.ts`

B5 doğrulaması sırasında çıktı: "Vitrine Koy" seçilen bir çeyrek `Arka stok 1/16`'ya düştü.

**İlk düşündüğüm düzeltme yanlıştı ve ölçüm yakaladı.** `retailViable` şartına `isCrafted`
ekleyip kanalı sarrafiyeden kaldıracaktım. İki ölçüm bunu durdurdu:

1. Kanal kalksaydı sarrafiyenin **alış tavanı %12–18 düşerdi** (çeyrek 6.784 → 5.663 ₺,
   cumhuriyet 28.922 → 23.692 ₺) — çünkü `retail` her sarrafiyede ÖNERİLEN kanal ve tavanı o
   belirliyor.
2. Kanalın vaadi sarrafiyede **zaten dürüst**: 200'er örnekte retail'in vaat ettiği net,
   tezgâh üstü müşterinin gerçekten ödediğinin %1,7–15,1 üstünde. Arka stoktaki sarrafiye
   sıradan alıcıya sorunsuz satılıyor (`purchase.ts` hem `display` hem `backStock`
   eşleştiriyor).

**Yani fiyat doğruydu, İSİM ve KAPASİTE ŞARTI yanlıştı.** Kanal her zaman vitrinmiş gibi
yazılmış: adı "Vitrine Koy", boş vitrin slotu şartı arıyor ve kapasite maliyetine 1 slot
yazıyor.

**Bunun ölçülen bedeli asıl sürprizdi:** vitrin işçilikli malla dolduğunda sarrafiyenin alış
tavanı **%13–20 düşüyordu** (aynı koşu içinde: çeyrek −%12,7, gram −%9,1, cumhuriyet −%16,9).
Oyuncu vitrini amacına uygun doldurduğu için, hiç ilgisi olmayan her sarrafiye alımında
cezalandırılıyordu — üstelik bunu hiçbir yer söylemiyordu. Tüketilmeyen bir kaynağa bağlanmış
kapı; denge tercihi değil.

**Yapıldı:** sarrafiyede kanalın adı **"Tezgâhtan Sat"** (kısa: "Tezgâh"), vitrin slotu şartı
ve kapasite maliyeti kalktı. İşçilikli üründe her şey aynen korundu. Kanal, net getiri ve
tavan formülü değişmedi. Kısa etiket artık `ThesisOption.shortLabel` üstünde taşınıyor — her
tüketici tek kaynaktan okuyor.

**Testler:** `src/domain/bullion-counter-channel.test.ts` — 20 test. Sarrafiyede tavanın
vitrin doluluğundan etkilenmediği, slot tüketmediği ve adının "Vitrin" içermediği; işçiliklide
eski davranışın (slot tüketir, vitrin doluyken sunulmaz, adı "Vitrine Koy") korunduğu.

**Tarayıcıda doğrulandı:** pazarlık ekranında sarrafiye `Seçili tez: Tezgâh`, işçilikli
`Seçili tez: Vitrin`.

**ÖLÇÜM YÖNTEMİ NOTU — kendi yanlış alarmım.** Değişiklikten önce/sonra mutlak ₺ tavanlarını
iki AYRI KOŞUDAN karşılaştırıp %42'lik sahte bir düşüş "bulmuştum". Sebep: kayıt yokken mağaza
tohumu rastgele üretiliyor, `goldSpot` koşudan koşuya değişiyor (4.168–4.331 ölçüldü). Aynı
süreç içinde yan yana konunca fark yoktu. **Bu tabanda mutlak ₺ değerleri koşular arasında
karşılaştırılamaz**; yalnız koşu içi oranlar anlamlıdır. Testler bu yüzden sabit tohum
kullanıyor.

**Karar bekleyen diğer maddeler** (kullanıcı onayı olmadan dokunulmayacak): C4 · Market sekmesi
oyun içi TL harcıyor ve günlük 1.000–60.000 ₺ gider yazıyor — "Market boş rotadır" kuralıyla
çelişiyor. B2 · otomatik perakende kanalı işçilikli malı vitrin müşterisinin ödediğinden
yükseğe satıyor, vitrin mekaniğini ekonomik olarak gereksiz kılıyor.

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

#### A8 · A · "Karşı Teklif" sınırsız basılıyor — ✅ YAPILDI
`src/domain/negotiation.ts` · `handleRequestCounter` + `src/ui/screens/ShopScreen.tsx`

Ölçüm: karşı teklif 74.744 → 74.638 ₺'ye indi, sonra üç turda hiç kımıldamadı. Düğme hâlâ
aktif ve hiçbir geri bildirim vermiyor.

**Kök sebep (ilk teşhisimden farklı çıktı):** sabır ZATEN harcanıyordu
(`requestCounterPatienceCost: 1`) ve mağaza da uyguluyordu. Eksik olan, **durum makinesinin
buna hiç tepki vermemesiydi** — `handleRequestCounter` her çağrıda `state: session.state`
döndürüyordu, yani sabır sıfırlansa bile müşteri sonsuza dek karşı teklif veriyordu.

**Yapıldı:** geçiş `handleOffer` ile aynı sabır oranı üstünden çalışıyor. **Bütçe sabit bir
tur sayısı DEĞİL, müşterinin sabrı** — "Tatlı Dil" yeteneği `patienceMax`'i büyüttükçe
pazarlık alanı kendiliğinden genişliyor (`skill-tree · startingPatience`), ayrı bir yetenek
kancası gerekmedi. Ayrıca SON TEKLİF'te "Karşı Teklif" aracı jestteki gibi "tükendi"
işaretini alıyor.

**Ölçüm bir hatamı yakaladı.** İlk hâlde kuralı `handleOffer` ile birebir aynı yaptım.
Gerçek müşterilerle ölçtüm (400 spawn, 180 satıcı): **177'si SON TEKLİF'i hiç görmeden
reddediyordu.** Sebep `finalOfferPatienceRatio` (0,28) — sabrı 3–4 olan müşteride tam sayı
sabır o pencereye hiç düşmüyor. Karşı teklif istemek hakaret değil, oyuncunun soru
sormasıdır; alışın o soruyla uyarısız kapanması hem sert hem öğretici değil. Kuralı
yumuşattım: tükenme RED'e ancak müşteri **zaten** son sözünü söylediyse dönüşüyor.

| Ölçüm (400 spawn · 180 satıcı) | İlk hâl | Düzeltilmiş |
|---|---|---|
| Tur dağılımı | 2:35 · 3:142 · 4:3 | 3:35 · 4:145 |
| İlk turda red | 0 | 0 |
| **Uyarısız red** | **177** | **0** |
| Hiç kapanmayan | 0 | 0 |

**Testler:** `src/domain/counter-budget.test.ts` — 16 test. Aralık taraması (sabır
2–14) her değerde RED öncesi SON TEKLİF geldiğini sabitliyor; yetenek testi bütçenin
`patienceMax` üstünden büyüdüğünü doğruluyor.

**Tarayıcıda doğrulandı:**

```
tur | durum      | sabır      | düğme
  0 | AÇIK       | Sabır: 2/3 | aktif
  1 | AÇIK       | Sabır: 1/3 | aktif
  2 | SON TEKLİF | Sabır: 0/3 | tükendi
mesaj: "Son sözüm 28.108 ₺. Daha fazla uzatmayalım."
```

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

#### YENİ · İlk açılışta ad ve portre ekranı — ✅ YAPILDI
`src/state/save.ts` · `src/state/gameStore.ts` · `src/ui/shell/ProfileDialog.tsx` ·
`src/ui/App.tsx` · `AppShell.css`

Kullanıcı: *"Oyunu açar açmaz ilk ekranda isim giriniz ve profil fotosu seçiniz ekranı
gelsin."*

**Yeni ekran YAZILMADI, var olan pencere yeniden kullanıldı.** `ProfileDialog`'a
`mode="welcome"` eklendi. Gerekçe: ad doğrulaması, odak tuzağı ve avatar ızgarasının
roving tabindex'i o pencerede zaten çözülmüş; ikinci bir kopya o çözümlerin birinde
sessizce geride kalırdı. Karşılama kipinde farklı olanlar: **İptal yok**, **dış tıklama
ve Escape kapatmaz** (kapatılacak bir "önceki hâl" yok), başlık *"Hoş geldin, sarraf"*,
düğme *"Dükkânı Aç"*.

**Ad alanı BOŞ açılır.** Düzenleme kipinde varsayılan `Kuyumcu` doludur; karşılamada da
dolu gelseydi oyuncu tek dokunuşla `Kuyumcu Kuyumculuk`'a razı olurdu — istenen "isim
giriniz" ekranı değil, atlanan bir ekran olurdu.

**KAPALI DÜĞMENİN GÖRÜNÜMÜ EKSİKTİ.** Alan boş açılınca ilk görülen hâl kapalı düğme
oldu ve düğme pırıl pırıl duruyordu — basınca hiçbir şey yapmayan bir düğme oyuncuya
"oyun bozuk" dedirtir. `.profileDialog__save:disabled` eklendi.

**ESKİ KAYITLAR — bu maddenin can alıcı yeri.** `SaveFile.profileSetupDone` sonradan
eklendi, eski kayıtlarda YOKTUR ve orada varsayılanı **`true`** olmalıdır
(`save.profileSetupDone ?? true`). `?? false` olsaydı yıllardır oynayan bir oyuncuya,
dükkânı kurulmuşken, "adın ne?" diye sorulurdu. `SAVE_VERSION` artmadı; alan eksik olan
dosya olduğu gibi yüklenmeye devam ediyor.

**Oyun zamanı da duruyor** (§4, diğer modallarla aynı kural): oyuncu adını yazarken saat
işleseydi, daha tezgâhın arkasına geçmeden müşteri kaçırırdı.

**ÖLÇÜM BİR YAN HATAYI AÇIĞA ÇIKARDI — "Kaydı sil" sözünü tutmuyordu.** Karşılama
ekranının doğrulaması sırasında görüldü: kaydı silen oyuncuya, uygulamayı kapatıp açınca
ekran gelmiyordu. Sebep `resetGame`'de değil: `clearSave()` iki anahtarı da siliyor, ama
oyun ekranda açık kaldığı için sayfa kapanırken çalışan otomatik kayıt
(`App.tsx` · `pagehide` → `flush`) dosyayı **aynı durumdan geri yazıyordu**. Onay
metnindeki *"yeni oyun bir sonraki açılışta başlar"* cümlesi yalandı. Düzeltme
`save.ts`'te tek noktada: `suspendSaves()` / `resumeSaves()` — kilit `commitRawSave`'in
başında olduğu için `writeSave` de `patchSave` de kaçamıyor. Yazmamak `true` döner
(karar, hata değil), yoksa arayüz yanlışlıkla *"Kayıt yazılamadı"* uyarısı gösterirdi.
Kilit modül ömürlüdür; sayfa yenilendiğinde kendiliğinden kalkar.

**Testler:** `src/state/profile-setup.test.ts` — 18 test. Bekçi olanlar: *alanı olmayan
kayıtta varsayılan `true`*, *geçersiz ad ekranı kapatmaz*, *yalnız `profile`e dokunur —
para/seviye/XP/stok aynı kalır*, *sildikten sonra otomatik kayıt dosyayı geri yazamaz*.

**Tarayıcıda ölçüldü (390×844 ve 390×667):**
ilk açılışta pencere geliyor · ad alanı boş, düğme kapalı · Escape ve dış tıklama
kapatmıyor · saat `09:00`da donuyor, `Dükkânı Aç`tan sonra akıyor · kayda
`{"jewelerName":"Alvera","profileSetupDone":true}` yazılıyor · yeniden yüklemede ekran
çıkmıyor · **alanı silinmiş (eski sürüm) kayıtla da çıkmıyor, profil korunuyor** ·
`Kaydı sil` → yeniden yükle → ekran geri geliyor, depoda anahtar kalmıyor. İki
yükseklikte de pencere ekrana sığıyor (812/635 px), giriş ve düğme 44 px. Konsol
hatası yok.

#### YENİ · Ayarlar düğmesinin yeri ve ikonu — ✅ YAPILDI
`src/ui/shell/StatusStrip.tsx` · `src/ui/icons.tsx` · `AppShell.css`

Kullanıcı: *"ayarlar düğmesini oradan alıp yukarıda isim sv. satırına koy, en mantıklı yer
4x'in yanı. Ayrıca yanlış duruyor, ayarlar olduğunu belli edecek bir ikonla değiştir."*

**İkon gerçekten yanlıştı.** Eski `IconSettings` bir çember ve sekiz ışındı — yani
GÜNEŞ/parlaklık ikonu. Ekranda "ayarlar" diye okunmuyordu. Sekiz dişli bir çarkla
değiştirildi.

**Yer:** Dükkan ekranındaki yüzen baloncuk kaldırıldı; düğme üst şeride, HIZ GRUBUNUN
İÇİNE, 4x'in hemen yanına alındı. Anlamı da doğru: ikisi de "oyunu nasıl oynuyorum"
ayarı, oyunun içeriğine değil çerçevesine ait.

**AYRI SÜTUN OLARAK DENENDİ VE OLMADI.** Önce şeride beşinci bir sütun olarak eklendi;
ölçüm sütunların doğal toplamını **359 px**, kullanılabilir alanı **326 px** gösterdi ve
fark profil adını eziyordu (`Kuyumcu` 55 px isterken **13 px** alıyordu). Grubun içine
alınınca kendi kenarlığını, boşluğunu ve dolgusunu hız grubuyla paylaşıyor.

**EKRAN GÖRÜNTÜSÜNÜN YAKALADIĞI ASIL KIRILMA.** Sayılar yalnız "ad kırpılıyor" diyordu;
görüntüde ise **"Sv" ile "1" alt alta düşmüştü** — seviye satırı kendi içinde sarıyordu.
`white-space: nowrap` ile düzeltildi: daralınca metin artık sarmaz, kırpılır. Bu, şeridin
beş sütuna çıkmasından bağımsız olarak da doğru davranış.

Boşluklar sıkıştırıldı (şerit 8→6 px, kenar 16→12 px, çip içi 6→4 px) ve ad yeniden
sığdı.

**Kalan sınır, dürüstçe:** 390 px'de beş bilgi (avatar+ad+seviye, gün/saat, nakit, hız,
ayar) yan yana durunca ad için pay dardır. `Kuyumcu` sığıyor ama daha uzun bir ad
(`Abdurrahman` gibi) üç nokta ile kısalır. Bu bir kırılma değil, `text-overflow: ellipsis`
ile tasarlanmış kademeli davranış. Tam adın her zaman görünmesi isteniyorsa XP sayısı
(`0/580`) şeritten çıkarılabilir — altındaki çubuk aynı bilgiyi zaten gösteriyor.

**Doğrulandı:** 913 test geçiyor; beş ekranda yatay taşma ve konsol hatası yok; düğme
tıklanınca ayarlar açılıyor, Escape kapatıyor.

#### YENİ · Ayarlarda ses, titreşim ve dil — ✅ YAPILDI (davranış sonra bağlanacak)
`src/domain/preferences.ts` (yeni) · `src/state/save.ts` · `src/state/gameStore.ts` ·
`src/ui/shell/SettingsDialog.tsx`

Kullanıcı istedi: "ses açma kapama, titreşim ve dil seçeneği ekler misin, sonradan
bağlarız."

**Çözülmesi gereken çelişki.** `SettingsDialog`'un başlığı bu üç anahtarın *kasten*
konulmadığını yazıyordu; gerekçesi de doğruydu: çalışmayan bir anahtar, oyuncuya
kapattığını sandığı şeyi kapattırır. Gerekçe çöpe atılmadı, **karşılandı**: tercih
gerçekten saklanıyor ve kayıttan geri geliyor, ama pencere bunu açıkça söylüyor —
*"Aşağıdakiler kaydedilir, ama etkileri henüz bağlanmadı."* Sessizce hiçbir şey yapmayan
bir anahtar ile "bunu şimdilik not aldım" diyen anahtar aynı şey değildir.

**Kayıt uyumluluğu — asıl risk buydu.** `preferences` alanı `profile` ile birebir aynı
desende: isteğe bağlı, eksikse varsayılana düşer, `SAVE_VERSION` artırılmadı. Alan
eklenmeden önce yazılmış kayıtlar bozulmuyor.

Kalıcılık `persistProfile`'ın gerekçesini paylaşıyor (kozmetik tercih gün ortasında
değiştirilebilmeli, gün sonu checkpoint'ini beklememeli); kodu tekrarlamak yerine ortak
`patchSave` yardımcısına çıkarıldı.

**Testler:** `src/state/settings.test.ts` — 14 yeni test (toplam 22). Kritik olanlar:
eksik alanlı ESKİ KAYDIN varsayılana düşüp kaydın geri kalanını bozmaması; bozuk değerlerin
(`language: 'de'`, `soundEnabled: 'hayır'`, `null`, dizi olmayan) çökertmemesi; geçerli bir
tercihin bozuk komşusu yüzünden kaybolmaması; arayüzden gelen geçersiz dil kimliğinin kayda
sızmaması; ve tercihlerin nakit/stok/seviyeye dokunmaması.

**Tarayıcıda doğrulandı (390×844):** ses kapatıldı + English seçildi → kayıtta
`{"soundEnabled":false,"vibrationEnabled":true,"language":"en"}`; **sayfa yenilendi, ikisi de
geri geldi.** iPhone SE'de (375×667) kutu 607px, taşma yok, "Kapat" görünür; odak tuzağı yedi
denetimi dolaşıp başa dönüyor. 360×500'de kutu kaydırmaya geçiyor ve "Kapat" ulaşılabilir
kalıyor. Konsol hatası yok.

**SES DÜZEYİ KAYDIRICISI (ikinci tur).** Kullanıcı ses/efekt ayrımı istemedi — tek "Ses"
anahtarı kaldı — ve düzey için kaydırıcı istedi.

*C2 ile çelişmiyor:* orada hızlı stok penceresindeki kaydırıcılar KALDIRILMIŞTI, çünkü
oradaki değer kesin bir sayıydı (kaç çeyrek) ve yazmak doğruydu. Ses düzeyi sürekli ve
yaklaşık bir tercihtir; kimse "%65 istiyorum" diye düşünmez, kulağıyla ayarlar. Kaydırıcının
tam yeri burası.

- Değer **0–100 tam sayı**, ondalık oran değil: kayda yazılan ondalıklar sürüm sürüm kayar
  (0.7000000000000001). Sesi bağlarken çevirmek tek bölme: `gain = soundVolume / 100`.
- Varsayılan **%70** — hem yukarı hem aşağı yer bırakır; tam açık başlamak oyunu sessiz
  ortamda ilk kez açanı şaşırtır.
- `VOLUME_STEP` yalnız kaydırıcının davranışı; normalizasyon adıma **yuvarlamaz**, yani
  başka yoldan gelen 73 geçerli kalır.
- **Ses kapalıyken kaydırıcı devre dışı** ve alt metin nedenini söyler. Kapalı sesin düzeyini
  ayarlatmak, tam da bu pencerede kaçındığımız "hiçbir şey yapmayan denetim" olurdu.
- Odak tuzağının seçicisi düzeltildi: yalnız `button` arıyordu, kaydırıcı bir `input` ve
  listeye girmiyordu. Şimdilik ortada durduğu için tuzak yine de tutuyordu, ama ilk ya da son
  denetim hâline geldiği gün sessizce kırılırdı.

**Testler:** `settings.test.ts` toplam 39. Sınırlar (0 ve 100), aralık dışı (−40 → 0,
999 → 100), ondalık yuvarlama (70,4 → 70 · 70,6 → 71), geçersiz tipler (metin, NaN, Infinity,
null, nesne) varsayılana düşer, adımın katı olmayan 73 korunur, eski kayıtta alan yokken
komşu tercihler bozulmaz ve **sesi kapatmak düzeyi silmez** (tekrar açınca eski düzey yerinde).

**Tarayıcıda doğrulandı (375×667):** düzey %70 → %30, kayda `soundVolume:30` yazıldı; ses
kapatılınca kaydırıcı `disabled` ve satır *"Ses kapalıyken ayarlanamaz"*; yenilemeden sonra
ikisi de geri geldi; ses tekrar açılınca düzey %30 olarak yerinde. Dokunma hedefi 44 px,
kutu 607px/667px içinde ve kaydırılabilir, "Kapat" ulaşılabilir. Konsol hatası yok.

**Bağlanınca yapılacak tek şey** "hazırlanıyor" ibarelerini kaldırmak; tercih zaten yerinde.

##### TİTREŞİM BAĞLANDI — `src/ui/haptics.ts` (yeni)

Olay → desen tablosu; sesle aynı `soundCue` akışından besleniyor ama **sesten
bağımsız**: sesi kapatıp titreşimi açık tutmak (toplu taşımada oynamak) geçerli bir
tercihtir, ikisi ayrı ayarlardır.

| olay | desen (ms) | neden |
|---|---|---|
| `deal` | 18 | anlaşma kapandı — tek, net |
| `deny` | 22 · 40 · 22 | reddedildi — **çift darbe**, fark elde hissedilsin |
| `coins` | 12 | alım onayı — hafif tık |
| `customer` | 12 | müşteri geldi |
| `chime` | 30 | gün kapandı |
| `levelup` | 14·45·14·45·26 | kutlama ritmi |
| `test` | **YOK** | mihenk/ölçüm araçları HER dokunuşta tetikleniyor; titreşim koymak telefonu sürekli titretirdi |

**PLATFORM GERÇEĞİ — oyuncuya söyleniyor.** `navigator.vibrate` Android/Chrome'da var,
**iOS Safari'de YOK** ve Apple'ın web'e açtığı bir haptik API'si de yok. Bu bir hata değil,
platform sınırı. Ayar satırı cihaza göre konuşuyor: desteklemeyen telefonda
*"Bu cihaz titreşimi desteklemiyor"* yazıyor. Aksi hâlde oyuncu açık bir anahtarın neden
hiçbir şey yapmadığını anlamazdı — tam da bu pencerede kaçındığımız şey.

*(Chromium'da ölçüldü; iOS bu ortamda test edilemiyor, oradaki davranış API'nin
yokluğundan biliniyor.)*

Ayardan kapatılınca elde süren darbe kesiliyor (`stopHaptics`).

**Testler:** `src/ui/haptics.test.ts` — 9 test. API yokken çökmeme, tarayıcı reddederse
oyunun etkilenmemesi, kapalıyken titreşmeme, **ölçüm aracının titreşmemesi**, ret deseninin
kabul deseninden farklı olması, art arda gelen olayların tek uzun titreşime dönüşmemesi ve
bütün desenlerin 200 ms altında kalması.

**Tarayıcıda ÖLÇÜLDÜ:** `navigator.vibrate` sarmalanıp çağrılar toplandı. Gün kapanışında
tam olarak bir çağrı gitti, deseni **`[30]`** — tablodaki `chime` deseniyle birebir.
Titreşim kapatılınca yeni çağrı **olmadı**; yalnız kapatma komutu (`0`) göründü. Konsol
hatası yok.

##### EKRAN GÖRÜNTÜSÜNÜN YAKALADIĞI, SAYILARIN KAÇIRDIĞI HATA

Kaydırıcının dokunma hedefini (44 px), değerini ve kayda yazılışını ölçmüş, hepsi doğru
çıkmıştı. Ekran görüntüsüne bakınca **kaydırıcının kendi satırının dışına taşıp "Dil"
satırının üstüne bindiği** görüldü. Ölçtüğüm şey kaydırıcının kendi boyuydu; ölçmediğim
şey **satırının içinde durup durmadığıydı**.

Sebep genel bir yerleşim hatasıydı, yalnız yeni satırın değil: `.settingsBox` bir flex
kolonu ve `max-height` taşıyor; flex öğelerinin varsayılanı `flex-shrink: 1` olduğu için
içerik kutuya sığmadığı anda BÜTÜN satırlar eziliyordu. Tek satırlık satırlar
`min-height: 58px` sayesinde kurtuluyordu, iki katlı ses düzeyi satırı kurtulmuyordu:

| | doğal yükseklik | çizilen | sonuç |
|---|---|---|---|
| önce | 100 px | **58 px** | kaydırıcı satırdan **43 px** taştı |
| sonra | 112 px | 114 px | taşma yok |

Düzeltme `.settingsBox > * { flex-shrink: 0; }` — satır kendi boyunu korur, kutu kaydırılır
(`max-height` + `overflow-y: auto` bunun için zaten yerindeydi). 375×667 ve 390×844'te
çakışan satır 0, en alta kaydırınca "Kapat" erişilebilir.

**Kural:** yerleşim doğrulamasında bir öğenin kendi ölçüsü yetmez; **kabına göre** konumu da
ölçülmeli. Ekran görüntüsüne bakmak pazarlık konusu değil.

##### ÖLÇÜM TUZAĞI — `localStorage` anahtarını regex'le arama

Kaydı `Object.keys(localStorage).find(k => /save/i.test(k))` ile okuyan bir doğrulama
betiği, ses kapatıldığı hâlde kayıtta `soundEnabled: true` gösterdi. Kodda hata yoktu:
`save.ts` **iki** anahtar tutuyor — `mihenkaynak.save.v1` ve `mihenkaynak.save.v1.backup` —
ve yedeğin işi tam olarak BİR ÖNCEKİ kaydı saklamaktır. Betik yedeği yakalamış, yani kasten
eski olan veriyi okumuş. Anahtarı açıkça yazan koşu her adımda doğru çıktı
(`{"soundEnabled":false,"soundVolume":30,...}`).

**Kural:** bu projede kayıt doğrulaması yapılırken anahtar **tam adıyla** okunmalı.

#### A10 · A · Ses — ✅ YAPILDI (sentezle üretildi)
`tools/synth-audio.py` (yeni) · `public/assets/audio/` (yeni) · `src/ui/audio.ts` (yeni)

**Dosyalar kayıt değil, ÜRETİLMİŞ.** Sekiz efekt Python + numpy ile sentezlendi; kaynağı
`tools/synth-audio.py`. Telif sorunu yok, tını bir parametre: sayıyı değiştirip yeniden
çalıştırmak yeterli.

| ses | ne zaman | tasarım notu |
|---|---|---|
| `coins` | sarrafiye alındı | Metal disk modları HARMONİK DEĞİLDİR; oranlar bilerek uyumsuz (1 / 2,36 / 3,91 / 5,12). Harmonik seri "şıngırtı" değil "flüt" verirdi. İki çeyrek arka arkaya — tek vuruş "para" değil "zil" gibi duyuluyor. |
| `deal` / `deny` | pazarlık kapandı / kapanmadı | Do→Sol beşlisi · alçak ve inen |
| `chime` | gün kapanışı | çan modları, uzun sönüm |
| `customer` | müşteri karşılandı | kapı zili, iki nota |
| `test` | mihenk / test aracı | tonal değil, dar bantlı gürültü — sürtünme tınısı |
| `levelup` | seviye atlandı | yükselen üçlü |
| `tap` | (bağlanmadı) | her tuşa ses yorucu olurdu; dosya hazır, karar sizin |

**NYQUIST KORUMASI — sessizce cızırtı üreten hata sınıfı.** İlk üretimde `coins` sesinin
kısmî tonları 26 kHz'e çıkıyordu ama dosya 22 kHz'de yazılıyordu: Nyquist üstü her bileşen
ALIAS yapar, geriye katlanıp cızırtı olur. Üretece koruma eklendi; 44,1 kHz'e çıkarınca bile
üç kısmî tonun sınırı aştığını **koruma yakaladı ve üretimi durdurdu**. Mod sayısı buna göre
seçildi. Artık biri frekansı yükseltirse ses sessizce bozulmaz, betik hata verir.

Toplam **215 KB** (WAV). `coins` 44,1 kHz — yüksek kısmî tonlar tınının kendisi; kalanı
22 kHz. ffmpeg olmadığı için WAV; aynı adlarla `.ogg` konursa yalnız `AUDIO_FILES` tablosu
değişir, kodda başka değişiklik gerekmez.

**Oynatıcı üç gerçek çökme sebebine göre yazıldı:**
1. *Tarayıcı otomatik oynatmayı engeller* — ilk dokunuşta açılır; o ana kadarki istekler
   yutulur, KUYRUĞA ALINMAZ (üç dakika sonra topluca çalan sesler hata gibi duyulurdu).
2. *Dosya olmayabilir* — eksik/bozuk dosya oyunu durdurmaz, o ses sessiz kalır ve bir daha
   denenmez.
3. *Testte `window` yok* — modül import edilebilir ve çağrılabilir kalır.

**Katman ayrımı korundu:** mağaza ses API'sini import ETMEZ, yalnız `soundCue` bırakır
(`tabHomeSignal` deseni, kayda girmez); sesi sunum katmanı çalar. Seviye atlama alan
katmanında olduğu ve orası SAF kalmalı olduğu için, arayüzde seviye artışı izlenerek
yakalanıyor.

**Testler:** `src/ui/audio.test.ts` (7) sessiz çökmeme sözleşmesi;
`settings.test.ts`e 5 test daha — işaretin kayda SIZMAMASI ve sayacın aynı sesi arka arkaya
çalabilmesi (art arda iki gün kapatan oyuncu ikinci çanı duymalı).

**Tarayıcıda ÖLÇÜLDÜ (iddia değil):** `AudioContext` sarmalanıp çözülen dosyalar ve
başlatılan kaynaklar sayıldı.
- 8 dosyanın 8'i çözüldü, süreleri üretilenle birebir (0,055 / 0,495 / 0,3 / 0,55 / 1,15 /
  0,7 / 0,38 / 0,85 sn), tepe genlik 0,70 (kırpma yok).
- Gün kapanışında **1 kaynak çaldı** (çan).
- **Ses kapatılınca sayı artmadı** — anahtar gerçekten çalışıyor.
- Otomatik oynatma bayrağı OLMADAN: dokunmadan önce `AudioContext` hiç oluşmuyor, ilk
  dokunuşta oluşup `running` oluyor, sonra ses çalıyor.
- Konsol hatası yok.

**Yapamadıklarım:** gerçek kayıt (gerçek kasa, gerçek altın şıngırtısı) ve fon müziği —
sentezle yapılan müzik yapay duyulur. Müzik dışarıdan gelirse bağlanması kolay.

#### (eski kayıt) A10 · A · Ses altyapısı bağlı, dosya yok
`src/ui/audio.ts` · `public/assets/audio/{sfx,music}/`

9 SFX ve müzik için yollar tanımlı, klasörler **boş**. İşletme ekranı ise "Müzik açık ·
Efekt açık" diyor.

**Yapılacak:** ya dosyalar eklensin, ya ayar varsayılanı kapalı gelsin ve "Ses paketi
yüklenmedi" yazsın. Oyuncuya çalışmayan bir açık/kapalı düğmesi gösterilmesin.

---

### B. Tasarım ve oynanış önerileri

#### B1 · T · Cumartesi riski oyuncunun baktığı yerde yazmıyordu — ✅ YAPILDI
`src/ui/screens/ShopScreen.tsx` · `IdleWorkbench`

Hafta sonu boşluğu mekaniğinin bütün amacı, cuma kapanışıyla pazartesi açılışı arasında
körlemesine alım yapmanın riskini yaşatmak. Cumartesi dükkân kartında bu hiç geçmiyordu.

**Aramada çıkan asıl kanıt:** alan katmanı bu günü zaten adıyla tanıyor —
`calendar.ts · isBlindTradingDay` — ve bu yordam **projede hiçbir yerden çağrılmıyordu**.
Kural yazılmış, ekrana hiç bağlanmamış.

**Yapıldı:** dükkân açık + piyasa kapalı günde tek uyarı satırı: *"Cumartesi · piyasa kapalı,
dükkân açık — Fiyat cuma kapanışında donuk. Bugün aldığın mal Pazartesi açılışına kadar fiyat
riski taşır."* Gün adı da, "hangi güne kadar" da takvimden türüyor; elle yazılmadı.

**Tarayıcıda doğrulandı:** gün 6 (Cmt) → satır çıkıyor; gün 7 (Paz) → çıkmıyor, onun yerine
mevcut "dükkân kapalı" satırı var. İkisi çakışmıyor.

**Testler:** `src/domain/visible-risk.test.ts` — iki haftalık taramada körlemesine gün tam
olarak iki cumartesi; piyasanın açık olduğu hiçbir günde çıkmıyor; pazar bu satırı almıyor.

#### B2 · T · İşçilikli ürün ekonomik olarak baskılanmış — ❌ ÖLÇÜMLE ÇÜRÜTÜLDÜ

**Bu maddeyi ben yanlış yazmışım ve "paketteki en önemli tasarım maddesi" diye
işaretlemişim. Doğru değil.** Kaydı düzeltiyorum.

İki hata vardı:

1. **"Otomatik perakende kanalı" diye bir şey yok.** Kodda zamana bağlı kendiliğinden satış
   yapan hiçbir yol bulunmuyor (arandı: `service.ts` bunu açıkça yazıyor, gün kapanışında da
   böyle bir hareket yok). Madde, olmayan bir mekanizmayı tarif ediyordu.
2. **Vitrin baskılanmış değil.** Aynı işçilikli üründe kanalların vaat ettiği net getiri
   ölçüldü (`ring_18k#3`): vitrin **28.904 ₺**, toptancı **17.403 ₺**. Vitrin toptancıdan
   %66 daha fazla veriyor — baskılanan taraf o değil.

Vitrin tezinin vaadi ile vitrin müşterisinin gerçekten ödediği de karşılaştırıldı: sapma
−%15,5 ile +%30,9 arasında, sıfırın etrafında dağılmış. Yani tez bir tahmin ve makul
kalibre; sistematik bir yalan yok.

**Alınan ders:** eski tabanda yapılmış bir ölçümü yeni tabanda tekrarlamadan pakete
yazmışım. Bu maddeye dayanarak "otomatik perakendeyi sarrafiyeye kısıtla" değişikliği
yapılsaydı, var olmayan bir sorun için ekonomi bozulacaktı.

#### B3 · T · Ayar bantları birbirinden ayrışmıyor — ✅ YAPILDI
`src/domain/customer-pricing.ts` · `CRAFTED_BANDS`

Bu taban üzerinde yeniden ölçüldü ve **doğru çıktı**:

| ayar | alış ortası | satış ortası | brüt marj |
|---|---|---|---|
| 8K | 0,2915 | 0,3900 | **%33,8** |
| 14K | 0,5125 | 0,6850 | **%33,7** |
| 18K | 0,6570 | 0,8785 | **%33,7** |
| 22K | 0,8025 | 1,0725 | **%33,6** |

Dördü 0,2 puan içinde. Ayar kârlılık açısından hiçbir şey ifade etmiyor; 8K almakla 22K
almak arasındaki tek fark ölçek.

**ÖNCE YANLIŞ TEŞHİS KOYDUM, SONRA KULLANICI YAPIYI ANLATTI VE ÇÖZÜLDÜ.**

##### Yanlış teşhisim ve nasıl düzeldi

"Ayarı ayrıştırmak vaat/ödeme uyumunu bozuyor" demiş, engel olarak
`estimateBand`in temkin indirimini göstermiştim. Ölçümü **gerçek ayara göre**
gruplamıştım ve 8K'da +%40 sapma görmüştüm. Yanlıştı: `ring_8k` diye bir şablon yok —
o 8K malların **hepsi sahteydi** (18K/14K beyanlı, gerçekte 8K). Yani ölçtüğüm şey
kalibrasyon hatası değil, **sahtecilik cezasıydı** — oyunun tam olarak yapması gereken şey.

Beyan ile gerçeği ayırınca tablo netleşti:

| | n | tez vaadi − müşteri ödemesi |
|---|---|---|
| **dürüst mal** (beyan = gerçek) | 401 | **−%4,7** |
| sahte mal (beyan ≠ gerçek) | 66 | +%35,1 |

Dürüst malda uyum zaten sağlamdı; ortalama hafif temkinli (eksi yönde), ki tahmin için
doğru yön. Ortada düzeltilecek bir "ekonomi çekirdeği hatası" yoktu.

##### Asıl sebep: milyem orantısı

Kullanıcı yapıyı anlattı — "milyem olarak kodlamıştık, 14'ün milyemine göre diğerlerine
entegre etmiştik" — ve doğrulandı (sapma %0,5 altında):

    alış(k)  = milyem(k) × 0,876
    satış(k) = milyem(k) × 1,171

Marj `satış / alış` olduğu için **milyem sadeleşiyor**. Yani dört ayarın aynı marjı vermesi
bir ayar hatası değil, yapının **matematiksel zorunluluğuydu**. Bu anlaşılmadan yapılan her
deneme kaçınılmaz olarak başarısız oluyordu.

##### Çözüm: işçilik milyemle ölçeklenmez

Bir yüzüğü işlemenin emeği, içindeki altının ayarına bağlı değildir; aynı model 8K da olsa
22K da olsa tezgâhta aynı işi ister. O hâlde satış fiyatının işçilikten gelen kısmı milyemle
orantılı OLMAMALI:

    satış(k) = milyem(k) × taban + işçilik payı        (işçilik payı sabit)

Marj farkı buradan **kendiliğinden** çıkıyor — elle ayarlanmış bir tablo değil:

| ayar | marj eski → yeni | metal üstü kat |
|---|---|---|
| 8K | %33,8 → **%41,9** | 1,242 |
| 14K | %33,7 → **%33,7** (çıpa, değişmedi) | 1,171 |
| 18K | %33,7 → **%31,3** | 1,150 |
| 22K | %33,6 → **%29,2** | 1,137 |

**14K aynen korundu** çünkü ekonominin tamamı onun milyemine göre kurulmuştu; çıpayı
oynatmak her şeyi oynatmak olurdu. **Alış bantlarına hiç dokunulmadı**: dükkânın satıcıya
ödediği fiyat değişmedi, değişen müşterinin ödediği.

**Hız yarısı geri geldi** (`showcase-weight · KARAT_LIQUIDITY`, 8K 0,75 → 22K 1,30): dar
marjın karşılığı hızlı devir. İkisi birlikte anlamlıdır; biri kaldırılırsa öbürü de
kaldırılmalıdır — bu, dosya başlıklarına da yazıldı. Vitrin ağırlığında **beyan edilen ayar**
kullanılıyor: vitrine bakan müşteri de oyuncu gibi etiketi görür, malın içini bilmez.

##### Değişiklik sonrası ölçüm

Dürüst malda uyum **−%4,7 → −%3,8** (hafif iyileşti), sahte mal cezası **+%35,1 → +%28,9**
(yerinde duruyor). **863 test geçiyor** — 47 invariant ve 6 uzun vadeli ekonomi testi dâhil.

**Testler:** `src/domain/karat-margin.test.ts` — 7 test. Marjın ayarla daralması, 14K
çıpasının aynen korunması, alış tarafının hâlâ saf milyem orantılı olması, satış tarafının
ARTIK OLMAMASI (karşı-olgu: saf orantılı olsaydı `satış/milyem` dört ayarda da eşit çıkardı —
eski yapıda oran 1,004 idi, şimdi 1,09) ve hiçbir ayarda satışın alışın altına düşmemesi.

---

##### (Eski kayıt — geri alınan ilk deneme)

Önceki turda "hız yarısının dayanacağı mekanik yok" demiştim; **yanılmışım**, `pickWeighted`
zaten vardı ve B4 onun üstüne kuruldu. Engel orada değilmiş. İki yarı da denendi:

*Marj yarısı:* bantlar %40 / %36 / %31 / %28 olacak şekilde ayrıştırıldı (ortalama %33,75,
eskisi %33,7 — toplam güç korunuyor), alış bantlarına dokunulmadan.

*Uyum yarısı:* tezin vaadi de aynı tablodan türetildi.

**Kırılan yer:** vitrin tezinin vaat ettiği net ile müşterinin gerçekten ödediği tutmuyor —
üstelik **değişiklikten ÖNCE de tutmuyordu**:

| ayar | mevcut hâl | deneme sonrası |
|---|---|---|
| 8K | **+%40,0** | +%13,1 |
| 14K | −%9,5 | **−%25,8** |
| 18K | +%2,6 | **−%29,0** |

Sebebi ölçüldü: `estimateBand`in ürettiği `estMetal`, ağırlık değerinin ayar oranı kadarı
DEĞİL — içinde ürüne göre değişen (~0,76–0,79) ayrı bir **temkin indirimi** var
(18K'da 0,572 / metal oranı 0,75; 14K'da 0,464 / 0,585). Müşteri fiyatı formülüyle aynı
tabana oturmuyor. Bu çözülmeden ayarı ayrıştırmak uyumu iyileştirmiyor, bozuyor.

**Hız yarısını tek başına bırakmak daha kötüydü:** marj farkı olmadan yüksek ayar düpedüz
üstün olurdu — B3'ün şikâyet ettiği eşitlikten de kötü bir durum. Bu yüzden ayar
`showcase-weight`e de girmedi; orada yalnız yaşlanma var.

**Sıradaki iş bu değil, altındaki:** `estimateBand` ile `customerPriceBand` aynı tabana
oturtulmalı. O yapılmadan ayar bantlarına dokunmak, ölçülebilir biçimde zarar veriyor.

#### B4 · T · Vitrin yaşlanması — ✅ YAPILDI
`src/domain/showcase-weight.ts` (yeni) · `customer-spawn.ts` · `StockScreen.tsx`

Vitrin müşterisi hedefini **düzgün dağılımla** seçiyordu, yani vitrine konan ürün süresiz
olarak aynı çekiciliği koruyordu. Koy ve unut: vitrin bir karar değil, depoydu.

**Eksik sandığım mekanik zaten varmış.** Önceki turda "hızın dayanacağı bir mekanik yok"
demiştim; `Rng.pickWeighted` projede mevcut ve **`pick` ile tam olarak aynı sayıda (bir)
çekim harcıyor**. Determinizm (GDD 28.3) bu yüzden korundu: tohum zinciri değişmedi, yalnız
hangi ürünün seçildiği değişti. 852 testin tamamı geçmeye devam ediyor.

**Ağırlık:** 0. günde 1,0 → 6. günde 0,35 (ölü stok eşiğiyle aynı gün) → sonra sabit.

| gün | 0 | 1 | 2 | 3 | 4 | 6+ |
|---|---|---|---|---|---|---|
| ağırlık | 1,000 | 0,892 | 0,783 | 0,675 | 0,567 | 0,350 |

**Sıfıra inmiyor, bilerek.** Sıfır ağırlık ürünü ulaşılamaz kılardı; oyuncu satamadığı bir
malı slot işgal ederken seyrederdi. Yaşlanma cezalandırır, kilitlemez.

**Ölçülen etki** (20.000 çekim, 4 ürünlük vitrin, biri 6 günlük): bayat mal **%10,7**, taze
eşi **%31,4** — düzgün dağılımda ikisi de %25 olurdu. Aynı mal beklemekle ilgisinin üçte
ikisini kaybediyor.

**Oyuncuya görünüyor:** stok satırında **"Vitrinde bayatladı"** rozeti, mekanik eşikle aynı
günde yanıyor. Söylenmeseydi B5'te düzelttiğimiz hatanın aynısı olurdu — işleyen ama
görünmeyen mekanik.

**Testler:** `src/domain/showcase-aging.test.ts` — 12 test. İlgi asla sıfırlanmaz, toplam
ilgi büyümez (ağırlık payı dağıtır, yaratmaz), rozet ile mekanik aynı gün, hepsi aynı yaştaysa
dağılım düzgün kalır (eski davranış).

**Not:** B5'in başlık satırı artık "ürün başına **ortalama**" diyor. Toplam sabit olduğu için
ortalama hâlâ tam olarak %20/n; ama tek tek ürünler ayrıştığı için "ortalama" demek şart.

#### B5 · T · Vitrin slot seyrelmesi gösterilmiyordu — ✅ YAPILDI
`src/domain/purchase.ts` · `src/ui/screens/StockScreen.tsx`

Vitrin müşterisi hedefini tek tek seçiyor (`customer-spawn` · `showcaseRng.pick`), yani
vitrindeki her yeni ürün diğerlerinin şansını böler: n ürün varsa her birinin şansı
**%20 / n**. Oyuncu bunu hiçbir yerden göremediği için vitrini doldurmayı bedelsiz sanıyordu.

**Yapıldı:** Stok başlığının altına tek satır. Sayı `showcaseTargetChancePerItem` ile
türetiliyor ve spawn artık aynı sabiti (`SHOWCASE_TARGET_CHANCE`) kullanıyor — kural
değişirse ekrandaki oran da onunla değişir, ayrı yerde ikinci bir gerçek tutulmuyor.
Vitrin boşken satır hiç basılmaz.

**Tarayıcıda doğrulandı:** vitrin boşken satır yok; bir ürün girince
*"Vitrindeki tek ürün her alıcıda %20,0 ilgi görür"*.

**Testler:** `src/domain/visible-risk.test.ts` — tek üründe oran sabitin kendisi; ürün
eklendikçe düşüyor; **toplam ilgi sabit kalıyor** (bölüşülüyor, yaratılmıyor); boş vitrinde
sıfır.

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

**Tarayıcı doğrulaması (390×844, gerçek oyun akışı) — artık kapalı.** Bu madde uzun süre
"domain testleri geçiyor ama UI yolu hiç görülmedi" durumundaydı; sebebi C5'ti: satıcıyı
eleyip sıradaki müşteriye geçmenin yolu yoktu, harness işçilikli satıcıya hiç ulaşamıyordu.
C5 kapandıktan sonra iki koşu yapıldı — biri düzeltmeyi, diğeri düzeltmenin **fazla iş
yapmadığını** gösteriyor:

| koşu | seçilen çıkış planı | Stok başlığı önce | sonra |
|---|---|---|---|
| deney | Vitrine Koy | `Vitrin 0/8 · Arka stok 0/16` | `Vitrin 1/8 · Arka stok 0/16` |
| kontrol | Toptancıya Çıkar | `Vitrin 0/8 · Arka stok 0/16` | `Vitrin 0/8 · Arka stok 1/16` |

Yani mal vitrine yalnız vitrin tezi seçilince giriyor; yönlendirme tezden türüyor, "her mal
vitrine" değil. Konsol hatası yok.

**Kalan (ayrı iş):** Stok satırına "Vitrinde değil" rozeti ve tek dokunuşla taşıma; ayrıca
`displayStock` hâlâ yalnız işçilikliyi kabul ediyor — sarrafiye için vitrin zaten anlamsız
olduğundan bu doğru, ama Hızlı Stok penceresi `Vitrin 0/8`'in neden 0 kaldığını söylemiyor.

#### C2 · A · Hızlı Stok penceresi üç farklı giriş biçimi kullanıyordu — ✅ YAPILDI
`src/ui/screens/StockScreen.tsx` · `BullionOffer` · `Screens.css` · `Workbench.css`

Gram Altın satırı serbest yazı kutusu, diğerleri `− değer +` sayacıydı; ÜSTELİK her satırın
altında ayrıca bir kaydırıcı vardı. Pencere krem, oyunun geri kalanı lacivert.

**Tarayıcıda ölçülen asıl maliyet** (390×844): her satır **184 px**, altı satırlık liste
**1106 px**, pencerenin listesi ise **505 px**. Yani ilk satırdan sonrası katlanın altında
kalıyordu — kaydırıcıların çoğuna **erişilemiyordu bile**. Tam görünen satır sayısı: **1**.

**Yapıldı:**
- Her satırda tek kontrol: `− [yazılabilir değer] birim +`. Kaydırıcının tek gerçek faydası
  (büyük miktara hızlıca ulaşmak) değeri yazabilmekle zaten karşılanıyor; 100 g'ı yazmak
  kaydırıcıyla nişan almaktan doğrudur.
- Birim SAYININ YANINDA: bilezikte sayı adettir (`× 10 g`), gram altında gramdır. Eski
  kontrol bileziğin yanında "20 g" yazıp değeri 2 tutuyordu — yazılabilir kutuda bu
  yanıltıcı olurdu.
- Erişilebilir üst sınır kaybolmasın diye meta satırına taşındı: `Stokta 0 adet · en çok 146 adet`.
- Kaydırıcı ve `.poolAmount` / `.poolSlider` kuralları tamamen kaldırıldı.
- Pencere koyu temaya alındı (yeni renk uydurulmadı; `.page`'in kendi tokenları verildi),
  listeye alt boşluk eklendi.

**Sonuç (aynı ölçüm):** satır **184 → 99 px**, liste **1106 → 603 px**, tam görünen satır
**1 → 5**. Dokunma hedefleri 44 px. Yazarak giriş doğrulandı: 12,5 g → 52.565 ₺, `+` → 13,5 g
→ 56.768 ₺; bilezik 3 → 116.805 ₺. Konsol hatası yok.

#### YENİ · HAS gövdesindeki sayılar okunmuyordu — ✅ YAPILDI
`src/ui/screens/Screens.css` · `.hasCompact__*`

A3'te paneli `.group`tan `.counter`a taşıyınca **başlık** düzeldi ama **gövde** geride kaldı:
`.page` içindeki `.counter` da koyu olduğu için gövdenin `--text-light-*` tokenları koyu
zemine düştü. Şeffaflığı gerçekten bindirerek ölçüldü:

| metin | önce | sonra |
|---|---|---|
| `Seçilen: 0 g` | **1,05:1** | 10,71:1 |
| `Tutar 0 ₺` | **1,05:1** | 10,71:1 |
| `Değer 0 ₺` · `En çok …` | 2,76:1 | 5,54:1 |
| `HAS Al` · `HAS Sat` · `MAX` | krem düğme, koyu panelde yabancı | 4,75–5,95:1 |

Oyuncunun ayarladığı iki sayı neredeyse görünmezdi (WCAG asgarisi 4,5:1). Artık gövdenin
tamamı 4,5:1 üstünde. Akış yeniden oynandı: MAX → Devam Et → onay satırı → Vazgeç → katlama,
hepsi çalışıyor.

**Genel token değiştirilmedi.** `--text-dark-3` bu zeminde 2,76:1 veriyor ve bu bütün
ekranlardaki soluk mikro metinler için geçerli — palet kararı, kullanıcıya sorulmadan
verilmemeli. Burada yalnız ilgili satırlar bir kademe yukarı alındı.

#### C3 · A · "Alımı Bitir" hiçbir şey almıyordu — ✅ YAPILDI
`src/ui/screens/ShopScreen.tsx` · `QuickStockSheet`
Satın alma satır satır "Al" ile yapılıyor; "Alımı Bitir" yalnızca pencereyi kapatıyordu.
İsim, yapmadığı şeyi vaat ediyordu.

**Yapıldı:** düğme adı **"Kapat"**. Tarayıcıda doğrulandı — pencerede 6 satır "Al"
düğmesi, altta tek "Kapat".

#### C4 · A · Market'in 18 ürününden 11'i hiçbir yerde görünmüyor — ✅ EKRAN TARAFI YAPILDI · ekonomi tarafı karar bekliyor
Kodda yalnız 7 ürünün kuşanma yuvası var (3 çerçeve, 2 tema, 2 rozet); rozetlerin CSS'i yok,
ekrana çıplak bir `◆` karakteri çiziliyor. Dekorasyon, koleksiyon ve tüm şahsi yaşam
hedefleri — 11 ürün — yalnız bir sayacı artırıyor. 25.000.000 ₺'lik villanın karşılığı
"sahip olunan: 1" ve günde 8.000 ₺ gider. İkonların altında `WATCH · SEDAN · SPORTSCAR ·
FOUNDER` gibi İngilizce kod adları duruyor. Sekmeyi ilk açan 18 üründen 17'sini kilitli görüyor.

**KATALOG GENİŞLETİLDİ — 19 → 47 ürün.** Kullanıcı "daha fazla içerik, daha fazla lüks"
istedi. Önce boşluk ölçüldü, sonra yazıldı:

| sorun (ölçüldü) | sonra |
|---|---|
| 12. seviyeden sonra **on seviyelik ölü bölge** (11, 13–15, 17–21, 23–25 boş) | en uzun ardışık boşluk **1 seviye** |
| Dekorasyon 6., tema 7. seviyede bitiyordu — **oyunun konusu olan dükkân gelişmeyi bırakıyordu** | ikisi de 14+ seviyeye uzanıyor |
| İlk çerçeve 60.000, ilk tema 320.000 — giriş ucu pahalı | 8.000 ₺ Çırak Rozeti, 22.000 ₺ Gümüş Telkari |
| Şahsi basamak 8M → 25M → 80M → 250M zıplıyordu | 13 basamak, en büyük sıçrama ~3× |

İçerik Türk sarraflığına dayandırıldı: **Çay Ocağı** (her müşteriye uzatılan bardak),
Hereke Halısı, Kapalıçarşı Klasiği teması, Kehribar Tesbih Koleksiyonu, Mühür Yüzük
Kabinesi, Saray İşçiliği Arşivi; lüks tarafında Safkan At, Motoryat, Tarihî Yalı,
Helikopter ve tepe olarak **Özel Ada** (750.000.000 ₺ · günde 150.000 ₺ bakım).

**Kural değişmedi:** hiçbiri oyun gücü vermez. Bakım gideri YALNIZ şahsi üründe —
arayüz o toplamı "şahsi bakım" diye etiketliyor, dekorasyona gider yazmak etiketi yalan
yapardı. Bu bir testle çivilendi.

**Testler:** `src/domain/market-catalog.test.ts` — 11 test, tek tek ürünleri değil
kataloğun BÜTÜN olarak sağlığını sınıyor: ölü bölge olmaması, her kategorinin en az dört
ürün taşıması, dükkân görünümünün geç oyunda da gelişmesi, seviye arttıkça fiyatın
gerilememesi, kademelerin fiyat sırasını koruması, bakımın yalnız şahside olması ve
**hiçbir ürünün mekanik alan taşımaması** (kozmetik kuralının bekçisi).

*Test yazarken kendi hatamı yakaladı:* Kadife Örtü'yü sv4/90.000 koymuşum ama sv3'te
zaten 125.000'lik Usta Terazisi vardı — oyuncu seviye atlayınca daha ucuz bir şey
görecekti. Eğri düzeltildi.

**ÜRÜNE ÖZEL İŞARET.** 47 üründe kategori işareti yetmiyordu: 13 şahsi ürünün hepsi aynı
`✦` ile çiziliyordu. Her ürüne kendi simgesi verildi; tabloda olmayan ürün kategori
işaretine düşer, yani yeni ürün boş çizilmez. Simgeler tarayıcıda **piksel düzeyinde**
doğrulandı (canvas'a çizilip mürekkep ölçüldü: 141–1310 piksel; çizilemeyen karakter 0
bırakır). İlk ölçüm yöntemim genişlik karşılaştırmasıydı ve `◆` gibi zaten çalışan
simgeleri yanlışlıkla "çizilemiyor" diye işaretledi — yöntem değiştirildi.

Tarayıcıda: 47 kartın **47'si farklı işaret** taşıyor, işaretsiz kart yok, yatay taşma yok.

**Ekran tarafı — ✅ YAPILDI.** İngilizce kod adlarının kaynağı bulundu: kart görselinde
`product.assetReference.split(':')[1]` **doğrudan ekrana basılıyordu** ve CSS'te
`text-transform: uppercase` vardı. Yani `lifestyle:watch` → **"WATCH"**,
`lifestyle:private-jet` → **"PRIVATE JET"**, `badge:first-5kg-has-placeholder` →
**"PLACEHOLDER"**. Satır hiçbir bilgi taşımıyordu: ürünün gerçek adı hemen altında zaten
yazılıydı ("İsviçre Saati"). Satır ve artık kullanılmayan stili kaldırıldı — tarayıcıda
doğrulandı: 6 kategori, 19 kart, kalan iç kimlik etiketi **0**.

Ayrıca bir ürün açıklamasındaki geliştirici jargonu düzeltildi: *"End-game serveti için…"* →
*"Oyunun ileri aşamasındaki servet için…"*.

**SEKME KALIYOR — kullanıcı kararı.** Dolayısıyla oyun içi TL harcaması ve günlük şahsi
bakım gideri olduğu gibi bırakıldı; aşağıdaki kapsam uyarısı artık bir uyarı değil, kabul
edilmiş bir tasarım.

**Koleksiyon — ✅ YAPILDI.** Kataloğun 19 ürününden yalnız 8'inin kuşanma yuvası var
(çerçeve, tema, rozet); dekorasyon, koleksiyon ve şahsi hedefler satın alınıp yalnız bir
SAYACI artırıyordu — 25.000.000 ₺'lik villanın oyundaki karşılığı "sahip olunan: 1" idi.

Market özetinin altına katlanır **"Koleksiyonum"** bölümü eklendi: sahip olunan her ürün
adıyla, kullanılıyorsa rozetiyle, günlük bakım gideri varsa tutarıyla listeleniyor. Katlanır,
çünkü koleksiyon büyüdükçe katalogla arasına girmemeli; koleksiyon boşken hiç basılmıyor.

**Tarayıcıda doğrulandı:** boşken bölüm yok (0), "Kurucu Rozeti" alındıktan sonra
*"Koleksiyonum · 1 ürün"* çıkıyor, açılınca `◆ Kurucu Rozeti · Kullanılıyor` listeleniyor.
Yatay taşma ve konsol hatası yok.

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

#### C6 · A · Gün raporu 1. günde felaket gibi okunuyordu — ✅ YAPILDI
`src/domain/settlement.ts` · `DayReport.stockPurchaseSpend` · `src/ui/shell/DayCloseDialog.tsx`
"Kasa değişimi −77.336 ₺" yazıyordu; bunun 76.136 ₺'si stoğa giden paraydı. Hiçbir satır bunu
söylemiyordu — ilk gününü normal oynayan oyuncu batmış gibi görünüyordu.

**Yapıldı:** kasa değişimi satırının altına alt satır geldi: *"Bunun 11.159 ₺ kadarı stoğa
girdi — harcanmadı, mala döndü."*

**Ayrı defter tutulmadı.** Sayı günün kendi hareketlerinden türüyor: içeri mal giren
(`itemsIn.length > 0`) ve kasayı eksilten işlemler. Mutabakat yolu değişmedi,
`applyTransaction` tek yol olmayı sürdürüyor.

**Testler:** `src/domain/day-report-stock-spend.test.ts` — 6 test. Kritik olan ikincisi:
**mal girmeyen nakit çıkışı stok sayılmaz** (ayrımın kendisi bu). Ayrıca gün sonu giderinin
paya karışmadığı — `kasa = stok + gider` eşitliği — ve önceki günün alımının bugüne
yazılmadığı.

**Tarayıcıda ölçüldü (390×844, 1. gün, iki satır alım):**
`Kasa değişimi −12.359 ₺` · alt satır `Bunun 11.159 ₺ kadarı stoğa girdi` ·
`Günlük gider −1.200 ₺` → 11.159 + 1.200 = 12.359. Not kendi satırında, kaba taşmıyor.

#### C7 · Clone'dan bize alınabilecekler — ✅ KONU KAPANDI (bu tabanda hepsi zaten var)
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
