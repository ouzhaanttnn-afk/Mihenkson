# MIHENKAYNAK

**Kuyumcu Simülatörü** — *"Değeri gör. Riski al. Güveni büyüt."*

Mobil öncelikli, portrait, tek oyunculu tycoon / shop management simülasyonu.

> **Tek doğruluk kaynağı:** `MIHENKAYNAK GDD v2.3 — Final Production Edition`.
> Bu depodaki hiçbir mekanik GDD'de olmayan bir kural eklemez, mevcut kuralları
> sadeleştirmez veya değiştirmez. Görsel kimlik (renk, ikon dili, marka)
> `UI Asset Pack v1` referanslarından okunur.

---

## Şu an ne çalışıyor?

İki müşteri akışı uçtan uca oynanabilir (GDD 23.23 intent matrisi):

**Ticaret:** Müşteri karşılama → İncele → Değerle → Tez → Pazarlık → Settlement → Vaka özeti

**Servis:** Müşteri karşılama → Tanıla → Teklif → Söz → Atölye Kuyruğu → Teslim

- Test araçlarıyla belirsizliği daraltma; değer bandı ve güven seviyesi
- 2–4 rasyonel çıkış kanalının net getiri / süre / risk / likidite karşılaştırması
- Kanal seçimine göre değişen alış tavanı
- `OPEN → HARDENING → FINAL OFFER → ACCEPTED / REJECTED` pazarlık durum makinesi
- Anti-spam: aynı teklifi tekrarlamak yeni kabul şansı üretmez
- Kalem bazlı, idempotent settlement ve DealRecord
- İşlem sonrası öğretici vaka özeti
- Servis: 7 servis türü, kendi atölye ↔ dış usta karşılaştırması, kapasite ve
  yoğunluğa bağlı hata riski, teslim sözü kararı, gecikme ve tazmin sonuçları
- Stok, Atölye, İşletme kök ekranları; Piyasa ve İşlem Defteri ikincil rotaları

```bash
npm install
npm run dev        # geliştirme sunucusu
npm test           # 79 invariant testi (ekonomi + servis)
npm run build      # production build
```

---

## Mimari

İş mantığı UI'dan tamamen ayrıktır. `src/domain/` saf TypeScript'tir:
React, DOM veya store bağımlılığı yoktur ve doğrudan test edilir.

```
spec/
  design_tokens.json     GDD EK H — tek renk + ölçü kaynağı
  asset_manifest.csv     Dosya envanteri ve kullanım amacı

src/domain/              Saf oyun mantığı — UI bağımsız
  types.ts               GDD 28.2 veri nesneleri
  balance.ts             Tek tuning yüzeyi (PLAYTEST parametreleri)
  rng.ts                 Determinizm katmanı (GDD 28.3)
  market.ts              Piyasa rejimleri ve olaylar (GDD 13)
  item-spawn.ts          Hidden truth sabitleme (GDD 5.2–5.4)
  customer-spawn.ts      Müşteri ve rezervasyon fiyatı (GDD 9)
  valuation.ts           Değerleme motoru ve güven seviyesi (GDD 6, 7)
  thesis.ts              İşlem Tezi ve alış tavanı (GDD 8, 6.4)
  negotiation.ts         Pazarlık durum makinesi (GDD 11)
  service.ts             Servis kabul, kapasite, hata riski, teslim (GDD 17)
  settlement.ts          İdempotent ekonomi defteri (GDD 22)
  deal-review.ts         İşlem sonrası vaka özeti (GDD 22.3)
  invariants.test.ts     GDD 31.3 / EK F ekonomi kabul testleri
  service.test.ts        GDD 17 / 22.4 / EK F servis kabul testleri

src/data/                İçerik — koddan ayrık veri (GDD 28.1)
  item-templates.ts      Ürün şablonları (GDD 29.2)
  archetypes.ts          Müşteri arketipleri (GDD 9.2 / EK C)
  tools.ts               Test araçları (GDD 7 / EK D)
  service-types.ts       Servis türleri (GDD 17.1)

src/state/gameStore.ts   Orkestrasyon. İş mantığı BURADA YAŞAMAZ.

src/ui/
  tokens.css             design_tokens.json'un CSS karşılığı
  icons.tsx              Inline SVG ikon seti (EK H — "kodla çizilir")
  shell/                 GDD 23.9.2 global ekran kabuğu bölgeleri
  workbench/             İncele / Değerle / Tez / Pazarlık / Sonuç
                         + Tanıla / Teklif / Söz / Kuyruk (servis)
  screens/               Dükkan, Stok, Atölye, İşletme
```

### Neden bu ayrım?

GDD 28.1 sistemlerin veri güdümlü, içeriğin koddan ayrık olmasını ister.
Pratik sonucu: bir denge değeri değiştiğinde yalnız `balance.ts` değişir;
yeni bir ürün eklemek yalnız `item-templates.ts`'e satır eklemektir; ve
ekonomi değişmezleri UI'dan bağımsız olarak test edilebilir.

---

## Değişmezler ve nasıl korunuyorlar

GDD 34 "Tasarımın Değişmez Kuralları" bu depoda yorum değil, yapı ve testtir.

| Değişmez | GDD | Nasıl korunuyor |
| --- | --- | --- |
| Hidden truth spawn'da sabitlenir, reroll edilmez | 5.4 / 34.1 | Her spawn `(rootSeed, index)`'ten türer; global RNG akışı yok |
| Rezervasyon fiyatı spawn'da sabitlenir | 34.2 | `spawnCustomer` içinde bir kez hesaplanır, sonra hiç yazılmaz |
| Aynı teklif spam'i yeni şans üretmez | 34.3 | Kabul kararında **hiç rastgelelik yok**; atılacak zar olmadığı için tekrar yeni sonuç veremez |
| Her ekonomik işlem tek settlement | 22.1 / 34.4 | `applyTransaction` uygulanmış `txId` kümesini tutar; ikinci çağrı no-op |
| Gerçekleşmiş kâr ≠ stok potansiyeli | 34.5 | Ayrı alanlar; `revalueInventory` yalnız `currentValue` yazar |
| Toptancı risksiz arbitraj değildir | 34.7 | Tüm kanal fiyatları aynı spot ve spread'den türer |
| Görünmez risk yoktur | 7.3 | `HiddenFlaw.readableSignal` opsiyonel değildir; test tüm üretimi tarar |
| Test bilgi verir, para basmaz | 34.9 | Testler yalnız `certainty` artırır; kasa/stok yazamazlar |
| Atölye pasif gelir üretmez | 17.4 / 34.13 | `advanceJobsOneDay` saf süre fonksiyonudur; para yalnız teslimde hareket eder |
| Servis işi duplicate completion üretmez | EK F | Teslim `txId` iş kimliğini taşır; `result: 'delivered'` ikinci teslimi engeller |
| Servis sonucu reload ile değişmez | 28.3 | Başarı/başarısızlık kabul anında `(seed, jobId)` ile sabitlenir |

Testler denge değerlerini değil sözleşmeyi korur. Bir tuning parametresi
değiştiğinde bu testler geçmeye devam etmelidir; geçmiyorsa değişen şey denge
değil tasarım sözleşmesidir.

### Ekran mimarisi sözleşmesi

GDD 23.9 "bağlayıcı üretim sözleşmesi"dir. `AppShell.css` bölge yüksekliklerini
birebir uygular ve aktif Dükkan `overflow: hidden` ile yapısal olarak scroll'suz
kalır — ana CTA hiçbir cihazda scroll altına düşemez.

390 × 844 referans tuvalde safe-area dışı ~763 px:

```
Durum 52 + Piyasa 44 + Müşteri 50 + Aşama 32
      + İşlem Masası 337 + Araç Rayı 56 + Karar Dock'u 128 + Alt Nav 64 = 763
```

360–430 px genişlikte İşlem Masası esner; **karar alanları küçülmez veya
kaybolmaz** (GDD 23.22). Kısa cihazlarda içerik kırpılmaz, yoğunluk azaltılır.

---

## Teknoloji notu

GDD 28.1 motor için "Unity veya Godot" varsayar. Bu depo React + TypeScript +
Vite kullanır ve WebView paketlemesi (Capacitor) için göreli asset yollarıyla
build alır.

Bu bir mekanik sapması değildir: GDD 28.1 "teknik varsayımlar" başlığı altındadır,
Bölüm 34'teki değişmezler arasında değildir. Karşılığında istenen her teknik
sözleşme korunur — deterministik seed, veri güdümlü içerik, idempotent
settlement, versiyonlanabilir save. Değişmezler saf `domain/` katmanında
yaşadığı için, motor değişikliği gerekirse bu katman büyük ölçüde taşınabilir.

---

## Sıradaki üretim adımları

GDD'de tanımlı, henüz üretimde olmayanlar:

- **Kalan intent akışları (23.23):** dükkandan satış ve ekspertiz/danışma.
  Müşteri havuzu şu an yalnız akışı uygulanmış niyetleri üretir (satış + servis).
- **Çoklu ürün (12, 23.13):** kalem şeridi ve kalem bazlı settlement hazır;
  paket teklif ekonomisi eksik.
- **Toptancı (16, 23.17):** güven, limit, vade ve lot ekranı.
- **Atölye derinliği (17.2, 23.18):** personel işe alma, ekipman satın alma ve
  servis türü uzmanlığı. Kapasite, hata riski ve teslim sözü üretimdedir.
- **Save/migration (28.1):** işlem bazlı auto-save ve gün sonu checkpoint.
- **Onboarding (25):** ilk 25 dakikalık öğretim akışı.

Yeni fikirler doğrudan üretime eklenmez; önce backlog/playtest
değerlendirmesine girer (GDD EK H.6).
