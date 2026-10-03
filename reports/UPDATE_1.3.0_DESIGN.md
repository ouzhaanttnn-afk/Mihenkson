# Mihenk 1.3.0 — Yaşayan Dükkân

Karar tarihi: 3 Ekim 2026. Sahip onayı: Yaşayan Dükkân sunum paketi ve ölçülen ilerleme dengesi tek 1.3.0 güncellemesinde uygulanacak; TestFlight ardından Apple incelemesine gönderilecek. Olağan uygulama ve yayın adımlarında tekrar onay istenmeyecek.

Kaynak: `mihenk-yasayan-dukkan-plan.md` (3 Ekim stüdyo planı), mevcut Mihenk 1.2.0/1.2.1 revizyonları ve çalışan kaynak. Yerel ana Mihenk GDD bulunamadığından onun tamamına uyum iddiası yoktur. TradeUp GDD'si bu projeyi yönetmez.

## Ürün kapsamı

- Dört mevcut mağaza aşaması; gerçek şarttan türeyen tek yakın hedef ve mevcut Mağaza/Yetenek ekranlarına erişim.
- Ödeme/teslim → açık piyasa olayı → bilinen haftalık ritim sırasıyla tek ana gündem. Aktif pazarlığa yeni büyük panel eklenmez.
- Yalnız gerçek müşteri geçmişi; ürün atfı uygulanmış işlem ve müşteri eşleşmesi gerektirir. Referans/garanti satış/randevu icat edilmez.
- Uygun manuel satış sonucunda mevcut ustalık ilerlemesinin kısa gösterimi; personel, borç veya reddetme puan üretmez.
- Gün başlangıcında küçük v1 özet, kapanışta doğrulanmış fark. Eski kayıtta özet yoksa o günün farkı bilinmiyor; geriye dönük ilerleme uydurulmaz.
- Gün sonu kâr/gider/işletme ilerleyişi/bilinen sonraki gün; ayrıntılı muhasebe korunur. Stok alımı zarar, çevrimdışı bekleyen ücret ödenmiş gider gibi gösterilmez.
- Mevcut dört mağazanın hafif statik cephe kimliği. Yeni ağır animasyon veya harici varlık gerekmez.
- Hızlı teminde alınan mal, peşin/vade ve kalan nakit şeffaflığı; atölyede iş riski ile doluluk ayrı açıklanır.
- Piyasa açıklamaları yalnız gerçek fiyat/arketip/tez tüketicilerinin uyguladığı davranışları anlatır. Gümüş için eski açılım vaadi temizlenir.

## Korunan kurallar

Kanonik settlement, maliyet/kâr hesabı, seed, spawn ve fiyat RNG, pazarlık hakları, yetenek etkileri/eşikleri, personelin güvenli satış ve çevrimdışı sınırları korunur. Yeni görev, para birimi, IAP, reklam tetikleyicisi, otomatik alış/borçlanma yoktur. 1.2.1'in iki gösterim sınırı, süre/manuel ziyaret eşikleri, korunan ekranlar ve reklamsız hakları değişmez. Yeni analitik SDK veya veri toplama servisi eklenmez.

## Kalibrasyon kararı

6.000 gerçek-motor kariyeri / 1.000 ortak kök seed, 18.000 invariant ve 48 deterministik replay sonrası minimum kalibrasyon seçildi (ayrıntı: `PROGRESSION_1.3.0_CALIBRATION.md`).

- Mağaza 2/3/4 tedarikçi güveni: **58/62/65** (önce 58/70/82). Diğer altı kapı, yatırımlar ve kademelerin gider/kapasitesi değişmedi. Kazanılmış mağaza geri alınmaz; yeni uygunluk ücretsiz otomatik yükseltme değildir.
- Kanonik başarılı peşin ve vadeli pool alışları aynı mevcut meaningful kurala tabi: işlem tutarı güncel toplam kredi limitinin **%25** eşiğini karşılıyorsa **+1**, en fazla **65**. Bütünüyle peşin alımda fatura açılmaz. Tek transaction ID yalnız bir kez katkı verir; başarısız/küçük alış katkı vermez. Eski alışlar tekrar oynatılmaz.
- **Global XP, mağaza ve personel seviyeleri 3/6/10 değişmedi.** Altı ustalık puanının mevcut 5/15/30/50/80/120 uygun iş koşulu korunur. Mevcut motorun başarılı kârlı dış-usta servis teslimi katkısı da kaldırılmadı; sunum bu yüzden “başarılı servis teslimi” der, yalnız kendi atölye diye yanlış sınır çizmez.
- Borç maliyeti, limit formülü, gecikme cezası ve zamanında ödeme avantajı korunur. İsteğe bağlı rezerv stok kesin kazanç/garanti ilerleme diye sunulmaz. Yüksek hacimli taleplerin mevcut gerçek kapıları korunur.

Bu, sahibin 1.3.0 yetkisi kapsamındaki açık tasarım revizyonudur; önceki üst kademelerde zorunlu vade tercihi artık geçerli değildir. 42 oyun günü sonucu insan retention'ı veya Flagship'in tam ileri-kariyer denge onayı değildir.

## Kalite ve yayın

Saf model, migration, settlement/idempotency, gün kapanış checkpoint, dil, React erişilebilirlik ve mevcut reklam regresyonları; tüm unit test/typecheck/build/i18n/release denetimi. Ayrı tarayıcı test kaydıyla gerçek temel akış ve 320–430 px kontrolü. Fiziksel iPhone performansı ve insan retention testi yapılmış gibi iddia edilmeyecek. Native CI'nin exact kaynak SHA'sı ve build numarası doğrulanacak; Apple başarı durumu yalnız gerçek gönderim sonrası raporlanacak.
