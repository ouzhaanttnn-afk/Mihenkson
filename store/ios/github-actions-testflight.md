# GitHub Actions ile TestFlight yüklemesi

Bu yol, Windows geliştirme makinesinden doğrudan Xcode çalıştırmak yerine
GitHub'ın macOS runner'ında imzalı IPA üretir ve Apple'ın `altool` aracıyla
TestFlight'a gönderir. İş akışı yalnız elle (`workflow_dispatch`) başlatılır;
push veya pull request ile kendiliğinden yayın yapmaz.

## Gerekli GitHub Actions secrets

- `APPLE_ID`: App Store Connect'e girişte kullanılan Apple hesabı e-postası
- `APPLE_APP_SPECIFIC_PASSWORD`: Apple Account üzerinde bu yükleme için
  oluşturulmuş uygulamaya özel parola
- `BUILD_CERTIFICATE_BASE64`: Özel anahtarı içeren Apple Distribution `.p12`
  dosyasının Base64 karşılığı
- `P12_PASSWORD`: `.p12` dışa aktarım parolası
- `BUILD_PROVISION_PROFILE_BASE64`: `com.mihenkaynak.app` için App Store
  dağıtım `.mobileprovision` dosyasının Base64 karşılığı
- `KEYCHAIN_PASSWORD`: Tek kullanımlık GitHub runner anahtar zinciri için
  rastgele ve güçlü bir parola

Bu dosyalar veya değerler hiçbir zaman Git deposuna eklenmemelidir. İş akışı,
provisioning profilinin Team ID ve Bundle ID eşleşmesini build öncesinde
doğrular. GitHub-hosted runner tamamlanınca geçici anahtar zinciri ve profil
silinir; runner da GitHub tarafından yok edilir.

## Çalıştırma

1. GitHub deposunda **Settings → Secrets and variables → Actions** yolunda
   yukarıdaki altı secret'ı tanımla.
2. **Actions → iOS TestFlight → Run workflow** yolundan doğrulanmış kaynak dalını
   seçerek başlat. Derlemenin `headSha` değeri yayınlanacak commit ile eşleşmeli.
3. İş tamamlandıktan sonra App Store Connect → TestFlight'ta build'in Apple
   tarafından işlenmesini bekle. İlk işleme birkaç dakika sürebilir.

Her **yeni dispatch** işleminde `CURRENT_PROJECT_VERSION`, bu workflow'un
GitHub run numarasına eşitlenir. Mevcut bir run'ı yeniden çalıştırmak numarayı
artırmaz; Apple'a yükleme başarılı olduktan sonra yeniden paket yüklemek
gerekiyorsa yeni dispatch kullanılır. Mağaza sürümü Xcode projesindeki
`MARKETING_VERSION` değeridir; güncel sürüm `1.2.0`.

Bu workflow yalnız imzalı IPA üretir, doğrular ve Apple'a yükler. Apple'ın
processing işlemini tamamlaması, TestFlight grubuna erişim, App Review'a build
seçimi/gönderimi ve mağazada yayın ayrı adımlardır; workflow bunları otomatik
yapmaz. TestFlight'a yeni paket yüklenmesi, incelemedeki eski paketi değiştirmez.

