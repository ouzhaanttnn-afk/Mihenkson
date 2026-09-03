/**
 * İngilizce sözlük. Anahtar = Türkçe metnin kendisi (bkz. `index.ts`).
 *
 * SÖZLÜKTE OLMAYAN METİN TÜRKÇE KALIR — bu bir hata değil, tasarlanmış geri
 * dönüş yoludur. Eksikler `npm run i18n` ile listelenir.
 *
 * ÇEVİRİ İLKELERİ (kuyumcu dili, birebir sözlük değil):
 *   · "Sarrafiye" = bullion — külçe, altın para, gram altın.
 *   · "İşçilikli" = crafted — el emeği taşıyan takı.
 *   · "Mihenk" = touchstone; oyunun adı da oradan gelir, çevrilmez.
 *   · "HAS" = fine gold (24 ayar saf altın), sektör terimi.
 *   · "Ayar" = karat · "milyem" = fineness · "kondisyon" = condition.
 *   · "Sarraf" = bullion dealer; başlıklarda "jeweller" daha doğal durur.
 *   · KISA ETİKET KISA KALIR. "Değişiklikleri Kaydet" → "Save Changes";
 *     düğme metni uzarsa 390 px'lik ekranda kırılır, çeviri de arayüz
 *     kırılmasıdır.
 *
 * BAZI ANAHTARLAR KODDA `t('...')` OLARAK GEÇMEZ: veri dizilerindeki
 * etiketler çizim anında `t(label)` ile çevriliyor (alt navigasyon, aşama
 * şeridi, hafta günleri, piyasa rejimleri). `tools/i18n-keys.mjs` onları
 * göremez; bu yüzden aşağıda kendi başlıkları altında elle tutuluyorlar.
 */

export const EN: Record<string, string> = {
  // ——— Alt navigasyon (BottomNav · t(label)) ———
  'Dükkan': 'Shop',
  'Stok': 'Stock',
  'Atölye': 'Workshop',
  'Market': 'Market',
  'İşletme': 'Business',
  'Ana navigasyon': 'Main navigation',
  '{n} bekleyen müşteri': '{n} customers waiting',
  '{n} teslim bekleyen iş': '{n} jobs awaiting delivery',

  // ——— Üst şerit ———
  'Sv': 'Lv',
  'Gün': 'Day',
  'Nakit': 'Cash',
  'Oyun hızı': 'Game speed',
  '{n}x hız': '{n}x speed',
  '{n}x hızı aç': 'Unlock {n}x speed',
  'Ayarlar': 'Settings',
  'Profili düzenle — {ad}': 'Edit profile — {ad}',
  'Gün {gun}, {haftaGunu}, saat {saat}': 'Day {gun}, {haftaGunu}, {saat}',

  // ——— Hafta günleri (calendar.ts · t(weekdayLabel(...))) ———
  'Pazartesi': 'Monday',
  'Salı': 'Tuesday',
  'Çarşamba': 'Wednesday',
  'Perşembe': 'Thursday',
  'Cuma': 'Friday',
  'Cumartesi': 'Saturday',
  'Pazar': 'Sunday',
  'Pzt': 'Mon',
  'Sal': 'Tue',
  'Çar': 'Wed',
  'Per': 'Thu',
  'Cum': 'Fri',
  'Cmt': 'Sat',
  'Paz': 'Sun',

  // ——— Piyasa şeridi ve rejimler ———
  'HAS Altın': 'Fine Gold',
  'Gram Altın': 'Gram Gold',
  'Çeyrek': 'Quarter',
  'Gümüş': 'Silver',
  'Dolar': 'Dollar',
  'Euro': 'Euro',
  'Kapalı': 'Closed',
  'Açık': 'On',
  'Piyasa ekranını aç': 'Open market screen',
  'Piyasa şeridi — kaydırarak tüm varlıkları görün':
    'Market ticker — scroll to see every asset',
  'Düğün Sezonu': 'Wedding Season',
  'Piyasa Rallisi': 'Market Rally',
  'Kur Sakinleşmesi': 'FX Calm',
  'Sahte Ürün Dalgası': 'Counterfeit Wave',

  // ——— Aşama şeridi (StageStrip · t(step.label)) ———
  'İncele': 'Inspect',
  'Değerle': 'Appraise',
  'Pazarlık': 'Haggle',
  'Tanıla': 'Diagnose',
  'Teklif': 'Quote',
  'Söz': 'Promise',
  'Sonuç': 'Result',
  'Kuyruk': 'Queue',
  'Paket': 'Bundle',
  'Rapor': 'Report',
  'Test': 'Test',
  'İşlem aşaması': 'Transaction stage',

  // ——— Araç rayı / öğretim ———
  'Bağlamsal araç rayı': 'Contextual tool rail',
  'Bu aşamada araç yok': 'No tools at this stage',
  'Öğretim ipucu': 'Tutorial hint',

  // ——— Ayarlar ———
  'Profil': 'Profile',
  'Düzenle': 'Edit',
  '{ad} · ad ve portre': '{ad} · name and portrait',
  'Öğretici ipuçları': 'Tutorial hints',
  'Açık — yeni durumlarda ipucu çıkar': 'On — hints appear in new situations',
  'Ses': 'Sound',
  '· işlem ve gün sesleri': '· transaction and day sounds',
  'Titreşim': 'Vibration',
  '· işlem ve gün olayları': '· transaction and day events',
  'Bu cihaz titreşimi desteklemiyor': 'This device does not support vibration',
  'Ses düzeyi': 'Volume',
  'Ses kapalıyken ayarlanamaz': 'Cannot be set while sound is off',
  'Dil': 'Language',
  'Arayüz metinleri': 'Interface text',
  'Para birimi': 'Currency',
  'Yalnız gösterim · 1 $ = {rate} ₺': 'Display only · $1 = {rate} ₺',
  'Yeni oyun': 'New game',
  'Kaydı siler · geri alınamaz': 'Deletes the save · cannot be undone',
  'Sil': 'Delete',
  'Kaydı sil': 'Delete save',
  'Kayıt silinecek. Ekrandaki oyun kapanana kadar durur; yeni oyun bir sonraki açılışta başlar. Geri alınamaz.':
    'The save will be deleted. The game on screen keeps running until you close it; a new game starts at the next launch. This cannot be undone.',
  'Vazgeç': 'Cancel',
  'Kapat': 'Close',
  'İptal': 'Cancel',

  // ——— Profil / karşılama ———
  'Hoş geldin, sarraf': 'Welcome, jeweller',
  'Profili Düzenle': 'Edit Profile',
  "Tezgâhın arkasına geçmeden önce: dükkânın adı ne olsun, sen kimsin? İkisini de sonradan Ayarlar'dan değiştirebilirsin.":
    'Before you step behind the counter: what is your shop called, and who are you? You can change both later in Settings.',
  'Dükkan Adı': 'Shop Name',
  'örn. Alvera': 'e.g. Alvera',
  'İsim koyunuz — örn. Alvera Kuyumculuk': 'Enter a name — e.g. Alvera Jewellers',
  'Dükkânın adını yaz — sonuna "{ek}" kendiliğinden eklenir.':
    'Type your shop name — "{ek}" is appended automatically.',
  'Karakter': 'Character',
  'Karakter {no}': 'Character {no}',
  'Kuyumcu portresi': 'Jeweller portrait',
  'Dükkânı Aç': 'Open the Shop',
  'Değişiklikleri Kaydet': 'Save Changes',
  'Profil kaydedilemedi.': 'Could not save profile.',

  // ——— Gün kapanışı ———
  'Gün {gun} · {haftaGunu} kapandı': 'Day {gun} · {haftaGunu} closed',
  'Gerçekleşmiş kâr': 'Realised profit',
  'Günlük gider': 'Daily overhead',
  'Personel payı (gidere dahil)': 'Staff share (in overhead)',
  'Şahsi bakım (gidere dahil)': 'Personal upkeep (in overhead)',
  'Terazi bakım gideri': 'Scale servicing cost',
  'Bakım borcuna aktarıldı': 'Deferred to servicing debt',
  'Eski bakım borcu ödendi': 'Old servicing debt paid',
  'Kasa değişimi': 'Cash change',
  'Bunun {tutar} kadarı stoğa girdi — harcanmadı, mala döndü.':
    '{tutar} of it went into stock — not spent, turned into goods.',
  'Kapanış nakdi': 'Closing cash',
  'Stok net çıkış farkı': 'Stock net exit spread',
  'Nakit Durumu': 'Liquidity',
  'Kaçırılan Misafir': 'Guests missed',
  'Yeni güne başla': 'Start the new day',
  'Günü şimdi kapat?': 'Close the day now?',
  'Saat {saat}.': "It's {saat}.",
  'Gün daha bitmedi; kapatırsan bugün başka müşteri gelmez.':
    'The day is not over; if you close now no more customers come today.',
  'Bugünün işlemleri kapanacak.': "Today's transactions will be settled.",
  'Günlük gider {tutar} her hâlükârda işler.':
    'The daily overhead of {tutar} is charged either way.',
  'Bu tutarın {tutar} kadarı sahip olduğun şahsi prestij varlıklarının günlük bakımıdır.':
    '{tutar} of that is the daily upkeep on the personal prestige assets you own.',
  'Bugün 30 günlük terazi bakım günü: {tutar}.':
    "Today is the 30-day scale servicing day: {tutar}.",
  'Nakit yetmezse bakım üç gün vadeli borca aktarılır.':
    'If cash falls short, servicing is deferred to a three-day debt.',
  'Vadesi gelen terazi bakım borcu: {tutar}.': 'Scale servicing debt now due: {tutar}.',
  'Yarın {haftaGunu} · dükkân {dukkan} · piyasa {piyasa}.':
    'Tomorrow is {haftaGunu} · shop {dukkan} · market {piyasa}.',
  'açık': 'open',
  'kapalı': 'closed',
  'kapalı; sonraki açılış {gun}': 'closed; next open {gun}',
  'Cuma kapanışından pazartesi açılışına kadar piyasa fiyatı donar; hafta sonu haberleri pazartesi açılışında tek seferde fiyatlanır.':
    'Prices freeze from Friday close to Monday open; the weekend news is priced in all at once at the Monday open.',
  '{n} bekleyen müşteri ayrılacak.': '{n} waiting customers will leave.',
  'Bu kişiler kapasite nedeniyle kaçırılan misafir sayısına eklenmez.':
    'They are not counted as guests missed for capacity reasons.',
  'Günü Bitir': 'End the Day',

  // ——— Ortak ———
  'adet': 'pc',
  'piyasa': 'market',

  // ——— Dükkan ekranı ———
  'Dükkan kimliği ve mali durum': 'Shop identity and finances',
  'Dükkan ve finans özetini göster': 'Show shop and finance summary',
  'Dükkana Dön': 'Back to Shop',
  'Dükkân ve müşteri akışı kapalı': 'Shop and customer flow closed',
  'Müşteri bekleniyor': 'Waiting for a customer',
  'Sıradaki müşteri': 'Next customer',
  'Sonraki Müşteri': 'Next Customer',
  'Bekleyen Müşteriler': 'Waiting Customers',
  'Kuyruğu daralt': 'Collapse the queue',
  'Müşteri karşılandığında araçlar burada': 'Tools appear here once a customer is served',
  'Henüz ölçüm yok — raydan araç seçin': 'No measurement yet — pick a tool from the rail',
  'İnceleme aracı yok': 'No inspection tool',
  'Satacak ürünün yok. Satış yapabilmek için önce stok oluştur.':
    'You have nothing to sell. Build stock first.',
  'İlk Stoğunu Al': 'Buy Your First Stock',
  'İlk Sarrafiyeni Al': 'Buy Your First Bullion',
  'Stokta sunulacak ürün yok.': 'No stock to offer.',
  'Bu talebi karşılayacak mal yok.': 'You have nothing that meets this request.',
  'Talep tam karşılandı.': 'The request is fully met.',
  'Fiyat cuma kapanışında donuk. Stok, atölye ve toptancı açık.':
    'Prices are frozen at the Friday close. Stock, workshop and wholesaler stay open.',
  '★ Vitrin Müşterisi': '★ Showcase Customer',
  'Tanıdık müşteri': 'Returning customer',
  'Müşteriyi Gönder': 'Send the Customer Away',
  'İlgilenmiyorum': 'Not interested',
  'Semt itibarı': 'Neighbourhood standing',

  // ——— Müşteri niyeti ———
  'Altın alan': 'Gold buyer',
  'Dükkandan ürün almak istiyor': 'Wants to buy from the shop',
  'Ürün bozdurmak istiyor': 'Wants to sell an item',
  'Servis / tamir istiyor': 'Wants service / repair',
  'Ekspertiz danışıyor': 'Asking for an appraisal',
  'satmıyor': 'not selling',
  'satılacak': 'for sale',
  'alınacak': 'to buy',

  // ——— İnceleme / değerleme ———
  'Doğrulanan alan': 'Fields verified',
  'Doğrulama bekliyor': 'Awaiting verification',
  'Doğrulandı': 'Verified',
  'Kaçırılan sinyal': 'Missed signal',
  '· çelişkili sinyal': '· conflicting signal',
  'Beyan ayarı': 'Declared karat',
  'Gerçek değer': 'True value',
  'Gerçeğe fark': 'Gap to truth',
  'Adil değer': 'Fair value',
  'Değer bandı': 'Value band',
  'Değerleme bandı yok': 'No valuation band',
  'Tahmin bandı': 'Estimate band',
  'Tahmini Değer Aralığı': 'Estimated Value Range',
  'Ölçülen aralık': 'Measured range',
  'Ölçüme Geç': 'Go to Measurement',
  'Değerlemeye Geç': 'Go to Appraisal',
  'Yine de değerle': 'Appraise anyway',
  'Test yapmadan ilerle': 'Continue without testing',
  'Önce ilgili testi yapın': 'Run the relevant test first',
  'Ek Test': 'Extra Test',
  'Ek test': 'Extra test',
  'Hata riski': 'Error risk',
  'Hatalı sonuç': 'Faulty result',
  'Mihenk taşı ayar testinin mevcut doğruluğu': 'Current accuracy of the touchstone karat test',
  'Ayar Ustalığı': 'Karat Mastery',
  'Ayar Ustalığı kademeleri': 'Karat Mastery tiers',
  'Değerleme atlandı · teklif aralığı daha belirsiz ve riskli olabilir.':
    'Appraisal skipped · the offer range may be looser and riskier.',
  'Metal Değeri': 'Metal Value',
  'Metale bağlı değer': 'Metal-linked value',
  'İşçilik': 'Craft',
  'İşçilik Değeri': 'Craft Value',
  'Taş': 'Stone',
  'Taş Değeri': 'Stone Value',
  'Nadirlik Primi': 'Rarity Premium',
  'Kondisyon / Risk': 'Condition / Risk',
  'İç yapı': 'Inner structure',
  'Ağırlık': 'Weight',
  'Paket gramı': 'Bundle grams',
  'Ürün': 'Item',
  'Parça': 'Piece',
  'Adet': 'Qty',
  '0,1 g': '0.1 g',
  'Ata lira': 'Ata coin',
  'tam altın': 'full coin',
  'yarım altın': 'half coin',
  'çeyrek altın': 'quarter coin',

  // ——— Çıkış planı / tez ———
  'Seçili tez': 'Chosen plan',
  'Çıkış planı:': 'Exit plan:',
  'Konum ve çıkış planı': 'Location and exit plan',
  'Kanal önerisi': 'Channel suggestion',
  'Öneri': 'Suggestion',
  'Öneri ile devam edilecek': 'Continuing with the suggestion',
  'Kâr / Zarar (öneri)': 'Profit / Loss (suggested)',
  'Çıkış planı, ürünün müşteri işleminde değerlendirilip bir satış kanalı seçildiğinde atanır.':
    'The exit plan is assigned once the item is appraised in a customer transaction and a sales channel is chosen.',

  // ——— Pazarlık ———
  'Pazarlığa Geç': 'Go to Haggling',
  'Alış tavanı': 'Buy ceiling',
  'Alış tavanına göre': 'Against the buy ceiling',
  'Alış Maliyetim': 'My Acquisition Cost',
  'Güncel Metal Değeri': 'Current Metal Value',
  'Analize Göre Fark': 'Gap vs. Analysis',
  'Referansa Göre Fark': 'Gap vs. Reference',
  'Piyasa Referans Alış': 'Market Reference Bid',
  'Piyasa Referans Satış': 'Market Reference Ask',
  'Piyasa birim referansı': 'Market unit reference',
  'İstediğin Fiyat': 'Your Asking Price',
  'İstediğiniz fiyat': 'Your asking price',
  'Senin Teklifin': 'Your Offer',
  'Seçili teklif': 'Selected offer',
  'Teklif tutarı': 'Offer amount',
  'Teklif tutarı sıfırdan büyük olmalı.': 'The offer must be greater than zero.',
  'Teklifi artır': 'Increase the offer',
  'Teklifi azalt': 'Decrease the offer',
  'Bir artır': 'One more',
  'Bir azalt': 'One less',
  'Teklifi Gönder': 'Send the Offer',
  'Teklif Hazırla': 'Prepare an Offer',
  'Karşı Teklif': 'Counter-Offer',
  'Karşı teklifi': 'the counter-offer',
  'Son teklif': 'Final offer',
  'Son teklifi': 'the final offer',
  'Son Teklifi Kabul Et': 'Accept the Final Offer',
  'Kabul Et': 'Accept',
  'Kabul edilirse ödenecek': 'Payable if accepted',
  'Geri dönüş': 'Way back',
  'Yok — kabul veya red': 'None — accept or refuse',
  'Aynı teklif tekrarlandı — yeni şans üretmez':
    'Same offer repeated — it creates no new chance',
  'band altı': 'below band',
  'band içi': 'inside band',
  'band üstü': 'above band',
  'Vitrin satış hesabı': 'Showcase sale accounting',
  'Fiyata Geç': 'Go to Pricing',
  'Fiyatı Ver': 'Set the Price',
  'Tatlı Dil & Esnaf Nüktesi': 'Sweet Talk & Trader Wit',

  // ——— Paket ———
  'Paketi Değerle': 'Appraise the Bundle',
  'Paketi Düzenle': 'Edit the Bundle',
  'Paketi boşalt': 'Empty the bundle',
  'Pakete bak': 'View the bundle',
  'Müşterinin ürünleri': "The customer's items",
  'Müşteriden aldığınız her ürün buraya düşer ve çıkış planı burada yönetilir.':
    'Every item you take from a customer lands here, and its exit plan is managed here.',
  'Müşteride': 'With the customer',
  'Henüz ürün seçilmedi': 'No item selected yet',
  'Henüz seçilmedi.': 'Not selected yet.',
  'Seçilen': 'Selected',

  // ——— Servis / atölye ———
  'Servis kuyruğu, kapasite ve teslim sözleri': 'Service queue, capacity and delivery promises',
  'Servis türü seçilmedi': 'No service type selected',
  'Raydan bir tür seçin': 'Pick a type from the rail',
  'Uygulanabilir servis yok': 'No applicable service',
  'Uygun servis bulunamadı': 'No suitable service found',
  'Bu ürüne uygulanabilir servis bulunamadı.': 'No service applies to this item.',
  'Tanı': 'Diagnosis',
  'Kendi Atölyem': 'My Own Workshop',
  'Kendi atölyem': 'my own workshop',
  'Dış Usta': 'Outside Master',
  'Dış usta': 'outside master',
  'Usta payı': "Master's share",
  'Ücret payı': 'Fee share',
  'Ek süre': 'Extra time',
  'Kapasite tüketimi': 'Capacity used',
  'Kalan kapasite': 'Capacity left',
  'Atölye kapasitesi': 'Workshop capacity',
  'Atölye kuyruğuna eklendi': 'Added to the workshop queue',
  'Atölyeyi Aç': 'Open the Workshop',
  'Yoğunluk risk etkisi': 'Load risk effect',
  'Teslim Sözü Ver': 'Promise a Delivery',
  'Teslim sözü': 'Delivery promise',
  "Teslim sözünü Karar Dock'unda ver": 'Give the delivery promise in the Decision Dock',
  'Teslime Hazır': 'Ready to Deliver',
  'Bugün Teslim': 'Delivered Today',
  'Bugün teslim sözü var': 'Promised for delivery today',
  'Yarın teslim sözü var': 'Promised for delivery tomorrow',
  'Söz verilen': 'Promised',
  'Kalan süre': 'Time left',
  'Süre': 'Time',
  'GECİKMİŞ': 'OVERDUE',
  'Kuyruk boş': 'The queue is empty',
  'İşi Kabul Et': 'Accept the Job',
  'İşi Reddet': 'Refuse the Job',
  'İş kabul edilmedi': 'Job not accepted',
  'İş emri': 'Work order',
  'İŞ EMRİ': 'WORK ORDER',
  'İş emri oluşturuldu': 'Work order created',
  'Başarılı': 'Successful',
  'Ücret': 'Fee',
  'Ücreti artır': 'Increase the fee',
  'Ücreti azalt': 'Decrease the fee',
  'Ücret ödenmedi': 'Fee not paid',
  'Ödenmedi': 'Unpaid',
  'tazmin ödenir': 'compensation is paid',
  'Net nakit': 'Net cash',
  'Net katkı': 'Net contribution',
  'net katkı': 'net contribution',
  'İlişki': 'Relationship',
  'İtibar': 'Reputation',

  // ——— Ekspertiz ———
  'Ekspertiz ücreti': 'Appraisal fee',
  'Ekspertiz tamamlandı': 'Appraisal complete',
  'Ekspertiz yapılmadı': 'No appraisal made',
  'Duruş seçilmedi': 'No stance selected',
  'Yukarıdan bir rapor duruşu seçin': 'Pick a report stance above',
  'Rapor Yaz': 'Write the Report',
  'Raporu Ver': 'Issue the Report',
  "Raporu Karar Dock'unda verin": 'Issue the report in the Decision Dock',
  'Gerekçe': 'Reasoning',
  'Sıkı': 'Strict',
  'Güvenli, güven −': 'Safe, trust −',
  'Güven +, risk yüksek': 'Trust +, high risk',
  'Güven': 'Trust',

  // ——— Stok ———
  'Stok Değeri': 'Stock Value',
  'Stok boş': 'Stock is empty',
  'Stok yok': 'No stock',
  'Stok ›': 'Stock ›',
  'Stoka Bak': 'View Stock',
  'Arka stok': 'Back stock',
  ' · arka stok': ' · back stock',
  'Vitrin / arka stok': 'Showcase / back stock',
  'Arka stokta yeni ürün ailesi için yer yok.':
    'No room in back stock for a new product family.',
  'Vitrinde bayatladı': 'Stale in the showcase',
  'Hızlı Stok': 'Quick Stock',
  'Hızlı stok ekranını kapat': 'Close the quick stock sheet',
  'Hızlı Çıkışta': 'On Fast Exit',
  'Dükkan ekranından ayrılmadan satılabilir sarrafiye oluştur. Kullanılabilir nakit:':
    'Build sellable bullion without leaving the shop screen. Cash available:',
  'Satın Al': 'Buy',
  'Satılacak': 'To sell',
  'Sarrafiyeyi nakde çevir': 'Turn bullion into cash',
  'Bozulacak sarrafiye yok.': 'No bullion to break.',
  'Bozdurulacak uygun sarrafiye yok.': 'No suitable bullion to sell off.',
  'Toptancıya satılabilecek sarrafiye yok.': 'No bullion the wholesaler will take.',
  'Toptancıya Sat': 'Sell to the Wholesaler',
  'Toptancı Hesabı': 'Wholesaler Account',
  'Ortak havuz': 'Shared pool',
  'HAS hesabı': 'Fine gold account',
  'HAS miktarı': 'Fine gold amount',
  'HAS işlem yönü': 'Fine gold trade direction',
  'HAS işlem onayı': 'Fine gold trade confirmation',
  'HAS değeri (realize değil)': 'Fine gold value (unrealised)',
  'Pozitif, geçerli bir miktar seçin. Gram altın hassasiyeti 0,1 g.':
    'Choose a positive, valid amount. Gram gold precision is 0.1 g.',
  'Tümü': 'All',
  'Kullanılabilir': 'Available',
  'Kullanılıyor': 'In use',
  'Mağaza': 'Store',

  // ——— Toptancı / esnaf ağı ———
  'Esnaf Ağı': 'Trade Network',
  'Esnaf ağı filtresi': 'Trade network filter',
  'Bu esnaf sarrafiye almıyor.': 'This trader does not buy bullion.',
  'Bu esnafın şu an verecek nakdi yok.': 'This trader has no cash to offer right now.',
  'Ağ kapasitesi': 'Network capacity',
  'Ağ kapasitesi dolu; önce açık borçlarınızı kapatın.':
    'Network capacity is full; clear your outstanding debts first.',
  'Ağ nakdi': 'Network cash',
  'Borç Al': 'Borrow',
  'Borç verebilen': 'Willing to lend',
  'Açık borç': 'Open debt',
  'Açık vade': 'Open term',
  'GECİKMİŞ borç': 'OVERDUE debt',
  'Tahsil edilecek': 'To be collected',
  'Tedarik limiti': 'Supply limit',
  'Toplam limit': 'Total limit',
  'Limit ve vade': 'Limit and terms',
  'Tamamı peşin': 'All cash',
  'Nakit yetersiz': 'Not enough cash',
  'Kasasındaki nakit': 'Cash on hand',
  'Tanıdıklardan gelen ciro': 'Turnover from regulars',
  'İlişkiler': 'Relationships',

  // ——— İşletme ekranı ———
  '← İşletme': '← Business',
  'Varlıklar': 'Assets',
  'Net servet': 'Net worth',
  'Yükümlülük': 'Liabilities',
  'Gerçekleşmiş kâr (bugün)': 'Realised profit (today)',
  'Stok net çıkış farkı (realize değil)': 'Stock net exit spread (unrealised)',
  'Altında kalmanın etkisi (realize değil)': 'Effect of holding gold (unrealised)',
  'Nakitte kalmanın fırsat maliyeti': 'Opportunity cost of holding cash',
  'Kâr / Zarar': 'Profit / Loss',
  'Nakit / Stok': 'Cash / Stock',
  'Günlük Akış': 'Daily Flow',
  'Gün / Saat': 'Day / Time',
  'Kapanış': 'Close',
  'Bugün': 'Today',
  'Şimdi': 'Now',
  'Satış olmadı': 'No sales',
  'Dağılım': 'Breakdown',
  'Piyasa Oynaklığı': 'Market Volatility',
  'Yeni günlük gider': 'New daily overhead',
  'günlük şahsi bakım': 'daily personal upkeep',
  'Personel sayısı': 'Staff count',
  'Personel onayı': 'Staff approval',
  'Pahalı satın alma': 'Expensive purchase',
  'Büyük alış öncesi hızlı likidasyon gerekebilir.':
    'A quick liquidation may be needed before a large purchase.',
  'İşlem yapılabilir ama tedarik ve büyük müşteri riski yükseliyor.':
    'You can still trade, but supply and big-customer risk are rising.',
  'düşük': 'low',
  'yüksek': 'high',
  'nötr': 'neutral',

  // ——— İşlem defteri ———
  'İşlem Defteri': 'Transaction Ledger',
  'İşlem tamamlandı': 'Transaction complete',
  'İşlem kapandı': 'Transaction closed',
  'İşlem kapanmadı': 'Transaction not closed',
  'İşlem yapılmadı': 'No transaction made',
  'Detayı kapat': 'Close the detail',
  'Henüz yok': 'Nothing yet',

  // ——— Kayıt ———
  'Kayıt': 'Save',
  'Şimdi Kaydet': 'Save Now',
  'Son Kaydı Geri Yükle': 'Restore the Last Save',
  'Son kayıt': 'Last save',
  'Kayıt zamanı': 'Saved at',
  'Eski kayıt': 'Older save',
  'Mevcut oyun': 'Current game',
  'Geri yükleme': 'Restore',
  'Evet, Geri Yükle': 'Yes, Restore',
  'Henüz kayıt yok': 'No save yet',
  'Henüz kayıt yok.': 'No save yet.',
  'Kayıt oluşturulamadı.': 'Could not create a save.',
  'Yüklenecek kayıt bulunamadı.': 'No save found to load.',
  'Kaydedilmemiş mevcut ilerleme kaybolacak. Son kaydı yüklemek istiyor musun?':
    'Unsaved progress will be lost. Load the last save?',
  'Gün sonunda otomatik · elle kaydet veya geri yükle':
    'Automatic at day end · save or restore by hand',
  'Gün sonunda otomatik, istediğin anda elle kayıt':
    'Automatic at day end, manual whenever you like',

  // ——— Kariyer / yetenekler ———
  'Kariyer / Yetenekler': 'Career / Talents',
  'Yetenek Ağacı': 'Talent Tree',
  'Yetenek ağacı': 'Talent tree',
  'Yetenek ağacını kapat': 'Close the talent tree',
  'Araç yol haritası': 'Tool roadmap',
  'Uzmanlık': 'Specialisation',
  'Seviye ilerlemesi': 'Level progress',
  'Başlangıç': 'Start',
  'Bu kademede açık': 'Unlocked at this tier',
  'Hazır değil': 'Not ready',
  'Hedef kilitli': 'Target locked',
  'Yetenek puanı ve kademe açma kuralları tanımlanana kadar bu ekran ilerlemeyi güvenli biçimde yalnız gösterir.':
    'Until talent points and tier-unlock rules are defined, this screen only displays progress — safely, and read-only.',

  // ——— Market ———
  'Market özeti': 'Market summary',
  'Market kategorileri': 'Market categories',
  'Market profil rozeti': 'Market profile badge',
  'Bu filtrede ürün yok': 'No items in this filter',
  'Başka bir filtre deneyin.': 'Try another filter.',
  'Kozmetik, prestij ve şahsi yaşam hedefleri': 'Cosmetic, prestige and personal-life goals',
  'Prestij verir · ticaret gücü vermez': 'Grants prestige · grants no trading power',

  // ——— Ortak ———
  'Devam Et': 'Continue',
  'Yok': 'None',

  // ——— Para birimi adları (CURRENCIES · t(cur.label)) ———
  'Türk Lirası': 'Turkish Lira',
  'ABD Doları': 'US Dollar',

  // ——— TERM tablosu (ui/terms.ts · t(TERM.x)) ———
  'Çıkış Planı': 'Exit Plan',
  'Çıkış': 'Exit',
  'Alış-Satış Farkı': 'Bid-Ask Spread',
  'Değer Güveni': 'Value Confidence',
  'Piyasa Havası': 'Market Mood',
  'Altında Kalma Riski': 'Gold-Holding Risk',
  'Toptancı Güveni': 'Wholesaler Trust',
  'Müşteri Güveni': 'Customer Trust',
  'Gerçek Durum': 'True State',

  // ——— Kalan arayüz metinleri ———
  'Anladım': 'Got it',
  'Öğretimi kapat': 'Turn off tutorials',
  'Dükkânı Canlandır': 'Liven Up the Shop',
  'Teslim Et': 'Deliver',
  'Öde': 'Pay',
  'En çok': 'At most',
  'Senin Analizin': 'Your Analysis',
  'Devredilen iş': 'Outsourced job',
  'Kendi tezgâhın dolduğunda işi devredebileceğin usta.':
    'The master you can hand work to when your own bench is full.',
  'Aşağıdaki raydan bir servis türü seçin.': 'Pick a service type from the rail below.',
  'Raporun ne kadar iddialı olacağını seçin.': 'Choose how bold the report should be.',
  'Yüksek ücret her müşteride geçmez; kabul etmezse rapor yine verilir, para gelmez.':
    'A high fee does not land with every customer; if they refuse, the report is still issued but no money comes in.',
  'Paylar band ortasına orandır; toplamları %100 olmak zorunda değildir.':
    'Shares are ratios to the band midpoint; they need not add up to 100%.',
  'Bu alım yüksek tutarlı. Nakit/vadeli dağılımını kontrol edip bir kez daha onayla.':
    'This is a large purchase. Check the cash/credit split and confirm once more.',
  'İş kabul edilmedi. Müşteri ürünüyle birlikte ayrıldı.':
    'The job was not accepted. The customer left with their item.',
  'Ekspertiz işi alınmadı. Müşteri ürünüyle birlikte ayrıldı.':
    'The appraisal was not taken. The customer left with their item.',
  '{varlik} {fiyat} — piyasa ekranını aç': '{varlik} {fiyat} — open the market screen',

  // ——— İşletme ekranı şablonları ———
  'Altın %{altin} · Nakit %{nakit}': 'Gold {altin}% · Cash {nakit}%',
  'Aylık {aylik} · Günlük {gunluk}': '{aylik} monthly · {gunluk} daily',
  'Kaçırılan Misafir: {n}': 'Guests missed: {n}',
  '{kademe} · {acik}/{toplam} koşul hazır': '{kademe} · {acik}/{toplam} conditions met',
  '{n} esnaf altın alıyor · borç yok': '{n} traders buying gold · no debt',
  '{n} esnaf altın alıyor · {tutar} açık borç': '{n} traders buying gold · {tutar} outstanding',
  '{n} kayıt · vaka özetleri': '{n} entries · case summaries',
  '{n} personel · Kapasite {kap} · Günlük {gunluk}':
    '{n} staff · Capacity {kap} · {gunluk} daily',
  '{rejim} · {n} varlık': '{rejim} · {n} assets',
  '{tutar} kullanılabilir · {gun} gün vade': '{tutar} available · {gun}-day terms',
  'İş Kuyruğu': 'Job Queue',
  'Kabul ettiğin servis işleri burada görünür. Gelir yalnız tamamlanan gerçek işlerden doğar.':
    'Service jobs you accept appear here. Income comes only from jobs actually completed.',

  // ——— Alan katmanı etiket haritaları (t(X_LABEL[...])) ———
  '8 Ayar': '8 Karat',
  '14 Ayar': '14 Karat',
  '18 Ayar': '18 Karat',
  '22 Ayar': '22 Karat',
  '24 Ayar': '24 Karat',
  '800 Gümüş': '800 Silver',
  '925 Gümüş': '925 Silver',
  'Kusursuz': 'Pristine',
  'İyi': 'Good',
  'Yıpranmış': 'Worn',
  'Hasarlı': 'Damaged',
  'Kırık': 'Broken',
  'Düşük': 'Low',
  'Orta': 'Medium',
  'Yüksek': 'High',
  'Makul': 'Fair',
  'Ölçülü': 'Measured',
  'Cömert': 'Generous',
  'Dikkat': 'Caution',
  'Sağlıklı': 'Healthy',
  'Çok likit': 'Very liquid',
  'Kırmızı risk': 'Red risk',
  'Tam istediği': 'Exactly what they want',
  'İlgili ürün': 'Related item',
  'Aradığı değil': 'Not what they seek',
  'Hızlı işlem': 'Fast transaction',
  'Kontrollü işlem': 'Controlled transaction',
  'Vitrin': 'Showcase',
  'Toptan': 'Wholesale',
  'Erit': 'Melt',
  'Servis': 'Service',
  'Ekspertiz': 'Appraisal',
  'AÇIK': 'OPEN',
  'KABUL': 'ACCEPTED',
  'RED': 'REFUSED',
  'SERTLEŞTİ': 'HARDENED',
  'SON TEKLİF': 'FINAL OFFER',
  'Beklet': 'Hold',
  'Gerekçe gösterdin': 'You gave a reason',
  'Jest yaptın': 'You made a gesture',
  'Karşı teklif istedin': 'You asked for a counter',
  'Paket teklif ettin': 'You offered a bundle',
  'pırlanta': 'diamond',
  'safir': 'sapphire',
  'yakut': 'ruby',
  'zümrüt': 'emerald',
  'zirkon': 'zircon',
  'bilinmeyen': 'unknown',

  // ——— Kalan şablonlar ve etiketler ———
  '+{tutar}/gün': '+{tutar}/day',
  'Bitti': 'Done',
  "Dükkan {saat}'da kapanıyor.": 'The shop closes at {saat}.',
  'Sonraki müşteri ~{dk} dk': 'Next customer ~{dk} min',
  'Global sıra için sunucu doğrulaması gerekir': 'Server verification is required for the global rank',
  'Her gün kapanışında ayrıca {tutar} bakım gideri işleyecek.':
    'A further {tutar} upkeep is charged at every day close.',
  'Kilitli': 'Locked',
  'Koleksiyonda': 'In collection',
  'Kullan': 'Equip',
  'Yetersiz nakit': 'Not enough cash',
  '{n} adet': '{n} pcs',
  '{n} açık vade · {tutar} kullanılabilir limit': '{n} open terms · {tutar} available limit',
  '{n} gün': '{n} days',
  '{n} iş': '{n} jobs',
  '{simdi} / {hedef} kg HAS': '{simdi} / {hedef} kg fine gold',
  '{tutar} kullanılabilir limit': '{tutar} available limit',
  '{tutar} ödenecek.': '{tutar} will be paid.',
  'İlk {n} · sunucu doğrulamalı': 'First {n} · server verified',
  'İşlemden sonra kasanda {kalan} kalacak.': 'You will have {kalan} left afterwards.',
  'Ölü Stok': 'Dead Stock',
  'Arka Stok': 'Back Stock',
  'Serviste': 'In Service',

  // ——— Market kategorileri (t(item.label) · t(item.description)) ———
  'Çerçeveler': 'Frames',
  'Dekorasyon': 'Decoration',
  'Koleksiyon': 'Collection',
  'Şahsi': 'Personal',
  'Rozet ve oyuncu kimliği': 'Badges and player identity',
  'Avatar çerçeveleri': 'Avatar frames',
  'Dükkan temaları ve tabelalar': 'Shop themes and signage',
  'Tezgâh ve ekipman görünümleri': 'Counter and equipment looks',
  'Prestij koleksiyonları': 'Prestige collections',
  'Saatten özel jete yaşam hedefleri': 'Life goals, from a watch to a private jet',

  // ——— Market kademesi ———
  'Standart': 'Standard',
  'Premium': 'Premium',
  'Elit': 'Elite',
  'Efsanevi': 'Legendary',

  // ——— Market ürünleri: adlar ———
  'İlk 5 KG HAS Rozeti': 'First 5 kg Fine Gold Badge',
  'Kurucu Rozeti': 'Founder Badge',
  'Usta Sarraf Rozeti': 'Master Dealer Badge',
  'Çırak Rozeti': 'Apprentice Badge',
  'Mihenk Ustası': 'Touchstone Master',
  'Çarşı Reisi': 'Chief of the Bazaar',
  'Efsane Sarraf': 'Legendary Dealer',
  'Pirinç Çerçeve': 'Brass Frame',
  'Ametist Çerçeve': 'Amethyst Frame',
  'Hanedan Çerçevesi': 'Dynasty Frame',
  'Gümüş Telkari': 'Silver Filigree',
  'Mine İşi Çerçeve': 'Enamelwork Frame',
  'Sedef Kakma': 'Mother-of-Pearl Inlay',
  'Pırlanta Çerçeve': 'Diamond Frame',
  'Gece Ametisti': 'Night Amethyst',
  'Fildişi Saray': 'Ivory Palace',
  'Kapalıçarşı Klasiği': 'Grand Bazaar Classic',
  'Art Deco Pirinç': 'Art Deco Brass',
  'Mermer ve Cam': 'Marble and Glass',
  'Altın Çağ': 'Golden Age',
  'Usta Terazisi': "Master's Scale",
  'Prestij Kasası': 'Prestige Safe',
  'Çay Ocağı': 'Tea Stove',
  'Kadife Tezgâh Örtüsü': 'Velvet Counter Cloth',
  'Hereke Halısı': 'Hereke Carpet',
  'Kristal Avize': 'Crystal Chandelier',
  'Ceviz Vitrin Takımı': 'Walnut Display Set',
  'Çelik Kasa Dairesi': 'Steel Vault Room',
  'Osmanlı Sikke Seti': 'Ottoman Coin Set',
  'Nadir Taş Arşivi': 'Rare Stone Archive',
  'Kehribar Tesbih Koleksiyonu': 'Amber Prayer-Bead Collection',
  'Antika Terazi Arşivi': 'Antique Scale Archive',
  'Mühür Yüzük Kabinesi': 'Signet Ring Cabinet',
  'Saray İşçiliği Arşivi': 'Palace Craftsmanship Archive',
  'İsviçre Saati': 'Swiss Watch',
  'Premium Sedan': 'Premium Sedan',
  'Spor Otomobil': 'Sports Car',
  'Şehir Rezidansı': 'City Residence',
  'Boğaz Villası': 'Bosphorus Villa',
  'Lüks Yat': 'Luxury Yacht',
  'Özel Jet': 'Private Jet',
  'Safkan At': 'Thoroughbred Horse',
  'Motoryat': 'Motor Yacht',
  'Sanat Koleksiyonu': 'Art Collection',
  'Tarihî Yalı': 'Historic Waterside Mansion',
  'Helikopter': 'Helicopter',
  'Özel Ada': 'Private Island',

  // ——— Market ürünleri: açıklamalar ———
  '5 kg HAS biriktiren ilk 100 oyuncuya ayrılmış, global sınırlı prestij rozeti.':
    'A globally limited prestige badge reserved for the first 100 players to accumulate 5 kg of fine gold.',
  'Profilinde ilk dönem kuyumcu rozeti gösterir.':
    'Shows an early-era jeweller badge on your profile.',
  'Tecrübeyi simgeleyen mor-altın profil rozeti.':
    'A purple-and-gold profile badge that stands for experience.',
  'Tezgâh arkasında geçen ilk günlerin sade rozeti.':
    'A plain badge for the first days behind the counter.',
  'Ayarı taşla okuyan eli simgeleyen rozet.':
    'A badge for the hand that reads karat off the stone.',
  'Esnaf arasında sözü geçenin rozeti.':
    'The badge of someone whose word carries among the traders.',
  'Adı çarşıdan taşan sarrafın rozeti.':
    'The badge of a dealer whose name outgrew the bazaar.',
  'Avatar çevresine sıcak pirinç işçiliği uygular.':
    'Wraps your avatar in warm brasswork.',
  'Mor taş ve altın ışıklı premium avatar çerçevesi.':
    'A premium avatar frame lit with purple stone and gold.',
  'Üst düzey itibarı görünür kılan koleksiyon çerçevesi.':
    'A collector frame that makes top-tier standing visible.',
  'İnce gümüş tel işçiliğiyle örülmüş sade çerçeve.':
    'A plain frame woven from fine silver wire.',
  'Renkli mine ve altın kontur.': 'Coloured enamel with a gold outline.',
  'Ceviz üstüne sedef kakma; usta işi bir çerçeve.':
    'Mother-of-pearl inlaid into walnut; a master-made frame.',
  'Işığı kıran taşlarla çevrili en üst çerçeve.':
    'The top frame, ringed with light-breaking stones.',
  'Ana dükkan fonunu koyu ametist vitrin temasına dönüştürür.':
    'Turns the main shop backdrop into a deep amethyst display theme.',
  'Açık taş, pirinç ve yumuşak vitrin ışığı teması.':
    'A theme of pale stone, brass and soft display light.',
  'Kemerli tavan, ahşap dolap ve sıcak sarı ışık.':
    'Vaulted ceiling, wooden cabinets and warm yellow light.',
  'Geometrik pirinç kaplama ve siyah cam.': 'Geometric brass cladding and black glass.',
  'Damarlı mermer tezgâh, kenarsız cam vitrin.':
    'A veined marble counter and a frameless glass case.',
  'Kubbeli tavan ve baştan aşağı varak; çarşının en görkemli dükkânı.':
    'A domed ceiling and gold leaf throughout; the grandest shop in the bazaar.',
  'Tezgâhta sergilenen premium terazi görünümü.':
    'A premium scale on display at the counter.',
  'Dükkan kimliğine ağır çelik ve altın detaylı kasa ekler.':
    'Adds a heavy steel safe with gold detailing to your shop identity.',
  'Her müşteriye uzatılan ince belli bardak; çarşının asıl âdeti.':
    'The tulip glass handed to every customer; the real custom of the bazaar.',
  'Altını üstünde en iyi gösteren koyu kadife.':
    'The dark velvet that shows gold at its best.',
  'İpek dokuma; ayak sesini alır, dükkâna ağırlık verir.':
    'Silk weave; it softens footsteps and gives the shop weight.',
  'Vitrindeki taşı kırk yerden parlatan kristal.':
    'Crystal that catches the display stones from forty angles.',
  'Elde oyulmuş ceviz gövde, müzelik cam.':
    'A hand-carved walnut body with museum-grade glass.',
  'Dükkânın arkasına açılan zırhlı kapılı kasa dairesi.':
    'A vault room behind the shop, with an armoured door.',
  'Koleksiyon defterine tarihî sikke seti ekler.':
    'Adds a historic coin set to your collection ledger.',
  'Yakut, safir ve zümrüt prestij koleksiyonu.':
    'A prestige collection of ruby, sapphire and emerald.',
  'Sıkışta satılmayan, camekânda durup sohbet açan taneler.':
    'Beads never sold in a pinch — they sit in the case and start conversations.',
  'Kefeli el terazilerinden dijital hassas teraziye kadar.':
    'From balance scales to digital precision scales.',
  'Adı kazınmış taşlar; her biri bir imza.':
    'Stones with names engraved; each one a signature.',
  'Sarayın kuyumcubaşılarından kalma işçilik örnekleri.':
    'Craftsmanship left by the palace master jewellers.',
  'İlk şahsi prestij hedefi; bakım gideri yoktur.':
    'The first personal prestige goal; it carries no upkeep.',
  'Şehir içi prestij otomobili.': 'An in-town prestige car.',
  'Yüksek servetin görünür ama ekonomik güç vermeyen simgesi.':
    'A visible token of wealth that grants no economic power.',
  'Merkezde prestijli bir şahsi yaşam alanı.':
    'A prestigious personal home in the centre.',
  'Oyunun ileri aşamasındaki servet için kalıcı prestij hedefi.':
    'A lasting prestige goal for late-game wealth.',
  'Çok yüksek serveti tüketen koleksiyon ve yaşam hedefi.':
    'A collection and life goal that devours very large wealth.',
  'En üst seviye şahsi prestij ve bakım sorumluluğu.':
    'Top-tier personal prestige — and the upkeep that comes with it.',
  'Şehrin dışında bir tay; bakımı seviyor, kâr getirmiyor.':
    'A colt outside the city; it loves upkeep and returns no profit.',
  'Boğazda hafta sonu; yatın küçük ama gerçek hâli.':
    'A weekend on the Bosphorus; the small but real version of a yacht.',
  'Duvara asılan servet; sigortası her gün işler.':
    'Wealth hung on a wall; its insurance is charged daily.',
  'Denize sıfır ahşap yalı; her kışı bir onarım ister.':
    'A wooden mansion at the water\'s edge; every winter asks for a repair.',
  'Trafiği aşan ama kasayı da aşan bir tercih.':
    'A choice that beats the traffic — and beats your till too.',
  'Servetin gidebileceği son yer; günlük gideri bir dükkânı döndürür.':
    'The last place wealth can go; its daily cost would run a whole shop.',

  // ——— Öğretici dersleri (t(lesson.title) · t(lesson.body)) ———
  'Dükkân senin': 'The shop is yours',
  'Kasandaki parayla mal alır, aldığından pahalıya satarsın. Her gün kira ve gider işler; günü kârla kapatmak senin işin.':
    'You buy goods with the cash in your till and sell them for more than you paid. Rent and overhead are charged every day; closing the day in profit is your job.',
  'Müşteri kapıda': 'A customer at the door',
  'Karşıla ve ne istediğine bak. Satan da var, alan da, tamir isteyen de.':
    'Greet them and see what they want. Some sell, some buy, some want a repair.',
  'Sarrafiyede test şart değil': 'Bullion needs no testing',
  'Standart sarrafiyenin gramajı ve ayarı bellidir. Şüpheli bir hâli yoksa doğrudan fiyata geçebilirsin.':
    'Standard bullion has a known weight and karat. Unless something looks off, you can go straight to pricing.',
  'Gördüğün beyandır': 'What you see is a claim',
  'Müşterinin söylediği ağırlık ve ayar doğrulanmış değil. Raydaki araçlar bu belirsizliği para ve müşteri sabrı karşılığında azaltır.':
    "The weight and karat the customer states are not verified. The tools on the rail reduce that uncertainty — at the cost of money and the customer's patience.",
  'Aralık ne kadar dar, o kadar iyi': 'The narrower the range, the better',
  'Test yaptıkça tahmini değer aralığı daralır. Dar aralık, daha yüksek fiyat verebilmen demektir — belirsizliğin bedelini sen ödersin.':
    'Each test narrows the estimated value range. A narrow range means you can offer more — you are the one who pays for uncertainty.',
  'Önce nereye satacağını seç': 'Choose where you will sell first',
  'Çıkış planın alış tavanını belirler: tezgâhta beklemek pahalıya satar ama yavaştır, toptancı hemen öder ama ucuza alır.':
    'Your exit plan sets your buy ceiling: waiting at the counter sells high but slowly, the wholesaler pays at once but buys cheap.',
  'Tavanın üstü zarardır': 'Above the ceiling is a loss',
  'Alış tavanı, bu plandan kâr edebileceğin en yüksek fiyat. Müşteri kabul etmezse karşı teklif verir; aynı rakamı tekrar göndermek yeni bir cevap getirmez.':
    'The buy ceiling is the highest price at which this plan still profits. If the customer refuses they counter; sending the same number again brings no new answer.',
  'Aldığın mal stoğa düşer': 'What you buy lands in stock',
  'Stok ekranından ne tuttuğunu, maliyetini ve bugünkü değerini görürsün. Nakit ile altın arasındaki denge de orada.':
    'The Stock screen shows what you hold, what it cost and what it is worth today. The balance between cash and gold lives there too.',
  'sahip olunan': 'owned',

  // ——— Tek kelimelik etiketler ve kalan şablonlar ———
  'Kabul': 'Accept',
  'Kondisyon': 'Condition',
  'Mekân': 'Venue',
  'Pakette': 'In bundle',
  'Risk': 'Risk',
  'Telemetri': 'Telemetry',
  'Teslim tamponu': 'Delivery buffer',
  'XP': 'XP',
  'Seviye ilerlemesi yüzde {yuzde}': 'Level progress {yuzde} percent',
  'Seviye {seviye} · uzmanlık ilerlemesi': 'Level {seviye} · specialisation progress',
  'Seviye {seviye} · {xp}/{hedef} XP': 'Level {seviye} · {xp}/{hedef} XP',
  '{dukkan} · Kademe {kademe} · Seviye {seviye}': '{dukkan} · Tier {kademe} · Level {seviye}',
  '{n} kişi': '{n} people',
  '−{oran} hata riski': '−{oran} error risk',

  // ——— Hızlı stok satırı ———
  'Stokta {miktar}': '{miktar} in stock',
  '· en çok {sinir}': '· at most {sinir}',
  '{ad} miktarı': '{ad} amount',
  '{ad} miktarını azalt': 'Decrease {ad} amount',
  '{ad} miktarını artır': 'Increase {ad} amount',

  // ——— Ürün adları (t(item.displayName) · t(template.name)) ———
  'Gram Altın (1 g)': 'Gram Gold (1 g)',
  'Gram Altın (2,5 g)': 'Gram Gold (2.5 g)',
  'Gram Altın (5 g)': 'Gram Gold (5 g)',
  'Gram Altın (10 g)': 'Gram Gold (10 g)',
  'Gram Altın (20 g)': 'Gram Gold (20 g)',
  'Gram Altın (50 g)': 'Gram Gold (50 g)',
  'Gram Altın (100 g)': 'Gram Gold (100 g)',
  'Çeyrek Altın': 'Quarter Coin',
  'Yarım Altın': 'Half Coin',
  'Tam Altın': 'Full Coin',
  'Ata Lira': 'Ata Coin',
  'Cumhuriyet Altını': 'Republic Coin',
  'Koleksiyon Sikke': 'Collector Coin',
  'Küçük Külçe (20 g)': 'Small Ingot (20 g)',
  '22 Ayar İşçiliksiz Yatırım Bileziği': '22K Plain Investment Bangle',
  '22 Ayar Burma Bilezik': '22K Twisted Bangle',
  '22 Ayar İnce Bilezik': '22K Thin Bangle',
  '22 Ayar Set Parçası': '22K Set Piece',
  '22 Ayar Kaplama Şüpheli Bilezik': '22K Bangle, Plating Suspected',
  '14 Ayar Kolye': '14K Necklace',
  '14 Ayar Küpe': '14K Earrings',
  '14 Ayar Yüzük': '14K Ring',
  '14 Ayar Zincir': '14K Chain',
  '18 Ayar Kolye': '18K Necklace',
  '18 Ayar Yüzük': '18K Ring',
  'Gümüş Obje': 'Silver Object',
  'Gümüş Yüzük': 'Silver Ring',
  'Gümüş Zincir': 'Silver Chain',
  'Hasarlı Zincir': 'Damaged Chain',
  'Taşlı Yüzük (Giriş)': 'Stone Ring (Entry)',
  'Tektaş Yüzük (Premium)': 'Solitaire Ring (Premium)',
  'Vintage Broş': 'Vintage Brooch',

  // ——— Araçlar (t(tool.name)) ———
  'Mıknatıs': 'Magnet',
  'Mihenk Taşı': 'Touchstone',
  'Yoğunluk Ölçümü': 'Density Test',
  'Lup / Taş Kontrol': 'Loupe / Stone Check',
  'Hassas Terazi': 'Precision Scale',
  'Dijital Spektrometre': 'Digital Spectrometer',

  // ——— Personel, defter ve yetenek ağacı ———
  'Maaşlar kişi başına eklenir: {liste} / ay.': 'Salaries add up per person: {liste} / month.',
  'Yalnız bekleme kapasitesini artırır; müşteri geliş hızını veya atölyeyi değiştirmez.':
    'It only raises waiting capacity; it changes neither customer arrival rate nor the workshop.',
  '{n} personel': '{n} staff',
  '{n} personel, seviye {sv} gerektirir': '{n} staff, requires level {sv}',
  '{n} personel · aylık toplam {tutar}.': '{n} staff · {tutar} per month.',
  'Günlük gider kapanışta tahsil edilir.': 'The daily cost is charged at close.',
  'Personeli Onayla': 'Confirm Staff',
  'Seviye {sv}': 'Level {sv}',
  '{n} kayıt · her işlemin gerekçesi ve sonucu':
    '{n} entries · the reasoning and outcome of every transaction',
  'Kapanan her işlem buraya düşer: kullanılan testler, tahmin bandı, teklif geçmişi ve gerçek sonuç.':
    'Every closed transaction lands here: the tests used, the estimate band, the offer history and the real outcome.',
  'Kademe {simdi}/{en}': 'Tier {simdi}/{en}',
  '{n} bilezik': '{n} bangles',
  'Yetenek henüz açılmadı.': 'This talent is not unlocked yet.',
  'Tüm müşterilerin başlangıç sabrını +1 artırır.':
    "Raises every customer's starting patience by +1.",
  'Tüm müşterilerin başlangıç sabrını +2 artırır.':
    "Raises every customer's starting patience by +2.",
  'Sabrı +2 artırır ve yüksek kârlı tekliflerde sabır düşme riskini azaltır.':
    'Raises patience by +2 and softens patience loss on high-margin offers.',

  // ——— Müşteri şeridi ve hafıza ———
  'Sabır: {simdi}/{toplam}': 'Patience: {simdi}/{toplam}',
  'Müşteri sabrı {simdi}/{toplam}': 'Customer patience {simdi}/{toplam}',
  '{n} kişi · {sadik} sadık': '{n} people · {sadik} loyal',
  ' · {n} küsmüş': ' · {n} upset',

  // ——— İşlem sınıfı notları ve araç kilidi ———
  'Standart sarrafiye · doğrudan fiyata geçebilirsiniz.':
    'Standard bullion · you can go straight to pricing.',
  'Ağırlık ve ayar doğrulaması önerilir.': 'Verifying weight and karat is advised.',
  'İşçilik ve risk analizi bu üründe belirleyici.':
    'Craft and risk analysis are decisive on this item.',
  "Seviye {sv}'te açılır": 'Unlocks at level {sv}',
  'Terazi': 'Scale',
  'Mihenk': 'Touchstone',
  'Yoğunluk': 'Density',
  'Lup': 'Loupe',
  'Spektro': 'Spectro',

  // ——— Eksik ürün adları ———
  /*
    Yatırım bileziğinin adı ağırlığa göre üretiliyor
    (`INVESTMENT_BANGLE_WEIGHTS`), yani tek bir anahtar yok. On ağırlığın
    hepsi burada elle duruyor: adı çalışma anında birleştirmek yerine
    sözlükte saymak, ekranda yarısı Türkçe bir isim bırakma riskini
    ortadan kaldırıyor.
  */
  '22 Ayar İşçiliksiz Bilezik (10 g)': '22K Plain Bangle (10 g)',
  '22 Ayar İşçiliksiz Bilezik (20 g)': '22K Plain Bangle (20 g)',
  '22 Ayar İşçiliksiz Bilezik (30 g)': '22K Plain Bangle (30 g)',
  '22 Ayar İşçiliksiz Bilezik (40 g)': '22K Plain Bangle (40 g)',
  '22 Ayar İşçiliksiz Bilezik (50 g)': '22K Plain Bangle (50 g)',
  '22 Ayar İşçiliksiz Bilezik (60 g)': '22K Plain Bangle (60 g)',
  '22 Ayar İşçiliksiz Bilezik (70 g)': '22K Plain Bangle (70 g)',
  '22 Ayar İşçiliksiz Bilezik (80 g)': '22K Plain Bangle (80 g)',
  '22 Ayar İşçiliksiz Bilezik (90 g)': '22K Plain Bangle (90 g)',
  '22 Ayar İşçiliksiz Bilezik (100 g)': '22K Plain Bangle (100 g)',

  // ——— Piyasa rejimleri (MARKET_REGIME · t(regime.label) · t(regime.note)) ———
  'Sakin': 'Calm',
  'Normal': 'Normal',
  'Volatil': 'Volatile',
  'Şok Olay': 'Shock Event',
  'Dar bant, düşük stok riski.': 'Narrow band, low stock risk.',
  'Nötr veya hafif trend.': 'Neutral or a mild trend.',
  'Uyarı: likidite ve stok yaşı daha önemli.':
    'Warning: liquidity and stock age matter more.',
  'Önceden kısmi sinyal; pozisyon küçültme mümkün.':
    'A partial signal arrives first; you can still cut your position.',

  // ——— Müşteri niyet cümlesi (ui/intent-line.ts) ———
  /*
    Cümle PARÇALARDAN kuruluyor ve İngilizcede kelime sırası Türkçeden
    farklı: Türkçede fiil sonda ("… bozdurmak istiyor"), İngilizcede
    başta ("wants to sell …"). Yer tutucu bu yüzden `{ne}` diye
    adlandırıldı; şablon iki dilde de kendi doğal sırasını kurabiliyor.
  */
  '{ne} bozdurmak istiyor': 'wants to sell {ne}',
  '{ne} satmak istiyor': 'wants to sell {ne}',
  '{ne} almak istiyor': 'wants to buy {ne}',
  'toplu olarak {ne} almak istiyor': 'wants to buy {ne} in bulk',
  '{ne} için tamir/servis istiyor': 'wants a repair / service on {ne}',
  '{ne} için ekspertiz istiyor': 'wants an appraisal on {ne}',
  '{n} {ad}': '{n} {ad}',
  '{n} adet {ad}': '{n} × {ad}',
  '{a} ve {b}': '{a} and {b}',
  '{a}, {b} ve {n} ürün daha': '{a}, {b} and {n} more items',
  'Bir {ad}': 'A {ad}',
  '{g} gram 22 ayar işçiliksiz bilezik': 'a {g}-gram 22K plain bangle',
  '{g} gram altın': '{g} grams of gold',
  'Müşteriyi Karşıla · {n}': 'Greet the Customer · {n}',

  // ——— Müşteri arketip tavırları (t(archetype.demeanor)) ———
  'Aceleci': 'In a hurry',
  'Hesaplı': 'Calculating',
  'Kararlı': 'Decisive',
  'Kararsız': 'Undecided',
  'Karşılaştırmacı': 'Comparing',
  'Meraklı': 'Curious',
  'Talepkâr': 'Demanding',
  'Temkinli': 'Cautious',

  // ——— Dükkan adı eki ———
  'Kuyumculuk': 'Jewellers',
  'Kuyumcu': 'Jeweller',

  // ——— Alış talebi özeti (domain/purchase.ts) ———
  'Toplu: {ne}': 'Bulk: {ne}',
  'Katalog ürünü arıyor': 'Looking for a catalogue item',
  'Vitrine bakıyor': 'Browsing the showcase',
  '★ Vitrindeki {ad} ile ilgileniyor': '★ Interested in the {ad} on display',
  '{miktar} istiyor': 'wants {miktar}',
  '· en az {miktar} kabul ediyor': '· accepts {miktar} at least',
  '· toplu müşteri': '· bulk customer',
  'Bu müşteriye verecek malınız bulunmuyor; talebi karşılayamadan gitmesi normaldir.':
    'You have nothing to offer this customer; it is normal for them to leave unserved.',
  'Talep karşılanamadı · stok ve nakit değişmedi.':
    'The request could not be met · stock and cash unchanged.',

  // ——— Çıkış kanalı süreleri ———
  '1–2 gün': '1–2 days',
  '2–5 gün': '2–5 days',
  '3–7 gün': '3–7 days',
  '7+ gün': '7+ days',
  'Bugünkü en hızlı çıkış:': "Today's fastest exit:",
  '· tahmini süre {sure}.': '· estimated {sure}.',
  'Beklemek daha iyi bir kanal açabilir.': 'Waiting may open a better channel.',

  // ——— Çıkış planı kanalları ve gerekçeleri ———
  'Eritme / HAS': 'Melt / Fine Gold',
  'Servis + satış': 'Service + resale',
  'Hızlı ve güvenilir likidite; ödeme aynı gün.':
    'Fast, reliable liquidity; paid the same day.',
  'Yüksek hacimli, hızlı likidite kanalı.': 'A high-volume, fast liquidity channel.',
  'Düşük marj karşılığında anlık nakit.': 'Instant cash in exchange for a thin margin.',
  'Sermaye bağlanır; doğru müşteri beklenir.':
    'Capital is tied up; you wait for the right customer.',
  'Doğru koleksiyoner gelene kadar değer korunabilir; sermaye uzun bağlanır.':
    'Value can hold until the right collector arrives; capital is tied up for a long time.',
  'Kondisyon düzeltilebilir; yeniden satış değeri artar.':
    'Condition can be restored; resale value rises.',
  'Yeniden satış değeri düşük; metal en güvenli çıkış.':
    'Resale value is low; the metal is the safest exit.',
  'İşçilik ve taş değeri kaybolur.': 'Craft and stone value are lost.',
  'Talep etiketi güçlü; vitrin dönüşü hızlı olabilir.':
    'Demand for this tag is strong; the showcase may turn it over quickly.',
  'Nakit sıkışıkken hızlı çıkış rasyonel.':
    'When cash is tight, a fast exit is the rational move.',
  'Hacim büyük; marj sıkışır.': 'The volume is large; the margin tightens.',
  'Bu hacimde tezgâh daha iyi fiyat veriyor; toptancı üstünlüğü bu işlemde yok.':
    'At this volume the counter pays better; the wholesaler has no edge on this trade.',
  'Tezgâh üstü sarrafiye satışı; vitrin slotu tutmaz.':
    'Over-the-counter bullion sale; it takes no display slot.',
  'Tezgâhtan Sat': 'Sell at the Counter',
  'Yerel ilişkiye dayalı; kapasitesi sonlu.':
    'It rests on local relationships; its capacity is finite.',
  'Planlı stok; ödeme baskısı taşır.': 'Planned stock; it carries payment pressure.',
  'yavaş': 'slow',
  'düğün': 'wedding',
  'yatırım': 'investment',

  // ——— Atölye durumu ———
  'Atölye dolu': 'Workshop full',
  'Atölye dolu: süre uzar, hata riski yükselir.':
    'Workshop is full: it takes longer and the error risk rises.',
  'Son slot: yeni iş alırsan risk ve süre artar.':
    'Last slot: taking another job raises risk and time.',
  'Standart tezgâh koşulları.': 'Standard bench conditions.',
  'Kendi atölyende; tam marj, kontrol sende.':
    'In your own workshop; full margin, full control.',
  'Kapasite tüketmez; marj düşer, süre uzar.':
    'It uses no capacity; the margin drops and it takes longer.',
  'Ustalık seviyesi': 'Mastery level',

  // ——— Servis tanısı ———
  'Kusur yok; isteğe bağlı işlem.': 'No defect; an optional job.',
  'Genel durumu iyi; bakım isteniyor.': 'Overall condition is good; maintenance is asked for.',
  'Yüzey yıpranmış, parlaklığını kaybetmiş.': 'The surface is worn and has lost its shine.',
  'Gövdede belirgin hasar var.': 'There is visible damage to the body.',
  'Parça kırık; kullanılamaz durumda.': 'The piece is broken and unusable.',

  // ——— Gözlem sinyalleri ———
  'Manyetik tepki yok — bariz demir alaşımı değil':
    'No magnetic response — not an obvious iron alloy',
  'Hafif manyetik tepki — alaşım/çekirdek şüphesi':
    'A slight magnetic response — alloy or core suspected',
  'Patina dönem parçasıyla uyumlu görünüyor': 'The patina fits a period piece',
  'Aile mirası, belgeli': 'Family heirloom, documented',
  'doğal taş özellikleri': 'natural stone characteristics',
  'sentetik/taklit izleri': 'signs of synthetic or imitation',
  'net ayrım yapılamadı': 'no clear distinction',
  'gözle görünenden daha yıpranmış': 'more worn than it looks',
  'gözlemle tutarlı': 'consistent with observation',
  'içi boşluk': 'a hollow inside',
  'Gösterecek doğrulanmış veri yok.': 'There is no verified data to show.',
  'Taş taklit çıktı. Lup, değer bandını almadan önce daraltırdı.':
    'The stone turned out to be imitation. A loupe would have narrowed the value band before you bought.',

  // ——— Piyasa yorumları ———
  'Oynaklık': 'Volatility',
  'Hareketin dar kalması bekleniyor.': 'Movement is expected to stay narrow.',
  'Orta ölçekli hareket görülebilir.': 'A mid-sized move is possible.',
  'Hareketin büyüklüğü bugün geniş bir bantta olabilir.':
    "Today's move could land anywhere in a wide band.",
  'Oynak piyasa alış-satış farkını açıyor.': 'A volatile market widens the spread.',
  'Güncel HAS referansı ve müşteri alış-satış bandı.':
    'Current fine-gold reference and the customer bid-ask band.',

  // ——— Müşterinin ağzından (domain/negotiation.ts) ———
  /*
    MÜŞTERİ REPLİKLERİ. Türkçede tezgâh dili resmî "siz"le konuşur; İngilizce
    karşılıkları aynı tonu tutmalı — ne fazla samimi ne resmî bir yazışma.
  */
  'Bunu bozdurmak istiyorum.': "I'd like to sell this.",
  'Birkaç parça getirdim, bakar mısınız?': "I've brought a few pieces — would you take a look?",
  'Bir şeye bakıyordum.': 'I was looking for something.',
  'Bunun tamiri mümkün mü?': 'Can this be repaired?',
  'Bunun değerini öğrenmek istiyorum.': "I'd like to know what this is worth.",
  'Buyurun, inceleyin.': 'Go ahead, take a look.',
  'Peki, bakın bakalım.': 'All right, have a look.',
  'Biraz acelem var, uzattık.': "I'm in a bit of a hurry — this is dragging on.",
  'Anlaştık. Sağ olun.': "We have a deal. Thank you.",
  'Tamam, anlaştık.': "All right, we have a deal.",
  'Bu gerçekten iyi bir teklif. Anlaştık.': "That's genuinely a good offer. We have a deal.",
  'Peki. İhtiyacım olduğu için kabul ediyorum.': "Fine. I'm accepting because I need to.",
  'Peki, siz bilirsiniz.': 'All right, as you wish.',
  'Peki, başka yere bakayım.': "All right, I'll look elsewhere.",
  'Anlıyorum. Yine de teşekkürler.': 'I understand. Thank you anyway.',
  'Anlıyorum, başka bir yere sorayım.': "I understand — I'll ask somewhere else.",
  'Bu fiyatlarla olmayacak. Başka yere bakacağım.':
    "This won't work at these prices. I'll look elsewhere.",
  'Son sözümü söyledim. Başka yere bakacağım.':
    "I've said my last word. I'll look elsewhere.",
  'Bu rakam ciddi değil. Ürünün hâlini biliyorum.':
    "That number isn't serious. I know the state of this piece.",
  'Bakın, buradan aşağı inmem artık.': "Look, I won't go below this.",
  'Son fiyatım bu. Daha aşağısına bırakmam.':
    "This is my final price. I won't let it go for less.",
  'Az kaldı. Biraz daha düşünün.': "You're close. Think a little more.",
  'Aynı rakamı tekrar ediyorsunuz. Cevabım değişmedi.':
    "You're repeating the same number. My answer hasn't changed.",
  'Bunu zaten söylediniz.': 'You have already said that.',
  'Bunu ölçmediniz. Elinizde olmayan bir veriyle konuşuyorsunuz.':
    "You didn't measure that. You're arguing from data you don't have.",
  'Nezaketiniz için sağ olun, ama mesele fiyatta.':
    'Thank you for the courtesy, but the issue is the price.',
  'İnce düşünmüşsünüz, teşekkür ederim.': "That's thoughtful of you, thank you.",

  // ——— İşlem sonucu ve değerlendirme ———
  'Anlaşma olmadı': 'No deal',
  'Sabrı bitti, çıkıp gitti': 'Patience ran out; they walked away',
  'Servis işi bırakıldı': 'Service job abandoned',
  'Kapanmış işlem': 'Closed transaction',
  'Sonuç okunamadı': 'Result unreadable',
  'İşlem tamamlandı.': 'Transaction complete.',
  'İşlem kapanmadı.': 'The transaction did not close.',
  'İşlemi reddettiniz.': 'You refused the transaction.',
  'Gerçek değerine çok yakın kapattınız.': 'You closed very close to its true value.',
  'Kesin konuştun ve tutturdun; müşteri etkilendi.':
    'You spoke with certainty and got it right; the customer was impressed.',
  'Kesin konuştun ve yanıldın; müşteri bunu unutmayacak.':
    "You spoke with certainty and got it wrong; the customer won't forget.",
  'Rapor tuttu; ücret ödendi.': 'The report held up; the fee was paid.',
  'Rapor ürünün gerçek değerini ıskaladı.': "The report missed the item's true value.",
  'Rapor doğruydu ama ücreti fazla buldu; ödemeden ayrıldı.':
    'The report was right but they found the fee steep and left without paying.',
  'Ücreti fazla buldu ve rapora da güvenmedi.':
    'They found the fee steep and did not trust the report either.',
  'Ekspertiz — ücret alınmadı': 'Appraisal — no fee taken',
  'Ekspertiz ücreti {tutar} alındı.': 'An appraisal fee of {tutar} was collected.',
  'Müşteri ücreti ödemedi.': 'The customer did not pay the fee.',
  'Teklifiniz müşterinin kabul sınırının altında kaldı.':
    "Your offer stayed below the customer's acceptance threshold.",
  'Masada kabul edilecek bir teklif yok.': 'There is no offer on the table to accept.',
  'Bu müşteride paket teklif için yeterli kalem yok.':
    'This customer has too few pieces for a bundle offer.',
  'Talep kısmen karşılandı; müşteri eksik adede razı oldu.':
    'The request was partly met; the customer accepted the shortfall.',
  'Paket talebi tam karşıladı.': 'The bundle met the request in full.',
  'Yeni müşteri': 'New customer',

  // ——— Mağaza ve ekonomi balonları ———
  '4x hız açıldı.': '4x speed unlocked.',
  'Profil güncellendi.': 'Profile updated.',
  'Müşteri akını başladı — geliş aralığı kısaldı.':
    'A rush has started — customers arrive more often.',
  'Kozmetik görünüm uygulandı.': 'The cosmetic look has been applied.',
  'Market ürünü koleksiyonuna eklendi.': 'The market item was added to your collection.',
  'Market satın alımı yapılamadı.': 'The market purchase could not be completed.',
  'Bu ürün kullanılamıyor.': 'This item cannot be equipped.',
  'HAS işlemi kaydedildi.': 'The fine-gold trade was recorded.',
  'Ürün eritildi; karşılığı HAS bakiyesine eklendi.':
    'The item was melted; its value was added to your fine-gold balance.',
  'İşlem uygulanmadı.': 'The transaction was not applied.',
  'Alım uygulanamadı.': 'The purchase could not be applied.',
  'Tedarik uygulanamadı.': 'The supply order could not be applied.',
  'Yükseltme uygulanamadı.': 'The upgrade could not be applied.',
  'Mağaza yükseltmeye hazır değil.': 'The store is not ready for an upgrade.',
  'Bu sürümde son kademe.': 'This is the top tier in this build.',
  'Bu test için yeterli nakit yok.': 'Not enough cash for this test.',
  'Parça maliyeti için yeterli nakit yok.': 'Not enough cash for the parts.',
  'Yetersiz nakit; işlem uygulanmadı.': 'Not enough cash; the transaction was not applied.',
  'Vadeyi kapatacak nakit yok.': 'No cash to settle the term.',
  'Borcu kapatacak nakit yok.': 'No cash to clear the debt.',
  'Tutar yok.': 'No amount.',
  'Stok yetersiz.': 'Not enough stock.',
  'Geçersiz stok miktarı.': 'Invalid stock quantity.',
  'Geçersiz HAS işlemi veya işlem günü.': 'Invalid fine-gold trade or trading day.',
  'Geçersiz sarrafiye miktarı, tutarı veya stok kapasitesi.':
    'Invalid bullion quantity, amount or stock capacity.',
  'Bu ürün müşterinin talebiyle eşleşmiyor.': "This item does not match the customer's request.",
  'Pazarlık başladı; paket artık değiştirilemez.':
    'Haggling has started; the bundle can no longer be changed.',
  'Vitrin ürünü artık satışta değil.': 'The showcase item is no longer for sale.',
  'Kasasında bu işi çevirecek nakit yok.': 'They have no cash on hand for this trade.',
  'Bu esnaf bu işi alamıyor.': 'This trader cannot take this on.',
  'Bu esnafa zaten borcunuz var.': 'You already owe this trader.',
  'Ağda gecikmiş borcunuz var; yeni borç açılmıyor.':
    'You have an overdue debt in the network; no new loan is opened.',
  'Ağ kapasitesi yetti.': 'Network capacity was enough.',
  'Gecikmiş vadeniz var; yeni vade açılmıyor.':
    'You have an overdue term; no new term is opened.',
  'Günlük gider karşılanamadı; gün kapatılmadı.':
    'The daily overhead could not be covered; the day was not closed.',
  'Gün kapatılamadı: kayıt doğrulanamadı. Tekrar deneyin.':
    'The day could not be closed: the save could not be verified. Try again.',
  'Kayıt yazılamadı; gün özeti açık tutuldu.':
    'The save could not be written; the day summary was left open.',
  'Kayıt silindi. Yeni oyun bir sonraki açılışta başlar.':
    'Save deleted. A new game starts at the next launch.',
  'Toptancı vadesi': 'Wholesaler term',
  'Toptancı vadesi ödemesi': 'Wholesaler term payment',
  'Toptancı güveni': 'Wholesaler trust',
  'Terazi bakım borcu': 'Scale servicing debt',
  'Yatırım bedeli': 'Investment cost',

  // ——— Alan bilgi durumu (workbench/InspectStage) ———
  'doğrulanmadı': 'unverified',
  'kısmi': 'partial',
  'doğrulandı': 'verified',
  'çelişkili': 'conflicting',
  'referans': 'reference',
  'beyan': 'declared',
  '{plan} Seç': 'Choose {plan}',
};
