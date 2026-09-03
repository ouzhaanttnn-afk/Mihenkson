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
};
