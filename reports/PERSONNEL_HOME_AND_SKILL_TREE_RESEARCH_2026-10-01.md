# Mihenk — ana ekran personeli ve yetenek ağacı araştırması

## Durum ve kapsam

- Kullanıcı isteği: personel yönetimini ana Dükkan ekranına almak; yetenek
  ağacını düşünmek ve araştırmak.
- Personel değişikliği uygulandı. Ana dükkânda, kapalı finans özetinin dışında
  personel sayısı, bekleme kapasitesi ve günlük gider görünen doğrudan bir giriş
  var. İşletme de aynı yönetim penceresine kısa yol olarak kalıyor.
- Tek ortak panel mevcut işe alma onayını, görevleri, maaşları, seviye şartlarını,
  meşgul usta korumasını ve mevcut isteğe bağlı reklam yollarını kullanır.
- Pencere açıkken saat ve personel otomasyonu durur. Escape, odak tuzağı ve
  açan düğmeye odak dönüşü vardır. Sekme geçişinde kapanır; kayıt dosyasına girmez.
- Bu çalışma yeni bir App Store yüklemesi/gönderimi değildir. Apple'a daha önce
  gönderilen 1.2.0 (31) paketi değiştirilmedi; sürüm numarası artırılmadı.
- Aşağıdaki yetenek ağacı **tasarım önerisidir**, çalışan oyunda etkinleştirilmedi.
  Yeni puan, reklam, satın alma veya ekonomik bonus eklenmedi.

## Kaynaklardan çıkan tasarım ilkeleri

Blizzard'ın kendi Hero Talents tasarım açıklaması; seçeneklerin benzer ölçüde
işe yarar olmasını, ana oynanışı geçersiz kılmamasını ve yeni bir yönetim yükü
oluşturmamasını hedefliyor. Mihenk'e uyarlamam: üç küçük uzmanlık, görünür bir
mevcut→sonraki etki ve hiçbir dalın herkese zorunlu olmaması.
[Birincil kaynak: Blizzard — Hero Talents](https://news.blizzard.com/en-us/article/24038519/get-an-early-look-at-hero-talents-in-the-war-within)

Matthias Worch'un GDC oturumunun yayımlanmış özeti, oyuncu seçimi ve oyuncunun
etkisini oyun tasarımının merkezine yerleştiriyor. Mihenk'e uyarlamam: ağaç sadece
üç ayrı “daha çok para kazan” bonusu değil; değerlendirme, pazarlık ve işçilik
arasında bir tercih olmalı. Tam konuşma izlenmedi; yalnız açık oturum özeti
araştırma kaynağı olarak kullanıldı.
[Birincil kaynak: GDC — Decisions That Matter](https://gdcvault.com/play/1020570/)

Bunlar tasarım referanslarıdır; başka türdeki oyunların sayısal dengeleri
Mihenk'e taşınamaz. Aşağıdaki değerler kendi önerimizdir, araştırılmış bir gelir
veya tutundurma tahmini değildir.

## Mevcut kodun gerçekte yaptığı

| Alan | Bugünkü durum |
| --- | --- |
| Ayar Ustalığı | Kayıtta 0–3 kademe var. Mihenk taşının yanlış ayar beyanını yakalama olasılığı %60 / %70 / %80 / %90. Diğer test cihazları değişmiyor. |
| Tatlı Dil | Kayıtta 0–3 kademe var. Başlangıç sabrına +0 / +1 / +2 / +2; son kademede belirli yüksek marjlı ret durumunun ek sabır cezasını hafifletir. Bütçe veya kabul garantisi sağlamaz. |
| Puan / açma | Puan bakiyesi, kazanma kuralı ve açma komutu yok. Üretim ekranı “Yakında” ve salt okunur. |
| Kariyer seviyesi | XP eşiği `400 + 180 × level²`. XP aynı zamanda mevcut araç/ilerleme kilitlerine bağlı; onu harcanabilir para gibi tüketmemeliyiz. |
| Personel | Maaşla alınan ayrı bir sistem. Bekleme desteği / karşılama / güvenli satış / atölye görevleri var; yetenek ağacı aynı personeli ikinci kez satmamalı. |

Kod referansları: `src/domain/skill-tree.ts`, `src/data/skills.ts`,
`src/ui/screens/TalentTreePanel.tsx`, `src/domain/negotiation.ts`,
`src/domain/balance.ts`, `src/domain/personnel.ts`.

## Önerilen ilk ağaç: üç dal, dokuz toplam kademe

| Dal | Yetenek | Oyuncunun gerçek tercihi | İlk denge önerisi |
| --- | --- | --- | --- |
| Ekspertiz | Ayar Ustalığı, 3 kademe | Şüpheli ürünü daha güvenilir değerlendirmek | Mevcut %60→%70→%80→%90 desteğini koru. Tam gerçek değer veya kesin teşhis vaadi verme. |
| Esnaflık | Tatlı Dil, 3 kademe | Müşteriyi anlamak ve pazarlıkta zaman kazanmak | Mevcut +1/+2 sabır ve son kademe davranışını koru. Yeni teklif hakkı, bütçe artışı, hakareti affetme veya garantili anlaşma yok. |
| Atölye | Usta Eli, 3 kademe | Zorlu işlerde daha dikkatli çalışmak | Yeni atölye tekliflerinde ek 2/4/6 yüzde puanlık sınırlı risk indirimi adayını simüle et. Personel/kapasite ve aşırı yük riski hâlâ önem taşır. Kabul edilmiş iş sonucu değişmez. |

Atölye sayıları henüz doğrulanmadı. Toplam personel + oyuncu bonusuna mevcut
servis risk alt sınırı uygulanmalı. Atölye geçmiş sonuçlarında yeniden zar
çekilmez. Yetenek işi daha hızlı teslim edecekse bu ayrı bir denge kararıdır;
bu ilk öneride teslim süresi değişmiyor.

İlk pakette yönetim/toptancı dalı önermiyorum: kira, maaş, stok kapasitesi,
toptancı güveni ve mağaza trafiği zaten kendi ilerleme sistemlerine sahip.
Ek kredi, otomatik borçlanma veya daha ucuz altın bonusu üst üste binen güç yaratır.
Gelecekte dördüncü dal düşünülebilir; mevcut planın parçası değildir.

## Kazanım temposu — test edilecek aday

Yüksek kariyer seviyelerine bağlamak yerine ayrı, kümülatif “ustalık” hakkı:

- İlk puan 5 doğrulanmış ve kârlı tamamlanan işte.
- Sonraki aday eşikler: toplam 15, 30, 50, 80 ve 120 iş.
- Her eşikte 1 puan; ilk kapsamda en fazla 6 puan. Her kademe 1 puan.
  Böylece dokuz kademenin hepsi aynı anda açılamaz; tek dalda uzmanlaşma veya
  karışık dağılım gerçek bir tercih olur.
- Uygun işler yalnız sonlandırılmış ticaret kayıtları ve tamamlanıp ücretli
  teslim edilmiş hizmetlerdir. Negatif/başabaş net sonuç, stok satın alma,
  açılış migrasyon kredisi, reklam veya aynı işlem tekrar sayılmaz.
- Aktif ziyaret/iş tek ödül kimliği taşır; aynı ürünü aynı ziyarette bölerek
  satmak ek puan temposu sağlamaz. Yeni gerçek müşteri ziyareti ayrı iştir.
- Kariyer XP'si harcanmaz, para/ödüllü reklam/Premium ile puan alınmaz.
- İlk ağaçta oyun içi gün kapanışında ve aktif iş yokken ücretsiz yeniden
  dağıtım öneriyorum. Günlük en fazla bir kez; devam eden müşterinin sabrı ve
  kabul edilmiş atölye sonuçları etkilenmez. Böylece yanlış ilk tercih kalıcı
  cezaya dönüşmez ve işlem ortasında sürekli bonus değiştirmek engellenir.

Bu eşikler yayın kararı değil, simülasyon başlangıcıdır. Gerçek ortalama iş
süresi ölçülmeden “ilk puan şu dakikada açılır” vaadi verilemez. Mevcut formülle
seviye 10 için toplam 54.900 XP, seviye 18 için 328.100 XP gerekir; yalnız 30–95
XP/iş varsayımıyla seviye 10 yaklaşık 578–1.830 işe denk gelir. Bunlar formül
hesabıdır, gerçek oyuncu verisi değildir; bu nedenle puanı yalnız seviyeye
bağlamayı önermiyorum.

## Etkinleştirmeden önce düzeltilmesi gereken temeller

1. Ortak yetenek kataloğu: Ayar bugün kodda sabit, Tatlı Dil veri kataloğunda.
   Kararlı kimlik, dal, önkoşul, kademe, metin ve etkiler tek kayıt defterinde olmalı.
2. Atomik açma: doğru kademe ve puan doğrulanır; kaydetme başarısızsa puan veya
   etki yarım uygulanmaz. Aynı komut iki kez işlendiğinde bir kez harcanır.
3. Geçersiz kayıtlar: Tatlı Dil normalizasyonu da NaN/Infinity değerlerini güvenle
   ele almalı. Mevcut geçerli sıfır/nonzero rank alanları korunmalı.
4. Ziyaret bonuslarını dondur: mevcut save yükleme, müşteri sabrını güncel rank
   üzerinden yeniden hesaplıyor. Yeni açılışta eski müşterinin sabrı yalnız
   reload sonrası değişmemeli; bonus ziyaret doğumunda sabitlenmeli.
5. XP/ustalık ayrımı: `xpForDeal` açıklaması zararına işe XP verilmediğini söylese
   de kod taban/test/kanıt XP'si veriyor. Yeni puan kazanımını bu yoruma dayanarak
   kurma; gerçekten ödenmiş net sonucun ayrı, test edilmiş uygunluk hesabı olmalı.
6. Tek seferlik eski kayıt hakedişi: güvenilir defterlerden hesaplanır, önceden
   nonzero ranklar korunur. Hakedişten fazla eski ranklar negatif bakiye yaratmaz.
   Aynı kaydı iki kez açmak ikinci bir hakediş vermemeli.

## Mobil sunum

- Büyük yatay pan/zoom haritası yerine Ekspertiz / Esnaflık / Atölye dal sekmeleri.
- Her kartta mevcut→sonraki etki, şart, maliyet, öğrenme düğmesi ve kilit sebebi.
- Üstte kullanılabilir puan ve bir sonraki puana kalan uygun iş sayısı.
- Açılmadan önce etkileri önizleme; varsayılan seçim ve otomatik puan harcama yok.
- Personel görevleri ile oyuncu yetenekleri ayrı başlıkta kalır; ikisi aynı
  atölye riskini etkiliyorsa tek toplam sonuç açıkça gösterilir.
- 320–430 px, artmış yazı boyutu, azaltılmış hareket ve klavye/ekran okuyucu testi.

## Doğrulama / sonraki uygulama sırası

Personel ana ekranı → saf puan/katalog/normalizasyon temeli → 0/orta/yüksek ustalık
ile en az 1.000 deterministik ticaret ve atölye senaryosu → eski kayıt ve çift
ödül testleri → mobil ağaç arayüzü → sürüm kararı.

Ekonomik testler: farklı dağılımların hepsi oynanabilir, sürekli otomatik kâr
yok, kredi/maaş/kasa kuralları değişmiyor, aynı seed aynı komutlarla aynı sonuç,
yetenek açma ve yeniden dağıtım kayıt yüklemeyle fazladan hak vermiyor.

## Bu çalışma paketinde yapılan doğrulama

- 91 dosyada 1.358 Vitest testi ve 5 sürüm hazırlama testi geçti.
- TypeScript denetimi ve üretim web derlemesi geçti; sürüm kontrolündeki 81 kapı başarılı.
- 1.067 çeviri anahtarında eksik yok; yeni çeviri dışı metin eklenmedi.
- Tarayıcıda 320 ve 390 CSS piksel genişlikte personel girişi, küçük ekranda kaydırma,
  görünür Kapat düğmesi, klavye odağı ve Escape ile kapanma denendi.
- Aktif müşteri varken İşletme üzerinden aynı paneli açıp kapatmak müşteriyi,
  talebi, sabrı veya teklifi sıfırlamadı. Panel açıkken zaman ve otomasyon duruyor.
- Fiziksel iPhone testi ve yeni imzalı native build bu paketin kapsamında yapılmadı.
  Yetenek ağacı önerilerinin 1.000 senaryoluk denge simülasyonu henüz yapılmadı.
- Bu kaynak değişiklikleri Apple'a daha önce gönderilmiş 1.2.0 build 31'in içinde değildir.

Ekran görüntüleri:

- `C:/Users/Gaming/.codex/visualizations/2026/10/01/mihenk-personnel-home/shop-personnel-390.jpg`
- `C:/Users/Gaming/.codex/visualizations/2026/10/01/mihenk-personnel-home/personnel-320.jpg`
