# Küçük mor slider kapsülü

- Kullanıcı geri bildirimi: Build 14'teki açık mor fiyat kartı fazla büyük.
- Kart zemini, dış çerçeve ve gölge kaldırıldı. Yalnız `Fiyatı kendin ayarla` / `Hazır tekliflere dön` etiketi küçük mor kapsül içinde; tutar altında sade.
- Düğmenin dokunma yüksekliği en az 44 px; klavye odak halkası ve erişilebilir isimler korundu. Yalnız CSS değişti; fiyatlama/slider davranışı aynı.
- 20 ilgili birim testi ve 58 Chrome/WebKit tarayıcı senaryosu geçti. 320/390/430 px, manuel aç/kapat, iki ticaret yönü, büyük metin ve İngilizce dahil.
- Tarayıcı testi yeteneğiyle görünür boyut ile dokunma alanı ayrı kontrol edildi; CLI mevcut olmadığından paketli Playwright kullanıldı.
- Önizleme: `slider-pill-2026-09-12/preview.png`.
- Yeni TestFlight yüklemesi yapılmadı; Build 14 korunuyor.
- Omni cli-chat: 1 deneme, 0 başarılı yanıt; sağlayıcı HTTP 429 kota hatası.
