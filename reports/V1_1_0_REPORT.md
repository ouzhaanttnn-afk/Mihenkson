# MIHENK v1.1.0 — sonuç ve yayın kapıları

## Durum

Çalışma `mihenk-v1.1.0` dalında, başlangıçta açık olan `mihenk-classic-update` / `58ef2cb` üzerine yapıldı. `main` ve classic dalının uç commit'leri değiştirilmedi. Bu, main'deki tüm özelliklerin birleştirildiği bir sürüm değildir; mevcut classic oyun çekirdeğinin güncellemesidir.

Web paketi ve native plugin senkronizasyonu hazır. **Henüz App Store/TestFlight'a gönderilmedi. Game Center canlı sıralaması ve duyulabilir fon müziği etkin değil.** Gerçek kimlikler/lisanslı ses olmadan bunları çalışıyormuş gibi göstermiyoruz.

Pazarlık kabul eşikleri, fiyat motoru, müşteri üretim dağılımı, ürün verileri ve stok mutabakat formülleri değiştirilmedi. İstenen akış değişiklikleri mevcut Zustand/AdMob/Audio yapılarına eklendi.

## Uygulandı

- **Aylık servet altyapısı:** nakit + gerçek toptancı satış değeri/uygun mevcut stok değeri + HAS hesabı − vadeli borçlar − tedarikçi faturaları − esnaf ağı borçları. Skor birimi 1 mg HAS; TL gösterim para birimi skoru değiştirmez. Top 100, kişisel sıra, aylık değişim ve fark arayüzü/native GameKit köprüsü hazır. Canlı Game Center için aşağıdaki manuel kapı var.
- **Tek geri çağırma:** başarısız alış/satıştan sonra durumsal popup. Aynı müşteri, ürün, miktar, bütçe ve işlem kimliği korunur. Tamamlanan reklamla son bir fiyat denemesi; tekrar çağırma ve paket değiştirme yok. Ziyaret bir kez sayılır; başarısız eski işlem kaydı, sonuç kaydına iki kayıt oluşturmadan dönüşür. İptal/erken reklam kapatma ödül vermez.
- **4x:** mevcut merkezi saat çarpanı müşteri cooldown'larını da zaten hızlandırıyordu; bunu testlerle sabitledik. Aktif müşteri, modal, yönetim ekranı ve geri çağırma kararında saat durur. Normal tempo yavaşlatılmadı.
- **Müşteri Akını:** 90 oyun dakikası boyunca mevcut geliş çarpanı kullanılır; ilk fırsat en geç 3 oyun dakikasına çekilir. Normal müşteri kalitesi/bütçesi değişmez. Eski doğrudan sponsor para ödülü aynı müşteri fırsatı akışına yönlendirildi.
- **Hafta geçişi:** haftalık özet → devam → interstitial → yeni hafta. Özet mevcut gün raporlarından toplanır, eski kayıt için yalnız gerçekten kaydedilen gün sayısı belirtilir. Rewarded sonrasında en az 120 gerçek saniye interstitial koruması ve eşzamanlı reklam kilidi.
- **Stok UX:** ortak − / miktar / + / TÜMÜ kontrolü, isteğe bağlı manuel giriş. Gram/adet sınırları; küsuratlı stokta TÜMÜ tam miktarı seçer. Satış CTA'sı miktar ve tutarı canlı gösterir. Uzun fiyat açıklamaları ikincil ayrıntılarda.
- **Pazarlık:** UI-only anlaşma/dengeli/kâr hazır teklifleri, kompakt mor manuel fiyat kontrolü, hizalı slider, maliyet/kâr sınırı ve gram/adet fiyatları. Ekonomi formülleri aynı.
- **Analiz:** yeni pazarlıkta açık; aynı işlemde aşamalar arasında gidip gelince kullanıcının kapatma tercihi korunur.
- **Ayarlar:** Sistem/Açık/Koyu, bağımsız müzik ve efekt tercihleri, native titreşim; “Sesi Dene” kaldırıldı. UMP yeniden gizlilik formuna erişim “Gizlilik ve destek” altında korundu.
- **Müzik altyapısı:** mevcut audio modülünde bağımsız gain, tek loop kaynağı, foreground/background suspend/resume, reklam sırasında sessize alma. Lisanslı dosya olmadığından müzik kontrolü açıkça kullanılamaz gösteriliyor; placeholder ses eklenmedi.
- **Haptic:** Capacitor native success/warning/selection; ayar kapalıysa çağrı yapılmaz, seçimlerde hız sınırı vardır. iPhone donanım testi bekliyor.
- **Tema:** merkezi mevcut token/palet sistemi genişletildi; pearl/fildişi açık ve lacivert/altın/mor koyu görünüm. Sistem görünümünü izler, kayıtla korunur.
- **Save:** v3 korunur, yeni alanlar opsiyonel/default normalize edilir; para/stok/borç sıfırlanmaz. Eski sadece müşteri taşıyan, işlem snapshot'ı olmayan geçici recall fırsatı yeniden üretilmez; ilerleme silinmez.
- **Sürüm:** package ve iOS marketing version 1.1.0. Bundle ID `com.mihenkaynak.app` korunur.

Basılı tutarak miktar artırma/yatay miktar sürükleme opsiyonel olduğu için eklenmedi; temel dört kontrol ve manuel giriş tamamlandı.

## Ana dosyalar

| Dosya/grup | Neden |
|---|---|
| `src/state/gameStore.ts`, `save.ts`, `domain/types.ts` | Tek ziyaret recall, hafta geçişi, güvenli kayıt alanları |
| `src/domain/ranking.ts` | Borç dahil HAS net servet ve gerçek ay sınırları |
| `src/config/release.ts` | Gerçek leaderboard ID haritası ve lisanslı müzik yolu; şu anda boş |
| `src/ui/game-center.ts`, `screens/MonthlyLeaderboard.tsx` | Native sıralama çağrıları ve premium liste |
| `ios/App/App/MihenkGameCenterPlugin.swift`, `App.entitlements`, SceneDelegate/storyboard/pbxproj | GameKit köprüsü, capability ve 1.1.0 |
| `src/ui/ads.ts`, `audio.ts`, `haptics.ts`, `App.tsx` | Reklam callback/cooldown, müzik/lifecycle, native haptic |
| `src/ui/QuantityControl.tsx`, StockScreen, WholesalerLiquidation | Klavye-ikincil stok kontrolleri |
| ShopScreen, OfferControl, NegotiateStage, offer-view, offer-presets | Ekonomiyi değiştirmeden pazarlık sunumu |
| tokens.css, update110.css, mevcut üç ekran CSS'i, theme.ts | Merkezi tema ve küçük ekran düzeni |
| SettingsDialog, RecallDialog, DayCloseDialog, RushFab | Durumsal ve sade kontroller |
| package/lock, iOS SPM ve Android Capacitor gradle dosyaları | App ve Haptics resmi plugin bağlantıları |
| `src/i18n/en.ts`, testler, `tools/release-check.mjs` | Yeni metinler ve regresyon kapıları |

## Manuel yapılması gerekenler

### Game Center — canlı açılış için zorunlu

Apple recurring leaderboard, sabit aralıklarla (en fazla 30 gün) tekrar eder; bu Şubat/Ekim gibi **gerçek takvim ayı değildir**. Sessizce 30 güne çevrilmedi.

Ücretsiz Apple-native çözüm: her **UTC takvim ayına ayrı classic leaderboard**. Her board yalnız kendi ayına yönlendirilir; `YYYY-MM → gerçek leaderboard ID` eşlemesi `src/config/release.ts` içine girilir. Apple'ın gerçek oyuncu/rank verisi kullanılır; demo oyuncu veya uydurma ID yok.

App Store Connect ve Developer hesabında:

1. Mevcut bundle ID'de Game Center'ı aç; uygulamanın Game Center yapılandırmasını etkinleştir.
2. Gereken aylar için classic leaderboard oluştur: descending, **Most Recent Score** (best score değil), integer score. 1 skor birimi 0,001 g HAS olduğundan native Game Center'ın kendi görünümüne “mg HAS” birimi ver; Mihenk kendi arayüzünde grama dönüştürür. Desteklenen skor aralığını negatif net serveti de kapsayacak şekilde ayarla.
3. Gerçek ID'leri ay haritasına ekle. Ay sınırı tüm oyuncular için UTC'dir. Aylık başlangıç büyümesi oyuncunun o ayki ilk v1.1 oturumundan ölçülür; geçmişe dönük ay başı verisi uydurulmaz.
4. Game Center entitlement içeren yeni dağıtım provisioning profile üret. GitHub'daki `BUILD_PROVISION_PROFILE_BASE64` güncellenmeli; mevcut sertifika aynı kalabilir.
5. Board'ları sürümün Game Center incelemesine ekle; iki gerçek sandbox/Game Center hesabıyla Top 100 ve kendi sırasını doğrula.

Operasyonel sınır: backend/remote-config eklenmedi; gelecek ayların ID'leri önceden girilmeli veya yeni istemci güncellemesi gerekir. Eski istemcilerin sonraki ayı otomatik öğrenmesi yoktur. Offline/cihaz saatine ve yerel save'e dayalı skorlar sunucu doğrulamalı anti-cheat değildir; Game Center kimliği, ekonomi bütünlüğünü tek başına kanıtlamaz. Ücretli backend eklenmedi.

Kaynaklar: [Apple leaderboard yapılandırması](https://developer-mdn.apple.com/help/app-store-connect/configure-game-center/manage-leaderboards), [Recurring leaderboard](https://developer.apple.com/documentation/gamekit/creating-recurring-leaderboards).

### Müzik

Hakları size ait/lisanslı, kesintisiz döngüye uygun MP3 veya AAC dosyasını örneğin `public/assets/audio/boutique-loop.mp3` yoluna ekle. `BACKGROUND_MUSIC_URL` değerini `assets/audio/boutique-loop.mp3` yap. Yaklaşık 60–120 saniye, 44.1/48 kHz, düşük yoğunluklu bir loop uygundur. Müzik/effect ayrı ayarlarını, kilit ekranını, gelen aramayı ve reklamdan dönüşü iPhone'da dinleyerek doğrula.

### Archive / yayın

Windows'ta Xcode bulunmadığından Swift/iOS Archive derlemesi **yapılmadı**. Web build ve Capacitor sync, imzalı IPA testi değildir.

Game Center profile ve gerçek ID'ler hazır olduğunda macOS'ta temiz Archive al veya mevcut iOS TestFlight workflow'unu bu dalın doğru commit'i için çalıştır. Workflow build numarasını `GITHUB_RUN_NUMBER` ile belirliyor; bu numaranın ilgili App Store sürümünde kullanılmamış olduğunu kontrol et. Yerel project build değeri 16 korunuyor; manuel Archive'da kullanılmamış yeni değer seç.

App Store Connect'te 1.1.0 kaydını, yeni ekran görüntülerini ve sürüm notlarını hazırlayıp doğru işlenen build'i seç. Yalnız GitHub build'in başarılı olması App Store sürümünü değiştirmez. Bu çalışmada yayın/inceleme gönderimi yapılmadı.

## Test sonucu

- 1.104 test geçti, 0 başarısız.
- TypeScript typecheck ve üretim web build başarılı.
- Capacitor iOS + Android sync başarılı; AdMob/App/Haptics bağlandı.
- 77 statik release kontrolü başarılı.
- i18n audit başarılı; t() anahtarlarında eksik İngilizce karşılık yok.
- React kontrolünde lifecycle dinleyici temizliği, ay değişiminde eski sıralama verisi ve seçili menü kontrastı kontrol edildi.
- Yerel tarayıcı: ilk stok alımı, müşteri karşılama, test stoğuyla pazarlık, anlaşma odaklı teklif → 173.796 ₺ satış / 1.935 ₺ kâr; analiz kapatıp aşamalar arasında geri dönüş; tema değiştirip reload.
- 320×568, 390×844, 430×932: beş ana ekranda belge genişliği viewport ile aynı. Koyu/açık stok ve pazarlık ekranları görsel incelendi. 390 px'de iOS safe inset'leri CSS ile simüle edildi; bu fiziksel Dynamic Island testi yerine geçmez.
- Reklam tamamlanması/erken kapatma/tekrar callback/cooldown; save migration; HAS/borç/stock; tek recall/tek ziyaret/tek başarılı kayıt; 4x/karar duraklaması; haftalık özet; tema kalıcılığı ve native haptic çağrıları otomatik testli.
- Native GameKit, gerçek AdMob doluluğu, haptic hissi ve müzik sesi için imzalı iPhone testi bekleniyor. Reklam mock testleri reklamın cihazda gösterildiğinin kanıtı değildir.
- Build'de mevcut büyük JS chunk uyarısı sürüyor (yaklaşık 1,22 MB / 519 KB gzip). Kapsam dışı refactor yapılmadı.

Ekran görüntüleri ve Vitest JSON'u `reports/v1.1.0-*` yerel kanıt dosyalarıdır.

## Plan dışında bulunan oyun tasarımı / tutarlılık konuları — uygulanmadı

1. Stok özetindeki “hızlı çıkış” tahmini ile gerçek toptancı teklifinin değerleme yöntemi farklı. Playtestte iki çeyrek için kart −1.524 ₺, toptancı teklifi −282 ₺ gösterdi. İleride tek açıklanmış değerleme kaynağında birleştirilmesi önerilir; mevcut ekonomik formüller bu paket için değiştirilmedi. Sıralama gerçek çıkış teklifini kullanır.
2. Müşteriye özel stok temin ekranı, eksik 40 g için hâlâ başlangıç miktarı 1 g açıyor. Talep kadar öneri kullanıcı sürtünmesini azaltabilir; otomatik harcama eklenmedi.
3. 320×568 ekranda tüm pazarlık analizini aynı anda göstermek mümkün değil; ana CTA erişilebilir kalırken analiz kendi alanında kaydırılıyor.
4. Offline kayıtlar ve geçmişten gelen servet/ödüller rekabeti etkileyebilir. Aylık net servet sıralaması yeni ve eski oyuncular için eşit başlangıç yarışı değildir; kullanıcı istediği için net servet ölçümü korunmuştur.

OmniRoute çağrısı: 0. Haricî model sonucu veya kredi tasarrufu iddiası yok.
