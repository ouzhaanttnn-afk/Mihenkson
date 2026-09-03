# Görsel envanteri — var olan / eksik olan

Ölçüldü (`python3 -c "from PIL import Image; ..."`), tahmin edilmedi.

## Mevcut (`public/assets/brand/`)

| Dosya | Boyut | Mod | Kullanılabilir yer |
|---|---|---|---|
| `icon-512.png` | 512×512 | RGBA (alfalı) | PWA manifest, **Play Store ikonu için doğrudan uygun** |
| `icon-192.png` | 192×192 | RGBA (alfalı) | PWA manifest |
| `icon-180.png` | 180×180 | RGBA (alfalı) | Apple touch icon (web) |
| `mihenkaynak_logo_primary.png` | — | — | Tanıtım/pazarlama malzemesi kaynağı |
| `mihenkaynak_mark_secondary.png` | — | — | İkon/amblem kaynağı |

## Üretildi (`store/assets/generated/`)

| Varlık | Boyut | Nasıl üretildi |
|---|---|---|
| `icon-1024-appstore.png` | 1024×1024, **RGB, alfasız** — ölçüldü | Kaynak: mevcut `icon-512.png` (alfası zaten 100% opak — ölçüldü, `min=max=255` — ama PNG **modu** hâlâ RGBA'ydı ve Apple'ın yükleyicisi bunu reddediyor). Lanczos ile 2× büyütüldü, alfa kanalı düşürüldü. **Not:** kaynak sanat eserinde "MIHENKAYNAK" yazısı ve "TRADE·COLLECT·PROSPER" alt başlığı ikonun içine gömülü — küçük boyutlarda (mağaza aramasında 60px'e kadar küçülür) bu metin okunmaz hale gelir; bu bir teknik format düzeltmesi, bir yeniden tasarım değil — istersen metinsiz, amblem-only bir versiyon ayrıca üretilebilir. |
| `feature-graphic-1024x500.png` | 1024×500, RGB | Sıfırdan tasarlandı: HTML+Playwright ile render edildi, önce küçük denemelerle (metin taşması vb.) gözle kontrol edildi. Marka paletinden (`--ink-900`, `--brass-400/500`) renkler, köşede mevcut ikon, "MİHENKAYNAK" başlığı + kısa slogan. |
| `screenshots/01-dukkan.png` … `04-atolye.png` | 1290×2796, RGB (iPhone 6.7" fiziksel çözünürlüğü) | Playwright, `viewport 430×932` + `deviceScaleFactor 3` — uygulamanın kendi `max-width:430px` tasarım tavanıyla birebir örtüşüyor, hiç yatay boşluk/kırpma yok. Gerçek oynanıştan: Dükkan (bekleyen müşteri + alınan sarrafiye bildirimleri), Stok (4 kalem envanter), İşletme (finans özeti), Atölye. Konsol hatası yok, doğrulandı. |

**Denendi, vazgeçildi — pazarlık/inceleme ekranı.** Beşinci, daha "satış
yapan" bir görüntü olarak müşteri inceleme/pazarlık ekranını da yakalamayı
denedim (bir denemede gerçekten çok iyi bir kare çıktı: yüzük görseli +
ekspertiz araçları). Ama müşteri türü (alım/satım/servis) her taze oturumda
rastgele geliyor ve tekrarlanabilir biçimde yakalamak beklenenden çok script
denemesi gerektirdi; bir noktada zaman/fayda dengesizleşti ve dört sağlam
karede bıraktım. İstersen ayrı bir turda yeniden denerim.

## Eksik — App Store

| Varlık | Gereken boyut | Not |
|---|---|---|
| iPhone 6.5" ekran görüntüleri | 1284×2778 | Apple bazı durumlarda ister — 6.7" setiyle aynı yöntemle (viewport 428×926, dsf 3) kolayca üretilebilir, istenirse |

## Eksik — Play Store

| Varlık | Gereken boyut | Not |
|---|---|---|
| Adaptive icon — ön plan katmanı | 512×512, şeffaf zemin | Amblemin zeminden ayrık, tek başına kesilmiş hâli gerekiyor — kaynak sanat eserinde böyle bir katman yok, otomatik kesim (renk eşiğiyle arka planı silme) 3B-gölgeli bir logoda pürüzlü sonuç riski taşıdığı için denenmedi (bkz. `store/README.md` "Sıradaki adım") |
| Adaptive icon — arka plan katmanı | 512×512, düz/desenli | Yukarıdakiyle aynı sebep — ön plan yoksa arka plan tek başına anlamsız |
