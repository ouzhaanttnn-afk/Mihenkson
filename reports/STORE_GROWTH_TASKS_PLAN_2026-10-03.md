# Mihenk — Kompakt Mağaza Görevleri

Durum: Plan; oyun arayüzüne uygulanmadı, build veya Apple yüklemesi yapılmadı.

## 1. Amaç ve sınır

Oyuncu kısa sürede üç şeyi anlayabilmeli: sıradaki mağaza, eksik görev,
yükseltme bedeli. Kullanıcının son önceliği: kompakt, sade, anlaşılır ve en az
scroll. Mevcut yükseltme şartlarını görev diliyle anlatıyoruz; yeni görev
mekaniği, ödül, sayaç, XP kuralı, ekonomi dengesi veya reklam eklemiyoruz.

Ana ekrandaki 88 px mağaza karesi büyümeyecek. Görev metinleri, yeni uzun
kartlar veya ikinci bir ilerleme paneli ana dükkâna eklenmeyecek. Kareye
dokunmak ve İşletme → Mağaza yolu aynı görev görünümünü açacak.

## 2. Ekran sırası

1. Küçük başlık: **Cadde Mağazası**. Alt satır: **Görevler · 4/6 hazır**.
   Sayılar örnektir; gerçek kariyerden anlık hesaplanır. Büyük mağaza resmi,
   uzun tema açıklaması veya mevcut mağaza istatistikleri yukarıya konmaz.
2. **Eksik görevler**: kart yığını değil, ayraçlarla ayrılmış kısa satırlar.
   Solda hedef, sağda mevcut/hedef; örneğin **18 işlem tamamla — 14/18**.
   Metin varsayılan boyutta mümkün olduğunca tek satır; büyütülünce sarılır.
3. **Hazır görevler (4)**: tek kapalı açılır başlık. Açılınca hazır hedefler
   görülebilir. Kaybolmazlar; varsayılan ekranda yer tüketmezler.
4. **Yatırım**: **220.000 ₺ gerekiyor** ve yeterlilik durumu. Altında kısa
   **Yeni günlük gider: 1.800 ₺**. Yatırım, altı göreve karıştırılmaz.
5. **Mağaza ayrıntıları**: tek kapalı bölüm; yükseltmenin getirileri, mevcut
   kapasite, sunum etkileri ve diğer uzun bilgiler burada korunur.
6. Tek yükseltme düğmesi. Alt sabit alan, gerçek safe-area ve navigasyonun
   üstünde kalır; içeriği örtmez. Oyuncunun ödeme yaptığı açıkça belirtilir:
   **220.000 ₺ öde ve büyüt**. Her tıklamada mevcut yedi koşul tekrar kontrol
   edilir; görevler hazır olsa bile yatırım nakdi eksikse yükseltme açılamaz.

Bir **Nasıl ilerlerim?** açılır yardım bölümü, yalnız eksik hedeflerin kısa
açıklamalarını ve mevcut ekran kısayollarını sunar. Altı ayrı yardım düğmesi,
altı ilerleme çubuğu veya sürekli açık paragraflar kullanılmaz. Boş bir yardım
bölümü, işlem garantisi ya da sahte kontrol gösterilmez.

## 3. Görev dili — Cadde örneği

| Kaynak | Ekrandaki kısa görev | Yardımda kullanılacak açıklama |
|---|---|---|
| `closedDeals` | 18 işlem tamamla | Müşterilerle tamamlanan alım ve satış kayıtları bu hedefi ilerletir. |
| `knownCustomers` | 6 farklı müşteriyi tanı | Yeni müşterileri karşıla; defterdeki farklı kişiler sayılır. |
| `level` | 3. seviyeye ulaş | İşlem ve hizmet deneyimi seviyeni ilerletir. |
| `supplierTrust` | Toptancı güvenini 58'e çıkar | İhtiyacın olan stoğu temin et; mevcut vadelerini zamanında öde. Küçük her alışın güven artırdığı söylenmez. |
| `reputation` | Semt itibarını 52'ye çıkar | Müşteri görüşmeleri ve hizmet sonuçları itibarını etkiler. |
| `netWorth` | Servetini 600.000 ₺'ye çıkar | Nakit, stok ve HAS değeri toplanır; borçlar düşülür. Bu hedef yalnız nakit değildir. |

Eşikler başlıklara sabit yazılmaz; hedef mağazanın mevcut tanımından alınır.
Altı görevin hazır sayısı ve yatırım yeterliliği ayrı gösterilir. Farklı
ölçüler tek bir yüzde ilerleme çubuğuna dönüştürülmez.

## 4. Davranış ve doğruluk

- Görevler toplam kariyer değerleridir. Cadde sonrası AVM için 70 *yeni*
  işlem veya 20 *yeni* müşteri istenmez; mevcut toplamlar sayılmaya devam eder.
- “Hazır” anlık yeterlilik demektir. Servet, itibar ve güven düşerse görev
  yeniden eksik görünebilir; kalıcı “tamamlandı” kaydı veya ödül tutulmaz.
  Yardımdaki tek kısa not bunu açıklar. Yükseltilmiş mağaza geri alınmaz.
- Hazır satırlar ancak kullanıcı listeyle etkileşmiyorken kapalı gruba geçer;
  güncellenen değerler parmağın altındaki kontrolü yerinden oynatmaz.
- Eksik görevlerin sırası sabit: işlem, müşteri, seviye, toptancı güveni,
  itibar, servet. Birim veya oran karşılaştırarak değişken “en yakın görev”
  sıralaması yapılmaz. Menü kendiliğinden açılmaz, görev pop-up'ı çıkarılmaz.
- Müşteri hedefi sadakat veya başarılı satış şartı değildir; farklı müşteri
  kaydı ilk karşılaşmada oluşur. Aynı kişiyi tekrar karşılamak sayıyı artırmaz.
- İşlem sayısı mevcut pozitif fiyatlı kayıt tanımını izler; ziyaret, satılan
  gram ve paket içindeki ürün adedi olarak yeniden hesaplanmaz. Red sayılmaz.
- Seviye XP'den gelen `store.level` değeridir. Yetenek puanı ve uygun ustalık
  işi bu listeye eklenmez. Mevcut StoreRoute'un `nearGoal` ustalık açıklaması
  görev bölümünden ayrılır; Yetenekler ekranında kalır.
- Tüm görevler hazır, nakit eksikse **Yatırım için {kalan} ₺ eksik** denir.
  Hepsi hazırsa **Cadde Mağazası'na geçebilirsin** denir. Yükseltme otomatik
  yapılmaz; mevcut settlement ve kayıt güvenliği yolu korunur.
- Son erişilebilir mağazada **Bu sürümde son mağazadasın** gösterilir.
  Marka Ağı, ikinci şube veya erişilemez bir sonraki görev vaat edilmez.

## 5. Teknik uygulama planı

1. `evaluateUpgrade` çıktısından salt-okunur altı görev + yatırım görünümü
   türet. İkinci yükseltme hesabı veya save alanı oluşturma.
2. Kısa TR/EN metin eşlemesini UI katmanında tut; bütün eşikler
   `STORE_TIERS` kaynağından gelsin. Mevcut kanonik işlem/müşteri tanımlarını
   koru; doğrudan ekonomiye veya RNG'ye dokunma.
3. StoreRoute içindeki görev bölümünü küçük ayrı bileşene ayır. Saati her
   tikte izlemek yerine ilgili ekonomik değişikliklere abone ol; açık/kapalı
   ayrıntı durumu geçici UI state'i olsun.
4. Mevcut mağaza istatistiklerini ve uzun açıklamaları tek ayrıntı bölümüne
   taşı. Mevcut açık/büyüme navigasyonunu, Yetenekler kısayolunu ve 88 px ana
   kartı koru. Kısayollar otomatik alım, müşteri çağırma veya borç açma yapmaz.
5. Görev sayacı, yatırım eksikliği, yeniden eksilen koşul, yükseltme sonrası
   hedef değişimi, eski kayıt ve son mağaza için regresyon testleri ekle.
6. `npm test`, typecheck, build, i18n ve release kontrollerini çalıştır.
   Ardından gerçek arayüzde küçük ekran / gezinme / yardım açma-kapama testi.

## 6. Görsel kabul ölçütleri

- 390×844 ve 430×932, varsayılan yazı ve simüle gerçek safe-area ile eksik
  görevler, yatırım/gider bilgisi ve yükseltme eylemi mümkün olduğunca ilk
  görünümde kalmalı. Hazır görevler ve ayrıntılar kapalıdır.
- 320×568 ve büyük metinde gerektiği kadar dikey scroll kabul edilir;
  sıfır scroll uğruna yazı küçültülmez, hedef saklanmaz veya içerik kesilmez.
- Yatay scroll yok; nested scroll yok; tüm detay ekranı tek scroll alanıdır.
  Açılan ayrıntılar dışında her görevin yardımcı paragrafı kapalıdır.
- Dokunulan kontroller en az 44 px; salt-okunur satırlar gereksiz 44 px
  düğme gibi sunulmaz. Durum yalnız renk ile anlatılmaz.
- Alt eylem alanı son satırları veya cihazın home indicator'ını örtmez.
  200% metin, reduced motion, TR/EN ve eksik görsel kontrolü korunur.
- Tüm gösterilen görev durumları kanonik yükseltme değerlendirmesiyle aynı
  olmalı; hiçbir eski kariyer sıfırdan görevlere başlatılmamalı.

## Kaynak ve teslim sınırı

İncelenen kaynak: `src/data/store-tiers.ts`, `src/domain/store-growth.ts`,
`src/domain/business-story.ts`, `src/domain/customer-memory.ts`,
`src/domain/settlement.ts`, `src/state/gameStore.ts`,
`src/ui/screens/BusinessScreen.tsx` ve `src/ui/business-story-copy.ts`.

Bu dosya yalnız uygulanabilir tasarım planıdır. Çalışan 88 px kart, mevcut
1.3.0 yükseltme eşikleri ve Apple'daki build 36 bu planla değiştirilmedi.
