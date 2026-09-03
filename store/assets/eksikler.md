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

## Eksik — App Store

| Varlık | Gereken boyut | Not |
|---|---|---|
| Uygulama ikonu | **1024×1024, alfasız** | Mevcut 512'lik **alfa taşıyor**, doğrudan kullanılamaz — düz bir arka plan rengiyle (`--ink-900` `#0b0f14` markanın kendi zemin rengi, veya `--brass-500` `#c48d2b`) yeniden dışa aktarılmalı |
| iPhone 6.7" ekran görüntüleri | 1290×2796 | Oyun zaten 390×844 referans tuvalde tasarlı; gerçek cihazda veya ölçekli simülatörde alınmalı |
| iPhone 6.5" ekran görüntüleri | 1284×2778 | Apple bazı durumlarda ister |

## Eksik — Play Store

| Varlık | Gereken boyut | Not |
|---|---|---|
| Adaptive icon — ön plan katmanı | 512×512, şeffaf zemin | Amblemin zeminden ayrık, tek başına kesilmiş hâli gerekiyor |
| Adaptive icon — arka plan katmanı | 512×512, düz/desenli | Marka zemin rengiyle düz bir kare yeterli |
| Öne çıkan görsel (feature graphic) | 1024×500 | Play mağaza sayfasının üst banner'ı — hiç yok, sıfırdan tasarlanmalı |
| Telefon ekran görüntüleri | min 2, max 8 | 9:16 veya 16:9 |

## Ekran görüntüsü alma notu

Oyun 390×844 (iPhone standardı) referans tuvalde tasarlandı ve bu oturumda
Playwright ile bu boyutta defalarca doğrulandı (bkz.
`DEVIR_VE_IYILESTIRME_PAKETI.md`). Mağaza ekran görüntüleri için gerçek
cihaz çözünürlüğüne (1290×2796 vb.) ölçeklenmesi gerekecek — bu, tasarımı
bozmadan yapılabilir bir dış-kaynak işi (Xcode simülatörü veya gerçek cihaz
üzerinden alınabilir), kod tarafında bir değişiklik gerektirmiyor.
