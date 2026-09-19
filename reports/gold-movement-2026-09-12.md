# Altın gün içi hareket ayarı — 12 Eylül 2026

## Kapsam

- Sakin ve normal rejimlerde altının 15 oyun dakikalık ham fiyat adımına 1.2 çarpanı eklendi. Yukarı ve aşağı yönde aynı katsayı kullanılır.
- Yumuşak fiyat tavanı nedeniyle ekranda görülen her yüzde veya gün sonu değişim tam %20 büyümek zorunda değildir.
- Volatil/şok rejimleri, olay üretimi, günlük açılış formülü, nominal eğilim, makro dengeleme ve mevcut fiyat sınırları değiştirilmedi.
- `MarketState.volatility` aynı kaldı. Makas, müşteri kabul kuralları, reklamlar, kayıt şeması ve arayüz değiştirilmedi.
- Gümüş ve döviz fiyat adımları değiştirilmedi. Gram/çeyrek gibi altın ürünleri mevcut şekilde altın spotundan türemeye devam eder.
- Aktif müşteri işlemi sırasında saat ve piyasa zaten duruyordu; bu koruma ayrıca testte tam piyasa eşitliğiyle doğrulandı.
- Eski kayıtlar yeniden üretilmez. Bir sonraki uygun gün içi adım yeni katsayıyı kullanır.

## Sınırlar ve değerlendirme

İlk denemede günlük açılışı da büyütmek 365 günlük örneklemin mevcut üst sınırını aştı. Bu değişiklik geri alındı; güvenlik testi eşikleri veya eski ekonomi snapshotları gevşetilmedi.

Gün içi kapanış değiştiğinden sonraki günün başlangıç fiyatı da doğal olarak etkilenebilir. Bu ayar kâr garantisi değildir; stok değerinin iki yönde hareketini biraz artırır. Yeni şok olayı veya yeni animasyon eklenmedi.

## Doğrulama

- Tam test koşusu: 68 dosya / 1.086 test başarılı.
- Yeni testler: gerçek 1.2 sabiti, aynı seed ile eski/yeni gün içi hareket karşılaştırması, eski kayıt değişmezliği, gümüş/döviz izolasyonu, günlük açılış/olay eşitliği.
- 100 seed ile tam gün fiyat sınırı ve hızlı/ardışık zaman ilerlemesi eşitliği.
- 32 seed × 120 gün: gün içi kapanış dahil eski/yeni zincir karşılaştırması. Merkez ve kuyruk dağılımları tanımlı koruma bantlarında kaldı; gümüş/döviz sonuçları birebir aynı.
- 30/120/365 günlük mevcut ekonomi snapshotları değiştirilmeden geçti.
- Üretim derlemesi başarılı; mevcut büyük JavaScript paket uyarısı sürüyor.
- Yayın ön kontrolü: 77/77.
- Fiziksel iPhone testi ve yeni TestFlight yüklemesi bu pakette yapılmadı.

## Dağıtım ve geri dönüş

Bu ayrı, küçük bir GitHub commit'idir; gerekirse yalnız bu commit geri alınabilir. Mevcut TestFlight Build 13 değişmez; yeni TestFlight iş akışı tetiklenmedi.

## Omni

`cli-chat` yeteneğiyle 1 kısa risk kontrolü denendi; 0 başarılı yanıt. Sağlayıcı Felo HTTP 429 kota hatası döndürdü. Omni önerisi kullanılmış gibi raporlanmadı; doğrulama yerel testlerle yapıldı.
