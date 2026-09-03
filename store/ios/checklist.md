# iOS — App Store Connect kontrol listesi

Apple Developer Program hesabı (yıllık ücretli) gerekir; bu adımı kimse
senin yerine atamaz. Sırayla:

## 1. Hesap ve kimlik
- [ ] Apple Developer Program üyeliği aktif (developer.apple.com)
- [ ] App Store Connect'te yeni uygulama kaydı açıldı
- [ ] Bundle ID kesinleştirildi — `capacitor.config.ts`'de şu an **GEÇİCİ**
      `com.mihenkaynak.app` yazıyor; gerçek şirket/geliştirici kimliğin
      netleşince değiştirilmeli (bkz. `../README.md`). Yayından önce
      değiştirmek bedava, sonra pratikte imkânsız.
- [ ] SKU (iç referans kodu) belirlendi

## 2. Native derleme
- [x] Capacitor kuruldu — `@capacitor/core`, `@capacitor/ios`, `@capacitor/cli`
- [x] `ios/` Xcode projesi oluşturuldu (`npx cap add ios`) — depoda,
      `npm run cap:open:ios` ile açılır
- [x] Uygulama ikonu + splash ekranı yerleştirildi (`@capacitor/assets`)
- [x] Google AdMob (ödüllü reklam) eklendi — `@capacitor-community/admob`,
      `Info.plist`'e `GADApplicationIdentifier`/`SKAdNetworkItems`/
      `NSUserTrackingUsageDescription` işlendi (bkz. `src/ui/ads.ts`)
- [x] `GADApplicationIdentifier` gerçek AdMob iOS App ID'si
      (`ca-app-pub-4229088811556918~3768104554`) — kullanıcının AdMob
      hesabından alındı, `isTesting` kaldırıldı (bkz. `src/ui/ads.ts`)
- [ ] Bundle ID kesinleşince `npm run cap:sync` ile yeniden senkronize et
- [ ] İmzalama sertifikası + provisioning profile Xcode'da tanımlı — **bu
      ortamda Xcode yok, senin makinende yapılmalı**
- [ ] TestFlight'a ilk derleme yüklendi ve kendi cihazında denendi

## 3. Görseller (bkz. `../assets/eksikler.md`)
- [x] 1024×1024 App Store ikonu — **alfa kanalı OLMAMALI**, köşeler
      kare (Apple kendi yuvarlıyor) — üretildi:
      `../assets/generated/icon-1024-appstore.png` (1024×1024, RGB, ölçüldü)
- [x] iPhone 6.7" ekran görüntüleri (1290×2796) — en az 3, en çok 10 —
      4 adet üretildi: `../assets/generated/screenshots/`
- [x] iPhone 6.5" ekran görüntüleri (1284×2778) — 4 adet üretildi:
      `../assets/generated/screenshots-6.5in/`
- [ ] (opsiyonel) Önizleme videosu

## 4. Mağaza metni (bkz. `metadata-taslak.md`)
- [ ] Uygulama adı (≤30 karakter)
- [ ] Alt başlık (≤30 karakter)
- [ ] Açıklama (≤4000 karakter)
- [ ] Anahtar kelimeler (≤100 karakter, virgülle ayrık)
- [ ] Destek URL'si — GEÇİCİ olarak `mailto:nostoscomp@gmail.com` önerildi
      (bkz. `metadata-taslak.md`); Apple gerçek bir web sayfası tercih eder
- [ ] Pazarlama URL'si (opsiyonel)

## 5. Gizlilik ve yaş derecelendirmesi
- [x] Gizlilik politikası barındırıldı — `../legal/gizlilik-politikasi.md`
      taslağının tasarlanmış sürümü yayınlandı:
      https://claude.ai/code/artifact/820c2ec1-26f3-4271-847b-a8ff36829f51
- [x] Sayfa herkese açık — kullanıcı paylaşım menüsünden yaptı, doğrulandı
      ("shared with anyone with the link"). Apple incelemecisi erişebilir.
- [ ] "App Privacy" anketi (App Store Connect içinde) — AdMob eklendiğinden
      beri **"Veri Toplanmıyor" ARTIK DOĞRU DEĞİL**: "Identifiers → Device
      ID", kullanım amacı "Third-Party Advertising" olarak işaretlenmeli
      (bkz. `../README.md` "Mağaza konsollarında AYRICA doldurulması
      gerekenler"). Bulut kayıt eklenince bu anket YENİDEN doldurulmalı.
- [ ] Yaş derecelendirmesi anketi (App Store Connect'te doldurulur, ben
      giremem) — kodun bugünkü hâli taranarak belirlendi, **hedef: 4+**.
      Her madde için işaretlenecek: Karikatür/Fantastik Şiddet — Yok ·
      Gerçekçi Şiddet — Yok · Cinsel İçerik/Çıplaklık — Yok · Küfür/Kaba
      Mizah — Yok · Alkol/Tütün/Uyuşturucu — Yok (kuyumculuk, madde değil)
      · Olgun/Müstehcen Temalar — Yok · Korku Temaları — Yok · Simüle
      Kumar — **Yok** (pazarlık/haggle deterministik, GDD 28.3'e göre
      sabit RNG türetimi kullanır — şans temelli bahis/loot box değil) ·
      Yarışmalar — Yok · Kısıtlanmamış Web Erişimi — Yok (uygulama içi
      tarayıcı yok) · Reklam (AdMob) var ama bu anketin bir maddesi değil,
      "App Privacy" bölümünde ayrıca beyan ediliyor (bkz. yukarıdaki madde).

## 6. Fiyatlandırma ve kullanılabilirlik
- [ ] Fiyat katmanı (ücretsiz / ücretli) — `[DOLDURULACAK]`, ürün kararı
- [ ] Uygulama içi satın alma var mı? Şu an **kodda hiçbir IAP entegrasyonu
      yok**; Market sekmesi yalnız oyun içi para (₺) harcıyor.
- [ ] Kullanılabilir ülkeler/bölgeler

## 7. İnceleme notları
- [ ] Apple incelemesine test hesabı gerekmez (giriş sistemi yok, bulut
      kayıt eklenene kadar)
- [ ] İnceleme notuna Türkçe/İngilizce kısa oynanış açıklaması eklenmesi
      önerilir (oyun her iki dilde de tam çalışıyor, bkz. proje testleri)
