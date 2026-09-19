# Gizlilik Politikası — MİHENKAYNAK

Bu dosya yayımlanan politikanın depo içindeki kaynak kopyasıdır. Önemli bir
ürün veya veri işleme değişikliğinde hukuk danışmanıyla yeniden gözden
geçirilmelidir.

**Barındırılan sürüm:**
https://alpersonmihenk-chi.vercel.app/privacy.html

Sayfa bu deponun `public/privacy.html` dosyasından Vercel dağıtımıyla
yayınlanır; eski, güncellenemeyen üçüncü taraf paylaşım bağlantısı kullanılmaz.

Son güncelleme: 19 Eylül 2026
Geliştirici: Nostoscomp
İletişim: nostoscomp@gmail.com

---

## Özet

Oyun ilerlemeniz tamamen cihazınızda kalır ve geliştiriciye ait bir sunucuya
gönderilmez. Uygulamada **isteğe bağlı ödüllü reklamlar** ve hafta açılışında
gösterilebilen **geçiş reklamları** Google AdMob tarafından sağlanır. Google
Mobile Ads SDK, reklam sunumu/güvenliği/ölçümü için aşağıda açıklanan bazı
verileri işleyebilir. iOS uygulamasında Firebase Analytics Core genel kullanım
istatistiklerini toplar; oyun kayıtları buluta yüklenmez.

## Topladığımız veri — oyun tarafı

Oyun kaydı bakımından **hiç.** Uygulama içinde girdiğiniz isim ve seçtiğiniz
profil görseli dahil oyun kayıtları yalnızca cihazınızın yerel depolamasında
durur; geliştirici sunucusuna yüklenmez.

Uygulamanın kendi kodu şunları YAPMAZ:
- Geliştiriciye ait çökme raporlama hizmeti kullanmaz
- Konum, kamera, mikrofon veya kişi listesine erişmez
- Hesap oluşturmanızı istemez

## Reklamlar — Google AdMob

Uygulamada iki tür reklam var; banner (ekranda sabit duran şerit) YOK.

- **Ödüllü (rewarded) video** — YALNIZ siz "4x hızı reklamla aç" veya
  "Dükkânı Canlandır" düğmesine dokunduğunuzda, tarafınızdan başlatılmış
  olarak gösterilir; bir video izlemeyi tamamlarsanız oyun içi ödülü
  (geçici hız artışı veya müşteri akını) alırsınız, tamamlamazsanız
  hiçbir şey değişmez.
- **Geçiş (interstitial) reklamı** — haftanın Pazartesi açılışında,
  dükkânınızı yeniden açtığınızda otomatik gösterilir; oyun içi bir ödül
  vermez, Google'ın kendi kapatma kontrolüyle geçilir.

Bu reklamları sağlayan **Google AdMob / Google Mobile Ads SDK**; IP adresi
ve bundan çıkarılabilen yaklaşık konum, cihaz veya reklam kimlikleri,
reklam gösterimi ve etkileşim bilgileri, uygulama etkileşimleri, performans
verileri ve kişiyi doğrudan tanımlamayan çökme/teşhis verilerini işleyebilir.
Bu işleme reklam sunumu, reklam ölçümü, sahteciliği önleme, güvenlik, analiz
ve performans iyileştirme amaçlarıyla yapılabilir. Veriler Google'ın
sistemlerine gider. Güncel teknik kapsam:
https://developers.google.com/admob/ios/privacy/data-disclosure
Google politikası: https://policies.google.com/privacy

- **iOS — App Tracking Transparency:** İlk reklamdan önce iOS izin ister.
  Reddederseniz IDFA izleme amacıyla kullanılamaz; uygulama çalışmaya devam
  eder ve reklam varsa kişiselleştirilmemiş veya sınırlı biçimde sunulur.
- **AB/İngiltere — GDPR onayı:** Google'ın Kullanıcı Mesajlaşma Platformu
  (UMP) üzerinden, gerekiyorsa bir onay formu gösterilir. Onay vermemek
  oyunun temel özelliklerini engellemez.
- Uygulama gerçek bir AdMob hesabına bağlı (bkz. `src/ui/ads.ts`); yeni bir
  reklam biriminin gerçek reklam getirmeye başlaması Google tarafında
  birkaç saati bulabilir.

## Yerel depolama

Oyun ilerlemeniz (nakit, stok, itibar, seviye, tercihleriniz) cihazınızda
yerel depolamada saklanır. Bu veri:
- Yalnız cihazınızdan okunabilir
- Uygulamayı silmeniz veya uygulama verilerini temizlemeniz hâlinde kaybolur
- Bizim erişimimizde değildir — göremeyiz, göndermenizi isteyemeyiz

## Kullanım analitiği — Google Firebase

iOS sürümündeki Firebase Analytics Core, uygulama açılışı ve oturum gibi
olayları; uygulama sürümü, cihaz/işletim sistemi bilgisi, yaklaşık bölge ve
uygulama örneği kimliği gibi teknik verileri işleyebilir. Google'a gönderilen
bu veriler oyunun genel kullanımını anlamak ve iyileştirmek içindir. Dükkân
adı, nakit, stok ve oyun kayıt dosyası özel analitik olayı olarak gönderilmez.
Bu kurulumda reklam kimliği (IDFA) toplama yeteneği ve Crashlytics yoktur.
Google'ın açıklaması: https://firebase.google.com/support/privacy

## Üçüncü taraf hizmetler

Veri işleyen üçüncü taraf hizmetler **Google AdMob** (Google Mobile Ads SDK)
ve iOS'ta **Firebase Analytics**'tir. Capacitor uygulama kabuğu oyunun cihaz
üzerinde çalışmasını sağlar ve ayrı bir hesap hizmeti değildir.

## Çocukların gizliliği

Uygulama genel kitleye yönelik bir simülasyon oyunudur ve kullanıcıdan yaş,
ad, e-posta veya hesap bilgisi istemez. Bir ebeveyn veya vasi gizlilikle
ilgili bir sorun olduğunu düşünüyorsa aşağıdaki iletişim adresine yazabilir.

## Değişiklikler

**Bu politika, uygulamaya bulut tabanlı hesap/kayıt sistemi eklendiğinde
geçerliliğini yitirir ve yeniden yazılmalıdır** — o noktada en azından bir
hesap kimliği (e-posta veya mağaza hesabı) işlenmeye başlayacaktır. Bu
doküman o değişiklikten önceki, yalnız-yerel-kayıt döneminin
fotoğrafıdır.

## İletişim

Sorularınız için: nostoscomp@gmail.com
