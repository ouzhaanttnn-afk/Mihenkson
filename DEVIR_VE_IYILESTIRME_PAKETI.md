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

#### YENİ · Müzik kendi ses düzeyine kavuştu — ✅ YAPILDI
`src/domain/preferences.ts` · `src/ui/music.ts` · `src/ui/App.tsx` ·
`src/ui/shell/SettingsDialog.tsx` · `src/state/settings.test.ts`

Kullanıcı: *"Bu müziğin sesini manuel düşürmem lazım onu da ekle, ses düzeyi var müzik
ses düzeyi diye de olsun."*

**BİR ÖNCEKİ TASARIMIN KUSURU BUYDU.** Fon müziği eklenirken müzik, efektin düzeyinden
`0,42` sabit bir oranla TÜREYEN bağımlı bir sayıyla çalıyordu (`MUZIK_ORANI`). Oyuncu
efekti kısmadan müziği kısamıyordu — tam da şimdi istenen şey. Çözüm yama değil, ayrım:
`preferences.musicVolume` efektten tamamen bağımsız yeni bir tercih.

**DÜZEN EFEKTLE BİREBİR AYNI, KODU DA AYNI YOLDAN GEÇİYOR.** `normalizeVolume` artık bir
`fallback` parametresi alıyor (`DEFAULT_VOLUME` varsayılan) — efekt ve müzik aynı 0–100
sınırını ve aynı yuvarlama kuralını paylaşıyor ama bozuk girdide FARKLI varsayılana
düşmesi gerekiyordu; fonksiyonu ikiye kopyalamak yerine parametreleştirildi.

**ESKİ KAYITTA `musicVolume` YOK ve `DEFAULT_MUSIC_VOLUME`e (20) düşer, sıfıra değil.**
0'a düşseydi `musicEnabled: true` gelen (eski kayıtların normal hâli, bkz. bir önceki
madde) bir oyuncu müziği "açık ama sessiz" bulurdu — eklenen özelliği görmeden kaybederdi.
20 rastgele değil: eski türetilmiş değere yakın (%50 × 0,42 ≈ %21) seçildi, geçiş algısal
bir sıçrama yaratmasın diye.

**AYARLARDA İKİ AYRI KAYDIRICI.** "Ses düzeyi" artık yalnız `soundEnabled`e bakıyor —
müziği beslemediği için "ikisi de kapalıyken" mantığı geri alındı. "Müzik düzeyi" kendi
satırında, kendi anahtarına (`musicEnabled`) bağlı, aynı görsel dille (aynı `pct` biçimi,
aynı devre-dışı-bırakma deseni).

**Tarayıcıda ölçüldü.** Yeni oyuncuda müzik kazancı `0,20` (beklenen `20/100`). Müzik
düzeyini `5`'e çekmek efekt satırını (`%50`) hiç değiştirmiyor, müzik öğesinin gerçek
kazancı `0,05`'e düşüyor. Müziği kapatınca yalnız müzik kaydırıcısı devre dışı kalıyor,
efekt kaydırıcısı açık kalmaya devam ediyor. İngilizce arayüzde de iki satır ayrı ayrı
görünüyor: *"Volume · 50%"* ve *"Music volume · 20%"*.

**Testler:** `settings.test.ts`'e üç test eklendi — düzeylerin birbirinden bağımsız
değiştiğini, eski kayıtta `musicVolume`in sıfıra değil varsayılana düştüğünü ve bozuk
girdinin (`'çok'`, `500`, `-40`) güvenli kaldığını sabitliyor. Dört mevcut test (varsayılan
nesne, kayıt roundtrip'i, komşu anahtar listesi) yeni alanı içerecek şekilde güncellendi.

Suite 975 → **977**.

#### YENİ · Varsayılan ses düzeyi %70 → %50 — ✅ YAPILDI
`src/domain/preferences.ts` · `src/state/settings.test.ts`

Kullanıcı: *"Sesi bayağı kısman lazım, orijinal düzeyi 50 olsun."*

Fon müziği eklendiğinde `soundVolume` tek bir tercih olarak iki katmanı birden besliyor
hâle geldi — efekt ve müzik aynı kaydırıcıdan ölçekleniyor (bkz. `music.ts · MUZIK_ORANI`).
%70'lik eski varsayılan, ikisi üst üste bindiğinde kulakta kalabalık duruyordu.

**TEK SATIRLIK DEĞİŞİKLİK, GENİŞ ETKİ.** `DEFAULT_VOLUME` tek kaynak; hem yeni oyuncunun
gördüğü ilk düzeyi hem de bozuk/eksik bir kayıttan dönülecek güvenli değeri belirliyor
(`normalizeVolume`). Testler zaten sabiti import edip ona karşı sınıyordu (literal `70`
yazan tek yer bir test adıydı, o da güncellendi) — yani kod tarafında başka hiçbir yer
dokunulmadı ve testler kendiliğinden yeni değere uydu.

**Tarayıcıda ölçüldü.** Yeni bir oyuncuda kaydırıcı `50`'de açılıyor, ayarlardaki not
"%50" yazıyor, müzik öğesinin gerçek kazancı `0,50 × 0,42 = 0,21` — hesap tam tutuyor.

Suite 975, değişmedi (yalnız bir test adı güncellendi).

#### YENİ · Fon müziği eklendi — sözsüz, telifsiz, sıfırdan üretildi — ✅ YAPILDI
`src/ui/music.ts` (yeni) · `tools/muzik-uret.py` (yeni) ·
`public/assets/audio/music/tezgah.wav` (yeni) · `src/domain/preferences.ts` ·
`src/ui/App.tsx` · `src/ui/shell/SettingsDialog.tsx`

Kullanıcı: *"Ses çalışıyor. Fon müziği olarak Tame Impala'nın telifsiz herhangi bir müziğini
ekler misin, ama fon müziği tarzında ve sözsüz olacak."*

**"TELİFSİZ TAME IMPALA" DİYE BİR ŞEY YOK — bu doğrudan söylendi, aranmadı.** Tame Impala'nın
bütün kataloğu teliflidir; hiçbir parçası bir oyuna konulamaz. İnternetten "telifsiz" diye
inen dosyaların lisansını da güvenilir şekilde doğrulamanın yolu yok. Tarz isteğini
karşılarken telif sorusunu tamamen ortadan kaldıran tek yol, parçayı **sıfırdan üretmekti.**

**PARÇA SENTEZLE YAZILDI, HİÇBİR KAYITTAN ÖRNEK ALINMADI.** `tools/muzik-uret.py` — NumPy/SciPy
ile 40 saniyelik, sözsüz, hazy psych-pop dokusunda bir enstrümantal döngü üretiyor: dört akorluk
detuned pad (Am9 · Fmaj7 · Cmaj7 · G6), phaser salınımı, yumuşak bas, gecikmeli elektro-piyano
figürü, kısık davul, teyp dalgalanması (wow/flutter) ve dört taraklı yankı. Sabit tohumla
(`20260903`) **deterministik**: betik tekrar çalıştırılırsa bit bit aynı dosyayı üretir —
kökenin kanıtı üretici kodun kendisi, `public/assets/audio/music/LISANS.md`'de yazılı.

**DÖNGÜ DİKİŞSİZ OLMAK ZORUNDAYDI, ilk denemede değildi.** Ölçüldü: filtreler tek geçişte
sıfır durumdan başladığı için döngü başı ile sonu farklı bir noktadan çıkıyordu (dikiş farkı
0,0083, kulakta duyulur bir tık). Düzeltme: her IIR süzgeç sinyalin **iki kopyası** üzerinden
geçiriliyor (`_dairesel_filtre`), tüm gecikme/yankı hatları `np.roll` ile dairesel yazıldı, ve
her LFO'nun periyodu 40 saniyeyi tam bölüyor (phaser 20 s, teyp 0,30 Hz/2,70 Hz). Sonuç
ölçüldü: dikiş sıçraması **0,00005** — parçanın kendi tipik örnekten örneğe adımının
**yarısından küçük.**

**KARIŞIM İLK SEFERDE KÖTÜYDÜ VE ÖLÇÜLEREK DÜZELTİLDİ.** Pad katmanı ~120 osilatörün toplamı
olduğu için diğer her şeyi eziyordu: enerjinin %90'ı 120–400 Hz bandındaydı, 1,2 kHz üstünde
neredeyse hiçbir şey yoktu — kulağa uğultu gibi gelirdi. Her katman kendi RMS hedefine
normalize edildi (`dengele`), tuşlara üst harmonikler ve davula daha belirgin hi-hat eklendi.
Son ölçüm: 20–120 Hz %28, 120–400 Hz %50, 400–1200 Hz %21, 1200 Hz üstü %1,5 — hâlâ koyu ve
fon niteliğinde ama artık boğuk değil. Tepe 0,72 / RMS −16,9 dBFS: bilerek tavana yaslanmıyor,
efektlerin altında kalıyor.

**ÖRNEKLEME HIZI 16 kHz'E ÇEKİLDİ.** Ölçüm parçanın enerjisinin neredeyse tamamının 4 kHz
altında olduğunu gösterdi (tarzın gereği); 22,05 kHz'de dosya 1,76 MB, 16 kHz'de 1,28 MB ve
kaybedilen bant zaten boştu.

**EFEKT VE MÜZİK ARTIK AYRI ANAHTAR (`musicEnabled`).** Eskiden `preferences.soundEnabled` tek
anahtardı ve yorumu haklı olarak "ikiye bölmek var olmayan bir ayrım sunmak olurdu" diyordu —
o an oyunda hiç ses dosyası yoktu. Artık gerçek bir ayrım var: efektler olaya bağlı ve kısa,
müzik süreklidir; biri isteyip diğerini istemeyen oyuncu yaygındır. **Eski kayıtta bu alan
yok** ve `normalizePreferences` onu **AÇIK** varsayana düşürüyor — müzik oyuna sonradan girdi,
eski oyuncunun onu "kapatmış" olması mümkün değil; sessizce kapalı başlatmak, eklenen şeyi hiç
göstermemek olurdu (`profileSetupDone` ile aynı desen).

**SES DÜZEYİ KAYDIRICISI İKİ KATMANI BİRDEN BESLİYOR** ve bu bir kusur adayıydı: kaydırıcı
eskiden yalnız `soundEnabled` kapalıyken devre dışı kalıyordu. Efekt kapalı, müzik açıkken bu
davranış kaydırıcıyı "çalışmıyor" gösterirdi ama aslında müziği hâlâ değiştiriyordu — düzeltildi,
artık **ikisi de** kapalıyken devre dışı kalıyor.

**MÜZİK, SES EFEKTLERİYLE AYNI iOS TUZAĞINA DÜŞMESİN DİYE AYNI ÇÖZÜMÜ PAYLAŞIYOR.** Bir önceki
maddede ses kilidinin `once: true` dinleyiciye bağlı olduğu ve arka plandan dönüşte kalıcı
sustuğu bulunmuştu; müzik `resumeMusic()` ile aynı kalıcı dinleyicilere (dokunuş +
`visibilitychange`) bağlandı. `<audio loop>` bilerek Web Audio tamponu değil: 40 saniyelik
sürekli bir parçayı belleğe açmak yerine akıtıyor, döngüyü tarayıcı örnek düzeyinde kapatıyor.

**Tarayıcıda ölçüldü.** İlk dokunuştan sonra müzik öğesi kuruluyor, `loop: true`,
`paused: false`, düzey `%70 × 0,42 = 0,294` (hesap tam tutuyor). Yalnız müzik açıkken ses
düzeyi kaydırıcısı **etkin**; ikisi de kapatılınca **devre dışı** ve öğe duraklatılıyor; tekrar
açılınca aynı düzeyde devam ediyor. Ayarlar penceresi 360×640 ve 390×700'de taşmıyor — kendi
kaydırma alanı zaten bu amaçla tasarlanmıştı.

**Testler:** `src/ui/music.test.ts` (yeni, 7 test) — `audio.test.ts` ile aynı sözleşme: node
ortamında `document`/`Audio` yokken çökmez, desteklenmeyen ortamda durum dürüst kalır
(`requested: true` ama `playing: false`), sınır dışı düzeyler sessiz kalır.
`settings.test.ts`'e beş test eklendi/güncellendi; en önemlisi eskiden **tam tersini**
sabitleyen testti — "ses TEK anahtar, müzik diye ayrı alan yok" — artık doğru olan şeyi
sabitliyor: ikisi **gerçekten ayrı.**

Suite 966 → **975**.

#### YENİ · "Telefonda ses ve titreşim yok" — ✅ ARAŞTIRILDI ve İKİ KUSUR DÜZELTİLDİ
`src/ui/audio.ts` · `src/ui/App.tsx` · `src/ui/shell/SettingsDialog.tsx`

Kullanıcı: *"Telefonda müzikler çalmıyor veya titreşimli geri bildirim çalışmıyor."*

**ÖNCE İKİ GERÇEĞİ AYIRMAK GEREKİYOR — ikisi de düzeltilecek bir hata değil:**

1. **Oyunda MÜZİK YOK.** `public/assets/audio` altında sekiz kısa efekt var
   (`tap, coins, deal, deny, chime, customer, test, levelup`) ve tek bir müzik parçası yok.
   Kodda da müzik diye bir kavram yok; `preferences` tek bir `soundEnabled` anahtarı tutuyor
   ve nedeni orada yazılı. Yani "müzik çalmıyor" doğru: çalacak müzik hiç yok.
2. **iPhone'da web titreşimi YOK.** `navigator.vibrate` Android/Chrome'da var, iOS Safari'de
   yok ve Apple'ın web'e açtığı bir haptik API'si de yok. Bu bir hata değil, platform sınırı.

**AMA İKİ GERÇEK KUSUR ÇIKTI ve ikisi de tam bu şikâyeti üretir:**

**KUSUR 1 — ses oturum ortasında kalıcı olarak ölüyordu.** Ses kilidi `once: true` dinleyiciye
bağlıydı: ilk dokunuşta `AudioContext` açılıyor, dinleyici kendini kaldırıyordu. iOS'ta bağlam
yalnız açılışta askıya alınmıyor — uygulama arka plana atıldığında, telefon çaldığında veya
sekme değiştiğinde `suspended` oluyor ve **kendiliğinden geri gelmiyor**. Üstelik `playSound`
`state !== 'running'` olan her isteği sessizce atıyordu. Sonuç: ses başta çalışıyor, telefonla
bir kez ilgilenildikten sonra oturum boyunca bir daha hiç çıkmıyordu.

*Ölçüldü — önceki sürüm ile yeni sürüm, aynı senaryo (bağlam askıya alınır, oyuncu dokunmaya
devam eder):*

| | bağlam askıdan sonra | ses |
|---|---|---|
| önceki sürüm | `suspended` kalıyor | çıkmıyor |
| yeni sürüm | `running`a dönüyor | çıkıyor (`source.start()` ölçüldü) |

Düzeltme iki parçalı: dinleyiciler artık tek seferlik değil (her dokunuşta + ekran geri
geldiğinde `visibilitychange`), ve `playSound` uyuyan bağlamı atmadan önce bir kez uyandırmayı
deniyor. Maliyeti yok: çalışan bağlamda `unlockAudio` hiçbir şey yapmıyor, çözülmüş tampon
yeniden indirilmiyor.

**KUSUR 2 — titreşim anahtarı desteklenmeyen cihazda hâlâ basılıyordu.** Alt metin doğruyu
söylüyordu ("Bu cihaz titreşimi desteklemiyor") ama anahtar açılıp kapanıyordu; ekran bir
cümleyle doğruyu, bir hareketle yalanı söylüyordu ve oyuncu açıp beklemeye devam ediyordu.
Artık `disabled`. Ses düzeyi kaydırıcısında verilmiş olan karar burada da geçerli: hiçbir şey
yapmayan denetim ekranda tutulmaz.

**"SESİ DENE" SATIRI EKLENDİ.** "Ses çalmıyor" kör bir şikâyettir: oyuncu tarayıcının mı,
ayarın mı, dosyanın mı yoksa telefonun yan tarafındaki sessiz düğmesinin mi sustuğunu göremez.
Yeni satır tek dokunuşta hem sesi çalmayı dener hem de ses yolunun durumunu söyler. Düğmenin
kendisi bir kullanıcı jesti olduğu için tarayıcının beklediği izin tam o anda doğar. **iOS
ipucu yalnız iPhone/iPad'de** gösterilir: *"Ses açıldı. Duymuyorsanız telefonun yan tarafındaki
sessiz düğmesini kontrol edin."* — Web Audio orada fiziksel sessiz düğmesine tabidir ve bunu
tahmin etmenin yolu yoktur; Android'de böyle bir davranış olmadığı için oradaki oyuncuya
yanlış ipucu verilmez.

**Tarayıcıda ölçüldü.** Sekiz ses dosyasının sekizi de indiriliyor (yol doğru). "Sesi dene"
`source.start()`e ulaşıyor, yani ses gerçekten ses grafiğine giriyor. `navigator.vibrate`
silinmiş bir bağlamda titreşim satırı hem "desteklemiyor" diyor hem de `disabled` geliyor.

**DÜRÜST SINIR:** bunlar gerçek bir iPhone'da değil, masaüstü Chromium'da iOS davranışı taklit
edilerek ölçüldü. Düzeltilen iki kusur kod düzeyinde kesin; sesin o telefonda duyulup
duyulmayacağını "Sesi dene" düğmesi artık kullanıcının kendisine söyleyebilir.

#### YENİ · İşlem sonucu balonu — "satış yapıldı / yapılmadı" — ✅ YAPILDI
`src/state/gameStore.ts` · `src/state/deal-result-toast.test.ts` (yeni) · `src/i18n/en.ts`

Kullanıcı: *"Bu satış yapıldı satış yapılmadı bildirim baloncuğu şeklinde çıksın."*

Sonuç ekranı zaten uzun bir vaka özeti veriyordu ama oyuncu ona bakmadan "Devam Et"e basıp
geçebiliyordu; işlemin olup olmadığı ancak nakit satırını takip edenin gözünden anlaşılıyordu.
Artık pazarlık kapanır kapanmaz tek satırlık bir balon çıkıyor, kendiliğinden sönüyor ve
akışı durdurmuyor.

**YENİ BİR BALON SİSTEMİ KURULMADI.** `toastLayer` zaten vardı ve "Sarrafiye alındı ·
8.549 ₺" gibi mesajları basıyordu; yeni mesajlar aynı kanaldan, aynı `tone` sözlüğüyle
geçiyor. Görsel doğrulama da bu yüzden hazır: balon 390×844'te 166×34 px'lik bir hap olarak
üst şeridin altında çiziliyor.

**YÖN AYRI TUTULDU.** Sarrafın defterinde alım ile satış ayrı kalemlerdir:
- müşteri ALIRKEN (`settlePurchase`) → *"Satış yapıldı · 45.000 ₺"* / *"Satış yapılmadı"*
- müşteri SATARKEN (`settleLine`) → *"Alım yapıldı · 12.000 ₺"* / *"Alım yapılmadı"*

Tek bir "işlem yapıldı" demek daha kolaydı ama oyuncunun kafasında yön karışırdı.

**BALON MUTABAKATIN ARKASINDA DURUYOR.** İki yordamda da `pushToast`, `applyTransaction`
başarılı olduktan SONRA çağrılıyor. Çift tap veya yeniden yükleme korumasının devreye
girdiği durumda yordam zaten yukarıda `return` ediyor; yani "yapıldı" diyen bir balonun
arkasında **her zaman** bir mutabakat kaydı vardır. Balon zaten var olan ses ipucuyla
(`cue(... 'deal' : 'deny')`) aynı noktada duruyor — sesin görsel ikizi.

**OLMAYAN SATIŞ 'negative' DEĞİL 'info'.** Kötü fiyata satmamak bu oyunda başarısızlık
değil, çoğu zaman doğru karardır; kırmızı göstermek oyuncuyu kötü anlaşmaya iterdi.

**Testler:** `src/state/deal-result-toast.test.ts` — 5 test; ikisi satış, ikisi alım
(kabul + red), biri de asıl riski kapatıyor: **balon, arkasından gelen `set(...)` ile
ezilmiyor.** İki yordam da balondan sonra ekonomiyi yazıyor ve `toasts` alanını taşımıyor;
kısmi `set` birleştirmesi bozulursa balon sessizce kaybolur ve bunu tarayıcıda fark etmek
zordur. Aynı test "yapıldı" balonunun arkasında gerçekten bir defter kaydı olduğunu da
sabitliyor. Testlerde yön karışması da yasaklandı: alım akışında "Satış" geçen balon
çıkarsa test düşer.

**Ölçüm sırasında bir tuzak görüldü ve teste yazıldı:** değerleme adımı atlanırsa pazarlık
ACCEPTED'a gidiyor ama `settleLine` bandsız kalemde hiç çalışmadan dönüyor — ne mutabakat
ne balon oluyor. Test bu yüzden oyuncunun yaptığının aynısını yapıyor: incele → değerle →
tez → pazarlık.

Suite 961 → **966**.

#### YENİ · Para işareti — önemli bağlamlar renkle ayrıldı — ✅ YAPILDI
`src/ui/screens/BusinessScreen.tsx` · `src/ui/screens/Screens.css`

Kullanıcı: *"Oyunda bazı tuşlar bazı bağlamlar önemli. Bu önemli bağlamları kendin keşfedip
renklendirir misin? Örnek: personel tuşu altın sarısı boyansa da önemli bir bağlam olduğunu
görsek."*

**ÖNCE KURAL, SONRA RENK.** Rastgele yaldız işe yaramaz; her şey parlarsa hiçbir şey
parlamaz. Konulan tek kural şu: **dokunulabilir bir yüzey para harcatıyor, kalıcı bir gider
taahhüdü doğuruyor veya geri alınamıyorsa pirinç işaret taşır; salt okunur her şey nötr
kalır.**

**İŞARET UYDURULMADI, OYUNUN KENDİ SÖZLÜĞÜNDEN ALINDI.** Tarama yapıldı ve dil üç ağırlıkta
zaten mevcuttu:
- dolu pirinç → ana karar (Teklifi Gönder, market "Satın Al"),
- pirinç kenarlık → taahhüt eden kontrol (`lotRow__buy`, `miniBtn`),
- 3 px sol kenar → Stok ekranında `counter__toggle` ("Sarrafiye Al", "Toptancıya Sat").

Yani Stok ve Market bu dili zaten konuşuyordu; Atölye neredeyse tamamen salt okunur.
**Eksik olan tek ekran İşletme'ydi.**

**İŞLETME'DE BULUNAN ASIL KUSUR:** ekran sekiz rotalık bir listeydi ve sekizi de birbirinin
aynısı görünüyordu. "İşlem Defteri" (salt okunur bir kayıt) ile "Toptancı Hesabı" (borç açar,
vade doğurur) aynı ağırlıktaydı; oyuncu hangi satırın kasasına dokunacağını ancak içine
girerek öğreniyordu. Personel kartı da öyle: kalıcı aylık gider doğuran tek kontrol,
"Metale bağlı değer" gibi bir bilgi satırından ayırt edilemiyordu.

**Yapılan üç işaretleme:**

| Yüzey | İşaret | Neden |
|---|---|---|
| Toptancı Hesabı · Esnaf Ağı · Mağaza | 3 px pirinç sol kenar + hafif pirinç zemin | borç açar, faiz/vade doğurur, yükseltme parası ister |
| Personel kartı | 3 px pirinç sol kenar | kalıcı aylık gider taahhüdü |
| Personel düğmeleri 1 · 2 · 3 | pirinç kenarlık + pirinç tutar | her biri bir maaş yükü |

**İŞARETLENMEYENLER DE KARARIN PARÇASI.** Piyasa, İşlem Defteri, Kayıt ve Kariyer nötr kaldı —
okumak paraya mal olmaz. Personel "0" düğmesi de nötr: hiçbir şeye mal olmuyor, onu da pirinç
yapmak işareti anlamsızlaştırırdı. Kilitli kadrolar da işaret taşımaz; henüz bir para kararı
değil, bir hedef. Sekiz rotadan **yalnız üçü** işaretli.

**Pirinç tehlike demek değil.** Kayıp ve yıkım kırmızıdır ve zaten öyleydi (`settingsDanger`,
"Kaydı sil"). Pirinç fırsat ve para demek; ikisi karıştırılmadı.

**İki ölçüm iki kusur yakaladı:**
1. Kenar çizildi ama SOLGUN kaldı. Karanlık ekran teması `.page .personnelDisclosure` gibi
   iki sınıflı kurallarla `border-color`u eziyor; tek sınıflı kural onu yenemiyordu
   (ölçüm: 3 px genişlik uygulandı, renk uygulanmadı). Seçiciler `.page` altına alındı —
   `.page .counter__toggle` da zaten böyle yazılmış.
2. `--paid` kuralı SEÇİLİ düğmenin kenar rengini de eziyordu; üçü aynı pirinca düşmüştü.
   Dolgu yine ayırıyordu ama kenar da ayırsın diye seçili bir kademe parlatıldı.

**Tarayıcıda ölçüldü (390×844).** Rotalar: Toptancı/Esnaf/Mağaza `3px rgb(196,141,43)`,
diğer dördü `0px`. Personel: "0" nötr, 1/2/3 pirinç kenarlıklı; kadro 2 seçiliyken kenarı
`rgb(215,170,74)` ve zemini dolu — üçünün içinden ayırt ediliyor.

#### YENİ · Personel düğmelerine maaş yazıldı — ✅ YAPILDI
`src/ui/screens/BusinessScreen.tsx` · `src/ui/screens/Screens.css`

Kullanıcı: *"Personel yazan yerlere aşağıdaki butonlara personelin maaşı oraya yazsın."*

Düğmeler yalnız kadro sayısı ile kilit seviyesini gösteriyordu (`1` / `Sv 3`). Maaş bir
üstteki cümlede yazıyordu ama oyuncunun onu okuyup kafasında toplaması gerekiyordu.
Artık her düğme kendi tutarını taşıyor: `1 · 40.000 ₺ · Sv 3`.

**TUTAR AYLIK TOPLAMDIR, kişi başı maaş değil.** Kişi başı yazsaydı "3" düğmesi 60.000 ₺
gösterirdi ama basınca 150.000 ₺ ödenirdi — düğmenin üstündeki sayı ile kasadan çıkan para
birbirini tutmazdı. Onay satırı da aynı `PERSONNEL_MONTHLY` dizisini okuyor, yani iki yer
tek kaynaktan besleniyor ve ayrışamaz. Belirsizlik kalmasın diye üstteki cümleye tek bir
ek yapıldı: *"Düğmedeki tutar o kadronun aylık toplamıdır."*

**Punto GDD 23.22'ye çekildi.** Alt satırlar 9 px'ti; maaş oyuncunun KARAR VERİRKEN okuyacağı
sayı olduğu için 11 px'e (mutlak alt sınır) çıkarıldı ve rengi bir kademe açıldı. Seviye
şartı 9 px'te bırakıldı — o bir kilit rozeti, tutar değil.

**Erişilebilir isim tam cümle:** *"2 personel, aylık toplam 90.000 ₺, seviye 6 gerektirir."*
Personelsiz seçenek *"Personelsiz — maaş ödenmez"* diyor; eskiden yalnız "0 personel"di.

**Tarayıcıda ölçüldü (390×844).** Düğmeler 77 px, en uzun tutar (150.000 ₺) 50 px — dördünde
de taşma yok. Seviye 1'de 1/2/3 kilitli görünüyor, seviye 10'da dördü de açık.
İngilizce + $ ile: `1 · $1,233 · Lv 3` · `3 · $4,622 · Lv 10`, yine taşma yok.

#### YENİ · "×1,33 gerçekten işliyor mu?" — ✅ ÖLÇÜLDÜ (ve bir kusur çıktı)
`src/state/customer-traffic-live.test.ts` (yeni) · `src/i18n/money.ts` ·
`src/ui/screens/BusinessScreen.tsx`

Kullanıcı: *"Peki gerçekten işe yarıyor mu ×1.33 işliyor mu?"* Yerinde soru:
`customer-traffic.test.ts` yalnız **çarpanın kendisini** ölçüyordu — doğru sayıyı üretiyor mu.
Alan yordamı doğru olup döngüye hiç bağlanmamış olsaydı o testler yine geçerdi.

**Yeni test bunu kapatıyor.** `customerDelayFactor` hiç çağrılmıyor; `useGame.tick()`
sürülüyor, gün 09:00'dan 19:00'a oynatılıyor ve GERÇEKTEN kaç müşteri doğduğu sayılıyor
(`spawnCounter` — kuyruk dolsa bile her gelişte artar). Aynı günlerde ölçülüyor ki gün
karakterinin tempo'su sabit kalsın, değişen tek şey itibar olsun.

**Ölçüm — itibar 42 (×1,00) → itibar 79 (×1,33), aynı günler, aynı tohum:**

| gün | ×1,00 | ×1,33 | fark |
|---|---|---|---|
| 1 | 34 | 43 | +26% |
| 2 | 22 | 29 | +32% |
| 3 | 22 | 29 | +32% |
| 4 | 34 | 43 | +26% |
| 9 | 41 | 53 | +29% |
| … 10 günün toplamı | **299** | **384** | **×1,284** |

Ayrıca uçlar: itibar 0 → 21 müşteri, itibar 100 / kademe 5 → 58 müşteri.
Canlandır düğmesi: 34 → 80 müşteri (aralık ×0,4'e iniyor, GDD 23.10.1).

**Gerçekleşen oran ×1,284, nominal ×1,333 — aradaki fark bir hata değil.** Gün 600
dakikalık KAPALI bir pencere; kapanışın hemen ardına düşecek müşteri o gün hiç gelmez, yani
sayı her zaman aşağı yuvarlanır. Test bu yüzden 1,2–1,4 bandı kontrol ediyor: çarpanın
İŞLEDİĞİNİ kanıtlıyor, ondalık hassasiyette bir vaat vermiyor.

**Ölçüm sırasında bir kusur çıktı ve düzeltildi.** İlk denemede 1 oyun dakikalık tick
atıldı ve sayılar saf gecikme zincirinden 2-3 müşteri düşük geldi: bir sonraki geliş O ANKİ
saate göre kuruluyor, kaba adımda her müşteride 1 dakikaya kadar sürüklenme birikiyor.
Gerçek oyun 60 fps'te ~0,02 oyun dakikası adımlıyor; ölçüm 0,05'e indirilince sayılar
zincirle örtüştü. **Bu, ölçüm aracının kusuruydu, oyunun değil** — ama not düşülüyor, çünkü
aynı tuzağa bir daha düşülmesin.

**Ekranda gerçek bir kusur çıktı ve o da düzeltildi.** Trafik satırı `toFixed(2)` ile
yazılıyordu, yani Türkçe arayüzde de nokta gösteriyordu (`×1.33`). Oyunun geri kalanı virgül
kullanırken tek satırın nokta göstermesi tutarsızdı. `@i18n/money · multiplier()` eklendi,
ondalık ayracı dile bağlandı. **Tarayıcıda doğrulandı:** itibar 79'a çekilmiş kayıtla
İşletme ekranı `Müşteri trafiği · ×1,33` gösteriyor — yani ekrandaki sayı ile kapıdan giren
müşteri aynı yordamdan geliyor.

Suite 956 → **961**.

#### YENİ · "Dükkânı Canlandır" kalıcı yuvarlak kenar düğmesi oldu — ✅ YAPILDI
`src/ui/shell/RushFab.tsx` (yeni) · `src/ui/screens/ShopScreen.tsx` ·
`src/ui/shell/AppShell.css` · `src/ui/workbench/Workbench.css`

Kullanıcı: *"Dükkanı canlandır butonu kalıcı olarak ekranda yuvarlak şekilde sağda veya
solda harici durması lazım."*

**ESKİ HÂLİ NEDEN SORUNDU.** Çağrı uyarı yığınının altında ince bir çubuktu ve
`shopOpen && s.queue.length === 0` koşuluyla çiziliyordu. İki kusuru vardı: müşteri
karşılanır karşılanmaz kayboluyordu — oyuncu düğmeyi "bazen çıkan" bir şey sanıyordu — ve
uyarı sayısı üçe çıkınca aşağı itiliyor, yeri her gün değişiyordu. Kalıcı olması istenen
şey tam olarak buydu: aranmadan bulunacak sabit bir yer.

**KONUM ÖLÇÜMLE SEÇİLDİ, TERCİHLE DEĞİL.** Dükkân ekranı 390×844'te tepeden tırnağa dolu
(durum 52 + piyasa 44 + müşteri 50 + aşama 32 + masa 337 + ray 56 + dock 128 + nav 64).
Üç aşamada sağ kenar tarandı ve boş kalan tek bandın **İşlem Masası'nın dibi ile araç
rayının üstü** olduğu görüldü: boşta arka plan fotoğrafı, stok aşamasında masanın boş dibi,
pazarlıkta değer kartının altındaki koyu boşluk. Karar Dock'unun üstüne hiç binmiyor —
"Teklifi Gönder" ve "Müşteriyi Gönder" örtülemez.

**Dock'un yüksekliği aşamaya göre 82 → 128 → 194 px değişiyor**, dolayısıyla sabit bir
`bottom` değeri tutmazdı. Bunun yerine akışa **sıfır yükseklikli bir çapa** kondu
(`.rushFabAnchor`, rayın hemen üstünde): ray nereye giderse düğme oraya gidiyor, dock'un
değişken yüksekliği düğmeyi hiç etkilemiyor. Ray yüksekliği sabit 56 px olduğu için düğme
her aşamada yarısı rayda yarısı masada duruyor.

**GDD 23.24 ÇİĞNENMEDİ** — "ikon tek başına anlam taşımaz". Daire ikonu tek başına
göstermiyor; altında 11 px etiket var (GDD 23.22'nin mutlak alt sınırı, daha küçüğüne
inilmedi). Etiket daireye sığsın diye kısa: `Canlandır` / `Liven`. Uzun açıklama erişilebilir
isimde, orada yer sıkıntısı yok. Çap 64 px — 44 px dokunma hedefinin çok üstünde.

**AKIN SÜRERKEN DÜĞME BİLGİ TAŞIYOR.** Dolu pirinç oluyor ve etiket kalan süreye dönüyor
(`90 dk`). Böylece kalıcı düğme sadece durmuyor, bakılınca akının sürüp sürmediğini de
söylüyor. Kalan süre **seçicide tam dakikaya yuvarlanıyor**: ham `clockMinutes` her tick'te
değiştiği için doğrudan seçilseydi düğme saniyede onlarca kez yeniden çizilirdi.

**PAZAR GÜNÜ GİZLENMİYOR, SÖNÜYOR.** Eski davranış düğmeyi tamamen kaldırmaktı; gerekçesi
de doğruydu (çalışmayan bir çağrıyı ekranda tutmak güveni yer). Ama oyuncu "kalıcı" istedi.
Kalıcılıkla dürüstlüğü birlikte tutmanın yolu düğmeyi yerinde bırakıp `disabled` ve soluk
göstermek, nedenini de erişilebilir isme yazmak: *"Dükkân kapalı — bugün müşteri akışı yok."*

**Ekonomiye dokunulmadı.** `triggerCustomerRush` aynı yordam, aynı etki: yalnız
`customerRushUntilMinutes` yazıyor, müşteri kalitesine, bütçesine, rezervasyon fiyatına ve
gizli gerçeğe elini sürmüyor. Zar tüketmiyor.

**Ölü CSS temizlendi:** `.rewardedLine` ve ona bakan üç medya sorgusu kaldırıldı.

**Tarayıcıda ölçüldü.** Her durumda düğmenin altında kalan **görünür metin düğümü sayısı 0**
(metin düğümü bazında çakışma taraması) ve merkez noktasında hit-test düğmenin kendisini
buluyor:

| Durum | Düğme (x, y) | Ray üstü | Etiket | Çakışan metin | Örtülen ana CTA |
|---|---|---|---|---|---|
| Boşta (390×844) | 314, 610 | 642 | Canlandır | yok | yok |
| Akın sürerken | 314, 610 | 642 | 90 dk | yok | yok |
| Stok aşaması | 314, 564 | 596 | 89 dk | yok | yok |
| Pazar (gün 7) | 314, 564 | — | Canlandır *(sönük, disabled)* | yok | yok |
| 360×560 | 284, 390 | — | Canlandır | yok | yok |
| 390×700 | 314, 474 | — | Canlandır | yok | yok |
| 430×932 | 354, 698 | — | Canlandır | yok | yok |
| İngilizce + $ | 314, 666 | — | Liven | yok | yok |

Sağ kenar boşluğu her ölçümde 12 px; düğme hiçbir ekranda cihaz çerçevesinin dışına taşmıyor.
Pencereler (gün raporu, ayarlar, yetenek ağacı) 40–75 z-index bandında, düğme 7'de: modal
açıkken düğme altta kalıyor.

**Sınır — bilerek bırakıldı:** düğme yalnız **Dükkan sekmesinde**. Rayın üstüne çapalandığı
için başka sekmede karşılığı yok; ayrıca akının anlamı müşteri akışının yaşandığı ekranda.
İstenirse cihaz seviyesine alınıp her sekmede gösterilebilir, ama o zaman konumu ölçümle
yeniden seçilmeli.

Suite 956 test, `tsc` temiz, `npm run i18n` 871/871, denetim 70 (değişmedi).

#### YENİ · Market sırası, müşteri trafiği ve geri sayım — ✅ YAPILDI
`src/ui/screens/MarketPlaceholderScreen.tsx` · `src/domain/customer-traffic.ts` (yeni) ·
`src/state/gameStore.ts` · `src/ui/screens/ShopScreen.tsx` · `src/ui/screens/BusinessScreen.tsx`

Kullanıcı üç şey istedi: *"Marketteki her ürünü fiyata göre listelemen lazım küçükten
büyüğe. Ardından oyun ilerledikçe ve itibar ilerledikçe gelen müşteri yoğunluğu artması
gerekiyordu. Son olarak da müşteri gelecek diye hâlâ geri sayım yapıyor, onu
istemiyordum."*

**1 · MARKET UCUZDAN PAHALIYA.** Katalog tanım sırasında geliyordu; o sıra ürünler
eklendikçe oluşmuştu ve okuyana hiçbir şey söylemiyordu. `slice()` şart oldu:
`MARKET_CATALOG` modül düzeyinde paylaşılan bir dizi ve `sort` yerinde sıralıyor —
kopyalamadan sıralamak katalogun kendisini kalıcı olarak yeniden dizerdi. Eşit fiyatta ad
sırası devrede, aksi halde iki ürün her çizimde yer değiştirebilirdi.

**2 · İTİBAR ARTIK TRAFİĞİ DE BELİRLİYOR — eksik gerçekten vardı.** GDD 10.1 *"Semt/Marka
İtibarı → müşteri trafiği, premium segment"* diyor. Cümlenin İKİNCİ yarısı kuruluydu: itibar
yükseldikçe havuzdaki arketipler değişiyor, VIP ve koleksiyoncu açılıyordu. BİRİNCİ yarısı —
trafiğin kendisi — hiçbir yerde yoktu; geliş aralığı yalnız tohuma, günün karakterine ve
"Canlandır" düğmesine bakıyordu. Yani tanınan sarrafla ilk günkü sarraf aynı sayıda müşteri
görüyordu.

**Başlangıç noktası tam olarak 1,0'dır.** Çarpan `START.reputation` (42) ve 1. kademeye göre
çıpalandı: yeni oyun açan için hiçbir şey değişmez, bugünkü denge aynen korunur. Formül
yalnız ilerlemeyi ödüllendirir ve gerilemeyi hissettirir.

| İtibar / kademe | Çarpan | Gün başına müşteri |
|---|---|---|
| 0 · 1 | ×0,62 | 21 |
| 42 · 1 (başlangıç) | **×1,00** | **33** |
| 70 · 2 | ×1,35 | 43 |
| 90 · 4 | ×1,73 | 55 |
| 100 · 5 | ×1,90 | 60 |

Üst sınır kuyruk kapasitesinin büyüme oranıyla uyumlu (4 → 10 kişi). Alt sınır oyunu
kilitlememek için var: itibarı dibe vurmuş oyuncuya "hiç müşteri gelmiyor" cezası vermek,
toparlanma yolunu da kapatırdı.

**DETERMİNİZM BOZULMADI.** Çarpan zar atmaz; `nextCustomerDelay` yine tam bir `next()`
çekilişi tüketir ve çarpan onun SONUCUNU ölçekler. Testle korunuyor.

**Mekanik EKRANA BAĞLANDI.** İşletme · İlişkiler altında `Müşteri trafiği ×1,00` satırı var.
Bu olmadan mekanik çalışır ama oyuncu çalıştığını göremezdi — "itibarım arttı, ne oldu?"
sorusunun cevabı hiçbir ekranda yazmazdı. Aynı hata bu projede daha önce iki kez yapıldı
(B1/B5) ve ikisinde de ekrana bağlanarak çözüldü. Sayı bir ÇARPANDIR, müşteri adedi değil:
gerçek adet güne ve zara da bağlı, tek bir rakam vaat etmek yanıltıcı olurdu.

**3 · GERİ SAYIM KALDIRILDI.** "Sonraki müşteri ~7 dk" yazıyordu. Sayı doğruydu ama yaptığı
iş yanlıştı: oyuncuyu tezgâhta saat saymaya, yani BEKLEMEYE davet ediyordu. Sarrafın işi
müşteri saymak değil; boş vakitte stok kurmak, atölyeye bakmak, pozisyonunu tartmaktır.
Satırın kendisi kaldı çünkü ikinci yarısı hâlâ bilgi taşıyor: *"Dükkân açık · Dükkan
19:00'da kapanıyor."* Kapanış saati günü planlamaya yarar, geri sayım yalnız bekletir.

**Testler:** `src/domain/customer-traffic.test.ts` — 8 test. Bekçi olanlar: *başlangıç
dükkânında çarpan tam 1*, *itibar düşünce trafik de düşer*, *en kötü durumda bile müşteri
gelmeye devam eder* ve *çarpan zar tüketmez*. Suite 948 → **956**.

**Tarayıcıda ölçüldü (390×844):** altı market kategorisinin altısı da artan fiyat sıralı
(46 ürün); Dükkan ekranında "Sonraki müşteri ~" ibaresi yok; İşletme'de trafik satırı
itibar 42/kademe 1'de ×1,00, itibar 88/kademe 3'te ×1,61, itibar 12'de ×0,73 gösteriyor.

#### YENİ · Dil ve para birimi — ✅ YAPILDI
`src/i18n/` (yeni) · `src/domain/preferences.ts` · `src/ui/format.ts` ·
`src/ui/shell/SettingsDialog.tsx` · `tools/i18n-keys.mjs` (yeni)

Kullanıcı: *"Ayarlarda dil seçeneği var para birimi seçeneği yok. Hem çeviriyi mantıklı bir
şekilde her şeye entegre et hem de para birimi kısmı ekleyip $'a çevir her şeyi. Sanki bu
çok zor mu olacak öyleyse geri dönüşü mümkün kıl."*

**İKİSİ DE SUNUM KATMANI — geri dönüşü işte bu sağlıyor.** Ne dil ne para birimi oyunun
durumuna dokunuyor. Testle korunuyor (`src/i18n/invariance.test.ts`): aynı tohumla oynanan
iki oyun, biri Türkçe/₺ diğeri İngilizce/$ olsa bile 90 günlük piyasa zincirini, gizli
gerçeği ve zar tüketimini BİRE BİR aynı üretiyor.

**PARA BİRİMİ OYUNUN PARASINI ÇEVİRMEZ, YAZISINI ÇEVİRİR.** Kasa, maliyet, teklif, defter
ve kayıt dosyası TL kalır; bölme ekrana basılmadan hemen önce, tek noktada yapılır. Kasayı
bölüp saklamak yuvarlama hatalarını kayda yazardı ve ₺'ye dönüşte para kaybolurdu —
"oyuncunun parası sıfırlanmaz" kuralı ilk gün kırılırdı. Bu yüzden ₺'ye dönmek bir dönüşüm
değil, çarpanı 1 yapmaktır.

**Kur sabit ve oyunun kendi verisinden:** `MARKET_BASE.usd` (1 $ = 32,45 ₺). Canlı `fxIndex`
denenmedi ve gerekçesi yazıldı: oyuncu hiçbir şey yapmadan kasası değişir görünürdü, dünkü
"3.000 $ kâr" bugün başka bir sayı olurdu ve gün raporları karşılaştırılamaz hâle gelirdi.
Kur panosundaki **Dolar ve Euro satırları bilerek ₺ kaldı** — bir pano yabancı parayı yerel
parayla kote eder; "Dolar · 1,00 $" doğru ama boş olurdu.

**Çeviride anahtar = Türkçe metnin kendisi.** Ayrı bir anahtar şeması (`shop.title` gibi)
kurulmadı: 1100'den fazla metinde yanlış anahtar yazma riski demekti. Metnin kendisi anahtar
olunca yanlış eşleşme mümkün değil, ve **sözlükte karşılığı olmayan her metin Türkçe kalıyor**
— yani bugünkü davranış. Katman tamamen kaldırılsa ekranda tek harf değişmez.

**Metin TANIMDA değil ÇİZİMDE çevriliyor** (`t(label)`). Dizi tanımına `t()` koymak modül
yüklenirken bir kez çalışır ve dil sonradan değişince metin ilk dilde donardı.

**Dil değişince tüm ağaç yeniden kuruluyor** (`key`). `t()` etkin dili modül düzeyinde
okuyor ve React bunu bağımlılık olarak göremiyor; abone olmayan bileşenler eski dilde
kalır, ekranın yarısı bir dilde yarısı öbüründe olurdu. Her bileşene ayrı abonelik eklemek
yüzlerce dokunuş ve biri unutulunca sessiz hata demekti.

**ÜÇ ŞEY BİLEREK ÇEVRİLMEDİ** — çevrilmeleri hata olurdu:
- **Mağaza adı** kayda yazılıyor; üretimde çevirmek dili değiştiren oyuncunun dükkânının
  adını da değiştirirdi.
- **Kanal adı** (Vitrin / Toptancı / Eritme) bir birlik türüdür, ekran metni değil; kod ona
  göre dallanıyor. Çizimde `t(channel)` ile çevrilir.
- **Müşteri adları** Türkçe kalır. İngilizce arayüzde de bir Türk sarrafın müşterisi Türk
  adı taşır.

**ÜÇ ARAÇ — "çevirdim" iddiasını ölçüyle karşılamak için.**
`npm run i18n` sözlükte karşılığı olmayan anahtarları sayar (şu an **866/866**).
`npm run i18n:audit` KAYNAĞI tarar: `t()` içinden geçmeyen ve sözlükte karşılığı
olmayan her Türkçe metni listeler.
Tarayıcı sızıntı dedektörü İngilizce seçiliyken ekranda kalan Türkçe metni toplar.

**TARAYICI TARAMASI YETMEDİ — kullanıcı yakaladı.** İlk turda beş sekmede sızıntı sıfırdı
ama kullanıcı "bazı yerler azıcık Türkçe kalmış" dedi ve haklıydı: tarama ancak
GİDEBİLDİĞİ ekranı görüyor, akışlar rastgele olduğu için ulaşılamayan diyalog ve alt
rotalar sessizce temiz görünüyordu. Kapsamı akışa değil DOSYAYA bağlı olan statik
tarayıcı (`i18n:audit`) o turda 431 gerçek aday buldu; hepsi elden geçti ve sözlük
685 → 866'ya çıktı. Ders: rastgele bir yürüyüşün sıfır bulması, sıfır olduğu anlamına
gelmez.

**SIZINTI DEDEKTÖRÜ İKİ KEZ YANILDI ve ikisi de düzeltildi.** Önce yalnız Türkçeye özgü
harfe bakıyordu; `sahip olunan` hiçbirini içermediği için kaçtı — **ekran görüntüsü
yakaladı, ölçüm değil**. Kelime listesi eklenince bu kez `Gram Gold` ve `once a customer`
yanlış alarm verdi; liste İngilizcede de geçen kelimelerden temizlendi.

**EKRAN GÖRÜNTÜSÜ İKİ KEZ ÖLÇÜMÜN KAÇIRDIĞINI GÖRDÜ.** Sızıntı sıfırdı ama İngilizce
arayüzde ses düzeyi `%70` yazıyordu: yüzde imi Türkçede sayının önünde, İngilizcede
arkasındadır. `pct` dile bağlandı (`%70` / `70%`), ondalık ayracı da öyle. Düzelttikten
sonra görüntüde **hâlâ `%70` yazıyordu**: ayarlar penceresi `pct`'yi kullanmıyor, imi kendi
şablonuna sabitlemişti. İkincisini de yine ölçüm değil, ekran görüntüsü buldu.

**Bir hata da düzeldi:** teslim edilen işin balonu metne bakılarak kaldırılıyordu ve aranan
parça sabit Türkçeydi. Çeviriyle birlikte o balon İngilizce oyunda ekranda takılı kalırdı;
süzgeç artık şablondan türetiliyor.

**ÇEVİRİ SESSİZCE EKONOMİYİ DEĞİŞTİRECEKTİ — en ciddi bulgu.** Toplu geçişte
`tags.includes('düğün')` yanlışlıkla `tags.includes(t('düğün'))` oldu. Talep etiketi bir
VERİ kimliğidir, ekran metni değil: İngilizce oynayan oyuncuda karşılaştırma `'wedding'`
arayacak, ürünün etiketi `'düğün'` kalacaktı — düğün sezonu olayı talebi hiç
artırmayacaktı. Geri alındı ve **iki testle** kapatıldı: biri kaynakta bu kalıbı arıyor
(`includes(t(`, `=== t(`), öbürü aynı ürün ve piyasada çıkış planı beklentilerinin iki
dilde birebir aynı çıktığını ölçüyor.

**DEĞİŞMEZLİK TESTİ BİR HATAYI KENDİ YAKALADI.** Kondisyon izi etiketini üretim anında
çevirmiştim; o etiket ürünün gizli gerçeğine yazılıp KAYDA giriyor, dolayısıyla Türkçe ve
İngilizce oynanan iki oyun farklı ürün üretmiş oluyordu. Üretim tek dilde kalıyor, çeviri
çizimde yapılıyor. Aynı gerekçeyle havuz adı ve mağaza adı da üretimde çevrilmiyor.

**Codemod üç kez yanlış yaptı, üçü de yakalandı:** `=>` işaretini JSX kapanışı sandı,
yorumların içindeki tırnaklı cümleleri bozdu, ve zaten sarılmış metni `t(t(...))` yaptı.
Öznitelikler süslü paranteze alındı. Hepsi `tsc` + testler + tarama ile yakalandı.

**Testler:** `src/i18n/invariance.test.ts` (9), `src/i18n/money.test.ts` (15),
`src/state/settings.test.ts`'e 6 yeni test. Suite 933 → **948**.

**Kaynakta ölçüldü:** `npm run i18n:audit` geriye 70 sarılmamış metin bırakıyor ve **hepsi
bilerek** — tasarım notu, geliştirici hatası (`throw`), veri kimliği (talep etiketi, ürün
sınıfı, ünlü listesi) ve kişi adları. Araç bunu çıktısında yazıyor: sayı "0 olmalı" diye
değil, "arttı mı" diye okunur.

**Tarayıcıda ölçüldü (390×844):** beş kök sekme + müşteri akışı + hızlı stok + İşletme alt
rotaları + gün kapanışı + ayarlar dolaşıldı; **277 farklı metin tarandı, sızıntı 0** (dört
ardışık koşuda). İngilizce + $ seçiliyken şerit `Lv 1 · DAY 1 · MON · CASH $30,817`,
navigasyon `Shop / Stock / Workshop / Market / Business`, gün kapanışı *"The daily overhead
of $36.98 is charged either way."* Sayı yereli de dile uyuyor (`30,817` · `36.98`).
Türkçe/₺ seçiliyken ekran eskisiyle birebir aynı.

**Kalan sınır, dürüstçe:** üst şeritte XP sayısı (`0/580`) Türkçe + ₺ birleşiminde 5 px
kırpılıyor — `1.000.000 ₺` dolar karşılığından geniş olduğu için. Bu, ayarlar düğmesi
maddesinde zaten yazılmış olan 390 px sınırının aynısı; çözümü de orada duruyor (XP sayısını
şeritten çıkarmak, çubuk aynı bilgiyi veriyor).

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

#### YENİ · Ayarlarda ses, titreşim ve dil — ✅ YAPILDI (hepsi bağlandı)
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

#### YENİ · Elle kayıt/silme düğmeleri kaldırıldı, yerine "Hesap bağla" yer tutucusu — ✅ YAPILDI
`src/ui/shell/SettingsDialog.tsx` · `src/ui/screens/BusinessScreen.tsx` (`SaveRoute`) ·
`src/ui/shell/AppShell.css` · `src/ui/screens/Screens.css` · `src/i18n/en.ts`

Kullanıcı: *"Profilde kayıt tuşu zaten bulut tabanlı kayıt olacak o onu kaldıralım. Ayarlarda
kayıt sil yenimoyun başla tuşu da silinsin zaten bulut tabanlı olacak deniştim. Oraya
bağlanacak hesaplar appstore veya playstore hesabını bağla diye tikleyebilirsin."* Oyun bulut
tabanlı hesap kaydına geçecek; elle "kaydet" ve "eski kaydı geri yükle" düğmeleri o modelde
anlamsız, "Yeni oyun / Kaydı sil" tehlike-bölgesi düğmesi de aynı şekilde gereksiz hale geliyor.

Hangi "kayıt tuşu"nun kastedildiği belirsizdi (Profil penceresi mi, İşletme → Kayıt rotası mı) —
`AskUserQuestion` ile soruldu, cevap **İşletme → Kayıt rotasındaki düğmeler**. Ayarlar'daki
tehlike-bölgesi düğmesi için de "tamamen kaldır mı, gizli bir geliştirici yolu mu kalsın"
soruldu — cevap **tamamen kaldır**, gizli yol yok.

**Yapıldı:**
- `SaveRoute` (İşletme → Kayıt) — "Şimdi Kaydet" ve "Son Kaydı Geri Yükle" düğmeleri (ve
  geri yüklemenin onay paneli) kaldırıldı. Ekranda yalnız salt-okunur bilgi kaldı: mevcut
  oyunun gün/saat/nakit durumu ve son otomatik kaydın özeti. Alt başlık artık *"Gün sonunda
  otomatik kayıt · hesap bağlama Ayarlar'da"* diyor.
- `SettingsDialog` — "Yeni oyun" tehlike-bölgesi düğmesi (onay akışıyla birlikte) tamamen
  kaldırıldı. Yerine yeni bir **Hesap** grubu geldi: "App Store Hesabını Bağla" ve
  "Google Play Hesabını Bağla" satırları. İkisi de gerçek bir bağlanma yapmıyor — arkada
  hesap/bulut altyapısı yok — basılınca `notify()` ile *"...hesabı bağlama yakında
  geliyor."* toast'ı gösteriyorlar. Bu, oyuncuya çalışmayan bir düğme göstermemek ile
  gelecekte nereye bağlanacağını göstermek arasında bir denge: buton görünür ve tıklanabilir,
  ama sahte bir "bağlandı" durumu üretmiyor.
- `resetGame` store eyleminin kendisi **silinmedi** — testler ve ileride gerekebilecek bir
  geliştirici yolu için store katmanında duruyor; kaldırılan yalnız ona giden UI tetikleyicisi.
- Ölü CSS temizlendi: `.settingsDanger*`, `.settingsRow--danger .settingsRow__action`.
- i18n: 10 ölü anahtar silindi (`Şimdi Kaydet`, `Geri yükleme`, `Evet, Geri Yükle`, vb.),
  8 yeni anahtar eklendi (`Hesap`, `App Store Hesabını Bağla`, `Google Play Hesabını Bağla`,
  `Bulut kayıt için — yakında`, `Bağla`, iki toast metni, yeni alt başlık). `npm run i18n` →
  **879/879**, 0 eksik, 0 kullanılmayan.

**Testler:** ek test yazılmadı — kaldırılan düğmeler doğrudan test edilmiyordu, testler
`resetGame`/`saveGame`/`loadGame`'i store seviyesinde çağırıyor ve onlar değişmedi. Suite
977, **aynı** (regresyon yok).

**Tarayıcıda doğrulandı (390×844):** İşletme → Kayıt artık "Şimdi Kaydet" veya "Son Kaydı
Geri Yükle" içermiyor, yalnız "Mevcut oyun" ve "Son kayıt" bilgisi var. Ayarlar'da **HESAP**
başlığı altında iki satır görünüyor; "App Store Hesabını Bağla"ya basınca *"App Store hesabı
bağlama yakında geliyor."* toast'ı çıkıyor; eski "Kaydı sil"/"Yeni oyun" satırı hiçbir yerde
yok. Konsolda hata yok.

**Ayrıca:** depo köküne `store/` klasörü eklendi (App Store / Play Store yayın hazırlığı —
kontrol listeleri, taslak metadata, gizlilik politikası/kullanım şartları taslağı, eksik görsel
envanteri). Kullanıcının kendi bilgisayarına erişimim yok; bu yüzden yayın-hazırlığı dosyaları
depoya konup GitHub'a push edildi (`fc2c7d9`). Gizlilik politikası taslağı, bugünkü kodda
`localStorage` dışında hiçbir ağ isteği/analitik/SDK olmadığı `grep -rn` ile doğrulanarak
yazıldı; bulut hesabı eklendiğinde yeniden yazılması gerektiği metnin içinde açıkça not edildi.

#### YENİ · Ayarlar kompaktlaştırıldı, Hesap satırına gerçek ikon geldi — ✅ YAPILDI
`src/ui/icons.tsx` · `src/ui/shell/SettingsDialog.tsx` · `src/ui/shell/AppShell.css` ·
`src/ui/screens/BusinessScreen.tsx`

Kullanıcı: *"Şimdi ayarları biraz daha kompakt istiyorum senden. Düzenler misin hesap bağlama
yerine asset atayıp görsel koymanı rica ediyorum."*

**Kompakt geçiş** — `.settingsBox` dış dolgusu 20 → 16 px, satır arası boşluk 10 → 8 px;
`.settingsRow` iç dolgusu 10×14 → 8×12 px, taban yüksekliği 58 → 50 px; kaydırıcı satırlarının
(`--stack`) iç boşluğu 6 → 4 px. Hepsi GDD 23.22'nin 44 px dokunma tabanının üstünde kaldı —
ölçüldü, aşağıda. Tek başına bu değişiklik pencereyi 390×844'te **1200 → ~1090 px** kaydırma
yüksekliğine indirdi (~%9); Hesap satırının kendisinin dört satırdan bire inmesi (aşağıda) geri
kalan farkı getirdi: **1200 → 1017 px toplam (~%15 daha kısa)**.

**Hesap satırına asset** — önceki sürümde App Store ve Play Store için ayrı birer tam satır,
her biri kendi "Bağla" metin bağlantısıyla vardı (dört satır: başlık + iki satır + gizli
subtitle tekrarı). Artık **tek satır**: solda "Hesap" başlığı, sağda iki 44×44 ikon-düğme —
Dil ve Para birimi satırlarıyla birebir aynı kalıp (metin solda, denetim sağda).

**İkonlar gerçek SVG asset, uydurma değil.** `assets/realistic/icons/micro/` altında bu iki
mağazanın resmî rozeti hiç yok (mevcut asset paketi kuyumculuk/atölye/karakter varlıklarından
oluşuyor, mağaza rozeti hiç içermiyor) — dişli ikonuyla (`IconSettings`) aynı gerekçeyle kodla
çizildi: var olmayan bir dosyaya işaret etmek yerine, mikro-ikon setiyle aynı ölçekte okunan iki
yeni bileşen eklendi (`IconAppStore`, `IconPlayStore`). Resmî marka rozetlerinin birebir kopyası
DEĞİL — tek renkli, basitleştirilmiş bir piktogram (elma silüeti / oynat üçgeni); Google'ın dört
renkli üçgen logosu bilerek kullanılmadı, hem bu uygulamanın tüm ikon dilinin tek renkli olması
hem de resmî rozetin birebir taklidinden kaçınmak için. Üç aday (elma dolgulu, elma çift-daire
anahat, oynat üçgeni dolgulu/anahat) küçük bir HTML önizlemesiyle yan yana render edilip
karşılaştırıldı, en okunaklı ikisi seçildi.

**GDD 23.24 hâlâ geçerli** ("ikon tek başına anlam taşımamalı") — düğmelerin `aria-label`'ı zaten
tam metni taşıyor (`"App Store Hesabını Bağla"` / `"Google Play Hesabını Bağla"`), satırın kendi
`strong`/`small` metni de "Hesap · Bulut kayıt için — yakında" diyor; ikon tek başına bir iddia
taşımıyor.

**Ayrıca düzeltildi:** İşletme ana ekranındaki "Kayıt" menü satırının alt metni hâlâ eski
davranışı anlatıyordu — *"Gün sonunda otomatik · elle kaydet veya geri yükle"* — önceki
düzenlemede yalnız `SaveRoute` ekranının kendi metni güncellenmiş, bu üst menüdeki kopyası
unutulmuştu. Artık `SaveRoute`'un başlığıyla aynı, tek bir i18n anahtarını paylaşıyor: *"Gün
sonunda otomatik kayıt · hesap bağlama Ayarlar'da."*

**i18n:** kullanılmayan `'Bağla'` anahtarı (artık hiçbir yerde `t('Bağla')` olarak çağrılmıyor)
ve eski Kayıt alt metni silindi. `npm run i18n` denetleyicisi `'Bağla'`yı **kaçırdı** — çünkü
`'Bağlamsal araç rayı'` (ToolRail) dizesi alt dize olarak "Bağla"yı içeriyor ve denetleyici tam
anahtar eşleşmesi değil, alt dize taraması yapıyor; elle `grep -rn "t('Bağla')"` ile doğrulanıp
silindi. Son durum **877/877**, 0 çevrilmemiş, 0 kullanılmayan.

**Testler:** ek test yazılmadı — değişiklik tamamen sunum katmanında (ikon bileşeni + CSS
boyutları), davranışsal bir dal eklemedi. Suite 977, **aynı**.

**Tarayıcıda ölçüldü (390×844 ve 360×640, tr ve en):** Hesap satırındaki düğmeler `44×44`
(GDD 23.22 tabanı tam karşılanıyor, ölçüldü), tıklanınca "yakında" toast'ı hâlâ çıkıyor, hiçbir
genişlik veya dilde satır taşmıyor, konsolda hata yok. **Tuzak:** ilk tarayıcı turunda `vite
preview` önceki (kod değişikliğinden ÖNCEKİ) `dist/` çıktısını sunmaya devam ediyordu — ekranda
hâlâ eski dört satırlı "Bağla" metni görünüyordu. `npm run build` çalıştırılmadan `vite preview`
başlatılırsa bu her zaman olur; bu depoda ders zaten biliniyordu, burada bir kez daha doğrulandı.

#### YENİ · Mağaza görselleri üretildi — ✅ KISMEN YAPILDI
`store/assets/generated/` (yeni klasör) · `store/README.md` · `store/assets/eksikler.md` ·
`store/ios/checklist.md` · `store/android/checklist.md`

Kullanıcı: *"Hazırlıklara başlaaa"* — önceki turda listelenen üç yayına-hazırlık kaleminden
(native paketleme, gerçek mağaza görselleri, bulut hesap altyapısı) **görsel** olanı bu turda
yapıldı; diğer ikisi bilerek başlatılmadı (aşağıda neden).

**Üretildi, ölçüldü:**
- `icon-1024-appstore.png` — 1024×1024, **RGB, alfasız** (`PIL` ile doğrulandı). Kaynak
  `public/assets/brand/icon-512.png`'nin alfası zaten **tamamen opaktı** (`min=max=255`,
  ölçüldü) ama PNG **modu** RGBA'ydı ve Apple'ın yükleyicisi bunu reddediyor — bu yüzden
  önceki turda "alfa taşıyor" notu doğruydu, teknik anlamda. Lanczos ile 2× büyütülüp alfa
  kanalı düşürüldü; büyütme sonrası görsel gözle karşılaştırıldı, bulanıklaşma yok.
- `feature-graphic-1024x500.png` — Play Store'un hiç var olmayan öne çıkan görseli, sıfırdan
  tasarlandı. Yöntem: HTML + Playwright render (bu oturumda daha önce ikon-önizleme için
  kullanılan aynı "küçük mockup → ekran görüntüsü → gözle kontrol et → düzelt" döngüsü) —
  ilk denemede başlık sağdan taşıyordu, ölçüler küçültülüp yeniden render edildi. Marka
  paletinden (`--ink-900`, `--brass-400/500`) renkler kullanıldı, uydurma marka rengi yok.
- `screenshots/01-dukkan.png … 04-atolye.png` — gerçek oynanıştan, gerçek cihaz fiziksel
  çözünürlüğünde (1290×2796 = iPhone 6.7"). **Ölçüm notu:** Apple'ın istediği rakamlar
  fiziksel piksel; uygulamanın kendi CSS tavanı `max-width:430px` (mantıksal px) — Playwright
  `viewport 430×932` + `deviceScaleFactor 3` verince ikisi birebir örtüşüyor, hiç boşluk/kırpma
  yok. Dükkan (bekleyen müşteri + iki "sarrafiye alındı" bildirimi — ilk halinde bildirimler
  başlığın üstüne biniyordu, 3,5 sn ekstra beklemeyle temizlendi), Stok (4 kalem envanter),
  İşletme (finans özeti), Atölye (boş kuyruk — 1. gün için dürüst bir an, zorlama "dolu kuyruk"
  sahnesi kurulmadı).

**Denendi, bırakıldı — pazarlık ekranı.** Beşinci bir kare olarak müşteri inceleme/pazarlık
akışını da yakalamayı denedim; GDD 28.3'ün RNG determinizmi *ekonomiyi* korusa da hangi
müşteri türünün (alım/satım/servis) önce geleceği taze bir oturumda RNG'ye bağlı — aynı script
farklı çalıştırmalarda farklı müşteri tipiyle karşılaştı (bir denemede gerçekten iyi bir kare
çıktı: yüzük + ekspertiz araçları, ama küçük bir "kilitli araç" tooltip'i kadrajı bozuyordu).
Yedi-sekiz script denemesinden sonra zaman/fayda dengesi bozuldu; dört sağlam karede bırakıp
bunu dürüstçe not ettim (`assets/eksikler.md`).

**Bilerek YAPILMADI — native paketleme (Capacitor) ve bulut hesap altyapısı.** İkisi de
listede vardı ama:
- **Native paketleme**, bu ortamda Xcode/Android Studio olmadığı için kurulsa bile
  derlenip doğrulanamaz — kör bir iskele bırakmak, "hazır" görünüp aslında hiç test
  edilmemiş bir şey teslim etmek olurdu. `store/README.md`'de bu gerekçeyle açıkça
  ertelendi, istenirse iskele (npm paketleri + `ios/`/`android/` klasörleri, additive) yine
  de kurulabilir.
- **Bulut hesap altyapısı** mimari bir karar (hangi sağlayıcı, kimlik doğrulama kapsamı,
  maliyet) — kullanıcıyla konuşulmadan başlatılmadı; tek taraflı bir seçim, geri dönüşü zor
  bir bağımlılık kurardı.

**Görsel envanterinden bilerek atlanan bir madde daha var:** Android adaptive icon (ön
plan/arka plan katmanı ayrı, şeffaf zemin) — kaynak sanat eserinde amblem hiçbir zaman zeminden
gerçek alfa ile ayrılmamış; renk-eşiğiyle otomatik "arka planı sil" denemek, yumuşak gölgeli
3B-görünümlü bir logoda pürüzlü/hatalı bir kesim üretme riski taşıyordu. Denenmedi, riski
`store/README.md`'de ve `assets/eksikler.md`'de açıkça yazılı.

**Doğrulama:** `python3 -c "from PIL import Image; ..."` ile her üretilen dosyanın boyutu ve
modu ölçüldü (yukarıdaki tabloda). Kod tarafında hiçbir değişiklik yok — bu tur yalnız
`store/` klasörüne yeni dosyalar ekledi, `src/` dokunulmadı; test suite'i etkilemez.

#### YENİ · Müzik varsayılan KAPALI + canlı demo cilası — ✅ YAPILDI
`src/domain/preferences.ts` · `src/state/settings.test.ts`

Kullanıcı: *"Açık konuşayım müziği beğenmedim. Ayrıca oyunu sunuma hazırlıyoruz ne gerekiyorsa
yapar mısın."* İki ayrı soru soruldu (`AskUserQuestion`): müzik için "ne önerirsen", sunum
kapsamı için "canlı demo cilası" seçildi (metaryal/mağaza değil — kod ve akış).

**Müzik:** `defaultPreferences().musicEnabled` `true → false`. Sentez altyapısı
(`tools/muzik-uret.py`, `public/assets/audio/music/tezgah.wav`, telifsiz) **kaldırılmadı** —
Ayarlar'dan istendiğinde hâlâ açılabiliyor, yalnız artık kendiliğinden çalmıyor. Önceki karar
("eski kayıtta alan yoksa AÇIK'a düşer, özelliği gizlememek için") kasıtlı olarak tersine
çevrildi — kullanıcı geri bildirimi önceki tasarım gerekçesinin önüne geçti. Bu, hem YENİ
oyunculara hem `musicEnabled` alanına hiç dokunmamış (eski VEYA yeni) kayıtlara uygulanıyor;
zaten AÇIK olarak kaydedilmiş bir tercihi bu satır değiştirmez — `normalizePreferences`
yalnızca eksik alanı dolduruyor.

**Testler:** `settings.test.ts`'te varsayılanı ve eski-kayıt fallback'ini sabitleyen 3 test
güncellendi (biri tam tersini sabitliyordu — "AÇIK'a düşer" → "KAPALI'ya düşer", gerekçe
yorumla birlikte değiştirildi, eski karar silinmedi, üstü çizilip neden değiştiği yazıldı).
Suite 977, aynı sayıda test, davranış farklı. `tsc` temiz.

**Canlı demo cilası — ölçülmüş, temiz çıktı:**
- Taze `npm run build` + `vite preview` üzerinden **5 tam gün** oynandı (stok alımı, müşteri
  karşılama/gönderme, gün kapatma onay diyaloğu dahil) — 390×844'te **0 konsol hatası, 0
  sayfa hatası**. Cumartesi'ye (piyasa kapalı, dükkân açık) doğru geçiş gözlemlendi.
- **Üç ekran genişliği** (390×844 telefon, 360×640 dar telefon, 1440×900 masaüstü) taranıp
  yatay taşma kontrol edildi. Tek taşan öğe her genişlikte `marketStrip` — bu kasıtlı bir
  yatay kaydırma şeridi (piyasa ticker'ı), hata değil.
- **1440×900 masaüstü** özellikle kontrol edildi: ekran paylaşımıyla sunum ihtimaline karşı.
  Uygulamanın kendi `max-width:430px` tasarım tavanı ortalanmış, geri kalan koyu mürekkep
  zeminle dolduruluyor — kırık/boş görünmüyor, kasıtlı bir çerçeve gibi okunuyor.
- Ayarlar ekranında Müzik anahtarının gerçekten KAPALI göründüğü doğrulandı (`aria-pressed:
  false`, üç genişlikte de).
- `grep` ile kaynak kodda kalan `console.log`, `TODO`, `FIXME`, "lorem ipsum" gibi oyuncuya
  sızabilecek geliştirici artığı arandı — **hiçbiri yok**.
- Sayfa yükleme süresi ölçüldü (`performance` API, yerelde): ~70 ms, JS paketi 586 kB
  (gzip 190 kB) — mobil bir oyun için makul; kod bölme (`manualChunks`) önerisi hâlâ
  bekliyor ama sunum öncesi acil değil, dokunulmadı (riski faydasından büyük — çalışan
  derlemeyi zaman baskısı altında yeniden yapılandırmak).

**Bilerek dokunulmayan:** bu tur yalnız kod/UX tarafına baktı — mağaza materyali (önceki
turda zaten üretildi) veya native paketleme bu kapsamın dışında bırakıldı, kullanıcı
"canlı demo cilası"nı seçtiği için.

#### YENİ · Capacitor iskelesi + tüm ikon/splash varlıkları — ✅ YAPILDI
`capacitor.config.ts` (yeni) · `ios/` (yeni) · `android/` (yeni) · `assets/` (yeni) ·
`public/manifest.webmanifest` · `store/README.md` · `store/*/checklist.md` · `store/assets/eksikler.md`

Kullanıcı: *"App store ve playstore için gerekli olan hazırlıkları başlatalım."* Önceki
turda ("Hazırlıklara başla") bilerek ERTELENMİŞ tek kalemdi — gerekçe "bu ortamda Xcode/
Android Studio yok, kör bir iskele bırakmak yanlış olur" idi. Kullanıcı yine de başlatmayı
istedi; iskele KENDİSİ (npm paketleri, `ios/`/`android/` klasörleri, ikon/splash üretimi)
Xcode/Android Studio GEREKTİRMEDEN yapılabilir — yalnız SON derleme/imzalama adımı
gerektiriyor. Bu ayrım netleştirilip iskele kısmı tamamlandı, derleme kısmı hâlâ
kullanıcının kendi makinesinde.

**Kuruldu:** `@capacitor/core`, `@capacitor/ios`, `@capacitor/android`, `@capacitor/cli`,
`@capacitor/assets`. `npx cap init` + `cap add ios` + `cap add android` — gerçek, açılabilir
native projeler oluştu (boş şablon değil). `vite.config.ts`'in `base: './'` ayarı ("Capacitor/
WebView paketlemesi için göreli asset yolları" — önceden bilerek bırakılmıştı) tam burada
işe yaradı, ek bir değişiklik gerekmedi.

**Tuzak — Capacitor CLI'nin TS yükleyicisi.** `capacitor.config.ts`'e Türkçe karakterli bir
JSDoc blok yorumu eklenince `npx cap add ios` "Unexpected end of input" diye çöktü — CLI'nin
TS'i tam derlemek yerine hafif bir strip-yorumu kullandığı, belirli blok-yorum içeriklerinde
(muhtemelen `*/` benzeri bir dizi veya unicode kombinasyonu) tökezlediği anlaşıldı. Çözüm:
blok yorum yerine düz `//` satırları — sorunsuz çalıştı. Konfig dosyası, `appId`'nin GEÇİCİ
olduğunu ve yayından önce kesinleşmesi gerektiğini bu satırlarla anlatıyor.

**`appId` bilerek uydurulmadı, ama tamamen boş da bırakılmadı:** `com.mihenkaynak.app` —
gerçek şirket/geliştirici kimliği netleşene kadar geçerli bir GEÇİCİ değer (teknik olarak
çalışan bir tersine-alan-adı, gerçek bir yasal/ticari kimlik iddiası taşımıyor). Hem
`capacitor.config.ts` hem üç checklist dosyası bunun yayından ÖNCE kesinleştirilmesi
gerektiğini (sonra pratikte imkânsız olduğunu) açıkça yazıyor — `[DOLDURULACAK]` deseniyle
aynı ruhta, yalnız iskelenin çalışması için teknik bir değere ihtiyaç vardı.

**İkon/splash zinciri — tek kaynaktan, uçtan uca:**
- `assets/icon.png` ← önceki turda üretilmiş `icon-1024-appstore.png`'nin kopyası (1024×1024,
  RGB, alfasız — zaten ölçülmüştü).
- `assets/icon-background.png` ← düz `--ink-900` (#0b0f14) dolgusu, PIL ile üretildi.
- `assets/splash.png` ← ink-900 zemin üzerinde ortalanmış amblem, 2732×2732, PIL ile üretildi
  ve gözle kontrol edildi (kenarlar kaynaşıyor, dikiş yok — ikonun kendi ink kenar rengiyle
  splash zemini birebir aynı).
- `npx capacitor-assets generate` bu üçünden **105 Android + 10 iOS dosyası** üretti: her
  yoğunluk için launcher ikonu, adaptive icon ön/arka plan katmanı, açık/koyu splash, portre/
  yatay varyantlar. Hepsi doğrudan `ios/`/`android/` içine yerleşti.

**Android adaptive ikon — önceki turda "riskli, denenmedi" denen madde çözüldü, ama
gerçek bir kesim değil.** Araç, amblemi zeminden alfa ile ayırmaya ÇALIŞMADI (bu hâlâ
mümkün değil, katmanlı kaynak yok) — bunun yerine düz kareyi doğrudan "ön plan" yaptı,
Android'in kendi maskesi (daire/squircle) onu kırpıyor. Bu, tek-katmanlı bir ikondan
adaptive ikon üretmenin standart ve güvenli yolu — riskli bir "arka planı otomatik sil"
denemesi değil. `ic_launcher_foreground.png` ve `_background.png` çıktıları gözle kontrol
edildi, temiz.

**Yan bulgu — kırık bir referans, kastan değil düzeltildi.** `public/manifest.webmanifest`
`assets/icons/icon-*.webp` yollarına işaret ediyordu ama `public/assets/icons/` klasörü hiç
var olmamıştı (`git log` ile doğrulandı — hiç iz yok) — yani PWA olarak "Ana ekrana ekle"
diyen biri kırık ikonlar görürdü. `capacitor-assets generate` bu klasörü de (PWA hedefi
olarak) doldurdu, referans artık gerçek dosyalara işaret ediyor. Ayrıca manifestteki
`"type": "image/png"` alanı gerçek `.webp` dosyalarıyla uyuşmuyordu (önceden de böyleydi) —
`image/webp` olarak düzeltildi, aynı satırda fark edildiği için.

**Testler:** kod tarafına dokunulmadı (yalnız `manifest.webmanifest`'teki MIME düzeltmesi,
davranışsal etkisi yok). Suite 977, aynı. `tsc` temiz, `npm run i18n` 877/877.

**Doğrulama:** her üretilen görsel `python3`/PIL ile boyut+mod ölçüldü; `git status -n` ile
`ios/`/`android/`'in kendi `.gitignore`'larının derleme çıktısını (`build/`, `Pods/`,
`DerivedData`) gerçekten dışladığı doğrulandı — yalnız kaynak/konfig dosyaları depoya giriyor.
Taze `npm run build` + `npx cap sync` sorunsuz.

**Bilerek dokunulmayan — kullanıcının kendi makinesinde:** gerçek Xcode/Android Studio
derlemesi, imzalama sertifikası/keystore üretimi, TestFlight/internal-testing yüklemesi.
`store/README.md`'ye adım adım (paket adını kesinleştir → `npm run cap:sync` → Xcode/Android
Studio aç → imzala) bir kılavuz eklendi.

#### YENİ · Gizlilik/kullanım şartları barındırıldı, 6.5" ekran görüntüleri tamamlandı — ✅ YAPILDI
`store/legal/*.md` · `store/*/metadata-taslak.md` · `store/*/checklist.md` ·
`store/assets/generated/screenshots-6.5in/` (yeni) · `store/README.md`

Kullanıcı: *"gerçek şirket/geliştirici adını sonra netleştiririz, şimdilik devam."* Bundle ID
kararı ertelendiği için `store/README.md`'nin bir önceki turdaki adım-adım kılavuzunda 2.
madde ("paket adını kesinleştir") olduğu gibi kaldı — buna dokunmadım. Bunun yerine, bundle
ID'ye BAĞLI OLMAYAN iki kalemi ilerlettim: mağazaların ikisinin de zorunlu tuttuğu gizlilik
politikası URL'si (önceki turda hâlâ boştu) ve App Store'un "bazı durumlarda isteyebileceği"
6.5" ekran görüntüleri.

**Gizlilik Politikası ve Kullanım Şartları — tasarlanıp yayınlandı.** `artifact-design`
becerisi yüklendi, iki döküman `store/legal/*.md` içeriğinden (tek kelime uydurulmadan)
tasarlanmış HTML sayfalara çevrildi — Fraunces (başlık) + IBM Plex Sans (gövde) + IBM Plex
Mono (üst bilgi/etiket) eşleşmesi, oyunun kendi `--ink-900`/`--brass-500` paletiyle, açık VE
koyu tema desteğiyle. `[DOLDURULACAK]` alanları SİLİNMEDİ — ayrı, dikkat çeken bir "taslak
alanı" rozetiyle (`<span class="tbd">`) görünür kılındı; bu, boş bırakmaktan veya uydurmaktan
daha dürüst bir orta yol. İki sayfa birbirine çapraz bağlantılı. Yayınlanmadan önce bir kez
ekran görüntüsüyle (açık + koyu) gözden geçirildi, ikinci bir bakış yapılmadı (`artifact-design`
sürecinin kendi kuralı).

- Gizlilik Politikası: `https://claude.ai/code/artifact/820c2ec1-26f3-4271-847b-a8ff36829f51`
- Kullanım Şartları: `https://claude.ai/code/artifact/adf82548-792c-47f9-af22-814424f9dc10`

**Kritik uyarı — hâlâ ÖZEL.** Artifact'ler varsayılan olarak yalnız yayımlayan hesaba görünür.
Bu, üç yerde (her iki `legal/*.md`, her iki checklist, `store/README.md`) tekrarlanan bir
uyarı olarak yazıldı: mağazalara göndermeden önce sayfa paylaşım menüsünden **herkese açık**
yapılmalı, aksi hâlde inceleyen kişi linke erişemez. Bunu ben yapamam — paylaşım menüsü
sayfanın kendi sahibi (kullanıcı hesabı) tarafından açılıyor.

Metadata taslaklarındaki (`ios/metadata-taslak.md`, `android/metadata-taslak.md`) "Gizlilik
politikası URL'si" alanları artık gerçek linke işaret ediyor — `[DOLDURULACAK]` yalnız destek
e-postası/URL'si gibi hâlâ gerçekten bilinmeyen alanlarda kaldı.

**iPhone 6.5" ekran görüntüleri (1284×2778) — 4 adet.** Aynı yöntem (Playwright
`viewport 428×926` + `deviceScaleFactor 3`, `store/README.md`'de belgelenen 6.7" akışının
birebir aynısı — İlk Stoğunu Al → dört kalem satın al → toast'ların temizlenmesi için 3,5 sn
bekle → Dükkan/Stok/İşletme/Atölye ekranları), tekrar denenmedi bu kez ilk seferde
tutarlı çalıştı. Ölçüldü: tam olarak 1284×2778, RGB. Konsol hatası yok.

**Testler:** kod tarafına dokunulmadı, `src/` değişmedi — bu tur tamamen `store/` dokümanları
ve iki yayınlanmış Artifact. Suite/tsc/i18n zaten bir önceki commit'te doğrulanmıştı, bu tur
onları tekrar bozacak bir değişiklik yapmadı.

#### YENİ · Üretim derlemesi karartıldı (obfuscation) + kapsamlı ön-yayın kontrolü — ✅ YAPILDI
`tools/vite-plugin-obfuscate.mjs` (yeni) · `vite.config.ts` · `package.json`

Kullanıcı: *"bu kodları şifreleyeceksin demi tasarım ve parametrelerim denklemlerimiz
çalınmasın."* Önce dürüstçe düzeltildi: bu web/WebView kodu için **gerçek şifreleme
mümkün değil** — tarayıcı çalıştırabilmek için kodu okuyabilir hâlde almak zorunda,
hangi katman eklenirse eklensin sonunda geri çözülebilir. Üç seçenek (obfuscation /
sunucu tarafına taşıma / yasal koruma) artı-eksileriyle sunuldu; kullanıcı önerilen
seçeneği (obfuscation) onayladı — *"SENİN ÖNERİN NEYSE ONU YAPMAYA DEVAM ET"* — ve
ayrıca *"yayınlanmadan önceki her kontrolü sağlamanı istiyorum"* dedi.

**Ne yapıldı:** `javascript-obfuscator` (devDependency), Vite'ın kendi `renderChunk`
kancasına takılan küçük bir eklentiyle (`tools/vite-plugin-obfuscate.mjs`) yalnız
`vite build` çıktısına uygulanıyor — `vite dev` ve `vitest` hiç etkilenmiyor
(`apply: 'build'`). Kontrol akışı bulandırma, ölü kod enjeksiyonu, metin dizisi
base64 kodlama + döndürme, sayıları ifadelere çevirme aktif.

**Bilerek KAPALI bırakılan iki ayar — `selfDefending` ve `debugProtection`.** Bu
ikisi DevTools açıkken kodun kilitlenmesine/sonsuz döngüye girmesine neden olabiliyor.
Gerçek oyuncuların hata ayıklarken veya mağaza incelemecilerinin DevTools açması
meşru bir senaryo — kod onlara "savunma" yapmaya kalkarsa uygulama çökmüş gibi
görünür. Caydırıcılık için güvenilirlikten ödün verilmedi; bu karar eklentinin
kendi başındaki yorumda gerekçesiyle yazılı.

**Eşikler bilerek ORTA düzeyde (maksimum değil).** `controlFlowFlatteningThreshold:
0.4`, `deadCodeInjectionThreshold: 0.2` — tam güçte bu ayarlar paket boyutunu birkaç
katına çıkarabilir; mobil bir oyun için yükleme hızından ödün vermeye değmedi.
Ölçülen etki: JS paketi 586 kB → ~1,1 MB (gzip 190 kB → ~470 kB), derleme süresi
2,4 sn → 17 sn (yalnız derleme anı, çalışma zamanını etkilemiyor).

**Doğrulama — "her kontrolü sağla" isteğine karşılık, katmanlı:**
1. `npx vitest run` → **977/977**, `tsc -b --noEmit` → temiz, `npm run i18n` →
   **877/877**, 0 kullanılmayan. (Bunlar kaynağa karşı çalışıyor, obfuscation'ı
   sınamıyor — ayrı bir doğrulama gerekiyordu, aşağıda.)
2. **Obfuscate edilmiş `dist/` çıktısı gerçek tarayıcıda çalıştırıldı** (`vite
   preview`) — bu, `vitest`in dokunmadığı tek katman. 390×844'te **5 tam gün**
   oynandı (stok alımı, müşteri karşılama/gönderme, gün kapatma onayı, rastgele
   olay sistemi — "Sahte Ürün Dalgası" tetiklendi ve doğru işlendi): **0 konsol/
   sayfa hatası**. 360×640 ve 1440×900'de de ayrıca tarandı, aynı temiz sonuç.
3. **Tuzak, obfuscation'la ilgisi yoktu.** İlk doğrulama denemesi 90-100 sn'de
   zaman aşımına uğradı — sebep obfuscation değil, kopyaladığım eski bir script'in
   (bu oturumun önceki bir turunda zaten düzeltilmiş) "Günü Bitir" onay diyaloğunu
   yanlış hedeflemesiydi (arka plandaki, diyalog tarafından engellenen düğmeye
   basmaya çalışıp 30 sn'lik Playwright zaman aşımına her seferinde takılıyordu).
   Düzeltilmiş script'le (diyalog içi düğmeyi doğru hedefleyen) tekrar çalıştırılınca
   temiz geçti — bu ayrım burada açıkça not edildi, obfuscation'ı yanlışlıkla
   suçlamamak için.
4. `npm run cap:sync` ile `ios/`/`android/` içindeki gömülü web paketleri de
   taze (obfuscate edilmiş) derlemeyle senkronize edildi.

**Not — build-zamanı rastgelelik, oyun-zamanı determinizmle KARIŞTIRILMAMALI.**
`javascript-obfuscator` her çalıştırmada farklı bir çıktı üretir (metin dizisi
karıştırma vb.) — yani art arda iki `npm run build` birebir aynı dosyayı vermez.
Bu, GDD 28.3'teki oyun-içi RNG determinizmini (sabit tohum, kapalı piyasa günü
RNG tüketmez, vb.) HİÇ etkilemiyor — o kural oyunun kendi ekonomi mantığıyla
ilgili, derleme aracının kod yapısını rastgele düzenlemesiyle alakasız. Karıştırma
riskine karşı burada açıkça ayrıştırıldı.

**Bilerek YAPILMADI — sunucu tarafına taşıma.** Kullanıcıya sunulan üç seçenekten
biriydi ama önerilmedi ve seçilmedi: mimariyi kökten değiştirir, gizlilik
politikasının "hiçbir sunucumuz yok" iddiasını geçersiz kılar, çevrimdışı oynanışı
kırar. Yasal koruma (Kullanım Şartları'ndaki "izinsiz kopyalanamaz" maddesi) zaten
önceki turda yazılmıştı, ayrıca dokunulmadı.

#### YENİ · Fon müziği özelliği tamamen kaldırıldı — ✅ YAPILDI
`src/ui/music.ts` (silindi) · `src/ui/App.tsx` · `src/ui/shell/SettingsDialog.tsx` ·
`src/domain/preferences.ts` · `src/state/settings.test.ts` · `src/i18n/en.ts` ·
`public/assets/audio/music/` (silindi) · `tools/muzik-uret.py` (silindi)

Kullanıcı bu turda iki adım geriye gitti: önce "müziği beğenmedim" → varsayılan
kapatıldı (bir önceki tur), sonra açıkça *"müziği kaldıracaktın"* dedi — yalnız
varsayılanı kapatmak yetmiyordu, özelliğin kendisi istenmiyordu. Bu kez tam kaldırma
yapıldı, yarım bırakılmadı:

- **Kod:** `src/ui/music.ts` modülü, `App.tsx`'teki `applyMusic`/`resumeMusic`
  bağlantıları, `SettingsDialog.tsx`'teki "Müzik" anahtarı ve "Müzik düzeyi"
  kaydırıcısı satırları tamamen silindi (yarım kalan yorum/açıklama bırakılmadı,
  ilgili satırlar da temizlendi).
- **Veri modeli:** `PlayerPreferences`'tan `musicEnabled`/`musicVolume` alanları
  ve `DEFAULT_MUSIC_VOLUME` sabiti kaldırıldı. `normalizePreferences` artık bu
  alanları hiç okumuyor — eski (bu değişiklikten önceki) bir kayıtta hâlâ
  bulunabilirler, ama çıktıya girmezler; kayıt bozulmaz, yalnız anlamsız bir
  alan bir sonraki kaydediste kendiliğinden düşer. Standart "eski kayıt asla
  bozulmaz" kuralına bu şekilde uyuldu — alan SİLİNDİĞİNDE de kural geçerli,
  çünkü hiçbir yerde çökme veya veri kaybı yok, yalnız artık var olmayan bir
  tercihin sessizce yok sayılması var.
- **Varlıklar:** `public/assets/audio/music/tezgah.wav` + `LISANS.md` ve onu
  üreten `tools/muzik-uret.py` silindi. `ios/`/`android/`'in gömülü web
  paketleri `npm run cap:sync` ile tazelendi — eski derlemeden kalma
  `tezgah.wav` kopyaları da (gitignored ama diskte duruyordu) temizlendi.
- **i18n:** 4 ölü anahtar (`Müzik`, `Müzik düzeyi`, `Müzik kapalıyken
  ayarlanamaz`, `· fon müziği, sözsüz`) silindi. Denetleyici script'in bu kez
  hepsini doğru yakaladığı doğrulandı (önceki bir turda `'Bağla'yı alt dize
  eşleşmesi yüzünden kaçırmıştı — bu sefer öyle bir tuzak yoktu).
- **Testler:** `src/ui/music.test.ts` silindi (7 test). `settings.test.ts`'teki
  müzik-özel 5 test kaldırıldı, kalan testlerden `musicEnabled`/`musicVolume`
  alanları çıkarıldı; eski-kayıt uyumluluğunu doğrulayan TEK yeni test eklendi
  ("eski kayıttaki musicEnabled/musicVolume alanları sessizce düşer" — hem
  alanların çıktıda hiç görünmediğini hem komşu `soundEnabled`in etkilenmediğini
  sınıyor). Suite **977 → 966** (66 test dosyası → 55; müzik testleri düşünce
  beklenen fark).

**Doğrulama:** `tsc` temiz, `npm run i18n` 873/873 (0 kullanılmayan), taze
`npm run build` (obfuscation dahil) + tarayıcıda gerçek kontrol — Ayarlar
penceresinde "Müzik" hiçbir yerde geçmiyor (`innerText` ile ölçüldü), 0 konsol
hatası. `dist/assets/audio/` artık yalnız efekt dosyaları (236 KB, önceden
~1,5 MB) taşıyor.

---

#### YENİ · Ödüllü reklam altyapısı (Google AdMob) — ✅ YAPILDI
`src/ui/ads.ts` (yeni) · `src/state/gameStore.ts` · `src/ui/shell/RushFab.tsx` ·
`src/ui/shell/StatusStrip.tsx` · `src/ui/screens/ShopScreen.tsx` · `src/i18n/en.ts` ·
`capacitor.config.ts` iskeleti — `android/…AndroidManifest.xml`,
`android/…strings.xml`, `ios/App/App/Info.plist` · `store/legal/gizlilik-politikasi.md` ·
`store/README.md`, `store/*/checklist.md`, `store/*/metadata-taslak.md`

Kullanıcı isteği: "rewarded reklam zamanı hızlandırmak dükkana müşteri
çağırmak gibi ödül reklamlarımız olacak" — ve bunun için önce AdMob mı
başka bir ağ mı, test kimlikleriyle mi başlanacağı soruldu, "Google AdMob"
+ "Test ID'leriyle başla" seçildi.

**Keşif — hook'lar ZATEN oradaydı.** GDD, bu iki ödülü baştan öngörmüş:
`unlock4x()` (GDD 26.2, "4x yalnız rewarded ile geçici açılır") ve
`triggerCustomerRush()` (GDD 23.10.1, "Dükkânı Canlandır" — yalnız müşteri
geliş aralığını 90 dk kısaltır; müşteri kalitesi/bütçesi/rezervasyon fiyatı
DEĞİŞMEZ). `RushFab.tsx` ve `StatusStrip.tsx`'te video ikonlu düğmeler de
vardı — ama gerçek sağlayıcı yokken ikisi de tıklanır tıklanmaz ÜCRETSİZ
ödül veriyordu (kod bunu bilerek belgelemişti: "video izle" iddiasında
bulunmuyoruz). Bu turda yapılan iş yeni bir mekanik icat etmek değil, bu iki
çağrının önüne gerçek bir "reklamı gerçekten izledin mi" kapısı koymaktı.

**`src/ui/ads.ts` (yeni) — `@capacitor-community/admob` köprüsü:**
- `showRewardedAd(kind)`: native'de SDK'yı başlatır (initialize → iOS ATT
  izni → GDPR/UMP onay formu gerekirse), reklamı yükler, gösterir; ödülü
  YALNIZ `Rewarded` OLAYI ateşlenirse `true` döner. `Dismissed`/
  `FailedToShow` → `false`. Web/dev'de (Capacitor native değilken) SESSİZCE
  `false` döner — sahte "izledin" simülasyonu yapılmaz.
- NEDEN promise'e değil olaya güveniliyor: `@capacitor-community/admob`'un
  web stub'ı `showRewardVideoAd()`'ı ödül olayı hiç ateşlemeden sahte bir
  sonuçla çözüyor (paketin kendi `web.js`'i okunarak doğrulandı) — yalnız
  promise'e güvenseydik web'de her tıklama bedava ödül verirdi.
- Test reklam kimlikleri Google'ın herkese açık ÖRNEK ID'leri — `appId`
  placeholder'ıyla (`capacitor.config.ts`) aynı disiplin: yayından önce
  gerçek AdMob hesabından alınan App ID + iki Ad Unit ID ile değiştirilmeli.

**`gameStore.ts`:** `requestUnlock4x()` ve `requestCustomerRush()` eklendi —
`showRewardedAd()`i çağırır, ödül kazanılırsa mevcut `unlock4x()`/
`triggerCustomerRush()`u (değişmedi) çağırır, kazanılmazsa
"Reklam tamamlanmadı" balonu gösterir. Yeni `rewardedAdPending` alanı
(yalnız arayüz durumu, kayda girmez) çift tıklamayla iki reklam isteği
açılmasını engelliyor. `RushFab`/`StatusStrip` artık bu iki yeni action'ı
çağırıyor; eski `unlock4x`/`triggerCustomerRush` store içinde hâlâ var,
yalnız UI'dan doğrudan çağrılmıyor.

**Native config — GEÇİCİ test kimlikleriyle:** Android
`AndroidManifest.xml`'e AdMob App ID meta-data'sı, `strings.xml`'e
`admob_app_id` (test), iOS `Info.plist`'e `GADApplicationIdentifier`
(test), `SKAdNetworkItems`, `NSUserTrackingUsageDescription` eklendi.
`npm run cap:sync` ile native projelere işlendi, `@capacitor-community/
admob@8.1.0` her iki platformda da plugin listesinde göründü.

**Gizlilik politikası — artık gerçeği yansıtıyor:** "Reklam göstermez"
iddiası kaldırıldı; yeni "Reklamlar — Google AdMob" bölümü eklendi (yalnız
rewarded, ne zaman gösterildiği, Google'a giden veri, ATT/UMP, test-kimliği
uyarısı). `store/README.md` ve dört mağaza dosyası (`checklist.md` ×2,
`metadata-taslak.md` ×2) aynı gerçeğe göre güncellendi; Play Console "Data
safety" ve App Store "App Privacy" formlarının ARTIK "veri toplanmıyor"
diyemeyeceği, "Reklam kimliği" / "Third-Party Advertising" işaretlenmesi
gerektiği not edildi — bu formları ben dolduramam, hesap sahibi doldurmalı.

**Barındırılan gizlilik sayfası pin sorunu (ÇÖZÜLMEDİ, kullanıcı elinde):**
Sayfa güncel içerikle aynı URL'e yeniden yayınlandı, ama paylaşım linki
eski bir sürüme pinli kaldığı ortaya çıktı — ziyaretçiler hâlâ ESKİ
"reklam yok" metnini görüyor. Bunu düzeltmek sayfanın SAHİBİNİN elinde
(paylaşım menüsünden pini taşımalı); `store/legal/gizlilik-politikasi.md`
üstündeki not bunu açıkça uyarıyor.

**Doğrulama:** `tsc` temiz, `npm run i18n` 877/877 (0 kullanılmayan), 966/966
test yeşil (bu turda test değişmedi — yeni davranış ağırlıkla platform I/O,
birim testi değil, tarayıcıda doğrulandı). Taze `npm run build` + `cap:sync`
sonrası tarayıcı kontrolü: hem "Canlandır" hem "4x hızı reklamla aç"
düğmesine tıklanınca (web/dev ortamında, gerçek sağlayıcı yok) ÖDÜL
VERİLMEDİĞİ ve "Reklam tamamlanmadı" balonunun çıktığı doğrulandı — yani
sağlayıcı bağlandıktan sonra artık web'de bedava ödül YOK, 0 konsol hatası.

**Bilerek YAPILMADI:** IAP (uygulama içi satın alma) — kullanıcı "iap
tarafını oluşturmadık bile" dedi, bu turun kapsamı dışında bırakıldı.
Banner/interstitial reklam da bilerek eklenmedi (öneri gerekçesi: bu oyunun
temel değeri ekonomi/pazarlık matematiği, sürekli görünen ya da oynanışı
kesen reklam retention'a zarar verir — kullanıcıyla konuşulup onaylandı).

---

#### YENİ · Test kimlikleri gerçek AdMob kimlikleriyle değiştirildi — ✅ YAPILDI
`src/ui/ads.ts` · `android/app/src/main/res/values/strings.xml` ·
`ios/App/App/Info.plist` · `store/legal/gizlilik-politikasi.md` (+ barındırılan
sürüm) · `store/*/checklist.md`

Kullanıcı kendi AdMob hesabını açtı (`nostoscomp@gmail.com`), Android ve iOS
için ayrı uygulama kaydı oluşturdu, her ikisine birer ödüllü reklam birimi
ekledi ve 4 kimliği (2 App ID + 2 Ad Unit ID) buraya iletti — ben yalnız
Google'ın AdMob arayüzünde yapman gereken adımları anlattım, hesabı ben
açamıyorum.

- `src/ui/ads.ts`: `PLATFORM_AD_UNIT` artık gerçek Ad Unit ID'leri taşıyor
  (Android: `…/3366498503`, iOS: `…/9671167921`, yayıncı kimliği
  `ca-app-pub-4229088811556918`). Tek reklam birimi hem "4x hız" hem
  "Dükkânı Canlandır" için kullanılıyor — hangi ödülün verileceği reklam
  biriminde değil, `showRewardedAd(kind)`in çağrıldığı yerde belirleniyor,
  bu yüzden ikinci bir birim ZORUNLU değildi. `prepareRewardVideoAd`'daki
  `isTesting: true` ve `initialize`'daki `initializeForTesting: true`
  kaldırıldı — artık gerçek reklam isteniyor, test creative'i değil.
- Native: `strings.xml`'deki `admob_app_id` ve `Info.plist`'teki
  `GADApplicationIdentifier` gerçek App ID'lerle değiştirildi, "GEÇİCİ test
  kimliği" uyarı yorumları kaldırıldı. `npm run cap:sync` ile işlendi.
- Gizlilik politikası + barındırılan sürüm: "Şu an test reklamı" uyarı
  kutusu kaldırıldı (artık doğru değil), yerine reklam biriminin
  yayınlanmasının Google tarafında birkaç saat sürebileceği notu eklendi.
- İki store checklist'indeki "TEST App ID, yayına çıkma" uyarısı işaretlendi
  (`[x]`) — bu adım artık tamam.

**Barındırılan sayfa pin sorunu HÂLÂ ÇÖZÜLMEDİ** (bkz. bir önceki madde) —
sayfa gerçek kimliklerle yeniden yayınlandı ama paylaşım linki hâlâ eski bir
sürüme pinli; kullanıcının paylaşım menüsünden pini taşıması gerekiyor.

**Doğrulama:** `tsc` temiz, `npm run i18n` 877/877, 966/966 test yeşil, taze
`build` + `cap:sync` (her iki platformda `@capacitor-community/admob@8.1.0`
plugin listesinde). Gerçek reklamın native cihazda gerçekten göründüğü bu
ortamda doğrulanamaz — Xcode/Android Studio yok; kullanıcının kendi
cihazında ilk TestFlight/internal testing derlemesinde denemesi gerekiyor.

---

#### YENİ · Aşama Şeridi'ndeki 1/2/3/4 numaraları kaldırıldı — ✅ YAPILDI
`src/ui/shell/StageStrip.tsx` · `src/ui/shell/AppShell.css`

Kullanıcı isteği: "1-2-3-4 diye yazan satırın kalkmasını istiyorum." Numara
rozetleri (`stageStrip__num`, yuvarlak kenarlıklı "1"/"2"/"3"/"4") ve onlara
ait CSS kuralları silindi; etiketler ("İncele", "Değerle", "Çıkış Planı",
"Pazarlık" vb.) tek başına kaldı. GERİ/İLERİ GEZİNME VE KİLİT DAVRANIŞI
DEĞİŞMEDİ — yalnız görsel rozet kaldırıldı, şeridin kendisi (GDD 23.10.3
gereği önceki aşamaya dönme yeteneği) durdu. Eğer kullanıcının kastı şeridin
TAMAMININ kaldırılmasıysa (numara değil), bu ayrı ve geri dönüşü daha büyük
bir değişiklik olur — geri bildirim beklenmeden varsayılan olarak daha
küçük/tersinir yorum seçildi.

Doğrulama: `tsc` temiz, 966/966 test yeşil, taze build+cap:sync.

---

#### YENİ · Pazartesi açılış geçiş (interstitial) reklamı — ✅ YAPILDI
`src/ui/ads.ts` · `src/state/gameStore.ts` (`advanceDay`) ·
`store/legal/gizlilik-politikasi.md` (+ barındırılan sürüm)

Kullanıcı isteği: "pazardan pazartesiye geçtiğimizde reklam verecez
zorunlu reklam gibi." Bunu ilk mesajda "1-2-3-4 satırı" ve yeni Ad Unit
ID'lerle karışık, kesik bir cümle olarak yazmıştı; ID'leri önce yanlışlıkla
"Dükkânı Canlandır"ın ikinci reklam birimi sandım (bir önceki commit), user
düzeltince gerçek niyeti netleşti — geri alındı.

**ÖNEMLİ AYRIM — rewarded DEĞİL, interstitial:** "Zorunlu reklam" isteği
AdMob'un rewarded kurallarıyla ÇELİŞİR: rewarded format oyuncunun kendi
başlatmasını ve vazgeçebilmesini şart koşar; otomatik/zorunlu göstermek
hesabın askıya alınmasına yol açabilir. Bunun yerine kullanıcının verdiği
2 ID (iOS `…/7939178650`, Android `…/7681148035`) **interstitial** (geçiş
reklamı) formatına bağlandı — bu format otomatik gösterime uygun, kapatma
kontrolü Google'ın kendi reklam çerçevesinde.

- `src/ui/ads.ts`: yeni `showInterstitialAd()` — `prepareInterstitial` +
  `showInterstitial`, `Dismissed`/`FailedToShow` olaylarını bekler, ÖDÜL
  DÖNDÜRMEZ (`Promise<void>`). Web/dev'de sessizce no-op.
- `gameStore.ts` `advanceDay()`: `weekdayOf(s.market.day) === 6` (kapanan
  gün Pazar) olduğunda `void showInterstitialAd()` — FIRE-AND-FORGET,
  `await` edilmiyor. Gün kapanışı state'i, kaydı, toast'ları reklamdan
  BAĞIMSIZ tamamlanır; reklam yüklenemese bile gün asla kilitlenmez —
  ekonominin/ilerlemenin bir reklam sağlayıcısına bağımlı olmaması GDD'nin
  "asla bozulmaz" ilkesiyle aynı disiplin.
- Gizlilik politikası "Reklamlar" bölümü iki reklam türünü ayrı ayrı
  anlatacak şekilde güncellendi (rewarded + interstitial); barındırılan
  sayfa da eşleşecek şekilde yeniden yayınlandı (pin sorunu hâlâ geçerli,
  bkz. yukarı).

Doğrulama: `tsc` temiz, 966/966 test yeşil, taze build+cap:sync.

---

#### YENİ · Personeli reklamla/tek seferlik ödeyerek seviye şartı olmadan aç — ✅ YAPILDI
`src/domain/types.ts` (`StoreState.personnelAdUnlockLevel`) · `src/domain/v5-rules.ts`
(`personnelAdUnlockLevel`, `personnelAdUnlockCost`, `canSetPersonnel`) ·
`src/domain/settlement.ts` (`closeDay` 5. parametre) · `src/state/save.ts` ·
`src/state/gameStore.ts` (`unlockPersonnelTier`, `requestPersonnelAdWaiver`) ·
`src/ui/screens/BusinessScreen.tsx` · `src/ui/screens/Screens.css` ·
`src/i18n/en.ts` · `src/state/day-close.test.ts` (+16 test)

Kullanıcı isteği (üç turda netleşti): "1 personel yazan yere 1 günlüğüne
personel kirala olacak — 40k verip açtığın personeli reklam izleyip
kiralayabileceksin, aynı şekilde 90k'yı, 150k'yı..." → doğrulama sorusuna
("40k ödeyip bir personel slotunu KALICI açıyorsun; sonrasında o slotu HER
GÜN doldurmak için ya 40k daha ödersin ya da reklam izlersin") "Evet tam
olarak bu" onayı geldi.

**Keşif — 40k/90k/150k rastgele değil, `PERSONNEL_MONTHLY`'nin ta kendisi.**
Mevcut personel sisteminde 1/2/3 personelin AYLIK toplam maaşı zaten tam
40.000 / 90.000 / 150.000 ₺ (`PERSONNEL_SALARIES = [40k, 50k, 60k]`
kümülatif). Kullanıcı ekrandaki personel seçim düğmelerinde yazan bu
rakamları görüp tarif etmiş. Bu, işi YENİ bir paralel ekonomi icat etmekten
kurtardı — mevcut kademelere ALTERNATİF bir açılış yolu eklemek yeterliydi.

**Mimari — iki ayrı, net sınırlı mekanik:**
1. **Tek seferlik, GERÇEK PARAYLA açılış** (`unlockPersonnelTier`): normalde
   `PERSONNEL_UNLOCK_LEVELS = [1,3,6,10]` seviye şartı var; bu, `store.level`
   yetmese de kademenin AYLIK toplamını (aynı `PERSONNEL_MONTHLY`) tek
   seferlik ödeyip seviye şartını BAYPAS eder ve o kademeye hemen işe alır.
   REKLAM DEĞİL — `upgradeStore()` ile birebir aynı disiplin: `SettlementTransaction`
   + `applyTransaction`, GDD 22.1 tek kasa yolu. txId kademe başına sabit
   (`personnel_ad_unlock_tier_N`) — idempotent, aynı kademe iki kez ödenmez.
   `personnelAdUnlockLevel` kalıcı, `speed4xUnlocked` gibi asla düşmez.
2. **Günlük, REKLAMLA dolum** (`requestPersonnelAdWaiver`): personel varsa,
   `closeDay()`'in her gün otomatik kestiği `personnelDaily()` giderini o gün
   için ücretsizleştirir. `closeDay` artık 5. parametre alıyor
   (`personnelCostWaived`, varsayılan `false` — eski çağıranlar/testler
   HİÇBİR değişiklik görmeden çalışmaya devam eder). `personnelCostWaivedToday`
   bayrağı `advanceDay()`'de her gün sıfırlanır, kadronun kendisine
   dokunmaz — yalnız o günkü gideri 0 sayar.

**Etiket düzeltmesi:** İlk yazımda tek seferlik ödeme işlem etiketine
yanlışlıkla "...reklamla aç" yazılmıştı — düzeltildi ("...seviye şartı
olmadan aç"), çünkü o adım gerçek nakit, reklam değil; İşlem Defteri'nde
oyuncuyu yanıltmasın diye.

**UI (`BusinessScreen.tsx`):** Personel seçim ızgarasındaki her kilitli
(seviye yetmeyen) sütunun altına "{tutar} öde, hemen aç" düğmesi eklendi.
Personel sayısı >0 ise, altına günün durumuna göre ya "gider ücretsizleşti"
notu ya da video ikonlu "Reklam izle, bugün ücretsiz olsun" düğmesi çıkar.

**Doğrulama:** `tsc` temiz, `npm run i18n` 887/887 (0 kullanılmayan),
978/978 test yeşil (16 yeni: unlock maliyeti = `PERSONNEL_MONTHLY`, seviye
baypası, çift ödeme yok, yetersiz nakitte ücretsiz-çıkış, geçersiz kademe
reddi, `closeDay` waiver ile/waiversiz, `requestPersonnelAdWaiver`'ın
personel yokken ve web/dev'de asla bedava vermediği). Taze build + tarayıcı
ucuca doğrulama: 3 kilitli kademe de doğru buton metniyle göründü, "1 personel"
tıklanınca gerçek 1.000.000 ₺'den 40.000 ₺ düştü + "1 personel kademesi
açıldı" toast'ı çıktı + ücretsizleştirme bloğu belirdi ("Bugünkü personel
gideri: 1.333 ₺" — `40000/30` doğru), reklam düğmesine basınca web'de
"ücretsizleşmedi" toast'ı çıktı (bedava değil). 0 konsol hatası.

---

#### YENİ · Personel kademesi reklamla da GEÇİCİ (7 gün) açılabiliyor — ✅ YAPILDI
`src/domain/types.ts` (`personnelTempUnlockTier`, `personnelTempUnlockUntilDay`) ·
`src/domain/v5-rules.ts` (`personnelEffectiveMaxTier`, `personnelTempUnlockActive`,
`PERSONNEL_TEMP_UNLOCK_DAYS`) · `src/state/gameStore.ts`
(`requestPersonnelTempUnlock`, `advanceDay()` geri düşürme) · `src/state/save.ts` ·
`src/ui/screens/BusinessScreen.tsx` · `src/i18n/en.ts` · `src/state/day-close.test.ts`
(+6 test)

Bir önceki turda "40k öde, kalıcı aç" mekaniğini yaptıktan sonra kullanıcı
ekran görüntüsüyle düzeltti: "bunlar seviyeye bağlı açılacakcı... her
kademe atladıkça bir sonraki kademeyi 15 dk reklam izleyip açmak idi."
Netleştirme turunda ortaya çıktı: **iki mekanik BİRLİKTE var, biri
diğerinin yerine değil** — "seviye+para ile açılacak ama reklam izleyince
oyun içi 1 gün kalıcı olsun" → "1 gün ya da 1 hafta, hangisi mantıklıysa
sen seç." 1 hafta (7 gün) seçildi: 1 gün zaten `personnelCostWaivedToday`nin
işi (günlük gider muafiyeti), tek bir reklamı ayrıca anlamlı kılmak için
daha uzun bir pencere gerekiyordu.

**Yeniden adlandırma:** Önceki turda `personnelAdUnlockLevel` diye
adlandırdığım alan aslında GERÇEK PARA ile açılıyordu — "ad" (reklam) adı
yanıltıcıydı. `personnelPaidUnlockLevel` / `personnelPaidUnlockCost` olarak
yeniden adlandırıldı (tx etiketi de "...reklamla aç" → "...seviye şartı
olmadan aç" düzeltildi). Şimdi GERÇEKTEN reklamla açılan yeni alanlar
`personnelTempUnlockTier` / `personnelTempUnlockUntilDay` adını aldı —
isim karışıklığı bir daha olmasın diye.

**`personnelEffectiveMaxTier(store, day)`** üç kaynağın (seviye,
kalıcı-ödenmiş, aktif-geçici) EN YÜKSEĞİNİ döner; `canSetPersonnel`in 3.
parametresi artık `day` — verilmezse (eski çağıranlar/testler)
`Number.POSITIVE_INFINITY`'ye düşer, yani geçici açılış HİÇ sayılmaz
(varsayılanı `0` yapmıştım ilk denemede, `personnelTempUnlockUntilDay`
gerçek bir gün taşıyorsa `0 <= 5` yanlışlıkla "hâlâ geçerli" sayıyordu —
kendi testimde yakalandı, düzeltildi).

**`advanceDay()`** her gün `personnelEffectiveMaxTier(store, nextDay)`i
yeniden hesaplar; süresi dolan geçici kademe varsa `personnelCount`
kendiliğinden geri düşer — oyuncu hiçbir şey yapmasa bile 7. günün sonunda
fazla kadro sessizce kaybolur, ekonomi asla eksi bakiyeye düşmez (yalnız
kapasite/kadro geri çekilir, kasaya dokunulmaz).

**UI:** Her kilitli kademe sütununda artık İKİ buton yan yana: "{tutar}
öde, hemen aç" (kalıcı, gerçek para) ve "Reklamla 7 gün aç" (geçici,
ücretsiz). Geçici açılış aktifken ayrı bir durum satırı kalan günü
gösterir ("2 personel reklamla açık — 5 gün kaldı").

**Doğrulama:** `tsc` temiz, `npm run i18n` 892/892, 984/984 test yeşil (6
yeni: `personnelTempUnlockActive` sınır günü, `personnelEffectiveMaxTier`
üç kaynağın maksimumu, `canSetPersonnel`in `day` olmadan geçiciyi hiç
saymadığı, web/dev'de asla bedava vermediği, zaten erişilebilirse reklam
istemediği, ve en önemlisi — `advanceDay()`'in tam 7 gün boyunca kadroyu
KORUDUĞU, 8. günde geri düştüğü). Taze build + tarayıcı ucuca doğrulama: 3
kilitli kademede 6 buton (3×2) doğru etiketle göründü, reklam düğmesine
basınca web'de "personel açılmadı" toast'ı çıktı, geçici-açık durum
satırı YANLIŞLIKLA görünmedi (ödül verilmediği için doğru), 0 konsol hatası.

---

#### YENİ · Personel: gerçek para ödeme yolu tamamen kaldırıldı, reklamla açılış YALNIZ 3. kademe — ✅ YAPILDI
`src/domain/types.ts` (`personnelPaidUnlockLevel` alanı silindi) ·
`src/domain/v5-rules.ts` (`personnelPaidUnlockLevel()`, `personnelPaidUnlockCost()`
silindi; `personnelEffectiveMaxTier` iki kaynağa indi) · `src/state/gameStore.ts`
(`unlockPersonnelTier` action'ı tamamen silindi) · `src/state/save.ts`
(`migrate()`'ten alan kaldırıldı) · `src/ui/screens/BusinessScreen.tsx`
("öde, hemen aç" düğmesi silindi, reklam düğmesi `count === 3` şartına
bağlandı) · `src/state/day-close.test.ts` (5 eski test silindi, 1 test
düzeltildi) · `src/i18n/en.ts` (5 kullanılmayan anahtar silindi)

Bir önceki turda kullanıcının onayladığını sandığım tasarımı ("40k öde,
kalıcı aç" + ayrıca "reklamla 7 gün geçici aç", ikisi birlikte) canlı
ekranı görünce reddetti: **"bak demek istediğim tam olarak yapmamışsın.
gerçek para ödeme sistemini kaldır. 3. personele reklam reklam ekle diğerleri
yine kalksın."** Yani: 1. ve 2. kademe eskisi gibi YALNIZ seviye şartına
bağlı kalsın (`PERSONNEL_UNLOCK_LEVELS`), başka hiçbir açılış yolu (ne para
ne reklam) olmasın; SADECE 3. kademe reklamla (7 gün geçici) açılabilsin.

**Kaldırılan:** `personnelPaidUnlockLevel` alanı, `personnelPaidUnlockLevel()`/
`personnelPaidUnlockCost()` fonksiyonları, `unlockPersonnelTier` store
action'ı (tek seferlik `SettlementTransaction` ile kasadan düşen kalıcı
açılış), "{tutar} öde, hemen aç" UI düğmesi ve ilgili 5 test +
5 i18n anahtarı.

**Sadeleşen `personnelEffectiveMaxTier(store, day)`** artık yalnız İKİ
kaynağın en yükseğini döner: seviye şartı ve aktif geçici (reklamlı)
açılış — kalıcı-ödenmiş kaynak tamamen gitti. `requestPersonnelTempUnlock`
action'ının kendisi (herhangi bir kademeyi kabul eden genel hâliyle)
değişmedi; kısıtlama yalnız UI çağrı noktasında: `BusinessScreen.tsx`
artık reklam düğmesini `locked && count === 3` şartıyla, yalnız 3. kademe
için gösteriyor. `advanceDay()`in geri düşürme mantığı değişmedi.

**Doğrulama:** `tsc -b --noEmit` temiz · `npm run i18n` → 887/887, 0
çevrilmemiş, 0 kullanılmayan · `npx vitest run` → 976/976 yeşil (8 eski
test silindi, 1 düzeltildi: `personnelEffectiveMaxTier` artık yalnız
seviye+geçici test ediyor) · `npm run build` + `npm run cap:sync` temiz ·
Taze tarayıcı doğrulaması (Playwright, 390×844): İşletme → Personel
akordeonu açıldı, 1. ve 2. kademe sütunlarında (Sv 3, Sv 6) HİÇBİR düğme
yok — yalnız düz metin ("Sv 3", "Sv 6"), tam olarak özellik öncesi hâliyle
aynı; 3. kademe (Sv 10) altında TEK bir "Reklamla 7 gün aç" düğmesi var;
"öde, hemen aç" metni sayfada 0 kez geçiyor.

---

#### YENİ · Dükkan ekranında sayfa kaydırması yapısal olarak kapatıldı — ✅ YAPILDI
`src/ui/tokens.css` (`html, body, #root` artık `overflow: hidden`) ·
`src/ui/workbench/Workbench.css` (`.svc__note--clamp2`) ·
`src/ui/workbench/PurchaseStages.tsx` (`PackageStage` notuna clamp) ·
`src/ui/shell/AppShell.css` (`.coach__text` clamp)

Kullanıcı, Paket aşamasının ekran görüntüsünü göndererek "Oyunda bu ekranda
hala aşağı kaydırıyorum bunların önüne geçmemiz lazım" dedi. GDD 23.22 bu
ekranda dikey scroll'u zaten YASAKLIYOR ve `.device`/`.screen--noScroll`/
`.workbench`/`.wb` hepsi `overflow: hidden`; ekran görüntüsünde de somut bir
kanıt vardı: `.svc__note` paragrafı kelimenin ortasından ("...Güncel")
kesiliyordu — `.wb`in kırpma sınırına takılmış hâm bir pikselkırpması,
GDD'nin istediği "yoğunluk azalt" değil.

Kök nedeni tam olarak kullanıcının cihazında birebir üretemedim (headless
Playwright'ta 390×844'te aynı senaryo — tek kalemli "Talep tam karşılandı"
paketi — hiç taşmadan tam oturdu, `docScroll.scrollHeight === clientHeight
=== 844`); gerçek cihazda font/tarayıcı-arayüzü farkı taşmayı tetikliyor
olmalı. Bu yüzden iki katmanlı çözüm:

1. **Taban garantisi:** `html, body, #root`'a `overflow: hidden` eklendi.
   Her ekran zaten kendi kapalı kutusunu yönetiyor (`.page`/`.page__scroll`
   ayrımı Stok/Atölye/İşletme'de, `.avatarGrid`/`.talentTreeSheet__scroll`
   modallerde) — hiçbir ekran belge/gövde kaydırmasına GÜVENMİYOR, doğrulandı
   (Stok sekmesinde `.page__scroll` kendi `overflow-y:auto`sunu koruyor,
   `body`/`html` `overflow:hidden` olsa da iç kaydırma çalışıyor). Artık iç
   bir bileşen beklenmedik biçimde taşarsa bile dış sayfa ASLA kaymaz.
2. **Zarif kırpma:** `.svc__note` (Paket notu) ve `.coach__text` (öğretim
   şeridi metni) artık `-webkit-line-clamp: 2` ile 2 satırda temiz "…" ile
   biter — kelimenin ortasından kesilme bir daha olamaz.

**Doğrulama:** `tsc` temiz, `npm run i18n` 887/887 (0/0), 976/976 test yeşil,
`npm run build` + `cap:sync` temiz. Playwright: (a) Paket aşamasında
`docScroll`/`bodyScroll` 844/844 — taşma yok; (b) Stok sekmesinde
`.page__scroll` hâlâ kendi içinde kayabiliyor (`body`/`html`nin
`overflow:hidden`ı iç kaydırmayı bozmadı).

---

#### YENİ · Öğretim şeridi (CoachBar) kompaktlaştırıldı — ✅ YAPILDI
`src/ui/shell/AppShell.css` (`.coach__skip`, `.coach__text`)

Kullanıcı: "oyuna başlarken yardımcı ipuçları ekranda bize engel oluyor onu
nasıl kompaktlaştırabilirsin fikir yürütüp mantıklı geliyorsa uygulamanı
istiyorum." Ölçüldü: oyunun İLK açılışında görünen tek ders olan
`welcome`da (`showSkip=true`, GDD 25) `.coach__skip` ("Öğretimi kapat")
düğmesi `min-height: 44px` taşıyordu — bir bağlantı metni için tam bir
dokunma hedefi kadar GERÇEK dikey yer harcıyordu, İşlem Masası'ndan
çalınıyordu.

**Fix:** `.coach__skip`nin GERÇEK kutusu artık metnin doğal satır
yüksekliğine (~13 px) düşüyor; 44 px'lik dokunma hedefi `.speed__step::after`
ile AYNI desenle (görünmez, mutlak konumlu sözde-öge) korunuyor — dokunma
alanı kaybolmadı, yalnız düzene ayırdığı GERÇEK yükseklik gitti. Ayrıca
`.coach__text` (ders gövdesi) 2 satırda kırpılıyor — uzun bir ders metni
şeridi büyütemez.

**Ölçüm (Playwright, 390×844, ilk açılış, hiçbir ders kapatılmadan):**
`.coach` toplam yüksekliği ÖNCE ~110-122 px (hesaplanan: skip 44 + text
~2-3 satır + title + padding) → SONRA **80 px** — skip kutusu tek başına
44 px'ten 13 px'e indi. `.workbench` alanı buna karşılık **445 px**'e
çıktı (önceden ~365-380 px civarındaydı). Sayfa hâlâ taşmıyor
(`docScroll` 844/844). Skip düğmesi görsel olarak küçüldü ama
`getByRole('button', {name:'Öğretimi kapat'})` ile hâlâ tıklanabilir
doğrulandı.

**Doğrulama:** `tsc` temiz, `npm run i18n` 887/887, 976/976 test yeşil,
build + cap:sync temiz, ekran görüntüsüyle görsel doğrulama yapıldı.

---

#### YENİ · Müşteri alış akışından "Paket" aşaması komple kaldırıldı — ✅ YAPILDI
`src/domain/types.ts` (`WorkbenchStage`'den `'package'` silindi) ·
`src/ui/shell/StageStrip.tsx` (`PURCHASE_STEPS`/`PURCHASE_ORDER` iki adıma
indi: Stok → Pazarlık) · `src/state/gameStore.ts` (`canEnterStage`'den
`case 'package'` silindi) · `src/ui/screens/ShopScreen.tsx` (`PackageStage`
render dalı, `PurchaseDock`'un `case 'package'` bloğu ve ToolRail'in
"Pakete bak" düğmesi silindi; `case 'stockPick'` doğrudan Pazarlığa geçecek
şekilde büyütüldü) · `src/ui/workbench/PurchaseStages.tsx` (`PackageStage`,
`Figure`, `stripRepeatedChannel` silindi; `fulfilmentText` export edildi) ·
`src/ui/workbench/Workbench.css` (`.pkgLines`/`.pkgFigures`/`.pkgFigure*`/
`.svc__note--clamp2` — artık tüketicisi kalmayan ölü kurallar silindi) ·
`src/i18n/en.ts` (5 kullanılmayan anahtar silindi)

Kullanıcı, Stok aşamasının ekran görüntüsünü göndererek: **"Paket diye bir
ekran seçeneği de olmasın paket kısmını da çıkartır mısın komple."** Üç
adımlı akış (Stok seçimi → Değer/Paket → Pazarlık) iki adıma indi (Stok
seçimi → Pazarlık); ara "Paket" ekranı (Adil değer/Alış Maliyetim/Kanal
önerisi/Kâr-Zarar rakamları + gerekçe notu) tamamen kaldırıldı.

**Bilgi kaybı var mı diye önce kontrol edildi:** `NegotiateStage`
zaten satış akışında bir `refPanel` gösteriyordu ("Piyasa Referans Satış",
"İstediğin Fiyat", "Referansa Göre Fark") ve `PurchaseDock`'un pazarlık
case'i zaten teklife göre "Kâr" etkisini `OfferControl`'e besliyordu.
Pazarlığa girerken teklif zaten `purchaseStartingOffer(purchase)`e
(= eski "kanal önerisi" rakamı) yerleşiyor. Yani PackageStage'in gösterdiği
dört rakamın üçü (kanal önerisi = başlangıç teklifi, kâr/zarar = OfferControl
etkisi, piyasa referansı = refPanel) zaten Pazarlık ekranında vardı;
kaybolan yalnız statik "Adil değer" satırı ve tanıtım cümlesiydi (GDD 6.6
zaten müşterinin gizli tavanını hiçbir yerde göstermiyordu).

**`case 'stockPick'` (`PurchaseDock`)** artık paket hazır olur olmaz
(`purchase.fulfilment !== 'none'`) özetini "Kanal önerisi: {tutar} · maliyet
{tutar}"a yükseltiyor (eskiden Paket ekranında duran bilgi) ve "Pazarlığa
Geç" birincil eylemi doğrudan `setOffer(purchaseStartingOffer(purchase));
s.setStage('negotiate')` çağırıyor. Henüz yetersizken (`fulfilment ===
'none'`) özet `fulfilmentText()`e döner ("Yetersiz · X gerekiyor." /
"Kısmi karşılama · X/Y.") — oyuncu paketin durumunu hâlâ görüyor, yalnız
ayrı bir ekrana geçmeden.

**Doğrulama:** `tsc` temiz, `npm run i18n` 887→881 anahtar (0 çevrilmemiş,
0 kullanılmayan — 5 ölü anahtar silindi), 976/976 test yeşil, `npm run
build` + `cap:sync` temiz. Playwright (390×844) uçtan uca doğrulama: Stok
sekmesine girildiğinde Aşama Şeridi'nde artık yalnız "Stok"/"Pazarlık"
(`Contains "Paket"? false`); stoğu yetersiz bir müşteride Dock "Yetersiz ·
… gerekiyor." gösterip "Pazarlığa Geç"i devre dışı bırakıyor (doğru
davranış); yeterli stoklu bir müşteride "Pazarlığa Geç"e basınca doğrudan
Pazarlık ekranına düşüyor ve "Adil değer"/"Kâr" rakamları orada (Karar
Dock'unda) hâlâ görünüyor — bilgi kaybı yok. Sayfanın hiçbir yerinde
"Paket" kelimesi geçmiyor.

---

#### YENİ · Ekranda kalan "Paket" kelimesi komple temizlendi — ✅ YAPILDI
`src/ui/screens/ShopScreen.tsx`, `src/ui/workbench/PurchaseStages.tsx`,
`src/ui/workbench/NegotiateStage.tsx`, `src/ui/assets.ts`,
`src/state/gameStore.ts`, `src/domain/purchase.ts`, `src/data/store-tiers.ts`,
`src/i18n/en.ts`

Kullanıcı: **"Paket yazmasın hiç kafa karıştırıyor."** Önceki turda ekran
(Aşama Şeridi) kaldırılmıştı ama kelime hâlâ dört yerde kalmıştı — hepsi
ayrı bir grep taramasıyla bulundu ve değiştirildi:
- ToolRail "Paketi boşalt" (Stok aşaması) → **"Seçimi boşalt"**
- Karar Dock'u özet etiketi "Pakette" (Stok aşaması) → **"Seçim"**
- ToolRail "Paket" (Pazarlık aşaması, çoklu ürün toplu teklif hamlesi —
  `negotiationMove({kind:'package'})`, GDD 23.13) → **"Toplu Teklif"**;
  hamle şeridi geçmişi "Paket teklif ettin" → **"Toplu teklif ettin"**
- `data/store-tiers.ts`'teki mağaza kademesi unlock açıklaması "Pakete N
  kalem" (İşletme → Mağaza rotasında görünür, farklı bir mekanik: bir
  ziyarette kaç kalemin birden işlenebileceği) → **"Tek seferde N kalem"**
- `domain/purchase.ts`'teki iki `rationale` metni ("Pakette ürün yok."/
  "Paket henüz boş.") şu an hiçbir ekranda okunmuyor (`purchase.rationale`
  alanının artık UI tüketicisi yok) ama ileride yeniden bağlanırsa diye
  tutarlılık için yine de yeniden yazıldı: **"Seçimde ürün yok."** /
  **"Seçim henüz boş."**

Ayrıca `label:'Paket'` bir yerde hiç `t()` içine alınmamıştı (çevrilmeyen
sabit dize) — bu da düzeltilirken fark edilip `t()`e alındı.

**Doğrulama:** `tsc` temiz, `npm run i18n` 881/881 (0/0), 976/976 test
yeşil, `npm run build` + `cap:sync` temiz. Playwright uçtan uca: `grep`
ile `src/i18n/en.ts`, `src/data`, `src/ui` içinde canlı (yorum dışı) hiçbir
"Paket" dizesi kalmadığı doğrulandı; Stok → Pazarlık akışı yine sorunsuz
tamamlanıyor.

---

#### B0 · Terminoloji/kafa karıştırıcılık araştırması — 🔎 BULGULAR, ONAY BEKLİYOR
Kullanıcı: "Bu tarz kafa karıştırıp oynamayı zorlaştıracak şeyleri de
araştırır mısın." Proje zaten bir "İşlem Akışı ve Terminoloji Ara
Düzeltmesi" turu geçirmiş (`src/ui/terms.ts` — likidite→Nakit Durumu,
tez→Çıkış Planı gibi merkezi bir çeviri tablosu var). Bu turda ek olarak
şu adaylar bulundu ama HENÜZ DOKUNULMADI — kapsamı geniş ve öznel olduğu
için önce kullanıcı onayı isteniyor:
1. Müşteri "mizaç" rozetleri (TEMKİNLİ/KARARLI/HESAPLI/ACELECİ vb.,
   `CustomerStrip`) hiçbir yerde açıklanmıyor — yeni oyuncu bunun
   pazarlığı nasıl etkilediğini bilmiyor.
2. Aynı kavram için tutarsız kelime seçimi: "kalem" / "ürün" / "parça" /
   "mal" ekrandan ekrana değişiyor (StockPickStage "ürün", store-tiers
   "kalem", bazı toast'lar "mal").
3. Pazarlık ekranında üç ayrı "değer" rakamı bir arada ("Senin Analizin",
   "Piyasa Referans Alış/Satış", "Adil değer" — alış akışında) — hangisinin
   karar için asıl olduğu ilk bakışta net olmayabilir.
Bunlardan hangisiyle ilgilenmek istediğini kullanıcıya sorduk; onay
gelmeden geniş çaplı yeniden adlandırma yapılmadı.

---

#### YENİ · Öğretim şeridi (CoachBar) tekrar küçültüldü + gizli bir dokunma hatası düzeltildi — ✅ YAPILDI
`src/ui/shell/AppShell.css` (`.coach`, `.coach__title`, `.coach__text`,
`.rushFab`)

Kullanıcı örnek gösterdi: **"tavanın üstü zarardır ibaresi ekranda yer
kaplıyor, öğretici ipuçlarını ufaltmak istiyoruz."** Bir önceki turda
CoachBar'ı kompaktlaştırmıştım ("Öğretimi kapat" linkinin gerçek kutusunu
küçültmüştüm) ama "Anladım" düğmesi GDD 23.22'nin 44 px dokunma hedefini
korumak ZORUNDA (o BİRİNCİL kapatma eylemi, düzenli basılıyor — ikincil
"Öğretimi kapat" gibi görsel kutusu küçültülemez). Bu yüzden asıl kazanım
metin/dolgu tarafından geldi:

- `.coach`in dikey dolgusu `--sp-2` (8 px) → `--sp-1` (4 px).
- `.coach__title`/`.coach__text`in satır yüksekliği `1.35`/`--lh-normal` →
  `--lh-tight` (1.15) — zaten var olan bir token, yeni bir sayı icat
  edilmedi.

**Ölçüm (Playwright, 390×844):** "Tavanın üstü zarardır" (Pazarlık dersi)
şeridi **64,9 px → 54 px** (~%17 azalma); artık yüksekliği "Anladım"
düğmesinin kendi 44 px'i belirliyor (44+10 dolgu/kenarlık ≈ 54), yani
şerit fiilen mümkün olan en küçük hâlde — metin daha da kısılırsa hiçbir
kazanç olmayacaktı, bu yüzden burada durduk.

**Yan bulgu — gerçek bir dokunma hatası:** Ölçüm sırasında Playwright
"Anladım"a tıklarken `<button class="rushFab">...intercepts pointer
events` hatası verdi — kurgusal değil, GERÇEK bir örtüşme. `RushFab`
("Dükkânı Canlandır" yuvarlak düğmesi) çapası DOM'da CoachBar'ın hemen
ardından render ediliyor ve dairesi `top:-32px` ile "yarısı masada, yarısı
rayda" durur; şerit küçülünce bu taşma "Anladım"ın üstüne binmeye
başladı (ölçüldü: ~21 px dikey, ~60 px yatay örtüşme — daire üstte
olduğu için TÜM tıklamaları yutuyordu). `.coach + .rushFabAnchor .rushFab
{ top: 0 }` ile yalnız ders şeridi açıkken daire tamamen ray tarafına
çekildi; dersiz durumdaki orijinal "yarısı masada" görünüm DEĞİŞMEDİ.

**Doğrulama:** `tsc` temiz, `npm run i18n` 881/881, 976/976 test yeşil,
build + cap:sync temiz. Playwright: "Anladım" artık gerçek bir tıklamayla
sorunsuz tetikleniyor (önce hata veriyordu), RushFab/`coachOk` sınırları
ölçüldü — sıfır piksel örtüşme; ekran görüntüsüyle görsel doğrulama yapıldı.

---

#### YENİ · Pazarlık ekranında "değer" artık tek yerde, ama görünür — ✅ YAPILDI
`src/ui/screens/ShopScreen.tsx` (her iki `case 'negotiate'` — alış ve
satış akışı), `src/ui/workbench/NegotiateStage.tsx`,
`src/ui/workbench/Workbench.css`, `src/i18n/en.ts`

Kullanıcı, önceki turda önerdiğim üç araştırma bulgusundan birini seçti:
**"Pazarlık ekranında değer tek bir yerde gözüksün ama gözükür olsun."**
İnceleyince iki akışta da AYNI kalıp çıktı: Karar Dock'unun üst özet
satırı ("Teklifiniz"/"İstediğiniz fiyat") bir rakam gösteriyordu
("Alış tavanı"/"Adil değer") ama bu rakam BİRKAÇ SANTİM ÜSTTE, referans
panelinde ("Alış tavanı" `contextRow`da; "Piyasa Referans Satış"
`refPanel`da) ZATEN duruyordu — üstelik dock'un ETİKETİ ile GÖSTERDİĞİ
rakam bile birbirini tutmuyordu ("Teklifiniz" yazıp "Alış tavanı"
gösteriyordu). İki farklı yerde, bazen iki farklı isimle aynı ya da
benzer bir "değer" — hangisinin asıl olduğu belirsizdi.

**Kaldırılan:** Dock'un özet satırı artık yalnız SON TEKLİF geldiğinde
gösteriliyor (`hideSummary={!isFinal}`) — o an gösterdiği bilgi
("Müşteri: X — geri dönüş yok") başka hiçbir yerde yok, gerçekten TEK
yer. Pazarlığın normal akışında (henüz final değilken) özet satırı hiç
render edilmiyor; tekrar eden rakam gitti.

**Büyütülen (`gözükür olsun`):** Geriye kalan TEK yer artık daha görünür:
- Satış akışı: `.contextRow__val` ("Alış tavanı") `--fs-micro` (11px,
  bağlamdan miras) → `--fs-body` (15px).
- Alış akışı: `refPanel`ın referans satırı (`Piyasa Referans Satış/Alış`)
  band yokken (`!band` — alış akışında test/band hiç yok) `Senin
  Analizin`le AYNI "çapa" görünümünü (`refPanel__row--analysis`: pirinç
  renk + ayırıcı kenarlık) alıyor — panelin var olan, zaten test edilmiş
  vurgu deseni; yeni bir stil icat edilmedi.

**Doğrulama:** `tsc` temiz, `npm run i18n` 878/878 (3 ölü anahtar
silindi: "Adil değer {tutar}", "Alış tavanı {tutar}", "İstediğiniz
fiyat"), 976/976 test yeşil, build + cap:sync temiz. Playwright: alış
akışında ekran metninde artık ikinci bir "değer" satırı yok, referans
satırı görünür biçimde vurgulu; satış akışında "Alış tavanı" tam olarak
BİR kez geçiyor (`contextRow`da, büyütülmüş), dock'un tekrarı kayboldu.

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
