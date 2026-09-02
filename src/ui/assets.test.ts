/**
 * Asset kayıt defteri sözleşmesi.
 *
 * NEDEN BU TEST VAR: kayıt defterindeki her satır bir DOSYA YOLU, yani
 * yazım hatasının derleyiciden kaçtığı tek yer. Böyle bir hata tarayıcıda
 * sessizdir (görsel gelmez, oyun çalışmaya devam eder) ve ancak biri o
 * ekrana bakınca fark edilir. Test iki yönlü bağlar:
 *   1. Kayıt defterindeki her yol public/assets altında GERÇEKTEN vardır.
 *   2. Her yol asset paketinin manifest.json'unda İLAN EDİLMİŞTİR —
 *      yani uydurulmuş bir varlık ismi eklenemez.
 */

import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  EMPLOYEE_ART,
  EXIT_ART,
  MELT_ART,
  MOVE_ART,
  NAV_ART,
  OFFER_TIER_ART,
  OUTSIDE_MASTER_ART,
  OUTSIDE_MASTER_ART as MASTER,
  SERVICE_ART,
  TOOL_ART,
  customerArt,
  merchantArt,
  offerTier,
  productArt,
} from '@ui/assets';
import type { Art } from '@ui/assets';

const publicDir = fileURLToPath(new URL('../../public/assets/', import.meta.url));

/** Paketin manifest'i projeye kopyalandı — eşlemenin kaynağı bu dosya. */
const manifest = JSON.parse(readFileSync(`${publicDir}manifest.json`, 'utf8'));

/** manifest.json'da ilan edilmiş tüm dosya yolları (uzantı .png). */
const declared = new Set<string>();
for (const entry of [...manifest.products, ...manifest.gold]) declared.add(entry.file);
for (const group of Object.values(manifest.realistic) as { file: string }[][]) {
  for (const entry of group) declared.add(entry.file);
}

/** './assets/x/y.webp' → 'x/y.png' */
function toManifestPath(src: string): string {
  return src.replace(/^\.\/assets\//, '').replace(/\.webp$/, '.png');
}

function collect(): Art[] {
  const all: Art[] = [
    MELT_ART,
    OUTSIDE_MASTER_ART,
    EMPLOYEE_ART,
    ...Object.values(NAV_ART),
    ...Object.values(OFFER_TIER_ART),
  ];
  for (const record of [TOOL_ART, SERVICE_ART, MOVE_ART, EXIT_ART]) {
    for (const value of Object.values(record)) if (value) all.push(value);
  }
  // Portre havuzlarının tamamına isim üzerinden ulaş.
  for (const name of ['Zeynep Hanım', 'Nermin Hanım', 'Selin Hanım', 'Ayşe Hanım', 'Fatma Hanım']) {
    all.push(customerArt(name));
  }
  for (const name of ['Kemal Bey', 'Adnan Bey', 'Hasan Bey', 'Orhan Bey', 'Yusuf Bey']) {
    all.push(customerArt(name));
  }
  for (const id of ['m0', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7']) {
    all.push(merchantArt(id, 'Esnaf'));
  }
  for (const templateId of [
    'gram_gold_1', 'gram_gold_2_5', 'gram_gold_5', 'gram_gold_10', 'gram_gold_20',
    'gram_gold_50', 'gram_gold_100', 'small_ingot', 'quarter_gold', 'half_gold',
    'full_gold', 'republic_gold', 'ata_gold',
    'investment_bangle_22k_10', 'investment_bangle_22k_20',
    'investment_bangle_22k_30', 'investment_bangle_22k_40',
    'investment_bangle_22k_50', 'investment_bangle_22k_60',
    'investment_bangle_22k_70', 'investment_bangle_22k_80',
    'investment_bangle_22k_90', 'investment_bangle_22k_100',
  ]) {
    const found = productArt(templateId, 'bar');
    expect(found, `${templateId} için ürün görseli bulunamadı`).toBeDefined();
    all.push(found!);
  }
  for (const silhouette of ['ring', 'chain', 'necklace', 'bracelet'] as const) {
    const found = productArt('crafted_unknown', silhouette);
    expect(found, `${silhouette} için ürün görseli bulunamadı`).toBeDefined();
    all.push(found!);
  }
  return all;
}

describe('asset kayıt defteri', () => {
  const all = collect();

  it('kayıt defterindeki her dosya diskte vardır', () => {
    const missing = all
      .map((a) => a.src)
      .filter((src) => !existsSync(publicDir + src.replace(/^\.\/assets\//, '')));
    expect(missing, `diskte olmayan varlıklar: ${missing.join(', ')}`).toEqual([]);
  });

  it('kayıt defterindeki her dosya paketin manifest.json’unda ilan edilmiştir', () => {
    const undeclared = all.map((a) => toManifestPath(a.src)).filter((p) => !declared.has(p));
    expect(undeclared, `manifest dışı varlıklar: ${undeclared.join(', ')}`).toEqual([]);
  });

  it('her varlığın anlamlı bir alt metni vardır', () => {
    for (const a of all) expect(a.alt.trim().length).toBeGreaterThan(2);
  });

  it('yollar göreli üretilir (Capacitor/WebView paketlemesi)', () => {
    for (const a of all) expect(a.src.startsWith('./assets/')).toBe(true);
  });
});

describe('portre eşlemesi', () => {
  it('aynı isim her zaman aynı portreyi verir', () => {
    expect(customerArt('Zeynep Hanım').src).toBe(customerArt('Zeynep Hanım').src);
    expect(merchantArt('member-3', 'Sabri').src).toBe(merchantArt('member-3', 'Sabri').src);
  });

  it('hitaba göre doğru portre havuzundan seçer', () => {
    // "Hanım" ile biten her isim kadın havuzundan, diğerleri erkek havuzundan.
    const kadin = ['Zeynep Hanım', 'Nermin Hanım', 'Ayşe Hanım', 'Hülya Hanım', 'Pınar Hanım'];
    const erkek = ['Kemal Bey', 'Adnan Bey', 'Orhan Bey', 'Tolga Bey', 'Selim Bey'];
    for (const n of kadin) {
      expect(customerArt(n).src, n).toMatch(/customer-(zeynep|nermin|selin)/);
    }
    for (const n of erkek) {
      expect(customerArt(n).src, n).toMatch(/customer-(adnan|hasan|ahmet)/);
    }
  });

  it('havuzun tamamı kullanılır — herkes aynı portreye düşmez', () => {
    const names = ['Zeynep', 'Nermin', 'Ayşe', 'Fatma', 'Hülya', 'Sibel', 'Elif', 'Derya'];
    const seen = new Set(names.map((n) => customerArt(`${n} Hanım`).src));
    expect(seen.size).toBeGreaterThan(1);
  });

  it('alt metin müşteriyi adıyla anar', () => {
    expect(customerArt('Zeynep Hanım').alt).toContain('Zeynep Hanım');
    expect(MASTER.alt.length).toBeGreaterThan(2);
  });
});

describe('teklif seviyesi rozeti', () => {
  /*
    İKİ YÖNLÜ: rozet hem AÇILMALI hem de yanlış yerde açılmamalı.
    Eşikler ShopScreen'deki mevcut `relationLabel` ile aynı (0,80 / 0,95) —
    rozet yeni bir kural getirmez, var olanı adlandırır.
  */
  it('cömert / makul / ölçülü eşikleri', () => {
    expect(offerTier(100, 100)).toBe('generous');
    expect(offerTier(95, 100)).toBe('generous');
    expect(offerTier(94, 100)).toBe('reasonable');
    expect(offerTier(80, 100)).toBe('reasonable');
    expect(offerTier(79, 100)).toBe('measured');
    expect(offerTier(10, 100)).toBe('measured');
  });

  it('tavan yoksa rozet çizilmez — uydurma seviye üretilmez', () => {
    expect(offerTier(100, 0)).toBeNull();
    expect(offerTier(0, 100)).toBeNull();
  });
});
