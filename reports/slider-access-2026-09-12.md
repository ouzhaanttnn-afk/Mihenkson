# Slider erişimi — 12 Eylül 2026

- Teklif tutarına gizlenmiş açma kontrolü artık görünür `Fiyatı kendin ayarla` etiketli, mor çerçeveli bir düğme.
- Slider açılınca aynı düğme `Hazır tekliflere dön` gösterir. Tutar, kâr/tahmin ve sonraki nakit görünür kalır; yeni satır eklenmedi.
- Normal ekranda en az 56 px, kısa portre ekranda en az 44 px dokunma yüksekliği; klavye odak halkası, açık/kapalı bilgisi ve geçerli aria-controls bağlantısı.
- Hazır teklif seçimi, slider fiyat aralığı, müşteri kabul motoru, kayıt şeması ve reklamlar bu arayüz commit'inde değişmedi.
- Paket önceki `12753b0` altın ayarını da içerir: sakin/normal rejimlerde yalnız gün içi ham altın hareketi ×1.2. Günlük açılış formülü ve şoklar aynı.

## Doğrulama

- 68 test dosyası / 1.086 test geçti.
- 58 Chrome/WebKit senaryosu: 320×568, 390×844, 430×932, iki ticaret yönü, slider aç/kapat ve artırma, karşı teklif kabulü, işlem sonuçları, yetersiz nakit, İngilizce, büyük metin, azaltılmış hareket, simüle iOS güvenli alanı.
- Görünür düğme metni, en az 44×44 px alan, slider açılması ve karşı teklif/ana eylemin ekrana sığması doğrulandı.
- Üretim derlemesi, çeviri kontrolü (987/987) ve 77 yayın ön kontrolü başarılı. Önceden mevcut büyük JS paketi uyarısı sürüyor.
- Fiziksel iPhone testi yapılmadı; kullanıcı TestFlight'ta doğrulayacak.

## Geri dönüş

Önceki TestFlight Build 13'ün kaynak commit'i `9da6efbaea862f6467647628a1b03255ad9aedc1`, ayrıca `beta/build-13-before-final-polish` etiketiyle korunur. Eski TestFlight derlemeleri kaldırılmaz. Bu kod geri dönüş noktasıdır, oyuncu ilerlemesini geçmiş tarihe taşımaz.

## Yetenek / Omni

React kontrolü görünür etiket, fonksiyonel state güncellemesi ve erişilebilirlik bağlantılarını yönlendirdi. Agent-browser CLI mevcut olmadığından tarayıcı kontrolü paketli Playwright ile yapıldı. Omni cli-chat: 1 deneme, 0 başarılı yanıt; sağlayıcı HTTP 502 bağlantı/başlık hatası. Başarılı Omni analizi alınmadı.
