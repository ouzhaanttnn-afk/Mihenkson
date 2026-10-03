# Mihenk 1.3.0 — ilerleme kalibrasyonu

Durum: **tamamlandı**. İlk 1.000 ortak-seed temel ölçümüne, aynı 1.000 seed üzerinde dört politika adayı eklendi: toplam 6.000 kariyer, 18.000 nakit/nonnegative/idempotency kontrolü. Bu rapor tek başına üretim eşiği değişikliği yetkisi veya tam kariyer dengesi onayı değildir.

## Kapsam ve yeniden çalıştırma

`tools/progression130-simulation.mjs` gerçek `gameStore` komutlarını, müşteri üretimini, oyun saatini, pazarlığı, atölyeyi, ekspertizi ve canonical settlement'i Node/Vite içinde çalıştırır. Tarayıcı/kullanıcı kaydı, hesap, reklam veya dış servis kullanılmaz. Script dosya yazmaz; sonuç JSON'u stdout'a verir.

```sh
node tools/progression130-simulation.mjs --seeds=1000 --days=42 --visits=24 --workers=8 --modes=cash-counter,credit-enabled-counter --compact
node tools/progression130-simulation.mjs --seeds=1000 --days=42 --visits=24 --workers=8 --modes=cash-consistent-trust,planned-reserve,mixed,personnel-bulk --compact
```

Seed `n` için kök seed `(imul(n+1,2654435761) xor 0x1302026) >>> 0` olarak kurulur. Aynı 1.000 bağımsız kök seed her politikada kullanılır; tek seed'in 1.000 ziyareti değildir. Her açık oyun gününde en fazla 24 müşteri gelişinden sonra isteğe bağlı erken kapanış yapılır; mevcut kapanış saati daha önce gelirse ona uyulur. Pazar mevcut planlama günüdür. 42 gün sonunda durum ertesi günün açılışındaki fotoğraftır. Oyun günü sayısı insan oynama süresine çevrilmez.

Her kariyer sonunda üç kontrol vardır: başlangıç nakdi + işlem nakit hareketleri = kasa; kasa negatif değildir; uygulanmış işlem kimlikleri tekrarlanmaz. Bunlar bütün üretim invariant/test takımının yerine geçmez.

### Politikalar

- **Mevcut peşin hızlı stok:** gerçek talebin eksik stoğunu alır, görünür önerilen satış fiyatını sunar; görünür karşı teklifi ancak gerçek maliyeti karşılıyorsa kabul eder. Alım, servis ve ekspertiz müşterilerini reddeder.
- **Mevcut vade-seçenekli hızlı stok:** aynı politika, `useCredit=true`; motor önce mevcut kasayı kullanır. Vade seçeneği gerçek borç doğduğunu garanti etmez.
- **Tutarlı peşin aday:** aynı peşin politika; yalnız başarılı meaningful pool alışına mevcut `tradeTrustAfterPurchase` kuralı uygulanır. Aday mağaza güven eşikleri 58/62/65'tir; XP ve mağaza seviyeleri 3/6/10 değişmez.
- **Planlı rezerv:** tutarlı peşin aday + önceki yedi günde gözlenmiş taleplerden en sık üç aileye median talep miktarı hedeflenir. İlk gün görünür katalogdan sabit küçük sepet kullanılır. Sabah hazırlık bütçesi kasanın en fazla %25'i; yedi günlük gerçek işletme gideri nakitte tutulur. Gelecekteki RNG okunmaz.
- **Karma meslek:** tutarlı peşin satışa, yalnız geçerli/pozitif katkılı/riski en fazla %20 olan atölye teklifleri ve testlerden sonra temkinli ekspertiz eklenir. Hazır işler gerçek teslim komutuyla teslim edilir; hatalar ve tazminatlar korunur. Müşteri ürünü alımları yapılmaz.
- **Personel/bulk:** rezerv + karma meslek; yalnız mevcut 3/6/10 seviyelerinde açılan personel, yedi günlük gider rezervi varsa tutulur. Roller sırasıyla atölye/satış/karşılama; gerçek ücret, personel satış ve doğal bulk talep kuralları kullanılır. Gizli otomatik tedarik yoktur.

Hiçbir politikada reklam ödülü, geçici personel açılışı, offline satış, yeni para, öğrenilmiş yetenek veya gizli müşteri ödeme tavanı/fair-value oracle'ı kullanılmaz. Yetenek puanları ölçülür ama harcanmaz; bu, optimum oyuncu stratejisi değil kontrollü kıyaslamadır.

Aday yükseltmeler yalnız harness içinde aday kapılarla değerlendirilir; yatırım yine üretim `applyTransaction`, kapasite/gider yine `applyTierGrants` üzerinden geçer. Üretim config/state/UI değiştirilmez. 3/4/6 ve 3/5/7 alternatif seviye eşikleri yalnız mevcut kariyer fotoğraflarında hazır-olma gözlemcisidir; farklı yükseltme zamanının bütün gelecekteki ekonomisi simüle edilmiş sayılmaz.

## Kesin XP hesabı

Kaynak: `balance.ts:864`, `settlement.ts:562`. Yeni bir standart manuel satış çoğunlukla 55 XP verir; %8 üstü marj bonusu, testler ve meslek XP'si bu örneği değiştirir.

| Seviye | Birikimli XP | Yalnız 55 XP satışla gereken başarılı satış |
|---|---:|---:|
| 2 | 580 | 11 |
| 3 | 1.700 | 31 |
| 4 | 3.720 | 68 |
| 5 | 7.000 | 128 |
| 6 | 11.900 | 217 |
| 7 | 18.780 | 342 |
| 8 | 28.000 | 510 |
| 9 | 39.920 | 726 |
| 10 | 54.900 | 999 |

Mevcut mağaza 2/3/4 aynı anda seviye 3/6/10, kapanmış işlem 18/70/180, servet 600 bin/2,2 milyon/7 milyon ve yatırım 220 bin/850 bin/2,6 milyon ister; ayrıca itibar, güven ve tanınan müşteri kapıları vardır (`store-tiers.ts:86`). Personel sayısı 1/2/3 için de seviye 3/6/10 aranır, ancak mağaza kademesine bağlı değildir (`v5-rules.ts:12`). Aylık toplam maaş 40/90/150 bin, günlük yaklaşık 1.333/3.000/5.000 TL'dir; mağaza giderine eklenir.

Ustalık puanları XP'den ayrıdır: 5/15/30/50/80/120 benzersiz, tamamlanmış, pozitif katkılı nitelikli iş altı puan verir (`skill-tree.ts:24,64`). Doğru ücretli ekspertiz ve başarılı kârlı servis teslimi de iş sayabilir; personel satışları saymaz. Bu nedenle “120 iş = 120 satış = belirli seviye” genellemesi yapılamaz.

## İlk temel ölçüm

1.000 seed × iki mevcut politika × 42 oyun günü tamamlandı. 6.000 nakit/nonnegative/idempotency kontrolü geçti. Kaynak hashleri çalışma boyunca değişmedi.

Vade-seçenekli politikada 42 gün sonunda mağaza 3 için güven kapısı **1.000/1.000** kariyerde hâlâ kapalıydı; seviye 6 kapısı yalnız **2/1.000**, servet kapısı **45/1.000** kariyerde kapalıydı. Mağaza 4 için güven, seviye ve servet kapıları **1.000/1.000** kariyerde kapalıydı. Bu son horizon sağ sansürdür; kariyerin hiçbir zaman büyüyemeyeceği veya belirli insan süresinde büyüyeceği anlamına gelmez.

Route teşhisi üretim koduyla aynı sonucu açıklar: peşin pool alışları güven kazandırmaz; vade seçeneği ise kasa yettiği hâlde meaningful işlem güvenini 65'e kadar büyütebilir. 70/82 güven kapıları bu iki olağan nakit ağırlıklı politikayı gerçek borç/ödeme geçmişine zorlar. Global XP'yi azaltmak bu kapıyı çözmez.

## Dört politika aday sonuçları

Her sütun 1.000 kariyerdir. Adayların hepsinde mağaza güven kapıları **58/62/65**, mağaza seviyeleri **3/6/10**, personel seviyeleri **3/6/10** olarak tutuldu. Kaynaklar koşu boyunca değişmedi; 12.000 ek invariant kontrolü geçti. Hiçbir kariyer nakit/gün-kapanışı yetersizliği nedeniyle durmadı.

| 42 günlük sonuç | Tutarlı hızlı stok | Planlı rezerv | Karma meslek | Personel/bulk |
|---|---:|---:|---:|---:|
| Cadde'ye gerçekten yükselen | 1.000 | 1.000 | 1.000 | 1.000 |
| AVM'ye gerçekten yükselen | 956 | 946 | 970 | 952 |
| Flagship'e yükselen | 0 | 0 | 0 | 0 |
| Cadde ilk gün P10 / median / P90 | 2 / 3 / 3 | 2 / 3 / 3 | 2 / 2 / 3 | 2 / 2 / 3 |
| AVM ilk gün P10 / median / P90, ulaşanlarda | 20 / 23 / 29 | 22 / 25 / 30 | 19 / 22 / 27 | 20 / 24 / 30 |
| Son net servet median, TL | 2.735.361 | 2.443.124 | 2.933.165 | 2.516.490 |
| Son kasa median, TL | 2.558.089 | 2.191.758 | 2.764.261 | 2.288.023 |
| Gerçekleşmiş katkı/kâr median, TL | 2.967.503 | 2.690.273 | 3.172.961 | 2.870.257 |
| Manuel başarılı satış median | 454 | 445 | 455 | 443 |
| Bulk satış median | 60 | 59 | 60 | 59 |
| Son seviye P10 / median / P90 | 7 / 7 / 7 | 7 / 7 / 7 | 7 / 8 / 8 | 7 / 8 / 8 |
| Seviye 6'ya ulaşan | 998 | 998 | 999 | 999 |
| Seviye 8'e ulaşan | 2 | 2 | 822 | 734 |
| Seviye 10'a ulaşan | 0 | 0 | 0 | 0 |
| 120 nitelikli işe ulaşan | 1.000 | 999 | 1.000 | 1.000 |

İlk ustalık puanı tüm kariyerlerde birinci oyun gününde geldi. Saf satışta seviye 3 median 31 satışta; karma/personel politikalarında 29 manuel satışta geldi. İkinci personelin seviye 6 erişimi saf satışta median **20. oyun gününde /217 satışta**, karma meslekte **17. günde /185 manuel satışta**, personel politikasında **17. günde /184 manuel satışta** oluştu. Mesleklerin mevcut XP katkısı global XP değişmeden gerçekten ilerleme sağlar.

Karma meslekte median **61 kabul edilen /58 teslim edilen servis**, **3 servis hatası**, **23 ücretli ekspertiz /25 doğru rapor** görüldü. Personel politikasında median **iki personel**, **63 kabul /61 teslim**, **3 servis hatası** ve **iki gerçek personel satışı** vardı. Personel satışı P10/P90 **0/4** idi; ücret ve stock-only kuralı gerçekten uygulandı. Bu politika ilk iki personeli kapsar; üçüncü personel bu horizon içinde seviye 10'a ulaşılmadığı için doğrulanmış kariyer açılımı değildir.

Rezerv politikasında median **71 sabah hazırlık alımı** yapıldı. Rezervin median serveti anlık tedarikten düşüktü; bu hazırlığın kesin kazanç, garanti ilerleme veya gizli ödül gibi sunulmaması gerektiğini destekler. Personelin hazır stoktan satış yapabilmesi mevcut doğal bağlantıdır. Personel/bulk ve karma meslek arasındaki fark yalnız personelin ROI'si değildir: rezerv, farklı teslim/stock maliyetleri ve maaşlar birlikte değişir.

### Seviye kapısının gerçekten tek engel olduğu kariyerler

| En az bir gerçek hedef fotoğrafında seviye tek eksik kapı | Hızlı stok | Rezerv | Karma | Personel |
|---|---:|---:|---:|---:|
| Cadde seviye 3 | 999 | 1.000 | 998 | 997 |
| AVM seviye 6 | 81 | 28 | 6 | 1 |
| Flagship seviye 10 | 0 | 0 | 0 | 0 |

Cadde'deki kısa seviye bekleyişi erken gerçek çalışma hedefidir: yalnız 18 kapanmış işlem değil, çoğunlukla 31 satış gerekir. AVM'de XP'nin tek engel olması saf satışta en fazla %8,1, karma/personelde %0,6/%0,1 kariyerde en az bir kez görüldü. **3/4/6 ve 3/5/7 gözlemcilerinin AVM reach'i ve P10/median/P90 günleri mevcut 3/6/10 ile aynı çıktı**; bu, her tekil seed'in aynı anda açıldığı iddiası veya alternatif ekonominin tam simülasyonu değildir. Az sayıdaki geçici seviye bekleyişini kaldırmak için bütün kariyer XP'sini hızlandırmak gerekmez.

Flagship'te bütün politikaların **1.000/1.000** kariyerinde 7 milyon servet kapısı da horizon sonunda kapalıydı; yatırım nakdi 2,6 milyon kapısı da sırasıyla 524/769/387/723 kariyerde kapalıydı. Hiçbir seed'de diğer bütün Flagship kapıları hazırken yalnız seviye 10 engeli gözlenmedi. **Bu veriden seviye 10'u düşürme kararı çıkarılamaz.** Tam ileri kariyer doğrulaması için finansal hazır-olmaya ulaşan daha uzun horizon ayrıca ölçülmelidir.

“Son servet kapısı kapalı” sayısı “hiç yükselmedi” sayısı değildir: AVM yatırımı gerçekten 850 bin nakit harcar; daha önce uygun olan kariyerin serveti yatırım sonrasında eşik altına inebilir. Bu nedenle ulaşım ölçüsü geçmişteki gerçek `upgrade` işlemi, son ekonomik durum ölçüsü ise ayrı fotoğraftır.

## Önerilen muhafazakâr karar ve riskler

1. **Global XP, yetenek puanları, mağaza 3/6/10 ve personel 3/6/10 değişmesin.** Aday cohort, mevcut seviye 6'nın çoğunlukla sermaye hazır olmadan kazanıldığını ve karma mesleğin zaten daha hızlı XP sağladığını gösterdi. 3/4/6 veya 3/5/7 seviye eşikleri mevcut kapital kapılarıyla anlamlı median AVM farkı vermedi; seviye 10 için veri sağ sansürlüdür.
2. **Trust 58/62/65 + mevcut cap65, measured minimum değişiklik adayıdır.** Zorunlu borç geçişini kaldırır; dört politikada gerçek yatırım/overhead ile ulaşılabilir Cadde ve AVM üretir. Nihai karar root'a aittir. Bu açık tasarım tercihidir: `WHOLESALE` açıklamasındaki “üst kademeler için vade gerekir” ifadesi yeni tercihte geçerli olmaz. Mevcut meaningful filtre (güncel limitin %25'i), +1 ve cap65 korunmalıdır. Peşin/vadeli yollar aynı alıma iki kez katkı vermemelidir. Mevcut geri ödemeler güveni/limiti artırmaya devam eder.
3. **Sayaçlar eşdeğer değildir.** Kapanmış işlem `price>0` defter satırıdır: edinim, manuel satış, personel ve tasfiye de sayabilir; çok kalemli edinim tek ziyaret sayısı değildir. Tanınan müşteri kaydı selamlaşmada açılır, sadakat değildir (`store-growth.ts:38`, `gameStore.ts:greetCustomer`). XP bugünkü kodda zararına satışa veya yanlış/ödenmeyen ekspertize de verilebilir; ustalık bunları pozitif/doğru iş olarak saymaz. Bu pakette gizli XP düzeltmesi önerilmez.
4. **Para ve sahiplik geriye dönük değiştirilmemeli.** Yeni daha düşük kapılar eski kayıtta yalnız yeni uygunluğu açmalı; otomatik ücretsiz mağaza, geçmiş para iadesi, XP yeniden yazımı veya personel sayısı kesintisi üretmemelidir. Mevcut geçici üçüncü personel süresi ve atanmış atölye işleri korunmalıdır. Eski kayda meaningful alışları yeniden oynatıp güven vermek çift sayım riskidir; yalnız yeni canonical alışlar katkı vermelidir.
5. **Exploit sınırları izlenmeli.** Çok küçük tekrarlar filtre altı kalmalıdır; meaningful lot bölme cap65'e çabuk ulaşabilir ama mevcut diğer mağaza kapıları ve gerçek stok maliyeti korunur. Her küçük gerçek faturanın zamanında ödemesi +4 güven verdiğinden borç döngüsü farming riski zaten vardır; yeni kredi öğretimi bunu ödüllendirmemelidir. Yalnız snapshot gözlemcisine dayanarak seviye10'u indirmek ya da ilk oturum garantisi yazmak yeterli kanıt değildir.

## Kaynak/provenans

Git HEAD: `6913b6ab4b1ebe354faebc019ce04ab0c4472f54` + çalışma ağacındaki 1.3.0 salt-okunur rapor/state entegrasyonu.

İlk temel ölçüm SHA256: `balance.ts a14ccb7a…`, `store-tiers.ts 64df2cb4…`, `v5-rules.ts adfe11fd…`, `settlement.ts 84c2fb21…`, `store-growth.ts bf3e13f7…`, `wholesaler.ts 3405a840…`, `pool-supply.ts b86384a8…`, `financed-pool-supply.ts 95f6d977…`, `gameStore.ts f68da346…`.

İkinci koşu salt-okunur günlük ilerleme bazını ekleyen state/settlement sürümünde yürüdü; ekonomik config/XP/tedarik kuralları aynı tutuldu. `sourceFilesUnchangedDuringRun=true`. 4.000 kariyerin 12.000 kontrolü geçti. Hesaplama wall-time 697.701 ms idi; bu oyuncu oturumu süresi değildir.

İkinci koşunun SHA256 kimlikleri:

```text
src/domain/balance.ts               a14ccb7ae34de0c3faa35095ab67479d626779abeb47f7c0efc146e8b6745070
src/data/store-tiers.ts             64df2cb4f22c29cd4f476da8128edbf5e51e5ba4886068114135ed9145a7af42
src/domain/v5-rules.ts              adfe11fd69ea56c3bef9190c55b4f7ff160112f45dafe90afcd55b723df951c2
src/domain/settlement.ts            4709175c8e21909d5c47c69c0f310fcc176b07bfbef82b072c4936f79e5b9d94
src/domain/store-growth.ts          bf3e13f7332dde26c8421093ba35c86a4b5d227fc5f6dfd837f77cf2e610b79a
src/domain/wholesaler.ts            3405a840496874b98e3ee3c85ec3c259f67971f6198be5a17e01bb4b6954adf8
src/domain/pool-supply.ts           b86384a8ca93b4132cdbeecd72f3e5b3d02597442533961f8eccabdffa8cc3e2
src/domain/financed-pool-supply.ts   95f6d9775478623584024f3157560a2c55e3c89c2a80ddaefd0da9409f5ed78d
src/state/gameStore.ts              2d1769639b87bb17474a89c8ad3e01f92566ce5ae7e7848306e323c6d0d44fca
```

Script aynı seed/policy koşulunu güncel gerçek engine'e karşı yeniden çalıştırılabilir tutar. Üretim kalibrasyonu sonradan değişirse yeni kaynak hashleri/yeni sonuçlar ayrı cohort olarak okunmalıdır; eski baseline'ın aynısını yeni ekonomiyle elde ettiği iddia edilmez. Candidate trust adapter'ı üretim peşin trust fix'i sonrasında ikinci kez +1 vermeyecek şekilde idempotenttir.

Son küçük doğrulama: `node --check` geçti. Aynı iki seed × dört politika × yedi oyun günü iki kez çalıştırıldı; politika sonuçları birebir aynı, her tekrarda 24 invariant geçti, kaynak hashleri iki tekrarda da sabitti. Bunlar ana 18.000 kontrolden ayrı 48 replay kontrolüdür. Tam üretim test/lint/build ve UI/native doğrulaması ana entegrasyonun sorumluluğundadır.
