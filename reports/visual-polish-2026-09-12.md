# Mihenk beta — görsel cila ve yayın kontrolü

Tarih: 12 Eylül 2026

## Karar ve kapsam

Mevcut görsel kimlik korunarak beta görsel cilası için değerlendirmem **yaklaşık %95**. Bu oran öznel bir tasarım değerlendirmesidir; bütün cihazlarda hatasızlık, erişilebilirlik sertifikası veya Apple onayı anlamına gelmez. Aşağıdaki kontroller TestFlight'a gönderme kararının somut dayanağıdır. Gerçek iPhone üzerindeki son kontrol kullanıcıya aittir.

Bu paket remaster değildir. Ekonomi, müşteri kabul eşikleri, gün hızı, reklam ödülleri ve kayıt şeması değiştirilmedi. Önceki kolaylaştırma, kâr sınırı göstergesi ve el sıkışmalı ticaret sonucu korunur.

## Tamamlanan düzeltmeler

- Profil fotoğrafı ve çerçeve, farklı avatar boyutlarında aynı oranda hizalanır.
- Araç şeridinde ikon, tutar ve açıklama ayrı yerleşim hücrelerine alınır; üst üste binme giderilir.
- Market kilitleri ürün renklerini soldurmaz. Kilit durumu metin, kesikli kenarlık ve devre dışı satın alma kontrolüyle belirtilir. Kullanılan ürün ayrıca vurgulanır.
- Market fiyat ve eylem yerleşimi, başlık boşlukları, açıklama boyutları ve boş durum görselleri tutarlı hale gelir.
- Sunucu onaylı sınırlı rozet için sonuç vermeyen deneme düğmesi gösterilmez.
- Kısa ekranlarda eğitim metni açılır ayrıntıya dönüşür. Teklif tutarı ve tahmini kâr görünür kalır; birim, nakit ve ilişki ayrıntıları dokunarak açılır. Bilgi silinmez.
- Uzun işlem sonucunda başarı başlığının yukarıdan kesilmesi giderilir; uzun içerik kendi alanında kayar.
- iOS ikincil ekran başlıkları ve profil/ayar pencereleri güvenli alanları dikkate alır. Arka plan ekranın tamamını kaplamaya devam eder.
- Bildirimlere durum işareti, ekran okuyucu duyurusu ve kontrollü geçiş; klavye odağına görünür çerçeve eklenir.

## Doğrulama

| Kontrol | Sonuç |
| --- | --- |
| Otomatik testler | 65 dosya, 1.070 test geçti |
| TypeScript | Geçti |
| Üretim derlemesi | Geçti |
| Yayın kontrolü | 77 kontrol geçti |
| Çeviri anahtarları | 968 / 968; eksik yok |
| Çeviri denetimi | Mevcut 73 istisna; yeni istisna yok |
| Chrome temel ekranlar | 320×568, 390×844, 430×932; 5 sekme, 15 senaryo |
| Chrome detaylı akışlar | 19 senaryo; inceleme, pazarlık, işlem sonucu, market, profil, ayarlar |
| WebKit detaylı akışlar | Aynı 19 senaryo geçti |
| Büyük metin / azaltılmış hareket | 393×852, metin tokenları yaklaşık %25 artırılarak atölye ve market kontrol edildi |
| Kozmetik gerçek etkileşim testi | Rozet, çerçeve ve tema satın alma/kullanma; kayıt ve yeniden açılışta görünürlük geçti |
| Küçük ekran eğitimi | Ayrıntı açma/kapatma geçti |
| Simüle iOS güvenli alanı | 393×852; üst 59 px, alt 34 px; ikincil başlık kontrolü geçti |
| Üretim paketi Chrome + WebKit | Yeni profil oluşturma, 5 sekme, yeniden yüklemede kayıt; çalışma zamanı hatası yok |

Test edilen senaryolarda kök sayfa yatay taşması, kırık yüklenmiş görsel, araç ikon–tutar çakışması veya JavaScript çalışma zamanı hatası gözlenmedi. Üç ekran boyutunda işlem başarı bildirimi görünür. Testler ayrı yerel tarayıcı profillerinde yapıldı; kullanıcının kayıtları kullanılmadı/değiştirilmedi.

## Kalan sınırlar

- Windows WebKit testi fiziksel iPhone / WKWebView testi değildir. TestFlight'ta Dynamic Island, ana ekran göstergesi ve gerçek dokunma davranışının son kontrolü yapılmalı.
- 320×568 gibi kısa ekranlarda uzun analiz/sonuç metninde sınırlı iç kaydırma gerekir; tüm bilgiyi okunmaz derecede küçültmekten kaçınıldı.
- Mevcut Vite büyük ana paket uyarısı devam ediyor. Bu paket bağımlılık eklemez; kapsamlı kod bölme çalışması ayrı performans işi olmalıdır.
- Reklam ağının gerçek cihaz reklam teslimi ve uygulama içi satın alma entegrasyonu bu görsel kabul testinin kapsamında değildir. “Yakında” alanı korunur.

## Kanıtlar

- [Market çerçeveleri](visual-polish-2026-09-12/market-frames.png)
- [320 px pazarlık](visual-polish-2026-09-12/compact-negotiation.png)
- [İşlem sonucu](visual-polish-2026-09-12/trade-result.png) — bilerek aşırı yüksek teklif verilmiş test verisidir; ekonomi dengesi örneği değildir.
- Ayrıntılı ölçümler aynı klasörde JSON olarak saklanır.

## Omni kullanımı

Bu turda başarılı Omni çıkarım çağrısı: **0**. Yerel OmniRoute sunucusu çalışmıyordu; başlatma denemesinde paketlenmiş `app/server.js` eksikti. Yanıt alınmadığı için Omni katkısı veya token tasarrufu iddia edilmiyor. Kontroller yerel testler ve doğrudan kod/görsel incelemeyle tamamlandı.
