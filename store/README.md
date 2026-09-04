# MİHENKAYNAK — Mağaza Kayıt Klasörü

Bu klasör App Store ve Play Store'a **çıkış için gereken kayıt/kurulum
malzemelerini** tutar. Buradaki hiçbir dosya otomatik olarak bir mağazaya
göndermez — Apple Developer / Google Play Console hesabına giriş, ödeme ve
onay adımları yalnız senin kendi hesabınla, kendi tarayıcından yapılabilir.
Bu klasörün işi o adımlara gelene kadarki her şeyi hazır bulundurmak.

> **Neden burada, PC'de değil:** Bu oturum yalnız bu GitHub deposuna
> (`ouzhaanttnn-afk/mihenkson`) erişebiliyor; kullanıcının kendi bilgisayarına
> dosya yazamıyor. Buraya yazılan her şey `git push` ile depoya gidiyor —
> bilgisayarında `git pull` çektiğinde hepsi orada olacak.

## Durum özeti (3 Eylül 2026 itibarıyla)

| Parça | Durum |
|---|---|
| Web uygulaması (kod) | ✅ Hazır — bkz. `DEVIR_VE_IYILESTIRME_PAKETI.md` |
| iOS/Android native proje iskelesi (Capacitor) | ✅ Kuruldu — depo kökünde `ios/`, `android/`; **derleme/imzalama senin makinende, aşağıda** |
| 1024×1024 App Store ikonu (alfasız) | ✅ Üretildi — `assets/generated/icon-1024-appstore.png` |
| Android adaptive ikon (ön/arka plan katmanı) | ✅ Üretildi — `@capacitor/assets` ile, düz ikonu güvenli-alan mantığıyla katmanladı (gerçek bir alfa kesimi değil — bkz. `assets/eksikler.md`) |
| iOS/Android uygulama ikonları (tüm yoğunluklar) + splash ekranı | ✅ Üretildi — `assets/icon.png`, `assets/splash.png` kaynağından, `ios/` ve `android/` içine yerleştirildi |
| Play Store öne çıkan görsel (1024×500) | ✅ Üretildi — `assets/generated/feature-graphic-1024x500.png` |
| Mağaza ekran görüntüleri | ✅ 4+4 adet, güncel iPhone 6.9" kabul ölçüsü (1290×2796) ve 6.5" (1284×2778) — `assets/generated/screenshots/`, `screenshots-6.5in/` |
| Bundle ID / paket adı | ✅ KESİNLEŞTİRİLDİ — kullanıcı kararı: `com.mihenkaynak.app` (`capacitor.config.ts`) |
| Fiyatlandırma | ✅ KARARLAŞTIRILDI — kullanıcı kararı: **Ücretsiz** (IAP yok, buna uygun) |
| Gizlilik politikası | ✅ Uygulamayla birlikte Vercel'de yayınlanıyor — `/privacy.html` |
| Kullanım şartları | ✅ Uygulamayla birlikte Vercel'de yayınlanıyor — `/terms.html` |
| Destek sayfası | ✅ E-posta ve sık sorularla Vercel'de yayınlanıyor — `/support.html` |
| Apple Developer hesabı | ✅ Üyelik ve App Store Connect erişimi doğrulandı |
| Google Play Console hesabı | ❓ Sende — bu oturumun bilgisi yok |
| Mağaza metinleri (ad, açıklama, anahtar kelime) | 🟡 Taslak hazır, gözden geçirilmeli |

## Klasör içeriği

- `ios/checklist.md` — App Store Connect'e girmeden önce/girerken gereken her şey.
- `ios/metadata-taslak.md` — Ad, alt başlık, açıklama, anahtar kelimeler (kopyala-yapıştır taslağı).
- `android/checklist.md` — Play Console için aynı liste.
- `android/metadata-taslak.md` — Play Store mağaza girişi taslağı.
- `assets/eksikler.md` — Hangi görsel hangi boyutta eksik, mevcut kaynaklar nerede.
- `assets/generated/` — Bu oturumda üretilen, doğrudan yüklenebilir görseller (ikon, öne çıkan görsel, ekran görüntüleri). Nasıl üretildikleri `assets/eksikler.md`'de kayıtlı.
- `legal/gizlilik-politikasi.md` — Taslak; kodun bugünkü hâlini dürüstçe anlatıyor (bkz. aşağıda).
- `legal/kullanim-sartlari.md` — Taslak.

**Depo köküne de eklenenler** (bu dosyanın konumu `store/` olduğu için ayrıca not
düşülüyor): `capacitor.config.ts`, `ios/`, `android/` (native proje iskeleleri) ve
`assets/` (`icon.png`, `icon-background.png`, `splash.png` — `@capacitor/assets`'in
kaynak dosyaları, `npm run cap:assets` ile yeniden üretilebilir).

## Gizlilik politikası neden "dürüstçe" diyor

Kodda tarandı: **geliştiriciye ait ayrı bir analitik veya çökme raporlama
altyapısı yok**. Kayıt yalnız cihazın yerel depolamasında duruyor.

**Tek istisna — Google AdMob reklamları:** oyuncu reklamla açılan bir avantajı
seçtiğinde ödüllü reklam, hafta açılışında ise geçiş reklamı gösterilebilir
(`src/ui/ads.ts`). Google Mobile Ads SDK; cihaz/reklam kimliği, IP'den yaklaşık
konum, reklam ve uygulama etkileşimi, performans ile teşhis verilerini
işleyebilir — `legal/gizlilik-politikasi.md` bunu açıklar. **Bulut tabanlı hesap/kayıt
sistemi eklendiğinde bu doküman AYRICA güncellenmeli** — o an gerçek bir
hesap kimliği (e-posta) de işlenmeye başlayacak.

**Mağaza konsollarında AYRICA doldurulması gerekenler** (bu .md dosyaları
kodu anlatır, ama Apple/Google'ın kendi formları ayrı doldurulur):
- **Google Play Console → Data safety:** Google Mobile Ads SDK'nın güncel
  veri açıklamasındaki cihaz kimliği, yaklaşık konum, reklam/uygulama
  etkileşimi, performans ve teşhis kategorilerini kullanılan SDK sürümüne
  göre beyan et.
- **App Store Connect → App Privacy (Nutrition Label):** Google'ın güncel
  iOS AdMob veri açıklamasındaki Device ID, Coarse Location, Advertising
  Data, Product Interaction, Performance Data ve Crash/Diagnostic Data
  kategorilerini amaçlarıyla birlikte doğrula; Third-Party Advertising'i
  işaretle;
  App Tracking Transparency kullanıldığı için `NSUserTrackingUsageDescription`
  zaten `Info.plist`'te (bkz. `ios/App/App/Info.plist`).
- İkisi de kodun DEĞİL, geliştirici hesabının içinde doldurulan formlar —
  ben dolduramam, hesabı açan kişi doldurmalı.

## Native paketleme — ne yapıldı, ne senin elinde

**Kuruldu:** Capacitor (`@capacitor/core`, `@capacitor/ios`, `@capacitor/android`,
`@capacitor/cli`, `@capacitor/assets`). `capacitor.config.ts` depo kökünde. `ios/` ve
`android/` klasörleri gerçek, açılabilir native projeler — boş iskelet değil, uygulama
ikonları ve splash ekranları da içine yerleştirilmiş durumda (`npm run cap:assets` ile
`assets/icon.png` + `assets/splash.png`'den üretildi).

**Bilerek YAPILMADI — gerçek derleme.** Bu ortamda Xcode ve Android Studio yok; bir
derleme/imza adımını kör bir şekilde "tamamladım" demek, hiç doğrulanmamış bir şeyi
hazır göstermek olurdu. Sıradaki adım **senin makinende**:

1. `git pull` ile depoyu çek, `npm install` çalıştır.
2. **Paket adı (bundle ID) kesinleşti** — `com.mihenkaynak.app`
   (`capacitor.config.ts`). Native tarafta (`android/app/build.gradle`,
   `PRODUCT_BUNDLE_IDENTIFIER`) zaten aynı değerdi, ayrıca değiştirilecek bir
   şey yok.
3. `npm run cap:sync` (derler + `ios/`/`android/`'i günceller).
4. iOS: `npm run cap:open:ios` → Xcode açılır → imzalama takımını (Apple Developer
   hesabın) seç → cihazında veya TestFlight'ta dene.
5. Android: `npm run cap:open:android` → Android Studio açılır → keystore üret
   (**güvenli bir yere yedekle** — kaybedilirse uygulama bir daha güncellenemez) →
   internal testing kanalına yükle.

**Android adaptive ikon — çözüldü, ama not düşülmeli.** `@capacitor/assets` düz
1024×1024 ikonu (`assets/icon.png`) doğrudan "ön plan katmanı" olarak kullandı ve
arka planı `assets/icon-background.png` (marka `--ink-900` rengi) ile doldurdu —
bu, amblemi zeminden gerçek bir alfa kesimiyle AYIRMIYOR (öyle bir kaynak hâlâ yok),
ama riskli bir "arka planı otomatik sil" denemesi de değil: yalnız var olan kareyi
güvenli-alan içinde konumlandırıp maskeye bırakıyor. Sonuç (`android/app/src/main/res/
mipmap-*/ic_launcher*.png`) gözle kontrol edildi, temiz görünüyor. Gerçek katmanlı bir
kaynak (amblemin şeffaf PNG'si) sağlanırsa daha keskin bir adaptive ikon üretilebilir.

## Gizlilik politikası, şartlar ve destek — barındırıldı

Her iki mağaza da gizlilik ve destek için gerçek, herkese erişilebilir HTTPS
sayfaları ister. Sayfalar `public/` altında uygulamanın parçasıdır; her Vercel
dağıtımında kodla birlikte güncellenir:

- Gizlilik Politikası: https://alpersonmihenk-chi.vercel.app/privacy.html
- Kullanım Şartları: https://alpersonmihenk-chi.vercel.app/terms.html
- Destek: https://alpersonmihenk-chi.vercel.app/support.html

`legal/*.md` metinsel kaynak kopyalarıdır; `public/*.html` mağaza incelemecisinin
ve oyuncunun gördüğü sürümdür. Dağıtımdan sonra üç URL anonim pencerede kontrol
edilmelidir.

## Apple/Google hesap bilgileri

Mağaza metinleri ve yasal belgeler yayın değerleriyle dolduruldu. App Store
Connect içindeki yaş derecelendirmesi, App Privacy ve bölge seçimleri ise hesap
içinde doğrulanıp gönderilmelidir.
