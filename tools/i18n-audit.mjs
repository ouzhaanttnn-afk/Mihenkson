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

const normalizePath = (path) => path.replaceAll('\\', '/');

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
  const dosyaKey = normalizePath(dosya);
  if (dosyaKey.endsWith('src/i18n/en.ts')) continue; // sözlüğün kendisi
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
    bulgular.push({ dosya: dosyaKey, satirNo, tur: 'dize', metin: val });
  }

  // 2) JSX metin düğümleri — `>metin<`
  const jsx = /(?<![=\-<>!])>([^<>{}\n]*[A-Za-zÇĞİÖŞÜçğıöşü][^<>{}\n]*)</g;
  while ((m = jsx.exec(src))) {
    const val = m[1].trim();
    if (!turkce(val) || sozluk.has(val)) continue;
    const satirNo = src.slice(0, m.index).split('\n').length;
    bulgular.push({ dosya: dosyaKey, satirNo, tur: 'jsx', metin: val });
  }

  // 3) Şablon dizeleri — içinde Türkçe geçen `...`
  const sablon = /`((?:\\.|[^`\\])*)`/g;
  while ((m = sablon.exec(src))) {
    const val = m[1];
    const duz = val.replace(/\$\{[^}]*\}/g, '·').trim();
    if (!turkce(duz) || sozluk.has(duz)) continue;
    const satirNo = src.slice(0, m.index).split('\n').length;
    bulgular.push({ dosya: dosyaKey, satirNo, tur: 'şablon', metin: duz });
  }
  void satirlar;
}

const grup = new Map();
for (const b of bulgular) {
  if (!grup.has(b.dosya)) grup.set(b.dosya, []);
  grup.get(b.dosya).push(b);
}

/*
  Bu tarayıcı sözdizimsel olduğu için kişi adları, geliştirici hataları ve
  karşılaştırmada kullanılan veri kimlikleri gibi bilinçli Türkçe sabitleri de
  bulur. Bunlar dosya bazında gözden geçirilmiş tabandır; yeni bir dosyada ilk
  bulgu veya mevcut dosyada artış olduğunda CI durur. Bir bulgu temizlenince
  aşağıdaki tavan da aynı değişiklikte düşürülmelidir. Böylece eski "~70"
  mesajının aksine sayı yalnız bilgi vermekle kalmaz, gerçek regresyon kapısıdır.
*/
const INCELENMIS_DOSYA_TAVANI = new Map(Object.entries({
  'src/data/archetypes.ts': 16,
  'src/data/product-classes.ts': 10,
  'src/data/item-templates.ts': 8,
  'src/data/tools.ts': 7,
  'src/data/service-types.ts': 5,
  'src/domain/trade-network.ts': 5,
  'src/ui/ads.ts': 4,
  'src/state/save.ts': 3,
  'src/domain/profile.ts': 2,
  'src/domain/rng.ts': 2,
  'src/ui/format.ts': 2,
  'src/data/store-tiers.ts': 1,
  'src/domain/appraisal.ts': 1,
  'src/domain/item-spawn.ts': 1,
  'src/domain/preferences.ts': 1,
  'src/domain/settlement.ts': 1,
  'src/domain/v5-rules.ts': 1,
  'src/main.tsx': 1,
  'src/ui/assets.ts': 1,
  'src/ui/workbench/ServiceStages.tsx': 1,
}));

const tabanToplami = [...INCELENMIS_DOSYA_TAVANI.values()].reduce((sum, n) => sum + n, 0);
const gerilemeler = [];
for (const [dosya, liste] of grup) {
  const tavan = INCELENMIS_DOSYA_TAVANI.get(dosya) ?? 0;
  if (liste.length > tavan) gerilemeler.push({ dosya, mevcut: liste.length, tavan });
}

console.log(`SARILMAMIŞ TÜRKÇE METİN: ${bulgular.length}  (incelenmiş taban tavanı: ${tabanToplami})\n`);
for (const [dosya, liste] of [...grup].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`--- ${dosya} (${liste.length}) ---`);
  for (const b of liste) console.log(`  ${b.satirNo}:${b.tur}  ${b.metin.slice(0, 100)}`);
}

if (gerilemeler.length > 0) {
  console.error('\nI18N AUDIT BAŞARISIZ — incelenmiş dosya tavanı aşıldı:');
  for (const item of gerilemeler) {
    console.error(`  ${item.dosya}: ${item.mevcut} (tavan ${item.tavan})`);
  }
  process.exitCode = 1;
} else {
  console.log('\nI18N audit kapısı başarılı: yeni sarılmamış Türkçe metin yok.');
}
