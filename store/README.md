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
| 1024×1024 App Store ikonu (alfasız) | ❌ Yok — yalnız 512×512 (alfalı) var |
| Android adaptive ikon (ön/arka plan katmanı) | ❌ Yok |
| Play Store öne çıkan görsel (1024×500) | ❌ Yok |
| Mağaza ekran görüntüleri | ❌ Yok |
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
   buna hazır) ya da benzer bir sarmalayıcı kurulmalı. İstersen bunu da
   şimdi kurayım.
2. **1024×1024 ikon.** Mevcut `public/assets/brand/icon-512.png` alfa
   kanalı taşıyor; App Store alfasız ister. Mevcut sanat eserinden
   (`mihenkaynak_mark_secondary.png`) türetilebilir ama tasarım kararı
   (arka plan rengi ne olacak) sana ait.
3. **Apple/Google hesap bilgileri.** Bu doküman bilerek `[DOLDURULACAK]`
   bıraktığım yerler taşıyor — şirket/geliştirici adı, destek e-postası,
   destek URL'si gibi. Ben bunları uydurmadım.
