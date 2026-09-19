# Mihenk 1.1.0 — Game Center durumu (19 Eylül 2026)

Bundle ID değişmedi: `com.mihenkaynak.app`. App Store Connect'te Game Center ve Apple Developer App ID'de Game Center capability açıldı. Dört gerçek, ayrı classic leaderboard oluşturuldu; Türkçe ve İngilizce yerelleştirme, üç ondalıklı HAS puanı, **Most Recent Score** ve **High to Low** ayarları kullanılıyor:

| UTC takvim ayı | Leaderboard ID |
|---|---|
| 2026-09 | `com.mihenkaynak.has.2026_09` |
| 2026-10 | `com.mihenkaynak.has.2026_10` |
| 2026-11 | `com.mihenkaynak.has.2026_11` |
| 2026-12 | `com.mihenkaynak.has.2026_12` |

Bu ID'ler `src/config/release.ts` içinde uygulamaya bağlandı. Bir skor birimi 0,001 g HAS'tır: 250 g HAS, Game Center'a 250000 integer olarak gider ve native format `250,000 g HAS` gösterir. Nakit + stokun konservatif tasfiye değeri + HAS bakiyesi − borçlar üzerinden net servet hesaplanır. Reklam doğrudan puan vermez. Kullanıcı dükkândaki kupaya dokununca Game Center kimlik doğrulaması, skor gönderimi ve gerçek Top 100 listesi açılır; giriş yapılmışsa oyun açıkken puan ayrıca sessizce güncellenir. Web sürümü gerçek Game Center sırası taklit etmez. Görsel önizleme temsilidir; sahte oyuncu adları yalnız önizleme resmindedir.

Apple recurring leaderboard 30 günden uzun tekrarlayamadığı için 31 günlük gerçek takvim aylarını tek recurring board ile temsil etmiyoruz. Her ay ayrı classic board kullanılıyor. Yeni ay için App Store Connect'te ayrı board oluşturup ID'yi **yeni build'den önce** bu haritaya eklemek gerekecek. Classic board'daki eski puanlar Apple tarafında kalır, fakat istemci yalnız içinde bulunulan ayın ID'sini gönderir. Bu cihaz saati ve yerel save'e dayalıdır; sunucu tarafı hile koruması değildir.

## Dağıtım durumu ve kalan kontroller

Apple Developer'daki eski `MIHENKAYNAK App Store` provisioning profile Game Center açılınca geçersizleşti. Aynı dağıtım sertifikasıyla yeniden üretilen profil indirildi; CMS imzası, `8X6KZC5R23.com.mihenkaynak.app` uygulama kimliği ve Game Center entitlement'ı doğrulandı. GitHub Actions `BUILD_PROVISION_PROFILE_BASE64` secret'ı bu yeni profille güncellendi. Profil/certifika dosyaları repoya konmadı.

[`iOS TestFlight` run 26](https://github.com/ouzhaanttnn-afk/Mihenkson/actions/runs/35462003606), `f64fdfd` commit'inden **1.1.0 (26)** sürümünü arşivledi, imzalı IPA'yı dışa aktardı ve Apple doğrulama/yükleme adımını başarıyla bitirdi. GitHub Actions başarısı, Apple'ın TestFlight işlemeyi tamamladığını veya build'in test kullanıcısına hemen açıldığını tek başına doğrulamaz.

1. App Store Connect'te **1.1.0 (26)** build'inin işlemeyi bitirip TestFlight'ta kullanılabilir hale geldiğini kontrol et.
2. Game Center hesabını iki gerçek iPhone/TestFlight hesabıyla dene: oturum, kendi sıra, gerçek Top 100, altın külçesi görseli ve skor güncellemesi.
3. Sıralamaların App Store sürüm incelemesine eklendiğini kontrol et. Bunlar son kontrolde **Prepare for Submission** durumundaydı; public yayınlandıkları iddia edilmez.

## Test ve kabul

Yerel `npm test`: 80 dosya, 1181 test geçti. `npm run build`: TypeScript ve Vite üretim build'i geçti. GitHub macOS runner'ında iOS Archive, imzalı IPA ve Apple doğrulama/yükleme adımı geçti. Gerçek Game Center oturum testi henüz yapılmadı. Cihazda özellikle giriş/iptal, iki farklı oyuncu, kendi sıra/Top 100, servet düşünce Most Recent güncellemesi, ağsız durum ve ay değişimi denenmelidir. Game Center skorunun yerel save'den üretildiği, cihaz saatini değiştirerek bir takvim ayının hileli biçimde taklit edilebileceği unutulmamalıdır.

Kaynaklar: [Apple — Manage leaderboards](https://developer.apple.com/help/app-store-connect/configure-game-center/manage-leaderboards/), [Leaderboard fields](https://developer.apple.com/help/app-store-connect/reference/game-center/leaderboards), [Capability/profile updates](https://developer.apple.com/help/account/reference/capability-entitlement-updates).
