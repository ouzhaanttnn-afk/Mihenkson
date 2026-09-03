/**
 * MIHENKAYNAK — Ürün üretimi ve hidden truth sabitleme
 * Kaynak: GDD 5.2–5.4, 7.3, 34.1.
 *
 * DEĞİŞMEZ (GDD 5.4 "REROLL YOK"):
 *   Ürünün gerçek ayarı, kusuru, taş durumu ve müşterinin rezervasyon fiyatı
 *   müşteri/ürün doğduğunda sabitlenir. Yeniden yükleme, paneli kapat-aç veya
 *   testi tekrarlama gerçeği değiştirmez.
 *
 * Uygulama biçimi: spawn tamamen (rootSeed, spawnIndex) ile deterministiktir.
 * Fonksiyon saftır — dışarıdan durum okumaz, global RNG kullanmaz. Aynı girdi
 * her zaman aynı ItemInstance üretir.
 *
 * DEĞİŞMEZ (GDD 7.3):
 *   Her gizli kusur en az bir okunabilir sinyal taşır. readableSignal alanı
 *   opsiyonel değildir; "tamamen görünmez risk çekirdeğin parçası olmaz".
 */

import { t } from '@i18n/index';
import { CONDITION_LABEL, GOLD_KARATS, MARKET_BASE, PURITY_TABLE } from './balance';
import { bullionMeta } from '@data/bullion';
import { Rng, deriveSeed, makeId } from './rng';
import { getTemplate, ITEM_TEMPLATES, type ItemTemplate } from '@data/item-templates';
import type {
  ConditionGrade,
  HiddenFlaw,
  HiddenFlawKind,
  ItemInstance,
  Karat,
  StoneData,
  SuspicionSignal,
} from './types';

/** Kusur tipine bağlı okunabilir sinyal kataloğu (GDD 7.3). */
const FLAW_SIGNALS: Record<HiddenFlawKind, { label: string; strength: SuspicionSignal['strength'] }[]> = {
  plated: [
    { label: 'Yüzey rengi kenarlarda soluyor', strength: 'noticeable' },
    { label: 'Renk tonu beyan edilen ayara göre soğuk', strength: 'noticeable' },
  ],
  filled: [
    { label: 'Ağırlık, hacme göre fazla geliyor', strength: 'noticeable' },
    { label: 'Gövde sesi tok değil', strength: 'faint' },
  ],
  hollow: [
    { label: 'Gramaj boyuta göre hafif', strength: 'strong' },
    { label: 'Gövde parmak baskısında esniyor', strength: 'noticeable' },
  ],
  fakeHallmark: [
    { label: 'Damga baskısı düzensiz ve sığ', strength: 'strong' },
    { label: 'Damga yazı tipi standart dışı', strength: 'noticeable' },
  ],
  brokenMechanism: [
    { label: 'Kilit tam oturmuyor', strength: 'strong' },
    { label: 'Mandal boşluk yapıyor', strength: 'noticeable' },
  ],
  solderRepair: [
    { label: 'Bir halkada renk farkı var', strength: 'faint' },
    { label: 'Ek yerinde lehim izi seçiliyor', strength: 'noticeable' },
  ],
};

const FLAW_SEVERITY: Record<HiddenFlawKind, [number, number]> = {
  plated: [0.55, 0.85],
  filled: [0.25, 0.5],
  hollow: [0.08, 0.16],
  fakeHallmark: [0, 0],
  brokenMechanism: [0.08, 0.18],
  solderRepair: [0.05, 0.12],
};

/**
 * Kusurların ekonomik etkisi iki ayrı kanaldan işler — ÇİFT SAYILMAZ.
 *
 * 1) ALDATMA kusurları (kaplama, dolgu): ürünün gerçek metal içeriği beyandan
 *    düşüktür. Ekonomik etkileri `actualPurity` üzerinden ifade edilir, çünkü
 *    GDD 6.2 metal değerini zaten "net gram × GERÇEK saflık × spot" olarak
 *    tanımlar. Bunlara ayrıca kusur kesintisi uygulamak aynı gerçeği iki kez
 *    cezalandırırdı.
 *
 * 2) KONDİSYON kusurları (kırık mekanizma, lehim onarımı, içi boşluk):
 *    metal içeriğini değiştirmez ama onarım maliyeti ve yeniden satış değeri
 *    kaybı üretir. Bunlar GDD 6.2'deki "Kondisyon / Kusur Kesintisi" kalemidir.
 *
 * 3) SAHTE DAMGA: bağımsız bir değer kaybı değildir; yanlış ayar beyanının
 *    okunabilir sinyalidir. Ekonomik etkisi zaten düşük `actualPurity`dir,
 *    bu yüzden severity'si sıfırdır.
 */
const DECEPTION_FLAWS: HiddenFlawKind[] = ['plated', 'filled'];

export function isValueDeductingFlaw(kind: HiddenFlawKind): boolean {
  return kind === 'brokenMechanism' || kind === 'solderRepair' || kind === 'hollow';
}

/**
 * Şablon ve seed'den bir ItemInstance üretir.
 * @param spawnIndex Oyun boyunca artan benzersiz sayaç — ID ve seed türetiminin
 *                   tabanı. Aynı index her zaman aynı ürünü verir.
 */
export function spawnItem(
  rootSeed: number,
  spawnIndex: number,
  templateId: string,
): ItemInstance {
  const template = getTemplate(templateId);
  const rng = new Rng(deriveSeed(rootSeed, `item/${templateId}`, spawnIndex));

  // --- Fiziksel gerçek ---
  const grossWeight = round2(rng.range(template.weightBand[0], template.weightBand[1]));
  const netRatio = rng.range(template.netRatioBand[0], template.netRatioBand[1]);
  const netMetalWeight = round2(grossWeight * netRatio);

  // --- Ayar: beyan ile gerçek ayrışabilir (GDD 5.2 actualPurity) ---
  const claimedKarat = template.nominalKarat;
  const declaredDropKarat = rollActualKarat(rng, template, claimedKarat);

  // --- Kondisyon ---
  const condition = rollCondition(rng, template);

  // --- Taş ---
  const stoneData = rollStone(rng, template, grossWeight);

  // --- Gizli kusurlar; her biri okunabilir sinyalle birlikte ---
  const rolledFlaws = rollFlaws(rng, template, condition, declaredDropKarat, claimedKarat);

  // Aldatma kusurları gerçek saflığı düşürür (bkz. FLAW_SEVERITY notu).
  const deceptionFactor = rolledFlaws
    .filter((f) => DECEPTION_FLAWS.includes(f.kind))
    .reduce((factor, f) => factor * (1 - f.severity), 1);

  const nominalPurity = declaredDropKarat === claimedKarat
    ? bullionMeta(templateId)?.unitPurity ?? PURITY_TABLE[declaredDropKarat]
    : PURITY_TABLE[declaredDropKarat];
  const actualPurity = round4(nominalPurity * deceptionFactor);
  // Ayar etiketi efektif saflığa göre yeniden yazılır; kaplamalı bir "22 ayar"
  // bileziğin gerçek ayarı yoktur, ölçüm onu en yakın alt kademede gösterir.
  const actualKarat = nearestKaratAtOrBelow(actualPurity, template.metal);

  // Saflık beyandan sapmışsa okunabilir damga sinyali garanti edilir (GDD 7.3).
  const hiddenFlaws = ensureHallmarkSignal(rng, rolledFlaws, actualKarat, claimedKarat);

  // --- İşçilik ve nadirlik ---
  const craftsmanshipRatio = rng.range(
    template.craftsmanshipRatioBand[0],
    template.craftsmanshipRatioBand[1],
  );
  const rarity = round2(rng.range(template.rarityBand[0], template.rarityBand[1]));

  // İşçilik değeri metal değerine oranla tanımlıdır ve NOMİNAL spot ile
  // ölçeklenir ki şablon verisi piyasadan bağımsız kalsın: işçilik fiziksel
  // bir özelliktir, ürünün hangi gün doğduğuna göre değişmemelidir.
  //
  // Nominal spot MARKET_BASE'ten OKUNUR, kopyalanmaz. Sayıyı buraya elle
  // yazmak iki kopya yaratırdı; biri ayarlandığında öteki sessizce ayrışır
  // ve işçilik değeri yanlış ölçeklenirdi.
  const nominalSpot = template.metal === 'gold' ? MARKET_BASE.goldGram : MARKET_BASE.silverGram;
  const nominalMetalValue = netMetalWeight * actualPurity * nominalSpot;
  const craftsmanship = Math.round(nominalMetalValue * craftsmanshipRatio);

  // --- Beyan / gözlem katmanı (GDD 5.3) ---
  const visibleCondition = rollVisibleCondition(rng, condition);
  const observableSignals: SuspicionSignal[] = [
    ...hiddenFlaws.map((f) => f.readableSignal),
    ...rollAmbientSignals(rng, template, condition),
  ];

  const id = makeId('item', rootSeed, spawnIndex);

  return {
    id,
    templateId: template.id,
    family: template.family,
    metal: template.metal,
    displayName: template.displayName,
    truth: {
      grossWeight,
      netMetalWeight,
      actualPurity,
      actualKarat,
      condition,
      stoneData,
      craftsmanship,
      hiddenFlaws,
      rarity,
      provenance: rarity > 0.6 && rng.chance(0.4) ? t('Aile mirası, belgeli') : null,
      demandTags: template.demandTags,
    },
    declared: {
      claimedKarat,
      // Müşteri gramajı yuvarlayarak söyler; terazi kesinleştirir.
      claimedWeight: round1(grossWeight),
      itemTypeLabel: template.displayName,
      visibleCondition,
      observableSignals,
    },
    buyCost: null,
    acquiredDay: null,
    thesis: null,
    location: 'customer',
    flags: [],
  };
}

/**
 * Gerçek ayar. Yanlış beyan olasılığı şablonun flawChance'ıyla ilişkilidir;
 * sapma her zaman aşağı yönlü değildir ama çoğunlukla öyledir (müşteri kendi
 * ürününü olduğundan iyi bilir/gösterir).
 */
function rollActualKarat(rng: Rng, template: ItemTemplate, claimed: Karat): Karat {
  if (template.metal === 'silver') return claimed;

  const misdeclareChance = template.flawChance * 0.55;
  if (!rng.chance(misdeclareChance)) return claimed;

  const idx = GOLD_KARATS.indexOf(claimed);
  if (idx <= 0) return claimed;

  // Bir veya iki kademe düşük; iki kademe daha nadir.
  const drop = rng.chance(0.75) ? 1 : 2;
  return GOLD_KARATS[Math.max(0, idx - drop)] as Karat;
}

function rollCondition(rng: Rng, template: ItemTemplate): ConditionGrade {
  const entries = Object.entries(template.conditionWeights) as [ConditionGrade, number][];
  return rng.pickWeighted(entries.map(([value, weight]) => ({ value, weight })));
}

/**
 * Gözle görülen kondisyon. Gerçekten bir kademe iyimser olabilir — lup testi
 * bu farkı açar (GDD 7 lup: "taş kalitesi ve kondisyon").
 */
function rollVisibleCondition(rng: Rng, actual: ConditionGrade): ConditionGrade {
  const order: ConditionGrade[] = ['broken', 'damaged', 'worn', 'good', 'pristine'];
  const idx = order.indexOf(actual);
  if (idx < order.length - 1 && rng.chance(0.35)) {
    return order[idx + 1] as ConditionGrade;
  }
  return actual;
}

function rollStone(rng: Rng, template: ItemTemplate, grossWeight: number): StoneData {
  if (!template.hasStone || !rng.chance(0.8)) {
    return { kind: 'none', genuine: true, qualityBand: 0, extractableValue: 0, count: 0 };
  }

  const isPremium = template.id === 'stone_ring_premium' || template.family === 'collectible';
  const kind = isPremium
    ? rng.pickWeighted([
        { value: 'diamond' as const, weight: 55 },
        { value: 'sapphire' as const, weight: 18 },
        { value: 'ruby' as const, weight: 15 },
        { value: 'emerald' as const, weight: 12 },
      ])
    : rng.pickWeighted([
        { value: 'zircon' as const, weight: 62 },
        { value: 'diamond' as const, weight: 18 },
        { value: 'ruby' as const, weight: 12 },
        { value: 'sapphire' as const, weight: 8 },
      ]);

  // Taklit riski: premium olmayan üründe belirgin.
  const genuine = kind === 'zircon' ? true : rng.chance(isPremium ? 0.86 : 0.55);
  const qualityBand = round2(rng.centered(0.2, isPremium ? 0.95 : 0.65));

  const baseValue =
    kind === 'zircon' ? 120 : kind === 'diamond' ? 9_500 : 3_200;
  const sizeFactor = 0.5 + Math.min(grossWeight / 8, 1.6);
  const extractableValue = Math.round(
    baseValue * qualityBand * sizeFactor * (genuine ? 1 : 0.04),
  );

  return {
    kind,
    genuine,
    qualityBand,
    extractableValue,
    count: rng.int(1, isPremium ? 1 : 5),
  };
}

/** Efektif saflığa karşılık gelen en yakın alt ayar kademesi. */
function nearestKaratAtOrBelow(purity: number, metal: 'gold' | 'silver'): Karat {
  const scale: Karat[] = metal === 'silver' ? ['AG800', 'AG925'] : GOLD_KARATS;
  let best: Karat = scale[0] as Karat;
  for (const karat of scale) {
    if (PURITY_TABLE[karat] <= purity + 1e-6) best = karat;
  }
  return best;
}

/**
 * GDD 7.3 — "tamamen görünmez risk çekirdeğin parçası olmaz".
 * Gerçek ayar beyandan sapmışsa oyuncunun görebileceği bir damga sinyali
 * mutlaka bulunur. Kaplama/dolgu kendi sinyalini zaten taşır; bu fonksiyon
 * yalnız eksik kalan damga sinyalini tamamlar.
 */
function ensureHallmarkSignal(
  rng: Rng,
  flaws: HiddenFlaw[],
  actualKarat: Karat,
  claimedKarat: Karat,
): HiddenFlaw[] {
  if (actualKarat === claimedKarat) return flaws;
  if (flaws.some((f) => f.kind === 'fakeHallmark')) return flaws;

  const signals = FLAW_SIGNALS.fakeHallmark;
  return [
    ...flaws,
    {
      kind: 'fakeHallmark',
      // Ekonomik etkisi yoktur; etkisi zaten düşük actualPurity'dedir.
      severity: 0,
      readableSignal: {
        id: 'fakeHallmark_signal',
        label: rng.pick(signals).label,
        strength: rng.pick(signals).strength,
      },
    },
  ];
}

/**
 * Gizli kusur listesi. GDD 7.3 gereği her kusurun okunabilir bir sinyali vardır.
 * Ayar yanlış beyan edilmişse sahte damga sinyali garanti eklenir — oyuncu
 * hiçbir zaman sinyalsiz cezalandırılmaz.
 */
function rollFlaws(
  rng: Rng,
  template: ItemTemplate,
  condition: ConditionGrade,
  actualKarat: Karat,
  claimedKarat: Karat,
): HiddenFlaw[] {
  const flaws: HiddenFlaw[] = [];
  const seen = new Set<HiddenFlawKind>();

  const push = (kind: HiddenFlawKind) => {
    if (seen.has(kind)) return;
    seen.add(kind);
    const band = FLAW_SEVERITY[kind];
    const signals = FLAW_SIGNALS[kind];
    flaws.push({
      kind,
      severity: round2(rng.range(band[0], band[1])),
      readableSignal: {
        id: `${kind}_signal`,
        label: rng.pick(signals).label,
        strength: rng.pick(signals).strength,
      },
    });
  };

  // Yanlış ayar beyanı → damga tutarsızlığı sinyali zorunlu.
  if (actualKarat !== claimedKarat) push('fakeHallmark');

  // Kırık/hasarlı kondisyon → mekanizma sinyali.
  if (condition === 'broken') push('brokenMechanism');
  if (condition === 'damaged' && rng.chance(0.55)) push('solderRepair');

  // Şablona özgü risk.
  if (rng.chance(template.flawChance)) {
    push(
      rng.pickWeighted([
        { value: 'plated' as const, weight: template.id === 'plated_bangle' ? 60 : 18 },
        { value: 'filled' as const, weight: 22 },
        { value: 'hollow' as const, weight: 16 },
        { value: 'solderRepair' as const, weight: 24 },
      ]),
    );
  }

  return flaws;
}

/** Kusurdan bağımsız, ortam/kondisyon kaynaklı gözlem satırları. */
function rollAmbientSignals(
  rng: Rng,
  template: ItemTemplate,
  condition: ConditionGrade,
): SuspicionSignal[] {
  const out: SuspicionSignal[] = [];
  if (condition === 'worn' || condition === 'damaged') {
    out.push({
      id: 'wear_signal',
      /*
        BURADA ÇEVİRİ YOK — VE BUNU BİR TEST ÖĞRETTİ.

        Önce `t()` ile çevirmiştim; `invariance.test.ts` anında kırıldı:
        etiket ürünün gizli gerçeğine yazılıp KAYDA giriyor, dolayısıyla
        Türkçe ve İngilizce oynanan iki oyun farklı ürün üretmiş oluyordu.
        Dil bir oyun kararı değildir; üretim tek dilde kalır.

        Beş kondisyonun ürettiği beş cümle sözlükte anahtar olarak duruyor
        ve çizimde `t(label)` ile çevriliyor.
      */
      label: `Yüzeyde ${CONDITION_LABEL[condition].toLocaleLowerCase('tr')} izleri var`,
      strength: 'faint',
    });
  }
  if (template.family === 'collectible' && rng.chance(0.6)) {
    out.push({
      id: 'patina_signal',
      label: t('Patina dönem parçasıyla uyumlu görünüyor'),
      strength: 'faint',
    });
  }
  return out;
}

/**
 * Müşterinin getirebileceği ürün havuzu — mağaza kademesine göre filtrelenir.
 * Arketip tercihine göre ağırlıklandırma customer-spawn tarafında yapılır.
 */
export function templatesForTier(tier: number): ItemTemplate[] {
  return ITEM_TEMPLATES.filter((t) => t.minTier <= tier);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
