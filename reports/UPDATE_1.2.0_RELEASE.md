# Mihenk 1.2.0 — uygulama ve yayın kaydı

## Uygulanan geri bildirimler

- 38 altın tanımı denetlendi. Tam Altın aktif talep ve tedarike geri alındı;
  20 g külçe kademe 2'de tedarik edilebilir ve toplu talebe bağlandı. Gram ve
  yatırım bileziği boyları ortak miktar havuzlarından karşılanır. Temiz darphane
  primi artık yanlışlıkla ürünün havuz dışı sayılmasına yol açmaz; kusurlu/sahte
  ürünler standart stokla birleştirilmez.
- Yeni gümüş ticareti ve gümüş fiyat kartları kaldırıldı. Eski kayıtların sahip
  olunan gümüş stoğu maliyet/değerin yüksek olanıyla bir kez nakde döner; bu
  ticaret kârı değildir. Altın, geçmiş işlemler, borç ve kabul edilmiş servisler
  korunur. Kayıt şeması 4; geçiş yeniden çalıştırıldığında ikinci ödeme yoktur.
- Kapasite bütün stok girişlerinde gerçek, birleştirilmiş konumlar üzerinden
  kontrol edilir. Eski limit üstü stok silinmez; aynı havuza ekleme kapasiteyi
  artırmıyorsa izin verilir. Engellenen alım kasayı veya faturayı değiştirmez,
  başarılı işlem gibi görünmez.
- Personelin mevcut maaş/seviye şartları korundu. Bekleme desteği, karşılama,
  güvenli satış ve atölye ustası görevleri seçilebilir. Tezgâh görevleri yalnız
  90 aktif gerçek saniyede bir, boş Dükkan ekranında çalışır. Arka plan,
  müşteride/modalda bekleme veya kapalı oyun otomatik satış kazandırmaz.
- Personel satışları gerçek stok, tam talep, normal müşteri kabulü ve en az
  %1 kayıtlı-maliyet marjına bağlıdır. Otomatik borç, mal alımı veya garantili
  satış yoktur. Defter ve satılan miktarın maliyeti normal satışla uzlaşır.
- Uygun atölye işine boş usta atanır; görev/dekor değişimi kabul edilmiş işin
  sonucunu yeniden belirlemez. Yoğunluk, personel ve ekipman risk etkisi görünür.
  İşteki personel görevi değiştirilemez veya kadrodan çıkarılamaz. Henüz kabul
  edilmemiş servis fiyatları kadro, mağaza ve iş yükü değişince yenilenir.
- Mağaza kademesi ana ekranda görünür ve tezgâh çerçevesi gelişir. Oyun içi
  alınmış dükkan/dekorasyon/koleksiyon kategorileri her biri +%4 müşteri
  yoğunluğu katkısı verir; toplam +%12. Tek kategoriyi tekrar alma biriktirmez.
  Premium, deneme veya gerçek para kozmetiği ekonomik güç sağlamaz.
- Kademe 3+, en az 65 itibar ve 65 tedarik güveniyle 250/500/1000 g talepler
  gelebilir; talep hacmi nakit ve mevcut kredi imkânıyla sınırlıdır. Müşteriden
  çıkmadan hızlı tedarik ve vade kullanılabilir. Vade farkı maliyete ve kredi
  limitine dahildir; 1000 g = 1.000.000 mg korunur. MAX gerçek faiz/limit hesabıdır.
- Pazarlıkta yanlış yönlü ret tepkisi, bütçe aşımı ve son teklifin yeniden
  açılması düzeltildi. Tarihî alış maliyeti ile müşterinin güncel bütçe/piyasa
  sınırları ayrıldı; her maliyet üstü teklif kabul edilmez.

## Doğrulama

Tam test koşusu, TypeScript, production build, 81 maddelik release kontrolü ve
yerelleştirme kapıları çalıştırıldı. Yeni denetimler ürün erişilebilirliği,
vade/miktar/defter uzlaşması, kapasite atomikliği, eski kayıt geçişi, 270 müşteri
profiliyle manuel/personel kabul eşitliği, personel yaşam döngüsü ve sunum
bonusunun üst sınırını kapsar. Browser smoke: anlamlı ilk açılış, sıfır hata
overlay/console hatası, gerçek 320 CSS px'de yatay taşma yok, 1→1,5 g kontrolü
ve nakit/stok alımı doğrulandı. Native imza/archive/upload GitHub macOS işiyle
ayrıca doğrulanır; Windows'taki web smoke fiziksel iPhone testi değildir.

Son yerel koşu: 89 dosyada 1.342 Vitest testi ve 5 release hazırlık testi geçti.
TypeScript, production build, 81 release kontrolü ve yerelleştirme kapıları yeşil.
Personel satışında müşteri kimliği yerine ziyaret kimliği kullanılır; tekrar
ziyaret yeni satış yapabilir, aynı ziyaret kayıttan sonra ikinci kez ödenmez.
Tamamlanan personel satışı müşteri ziyaret/ciro hafızasına da yazılır.

## Yayın

Paket sürümü: 1.2.0. iOS bundle: com.mihenkaynak.app. App Store uygulaması:
6808742428. Apple'da 1.2.0 kaydı ve yenilik/inceleme notları hazırlandı.
Canlı 1.1.3 değiştirilmez; inceleme onayından önce 1.2.0 canlı değildir.
Derleme numarası ve Apple gönderim sonucu, işlem tamamlanınca bu kayda eklenir.
