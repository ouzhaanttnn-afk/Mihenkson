# MIHENKAYNAK — UPDATEv5 teknik teslim raporu

> Sürüm notu: Aşağıdaki metin ilk yerel V5 tesliminin tarihsel raporudur. Sonraki kullanıcı talebiyle personel toplamları 40.000 / 90.000 / 150.000 TL olarak değiştirildi, 3 / 6 / 10 seviye kilitleri ve kalıcı gün kapanış pencereleri eklendi. Güncel kapsam ve doğrulama: [UPDATEv5_1_TEKNIK_RAPOR.md](UPDATEv5_1_TEKNIK_RAPOR.md). Klonun `codex/updatev1` dalına gönderim artık kullanıcı tarafından onaylandı; orijinale yazma ve otomatik merge yasağı sürüyor.

Tarih: 31 Ağustos 2026. Hedef: **yalnız yerel clonemihenk çalışma kopyası**.

Doğrulanan Git remote: `https://github.com/ouzhaanttnn-afk/clonemihenk.git`.
Çalışma dalı: `codex/updatev1`. UPDATEv5 değişiklikleri çalışma ağacındadır.
Bu çalışma sırasında commit, push, deploy, otomatik merge veya orijinal Mihenkaynak deposuna yazma yapılmadı. Canlı sitenin bu değişiklikleri göstermesi beklenmemelidir.

## 1. Değiştirilen dosyalar

Yeni domain dosyaları:

- `src/domain/v5-rules.ts`: günlük deterministik kurallar, personel, mg ve nihai TL yardımcıları.
- `src/domain/stock-pools.ts`: ortak stoklar ve ekonomik maliyeti koruyan dönüşüm.
- `src/domain/customer-pricing.ts`: müşteri fiyat bantları ve nihai perakende makası.
- `src/domain/has-account.ts`: HAS kotasyonu, cuma işlemleri, eritme.
- `src/domain/updatev5.test.ts`: 85 yeni V5 testi.

Güncellenen uygulama dosyaları:

```text
src/data/bullion.ts
src/data/item-templates.ts
src/domain/balance.ts
src/domain/channels.ts
src/domain/customer-spawn.ts
src/domain/intent.ts
src/domain/item-spawn.ts
src/domain/market.ts
src/domain/negotiation.ts
src/domain/purchase.ts
src/domain/settlement.ts
src/domain/trade-network.ts
src/domain/types.ts
src/domain/wholesaler.ts
src/state/gameStore.ts
src/state/save.ts
src/ui/App.tsx
src/ui/format.ts
src/ui/intent-line.ts
src/ui/screens/BusinessScreen.tsx
src/ui/screens/Screens.css
src/ui/screens/ShopScreen.tsx
src/ui/screens/StockScreen.tsx
src/ui/workbench/NegotiateStage.tsx
src/ui/workbench/PurchaseStages.tsx
src/ui/workbench/Workbench.css
```

V5 kurallarına uyarlanan mevcut testler:

```text
src/domain/acceptance.test.ts
src/domain/appraisal.test.ts
src/domain/bulk.test.ts
src/domain/channels.test.ts
src/domain/demand-naming.test.ts
src/domain/haggle-room.test.ts
src/domain/intent.test.ts
src/domain/invariants.test.ts
src/domain/pricing-view.test.ts
src/domain/wholesaler.test.ts
```

Önceden mevcut olan kirli çalışma ağacı korundu. `MIHENK_MARKET_HARICI_OYNANIS_RAPORU.md`, `src/state/save-profile.test.ts`, `src/state/save-integrity.test.ts` ve örtüşen bazı save/arayüz düzeltmeleri V5 öncesinden geliyordu; bunlar yeni V5 başarısı olarak sayılmadı. Global tema, navigation ve yetenek ağacı dosyaları yeniden tasarlanmadı.

Teslim kanıtları: `updatev5-test-results.json`, `reports/updatev5/shop-390x844.png`, `reports/updatev5/stock-390x844.png` ve bu rapor.

## 2. Ortak stok havuzları

| Havuz | Fiziksel muhasebe | İşlem miktarı |
|---|---|---|
| `24K_GRAM_GOLD_POOL` | Tek integer mg bakiyesi | 0,001 g hassasiyetle gram |
| `22K_INVESTMENT_BANGLE_POOL` | Tek integer mg bakiyesi | Yalnız 10 g katları |
| `QUARTER_GOLD_POOL` | Tek adet bakiyesi | Tam adet |

1 / 2,5 / 5 / 10 / 20 / 50 / 100 g tedarik seçenekleri aynı gram stokuna birleşir. Mevcut 22K işçiliksiz 10–100 g bilezik ailesi kullanıldı; yeni bir ürün ailesi icat edilmedi. İşçilikli ürünler fiziksel, ayrı item olarak kalır. Toptancıya gram havuzu bozdurmak da ondalıklı miktarı destekler.

## 3. Precision yaklaşımı

Ağırlığın kaynak değeri integer mg'dır: `106,85 g = 106850 mg`. UI gram gösterir. Gram çıkışlarında üç ondalıktan hassas, negatif, sıfır, NaN, sonsuz ve stok üstü miktarlar domain seviyesinde reddedilir. Bilezik/çeyrek çıkışları ayrıca tam birim denetiminden geçer.

Ara fiyat ve ortalama maliyet hesapları yuvarlanmaz. `roundMoney` final TL ödemesinde kullanılır. Kanal motorunun `unitPrice` değeri hassas, `totalPrice` değeri nihai ödemedir. Tedarik, müşteri paketi, toptancı bozdurma ve HAS bu nihai tutarı kullanır. Eski kayıttaki tarihi nakit/maliyet bakiyesi sırf format dönüşümü nedeniyle yuvarlanıp değiştirilmez.

## 4. Weighted average formülü

`yeni miktar = eski miktar + alınan miktar`

`yeni maliyet = eski miktar × eski birim ortalama + gerçek alım toplamı`

`yeni ortalama = yeni maliyet / yeni miktar`

Satışta ortalama sabit kalır. Satılan miktarın maliyeti ayrılır, kalan maliyet aynı ortalama ile hesaplanır. FIFO/LIFO eklenmedi. Yatırım bileziğinde mevcut miktar sözleşmesiyle 1 işlem birimi = 10 g; fiziksel toplam yine mg'dır. Çeyrek ortalaması adet başınadır.

## 5. Migration

Eski SKU miktarları kendi gramajıyla çarpılıp ortak havuza alınır. Pozisyonların kalan `costBasis` toplamı korunur. İlk pozisyonun ID'si kanonik kimlik olur; eski ID'ler için dönüşüm haritası oluşturulur. Aktif satın alma paketindeki eski SKU miktarları da aynı haritayla dönüştürülür.

Test örneği: 2,5 g + 20 g aynı havuzda 22,5 g olur; çeyrek ve işçilikli ürün ayrı kalır; toplam ekonomik maliyet değişmez. Dönüşümü ikinci kez çalıştırmak yeni gram veya maliyet üretmez.

## 6. Sabit ve personel giderleri

Mevcut `dailyOverhead` korundu; başlangıç dükkânında 1.200 TL/gün. Yeni sabit ücret uydurulmadı veya mevcut ücret ikinci kez eklenmedi.

| Personel | Aylık toplam | Günlük ham tutar |
|---|---:|---:|
| 0 | 0 TL | 0 TL |
| 1 | 40.000 TL | 40.000 / 30 TL |
| 2 | 50.000 TL | 50.000 / 30 TL |
| 3 | 60.000 TL | 2.000 TL |

Kapanış işlemi sabit gider + personel tutarını bir kez tahsil eder. Mevcut dış usta maliyeti servis işinin mevcut ödeme akışındadır; ayrı günlük usta maaşı bulunmadığından ikinci bir maaş icat edilmedi. Aynı günün kapanış transaction ID'si tekrar tahsilatı engeller.

## 7. Queue capacity

`min(10, 4 + personnelCount × 2)` uygulanır: 4 / 6 / 8 / 10. Kuyruk personeli mevcut atölye personeli/skill sisteminden ayrı alandır. Personel seçimi aylık toplam gösterilerek onaylanır. Spawn çıktısı, kalite ve trafik personelden etkilenmez; aynı seed/index için 0–3 personelin aynı müşteriyi ürettiği test edildi.

## 8. Kaçırılan Misafir

Kuyruk doluyken zamanlanan geçerli ziyaret üretimi devam eder; kişi kuyruğa eklenmez ve günlük sayaç bir artar. Boş slotta veya geçersiz talepte sayaç artmaz. Ek para, itibar veya ilişki cezası yoktur.

İşletme günlük akışında güncel sayaç ve son günün sayısı gösterilir; yeni günde sıfırlanır. Tarayıcı kontrolünde gün 11 raporu 6 kaçırılan misafir ve 3.200 TL toplam gider gösterdi; gün 12 sayacı sıfırdan başladı.

## 9. Günlük trafik

Bağımsız `dailyTraffic` salt'ı: %15 Durgun ×0,65; %50 Normal ×1; %25 Hareketli ×1,25; %10 Yoğun ×1,5. Mevcut itibar tabanlı geliş aralığı korunur, yalnız aralık çarpanı `1 / trafficMultiplier` uygulanır. Rate ve interval birlikte çarpılmaz.

Aynı seed/gün aynı havayı üretir. 10.000 günlük deterministik örneklem dağılım kontrolüne dahildir.

## 10. Intent 35/35/20 + 10 dağılımı

`dailyIntentSplit` salt'ıyla X = 0..10 inclusive integer üretilir. Dükkan alış = 35+X; dükkan satış = 45−X; sürpriz = 20. Ana toplam daima 100'dür. Eski 38/38/24 ana oranı kaldırıldı.

Her ziyaret bu ağırlıklarla bağımsız seçilir. Sayaç kotası, geçmiş satışa göre catch-up veya stok açığını otomatik tamamlama yoktur. Sürprizin mevcut iç havuzu alış/satış intent'i de döndürebildiği için gün sonu fiilî alış/satış yüzdesi yalnız ana taban yüzdesine eşit olmak zorunda değildir.

## 11. Alış 67/18 + 15 ürün dağılımı

`dailyPurchaseMix` salt'ıyla Y = 0..15 inclusive integer. Sarrafiye = 67+Y; işçilikli = 33−Y. Y gün boyunca sabittir. Önce grup seçilir, sonra o grubun mevcut uygun template havuzu kullanılır. Yeni bir ürün içi dağılım modeli oluşturulmadı. 4.000 ziyaretlik örneklemde günlük Y ile uyum test edildi.

## 12. Vitrin satış alt tipi %20 davranışı

Geçerli işçilikli vitrin stoku varsa yalnız alıcı ziyaretlerinin %20 alt seçimi vitrine yönlenebilir. Toplam ziyaret ve ziyaret kimliği değişmez. Vitrin yoksa standart katalog kullanılır. Seçim ayrı deterministik `customer/showcase` akışındadır. 5.000 ziyaretlik karşılaştırma, ziyaret sayısı/intent korunurken vitrin alt seçiminin yaklaşık %20 olduğunu doğrular.

## 13. Vitrin exact-item bağlantısı

Talep `targetInventoryItemId` taşır. Aynı template'e sahip başka item bile bu talebi karşılayamaz. Hem stok seçiminde hem transaction'da kimlik ve `display` konumu doğrulanır. Beklerken hedef kaybolursa ziyaret, saklanan standart talebine döner; yeni kişi üretilmez. `★ Vitrin Müşterisi` işareti vardır, garantili satış değildir.

Vitrine koyma fiziksel ürünü stokta tutar. Gün kapatma otomatik satış/gelir üretmez. Eritme fiziksel ürünü çıkarıp HAS ekler; TL geliri üretmez.

## 14. İşçilikli actualAcquisitionCost

Mevcut kalıcı `ItemInstance.buyCost` gerçek alış maliyetinin eşdeğeridir. Oyuncunun gerçekten ödediği fiyat olarak yazılır; piyasa değişiminde yeniden hesaplanmaz. Fiziksel işçilikli ürünün pozisyon maliyeti aynen kullanılır.

Paket ekranında Alış Maliyetim ve öneriye göre Kâr/Zarar; vitrin pazarlığında Alış Maliyetim, Güncel Metal Değeri, Satış/Müşteri Teklifi ve Kâr/Zarar gösterilir. Gerçekleşmiş ürün kârı = final satış − alış maliyeti. Günlük giderler bu basit ürün kârına eklenmez.

## 15. HAS/milyem hesapları

HAS 1,000; gram altın 0,995; yatırım bileziği 0,922; işçilikli 22K metal 0,912. İşçilikli 8K/14K/18K metal referansları sırasıyla 0,333 / 0,585 / 0,750.

HAS 7.100 TL/g iken test sonuçları:

- Gram altın: 7.064,50 TL/g.
- 22K yatırım bileziği: 6.546,20 TL/g; 10 g ürün 65.462 TL.
- Çeyrek: 11.455,85 TL. Template ve sarrafiye metadata aynı merkezi 1,75 g ağırlığını kullanır.

İşçilikli alış/satış katsayıları master belgede verilen dört ayar bandıyla birebir merkezi `CRAFTED_BANDS` tablosundadır. Bantlar net metal gramına uygulanır; yatırım bileziği işçilikli banda girmez.

## 16. Retail sarrafiye spread mapping

Calm 200–250; normal 300–350; volatile 350–450; shock 450–500 TL/g. Mevcut rejimin volatilite bandındaki konum, bu nihai banda map edilir ve sınırlandırılır. Müşteri kanalında eski product/relationship/channel spread yığını ikinci kez eklenmez. Toptancı/HAS kanalının mevcut spread katsayıları değiştirilmedi.

## 17. Sarrafiye negotiation range

R = metal referansı; S = toplam TL/g makas; W = gram. `dealerBuy = R − S×W/2`, `dealerSell = R + S×W/2`.

Müşteri satarken dealerBuy↔R, müşteri alırken R↔dealerSell ekonomik alanı kullanılır. Mevcut kişilik, güven, gerekçe ve rezervasyon hesabının çıktısı ilgili banda sınırlandırılır. Ayrı rezervasyon RNG'si veya fiyat motoru eklenmedi. Müşteri karşı teklifi de aynı bandın dışına taşmaz. Oyuncunun teklif kontrolü ve kabul/karşı teklif/vazgeçme durum makinesi korunur.

## 18. Cuma HAS / Toptancı

HAS fiziksel gram altından ayrı `hasBalanceMg` bakiyesidir. Müşteri kataloğunda HAS yoktur. Al/sat mevcut wholesaler fiyat motorundan gelir; normal sarrafiye tedariki cuma dışı kapanmaz.

MAX çıplak spotu değil toptancının oyuncuya satış fiyatını kullanır. Nakit/HAS aşımı reddedilir. 0,001 g hassasiyet desteklenir. İki adımlı tutar onayı ve benzersiz transaction ID ile işlem yapılır.

Yerel tarayıcı denemesi: 8,5 g HAS alımı 36.615 TL, aynı kotasyonda satışı 36.124 TL; net −491 TL. HAS tekrar 0 g oldu. Reload sonrası 929.332 TL nakit ve 12,5 g ayrı fiziksel stok korundu.

Eritmede mevcut %94 metal recovery ve 180 TL refining fee korundu. Yeni fire/ücret eklenmedi; HAS miktarı mg'ye aşağı yuvarlanır. Ürün maliyeti + mevcut eritme ücreti HAS maliyet kaydına taşınır.

## 19. Save migration

Dosya sürümü 2; mevcut storage anahtarı korunur. Eski kayıt desteklenir. Cash, XP, profil, itibar, ilişkiler, workshop, journal, market snapshot, gün, aktif müşteri, kuyruk ve devam eden pazarlık taşınır.

Aktif paket dönüşümünde toplam maliyet, teklif geçmişi ve aktif karşı teklif korunur. Kuyruk/personel/HAS/missed sayaçları yeniden yüklenir. Günlük X/Y/trafik aynı seed/günden tekrar aynı çıkar. Terminal işlem ID'leri defterde tutulur. Önceki sağlam kayıt yedeği korunur; gün geçişi kayıt doğrulanmadan ekrana uygulanmaz. UI işlem değişimlerinde ve sayfa gizlendiğinde kayıt alınır.

## 20. Eklenen testler

85 yeni V5 testi. Başlıca kapsam:

- 1+5+20=26 g; 8,5 g satıştan sonra 17,5 g; sabit ortalama; 1.000 mg çıkış serisi.
- Yatırım bileziğinin 10–100 g seçenekleri, 15/25 g ret, ayar/işçilik ayrımı.
- Çeyrek 10+20−8=22 adet ve maliyet korunumu.
- Personel 4/6/8/10, maaş toplamları, spawn değişmezliği, sabit gider.
- Dolu/boş/geçersiz spawn, missed sayacı, gün sonu reset.
- Günlük bağımsız RNG, trafik, 20.000 intent seçimi ve ürün grubu örneklemi.
- Vitrin %20 alt seçim, exact item, hedef kaybında aynı ziyaret fallback'i, otomatik satış olmaması.
- Milyemler, dört işçilikli fiyat bandı, tek perakende makası, iki yön rezervasyon ve karşı teklif.
- HAS cuma, ondalık miktar, MAX, pozitif olmayan round-trip, çift işlem ve eritme.
- Legacy stok maliyeti/gramı, aktif paket/teklif geçmişi, idempotent migration.

Eski testlerde V5 ile bilerek geçersizleşen varsayımlar güncellendi: eski intent oranı, 22K referans, nominal premium, iki müşteri kanalının ayrı makası ve birim fiyatı erkenden yuvarlama. Testler devre dışı bırakılmadı.

## 21. Build/typecheck/test sonucu

| Kontrol | Sonuç |
|---|---|
| `npm run typecheck` | Başarılı |
| `npm test -- --reporter=json --outputFile=updatev5-test-results.json` | 29 dosya, 625 test başarılı, 0 başarısız |
| `npm run build` | Başarılı; 113 modül |
| `git diff --check` | Başarılı |
| Yerel tarayıcı | 390×844 mobil görünümde kontrol edildi |
| Tarayıcı console error | Kontrol edilen oturumda 0 |

Build çıktısı: JS 439,59 kB / gzip 137,35 kB; CSS 75,78 kB / gzip 12,54 kB. Yerel `dist/` üretildi, deploy edilmedi.

Tarayıcıda ilk stok CTA'sı, katalog aç/kapa, 10+2,5 g birleşimi, cuma dışı HAS kilidi, cuma HAS al/sat onayı, reload, personel/gün sonu raporu ve bekleyen müşteri kartlarının mobil görünümü kontrol edildi. Ana navigasyon Dükkan / Stok / Atölye / Market / İşletme olarak korundu. React kontrolünde yeni formların etiketleri, onay durumları ve en az 44 px dokunma alanları gözden geçirildi.

## 22. Bilinen sapmalar / uygulama kararları

- Eski oyunda hafta günü kaynağı bulunmadığından oyun günü 1 = Pazartesi kabul edildi; 5/12/19/26 cuma. Gerçek takvim günü kullanılmaz.
- Ayrı günlük usta maaşı yoktu; mevcut servis maliyetini günlük giderde yeniden tahsil etmek yerine koruduk. Yeni maaş dengelemesi eklenmedi.
- Bilezik havuzu fiziksel olarak mg, eski işlem arayüzleriyle uyum için miktar olarak 10 g blok tutar. UI gramı gösterir; yeni serbest gramajlı bilezik ailesi yoktur.
- Kusurlu, yanlış ayarlı veya servisteki legacy ürünler kusursuz ortak altına dönüştürülmez. Bunlar fiziksel ürün olarak korunur. Mevcut kayıt testleri standart stok dönüşümü içindir; tüm gerçek kullanıcı kayıtlarının tek tek denendiği iddia edilmez.
- Hesaplar JavaScript number ile hassas ara para değeri ve integer mg kullanır; sınırsız büyüklükte arbitrary-precision finans kütüphanesi eklenmedi. Ürün/miktar limitleri mevcut oyun sınırları içindir.
- Sabit/personel giderini karşılayamayan nakitte kapanış atomik olarak reddedilir; otomatik borç, bağış veya yeni iflas ekonomisi eklenmedi.
- Test ve tarayıcı doğrulaması yerel klonda yapıldı. Gerçek iOS Safari cihazı, canlı Vercel dağıtımı ve uzun süreli tüm save havuzu doğrulanmadı. Otomatik test başarısı üretimde sıfır hata garantisi değildir.
- Orijinal/production'a yazma, GitHub push veya otomatik port yapılmadı. Yetenek ağacı ve Market içeriği kapsam dışında tutuldu.
