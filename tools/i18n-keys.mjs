/**
 * Kaynaktaki bütün `t('...')` anahtarlarını toplar ve sözlükle karşılaştırır.
 *
 * İki soruyu ölçüyle cevaplar:
 *   · Hangi metinler çevrilmemiş? (sözlükte yok → ekranda Türkçe kalır)
 *   · Sözlükte artık kullanılmayan anahtar var mı? (metin değişmiş olabilir)
 *
 * "Çevirdim" demenin tek dürüst yolu bu çıktıdır.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const KEY_RE = /\bt\(\s*(['"])((?:\\.|(?!\1)[^\\])*)\1/g;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name) && !name.includes('.test.')) out.push(p);
  }
  return out;
}

const keys = new Map();
const sources = new Map();
for (const file of walk('src')) {
  // Sözlüğün kendisi taranmaz: yorumlarındaki örnek `t('...')` sahte anahtar
  // üretiyordu.
  if (file.endsWith('i18n/en.ts')) continue;
  const src = readFileSync(file, 'utf8');
  sources.set(file, src);
  for (const m of src.matchAll(KEY_RE)) {
    const key = m[2].replace(/\\'/g, "'").replace(/\\"/g, '"');
    if (!keys.has(key)) keys.set(key, []);
    keys.get(key).push(file);
  }
}

const en = readFileSync('src/i18n/en.ts', 'utf8');
const dictKeys = new Set(
  [...en.matchAll(/^\s*(['"])((?:\\.|(?!\1)[^\\])*)\1\s*:/gm)].map((m) =>
    m[2].replace(/\\'/g, "'").replace(/\\"/g, '"'),
  ),
);

const missing = [...keys.keys()].filter((k) => !dictKeys.has(k)).sort();
/*
  "Kullanılmayan" sayısı yanıltıcı olmasın: veri dizilerindeki etiketler
  çizim anında `t(label)` ile çevriliyor, yani anahtar kodda düz bir dize
  olarak geçiyor ama `t('...')` biçiminde geçmiyor. Metnin kaynakta bir yerde
  düz dize olarak bulunması, o anahtarın kullanıldığına yeter.
*/
const literal = [...sources.values()].join('\n');
const unused = [...dictKeys]
  .filter((k) => !keys.has(k) && !literal.includes(k))
  .sort();

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ missing, unused }, null, 2));
} else {
  console.log(`t() anahtarı      : ${keys.size}`);
  console.log(`sözlükte karşılığı: ${keys.size - missing.length}`);
  console.log(`ÇEVRİLMEMİŞ       : ${missing.length}`);
  console.log(`kullanılmayan     : ${unused.length}`);
  if (missing.length) {
    console.log('\n--- çevrilmemiş ---');
    for (const k of missing) console.log(k);
  }
  if (unused.length) {
    console.log('\n--- sözlükte var, kodda yok ---');
    for (const k of unused) console.log(k);
  }
}
