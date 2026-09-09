# MIHENK REMASTERED — Tasarım ve Üretim Brief'i

**Durum:** Üretim öncesi bağlayıcı brief  
**Taban:** `main` · `5310a0d`  
**Amaç:** Mevcut oyunu ve kayıtları koruyarak Mihenk'i daha tutarlı, profesyonel ve oyun hissi güçlü bir mobil ürüne dönüştürmek.

---

## 1. Ana karar

Mihenk sıfırdan yazılmayacak. Remaster; çalışan oyun motorunu, ekonomiyi ve içerik yapısını değiştiren bir yeniden yapım değil, mevcut ürünün **sunum ve kullanım kalitesi katmanı** olacaktır.

TradeUp'ın arayüzü, renkleri veya bileşenleri kopyalanmayacaktır. TradeUp'tan yalnızca şu üretim disiplini alınır:

- önce bağlayıcı tasarım kararı;
- tek görsel sistem;
- küçük ve geri alınabilir iş paketleri;
- ölçülebilir kabul kriterleri;
- her pakette test, build, commit ve cihaz doğrulaması;
- yayın öncesine kadar kapsam dondurma.

### Remaster başarı cümlesi

> Oyuncu ilk üç saniyede nerede olduğunu, hangi müşteriyle uğraştığını, parasını ve sıradaki ana kararını anlamalı; her ekran aynı kuyumcu dükkânının parçası gibi görünmelidir.

---

## 2. Kaynak önceliği

Uygulama başlamadan aşağıdaki kaynak sırası geçerlidir:

1. `MIHENKAYNAK GDD v2.3 — Final Production Edition`
2. Bu `MIHENK_REMASTER_BRIEF.md`
3. `spec/design_tokens.json`
4. `spec/asset_manifest.csv`
5. `README.md`
6. `DEVIR_VE_IYILESTIRME_PAKETI.md`
7. Mevcut kod ve testlerin kanıtladığı davranış

**Kaynak bütünlüğü kapısı:** GDD v2.3 dosyasının kendisi şu anda repository içinde bulunmuyor; README ona dış kaynak olarak referans veriyor. Görsel üretim başlamadan önce bağlayıcı GDD repository içine `docs/MIHENKAYNAK_GDD_v2.3.md` adıyla eklenmeli veya mevcut dış dosyanın kesin yolu kaydedilmelidir. GDD ile brief çelişirse GDD önceliklidir.

---

## 3. Değiştirilmeyecek alanlar

Remaster sırasında aşağıdaki sistemler **dondurulmuştur**:

- müşteri üretimi, müşteri niyetleri ve trafik dağılımı;
- pazarlık kabul eşikleri, sabır ve sertleşme dengesi;
- ürün değerleme, piyasa, alış-satış makası ve kâr formülleri;
- stok, atölye, personel, toptancı ve servis ekonomisi;
- gün akışı, gün süreleri ve haftalık olay yapısı;
- reklam yerleşimleri, ödül miktarları, limitler ve zorunlu reklam kuralı;
- IAP/marketplace hakları ve fiyatlandırma davranışı;
- progression, seviye, XP ve itibar kuralları;
- save şeması, migration ve oyuncunun mevcut kayıtları;
- deterministik RNG ve settlement sözleşmeleri.

### Teknik koruma sınırı

Normal remaster paketleri şu alanları değiştirebilir:

- `src/ui/**`
- `public/assets/**`
- `spec/design_tokens.json`
- `spec/asset_manifest.csv`
- yalnız sunuma ilişkin test ve raporlar

Şu alanlarda davranış değişikliği yasaktır:

- `src/domain/**`
- `src/data/**` içindeki ekonomik/oynanış verileri
- `src/state/gameStore.ts` içindeki oyun komutları
- `src/state/save.ts` ve migration zinciri
- `src/ui/ads.ts` içindeki reklam politikası
- `src/domain/balance.ts`

Bir görsel iyileştirme bu sınırların dışına çıkmayı gerektirirse paket durdurulur; değişiklik ayrı bir bug düzeltmesi olarak açıkça değerlendirilir.

---

## 4. Mevcut taban denetimi

### Güçlü temel

- Domain motoru React'tan ayrılmış saf TypeScript yapısında.
- UI için 59 kaynak dosyası ve 189 paketlenmiş görsel varlık bulunuyor.
- Renk, tipografi, boşluk, radius, motion ve dokunma ölçülerini tanımlayan ortak token sistemi mevcut.
- Ana kabuk 320–430 px genişliği ve portre kullanımı hedefliyor.
- `prefers-reduced-motion` desteği mevcut.
- Safe-area, iOS tam ekran, yakınlaştırma kilidi ve iPhone yön sözleşmeleri yayın kontrolünde doğrulanıyor.
- Ses, haptik, asset fallback ve responsive davranış için otomatik testler var.
- Son doğrulanmış tabanda 65 test dosyasında 1.068 test ve 77 maddelik yayın kontrolü geçiyor.

### Remaster gerektiren borç

- Görsel kurallar mevcut olsa da ekranlar arasında yoğunluk, kart hiyerarşisi ve yüzey kullanımı aynı olgunlukta değil.
- Ana dükkân ekranı çok sayıda sabit bölgeyi aynı anda taşırken boş, aktif müşteri ve pazarlık durumları farklı yoğunluk üretiyor.
- CSS zaman içinde çok sayıda cihaz/yükseklik istisnası kazanmış; yeni stil eklemek yerine önce ortak bileşen davranışı sadeleştirilmeli.
- Bazı varlıklar yüksek kaliteli görsellerken bazı ürün ve ikonlar daha basit fallback hissi veriyor.
- Profil çerçevesi, alt araç rayı, güvenli alan ve uzun metin taşmaları daha önce gerçek cihazlarda sorun çıkardı; yalnız masaüstü tarayıcı görüntüsü kabul kanıtı sayılamaz.
- Ayarlar, Market, İşletme ve yardımcı ekranlar işlevsel olsa da ana oyun sahnesiyle aynı dramatik ağırlığı taşımıyor.

---

## 5. Mihenk'in özgün görsel yönü

### Kimlik

Mihenk'in dünyası **gece açık, güven veren, usta işi bir kuyumcu dükkânı** hissi taşımalıdır. Ana malzemeler:

- koyu mürekkep ve grafit yüzeyler;
- kırık beyaz karar alanları;
- kontrollü, eskitilmiş pirinç/altın vurgular;
- yalnız seçili ve özel durumlarda ametist;
- vitrin camı, kadife, metal ve taş hissini veren düşük kontrastlı dokular;
- ürünleri ve yüzleri bastırmayan yönlü sıcak ışık.

### Kullanım oranı

- Koyu yüzey: sahne, üst bilgi, işlem alanı ve atmosfer.
- Açık yüzey: ana karar, teklif, onay ve okunması zorunlu bilgiler.
- Altın: değer, seçili ana eylem ve başarı; her kenarlıkta kullanılmaz.
- Ametist: aktif seçim, profil ve özel vurgu; ana para rengi değildir.
- Kırmızı/yeşil: yalnız semantik zarar/kâr ve risk sonucu.

### Kaçınılacak görünüm

- TradeUp ilan uygulaması estetiğini kopyalamak;
- her kartta parlak altın çerçeve;
- sürekli glow, lens flare ve parıltı;
- casino hissi, coin rain ve uzun konfeti;
- okunabilirliği azaltan yoğun mermer/metal doku;
- aynı ekranda birden fazla eşit güçte ana CTA;
- dekorasyon amacıyla gerçek ürün bilgisini küçültmek.

---

## 6. Ana ekran yeniden düzenleme sözleşmesi

Ana ekran mobil uygulama dashboard'u değil, oyuncunun dükkânındaki **aktif tezgâh sahnesi** gibi hissedilmelidir.

### Görsel öncelik sırası

1. Aktif müşteri veya sıradaki müşteri
2. Ürün/vaka ve oyuncunun mevcut karar aşaması
3. Ana eylem
4. Nakit ve piyasa referansı
5. Yardımcı araçlar
6. İlerleme ve ikincil navigasyon

### Korunacak kabuk

Durum şeridi, piyasa şeridi, müşteri şeridi, aşama şeridi, işlem masası, araç rayı, karar dock'u ve alt navigasyonun işlevsel sırası korunur. Remaster bu bölgeleri kaldırmaz; görsel ağırlıklarını, boşluklarını ve yüzey ilişkilerini iyileştirir.

### Ana ekran kabul kriterleri

- Ana CTA ilk görünümde ve başparmak bölgesinde kalır.
- Dükkan kök ekranında belge kaydırması oluşmaz.
- Dekoratif boşluk yüzünden karar alanı küçülmez.
- Aktif müşteri yokken sahne boş bir panel gibi görünmez; dükkân atmosferi ve sıradaki anlamlı eylem görülür.
- Uzun isim, yüksek nakit, büyük gün sayısı ve dört haneli fiyat değişimi üst şeritte çakışmaz.
- Canlandır ve rewarded araçları ana CTA'yı örtmez.

---

## 7. Ortak bileşen sistemi

### Kart ailesi

Yalnız dört kart seviyesi kullanılacaktır:

1. **Sahne kartı:** müşteri, ürün veya ana oyun olayı.
2. **Karar kartı:** karşılaştırma ve oyuncu seçimi.
3. **Bilgi kartı:** finans, risk ve durum özeti.
4. **Liste satırı:** stok, market ve ayar satırları.

Her seviye tokenlardan gelen sabit padding, radius, border ve elevation sözleşmesine sahip olur. Aynı seviyedeki kartlar ekrana göre farklı kişilik kazanmaz.

### Eylem hiyerarşisi

- Primary: ekranda en fazla bir; güçlü altın/açık kontrast.
- Secondary: sınır çizgili veya sakin yüzey.
- Tertiary: metin/ikon; ana kararla yarışmaz.
- Destructive: yalnız gerçek kayıp veya reddetme eylemi.
- Disabled: nedeni görünür; yalnız opaklıkla anlatılmaz.

### İkon sözleşmesi

- Aynı stroke, perspektif ve optik kutu.
- İkon tek başına anlam taşımıyorsa metin etiketi zorunlu.
- Gerçek ürün asseti bulunan yerde jenerik siluet kullanılmaz.
- Eksik asset deterministic fallback üretir; layout değişmez.

---

## 8. Hareket, ses ve dokunma hissi

Mevcut motion tokenları, ses altyapısı ve haptik olay hattı kullanılacaktır. Yeni ekonomik veya oynanış sonucu üretilemez.

| Olay | Geri bildirim |
| --- | --- |
| Buton basımı | 90–160 ms fiziksel basım, isteğe bağlı hafif haptik |
| Aşama geçişi | 160–240 ms kısa içerik geçişi |
| Teklif gönderme | Tok haptik + kısa ses; sonucu geciktirmez |
| Kabul | Kısa sıcak ışık ve net sonuç özeti |
| Red | Sakin warning; oyuncuyu utandırmaz |
| Kârlı işlem | Kısa sayı değişimi ve tek vurgu |
| Seviye/dükkan gelişimi | Nadir, daha güçlü fakat kısa sahne |

Kurallar:

- Hiçbir animasyon input'u veya settlement'i bekletmez.
- Reduced-motion açıkken hareket fade/instant duruma iner.
- Ses kapalıyken görsel geri bildirim aynı bilgiyi taşır.
- Her dokunuşa ses veya haptik eklenmez.
- Arka plandan dönüşte toplu animasyon/ses oynatılmaz.

---

## 9. Görünür ilerleme

Progression sayıları değiştirilmeden, mevcut ilerleme aşağıdaki sunum katmanlarıyla görünür kılınır:

- dükkân kademesine bağlı arka plan varyasyonu;
- vitrin ve tezgâhın kontrollü zenginleşmesi;
- aktif tema/dekorasyonun gerçekten sahneye uygulanması;
- profil rozeti ve çerçevesinin doğru ölçeklenmesi;
- gün/hafta geçişlerinde kısa atmosfer farkı;
- büyük başarıların İşletme/Yolculuk benzeri özetlerde kalıcı izi.

Bu değişimler yalnız mevcut state'i okur. Yeni bonus, gizli çarpan veya ekonomik avantaj vermez.

---

## 10. Mobil ve erişilebilirlik matrisi

Her görsel paket aşağıdaki matrisin ilgili kısmında doğrulanır:

| Genişlik | Temel amaç |
| ---: | --- |
| 320 px | En dar desteklenen cihaz, uzun Türkçe metin |
| 390 px | Ana iPhone referans tuvali |
| 430 px | Büyük iPhone referansı |

Ek yükseklikler: 568/640 px kısa, 667 px orta, 844/852 px ana, 932 px uzun ekran.

Zorunlu senaryolar:

- yeni profil ve normal profil;
- boş dükkân ve dolu kuyruk;
- müşteri alış, satış, ekspertiz ve servis akışları;
- stok yetersizliği ve nakit yetersizliği;
- pazarlığın açık, sertleşmiş ve son teklif hâli;
- Market'in her kategorisi;
- Atölye, İşletme, Ayarlar ve gün sonu;
- en uzun Türkçe/İngilizce metinler;
- büyük metin ve reduced-motion;
- iOS safe-area, Dynamic Island ve home indicator;
- çift dokunma/pinch/yatay döndürme girişimleri.

Kabul:

- metin üst üste binmesi: 0;
- kesilen ana CTA: 0;
- yatay belge kaydırması: 0;
- görünmez/işlevsiz kontrol: 0;
- yanlış veya eksik asset bağlantısı: 0;
- 44×44 px altı gerekli dokunma hedefi: 0;
- beklenmeyen console hatası: 0.

---

## 11. İş paketleri

### R0 — Repository ve GDD denetimi

**Çıktı:** mevcut ekran/asset/token/test envanteri, GDD kaynak bütünlüğü, donmuş mekanik listesi.  
**Durum:** İlk denetim tamamlandı; GDD dosyasının repository içine alınması açık kapı.  
**Tahmin:** 0,5–1 iş günü.

### R1 — Görsel sistem sözleşmesi

**Çıktı:** nihai renk kullanım oranları, yüzeyler, kart seviyeleri, elevation, tipografi, ikon optik kutuları; token–CSS fark raporu.  
**Kapsam:** token ve ortak sunum bileşenleri.  
**Tahmin:** 1–2 iş günü.

### R2 — Ana ekran ve oyun kabuğu

**Çıktı:** durum/piyasa/müşteri/aşama şeritleri, işlem masası, araç rayı, karar dock'u ve alt navigasyonun remaster görünümü.  
**Kapsam:** tüm müşteri durumları; mekanik aynı kalır.  
**Tahmin:** 2–3 iş günü.

### R3 — Kartlar, kök ekranlar, menüler ve ayarlar

**Çıktı:** Stok, Atölye, Market, İşletme, ayarlar ve modal/sheet ailesinin ortak sistemle birleşmesi.  
**Tahmin:** 2–3 iş günü.

### R4 — Asset bağlama ve atmosfer

**Çıktı:** eksik/basit fallback envanteri, ürün–kategori eşleştirmeleri, tema/dekorasyonun sahnede görünmesi, profil çerçevesi ve rozet kalitesi.  
**Tahmin:** 2–4 iş günü; yeni asset sayısına bağlıdır.

### R5 — Motion, ses ve geri bildirim

**Çıktı:** semantic feedback matrisi, kısa geçişler, reduced-motion ve sessiz kullanım eşdeğerleri.  
**Tahmin:** 1–2 iş günü.

### R6 — Cihaz QA ve yayın öncesi rapor

**Çıktı:** 320/390/430 px ekran matrisi, gerçek iPhone kontrolü, performans ölçümü, son oyun testi, kalan riskler ve yayın kapısı.  
**Tahmin:** 2–3 iş günü.

---

## 12. Gerçekçi kapsam ve süre

Mevcut mimari sağlam olduğu için sıfırdan yapım gerekmiyor. GDD hazır ve yeni asset üretimi sınırlı tutulursa:

- **Kod/UI remaster:** 9–14 odaklı iş günü
- **Asset üretimi ve gerçek cihaz düzeltmeleri:** 3–6 ek iş günü
- **Toplam gerçekçi süre:** yaklaşık 2–4 takvim haftası

Bu süre tek büyük teslim değildir. Her paket bağımsız olarak bitirilip test edilir. R2 sonunda ana oyun görünümü belirgin şekilde remastered olur; R3–R6 tutarlılığı ve yayın kalitesini tamamlar.

Süreyi büyütecek başlıca riskler:

- bağlayıcı GDD'nin geç paylaşılması veya çelişkili sürümler;
- çok sayıda yeni ürün görselinin sıfırdan üretilmesi;
- mekanik/ekonomi taleplerinin remaster kapsamına karışması;
- yalnız simülatörde görülmeyen iOS WebView ve safe-area farkları;
- aynı anda birden fazla paketin açılması.

---

## 13. Paket kapanış sözleşmesi

Her paket şu sırayla kapanır:

1. Kapsam ve değişmeyecek davranış yazılır.
2. Küçük, geri alınabilir değişiklik uygulanır.
3. İlgili otomatik testler eklenir veya güncellenir.
4. Tam test paketi ve production build çalıştırılır.
5. İlgili ekranlar cihaz matrisinde doğrulanır.
6. Mekanik/domain diff'i olmadığı kontrol edilir.
7. Tek amaçlı commit oluşturulur ve GitHub'a gönderilir.
8. Sonraki paket kullanıcı onayı olmadan açılmaz.

### Her pakette zorunlu komut kapıları

```text
npm test -- --run
npm run build
npm run i18n:audit
npm run release:check
npx cap sync ios
```

TestFlight veya mağaza yüklemesi ayrıca açık kullanıcı onayı gerektirir.

---

## 14. Remaster tamamlanma tanımı

Mihenk Remastered ancak aşağıdakilerin tamamı sağlandığında bitmiş sayılır:

- Bütün kök ekranlar tek görsel aileye aittir.
- Ana dükkân ekranı panel değil oyun sahnesi gibi okunur.
- Ana eylem her durumda ilk bakışta bulunur.
- Ürün, müşteri, fiyat ve risk hiyerarşisi nettir.
- Market kozmetikleri ve profil öğeleri gerçekten sahneye uygulanır.
- Mikro hareket, ses ve haptik sonucu güçlendirir fakat oyunu yavaşlatmaz.
- 320/390/430 px matrisi ve gerçek iPhone testleri geçer.
- Kayıtlar bozulmaz; ekonomi ve mekanik sonuçları taban sürümle aynıdır.
- Otomatik test, build, i18n ve yayın kapıları yeşildir.
- Son kalite raporunda kritik veya yüksek öncelikli açık hata yoktur.

> Son ilke: Remaster'ın değeri daha fazla süs değil; Mihenk'in zaten güçlü kararlarını daha anlaşılır, tutarlı ve tatmin edici hâle getirmektir.
