# iOS — App Store Connect kontrol listesi

Apple Developer Program hesabı (yıllık ücretli) gerekir; bu adımı kimse
senin yerine atamaz. Sırayla:

## 1. Hesap ve kimlik
- [ ] Apple Developer Program üyeliği aktif (developer.apple.com)
- [ ] App Store Connect'te yeni uygulama kaydı açıldı
- [ ] Bundle ID belirlendi — örnek: `com.[şirket].mihenkaynak`
      `[DOLDURULACAK]` — bu depoda henüz bir bundle ID tanımlı değil.
- [ ] SKU (iç referans kodu) belirlendi

## 2. Native derleme
- [ ] Capacitor (veya eşdeğeri) kuruldu — bu depoda **henüz yok**
- [ ] `ios/` Xcode projesi oluşturuldu
- [ ] İmzalama sertifikası + provisioning profile Xcode'da tanımlı
- [ ] TestFlight'a ilk derleme yüklendi ve kendi cihazında denendi

## 3. Görseller (bkz. `../assets/eksikler.md`)
- [ ] 1024×1024 App Store ikonu — **alfa kanalı OLMAMALI**, köşeler
      kare (Apple kendi yuvarlıyor)
- [ ] iPhone 6.7" ekran görüntüleri (1290×2796) — en az 3, en çok 10
- [ ] iPhone 6.5" ekran görüntüleri (1284×2778) — gerekebilir, cihaz
      matrisine göre değişir
- [ ] (opsiyonel) Önizleme videosu

## 4. Mağaza metni (bkz. `metadata-taslak.md`)
- [ ] Uygulama adı (≤30 karakter)
- [ ] Alt başlık (≤30 karakter)
- [ ] Açıklama (≤4000 karakter)
- [ ] Anahtar kelimeler (≤100 karakter, virgülle ayrık)
- [ ] Destek URL'si — `[DOLDURULACAK]`
- [ ] Pazarlama URL'si (opsiyonel)

## 5. Gizlilik ve yaş derecelendirmesi
- [ ] Gizlilik politikası URL'si — taslak `../legal/gizlilik-politikasi.md`,
      **barındırılması ve gerçek bir URL'ye konması gerekiyor** (GitHub Pages,
      kendi alan adın, vb.)
- [ ] "App Privacy" anketi (App Store Connect içinde) — bugünkü koda göre
      doldurulacak alan: **"Veri Toplanmıyor"** (kodda hiç ağ isteği,
      analitik veya üçüncü taraf SDK yok — bkz. depo kökü `store/README.md`).
      Bulut kayıt eklenince bu anket YENİDEN doldurulmalı.
- [ ] Yaş derecelendirmesi anketi — oyun şiddet/kumar/yetişkin içerik
      taşımıyor; ekonomi simülasyonu. Muhtemel derece: 4+. Anket yine de
      dürüstçe doldurulmalı, burada varsayım yapılmadı.

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
