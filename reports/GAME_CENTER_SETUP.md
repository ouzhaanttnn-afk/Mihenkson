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

## Release öncesinde kalan zorunlu adım

Apple Developer'daki eski `MIHENKAYNAK App Store` provisioning profile Game Center açılınca geçersizleşti. Aynı dağıtım sertifikasıyla yeniden üretildi ve portalda **Active**, `Game Center, In-App Purchase` olarak doğrulandı. Ancak Chrome, profil indirme bağlantısını engellediği için yeni `.mobileprovision` dosyası bu makineye alınamadı ve GitHub `BUILD_PROVISION_PROFILE_BASE64` secret'ı henüz güncellenemedi. Secret eski profile işaret ediyorsa iOS workflow `Game Center IDs are configured` kontrolünde bilinçli olarak durur. Secret güncellenmeden TestFlight build'i çalıştırmayın. Profil/certifika dosyaları repoya konmamalıdır.

1. Apple Developer → Certificates, Identifiers & Profiles → Profiles → **MIHENKAYNAK App Store** → Download ile yenilenmiş profili indir.
2. Bu profili base64'e çevirip GitHub Actions secret `BUILD_PROVISION_PROFILE_BASE64` değerini değiştir. Diğer sertifika ve şifreleri değiştirme.
3. 1.1.0 için yeni iOS workflow build'i başlat; archive'deki entitlement ve Game Center hesabını iki gerçek iPhone/TestFlight hesabıyla doğrula.
4. Sıralamaların App Store sürüm incelemesine eklendiğini kontrol et. Bunlar şu anda **Prepare for Submission** durumunda; public yayınlandıkları iddia edilmez.

## Test ve kabul

Yerel `npm test`: 80 dosya, 1181 test geçti. `npm run build`: TypeScript ve Vite üretim build'i geçti. Windows'ta Xcode/Archive ve gerçek Game Center oturum testi yapılamadı. Cihazda özellikle giriş/iptal, iki farklı oyuncu, kendi sıra/Top 100, servet düşünce Most Recent güncellemesi, ağsız durum ve ay değişimi denenmelidir. Game Center skorunun yerel save'den üretildiği, cihaz saatini değiştirerek bir takvim ayının hileli biçimde taklit edilebileceği unutulmamalıdır.

Kaynaklar: [Apple — Manage leaderboards](https://developer.apple.com/help/app-store-connect/configure-game-center/manage-leaderboards/), [Leaderboard fields](https://developer.apple.com/help/app-store-connect/reference/game-center/leaderboards), [Capability/profile updates](https://developer.apple.com/help/account/reference/capability-entitlement-updates).
