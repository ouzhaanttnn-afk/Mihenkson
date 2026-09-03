# Gizlilik Politikası — MİHENKAYNAK

**Taslak.** Yayımlamadan önce `[DOLDURULACAK]` alanları doldur, bir hukuk
danışmanına göster. Bu metin uydurulmadı — depodaki kodun bugünkü hâli
taranarak yazıldı (bkz. depo kökü `store/README.md`).

**Barındırılan sürüm (tasarlanmış, aynı içerik):**
https://claude.ai/code/artifact/820c2ec1-26f3-4271-847b-a8ff36829f51

> ⚠️ **Herkese açık ama İÇERİK GÜNCEL DEĞİL.** Sayfa AdMob reklam bölümünü
> (madde 02) içerecek şekilde aynı URL'e yeniden yayınlandı, ama paylaşım
> linki eski bir sürüme "pinlenmiş" — ziyaretçiler hâlâ ESKİ (reklamdan
> önceki) içeriği görüyor. Bunu ben düzeltemem: sayfanın SAHİBİ (kullanıcı),
> paylaşım menüsünden pini en güncel sürüme taşımalı — muhtemelen "Update
> shared version" / benzeri bir seçenek. Bu düzeltilmeden Apple/Google
> incelemecisi hâlâ "reklam yok" diyen eski metni görür; gerçek uygulama
> ile hosted sayfa çelişir. Bu iki dosya (`.md`) hâlâ tek doğruluk kaynağı.

Son güncelleme: [DOLDURULACAK — tarih]
Geliştirici: [DOLDURULACAK — ad/şirket]
İletişim: [DOLDURULACAK — e-posta]

---

## Özet

MİHENKAYNAK'in kendisi hiçbir kişisel veriyi toplamaz, sunucuya göndermez
veya üçüncü taraflarla paylaşmaz — oyun ilerlemeniz tamamen cihazınızda
kalır. Tek istisna: **isteğe bağlı ödüllü reklamlar.** Uygulama, "4x hızı
reklamla aç" ve "Dükkânı Canlandır" düğmelerine BİZZAT DOKUNDUĞUNUZDA
Google AdMob aracılığıyla bir video reklam gösterir; bu reklam sağlayıcı
kendi başına bazı cihaz/reklam verilerini işleyebilir. Aşağıda bunun tam
kapsamı var. Reklam dışında hiçbir ekran, hiçbir arka plan süreç veri
göndermez.

## Topladığımız veri — oyun tarafı

**Hiç.** Uygulama içinde girdiğiniz isim ve seçtiğiniz profil görseli dahil
her şey yalnızca cihazınızın yerel depolamasında durur; bizim
sunucularımıza hiçbir zaman ulaşmaz — çünkü böyle bir sunucumuz yok.

Oyunun kendisi şunları YAPMAZ:
- Analitik veya kullanım istatistiği toplamaz
- Çökme raporu göndermez
- Konum, kamera, mikrofon veya kişi listesine erişmez
- Hesap oluşturmanızı istemez

## Reklamlar — Google AdMob

Uygulamada **yalnız ödüllü (rewarded) video reklam** var; banner ya da
tam ekranı kaplayıp kendiliğinden çıkan (interstitial) reklam YOK. Reklam
YALNIZ siz "4x hızı reklamla aç" veya "Dükkânı Canlandır" düğmesine
dokunduğunuzda, tarafınızdan başlatılmış olarak gösterilir; bir video izlemeyi
tamamlarsanız oyun içi ödülü (geçici hız artışı veya müşteri akını) alırsınız,
tamamlamazsanız hiçbir şey değişmez.

Bu reklamları sağlayan **Google AdMob**, reklamı seçip göstermek için
şunları işleyebilir: reklam kimliği (Android Advertising ID / iOS IDFA),
cihaz/uygulama bilgisi ve yaklaşık konum (IP üzerinden). Bu veri bize değil,
doğrudan Google'a gider; MİHENKAYNAK bu veriyi göremez, saklamaz. Google'ın
bu veriyi nasıl işlediği kendi politikasında yazıyor:
https://policies.google.com/technologies/ads

- **iOS — App Tracking Transparency:** İlk reklamdan önce iOS izin ister
  ("bu kimlik sana daha ilgili reklam göstermek için kullanılacak").
  Reddederseniz kişiselleştirilmemiş reklam gösterilmeye devam eder,
  reklam özelliği kapanmaz.
- **AB/İngiltere — GDPR onayı:** Google'ın Kullanıcı Mesajlaşma Platformu
  (UMP) üzerinden, gerekiyorsa bir onay formu gösterilir; onayınızı
  Ayarlar'dan istediğiniz zaman değiştirebilirsiniz.
- Uygulama gerçek bir AdMob hesabına bağlı (bkz. `src/ui/ads.ts`); yeni bir
  reklam biriminin gerçek reklam getirmeye başlaması Google tarafında
  birkaç saati bulabilir.

## Yerel depolama

Oyun ilerlemeniz (nakit, stok, itibar, seviye, tercihleriniz) cihazınızda
yerel depolamada saklanır. Bu veri:
- Yalnız cihazınızdan okunabilir
- Uygulamayı silmeniz veya uygulama verilerini temizlemeniz hâlinde kaybolur
- Bizim erişimimizde değildir — göremeyiz, göndermenizi isteyemeyiz

## Üçüncü taraf hizmetler

Yalnız **Google AdMob** (Google Mobile Ads SDK) — yukarıdaki "Reklamlar"
bölümünde açıklandı. Bunun dışında uygulama içinde hiçbir üçüncü taraf SDK,
analitik kütüphanesi veya izleyici bulunmuyor.

## Çocukların gizliliği

Oyunun kendisi kişisel veri toplamaz. Reklam tarafında: bu sürüm reklamları
çocuğa yönelik (child-directed) olarak İŞARETLEMİYOR — mağaza yaş
derecelendirmesi [DOLDURULACAK] netleşince, gerekiyorsa AdMob'un COPPA/
"yaşça uygun reklam deneyimi" ayarları (`tagForChildDirectedTreatment`,
`maxAdContentRating`, bkz. `src/ui/ads.ts`) buna göre güncellenmeli.

## Değişiklikler

**Bu politika, uygulamaya bulut tabanlı hesap/kayıt sistemi eklendiğinde
geçerliliğini yitirir ve yeniden yazılmalıdır** — o noktada en azından bir
hesap kimliği (e-posta veya mağaza hesabı) işlenmeye başlayacaktır. Bu
doküman o değişiklikten önceki, yalnız-yerel-kayıt döneminin
fotoğrafıdır.

## İletişim

Sorularınız için: [DOLDURULACAK — e-posta]
