# Sade ticaret — geri alınabilir beta

## Kapsam

TradeUp oynanış denetimi sonrasında kullanıcı tarafından onaylanan, UI seviyesinde sade ticaret denemesi. Remaster veya yeni ekonomi değildir.

- Anlaşma odaklı / Dengeli / Kâr odaklı hazır fiyatlar. Dengeli fiyat mevcut açılış önerisine dayanır; diğer ikisi oyuncunun bilinen maliyet/değer sınırından türetilir. Gizli müşteri limiti veya rastgelelik kullanılmaz. Kabul garantisi verilmez.
- Bir hazır fiyat seçmek işlem yapmaz, pazarlık hakkı tüketmez. Son gönderme eylemi mevcut oyun aksiyonunu çağırır.
- Teklif, satış kârı veya tahmini alış kazancı ve işlem sonrası nakit aynı satırda gösterilir. Tutara dokununca eski slider ve +/− ayarı açılır. Analiz/piyasa ayrıntıları ayrı açılabilir bölümde korunur.
- Müşteri karşı teklifi doğrudan kabul edilebilir. Buton mevcut `acceptCounter` aksiyonunu kullanır; alışta nakit yetersizse kapalıdır.
- Satış sonucu satış tutarı, toplam maliyet ve net kâr/zararı ayrı gösterir. Alış sonucu stok girişini ve kazancın henüz gerçekleşmediğini belirtir.
- Zararlı satış olumlu “İyi karar” olarak sunulmaz. El sıkışma korunur, başlık “Ticaret tamamlandı” olur.
- Satış eğitimindeki eski alış tavanı metni düzeltilir.

## Doğrulananlar

- 67 dosyada **1.080 test** geçti; 10 yeni preset/görünüm testi dahil.
- TypeScript ve üretim derlemesi geçti. 77 yayın kontrolü geçti.
- Türkçe/İngilizce 988 anahtarın tamamı çevrili; çeviri denetiminin mevcut 73 istisnasına yenisi eklenmedi.
- Chrome ve Windows WebKit'te **58 senaryo**: 320×568, 390×844, 430×932; alış/satış hazır fiyatları, manuel ayar, analiz açma, karşı teklif kabulü, işlem makbuzu, nakit yetersizliği, zararlı satış, simüle iOS güvenli alanı, İngilizce ve büyütülmüş metin/azaltılmış hareket.
- Hazır fiyat seçimi sonrası para/pazarlık geçmişi değişmiyor. Kabul sonrası nakit doğru yönde ve tutarda değişiyor. Ana CTA ekran içinde; karşı teklif kabulü küçük ekranda çalışma alanının içinde görünür.
- Testler ayrı yerel tarayıcı oturumlarında ve test kayıtlarıyla yapıldı. Karşı teklif kabul testlerinde deterministik karşı teklif fikstürü kullanıldı; bu bir müşteri kabul oranı veya uzun dönem ekonomi testi değildir.
- Üretim paketinde Chrome/WebKit ilk profil, beş sekme ve yeniden açılış kayıt kontrolü uygulandı.
- `src/domain`, `src/state`, `ios`, `android` ve reklam kodu önceki pakete göre değişmedi. Kayıt sürümü **3** olarak kaldı.

## Geri dönüş güvencesi

Önceki doğrulanmış sürüm: **TestFlight 1.0 (12)**.

GitHub'da korunmuş etiket: **`beta/build-12-before-simple-trade`**

Commit: `e5fd6d23261628e6e79c9ecf9eb913338439a575`

Build 12 iş akışı: https://github.com/ouzhaanttnn-afk/Mihenkson/actions/runs/34690719913

Bu değişiklik eski Apple derlemesini silmez veya süresini sonlandırmaz. Apple'ın TestFlight yardımına göre erişilebilir önceki sürümler uygulamanın Previous Builds bölümünden seçilebilir: https://testflight.apple.com/ . Grup erişimi veya süre nedeniyle eski paket listelenmezse, korunan commit yeni ve daha yüksek build numarasıyla yeniden derlenebilir.

Kod düzeyinde geri dönüş, bu beta değişiklik commit'ini `git revert` ile tersine çevirerek yapılmalıdır; `reset --hard` veya zorunlu push gerekmez. Sonradan başka değişiklikler eklenmişse önce diff incelenmeli, onların üzerine yazılmamalıdır. Git etiketi kaynak kodunu korur; oyuncunun o tarihteki oyun kaydını geri sarmaz. Uygulamayı silmek kayıt kaybına yol açabilir; geri dönüş için kaldırıp yeniden kurma önerilmez.

## Sınırlar

Fiziksel iPhone dokunma/çentik kontrolü TestFlight'ta kullanıcı tarafından yapılacak. 320 px kısa ekranda uzun analiz için iç kaydırma korunur. Büyük Vite paket uyarısı önceden vardı ve devam ediyor. Gerçek reklam teslimi bu paketin test kapsamına dahil değildir.

Omni: **1 deneme, 0 başarılı yanıt**. Yerel servise ulaşıldı, sağlayıcı HTTP 429 kota hatası döndürdü. Başarılı çıktı veya token tasarrufu iddia edilmiyor.
