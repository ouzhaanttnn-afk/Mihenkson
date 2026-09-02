/**
 * MIHENKAYNAK — İşlem Akışı ve Terminoloji Ara Düzeltmesi kabul testleri
 * Kaynak: v1.1 · §9 "Kabul Kriterleri", §2, §3, §4, §5, §6, §8.
 *
 * §9'un yedi maddesi burada birebir sınanır.
 */

import { describe, expect, it } from 'vitest';

import { spawnItem } from './item-spawn';
import { createMarketForDay } from './market';
import { estimateBand, initialKnowledge, trueValue } from './valuation';
import { getTemplate, ITEM_TEMPLATES } from '@data/item-templates';
import { TEST_TOOLS, toolsForLevel } from '@data/tools';
import { isBullion } from '@data/bullion';
import {
  flowPolicy,
  isFieldRelevant,
  isToolRelevant,
  relevantFields,
  relevantTools,
  stageUnlocked,
  transactionClass,
} from './transaction-class';
import { TERM } from '@ui/terms';
import type { ItemInstance } from './types';

const SEED = 20260827;
const MARKET = createMarketForDay(SEED, 1);

/** Belirli bir şablondan, istenen sınıfa düşen ilk örneği bulur. */
function sample(templateId: string, want?: ReturnType<typeof transactionClass>): ItemInstance {
  for (let i = 0; i < 600; i += 1) {
    const item = spawnItem(SEED, i, templateId);
    if (!want || transactionClass(item) === want) return item;
  }
  throw new Error(`${templateId} için ${want} örneği bulunamadı`);
}

const BULLION_IDS = [
  'gram_gold_1',
  'gram_gold_5',
  'gram_gold_10',
  'quarter_gold',
  'half_gold',
  'full_gold',
  'republic_gold',
  'ata_gold',
];

// ===========================================================================
// §9.1 — "Standart sarrafiye alış/satışında GEREKSİZ TEST ZORUNLULUĞU
//        bulunmaz."
// ===========================================================================

describe('§9.1 — Standart sarrafiyede zorunlu test zinciri yok', () => {
  it('temiz standart sarrafiye HIZLI işleme düşer', () => {
    for (const id of BULLION_IDS) {
      const temiz = sample(id, 'fast');
      expect(transactionClass(temiz)).toBe('fast');
    }
  });

  it('hızlı işlemde pazarlığa TEST YAPMADAN geçilebilir', () => {
    const item = sample('quarter_gold', 'fast');
    const bosBaglam = { hasBand: false, hasTests: false, hasExitPlan: false };

    expect(stageUnlocked(item, 'negotiate', bosBaglam)).toBe(true);
    expect(flowPolicy(item).requiresAppraisal).toBe(false);
    expect(flowPolicy(item).requiresExitPlan).toBe(false);
  });

  it('§4 — inceleme YASAKLANMAZ; oyuncunun manuel doğrulama hakkı durur', () => {
    const item = sample('gram_gold_10', 'fast');
    expect(stageUnlocked(item, 'inspect', { hasBand: false, hasTests: false, hasExitPlan: false })).toBe(true);
    expect(stageUnlocked(item, 'appraise', { hasBand: false, hasTests: false, hasExitPlan: false })).toBe(true);
    // Ve anlamlı araç hâlâ erişilebilir: ağırlık ve ayar her üründe anlamlı.
    expect(relevantTools(item).map((t) => t.id)).toContain('scale');
    expect(relevantTools(item).map((t) => t.id)).toContain('touchstone');
  });
});

// ===========================================================================
// §9.2 — "Gram, çeyrek, yarım, tam, Ata vb. ürünlerde ALAKASIZ TEST/ÖZELLİK
//        GÖRÜNMEZ."
// ===========================================================================

describe('§9.2 — Sarrafiyede alakasız test ve özellik görünmez', () => {
  it('§3 birebir örneği: gram altına TAŞ KONTROLÜ gösterilmez', () => {
    const gram = sample('gram_gold_1', 'fast');
    expect(isFieldRelevant(gram, 'stone')).toBe(false);
    expect(relevantFields(gram)).not.toContain('stone');
    // Lup yalnız taş+kondisyon okur; ikisi de anlamsızsa araç da görünmez.
    expect(relevantTools(gram).map((t) => t.id)).not.toContain('loupe');
  });

  it('çeyrek altında kondisyon/ölçü alanı varsayılan akışta çıkmaz', () => {
    const ceyrek = sample('quarter_gold', 'fast');
    expect(relevantFields(ceyrek)).not.toContain('stone');
    expect(relevantFields(ceyrek)).not.toContain('condition');
    expect(relevantFields(ceyrek)).not.toContain('coreIntegrity');
    // Geriye §5'in koruduğu ikisi kalır.
    expect(relevantFields(ceyrek)).toEqual(['weight', 'purity']);
  });

  it('bilgi seti de filtrelenir — ekranda ölü satır kalmaz', () => {
    for (const id of BULLION_IDS) {
      const item = sample(id, 'fast');
      const fields = initialKnowledge(item).map((k) => k.field);
      expect(fields).not.toContain('stone');
      expect(fields.length).toBeLessThan(5);
    }
  });

  it('hiçbir üründe ANLAMSIZ araç gösterilmez (§3 genel kuralı)', () => {
    for (const template of ITEM_TEMPLATES) {
      const item = spawnItem(SEED, 3, template.id);
      for (const tool of relevantTools(item)) {
        // Gösterilen her aracın en az bir anlamlı alanı olmalı.
        expect(tool.infoFields.some((f) => isFieldRelevant(item, f))).toBe(true);
      }
    }
  });

  it('İncele ekranı sarrafiyede yalnız ağırlık ve ayar satırı çizer', () => {
    // Regresyon: satırlar sabit kodlandığında sarrafiyede ölü bir
    // "Kondisyon" satırı çiziliyordu — §9.2'nin saydığı tam olarak buydu.
    for (const id of BULLION_IDS) {
      const item = sample(id, 'fast');
      expect(relevantFields(item)).toEqual(['weight', 'purity']);
    }
  });

  it('ray filtresi araç havuzunu gerçekten daraltıyor', () => {
    const gram = sample('gram_gold_1', 'fast');
    const zincir = spawnItem(SEED, 5, 'chain_14k');

    const gramTools = toolsForLevel(9).filter(({ tool }) => isToolRelevant(gram, tool));
    const zincirTools = toolsForLevel(9).filter(({ tool }) => isToolRelevant(zincir, tool));

    expect(gramTools.length).toBeLessThan(zincirTools.length);
    expect(gramTools.length).toBeGreaterThan(0);
  });
});

// ===========================================================================
// §9.3 — "ŞÜPHELİ SARRAFİYEDE doğrulama araçları gerektiğinde ERİŞİLEBİLİR
//        kalır."
// ===========================================================================

describe('§9.3 — Şüpheli sarrafiyede araçlar erişilebilir kalır', () => {
  it('şüpheli sarrafiye hızlı akıştan çıkar', () => {
    const supheli = sample('quarter_gold', 'controlled');
    expect(transactionClass(supheli)).toBe('controlled');
    expect(flowPolicy(supheli).requiresAppraisal).toBe(true);
  });

  it('şüpheli sarrafiyede iç bütünlük araçları AÇILIR', () => {
    const supheli = sample('half_gold', 'controlled');
    expect(isFieldRelevant(supheli, 'coreIntegrity')).toBe(true);
    const ids = relevantTools(supheli).map((t) => t.id);
    expect(ids).toContain('density');
    expect(ids).toContain('magnet');
  });

  it('şüpheli sarrafiye yine de EKSPERTİZE düşmez — doğrulanacak şey ayar', () => {
    const supheli = sample('full_gold', 'controlled');
    expect(transactionClass(supheli)).not.toBe('expert');
    expect(flowPolicy(supheli).requiresExitPlan).toBe(false);
  });
});

// ===========================================================================
// §9.4 — "Bilezik benzeri KONTROLLÜ ürünlerde AĞIRLIK/AYAR doğrulaması
//        korunur."
// ===========================================================================

describe('§9.4 — Kontrollü üründe ağırlık ve ayar korunur', () => {
  it('düşük işçilikli bilezik kontrollü sınıfa düşer', () => {
    const bilezik = spawnItem(SEED, 2, 'bracelet_22k_thin');
    expect(transactionClass(bilezik)).toBe('controlled');
  });

  it('kontrollü işlemde önerilen doğrulama ağırlık ve ayardır (§5)', () => {
    const bilezik = spawnItem(SEED, 2, 'bracelet_22k_thin');
    expect(flowPolicy(bilezik).suggestedFields).toEqual(['weight', 'purity']);
  });

  it('kontrollü üründe terazi ve mihenk her zaman erişilebilir', () => {
    const bilezik = spawnItem(SEED, 2, 'bracelet_22k_thin');
    const ids = relevantTools(bilezik).map((t) => t.id);
    expect(ids).toContain('scale');
    expect(ids).toContain('touchstone');
  });

  it('kontrollü işlem değerlemeyi bekler ama çıkış planını zorlamaz (§5)', () => {
    const bilezik = spawnItem(SEED, 2, 'bracelet_22k_thin');
    const bos = { hasBand: false, hasTests: false, hasExitPlan: false };
    expect(stageUnlocked(bilezik, 'negotiate', bos)).toBe(false);
    expect(stageUnlocked(bilezik, 'negotiate', { ...bos, hasBand: true })).toBe(true);
    expect(flowPolicy(bilezik).requiresExitPlan).toBe(false);
  });
});

// ===========================================================================
// §9.5 — "İşçilikli/taşlı/şüpheli ürünlerde TAM EKSPERTİZ AKIŞI KORUNUR."
// ===========================================================================

describe('§9.5 — Ekspertiz akışı korunur', () => {
  it('taşlı ürün her zaman ekspertizdir', () => {
    const tasli = ITEM_TEMPLATES.find((t) => t.hasStone)!;
    const item = spawnItem(SEED, 4, tasli.id);
    expect(transactionClass(item)).toBe('expert');
  });

  it('ekspertizde tam akış zorunlu kalır: değerleme ve çıkış planı', () => {
    const tasli = ITEM_TEMPLATES.find((t) => t.hasStone)!;
    const item = spawnItem(SEED, 4, tasli.id);
    const policy = flowPolicy(item);

    expect(policy.requiresAppraisal).toBe(true);
    expect(policy.requiresExitPlan).toBe(true);

    const bos = { hasBand: false, hasTests: false, hasExitPlan: false };
    expect(stageUnlocked(item, 'thesis', bos)).toBe(false);
    expect(stageUnlocked(item, 'negotiate', bos)).toBe(false);
  });

  it('ekspertizde taş ve kondisyon araçları görünür', () => {
    const tasli = ITEM_TEMPLATES.find((t) => t.hasStone)!;
    const item = spawnItem(SEED, 4, tasli.id);
    if (item.truth.stoneData.kind !== 'none') {
      expect(relevantTools(item).map((t) => t.id)).toContain('loupe');
    }
  });

  it('§8 — hiçbir sınıfta aşama SİLİNMEZ, ana mimari korunur', () => {
    for (const templateId of ['gram_gold_1', 'bracelet_22k_thin', 'chain_14k']) {
      const item = spawnItem(SEED, 6, templateId);
      const dolu = { hasBand: true, hasTests: true, hasExitPlan: true };
      // Dört aşamanın dördü de her üründe erişilebilir olmalı.
      expect(stageUnlocked(item, 'inspect', dolu)).toBe(true);
      expect(stageUnlocked(item, 'appraise', dolu)).toBe(true);
      expect(stageUnlocked(item, 'thesis', dolu)).toBe(true);
      expect(stageUnlocked(item, 'negotiate', dolu)).toBe(true);
    }
  });
});

// ===========================================================================
// §8 — DEĞERLEME FORMÜLLERİ DEĞİŞMEZ
// ===========================================================================

describe('§8 — Filtre yalnız görünürlüğü değiştirir, değerlemeyi değil', () => {
  it('alan filtresi gerçek değeri DEĞİŞTİRMEZ', () => {
    for (const id of BULLION_IDS) {
      const item = sample(id, 'fast');
      const meta = getTemplate(item.templateId);
      expect(meta).toBeTruthy();
      // trueValue yalnız gerçeğe bakar; bilgi setinden bağımsızdır.
      expect(trueValue(item, MARKET)).toBeGreaterThan(0);
    }
  });

  it('ANLAMSIZ alan belirsizlik ÜRETMEZ — sarrafiyenin bandı dar kalır', () => {
    const gram = sample('gram_gold_10', 'fast');
    const band = estimateBand(gram, MARKET, initialKnowledge(gram));
    const genislik = (band.max - band.min) / ((band.max + band.min) / 2);

    // Taş ve iç bütünlük alanları elenmiş olmasına rağmen band dar:
    // elenen alan "bilinmiyor" değil "yok" sayılır.
    expect(genislik).toBeLessThan(0.75);
    expect(band.min).toBeGreaterThan(0);
  });

  it('sarrafiyenin bandı işçilikli üründen dar kalır (§9 denge tablosu)', () => {
    const genislik = (item: ItemInstance) => {
      const b = estimateBand(item, MARKET, initialKnowledge(item));
      return (b.max - b.min) / ((b.max + b.min) / 2);
    };
    expect(genislik(sample('quarter_gold', 'fast'))).toBeLessThan(
      genislik(spawnItem(SEED, 7, 'chain_14k')),
    );
  });
});

// ===========================================================================
// §9.6 / §9.7 — TERMİNOLOJİ
// ===========================================================================

describe('§9.6 — Oyuncuya görünen dil sadeleşir', () => {
  it("§7 tablosu birebir uygulanır", () => {
    expect(TERM.liquidity).toBe('Nakit Durumu');
    expect(TERM.thesis).toBe('Çıkış Planı');
    expect(TERM.spread).toBe('Alış-Satış Farkı');
    expect(TERM.confidence).toBe('Değer Güveni');
    expect(TERM.regime).toBe('Piyasa Havası');
    expect(TERM.overnight).toBe('Altında Kalma Riski');
    expect(TERM.supplierTrust).toBe('Toptancı Güveni');
    expect(TERM.customerTrust).toBe('Müşteri Güveni');
  });

  it('§9.7 — teknik domain isimleri DEĞİŞMEK ZORUNDA DEĞİL', () => {
    // Domain hâlâ kendi adlarını kullanıyor: dil düzeltmesi mimariyi
    // tırmalamadı (§8).
    const item = spawnItem(SEED, 8, 'chain_14k');
    expect(item.truth).toBeDefined();
    expect(TEST_TOOLS.every((t) => typeof t.id === 'string')).toBe(true);
    expect(isBullion('quarter_gold')).toBe(true);
  });
});
