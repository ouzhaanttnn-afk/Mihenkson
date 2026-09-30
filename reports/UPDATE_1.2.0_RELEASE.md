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
Derleme numarası ve doğrulanmış Apple gönderim sonucu aşağıdadır.

### İmzalı iOS derlemesi

- Kaynak commit: `b630caa782a67037e7f9486f41e5295402307a34` (main'e fast-forward edildi).
- Sürüm/build: **1.2.0 (31)**.
- GitHub macOS işi: https://github.com/ouzhaanttnn-afk/Mihenkson/actions/runs/36781632440
- Test, web build, Game Center yetkili imza, archive, IPA export ve Apple upload başarılı.
- 2026-09-30 21:53:58 UTC: `UPLOAD SUCCEEDED with no errors`.
- App Store Connect'te 1.2.0 (31) processing tamamlandı; sürüme seçilip kaydedildi.
- Mevcut Betatest grubuna build 31 bağlı (3 davet).
- 2026-10-01 01:07 TRT: Submit for Review tamamlandı; `1 Item Submitted` ve
  **1.2.0 — Waiting for Review** durumları arayüzde doğrulandı.
- İnceleme gönderimi: https://appstoreconnect.apple.com/apps/6808742428/distribution/reviewsubmissions/details/f89083de-7225-431f-9350-546e96d05ff1
- Onay sonrası manuel yayın ayarı korundu. Yeni sürüm henüz App Store'da canlı değil.

Ek browser smoke: Tam Altın alımı nakit/stok maliyetine yansıdı; vadeli MAX
tedariği 233,6 g ekledi, aynı gram havuzuyla birleşerek kapasiteyi artırmadı.
965.061 ₺ peşin ve 26.039 ₺ vadeli kayıt (486 ₺ fark dahil) ekranda önceden
gösterildi, alım sonrası kasa 0 ve açık fatura 26.039 ₺ / 7. gün doğrulandı.
Yetersiz kullanılabilir limit yeni alımı engeller; kasa negatife düşmez.
Birleşmiş 235,1 g stok toptancıya satıldı; 26.039 ₺ fatura ödendi ve açık vade
`Yok` oldu. Bu test pozisyonunun gerçekleşmiş zararının nakit/deftere doğru
yansıdığı görüldü; hızlı çıkış garantili kâr değildir.

Yayın engellemeyen mevcut sunum notu: toptancı satış toast'u gram havuzu
miktarında da genel `adet` ifadesini kullanıyor; stok/satış kontrolündeki `g`
birimi ve ekonomik miktar doğrudur. Sonraki metin düzeltmesinde ele alınabilir.
