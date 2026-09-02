# MIHENKAYNAK — UPDATEv5.1: gün kapanışı ve personel

31 Ağustos 2026 · Yalnız `ouzhaanttnn-afk/clonemihenk` · Dal: `codex/updatev1`.

Bu teslim önceki yerel UPDATEv5 çalışmasını da içerir. Orijinal Mihenkaynak deposundaki kapanış bileşenleri yalnız okunup görsel akış referansı olarak kullanıldı. Orijinalin farklı ekonomi, takvim ve Market sistemleri taşınmadı. Orijinale yazma, otomatik merge veya üretim deploy işlemi yapılmadı.

## Gün kapanışı

- Krem/altın, karartılmış ve bulanık arka planlı onay penceresi: saat, günlük toplam gider, bekleyen müşterilerin ayrılacağı bilgisi, Vazgeç / Günü Bitir.
- Kapanış özeti: gün ve hafta günü, gerçekleşmiş kâr, gider, gidere dahil personel payı, günlük transaction nakit hareketi, kapanış nakdi, stok potansiyeli, nakit oranı, kaçırılan misafir ve mevcut gecelik piyasa yorumu.
- Kâr ile kasa hareketi ayrıdır: stok alışları gibi gerçekleşmiş kâr sayılmayan nakit hareketleri kasa değişimine dahildir. Stok potansiyeli nakit kazanç değildir.
- Onay ve özet açıkken saat/piyasa/müşteri akışı durur. `Yeni güne başla` özeti kapatır; ikinci gün atlatmaz ve ikinci gider kesmez.
- Gün kapanışı mevcut idempotent transaction yolunda çalışır. Kayda yazılamazsa ilerleme uygulanmaz. Özet kayda dahil olduğundan yenilemede geri açılır; eski kayıtlarda yeni alan zorunlu değildir.
- Native modal dialog arka plana tıklamayı engeller ve klavye odağını içeride tutar. React kontrol rehberiyle effect temizliği ve odak dönüşü kontrol edildi.

## Personel

| Personel | Açılış seviyesi | Aylık toplam | Günlük personel payı |
| --- | --- | --- | --- |
| 0 | Başlangıç | 0 TL | 0 TL |
| 1 | 3 | 40.000 TL | 40.000 / 30 TL |
| 2 | 6 | 90.000 TL | 3.000 TL |
| 3 | 10 | 150.000 TL | 5.000 TL |

Maaşlar kişi başına 40.000 + 50.000 + 60.000 TL eklenir. Günlük toplamda mevcut sabit gider de bulunur; 1.200 TL sabit giderli üç personelli dükkânda kapanış tahsilatı 6.200 TL'dir. TL yuvarlama mevcut nihai ödeme kuralına göre yapılır. Günlük dağıtım 30 oyun günü varsayar; ayrı aylık fatura motoru kurulmadı.

İlk iki personelde 3 / 6 seviyeleri uygulama varsayımıdır; üçüncü personelde kullanıcının istediği 10. seviye kullanıldı. Kilit hem UI hem state action katmanında uygulanır. Önceki kayıtta zaten işe alınmış personel geri alınmaz; azaltıldıktan sonra yeniden işe alım seviye şartına tabidir. Personel yalnız bekleme kapasitesini artırır; müşteri üretimi veya atölyeyi değiştirmez.

## Bu ek çalışmada değişen dosyalar

- `src/domain/v5-rules.ts`: maaş toplamları, seviye kilitleri, günlük toplam, gün adı.
- `src/domain/settlement.ts`: kapanış nakdi ve nakit akışı raporu.
- `src/state/gameStore.ts`: duraklatma, onay/özet eylemleri, güvenli kayıt, personel kilidi; eşzamanlı bildirim kimliği çakışması düzeltildi.
- `src/state/save.ts`: özetin yeniden yüklenmesi.
- `src/ui/shell/DayCloseDialog.tsx`, `AppShell.css`: yeni modal ve stili.
- `src/ui/App.tsx`, `src/ui/screens/ShopScreen.tsx`: kapanış akışının bağlanması.
- `src/ui/screens/BusinessScreen.tsx`: maaş dökümü, seviye etiketleri ve kilitler.
- `src/state/day-close.test.ts`: 21 ek regresyon testi.
- `src/domain/updatev5.test.ts`: yeni maaş toplamlarına göre beklenen değerler.

## Doğrulama

- TypeScript ve production build başarılı.
- 30 dosyada 646 test; V5'in 85 testi ve bu ek çalışmanın 21 testi dahil.
- Yerel tarayıcıda 390×844: onay, iptal, kapanış, özet, sayfa yenileme, yeni güne başlama ve personel kilitleri kontrol edildi.
- Örnek yerel kayıtta 929.332 TL → 923.132 TL; 6.200 TL kapanış gideri bir kez kesildi. Yenileme ve özet onayı bakiyeyi tekrar değiştirmedi.
- Seviye 1'de 0 personele geçildiğinde 1/2/3 personel alım butonları kilitli görüldü. 3/6/10 eşikleri ayrıca otomatik test edildi.
- Görseller: `reports/updatev5/day-close-confirm-390x844.png` ve `day-close-report-390x844.png`.

> 1 Eylül slider düzeltmesi: Sarrafiye Al'daki üç ürün ailesinin tümüne nakit/kapasite maksimumlu slider eklendi. HAS slider miktar seçimi artık cuma dışında da çalışır; yalnız ekonomik işlem onayı cuma günü açıktır.

GitHub'a gönderim canlı sitenin otomatik olarak bu daldan yayınlandığını kanıtlamaz. Vercel bu dalı kullanmıyorsa mevcut sitenin görünümü değişmez; bu çalışma Vercel ayarlarını değiştirmez.

## Kısa düzeltme — 1 Eylül 2026

- Stok → Sarrafiye Al yalnız Gram Altın, Çeyrek Altın ve 22 Ayar İşçiliksiz Yatırım Bileziği gösterir.
- Gram Altın 0,001 g hassasiyetle serbest pozitif gramdır; Çeyrek tam adet, bilezik ±10 g çalışır. Eski yapay lot tavanı bu üç ailede yoktur; nakit ve gerçek arka-stok yuvası sınırdır.
- Üç aile mevcut ortak havuzlara girer; gram/bilezikte mg, çeyrekte adet ve ağırlıklı ortalama maliyet korunur. Tedarik peşindir ve fiyat mevcut toptancı kanalından gelir.
- HAS manuel text input yerine alış/satışa göre canlı maksimumlu 0,001 g slider kullanır. Cuma, nakit, mevcut HAS ve transaction kontrolleri korunur.
- Trafik ve günlük intent oranları İşletme ekranından kaldırıldı; deterministik simülasyon kodu değiştirilmedi.
- 31 test dosyasında 680 test, TypeScript ve production build başarılıdır. Bu düzeltmeye ait 34 yeni işlem testi dahildir. Tarayıcı görsel doğrulaması Codex kullanım sınırı nedeniyle çalıştırılamadı; bu durum build ve otomatik doğrulamaları etkilemedi.
