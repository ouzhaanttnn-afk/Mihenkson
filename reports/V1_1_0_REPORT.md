# MIHENK v1.1.0 — sonuç ve yayın kapıları

## Build 21 görsel koruma düzeltmesi — 19 Eylül 2026

Kullanıcının yeni yönlendirmesiyle ana görünüm için doğrulanan `8ec41bb` / 1.0.3 (21) referans alındı; kodun tamamı eski sürüme döndürülmedi. Build/sürüm numarası 21'e geri çekilmedi. Ekonomi, pazarlık kararları ve reklam/rekabet akışları bu düzeltmede değiştirilmedi.

- Varsayılan `classic` görünümü Build 21'in orijinal lacivert/taş/altın token paletini kullanır. Ayarlarda “Build 21” seçilebilir; açık/koyu/sistem seçenekleri korunur.
- Eski önizlemenin otomatik `system` tercihi bir defa classic'e taşınır. Bilinçli light/dark seçimi korunur. Yeni `themeVersion` alanı ileride yeniden seçilen sistem tercihini korur; başka kayıt alanı değiştirilmez.
- Büyük mor fiyat kutusu ve tekrarlanan teklif kartı düzeni kaldırıldı; Workbench.css içindeki Build 21 kompakt kartlar, üç sütunlu kâr/nakit alanı ve küçük mor fiyat düğmesi kullanılır. Seçili teklifin birim bilgisi görünür; diğer tekliflerin birimleri erişilebilir adlarında korunur.
- Analiz panelinin çerçevesi geri geldi; varsayılan açık ve aynı müşteri için kapatma tercihi korunuyor. 393×665 tarayıcı alanında analiz paneli bütünüyle sığıyor (panel altı 345.69 px; içerik sınırı 351.66 px). 320×568'de ana eylemler ekranda, gerektiğinde yalnız analiz içeriği kayabilir; yatay taşma yok. 430×932 görünümü ayrıca incelendi.
- 79 dosyada 1.170 Vitest testi, 5 release hazırlık testi, TypeScript/üretim build'i, 77 release kontrolü geçti; 1.035 çeviri anahtarında eksik yok. Tarayıcıda çalışma zamanı hatası alınmadı. Fiziksel iPhone testi yerine geçmez.

React incelemesinde mevcut state ve hesaplamalar korundu, yeni paralel oyun sistemi eklenmedi. Omni için 1 kısa kontrol denemesi yapıldı, yanıt alınamadı (başarılı çağrı 0). Apple'a yükleme yapılmadı.

## Güncel doğrulama — 19 Eylül 2026, erişim açıldıktan sonra

Önceki erişim engeli giderildi. `e5d1820` kodu için 78 Vitest dosyasında **1.166 test**, ayrıca **5 release hazırlık testi** geçti. Üretim build'i ve **77 release kontrolü** başarılı. Stok önerisinde sıfır eksikliğin `-0` dönmesi giderildi; ekonomi formülleri değişmedi. Vite büyük ana JS paketi uyarısı veriyor; build hatası değil.

macOS CI aynı kodda npm test, release:check, build, Capacitor iOS sync ve imzasız iOS simülatör derlemesini başarıyla tamamladı: https://github.com/ouzhaanttnn-afk/Mihenkson/actions/runs/35443886836 . Bu signed Archive veya App Store gönderimi değildir.

Yerel üretim paketinde tarayıcı kontrolü: 390 px kupa modalı, 320 px stok ve 430 px dükkan/pazarlık/Market ekranlarında yatay sayfa taşması gözlenmedi. Yeni profil oluşturma, ilk stok alımı, müşterinin 60 g bilezik ihtiyacına 6 × 10 g önerisi, temin → aynı müşteriye ürün seçimi → başarılı satış akışı denendi. Açık/koyu tema ve nakit/stok kaydı sayfa yenilenmesinde korundu. Analiz paneli yeni pazarlıkta açık geldi. Web Premium satın alma işleminin iOS gerektirdiğini gösterdi; kontrol sırasında tarayıcı çalışma zamanı hatası alınmadı.

Kısa ses efektleri korunur; kullanıcı tercihi üzerine dışarıdan fon müziği eklenmedi. Gerçek Game Center ID'leri henüz girilmedi. Reklam SDK'sı, fiziksel titreşim, satın alma ve canlı Game Center için iPhone testi hâlâ gerekir; tarayıcı testi bunların yerine geçmez. Apple'a yükleme yapılmadı.

Omni: kısa yayın kontrolü için 1 CLI denemesi yapıldı, yanıt alınamadı (başarılı çıkarım 0); sonuçlar yerel test ve tarayıcı kanıtlarına dayanıyor.

## Son yerel ek paket — 19 Eylül 2026

Bu bölüm aşağıdaki eski doğrulama/yayın durumundan önceliklidir. Yeni değişiklikler henüz commit/push edilmedi; Vercel veya Apple'a yüklenmedi.

- Dükkanın piyasa şeridine aylık sıralama kupası ve erişilebilir modal eklendi. Modal açıkken oyun saati durur.
- Müşteri için stok alırken mevcut satılabilir stok düşülerek eksik miktar önerilir; satın alma otomatik yapılmaz. Eski birebir SKU talepleri başka ürünle değiştirilmez.
- Sarrafiye stok değeri, tam pozisyonun tek seferde toptancıya satış teklifini kullanır; parça parça satışın farklı olabileceği belirtilir. Ekonomi formülleri değişmedi.
- Reklam hazırlanması, uygun reklam bulunmaması, ağ/izin hatası ve erken kapatma ayrı mesajlarla açıklanır. Gerçek ödül callback şartı korunur.
- Web Premium kartı App Store'a sonsuz bağlanıyormuş gibi görünmez. Ayarlara sürüm, native build bilgisi ve kısa yenilik listesi eklendi.
- React kontrolünde mevcut state/manager yapıları korundu; sürüm sorgusuna unmount temizliği eklendi.
- Game Center ID doğrulaması, kullanıcıya skor görünürlüğü açıklaması ve [kurulum rehberi](GAME_CENTER_SETUP.md) eklendi. Gerçek ID haritası hâlâ boş; canlı sıralama etkin değil.

Doğrulama: TypeScript geçti; 1.035 çeviri anahtarının tamamı karşılandı; 5 bağımsız release hazırlık testi ve 77 statik release kontrolü geçti. Yeni UX/reklam testleri eklendi fakat Vitest çalıştırılamadı. `npm run build` TypeScript aşamasını geçip Vite config yüklemesinde esbuild'in üst dizin erişim engeline takıldı. Tam web build, yeni ekranların tarayıcı testi ve signed iOS archive başarılı sayılmaz. Aşağıdaki eski test başarıları bu ek paketin doğrulaması değildir.

Ek paketin ana dosyaları: `stock-guidance.ts`, `StockScreen.tsx`, `ShopScreen.tsx`, `ads.ts`, `ad-feedback.ts`, `gameStore.ts`, `PremiumOffer.tsx`, `ReleaseInfo.tsx`, `SettingsDialog.tsx`, `RankingDialog.tsx`, `MonthlyLeaderboard.tsx`, `App.tsx`, `update110.css`, `en.ts`, `prepare-release.mjs` ve bunların testleri.

Omni kullanımı: bu ek paket oturumunda 0 çağrı; tasarruf miktarı ölçülmedi.

## Durum

Çalışma `mihenk-v1.1.0` dalında. İlk classic tabanının ardından, kullanıcının ekran görüntüsündeki gerçek TestFlight **1.0.3 (21)** sürümünün başarılı GitHub workflow kaydı doğrulandı: `8ec41bb9f5d4f57a5588e08a570a57db7b9026ec`. Bu commit'in tüm main geliştirmeleri merge edildi. Premium StoreKit, gerçek fiyatlandırma, reklam preload/UMP düzeltmeleri, altın hareketleri, ticaret sonuçları ve premium ikon pipeline'ı korundu. `main` ve classic dalına yazılmadı.

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

Windows'ta yerel Xcode yok. GitHub macOS/Xcode iOS simulator build kontrolü **başarılı**: [run 35439068599](https://github.com/ouzhaanttnn-afk/Mihenkson/actions/runs/35439068599), kaynak `46b95ce`. Premium StoreKit + GameKit + App/Haptics/AdMob birlikte derlendi. Sonraki değişiklikler yalnız web görünümü/birim fiyat gösterimi/test/rapordur, native kaynaklar aynı. Bu kontrol imzasızdır; imzalı Archive/IPA ve TestFlight yüklemesi yapılmadı.

Mevcut boş Game Center ID haritasıyla build alınabilir; `npm run build` gerçek ID yoksa Game Center entitlement'ını eklemez ve mevcut signing profile'ı korur. Gerçek ID eklenirse entitlement otomatik açılır, workflow uyumlu profile gereksinimini açık bir hata ile kontrol eder. Canlı sıralama bu yapılandırma tamamlanmadan etkin değildir. macOS'ta temiz Archive al veya mevcut iOS TestFlight workflow'unu bu dalın doğru commit'i için çalıştır. Workflow build numarasını `GITHUB_RUN_NUMBER` ile belirliyor; bu numaranın ilgili App Store sürümünde kullanılmamış olduğunu kontrol et. Yerel project build değeri **22**. TestFlight workflow'u sıradaki kendi run numarasını kullanır (son başarılı run 21 idi). `mihenk-v1.1.0` dalını seçerek çalıştırılmalı.

App Store Connect'te 1.1.0 kaydını, yeni ekran görüntülerini ve sürüm notlarını hazırlayıp doğru işlenen build'i seç. Yalnız GitHub build'in başarılı olması App Store sürümünü değiştirmez. Bu çalışmada yayın/inceleme gönderimi yapılmadı.

## Test sonucu

- Birleşim sonrası 1.141 Vitest + 3 release hazırlık testi geçti, 0 başarısız.
- TypeScript typecheck ve üretim web build başarılı.
- Capacitor iOS + Android sync başarılı; AdMob/App/Haptics bağlandı.
- 77 statik release kontrolü başarılı.
- i18n audit başarılı; t() anahtarlarında eksik İngilizce karşılık yok.
- React kontrolünde lifecycle dinleyici temizliği, ay değişiminde eski sıralama verisi ve seçili menü kontrastı kontrol edildi.
- Yerel tarayıcı: ilk stok alımı, müşteri karşılama, test stoğuyla pazarlık, anlaşma odaklı teklif → 173.796 ₺ satış / 1.935 ₺ kâr; analiz kapatıp aşamalar arasında geri dönüş; tema değiştirip reload.
- 320×568, 390×844, 430×932: beş ana ekranda belge genişliği viewport ile aynı. Koyu/açık stok ve pazarlık ekranları görsel incelendi. 390 px'de iOS safe inset'leri CSS ile simüle edildi; bu fiziksel Dynamic Island testi yerine geçmez.
- Reklam tamamlanması/erken kapatma/tekrar callback/cooldown; save migration; HAS/borç/stock; tek recall/tek ziyaret/tek başarılı kayıt; 4x/karar duraklaması; haftalık özet; tema kalıcılığı ve native haptic çağrıları otomatik testli.
- Native GameKit, gerçek AdMob doluluğu, haptic hissi ve müzik sesi için imzalı iPhone testi bekleniyor. Reklam mock testleri reklamın cihazda gösterildiğinin kanıtı değildir.
- Build'de mevcut büyük JS chunk uyarısı sürüyor (yaklaşık 1,28 MB / 544 KB gzip). Kapsam dışı refactor yapılmadı.

- Birleşim sonrası gerçek UI akışı: 6 × 10 g yatırım bileziği temini → aynı müşteriye dönüş → varsayılan açık analiz → anlaşma odaklı teklif → 242.294 ₺ satış / 3.778 ₺ kâr. Açık temada seçili teklif ve manuel fiyatın kontrastı düzeltildi; yatırım bileziğine adet yanında gram fiyatı eklendi (ekonomi değişmedi).
- React birleşim kontrolü: ikinci/kapalı analiz wrapper'ı kaldırıldı, tek kontrollü analiz alanı korundu; Premium geri çağırma metni reklamsız hakkı doğru anlatır.
- Build öncesi merkezi release config doğrulaması ve gizli veri içermeyen `release.json` sürüm/commit kanıtı eklendi.

Ekran görüntüleri ve Vitest JSON'u `reports/v1.1.0-*` yerel kanıt dosyalarıdır.

## Plan dışında bulunan oyun tasarımı / tutarlılık konuları — uygulanmadı

1. Stok özetindeki “hızlı çıkış” tahmini ile gerçek toptancı teklifinin değerleme yöntemi farklı. Playtestte iki çeyrek için kart −1.524 ₺, toptancı teklifi −282 ₺ gösterdi. İleride tek açıklanmış değerleme kaynağında birleştirilmesi önerilir; mevcut ekonomik formüller bu paket için değiştirilmedi. Sıralama gerçek çıkış teklifini kullanır.
2. Müşteriye özel stok temin ekranı, eksik 40 g için hâlâ başlangıç miktarı 1 g açıyor. Talep kadar öneri kullanıcı sürtünmesini azaltabilir; otomatik harcama eklenmedi.
3. 320×568 ekranda tüm pazarlık analizini aynı anda göstermek mümkün değil; ana CTA erişilebilir kalırken analiz kendi alanında kaydırılıyor.
4. Offline kayıtlar ve geçmişten gelen servet/ödüller rekabeti etkileyebilir. Aylık net servet sıralaması yeni ve eski oyuncular için eşit başlangıç yarışı değildir; kullanıcı istediği için net servet ölçümü korunmuştur.

OmniRoute çağrısı: 0. Haricî model sonucu veya kredi tasarrufu iddiası yok.
