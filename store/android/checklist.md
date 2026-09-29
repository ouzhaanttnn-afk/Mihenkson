# Android — Google Play Console kontrol listesi

Google Play Console hesabı (tek seferlik kayıt ücreti) gerekir.

## 1. Hesap ve kimlik
- [ ] Play Console hesabı açık, geliştirici profili tamamlandı
- [ ] Yeni uygulama kaydı oluşturuldu
- [x] Paket adı (application ID) **kesinleştirildi** — kullanıcı kararı:
      `com.mihenkaynak.app` (`capacitor.config.ts`). Değer zaten native tarafta
      aynıydı (`android/app/build.gradle`), ek bir senkronizasyon gerekmedi.

## 2. Native derleme
- [x] Capacitor kuruldu — `@capacitor/core`, `@capacitor/android`, `@capacitor/cli`
- [x] `android/` Gradle projesi oluşturuldu (`npx cap add android`) — depoda,
      `npm run cap:open:android` ile açılır
- [x] Uygulama ikonu (tüm yoğunluklar) + splash ekranı yerleştirildi
      (`@capacitor/assets`)
- [x] Google AdMob (ödüllü reklam) eklendi — `@capacitor-community/admob`,
      `AndroidManifest.xml`'e App ID meta-data'sı işlendi (bkz. `src/ui/ads.ts`)
- [x] `strings.xml`'deki `admob_app_id` gerçek AdMob Android App ID'si
      (`ca-app-pub-4229088811556918~6302768552`) — kullanıcının AdMob
      hesabından alındı, `isTesting` kaldırıldı (bkz. `src/ui/ads.ts`)
- [x] Mihenk'e özel yükleme anahtarı depo dışında üretildi:
      `C:\Users\Gaming\Documents\Mihenk-Android-Signing\mihenk-upload.p12`.
      Şifresi aynı klasörde Windows hesabına bağlı, şifreli
      `upload-password.dpapi` dosyasında; ayrıca GitHub Actions gizli alanında.
      İkisini de yayın öncesinde ayrı bir güvenli ortama yedekle.
- [x] Android sürümü `1.1.3` (`versionCode 1`) ve imzalı Play AAB derleme
      iş akışı hazır (`.github/workflows/android-play-bundle.yml`).
- [x] İmzalı AAB çıktısı GitHub Actions'ta `jarsigner` ile doğrulandı ve
      `C:\Users\Gaming\Desktop\Mihenk-Android-Play-1.1.3\app-release.aab`
      konumuna indirildi. Yerel SHA-256, derleme günlüğündeki değerle eşleşiyor.
- [ ] App Bundle (.aab) internal testing kanalına yüklendi ve kendi
      cihazında denendi

## 3. Görseller (bkz. `../assets/eksikler.md`)
- [x] Uygulama ikonu 512×512 (32-bit PNG, alfa **olabilir**) — mevcut
      `public/assets/brand/icon-512.png` bu boyutta, doğrudan kullanılabilir
- [x] Adaptive icon: ön plan + arka plan katmanı — üretildi
      (`android/app/src/main/res/mipmap-*/ic_launcher_foreground.png` /
      `_background.png`). **Not:** gerçek bir alfa kesimi değil — düz ikon
      güvenli-alan içinde ön plana, marka rengi arka plana konuldu (bkz.
      `../README.md`); gözle kontrol edildi, temiz görünüyor.
- [x] Öne çıkan görsel (feature graphic) 1024×500 — üretildi:
      `../assets/generated/feature-graphic-1024x500.png`
- [ ] Google Play telefon ekran görüntüleri: mevcut 1290×2796 App Store
      görselleri Play için uygun değil (uzun kenar kısa kenarın 2 katını
      aşıyor). Android cihazda gerçek oyundan en az 3 adet 9:16 portre
      görüntü alıp listeye ekle; bunları Play'e yüklenebilir sayma.
- [ ] (opsiyonel) 7" ve 10" tablet ekran görüntüleri

## 4. Mağaza girişi (bkz. `metadata-taslak.md`)
- [ ] Uygulama adı (≤30 karakter)
- [ ] Kısa açıklama (≤80 karakter)
- [ ] Tam açıklama (≤4000 karakter)
- [ ] Kategori: Oyun > Simülasyon

## 5. Content rating (içerik derecelendirmesi anketi)
- [ ] IARC anketi (Play Console'da doldurulur, ben giremem) — kodun
      bugünkü hâli taranarak belirlendi, **hedef: Everyone / PEGI 3**.
      Her kategori için işaretlenecek: Şiddet — Yok · Kan/Korku — Yok ·
      Cinsellik/Çıplaklık — Yok · Müstehcen Dil — Yok · Kontrollü Madde —
      Yok · **Kumar (gerçek veya simüle) — Yok** (pazarlık/haggle
      deterministik, GDD 28.3'e göre sabit RNG türetimi kullanır — şans
      temelli bahis değil) · Kullanıcılar birbiriyle etkileşiyor mu — Hayır
      (çok oyunculu/sohbet yok) · Konum paylaşıyor mu — Hayır · Kişisel
      bilgi paylaşıyor mu — Hayır · Kısıtlanmamış internet erişimi — Hayır
      · Uygulama içi dijital satın alma — Hayır (IAP yok). Ayrı olarak
      mağaza girişindeki **"Reklam içerir"** kutusu İŞARETLENMELİ (AdMob
      eklendi, bkz. `../legal/gizlilik-politikasi.md`).
- [ ] Hedef kitle ve içerik beyanı

## 6. Data safety (veri güvenliği formu)
- [ ] AdMob eklendiğinden beri **"Herhangi bir veri toplanmıyor" ARTIK
      DOĞRU DEĞİL** — "Reklam kimliği" topluyor, amaç "Reklam veya
      pazarlama", "Google AdMob" ile paylaşılıyor olarak işaretle (bkz.
      `../README.md` "Mağaza konsollarında AYRICA doldurulması gerekenler")
- [ ] Bulut kayıt eklenince bu form AYRICA **yeniden doldurulmalı**

## 7. Gizlilik politikası
- [x] Uygulamayla birlikte Vercel production dağıtımına dahil:
      https://alpersonmihenk-chi.vercel.app/privacy.html
- [ ] Son production dağıtımından sonra gizlilik ve destek URL'lerini anonim
      pencerede açarak HTTP 200 ve içerik doğrulaması yap.

## 8. Fiyatlandırma ve dağıtım
- [x] Ücretsiz / ücretli — kullanıcı kararı: **Ücretsiz**
- [x] Uygulama içi satın alma var mı? **Kodda hiçbir IAP entegrasyonu yok** — ücretsiz karara uygun
- [ ] Dağıtım ülkeleri
