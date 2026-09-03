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
| Mağaza ekran görüntüleri | ✅ 4+4 adet, iPhone 6.7" (1290×2796) ve 6.5" (1284×2778) — `assets/generated/screenshots/`, `screenshots-6.5in/` |
| Bundle ID / paket adı | 🟡 GEÇİCİ yer tutucu — `com.mihenkaynak.app` (`capacitor.config.ts`) — kullanıcı kararıyla ŞİMDİLİK ertelendi, yayından önce kesinleşmeli, bkz. aşağıda |
| Gizlilik politikası | ✅ Barındırıldı, tasarlandı, herkese açık — bkz. `legal/gizlilik-politikasi.md` |
| Kullanım şartları | ✅ Barındırıldı, tasarlandı, herkese açık — bkz. `legal/kullanim-sartlari.md` |
| Apple Developer hesabı | ❓ Sende — bu oturumun bilgisi yok |
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

Kodda tarandı: **oyun kendisi hiçbir sunucuya veri göndermiyor**, analitik
veya çökme raporlama yok. Kayıt yalnız cihazın yerel depolamasında duruyor.

**Tek istisna — Google AdMob (ödüllü reklam), YENİ eklendi:** oyuncu "4x
hızı reklamla aç" veya "Dükkânı Canlandır" düğmesine dokununca `src/ui/ads.ts`
üzerinden bir video reklam gösteriliyor (bkz. `DEVIR_VE_IYILESTIRME_PAKETI.md`
"Ödüllü reklam altyapısı" bölümü). Bu, Google'a reklam kimliği/cihaz bilgisi
giden tek yol — `legal/gizlilik-politikasi.md`'nin "Reklamlar" bölümü bunu
tam anlatıyor, artık "reklam yok" demiyor. **Bulut tabanlı hesap/kayıt
sistemi eklendiğinde bu doküman AYRICA güncellenmeli** — o an gerçek bir
hesap kimliği (e-posta) de işlenmeye başlayacak.

**Mağaza konsollarında AYRICA doldurulması gerekenler** (bu .md dosyaları
kodu anlatır, ama Apple/Google'ın kendi formları ayrı doldurulur):
- **Google Play Console → Data safety:** "Reklam kimliği" topluyor, amaç
  "Reklam veya pazarlama", "Google AdMob" ile paylaşılıyor olarak işaretle.
- **App Store Connect → App Privacy (Nutrition Label):** "Identifiers →
  Device ID", kullanım amacı "Third-Party Advertising" olarak işaretle;
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
2. **Paket adını (bundle ID) kesinleştir.** Şu an `capacitor.config.ts`'de
   `com.mihenkaynak.app` yazıyor — **geçici bir yer tutucu**, kullanıcı kararıyla
   şimdilik böyle bırakıldı ("gerçek şirket/geliştirici adını sonra netleştiririz").
   Yayından ÖNCE değiştirmek bedava; yayından SONRA pratikte imkânsız — o yüzden ilk
   gerçek derlemeden önce kesinleştirilmesi şart, ama scaffolding'i bloke etmedi.
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

## Gizlilik politikası ve kullanım şartları — barındırıldı

Her iki mağaza da gizlilik politikası için gerçek, herkese erişilebilir bir URL
istiyor — daha önce bu boştu. `legal/*.md` içeriği tasarlanmış birer sayfa olarak
yayınlandı (Artifact — brass/parçamento/ink paleti, `--ink-900`/`--brass-500`
marka renkleriyle, oyunun kendi görsel diliyle):

- Gizlilik Politikası: https://claude.ai/code/artifact/820c2ec1-26f3-4271-847b-a8ff36829f51
- Kullanım Şartları: https://claude.ai/code/artifact/adf82548-792c-47f9-af22-814424f9dc10

**Her ikisi de herkese açık.** Kullanıcı paylaşım menüsünden bu adımı tamamladı,
`action: read` ile doğrulandı ("shared with anyone with the link") — Apple/Google
incelemecisi linke erişebilir. `legal/*.md` dosyaları hâlâ tek doğruluk kaynağı —
içerik `[DOLDURULACAK]` alanları (tarih, şirket adı, e-posta) doldurulup
güncellenince, aynı dosya yolu tekrar yayınlanarak (`url` parametresiyle) aynı
linkte güncellenebilir; yeni bir link açmaya gerek yok.

## Apple/Google hesap bilgileri

Bu doküman bilerek `[DOLDURULACAK]` bıraktığım yerler taşıyor — şirket/geliştirici adı,
destek e-postası, destek URL'si gibi. Ben bunları uydurmadım.
