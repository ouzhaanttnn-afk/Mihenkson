# iOS — App Store Connect kontrol listesi

Apple Developer Program hesabı (yıllık ücretli) gerekir; bu adımı kimse
senin yerine atamaz. Sırayla:

## 1. Hesap ve kimlik
- [x] Apple Developer Program üyeliği aktif (developer.apple.com)
- [x] App Store Connect uygulama kaydı açıldı — Apple ID `6808742428`
- [x] Bundle ID **kesinleştirildi** — kullanıcı kararı: `com.mihenkaynak.app`
      (`capacitor.config.ts`). Değer zaten native tarafta aynıydı
      (`PRODUCT_BUNDLE_IDENTIFIER`), ek bir senkronizasyon gerekmedi.
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
- [x] `SKAdNetworkItems`, Google'ın
      [güncel resmi iOS gizlilik stratejileri listesindeki](https://developers.google.com/admob/ios/privacy/strategies)
      50 tekrarsız kimlikle eşitlendi (son kontrol: 4 Eylül 2026).
- [ ] Her App Store sürümünden önce aynı resmi Google sayfasını yeniden kontrol
      et; liste değiştiyse `Info.plist` ve release kontrolünü güncelle. AdMob
      mediation açılırsa her ağ ortağının ek SKAdNetwork kimliklerini de ekle.
- [x] Ürün kararı: bu sürüm iPhone-only ve yalnız Portrait. Xcode cihaz ailesi
      `1`; iPad'e özel yön ve mağaza görseli ilan edilmiyor.
- [x] Yalnız standart HTTPS ve SDK-içi şifreleme kullanımı için
      `ITSAppUsesNonExemptEncryption = false` eklendi; App Store Connect
      export compliance sorusu uygulama paketiyle tutarlı.
- [ ] İmzalama sertifikası + provisioning profile Xcode'da tanımlı — **bu
      ortamda Xcode yok, senin makinende yapılmalı**
- [x] Mac erişimi yoksa kullanılacak, yalnız elle başlatılan GitHub Actions
      TestFlight iş akışı hazır (`../../.github/workflows/ios-testflight.yml`;
      kurulum ayrıntıları: `github-actions-testflight.md`). Apple Distribution
      sertifikası, provisioning profile ve GitHub secrets henüz oluşturulmadı.
- [ ] TestFlight'a ilk derleme yüklendi ve kendi cihazında denendi

## 3. Görseller (bkz. `../assets/eksikler.md`)
- [x] 1024×1024 App Store ikonu — **alfa kanalı OLMAMALI**, köşeler
      kare (Apple kendi yuvarlıyor) — üretildi:
      `../assets/generated/icon-1024-appstore.png` (1024×1024, RGB, ölçüldü)
- [x] Güncel iPhone 6.9" kabul ölçüsünde ekran görüntüleri (1290×2796) — en az 3, en çok 10 —
      4 adet üretildi: `../assets/generated/screenshots/`
- [x] iPhone 6.5" ekran görüntüleri (1284×2778) — 4 adet üretildi:
      `../assets/generated/screenshots-6.5in/`
- [ ] (opsiyonel) Önizleme videosu

## 4. Mağaza metni (bkz. `metadata-taslak.md`)
- [ ] Uygulama adı (≤30 karakter)
- [ ] Alt başlık (≤30 karakter)
- [ ] Açıklama (≤4000 karakter)
- [ ] Anahtar kelimeler (≤100 karakter, virgülle ayrık)
- [x] Destek URL'si (Türkçe) — `https://alpersonmihenk-chi.vercel.app/support.html`
- [x] Support URL (English) — `https://alpersonmihenk-chi.vercel.app/support-en.html`
- [x] Pazarlama URL'si — `https://alpersonmihenk-chi.vercel.app/`

## 5. Gizlilik ve yaş derecelendirmesi
- [x] Gizlilik politikaları depoda ve Vercel dağıtımına dahil:
      Türkçe `https://alpersonmihenk-chi.vercel.app/privacy.html` ·
      English `https://alpersonmihenk-chi.vercel.app/privacy-en.html`
- [ ] Son production dağıtımından sonra gizlilik ve destek URL'lerini oturum
      kapalı/anonim pencerede açarak HTTP 200 ve içerik doğrulaması yap
- [ ] AdMob Console → Privacy & messaging altında GDPR/European regulations
      mesajını ve iOS IDFA açıklama mesajını oluştur, yayınla ve doğru iOS/
      Android uygulamalarına bağlandığını doğrula. Kod ATT istemini ayrıca
      çağırmaz; iOS ATT akışının tek kaynağı yayımlanmış UMP IDFA mesajıdır.
- [ ] Gerçek cihaz reklam gizliliği kapısı: EEA test geography ile ilk onay +
      "Gizlilik tercihleri" yeniden açma, non-EEA akışı ve temiz kurulumlu
      iPhone'da ATT kabul/ret seçenekleri sınanıp ekran görüntüsü/log saklanır.
      `canRequestAds = false` iken hiçbir reklam isteği çıkmamalı; izinli akışta
      ödüllü ve geçiş reklamı ayrı ayrı yüklenebilmelidir.
- [ ] "App Privacy" anketi (App Store Connect içinde) — AdMob eklendiğinden
      beri **"Veri Toplanmıyor" ARTIK DOĞRU DEĞİL**. Google Mobile Ads SDK'nın
      güncel resmi veri açıklamasına göre Coarse Location (IP üzerinden),
      Device ID, Advertising Data, Product Interaction, Crash Data,
      Performance Data ve Other Diagnostic Data kategorilerini kontrol et.
      Her kategori için gerçek SDK ayarına göre amaç, kullanıcıyla bağlantı
      (linked) ve tracking alanlarını App Store Connect'te ayrı ayrı doğrula;
      Third-Party Advertising amacını atlama. Hosted politika ile Nutrition
      Label birebir tutarlı kalmalı. Bulut kayıt eklenince anketi yeniden doldur.
- [ ] Güncel yaş derecelendirmesi anketi App Store Connect'te gerçek sürüm
      üzerinden doldurulacak; sonuç portal tarafından hesaplanmadan kesin bir
      yaş etiketi yazılmayacak. Şiddet, cinsel içerik, küfür, madde kullanımı,
      korku, kumar/loot box, yarışma, sosyal/mesajlaşma ve sağlık içeriği yok;
      kısıtlanmamış web erişimi yok. **Advertising / Reklam: Var** (Google
      AdMob ödüllü ve geçiş reklamları). Ebeveyn denetimi, yaş doğrulama ve
      uygulama içi satın alma yok. Portal soruları değişebildiği için gönderim
      gününde görünen bütün capability/content soruları yeniden doğrulanacak.

## 6. Fiyatlandırma ve kullanılabilirlik
- [x] Fiyat katmanı (ücretsiz / ücretli) — kullanıcı kararı: **Ücretsiz**
- [x] Uygulama içi satın alma var mı? Şu an **kodda hiçbir IAP entegrasyonu
      yok**; Market sekmesi yalnız oyun içi para (₺) harcıyor — ücretsiz
      karara uygun.
- [ ] Kullanılabilir ülkeler/bölgeler

## 7. İnceleme notları
- [ ] Apple incelemesine test hesabı gerekmez (giriş sistemi yok, bulut
      kayıt eklenene kadar)
- [ ] İnceleme notuna Türkçe/İngilizce kısa oynanış açıklaması eklenmesi
      önerilir (oyun her iki dilde de tam çalışıyor, bkz. proje testleri)
