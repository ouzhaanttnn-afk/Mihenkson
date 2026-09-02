/**
 * MIHENKAYNAK — İşlem sınıfı ve ürün tipine göre filtreleme
 * Kaynak: İşlem Akışı ve Terminoloji Ara Düzeltmesi v1.1 · §2, §3, §4, §5, §6.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * §2 — ÜÇ İŞLEM SINIFI
 *
 *   A. HIZLI     Standart sarrafiye. "Ürün güvenilir ve olağan görünüyorsa
 *                oyuncu 1-2 adımda alış/satış işlemine ilerleyebilmelidir.
 *                ZORUNLU TEST ZİNCİRİ UYGULANMAZ."
 *   B. KONTROLLÜ Düşük işçilikli bilezik vb. "Ağırlık ve ayar doğrulaması
 *                önemlidir; inceleme yoğunluğu ORTA seviyededir."
 *   C. EKSPERTİZ İşçilikli, taşlı, ikinci el, şüpheli, yüksek değerli veya
 *                standart dışı ürünler. "Mevcut tam akış KORUNUR."
 *
 * §8 DEĞİŞMEZ: "İncele -> Değerle -> Çıkış Planı -> Pazarlık ana mimarisi"
 * değişmez. Bu yüzden burada aşama SİLİNMEZ; yalnız hangi aşamanın ZORUNLU
 * olduğu ürüne göre belirlenir. Sarrafiyede aşamalar hâlâ açıktır — oyuncu
 * isterse inceler; sistem onu incelemeye MECBUR ETMEZ.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * KAPSAM SINIRI (§8): Bu dosya HAS/ayar hesabına, değerleme formüllerine,
 * settlement'a ve ekonomi değişmezlerine DOKUNMAZ. Yalnız hangi aracın ve
 * hangi bilgi alanının oyuncuya gösterileceğini ve akışın ne kadar zorunlu
 * olduğunu belirler.
 */

import { isBullion } from '@data/bullion';
import { getTemplate } from '@data/item-templates';
import { rulesFor } from '@data/product-classes';
import { TEST_TOOLS } from '@data/tools';
import type { InfoField, ItemInstance, TestTool, WorkbenchStage } from './types';

/** §2 işlem sınıfları. */
export type TransactionClass = 'fast' | 'controlled' | 'expert';

export const CLASS_LABEL: Record<TransactionClass, string> = {
  fast: 'Hızlı işlem',
  controlled: 'Kontrollü işlem',
  expert: 'Ekspertiz',
};

/**
 * §4 "Test araçları YALNIZ şüphe, ambalaj bozukluğu, ağırlık uyuşmazlığı,
 * sahtecilik sinyali veya oyuncunun manuel doğrulama tercihi varsa açılır."
 *
 * Bu fonksiyon o listenin ilk dördünü ölçer. Beşincisi (oyuncunun tercihi)
 * bir sinyal değil bir haktır: araçlar her sınıfta ERİŞİLEBİLİR kalır,
 * yalnız zorunlu olmaktan çıkar.
 */
export function hasSuspicionSignal(item: ItemInstance): boolean {
  // Gözle görülür sinyaller — spawn anında sabitlenir (GDD 5.3).
  // BEYAN katmanından okunur, gerçekten değil: oyuncunun test yapmadan
  // görebildiği şey budur (GDD 6.6 — gizli gerçek sızdırılmaz).
  if (item.declared.observableSignals.length > 0) return true;

  // Beyan ile gözlemin çeliştiği hâller.
  const declaredKarat = item.declared.claimedKarat;
  if (declaredKarat && declaredKarat !== item.truth.actualKarat) {
    // Beyan farkı tek başına GÖRÜNÜR değildir; yalnız damga sinyali varsa
    // oyuncuya yansır. Aksi hâlde gizli gerçeği sızdırmış olurduk (GDD 6.6).
    if (item.truth.hiddenFlaws.some((f) => f.kind === 'fakeHallmark')) return true;
  }

  // Ambalaj / kondisyon uyuşmazlığı: standart sarrafiye kusursuz gelmeli.
  // Yine GÖRÜNEN kondisyon esas alınır.
  if (isBullion(item.templateId) && item.declared.visibleCondition !== 'pristine') return true;

  return false;
}

/**
 * §2 — ürünün işlem sınıfı.
 *
 * Sınıf ürünün KENDİSİNDEN türer, oyuncunun bilgisinden değil: aynı ürün
 * her zaman aynı sınıfa düşer. Bilgiye bağlasaydık, test yaptıkça sınıf
 * değişir ve akış oyuncunun ayağının altından kayardı.
 */
export function transactionClass(item: ItemInstance): TransactionClass {
  const template = getTemplate(item.templateId);

  // §4 — şüpheli sarrafiye hızlı akıştan çıkar ama ekspertize de düşmez:
  // doğrulanacak şey ağırlık ve ayardır, işçilik ve taş değil.
  if (isBullion(item.templateId)) {
    return hasSuspicionSignal(item) ? 'controlled' : 'fast';
  }

  // §2C — taşlı, koleksiyon ve şüpheli ürün her zaman ekspertiz.
  if (template.hasStone || template.family === 'stoneSet') return 'expert';
  if (template.family === 'collectible') return 'expert';
  if (hasSuspicionSignal(item)) return 'expert';

  // §2B — "düşük işçilikli bilezik ve benzeri". İşçilik oranı eşiğin
  // altındaysa kontrollü; üstündeyse ürünün değeri işçilikte demektir ve
  // ekspertiz gerekir.
  const craftUpper = template.craftsmanshipRatioBand[1];
  return craftUpper <= CONTROLLED_CRAFT_CEILING ? 'controlled' : 'expert';
}

/** §2B eşiği: bunun üstünde işçilik ürünün değerini taşır → ekspertiz. */
const CONTROLLED_CRAFT_CEILING = 0.18;

// ---------------------------------------------------------------------------
// §3 — TEST VE ÖZELLİK FİLTRELEME
// ---------------------------------------------------------------------------

/**
 * §3 KURAL: "Bir test ürün hakkında ANLAMLI YENİ BİLGİ ÜRETMİYORSA varsayılan
 * akışta gösterilmemeli veya zorunlu tutulmamalıdır."
 *
 * §3 örnekleri açıkça yasaklıyor: "Çeyrek altına yüzük ölçüsü, gram altına
 * taş kontrolü, standart sarrafiyeye alakasız kondisyon/ölçü alanları."
 *
 * Anlamlılık ölçütü tek ve mekaniktir: bir bilgi alanı ancak o üründe
 * BELİRSİZSE anlamlıdır. Taşsız üründe taş alanının belirsizliği yoktur;
 * bu yüzden lup o üründe yeni bilgi üretmez.
 */
export function isFieldRelevant(item: ItemInstance, field: InfoField): boolean {
  const template = getTemplate(item.templateId);

  // 1. KATMAN — ürün sınıfının whitelist'i (product-classes.ts).
  // Sınıf bu alanı saymıyorsa alan yoktur: hiçbir anlamlılık gerekçesi
  // onu geri açamaz. Gram altında 'stone', bilezikte 'stone' burada biter.
  if (!rulesFor(template).attributes.includes(field)) return false;

  // 2. KATMAN — alan bu ÜRÜNDE şu an anlamlı mı. Whitelist "gösterilebilir"
  // der; burası "belirsiz mi, yani ölçülecek bir şey var mı" diye sorar.
  switch (field) {
    case 'stone':
      // Taşsız üründe taş kontrolü anlamsızdır — §3'ün birebir örneği.
      return template.hasStone && item.truth.stoneData.kind !== 'none';

    case 'condition':
      // Standart sarrafiyede kondisyon standarttır; ancak bozukluk sinyali
      // varsa anlamlı hale gelir.
      if (isBullion(item.templateId)) return item.declared.visibleCondition !== 'pristine';
      return true;

    case 'coreIntegrity':
      // İç dolgu/boşluk riski: standart ve temiz sarrafiyede yoktur.
      if (isBullion(item.templateId)) return hasSuspicionSignal(item);
      return true;

    case 'weight':
    case 'purity':
      // Ağırlık ve ayar her üründe anlamlıdır — §5 bunları kontrollü
      // işlemde bile açıkça korur.
      return true;
  }
}

/** Ürün için anlamlı bilgi alanları. */
export function relevantFields(item: ItemInstance): InfoField[] {
  return ALL_INFO_FIELDS.filter((field) => isFieldRelevant(item, field));
}

const ALL_INFO_FIELDS: InfoField[] = [
  'weight',
  'purity',
  'coreIntegrity',
  'stone',
  'condition',
];

/**
 * §3 — bu araç bu ürün hakkında anlamlı yeni bilgi üretiyor mu.
 * Aracın okuduğu alanlardan EN AZ BİRİ üründe anlamlıysa araç anlamlıdır.
 */
export function isToolRelevant(item: ItemInstance, tool: TestTool): boolean {
  // 1. KATMAN — araç bu ürün sınıfında kullanılabilir mi.
  // Lup ("Lup / Taş Kontrol") sarrafiye sınıflarının test listesinde yoktur;
  // §3 "gram altına taş kontrolü" yasağı aracın adının kendisini kapsar.
  if (!rulesFor(getTemplate(item.templateId)).tests.includes(tool.id)) return false;

  // 2. KATMAN — araç bu üründe anlamlı yeni bilgi üretiyor mu.
  return tool.infoFields.some((field) => isFieldRelevant(item, field));
}

/** Ürün için gösterilecek araçlar (§3 filtresi). */
export function relevantTools(item: ItemInstance): TestTool[] {
  return TEST_TOOLS.filter((tool) => isToolRelevant(item, tool));
}

// ---------------------------------------------------------------------------
// §4, §5, §6 — AKIŞ YOĞUNLUĞU
// ---------------------------------------------------------------------------

export interface FlowPolicy {
  transactionClass: TransactionClass;
  /**
   * Pazarlığa geçmeden önce değerleme aşamasına UĞRAMAK zorunlu mu.
   * §4: hızlı işlemde değildir.
   */
  requiresAppraisal: boolean;
  /** Çıkış Planı aşaması zorunlu mu (§2C'de akışın parçası). */
  requiresExitPlan: boolean;
  /**
   * §5 "ağırlık ve ayar doğrulaması KORUNUR" — kontrollü işlemde oyuncuya
   * önerilen asgari doğrulama. Zorunlu DEĞİL, önerilir; §3'ün "zorunlu
   * tutulmamalıdır" kuralı burada da geçerli.
   */
  suggestedFields: InfoField[];
  /** Oyuncuya gösterilecek tek satırlık akış açıklaması. */
  note: string;
}

/**
 * §4/§5/§6 — ürünün akış yoğunluğu.
 *
 * DİKKAT: hiçbir sınıfta aşama KAPATILMAZ. §8 ana mimariyi koruyor; bu
 * politika yalnız neyin ZORUNLU olduğunu söyler. Hızlı işlemde oyuncu yine
 * de İncele'ye girip test yapabilir — §4'ün "oyuncunun manuel doğrulama
 * tercihi" maddesi tam olarak budur.
 */
export function flowPolicy(item: ItemInstance): FlowPolicy {
  const cls = transactionClass(item);

  switch (cls) {
    case 'fast':
      return {
        transactionClass: cls,
        requiresAppraisal: false,
        requiresExitPlan: false,
        suggestedFields: [],
        note: 'Standart sarrafiye · doğrudan fiyata geçebilirsiniz.',
      };

    case 'controlled':
      return {
        transactionClass: cls,
        requiresAppraisal: true,
        requiresExitPlan: false,
        // §5 — ağırlık ve ayar burada önemli kalır.
        suggestedFields: ['weight', 'purity'],
        note: 'Ağırlık ve ayar doğrulaması önerilir.',
      };

    case 'expert':
      return {
        transactionClass: cls,
        requiresAppraisal: true,
        requiresExitPlan: true,
        suggestedFields: relevantFields(item),
        note: 'İşçilik ve risk analizi bu üründe belirleyici.',
      };
  }
}

/**
 * Bir aşamaya girilebilir mi — akış politikasının aşama kapısındaki
 * karşılığı. Aşamalar kapatılmaz; yalnız ZORUNLU olanlar bekletir.
 */
export function stageUnlocked(
  item: ItemInstance,
  stage: WorkbenchStage,
  ctx: { hasBand: boolean; hasTests: boolean; hasExitPlan: boolean },
): boolean {
  const policy = flowPolicy(item);

  switch (stage) {
    case 'inspect':
    case 'appraise':
      // Her ürün için her zaman açık: §4 oyuncunun manuel doğrulama hakkını
      // korur, hızlı işlem bile inceleme YASAKLAMAZ.
      return true;

    case 'thesis':
      return policy.requiresExitPlan ? ctx.hasBand || ctx.hasTests : true;

    case 'negotiate':
      // §4 — hızlı işlemde pazarlığa doğrudan geçilir. Diğerlerinde
      // değerleme bandı ya da yapılmış bir test beklenir.
      return policy.requiresAppraisal ? ctx.hasBand || ctx.hasTests : true;

    default:
      return false;
  }
}
