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
| iOS/Android native derleme (Capacitor vb.) | ❌ Hiç kurulmadı |
| 1024×1024 App Store ikonu (alfasız) | ✅ Üretildi — `assets/generated/icon-1024-appstore.png` |
| Android adaptive ikon (ön/arka plan katmanı) | ❌ Yok — kaynak sanat eserinde şeffaf/katmanlı bir versiyon yok, otomatik kesim riskli (bkz. `assets/eksikler.md`) |
| Play Store öne çıkan görsel (1024×500) | ✅ Üretildi — `assets/generated/feature-graphic-1024x500.png` |
| Mağaza ekran görüntüleri | ✅ 4 adet, gerçek cihaz çözünürlüğünde (1290×2796) — `assets/generated/screenshots/` |
| Gizlilik politikası | 🟡 Taslak hazır (`legal/gizlilik-politikasi.md`) — barındırılacak bir URL gerekiyor |
| Kullanım şartları | 🟡 Taslak hazır (`legal/kullanim-sartlari.md`) |
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

## Gizlilik politikası neden "dürüstçe" diyor

Kodda tarandı: **oyun hiçbir sunucuya veri göndermiyor.** Tek ağ isteği paket
içindeki ses dosyalarını yerelden okumak (`src/ui/audio.ts`); analitik,
reklam SDK'sı, çökme raporlama veya üçüncü taraf izleyici yok. Kayıt yalnız
cihazın `localStorage`'ında duruyor. Taslak bunu yazıyor. **Bulut tabanlı
hesap/kayıt sistemi eklendiğinde bu doküman güncellenmeli** — o an gerçek
bir veri toplama başlayacak (en azından e-posta/hesap kimliği), aksi hâlde
politika yalan söylemiş olur.

## Sıradaki adım — kararını bekliyor

1. **Native paketleme.** Bu bir web uygulaması (Vite + React); mağazaya
   çıkmak için Capacitor (önerilir, `vite.config.ts` zaten göreli yollarla
   buna hazır) ya da benzer bir sarmalayıcı kurulmalı. **Bilerek yapmadım:**
   bu ortamda Xcode/Android Studio yok, yani bir iskele kursam bile onu
   gerçekten derleyip test edemem — kör bir yapılandırma bırakmak, "hazır"
   görünüp aslında doğrulanmamış bir şey teslim etmek olurdu. İstersen
   yine de iskeleyi kurayım (npm paketleri + `ios/`/`android/` klasörleri,
   additive ve geri alınabilir) ama son derleme/imzalama adımı Xcode/Android
   Studio olan bir makinede senin elinle doğrulanmalı.
2. **Android adaptive ikon.** Kaynak sanat eserinde (`mihenkaynak_mark_secondary.png`)
   amblem, arka plandan (krem kart + koyu mürekkep zemin) hiçbir zaman
   şeffaf olarak ayrılmamış — otomatik bir "arka planı sil" denemesi
   yumuşak gölgeli, 3B-görünümlü bir logoda pürüzlü/hatalı bir kesim
   üretme riski taşıyordu, o yüzden denemedim. Gerçek bir katmanlı kaynak
   (ör. amblemin şeffaf PNG'si) sağlanırsa buradan iki katman (ön plan +
   arka plan, 512×512) üretmek hızlı bir iş.
3. **Apple/Google hesap bilgileri.** Bu doküman bilerek `[DOLDURULACAK]`
   bıraktığım yerler taşıyor — şirket/geliştirici adı, destek e-postası,
   destek URL'si gibi. Ben bunları uydurmadım.
