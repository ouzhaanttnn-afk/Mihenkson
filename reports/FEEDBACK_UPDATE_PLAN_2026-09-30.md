# Mihenk — Oyuncu geri bildirimlerinden güncelleme kapsamı

Tarih: 30 Eylül 2026  
Kaynak: Kullanıcının ekran görüntüleri, sesli anlatımları ve yazılı netleştirmeleri.  
Durum: Geri bildirimler birleştirildi ve mevcut kod incelendi. Bu belge uygulanacak işleri tanımlar; maddelerin tamamlandığı veya yeni bir sürüm yayımlandığı anlamına gelmez. Sürüm numarası henüz belirlenmedi.

## 1. Önce ürün ve stok sorunları

### A. Bütün altın ürünlerinin erişilebilirliğini ve satılabilirliğini düzeltme

İnceleme yalnız Tam Altın'la sınırlı olmayacak. Hem stokta bekleyip satılamayan ürünler hem de müşteri istediğinde stokta bulunmayan/tedarik edilemeyen ürünler kapsama dahil.

Her altın ürününde şu zincir kontrol edilecek:

Ürün tanımı → mağaza/seviye uygunluğu → müşteri talebi → tedarik yolu → stokta tanınma → müşteriye sunma → satış ve kayıt.

Kontrol grupları:

- 24 ayar gram altın: 1, 2,5, 5, 10, 20, 50 ve 100 gram tanımları; ortak gram stoğunda doğru karşılanmaları.
- Çeyrek, Yarım, Tam, Cumhuriyet ve Ata altınları: müşteri talepleri, doğru ürün eşleştirmesi, adet ve maliyet hesabı.
- 22 ayar işçiliksiz yatırım bilezikleri: 10–100 gram tanımları; ortak yatırım bileziği stoğunun doğru çalışması.
- Külçe altın: hangi müşteri/tedarik/çıkış kanalında erişilebilir olduğunun açık ve tutarlı olması.
- İşçilikli altın takılar ve altın koleksiyon ürünleri: mevcut alım, servis ve çıkış yolları; stokta kalıp çıkışsız ürün oluşmaması.

Gramajların ortak stok havuzunda birleştirilmesi tek başına eksik ürün sayılmaz. Oyuncuya ürün "stokta yok" denirken uygun ortak stok varsa bu bir eşleştirme hatasıdır. Gerçek miktar yetersizliği, mağaza koşulu, nakit eksikliği ve kapasite engeli ayrı ve doğru sebeplerle açıklanmalı.

Mevcut 38 altın ürün tanımının ilk kod incelemesi:

| Ürün grubu | Tanım sayısı | Mevcut yol / kontrol sonucu |
| --- | ---: | --- |
| Gram altın: 1 / 2,5 / 5 / 10 / 20 / 50 / 100 g | 7 | Müşteriden alım, normal/toplu talep, ortak gram havuzu ve hızlı tedarik var. Gramajların tek havuzdan karşılanması kasıtlı. |
| İşçiliksiz yatırım bileziği: 10–100 g, 10 g aralıkla | 10 | Müşteriden alım, normal/toplu talep, ortak yatırım bileziği havuzu ve hızlı tedarik var. |
| Çeyrek / Yarım / Cumhuriyet / Ata | 4 | Talep ve hızlı tedarik var; Yarım/Cumhuriyet/Ata'nın normal üretilen örneklerinde stok havuzu/uygunluk tutarsızlığı bulundu. |
| Tam Altın | 1 | Eski İşletme tedarikinde var; yeni müşteri talebi ve hızlı tedarikte yok. Eski stok müşteri talebi görmüyor. |
| Küçük Külçe | 1 | Kademe 2'de müşteriden alınabiliyor ve toptancıya çıkabiliyor; tanımlı toplu müşteri kanalı talep üretimine bağlı değil. Görünür tedarik kataloglarında da yok. |
| Kademe 1 işçilikli altın ürünleri | 9 | Zincir, yüzük, kolye, küpe, iki bilezik, hasarlı zincir ve kaplama bilezik tanımları. Normal sarrafiye talebinden ayrı; vitrindeki ürüne yönelik özel müşteri talebiyle satış yolu var. |
| Kademe 2 işçilikli altın ürünleri | 3 | 18 ayar kolye, 22 ayar set parçası ve giriş taşlı yüzük; vitrin/ürüne yönelik talep yolu var. |
| Kademe 3 işçilikli/altın koleksiyon ürünleri | 3 | Premium taşlı yüzük, vintage broş ve koleksiyon parası; vitrin/ürüne yönelik talep yolu var. |

Bu tabloda olmayan bir ekran satırı otomatik olarak ürünün eksik olduğu anlamına gelmez. İşçilikli takının vitrine konması, mağaza kademesi veya ortak gram havuzunun kullanılması gibi mevcut koşullar korunup anlaşılır gösterilecek.

Kodda doğrulanan ilk bulgular:

- **Tam Altın aktif havuzlardan dışlanmış:** `src/data/bullion.ts` içindeki perakende katalog filtresi ve `src/domain/item-spawn.ts` içindeki ürün üretim filtresi `full_gold` kimliğini özellikle dışlıyor. Eski kayıtlardaki Tam Altın ise duruyor. İşletme ekranındaki eski tedarik listesiyle de tutarsızlık var. Ürünün eski kayıttan müşteri satışına kadar bütün yolu birlikte düzeltilmeli.
- **Yarım/Cumhuriyet/Ata stok havuzu tutarsızlığı:** `src/domain/stock-pools.ts` sıfırdan farklı işçilik değeri olan bu sikkeleri ortak havuza kabul etmiyor; normal ürün üretimi bu değeri verebiliyor. Müşteriye uygun stok denetimi ile gerçek eşleştirme aynı sonucu üretmiyor. Sağlam standart sikkeyle kusurlu/özel ürün ayrımı korunarak düzeltme yapılmalı.
- **Kataloglar aynı kaynağı kullanmıyor:** Hızlı stok, müşterinin talep havuzu ve eski toptancı/İşletme tedarik yolu ürünleri farklı listelerden okuyor. Aynı üründe bir ekranda var, diğerinde yok durumu önlenmeli.
- **Külçenin toplu talep kanalı erişilemiyor:** Metadata küçük külçeye toplu müşteri kanalı tanımlıyor; `src/domain/purchase.ts` toplu talepleri de perakende listesinden ürettiği için bu talep hiç oluşmuyor. Mevcut toplu kanalın bağlantısı ve tedarik yolu incelenecek; bu bulgu sıradan müşteriye otomatik olarak külçe ekleme kararı değildir.

### B. Gümüş ürünlerini kaldırma

- Alınıp satılan gümüş zincir, yüzük ve objeler yeni ürün üretimi, müşteri talepleri ve tedarik yollarından çıkarılacak.
- Mevcut kayıtların gümüş stokları için güvenli geçiş hazırlanacak. Oyuncunun stok değeri veya ilerlemesi sessizce silinmeyecek; geçiş işlemi tekrar yüklemede ikinci kez uygulanmayacak.
- Gümüşe ait açık servis/işlem kayıtlarının ve geçmiş defterin okunması korunacak.
- Eski ürün tanımlarını doğrudan silmek güvenli değil: kayıtlar bu kimliklerle ürün okuyor. Geçiş ve geriye uyumluluk birlikte hazırlanmalı.
- Mevcut gümüşler için normal müşteri satışı, vitrin/eritme ve görünür toptancı/ağ çıkışları uygun değil. "Oyuncu önce elindeki gümüşleri satsın" tek başına çalışır bir çözüm sayılmayacak.
- Gümüş stoklarının hangi ekonomik yöntemle kapatılacağı bu belgede belirlenmedi. Kullanıcının şikâyeti stok dolduran ürünlerdir; kozmetik gümüş çerçeve ayrı içeriktir.

### C. Stok kapasitesi ve hızlı tedarik

- Arka stoğun 17/16 gibi limit üstüne çıkmasının giriş yolları düzeltilecek.
- Normal müşteriden alım, ortak havuzdan alım ve eski toptancı alımı aynı kapasite kuralıyla denetlenecek.
- Mevcut altın havuzuna miktar eklemek ile yeni stok satırı açmak doğru ayrılacak.
- "Stokta yok", "yetersiz nakit" ve "kapasite dolu" açıklamaları gerçek duruma uyacak.
- Kapasite doluyken hızlı tedarik, müşteri ve seçim kaybolmadan oyuncuya stokta yer açma/çıkış yolunu gösterecek.
- Limit üstü eski kayıtlar ürünleri silerek düzeltilmeyecek; kayıpsız toparlama yolu hazırlanacak.

Kod bulgusu: `src/domain/settlement.ts` ortak havuz satın alımını doğruluyor, fakat genel stok girişleri aynı fiziksel kapasite kontrolüne sahip değil. Bu nedenle gümüşleri çıkarmak tek başına kapasite sorununu çözmez.

## 2. Büyümeyi hissedilir hale getirme

### D. Mağaza, görünüm ve koleksiyon

- Mağaza genişletme/VIP mağazaya geçme görünümde hissedilecek.
- Mağaza veya koleksiyon gelişiminin müşteri gelme potansiyeline/kapasitesine hangi katkıyı verdiği görünür olacak.
- Kodda mağaza kademesi ve itibar müşteri geliş aralığını zaten etkiliyor (`src/domain/customer-traffic.ts`); mevcut etki önce doğrulanıp oyuncuya doğru anlatılacak. Yeni trafik bonusu varsa mevcut bonusun üzerine yanlışlıkla iki kez uygulanmayacak.
- Koleksiyona alınan hangi öğenin işlevsel etki vereceği ve etkinin boyutu henüz belirlenmedi.

### E. Büyük müşteriler ve toptancı bağlantısı

- Daha gelişmiş mağazalara lüks ve yüksek hacimli müşteriler gelebilecek.
- Kullanıcının açık örneği: **1 kg altın isteyen müşteri → toptancıdan altın alımı → müşteriye satış/teslim**.
- Mevcut toplu talep ve tedarik altyapısı incelenerek 1 kg akışı buna bağlanacak.
- Talep, gerçek tedarik bedeli, nakit/kapasite koşulları ve müşteriyle anlaşma birbiriyle tutarlı olacak.
- Kullanıcının belirtmediği bedelsiz tedarik, garantili kâr veya yeni kredi sistemi bu isteğe eklenmeyecek.

## 3. Personel ve atölye

### F. Personelin somut görevleri

- Personel yalnız bekleme kapasitesi artırmakla kalmayacak; müşteri karşılayabilecek.
- Oyuncu adına otomatik satış yapma önerisi tasarlanacak; hangi stokları, fiyat/kâr sınırlarını ve müşteri durumlarını kapsadığı açık olacak.
- 1–2 dakikada bir görev yapma anlatımdaki örnektir; kesin çalışma süresi henüz seçilmedi.
- Oyuncu personelin görevini yönetebilecek. Otomatik işlem çift satışa, negatif stoğa veya habersiz para harcamaya yol açmayacak.

Mevcut durum: İşletme'de alınan personel `personnelCount` üzerinden bekleme kapasitesini artırıyor. Atölye risk hesabı ayrı `staff` listesini kullanıyor. Bu iki alanın rolü yeni görev tasarımında açıkça birleştirilmeli veya ayrıştırılmalı.

### G. Atölye personeli ve risk

- Mevcut tamir/ekspertiz işleri tekrar eklenmeyecek; personele iş verme akışı geliştirilecek.
- Personel, ekipman ve iş yoğunluğunun risk üzerindeki etkisi anlaşılır biçimde gösterilecek.
- İki-üç işten sonra dördüncü işte yaklaşık %50 risk görülmesi incelenecek; bu oran henüz hata olarak doğrulanmadı.
- `src/domain/service.ts` riski iş zorluğu + kapasite doluluğu − personel becerisi − ekipman bonusuyla hesaplıyor. Hem hesabın dengesi hem arayüzde açıklaması ele alınacak.
- İş başarısı garantili hale getirilmeyecek; kayıt yükleyerek sonucu yeniden zar atma veya aynı işe iki kez ödeme yapılması önlenecek.

## 4. Pazarlık

### H. Ret tepkilerinin anlaşılır ve dengeli olması

- Alış maliyetinin biraz üstündeki satış tekliflerinde bazı müşterilerin hemen ayrılması incelenecek.
- Alış maliyeti, güncel piyasa ve müşterinin kabul eşiği doğru ayrılacak. Oyuncunun geçmiş alış fiyatı, her müşterinin kabul etmek zorunda olduğu bir taban değildir.
- Ret/ayrılma gerekçeleri daha anlaşılır olacak; kabul oranları test edilerek yalnız doğrulanan dengesizlikler düzeltilecek.
- Kullanıcının istediği gibi oyun çok kolaylaştırılmayacak ve her teklif garantili kabul edilmeyecek.

## Uygulama sırası ve tamamlanma koşulları

1. **Ürün ve kayıt güvenliği:** bütün altın ürünleri matrisi, gümüş geçişi, stok kapasitesi ve hızlı tedarik düzeltmeleri.
2. **Mevcut dengelerin kontrolü:** pazarlık retleri, atölye riski, personel alanları ve mevcut mağaza/trafik etkisi.
3. **Yeni gelişim özellikleri:** görünüm/koleksiyon etkileri, büyük sipariş/toptancı akışı, personel görevleri ve otomatik satış.

Doğrulama kapsamında:

- Her altın ürünü için doğru talep, tedarik, stok eşleştirmesi ve izin verilen satış/çıkış yolu.
- Boş, kısmi, tam dolu ve eski limit üstü stok; vitrin/arka stok/atölye konumları.
- Eski gümüş ve altın kayıtlarını yükleme; miktar, maliyet ve değer kaybı olmaması; geçişi iki kez çalıştırma.
- Satış/tedarik sonrası defter ve kayıt doğrulaması; çift işlem, negatif miktar veya negatif nakit olmaması.
- Tam Altın dahil örnek eski kayıtlar ve yeni oyunla uçtan uca ticaret senaryoları.
- Normal üretilmiş Yarım/Cumhuriyet/Ata örnekleri kullanılacak; testlerde işçilik değerini önceden sıfırlayıp gerçek sorunu gizleyen örneklerden kaçınılacak.
- Dar telefon ekranında hızlı tedarik ve stok uyarıları; mevcut ana görünümün korunması.

Bu belge bir geri bildirim ve uygulama kapsamı belgesidir. Mevcut bağlayıcı tasarım kaynaklarının yerine geçmez; yeni özelliklerin oranlarını, fiyatlarını veya yayın kararını kendiliğinden belirlemez.

İlk incelemede ilgili mevcut 5 test dosyasındaki 172 test geçti. Bu sonuç mevcut kapsamın geçtiğini gösterir; yukarıda bulunan katalog, normal üretim ve kapasite boşluklarının düzeltilmiş olduğu anlamına gelmez. Bu turda oyun kodu değiştirilmedi.
