# Android — Google Play Console kontrol listesi

Google Play Console hesabı (tek seferlik kayıt ücreti) gerekir.

## 1. Hesap ve kimlik
- [ ] Play Console hesabı açık, geliştirici profili tamamlandı
- [ ] Yeni uygulama kaydı oluşturuldu
- [ ] Paket adı (application ID) belirlendi — örnek:
      `com.[şirket].mihenkaynak` — `[DOLDURULACAK]`, bu depoda henüz yok

## 2. Native derleme
- [ ] Capacitor (veya eşdeğeri) kuruldu — bu depoda **henüz yok**
- [ ] `android/` Gradle projesi oluşturuldu
- [ ] İmzalama anahtarı (keystore) üretildi ve **güvenli bir yere yedeklendi**
      (kaybedilirse uygulama bir daha güncellenemez)
- [ ] App Bundle (.aab) internal testing kanalına yüklendi ve kendi
      cihazında denendi

## 3. Görseller (bkz. `../assets/eksikler.md`)
- [ ] Uygulama ikonu 512×512 (32-bit PNG, alfa **olabilir**) — mevcut
      `public/assets/brand/icon-512.png` bu boyutta, doğrudan kullanılabilir
- [ ] Adaptive icon: ön plan + arka plan katmanı ayrı — **şu an yok**,
      mevcut tek katmanlı ikondan türetilmeli
- [ ] Öne çıkan görsel (feature graphic) 1024×500 — **yok**
- [ ] Telefon ekran görüntüleri — en az 2, en çok 8 (16:9 veya 9:16)
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
