# Mihenk 1.1.0 — Game Center hazırlığı

Durum: Kod köprüsü ve kupa ekranı var; gerçek leaderboard ID haritası boş. Apple hesabında board oluşturulmuş/etkinleştirilmiş olduğu doğrulanmadı. Canlı sıralama veya hile koruması hazırmış gibi sunulmaz. Bundle ID: com.mihenkaynak.app.

## Takvim ve puan kararı

Mevcut uygulama gerçek UTC takvim ayını kullanır. Apple recurring leaderboard en fazla 30 günlük aralık desteklediğinden bunu aylık sıralama diye adlandırmıyoruz. Her ay için farklı classic leaderboard kullanacağız. Classic board kendiliğinden kapanmaz: Mihenk istemcisi yalnız mevcut ayın ID'sine gönderir. Sunucu tarafında değiştirilemez ay kilidi değildir.

Bu model ücretsiz Apple hizmetini kullanır; yeni backend yok. Gelecek ayların gerçek ID'leri önceden uygulamaya eklenmeli; mevcut kodda remote config bulunmuyor. İlk kurulumda birkaç gelecek ayın hazırlanması önerilir. Apple set kullanılmayan uygulamada 100 board sınırı bildiriyor; bu sınırsız bir arşiv modeli değildir.

Kaynak: [Apple — Manage leaderboards](https://developer.apple.com/help/app-store-connect/configure-game-center/manage-leaderboards/).

## App Store Connect'te yapılacaklar

MIHENK uygulaması → Game Center → Add Leaderboard. Yayına çıkılacak her ay için ayrı kayıt:

| Alan | Mihenk ayarı |
|---|---|
| Tür | Classic |
| Reference Name | MIHENK HAS ve ilgili yıl/ay |
| Leaderboard ID | Apple'da gerçekten oluşturulan benzersiz ID; kodda şimdilik boş |
| Score Format | Integer |
| Score Submission Type | Most Recent Score |
| Sort Order | High to Low |
| Yerelleştirilmiş ad | Mihenk Aylık HAS — ilgili ay ve yıl |
| Birim eki | mg HAS (native Game Center için) |
| Açıklama | Nakit, stok ve aktif borçlar üzerinden hesaplanan HAS altın karşılığı net servet. |

1 skor birimi = 0,001 g HAS. Örneğin 250 g = 250000 integer skor. Oyun içi arayüz bunu 250,000 g HAS olarak gösterir. TL skor değildir. Borçlar düşülür; ödül doğrudan puan eklemez.

Negatif net servet desteklenmeli. İsteğe bağlı Score Range alanına gelişigüzel sıfır minimumu koymayın; geçmiş puanları silecek bir aralık daraltması yapmayın. Best Score seçmeyin: güncel servet azaldığında sıralama da düşebilmelidir.

Kaynak: [Apple — Leaderboard fields](https://developer.apple.com/help/app-store-connect/reference/game-center/leaderboards).

## Kod ve imzalama

1. Gerçek ID'leri src/config/release.ts içindeki MONTHLY_LEADERBOARD_IDS haritasına YYYY-MM anahtarlarıyla ekle. Her ay ayrı ID; boşluklu/tekrarlı ID build hazırlığında reddedilir. Örnek/sahte ID commit edilmez.
2. Developer hesabında mevcut App ID'nin Game Center yeteneğini kontrol et/etkinleştir. Bundle ID'yi değiştirme.
3. Game Center entitlement içeren dağıtım provisioning profile üret; ilgili GitHub BUILD_PROVISION_PROFILE_BASE64 secret'ını güncelle. Anahtar, sertifika ve profile dosyalarını repoya koyma.
4. npm run build bu haritadan entitlement üretir. Harita boşken yetenek dormant kalır; doluyken workflow profile'ın Game Center yetkisini ayrıca kontrol eder.
5. Game Center bileşenlerinin sürüm incelemesine dahil edildiğini doğrula; sadece binary yüklemek canlı sezonun açıldığını kanıtlamaz.
6. Gizlilik metninin Game Center'a aktarılan oyuncu adı/servet skorunu doğru anlattığını gözden geçir. Oyun içindeki bağlantı eylemi bu görünürlüğü ayrıca açıklar.

## Cihazda kabul testi — son build'den sonra zorunlu

- İki farklı Game Center hesabıyla giriş/iptal/yeniden deneme.
- Kupa ekranında kişi adı, kendi sıra, g HAS ve Top 100 birimleri.
- Servet düştüğünde Most Recent sayesinde skorun düşmesi.
- Kasa → stok dönüşümünün parayı yok saymaması; borç almanın bedava servet üretmemesi.
- Ağ yokken sahte sıra gösterilmemesi; web'de native giriş veya reklam taklidi olmaması.
- Ay değişirken eski ayın sonucu yeni ayın ekranına taşınmaması; eksik ID'de gönderim yapılmaması.
- Güncel ay ve sonraki ayın gerçek ID'leriyle test; test/cihaz saatini değiştirerek gönderilmiş skoru gerçek rekabet kanıtı sayma.
- 320/390/430 px, açık/koyu tema, kupa aç/kapat, VoiceOver, uygulama arka plana dönüşü.

## Bilinen sınırlar

Skor yerel save ve cihaz saatinden üretilir; Game Center kimliği, yerel ekonomiye sunucu tarafı hile koruması getirmez. Ödüllü reklamlardan doğan ek ticaret fırsatları dolaylı servet avantajı sağlayabilir; bu sıralama eşit başlangıçlı bir yarış değildir.

Skor şu an kullanıcı Top 100 bağlantısını başlattığında gönderilir. Günün/ayın sonunda herkesten zorunlu otomatik skor alındığı veya offline oyuncunun son servetinin bilindiği iddia edilmez.

## Mevcut çalışma engeli

Bu oturumda TypeScript ve bağımsız release hazırlık testleri çalışıyor; Vitest/Vite config yüklemesi Windows dosya erişim sınırına takılıyor. Yeni kupa/UX değişikliklerini tam test edilmiş saymayın. Son signed Archive, native cihaz reklam testi ve Apple'a gönderim henüz yapılmadı.
