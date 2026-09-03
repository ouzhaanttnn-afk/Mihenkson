/**
 * SARILMAMIŞ TÜRKÇE METİN TARAYICISI — kaynağın kendisinde, tarayıcıda değil.
 *
 * Tarayıcı taraması ancak GİDEBİLDİĞİ ekranı görür; akışlar rastgele
 * olduğu için ulaşılamayan diyalog ve alt rotalar sessizce temiz görünür.
 * Bu araç kaynağı okur: `t()` içinden GEÇMEYEN her Türkçe dizeyi ve JSX
 * metnini listeler. Kapsamı akışa değil dosyaya bağlı, yani eksiksiz.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const TR_CHAR = /[çğıöşüÇĞİÖŞÜ]/;
const TR_WORD =
  /\b(ve|ile|için|bir|bu|var|yok|gun|gün|adet|kadar|daha|her|kayit|kayıt|musteri|müşteri|satis|satış|urun|ürün|deger|değer|guven|güven|seviye|nakit|altin|altın|dukkan|dükkan|senin|kar|kâr|zarar|teklif|stok|fiyat|gider|borç|borc|vade|limit|risk|test|rapor|sonuç|sonuc|paket|kuyruk|hazır|hazir|yeni|eski|son|ilk|tüm|tum)\b/i;

const teknik = (s) =>
  /^var\(--/.test(s) ||                       // CSS değişkeni
  /^[a-z0-9_\-./:# ]+$/.test(s) ||           // sınıf adı, kimlik, yol
  /^[A-Z][A-Za-z0-9_]*$/.test(s) ||          // tip / sabit adı
  /^[\d\s.,:%+\-–—×/()]+$/.test(s) ||        // sayı ve simge
  s.length < 2;

const turkce = (s) => !teknik(s) && (TR_CHAR.test(s) || TR_WORD.test(s));

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name) && !name.includes('.test.')) out.push(p);
  }
  return out;
}

/** Yorumları boşlukla değiştirir — konum kayması olmasın diye aynı uzunlukta. */
function yorumsuz(src) {
  let out = '';
  let i = 0;
  let mod = 'kod';
  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];
    if (mod === 'kod') {
      if (c === '/' && n === '*') { mod = 'blok'; out += '  '; i += 2; continue; }
      if (c === '/' && n === '/') { mod = 'satır'; out += '  '; i += 2; continue; }
      out += c; i += 1; continue;
    }
    if (mod === 'blok') {
      if (c === '*' && n === '/') { mod = 'kod'; out += '  '; i += 2; continue; }
      out += c === '\n' ? '\n' : ' '; i += 1; continue;
    }
    if (c === '\n') { mod = 'kod'; out += '\n'; i += 1; continue; }
    out += ' '; i += 1;
  }
  return out;
}

/*
  SÖZLÜKTE KARŞILIĞI OLAN METİN SORUN DEĞİL. Veri tablolarındaki etiketler
  bilerek sarılmamış — onlar çizim anında `t(label)` ile çevriliyor. O yüzden
  asıl soru "sarılmış mı" değil, "SÖZLÜKTE KARŞILIĞI VAR MI": karşılığı olan
  her metin, nereden gelirse gelsin, ekranda İngilizce çıkar.
*/
const sozluk = new Set(
  [...readFileSync('src/i18n/en.ts', 'utf8').matchAll(/^\s*(['"])((?:\\.|(?!\1)[^\\])*)\1\s*:/gm)].map(
    (m) => m[2].replace(/\\'/g, "'").replace(/\\"/g, '"'),
  ),
);

/*
  EKRANA HİÇ ÇIKMAYAN ALANLAR. Bunlar tasarım notu, geliştirici hatası ve
  veri kimliğidir; hiçbiri arayüzde render edilmiyor (`grep .designNote src/ui`
  boş döner). Çevrilmeleri yanlış olurdu: `demandTags` gibi kimlikler
  karşılaştırmada kullanılıyor, çevirmek ekonomiyi değiştirirdi.
*/
const GORUNMEZ_ALAN = /^\s*(designNote|goodStrategy|badStrategy|demandTags|preferredFamilies)\s*:/;

const bulgular = [];

for (const dosya of walk('src')) {
  if (dosya.endsWith('i18n/en.ts')) continue; // sözlüğün kendisi
  const ham = readFileSync(dosya, 'utf8');
  const src = yorumsuz(ham);
  const satirlar = src.split('\n');

  // 1) Dize sabitleri — `t(` ile başlamayanlar.
  const dize = /(['"])((?:\\.|(?!\1)[^\\\n])*)\1/g;
  let m;
  while ((m = dize.exec(src))) {
    const satirBasi = src.lastIndexOf('\n', m.index) + 1;
    const satirTam = src.slice(satirBasi, src.indexOf('\n', m.index));
    if (GORUNMEZ_ALAN.test(satirTam)) continue;
    const val = m[2].replace(/\\'/g, "'").replace(/\\"/g, '"');
    if (!turkce(val)) continue;
    if (sozluk.has(val)) continue;                    // çizimde t(x) ile çevriliyor
    // `t(` çağrısı satır kırılmış olabilir; geriye doğru boşlukları atla.
    const once = src.slice(Math.max(0, m.index - 40), m.index);
    if (/\bt\(\s*$/.test(once)) continue;             // t('...') / t(\n  '...')
    const satirNo = src.slice(0, m.index).split('\n').length;
    bulgular.push({ dosya, satirNo, tur: 'dize', metin: val });
  }

  // 2) JSX metin düğümleri — `>metin<`
  const jsx = /(?<![=\-<>!])>([^<>{}\n]*[A-Za-zÇĞİÖŞÜçğıöşü][^<>{}\n]*)</g;
  while ((m = jsx.exec(src))) {
    const val = m[1].trim();
    if (!turkce(val) || sozluk.has(val)) continue;
    const satirNo = src.slice(0, m.index).split('\n').length;
    bulgular.push({ dosya, satirNo, tur: 'jsx', metin: val });
  }

  // 3) Şablon dizeleri — içinde Türkçe geçen `...`
  const sablon = /`((?:\\.|[^`\\])*)`/g;
  while ((m = sablon.exec(src))) {
    const val = m[1];
    const duz = val.replace(/\$\{[^}]*\}/g, '·').trim();
    if (!turkce(duz) || sozluk.has(duz)) continue;
    const satirNo = src.slice(0, m.index).split('\n').length;
    bulgular.push({ dosya, satirNo, tur: 'şablon', metin: duz });
  }
  void satirlar;
}

const grup = new Map();
for (const b of bulgular) {
  if (!grup.has(b.dosya)) grup.set(b.dosya, []);
  grup.get(b.dosya).push(b);
}

/*
  KALAN SAYI SIFIR OLMAZ VE OLMAMALI. Geriye kalanlar EKRANA HİÇ ÇIKMAYAN
  metinlerdir ve tek tek doğrulandı:

    · tasarım notları (`designNote`) ve arketip strateji notları — arayüzde
      hiçbir yerde render edilmiyor;
    · geliştirici hataları (`throw new Error(...)`) — oyuncu görmez;
    · veri kimlikleri (talep etiketi, ürün sınıfı etiketi, `daDe` ünlü
      listesi) — kod bunlara göre dallanıyor, çevrilirlerse EKONOMİ değişir;
    · kişi adları (müşteri, esnaf) — Türk sarrafın müşterisi Türk adı taşır.

  Yani bu araç "0 olmalı" diye değil, "yeni bir şey eklendi mi" diye
  okunur: sayı artarsa yeni bir metin gelmiştir ve bakılması gerekir.
*/
console.log(`SARILMAMIŞ TÜRKÇE METİN: ${bulgular.length}  (beklenen: ~70, hepsi ekran dışı)\n`);
for (const [dosya, liste] of [...grup].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`--- ${dosya} (${liste.length}) ---`);
  for (const b of liste) console.log(`  ${b.satirNo}:${b.tur}  ${b.metin.slice(0, 100)}`);
}
