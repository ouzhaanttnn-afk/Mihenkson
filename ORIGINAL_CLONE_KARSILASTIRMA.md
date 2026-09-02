# MIHENKAYNAK — Orijinal / Clone Karşılaştırması

Karşılaştırma tarihi: 1 Eylül 2026

- Orijinal (yalnız okuma): `ouzhaanttnn-afk/Mihenkaynak` · `7221f03`
- Clone çalışma tabanı: `ouzhaanttnn-afk/clonemihenk` · `ff9dd87`
- Ortak ata: `ccb453d`

## Clone'a güvenle taşınanlar

1. **Altı kadın avatar ve sağlam avatar ızgarası**
   - 11 erkek + 6 kadın olmak üzere 17 seçilebilir portre.
   - 390 px ekranda üç sütun, sabit satır yüksekliği ve iç kaydırma.
   - Eski kayıtların varsayılan avatarı değişmez.

2. **Sarrafiye satışında gerçek perakende çıpası**
   - Pazarlık payı ile dükkânın alış/satış makası ayrıldı.
   - Müşteriye satış eşiği artık toptancı maliyetinin altında ezilmiyor.
   - Müşterinin sabit ödeme tavanı ve UPDATEv5 ekonomik bandı korunuyor.

3. **Toptancı güveninin erişilebilir ilerlemesi**
   - Kredi kullanmayan ama anlamlı alış yapan oyuncu güven kazanabilir.
   - Küçük tekrarlar kazanç sağlamaz; peşin ticaret 65 puanda durur.
   - 65 üstü için vade ve zamanında ödeme hâlâ zorunludur.

4. **Kademe ilerleme güvenliği**
   - Kademe 5 paket kapasitesi eksik varsayılana düşmek yerine 6 satırdır.
   - Vitrin, arka stok, atölye, paket ve ürün çeşitliliğinin gerilemediği testle korunur.
   - Yükseltme ekranındaki açılım metinleri yalnız gerçekten çalışan özellikleri vaat eder.

5. **İlerleme ekranı açıklığı**
   - `42 / 52` yerine `42 → 52`: mevcut puan ile gereken puan karışmaz.
   - İtibar ve toptancı güveninin nasıl büyüdüğü koşul kapalıyken açıklanır.

## Bilinçli olarak taşınmayanlar

| Orijinal özellik | Karar | Gerekçe |
|---|---|---|
| Hafta sonu piyasa kapanışı ve pazartesi fiyat boşluğu | Ayrı denge turuna bırakıldı | UPDATEv5 gün kapanışı, maaş ve gider hesabını doğrudan etkiliyor. |
| Otomatik vitrin satışı | Ayrı denge turuna bırakıldı | Pasif gelir ve stok çıkışı eklediği için clone ekonomisini yeniden simüle etmek gerekir. |
| İtibara göre müşteri trafik çarpanı | Ayrı denge turuna bırakıldı | Kuyruk/personel kapasitesiyle birlikte ölçülmeden müşteri akışını bozabilir. |
| Ses, titreşim ve dil altyapısı | Şimdilik taşınmadı | Orijinalde gerçek ses dosyaları yerine yalnız entegrasyon iskeleti var. |
| Dolu Market ekranı | Taşınmadı | Clone'da Market bilinçli olarak boş yer tutucu; mevcut ürün ekonomisine karıştırılmadı. |

## Doğrulama

- 390 × 844 mobil görünüm: 17 avatar, 0 kart çakışması, yatay taşma yok.
- Tüm testler, TypeScript kontrolü ve üretim derlemesi çalıştırılır.
- Orijinal depoya dosya, commit, dal veya push gönderilmedi.
