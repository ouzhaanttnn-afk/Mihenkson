# Android — Google Play Console kontrol listesi

Google Play Console hesabı (tek seferlik kayıt ücreti) gerekir.

## 1. Hesap ve kimlik
- [ ] Play Console hesabı açık, geliştirici profili tamamlandı
- [ ] Yeni uygulama kaydı oluşturuldu
- [ ] Paket adı (application ID) kesinleştirildi — `capacitor.config.ts`'de şu an
      **GEÇİCİ** `com.mihenkaynak.app` yazıyor; gerçek şirket/geliştirici kimliğin
      netleşince değiştirilmeli (bkz. `../README.md`). Yayından önce değiştirmek
      bedava, sonra pratikte imkânsız.

## 2. Native derleme
- [x] Capacitor kuruldu — `@capacitor/core`, `@capacitor/android`, `@capacitor/cli`
- [x] `android/` Gradle projesi oluşturuldu (`npx cap add android`) — depoda,
      `npm run cap:open:android` ile açılır
- [x] Uygulama ikonu (tüm yoğunluklar) + splash ekranı yerleştirildi
      (`@capacitor/assets`)
- [ ] Paket adı kesinleşince `npm run cap:sync` ile yeniden senkronize et
- [ ] İmzalama anahtarı (keystore) üretildi ve **güvenli bir yere yedeklendi**
      (kaybedilirse uygulama bir daha güncellenemez) — **bu ortamda Android
      Studio yok, senin makinende yapılmalı**
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
- [x] Telefon ekran görüntüleri — en az 2, en çok 8 (16:9 veya 9:16) —
      4 adet üretildi (1290×2796, 9:16 içinde): `../assets/generated/screenshots/`
- [ ] (opsiyonel) 7" ve 10" tablet ekran görüntüleri

## 4. Mağaza girişi (bkz. `metadata-taslak.md`)
- [ ] Uygulama adı (≤30 karakter)
- [ ] Kısa açıklama (≤80 karakter)
- [ ] Tam açıklama (≤4000 karakter)
- [ ] Kategori: Oyun > Simülasyon

## 5. Content rating (içerik derecelendirmesi anketi)
- [ ] IARC anketi dolduruldu — oyun şiddet/kumar benzeri mekanik/yetişkin
      içerik taşımıyor (ekonomi simülasyonu); anket yine de Play
      Console'da doldurulmalı, burada tahmin edilmedi
- [ ] Hedef kitle ve içerik beyanı

## 6. Data safety (veri güvenliği formu)
- [ ] Bugünkü koda göre: **"Herhangi bir veri toplanmıyor veya
      paylaşılmıyor"** seçilebilir — kodda ağ isteği, analitik veya SDK
      yok (bkz. depo kökü `store/README.md`)
- [ ] Bulut kayıt eklenince bu form **yeniden doldurulmalı**

## 7. Gizlilik politikası
- [ ] Barındırılmış URL — taslak `../legal/gizlilik-politikasi.md`

## 8. Fiyatlandırma ve dağıtım
- [ ] Ücretsiz / ücretli — `[DOLDURULACAK]`
- [ ] Uygulama içi satın alma var mı? **Kodda hiçbir IAP entegrasyonu yok**
- [ ] Dağıtım ülkeleri
