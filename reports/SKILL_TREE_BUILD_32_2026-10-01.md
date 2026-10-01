# Mihenk 1.2.0 (32) — personel ana ekranı ve yetenek ağacı

## İmzalı iOS paketi

- Kaynak: `dbbf69ab49b8272f74dd526907da4cb54dcf8b02`.
- Dal: `codex/mihenk-personnel-home`.
- Uygulama: `com.mihenkaynak.app`, App Store ID `6808742428`.
- Sürüm: **1.2.0 (32)**. Build numarası workflow run numarasından gelir.
- İş: https://github.com/ouzhaanttnn-afk/Mihenkson/actions/runs/36830515013
- CI testleri: 94 Vitest dosyası / 1.395 test ve 5 release hazırlık testi başarılı.
- CI release kontrolü: 81/81. Production web build, Capacitor iOS sync ve Game Center yetkili imza profili doğrulaması başarılı.
- 2026-10-01 07:33:38 UTC: `ARCHIVE SUCCEEDED`.
- 07:33:45 UTC: `EXPORT SUCCEEDED`.
- 07:35:20 UTC: `No errors validating archive`.
- **07:36:50 UTC / 10:36:50 TRT: `UPLOAD SUCCEEDED with no errors`.** İmza temizliği ve bütün workflow başarılı.

Pakette ana Dükkan ekranındaki Personel/Yetenek Ağacı girişleri, üç uzmanlık dalı,
gerçek tamamlanmış işlerden kazanılan altı puan, ücretsiz korumalı yeniden dağıtım,
eski kayıt göçü ve ziyaret başında sabitlenen etkiler bulunur. Ayrıntılı tasarım ve
test kapsamı `SKILL_TREE_IMPLEMENTATION_2026-10-01.md` içindedir. `spec/mastery-preview`
geliştirme fikstürü production paketine dahil değildir.

## Apple durumu

Apple arayüzündeki Build Uploads listesinde **Version 1.2.0, Build (32) — Processing**
ve 1 Ekim 2026 10:36 yerel yükleme zamanı doğrulandı. İşleme tamamlanması ve
build 32'nin test grubundaki kullanılabilirliği henüz bu raporda doğrulanmadı.

Bu işlem App Review gönderimi veya herkese açık yayın değildir. Apple arayüzünde
mevcut **1.2.0 (31) — Waiting for Review** ve manuel yayın tercihi doğrulandı;
eski gönderim geri çekilmedi, yeni paket ona seçilmedi. Mevcut Betatest grubu üç
internal tester içerir ve `Automatic for Xcode Builds` dağıtımını kullanır.

## Cihaz kontrolü

İmzalı derleme başarısı fiziksel iPhone oynanış testi değildir. Yayın öncesi:

1. TestFlight'ta **1.2.0 (32)** kurulu olduğunu doğrula; build 31 bu ağacı içermez.
2. Mevcut kayıtla açılışta altın, kasa, aktif müşteri ve kabul edilmiş işler korunmalı.
3. Ana Dükkan ekranından Personel ve Yetenek Ağacı açılmalı; dokuz kademeye karşı altı puan sınırı görünmeli.
4. Beş uygun kârlı tamamlanmış işte ilk puanı, kademe öğrenmeyi ve yeniden açılışta kaydı kontrol et. Aynı işlem tekrar puan kazandırmamalı.
5. Açık müşteride/atölye işinde korumalar, modal kaydırma, büyük metin ve Game Center giriş/iptal akışını dene. Gerçek reklama/IAP'a yalnız uygun test akışıyla dokun.
