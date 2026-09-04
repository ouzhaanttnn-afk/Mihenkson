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
| `screenshots/01-dukkan.png` … `04-atolye.png` | 1290×2796, RGB (App Store'un güncel 6.9" kabul ölçülerinden biri) | Playwright, `viewport 430×932` + `deviceScaleFactor 3` — uygulamanın kendi `max-width:430px` tasarım tavanıyla birebir örtüşüyor, hiç yatay boşluk/kırpma yok. Gerçek oynanıştan: Dükkan (bekleyen müşteri + alınan sarrafiye bildirimleri), Stok (4 kalem envanter), İşletme (finans özeti), Atölye. Konsol hatası yok, doğrulandı. |
| `/assets/icon.png`, `/assets/icon-background.png`, `/assets/splash.png` (depo kökü) | 1024×1024 / 1024×1024 / 2732×2732 | `@capacitor/assets`'in kaynak dosyaları — `icon.png` = `icon-1024-appstore.png`'nin kopyası, `icon-background.png` = düz `--ink-900` dolgusu, `splash.png` = aynı ink zemin üzerinde ortalanmış amblem (PIL ile birleştirildi). `npx capacitor-assets generate` bunlardan iOS/Android'in TÜM ikon yoğunluklarını ve splash varyantlarını (açık/koyu, portre/yatay) üretti — `ios/App/App/Assets.xcassets/`, `android/app/src/main/res/mipmap-*/` ve `drawable*/` altına. |
| `screenshots-6.5in/01-dukkan.png` … `04-atolye.png` | 1284×2778, RGB (iPhone 6.5" fiziksel çözünürlüğü) | Aynı yöntem, `viewport 428×926` + `deviceScaleFactor 3`. Aynı 4 ekran (Dükkan, Stok, İşletme, Atölye), gerçek oynanıştan. Konsol hatası yok. |

**Denendi, vazgeçildi — pazarlık/inceleme ekranı.** Beşinci, daha "satış
yapan" bir görüntü olarak müşteri inceleme/pazarlık ekranını da yakalamayı
denedim (bir denemede gerçekten çok iyi bir kare çıktı: yüzük görseli +
ekspertiz araçları). Ama müşteri türü (alım/satım/servis) her taze oturumda
rastgele geliyor ve tekrarlanabilir biçimde yakalamak beklenenden çok script
denemesi gerektirdi; bir noktada zaman/fayda dengesizleşti ve dört sağlam
karede bıraktım. İstersen ayrı bir turda yeniden denerim.

## App Store — görsel envanteri tamamlandı

İkon, öne çıkan görsel derdi yok (App Store'un istemediği), 6.9" kabul ölçüsü ve 6.5" ekran
görüntülerinin tümü üretildi. Kalan tek şey mağaza tarafında: `../ios/checklist.md`
1. ve 4-8. bölümlerindeki hesap/metin/yasal adımlar — görsel değil, kullanıcı kararı.

## Play Store — Adaptive icon çözüldü, ama gerçek kesim değil

Önceki turda burada "eksik" olarak listeliydi çünkü kaynak sanat eserinde amblemi
zeminden ayıran gerçek bir alfa katmanı yok, ve otomatik "arka planı sil" (renk
eşiğiyle) 3B-gölgeli bir logoda pürüzlü sonuç riski taşıyordu.

**Ne değişti:** `@capacitor/assets`, riski olan bir kesim DENEMEDİ — bunun yerine
düz `icon.png`'yi doğrudan "ön plan katmanı" yaptı ve `icon-background.png`'yi
(marka `--ink-900`'ü) arka plan yaptı. Android bu ikisini kendi maskesiyle (daire/
squircle/vb.) birleştiriyor; ön plandaki kare kenarları maskeye kırpılıyor, tıpkı
tek-katmanlı bir ikonun launcher'da her zaman yaptığı gibi. Bu, ayrı bir sanat
eseri olmadan **standart ve güvenli** bir düşüş noktası — birçok küçük stüdyo
tam olarak bunu yapıyor. Çıktı (`android/app/src/main/res/mipmap-*/ic_launcher*.png`)
gözle kontrol edildi, temiz.

**Hâlâ eksik olan:** gerçek bir katmanlı kaynak (amblemin kendi başına, şeffaf
zeminli bir PNG'si) sağlanırsa, ön plan yalnız amblemi taşır ve maske ile
kırpıldığında daha keskin/daha "adaptive" bir sonuç verir — ama bu şu an
elimizdeki sanat eserinden türetilemiyor, ayrı bir görsel üretim işi.
