# MIHENK — Market Hariç Oynanış Güncelleme Raporu

Tarih: 29 Ağustos 2026  
İncelenen sürüm: `83b0f98` (`clonemihenk`)  
Kapsam: Dükkan, müşteri kuyruğu, müşteriden alış, müşteriye satış, pazarlık, Stok, Piyasa, Toptancı, Esnaf Ağı, Atölye/servis, İşletme, ilerleme, kayıt ve mobil kullanılabilirlik.  
Kapsam dışı: **Market ekranı ve Market içeriği.**

## Uygulama durumu

### Son sağlamlaştırma — 29 Ağustos 2026

- Gün kapanışı, kayıt tarayıcı deposuna yazılıp geri okunarak doğrulanmadan artık yeni güne geçmiyor.
- Son sağlam checkpoint ayrı yedekte tutuluyor; ana JSON bozulursa oyun otomatik olarak yedeği açıyor.
- Piyasanın spot, history ve gün içi durumu kayda eklendi; aynı kayıt yenilendiğinde fiyat artık değişmiyor.
- Aynı ücretli ekspertiz aracı aynı üründe ikinci kez çalıştırılıp yeniden ücret kesemiyor.
- Paket satırlarında `×1` dahil gerçek adet gösteriliyor.
- Paket açıklamasındaki tekrarlı kanal adı temizlendi.
- Uçtan uca testte Gün 2 → Gün 3, 997.600 ₺ ve 4.420,77 ₺ gram altın değeri sayfa yenileme sonrasında birebir korundu.
- TypeScript, 540 otomatik test ve production build başarılı.

Bu rapordaki 19 bulgu klon üzerinde uygulandı. Öne çıkan sonuçlar:

- Toptancı ve Stok tedariki 1 adetle açılıyor; yüksek tutar ikinci onay istiyor.
- Teklif metni, slider değeri ve işleme giden tutar aynı adıma sabitlendi.
- Gün kapatma; bekleyen müşteri, erken kapanış ve günlük gider sonucunu gösteriyor.
- Talep hacmi mağaza sermayesine göre ölçekleniyor; katalog dışı istek üretilmiyor.
- Tedarik limiti/vadesi tek hesaplama kaynağından gösteriliyor.
- 22 ayar işçiliksiz yatırım bilezikleri sade, gerçekçi WebP asset kullanıyor.
- Stoksuz müşteriyi gönderme, aşama atlama ve Atölye teslimleri görünür geri bildirim veriyor.
- Standart sarrafiye öğretimi yanlış “beyan doğrulanmadı” metnine düşmüyor.
- Pazarlık karşı teklifi normal durumda oyuncunun iyileşen teklifine ters yönde kaçmıyor.
- Kuyrukta işlemeyen sabır noktaları kaldırıldı; kısa ekranda müşteri kartı korunuyor.
- Kariyer yol haritası, Piyasa fiyat bandı/stok ortalaması, sarrafiye kategorileri,
  kompakt Esnaf Ağı ve kayıt önizlemesi eklendi.
- 4x düğmesindeki gerçek olmayan video vaadi kaldırıldı.

Market ekranı bu çalışma boyunca değiştirilmedi.

## Test yöntemi

- Oyun 390×844 ve 360×640 mobil boyutlarında oynandı.
- 11 oyun gününe kadar ilerletildi.
- Müşteriden işçilikli ürün alış, standart sarrafiye alış, stoksuz müşteriye satış ve servis kabul/teslim akışları oynandı.
- Stok, Piyasa, Toptancı, Esnaf Ağı, Atölye, İşletme, Mağaza gelişimi, Kariyer ve Kayıt ekranları incelendi.
- Yatay taşma, hata katmanı ve tarayıcı konsol hataları kontrol edildi.
- Ekspertiz müşterisi deterministik örneklemde oluşmadığı için bu özel akış hata bulgusu olarak puanlanmadı.

## Genel değerlendirme

Oyunun çekirdeği çalışıyor ve kimliği belirgin. Özellikle servis kabulü → süre/risk seçimi → Atölye kuyruğu → teslim sonucu zinciri güçlü. Müşteri taleplerinin açık ürün adıyla verilmesi ve bekleyen müşterilerin sırayla gösterilmesi de doğru yönde.

Bir sonraki güncellemenin ana hedefi yeni sistem eklemekten önce **yanlışlıkla para/ilerleme kaybını önlemek, gösterilen rakamları tek doğruluk kaynağına bağlamak ve erken oyunda imkânsız talepleri azaltmak** olmalı.

## P1 — Önce düzeltilmesi gerekenler

### 1. Toptancı ekranı tehlikeli biçimde yüksek adetle açılıyor

**Kanıt:** Toptancı Hesabı ekranında ürünler 1 adet yerine “alınabilecek en yüksek miktar” ile açıldı. Örnekler:

- Gram Altın (1 g): 39 adet / 163.176 ₺
- Çeyrek Altın: 39 adet / 272.415 ₺
- Tam Altın: 36 adet / 998.460 ₺

Tek bir `Al` dokunuşu kasanın büyük bölümünü tüketebilir. Stok ekranındaki Sarrafiye Al sayfası 1 adetle başladığı için iki tedarik ekranı da birbiriyle tutarsız.

**Öneri:**

- Tüm tedarik satırları varsayılan olarak `1` adet açılsın.
- “En çok alınabilir: 39” yalnız yardımcı bilgi/ikincil buton olsun.
- Kasayı %20’den fazla azaltan veya belirli bir eşiği aşan alımlarda özet onayı gösterilsin.

**Kabul kriteri:** Ekran ilk açıldığında hiçbir ürün 1’den yüksek seçili gelmez; yanlış tek dokunuşla yüz binlerce lira harcanamaz.

### 2. Teklif rakamı ile slider’ın gerçek değeri farklı

**Kanıt:** Pazarlık ekranında görünen teklif ile slider erişilebilirlik/değer çıktısı sürekli farklıydı:

- Görünen: 6.116 ₺ — slider: 6.099
- Görünen: 6.616 ₺ — slider: 6.599
- Görünen: 6.766 ₺ — slider: 6.749

`min` değerinin step tabanına oturmaması nedeniyle tarayıcı slider’ı başka değere yuvarlıyor; metin ve oyun state’i farklı rakam konuşuyor.

**Öneri:** Teklif başlangıcı, min/max ve artış adımı aynı `snapToStep` fonksiyonundan geçsin. Slider değeri, büyük teklif rakamı, birim fiyat ve gönderilen teklif birebir aynı olsun.

**Kabul kriteri:** Slider’ın DOM değeri, ekrandaki teklif ve transaction’a giden teklif her durumda eşittir.

### 3. “Günü Bitir” bekleyen müşterileri uyarısız siliyor

**Kanıt:** Kuyrukta iki/üç müşteri varken `Günü Bitir` anında çalıştı, yeni güne geçti ve kuyruk temizlendi. Sonuç bildirimi yalnız gider ve piyasa fırsat maliyetini gösterdi; gönderilen müşteriler veya olası itibar etkisi açıklanmadı. Buton sabah 09:00’da da kullanılabilir.

**Risk:** Yanlış dokunuşla müşteri ve gün kaybı; ayrıca günleri hızla atlayarak piyasa/müşteri yeniden çekme davranışı.

**Öneri:**

- Bekleyen veya aktif müşteri varken açık sonuçlu onay göster.
- Onayda “3 müşteri ayrılacak, olası itibar etkisi X” yazsın.
- Normal gün sonu butonu kapanış saatine yakın aktifleşsin; erken kapatma ayrı ve bilinçli bir karar olsun.

**Kabul kriteri:** Kuyruk varken tek dokunuşla gün kapanmaz ve kaybedilecek müşteriler görünür.

### 4. Erken oyunda ekonomik olarak imkânsız müşteri talepleri oluşuyor

**Kanıt:** Düşük kademede ve boş stokla şu talepler oluştu:

- 5 adet 80 g 22 ayar işçiliksiz bilezik (toplam 400 g)
- 2 adet 100 g gram altın

Talep ürünleri katalogda gerçekten bulunsa da oyuncunun nakdi, kredi limiti, mağaza kademesi ve stok kapasitesi bu hacimleri karşılamaya uygun değil.

**Öneri:** Talep üretiminde katalog uygunluğuna ek olarak mağaza kademesi, kullanılabilir nakit+kredi, stok kapasitesi ve makul tedarik bandı kullanılsın. Büyük talepler ilerleyen kademelerde açılan prestij fırsatları olsun.

**Kabul kriteri:** Kademe 1 müşteri talebinin toplam tedarik maliyeti tanımlı erken oyun bandını aşmaz; büyük talepler seviye/kademe ile ölçeklenir.

### 5. İşletme ve Toptancı ekranları aynı hesabı farklı gösteriyor

**Kanıt:** İşletme ilişkiler özetinde `40.000 ₺ · 3 gün vade`; Toptancı ekranında `26.136 ₺ · 5 gün vade` gösterildi. Aynı ekranda rota kartı da 26.136 ₺ kullanılabilir limit diyordu.

**Öneri:** Toplam limit, kullanılabilir limit ve vade tek selector/hesap kaynağından gelsin. “Toplam” ve “kullanılabilir” ayrı etiketlensin.

**Kabul kriteri:** İşletme özeti, rota kartı ve Toptancı detayında aynı anda çelişkili limit/vade görünmez.

### 6. 22 ayar işçiliksiz bilezik görseli ürün tanımıyla çelişiyor

**Kanıt:** 10–100 g yatırım bileziklerinin özel asset eşlemesi yok. Hepsi `bracelet` fallback’i üzerinden telkari/işçilikli bilezik görselini kullanıyor. “İşçiliksiz yatırım bileziği” ile süslü telkari görseli aynı ürün değil.

**Öneri:** Sade 22 ayar yatırım bileziği için gerçekçi, işçiliksiz bir ana asset oluştur. Gramajlar aynı temel modelin kalınlık/ölçek varyantlarını kullanabilir; en azından 10/20/50/100 g görsel farkı okunmalı.

**Kabul kriteri:** İşçiliksiz bilezik hiçbir ekranda telkari, taşlı veya özel tasarım gibi görünmez.

## P2 — Sonraki kullanılabilirlik güncellemesi

### 7. Karşılanamayan müşteri sessizce kayboluyor

Stok yokken `Müşteriyi Gönder` seçildiğinde doğrudan ana ekrana dönülüyor. İtibar, güven, kaybedilen fırsat veya tekrar gelme ihtimali gösterilmiyor.

**Öneri:** Kısa sonuç satırı/toast: “Talep karşılanamadı · itibar −1 · kaybedilen tahmini satış …”. Ceza yoksa bu da açıkça yazsın.

### 8. Standart sarrafiye öğretim metni ekrandaki bilgiyle çelişiyor

Çeyrek Altın ekranında ağırlık ve ayar `doğrulandı`, ilerleme `2/2 alan` iken öğretim “Müşterinin söylediği ağırlık ve ayar doğrulanmış değil” diyordu.

**Öneri:** Standart sarrafiyeye özel ders metni kullan: “Standart ürün doğrulandı; doğrudan fiyata geçebilir veya şüphede ek test yapabilirsin.”

### 9. Aşama sekmesine dokunmak düşük güvenle planı otomatik seçiyor

Yalnız Terazi testi yapıldıktan sonra doğrudan `Pazarlık` sekmesine geçilebildi; sistem düşük güvenli bandı kurup `Vitrin` tezini otomatik seçti. Hızlı oynanabilir ancak oyuncu hangi kararı atladığını anlamıyor.

**Öneri:** Atlanan aşamalar için modal değil, kısa ara uyarı kullan: “Değerleme ve çıkış planı tamamlanmadı; düşük güvenle devam ediyorsun.” Otomatik seçilen tez ayrıca `Otomatik: Vitrin` olarak etiketlensin.

### 10. Pazarlık ilerlemesi zaman zaman ters yönde hissediliyor

Oyuncu teklifi 6.116 → 6.616 ₺ yükselttiğinde müşteri karşı teklifi 7.739 → 7.772 ₺ yükseldi. Sonraki turda 7.743 ₺’ye indi. Matematiksel sertleşme mümkün olsa da ekranda neden açıklanmadığı için daha iyi teklif cezalandırılmış gibi görünüyor.

**Öneri:** Müşteri karşı teklifi normal durumda iyileşen oyuncu teklifine karşı monoton biçimde yaklaşsın. Sertleşme varsa “Önceki düşük teklif güveni azalttı” nedeni gösterilsin.

### 11. Bekleme kuyruğundaki sabır göstergesi şu an işlevsel değil

Müşteriler uzun süre kuyrukta beklese de kartların sabrı 5/5 kalıyor; sabır yalnız aktif pazarlıkta değişiyor. Bu durumda kuyruk kartındaki sabır göstergesi dekoratif ve yanlış beklenti oluşturuyor.

**Öneri:** Ya kuyrukta bekleme süresi sabrı/ilişkiyi kontrollü etkilesin ya da karşılanana kadar sabır noktaları yerine “Yeni / Bir süredir bekliyor / Uzun bekledi” etiketi gösterilsin.

### 12. Kariyer / Yetenekler çalışan rota gibi görünüp boş sayfaya gidiyor

İşletme ekranında normal rota olarak sunuluyor; açıldığında yalnız “Yakında” yazıyor. Oyuncu XP kazanıyor (servis kabulünde 18 XP gözlendi) fakat bunun anlamını göremiyor.

**Öneri:** Sistem tamamlanana kadar kartı `Yakında` rozetiyle pasifleştir veya en azından mevcut seviye, XP, sonraki seviye eşiği ve açılacak araçları gösteren salt-okunur yol haritası ekle.

### 13. Piyasa ekranı karar vermek için geçmiş bağlam sunmuyor

Ekran yalnız güncel fiyat ve günlük yüzdeyi gösteriyor. Oyuncu hareketin trend mi, tek günlük sıçrama mı olduğunu ayırt edemiyor.

**Öneri:** Geleceği açıklamadan son 7 gün mini grafik, gün içi yüksek/düşük ve oyuncunun ortalama stok maliyeti karşılaştırması ekle.

### 14. Sarrafiye tedarik listesi kategori olmadan çok uzadı

Gram altınlar, ziynetler ve 10 farklı bilezik gramajı tek listede. Yeni bileziklerle liste 20’den fazla satıra çıktı.

**Öneri:** `Gram / Ziynet / Bilezik` kategori çipleri, kompakt ürün seçici ve gramaj alt seçimi kullan. Satın alma işlemi yine mevcut transaction sisteminden geçsin.

### 15. Esnaf Ağı ekranı tekrar eden büyük kartlardan oluşuyor

Altı esnaf aynı yapıda uzun bloklar hâlinde listeleniyor. Kimin altın aldığı, kimin daha iyi ilişki/nakit sunduğu hızlı karşılaştırılamıyor.

**Öneri:** “Altın alanlar”, “En yüksek nakit”, “En iyi ilişki” sıralaması; özet satır + açılır detay yapısı kullan.

### 16. Geri yükleme ekranında kayıt özeti ve güvenlik adımı eksik

`Son Kaydı Geri Yükle` butonu var ancak son kaydın gün/saat, nakit, stok ve kayıt zamanı önizlemesi görünmüyor.

**Öneri:** Son kayıt özeti göster; geri yükleme öncesi “mevcut ilerleme bu kayıtla değiştirilecek” onayı kullan.

### 17. Atölye bildirimi teslimden sonra eski kalabiliyor

Servis teslim edildikten sonra ekranda hâlâ “1 servis işi teslime hazır — Atölye’ye bak” bildirimi görüldü. Alt navigasyonda da hazır iş sayısını gösteren rozet yok.

**Öneri:** Teslimle birlikte hazır-iş bildirimi anında tüketilsin; Atölye sekmesinde aktif/hazır/geciken iş rozeti gösterilsin.

### 18. 4x düğmesi “video izle” diyor fakat anında açılıyor

`4x hızı aç — video izle` düğmesine dokununca video/reward akışı olmadan 4x açıldı.

**Öneri:** Reklam sistemi yoksa metni “4x hızı aç” olarak değiştir. Reklam planlanıyorsa gerçek rewarded akış gelene kadar yanıltıcı video vaadini gösterme.

### 19. Kısa ekranda öğretim, müşteri kuyruğunu tamamen saklıyor

360×640 görünümünde üç müşteri beklerken öğretim şeridi açıldığında dikey müşteri kartları görünmedi; yalnız alttaki genel `Müşteriyi Karşıla` butonu kaldı.

**Öneri:** Kısa ekranda öğretimi tek satır/alt sheet hâline getir veya en azından sıradaki müşterinin tek kompakt kartını görünür tut.

## Korunması gereken güçlü taraflar

- Bekleyen müşterilerin `Şimdi / 2. sırada / 3. sırada` biçiminde görünmesi.
- Müşteri taleplerinin açık ürün ve gramaj diliyle yazılması.
- Servis akışındaki kendi atölyesi / dış usta, süre, hata riski ve net katkı karşılaştırması.
- Servis ücretinin yalnız teslimde tahsil edilmesi ve parça maliyetinin başta görünmesi.
- Atölye teslim sonucunda ücret, tazmin, net katkı, ilişki ve itibarın birlikte gösterilmesi.
- Dükkan adının profil taban adından türetilmesi.
- 390 px genişlikte yatay taşma ve konsol hatası bulunmaması.

## Önerilen uygulama sırası

1. **Güvenlik hotfix’i:** Toptancı varsayılan adedi, teklif slider senkronu, gün sonu koruması.
2. **Ekonomi tutarlılığı:** Talep hacmi ölçekleme ve Toptancı limit/vade tek kaynağı.
3. **Ürün doğruluğu:** İşçiliksiz bilezik asseti ve sarrafiye kategori seçicisi.
4. **Geri bildirim geçişi:** Müşteri gönderme sonucu, doğru öğretim metni, pazarlık sertleşme nedeni, Atölye rozetleri.
5. **İlerleme/derinlik:** Kariyer özeti, Piyasa geçmiş grafiği, Esnaf Ağı sıkıştırması, kayıt önizlemesi.

## Sonuç

Market hariç çekirdek oyunun güncellenebilir en önemli noktası yeni ekran eklemek değil; **mevcut kararların güvenli, tutarlı ve sonuçları okunur hâle gelmesi**. İlk beş P1 maddesi düzeltildiğinde oyun daha adil, daha anlaşılır ve üretime daha yakın hissedilir. Sonraki P2 turu ise mevcut mekanikleri büyütmeden profesyonel mobil oyun kalitesine taşır.
