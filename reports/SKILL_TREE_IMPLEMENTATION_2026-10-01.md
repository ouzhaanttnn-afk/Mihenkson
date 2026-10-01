# Mihenk — çalışan yetenek ağacı

Durum: yerel kaynak kodda tamamlandı ve doğrulandı. Önceki araştırma önerisi artık bu uygulama kararlarıyla somutlaştırıldı. Bu çalışma Apple'a yüklenmedi; incelemedeki 1.2.0 build 31 değiştirilmedi.

## Oyuncu deneyimi

Yetenek Ağacı, ana Dükkan ekranında Personel girişinin yanında sürekli erişilebilir. Finans özetini açmaya gerek yok. Üç uzmanlık dalı, her dalda sırayla açılan üç kademe ve toplam altı kazanılabilir puan var. Oyuncu dokuz kademenin tamamını açamaz; kendi uzmanlığını seçer.

| Dal | Başlangıç | Kademe 1 | Kademe 2 | Kademe 3 |
| --- | --- | --- | --- | --- |
| Ayar Ustalığı | Mihenk taşında yanlış ayar beyanını yakalama %60 | %70 | %80 | %90 |
| Tatlı Dil & Esnaf Nüktesi | Temel sabır | +1 başlangıç sabrı | +2 başlangıç sabrı | +2 sabır ve mevcut yüksek marj sabır-cezası toleransı |
| Usta Eli | Mevcut atölye riski | Yeni kendi atölye işlerinde −2 yüzde puan | −4 yüzde puan | −6 yüzde puan |

Mihenk taşı bütün gizli kusurları açmaz. Atölye bonusu yüzde değil **yüzde puan** azaltımıdır; mevcut sıfır sınırında durur. Dış ustanın riski/fiyatı değişmez. Yoğunluk, personel, ekipman ve kapasite kuralları korunur. Tatlı Dil ek pazarlık hakkı, daha yüksek bütçe veya garanti anlaşma vermez.

## Kazanım ve ekonomi

5, 15, 30, 50, 80 ve 120 nitelikli tamamlanmış işte birer puan kazanılır. Bir iş bir kez sayılır; çoklu ürün veya yüksek gramaj puan sayısını artırmaz.

- Oyuncunun yaptığı müşteri satışı: settlement gerçekten uygulanmış, satış geliri eksi stok maliyeti ve o işlemin ücretli testleri pozitif olmalı.
- Ekspertiz: doğru rapor, ödenmiş ücret ve testler düşüldükten sonra pozitif katkı gerekir.
- Atölye: başarılı sonuç, gerçek teslim ve parça/dış usta giderleri sonrası pozitif katkı gerekir. Kabul veya hazır olma tek başına sayılmaz.
- Müşteriden mal almak, stok potansiyeli, personelin otomatik satışı, toptancı işlemleri, HAS işlemleri, sponsor/reklam ödülleri ve göç iadeleri sayılmaz.

XP harcanmaz. Para, reklam veya satın alma ile ustalık puanı alınamaz. Fiyat, maliyet, müşteri bütçesi, ürün gerçeği ve atölye iş süresi yeteneklerden etkilenmez.

## Kayıt ve tekrar koruması

Puan defteri ilk 120 benzersiz iş kimliğini kalıcı tutar; kayan pencere yoktur. Tavandan sonra liste büyümez. Replay, çift dokunma, kayıt/yükleme veya yeniden dağıtım aynı işi yeniden ödüllendirmez.

Bekleyen, aktif ve geri çağrılabilir ziyaretin yetenekleri ziyaret başında sabitlenir. Mevcut sabrı kayıt yüklemede güncel yeteneğe göre tekrar hesaplanmaz. Bozuk sabır alanlarının onarımı da ziyaretin kendi görüntüsünü kullanır. Kabul edilmiş atölye işinin riski ve önceden belirlenmiş sonucu sonradan değişmez.

Yeni müşteri işlemleri benzersiz **ziyaret** kimliğiyle settlement edilir; aynı müşterinin farklı ziyaretleri veya aynı kuyruktan peş peşe karşılanan müşteriler birbirini kilitlemez. Mevcut aktif/geri çağrılan işlem kimliği değiştirilmez.

Kademe öğrenme ve yeniden dağıtım, doğrulanmış kayıt başarılı olmadan bellekte uygulanmaz. Yazma başarısızsa puan ve kademe aynı kalır; modal içinde görünür durum mesajı verilir.

## Eski oyuncular

Geçerli eski Ayar/Tatlı Dil kademeleri korunur ve kullandıkları puanlar hak edilmiş sayılır. Bu hak ile iş geçmişinden gelen hak **toplanmaz**; büyük olan kullanılır. Üst sınır altıdır.

Bir defalık geçmiş taraması yalnız kabul edilmiş manuel satışın gerçek ve uygulanmış satış işlemiyle eşleştiği durumları ve başarılı teslim edilmiş atölye işinin gerçek ücret işlemini sayar. Eski ekspertiz kayıtlarında doğruluk kalıcı ispatlanmadığı için geriye dönük puan verilmez. Sürüm işareti sayesinde tekrar yükleme geçmişi yeniden ödüllendirmez. İşlem/maliyet indeksleri ve erken 120 kesimi uzun kayıtlarda tekrar tekrar tam taramayı engeller.

Yeni formatta bozuk/puan üstü kademeler muhafazakâr biçimde onarılır. Ziyaret görüntüsü yalnız etkileri taşır; harcanabilir puan defteri gibi normalize edilmez.

## Yeniden dağıtım

Ücretsiz, oyun gününde en fazla bir kez. Açık/geri çağrılabilir müşteriler bitmiş ve tüm atölye işleri teslim edilmiş olmalı. Puanlar iade edilir, hak edilmiş toplam ve iş kimlikleri korunur. Onay anında kayıt revizyonu doğrulanır; eski onay veya gün geri alma ikinci dağıtımı açmaz.

## Doğrulama — 2026-10-01

- `npm run typecheck`: başarılı.
- `npm run test`: 94 Vitest dosyası / 1.395 test; ayrıca 5 release hazırlık testi başarılı.
- `npm run build`: başarılı. Vite'ın mevcut büyük ana paket uyarısı sürüyor; bunu hata veya native imzalı derleme başarısı diye yorumlamıyoruz.
- `npm run release:check`: 81 kontrol başarılı.
- `npm run i18n -- --json`: eksik literal anahtar yok.
- `npm run i18n:audit`: yeni çevrilmemiş metin yok; incelenmiş taban 73 korunuyor.
- `git diff --check`: başarılı.

Yeni testler: tüm eşik sınırları, altı puan bütçesi, sıralı kademe/stale tap, maliyetli testler, doğru/yanlış/ücretsiz ekspertiz, gerçek müşteri satışları, aynı müşterinin beş farklı ziyareti, kârsız ve personel satışlarının dışlanması, gerçek atölye kabul/teslimi, değişmeyen kabul edilmiş iş, depolama hatasında geri alma, kayıt göçü ve sabır görüntüsü.

Deterministik karşılaştırma: seed 20260827 ile 1.000 eşleştirilmiş müşteri gelişi; ayrıca 1.000 servis fikstürü × dört kademe, yani 4.000 kendi-atölye teklifi. Ekonomik/RNG alanları eşit; risk azalması sınırlı ve başarı sonucu monoton; dış usta ve maliyet/süre alanları değişmiyor. Bu sentetik domain doğrulamasıdır, 1.000 gerçek kullanıcı oturumu veya gelir tahmini değildir. Servis matrisi bütün türlerin teklif hesaplarını sınar; ürün uygunluğu ayrı mevcut servis testlerinde sınanır.

Gerçek tarayıcı kontrolü: temiz yerel kariyerde ana ekran girişi, üç dal ve modal; 320 CSS pikselde yatay taşma yok. İlk kontrolde modal alt düğmesi ekran dışına çıkıyordu; sabit grid satırı ve `dvh` üst sınırıyla düzeltildi. Alt düğme görünür, içerik kendi içinde kayıyor.

Üretim girişine dahil olmayan `spec/mastery-preview.html?scale=2&lang=en` fikstürüyle 24px açıklama metni (normalin iki katı) ve 320px genişlikte gerçek öğrenme, onay, iptal, ücretsiz sıfırlama, günlük sınır, Tab/Shift+Tab döngüsü ve Escape/focus iadesi kontrol edildi. Yatay taşma sıfır; reset düğmeleri 44px üzerinde ve metni kırpılmıyor. Fikstür sentetik puanlarla çalışır; yalnız atılabilir yerel test kaydında kullanılmalıdır ve production `dist` paketine girmez.

Tarayıcı ekran görüntüsü yakalama denemeleri `Page.captureScreenshot` zaman aşımına uğradı; ağacın son görselinin piksel kanıtı kaydedilemedi. Doğrulama DOM, erişilebilirlik ağacı, gerçek düğme akışları ve yerleşim ölçümleriyle yapıldı. Fiziksel iPhone/Dynamic Type ve native imzalı paket bu çalışma kapsamında yeniden test edilmedi. Yayın öncesi cihaz smoke testi gereklidir.
