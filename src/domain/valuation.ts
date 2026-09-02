/**
 * MIHENKAYNAK — Değerleme motoru
 * Kaynak: GDD 6 "Değerleme Motoru ve Güven Seviyesi", 35 formül tablosu.
 *
 * GDD 6: "MIHENKAYNAK tek bir sihirli 'adil fiyat' üretmez. Sistem gerçek
 * değer ile oyuncunun bildiği bilgiye dayalı tahmini birbirinden ayırır."
 *
 * Bu dosya iki ayrı fonksiyon ailesi sunar ve bunları asla karıştırmaz:
 *   trueValue(...)     → yalnız settlement, vaka özeti ve QA içindir.
 *   estimateBand(...)  → oyuncuya gösterilen tek şeydir.
 *
 * GDD 6.6 — motor oyuncuya şunları söylemez: hidden truth'u test yapılmadan
 * açmaz, "bu fiyattan al" emri vermez, müşterinin rezervasyon fiyatını
 * göstermez.
 */

import {
  CONDITION_DEDUCTION,
  CONFIDENCE_THRESHOLD,
  DEFINITIVE_RELIABILITY,
  DIMINISHING_RETURN,
  GOLD_KARATS,
  PURITY_TABLE,
} from './balance';
import { spotFor } from './market';
import { isValueDeductingFlaw } from './item-spawn';
import { isBullion } from '@data/bullion';
import { hasSuspicionSignal, isFieldRelevant, relevantFields } from './transaction-class';
import type {
  ConfidenceLevel,
  FieldKnowledge,
  InfoField,
  ItemInstance,
  MarketState,
  Money,
  TestTool,
  TestResult,
  ValuationBand,
  ValuationBreakdown,
} from './types';

// ---------------------------------------------------------------------------
// Gerçek değer (GDD 6.2) — oyuncuya gösterilmez
// ---------------------------------------------------------------------------

/** GDD 6.2 — Metal Değeri = Net Metal Gramı × Gerçek Saflık × Anlık Gram Spotu. */
export function metalValue(item: ItemInstance, market: MarketState): Money {
  return Math.round(item.truth.netMetalWeight * item.truth.actualPurity * spotFor(market, item.metal));
}

/**
 * GDD 6.2 — Gerçek Ürün Değeri =
 *   Metal Değeri + Gerçek Taş Değeri + Yeniden Satılabilir İşçilik
 *   + Nadirlik Primi − Kondisyon / Kusur Kesintisi.
 */
export function trueValue(item: ItemInstance, market: MarketState): Money {
  const b = trueBreakdown(item, market);
  return Math.max(
    0,
    Math.round(b.metal + b.stone + b.craftsmanship + b.rarityPremium + b.riskDeduction),
  );
}

export function trueBreakdown(item: ItemInstance, market: MarketState): ValuationBreakdown {
  const metal = metalValue(item, market);
  const stone = item.truth.stoneData.extractableValue;
  const craftsmanship = item.truth.craftsmanship;

  const gross = metal + stone + craftsmanship;
  const rarityPremium = Math.round(gross * item.truth.rarity * 0.45);

  // Kusur kesintisi metal + işçilik üzerinden işler; taş ayrı değerlendirilir.
  const riskDeduction = -Math.round((metal + craftsmanship) * conditionCutFor(item.truth));

  return {
    metal,
    stone,
    craftsmanship,
    rarityPremium,
    riskDeduction,
    marketInfluence: 0,
  };
}

/**
 * Kondisyon / kusur kesinti oranı (GDD 6.2'nin son terimi).
 *
 * Yalnız DEĞER DÜŞÜREN kusurlar sayılır. Kaplama ve dolgu gibi aldatma
 * kusurlarının ekonomik etkisi zaten `actualPurity` içindedir; onları burada
 * ikinci kez düşmek aynı gerçeği iki kez cezalandırmak olurdu.
 * Bkz. item-spawn.ts · isValueDeductingFlaw.
 */
export function conditionCutFor(truth: ItemInstance['truth']): number {
  const conditionCut = CONDITION_DEDUCTION[truth.condition];
  const flawCut = truth.hiddenFlaws
    .filter((f) => isValueDeductingFlaw(f.kind))
    .reduce((sum, f) => sum + f.severity, 0);
  return Math.min(0.92, conditionCut + flawCut);
}

// ---------------------------------------------------------------------------
// Bilgi durumu (GDD 7.1 / 7.2)
// ---------------------------------------------------------------------------


/** Test yapılmadan önceki başlangıç bilgisi (GDD 5.3). */
export function initialKnowledge(item: ItemInstance): FieldKnowledge[] {
  // İşlem Akışı Ara Düzeltmesi §3 — "Bir test ürün hakkında anlamlı yeni bilgi
  // üretmiyorsa varsayılan akışta GÖSTERİLMEMELİ." Alan listesi ürüne göre
  // filtrelenir; gram altına taş satırı, çeyreğe ölçü satırı çıkmaz.
  //
  // Filtre yalnız GÖRÜNÜRLÜĞÜ değiştirir: değerleme formülü elenen alanı
  // zaten belirsiz saymaz (taşsız üründe taş belirsizliği yoktur), bu yüzden
  // hesaplanan değer aynı kalır (§8 "değerleme formülleri değişmez").
  /*
   * STANDART SARRAFİYENİN KATALOG BEYANI GÜÇLÜDÜR, FİZİKSELİ DOĞRULANMIŞ
   * SAYILMAZ.
   *
   * Çeyreğin katalog gramajı 1,75 g ve beyan ayarı 22'dir. Bunlar güçlü bir
   * başlangıç bilgisi sağlar; fakat müşterinin getirdiği fiziksel parçanın
   * gerçekten o ağırlık ve saflıkta olduğunu kanıtlamaz. Bu nedenle başlangıç
   * durumu `partial` kalır, terazi/mihenk sonrası `verified` olur.
   *
   * Eskiden çeyrek de ikinci el bir bilezik gibi işleniyordu: test edilmemiş
   * bir çeyreğin değer bandı %53 genişlikte çıkıyordu. Alış tavanı band
   * genişliğinden türediği için tavan çöküyor, müşterinin gayet makul isteği
   * oyuncuya "uçuk fiyat" gibi görünüyordu. Uçuk olan müşteri değil, dükkânın
   * kendi ürününü tanımamasıydı.
   *
   * Bu aynı zamanda v1.1 §2'nin sözünü tutar: standart sarrafiyede "zorunlu
   * test zinciri uygulanmaz". Tavan test etmemeyi cezalandırıyorsa hızlı akış
   * bir yalandır — oyuncu yine de test etmek zorunda kalır.
   *
   * ŞÜPHE SİNYALİ VARSA GEÇERLİ DEĞİL: ambalajı bozuk, damgası şüpheli ya da
   * gözle görülür sinyal taşıyan sarrafiye bu güveni ALMAZ; orada ölçüm
   * gerçekten bilgi üretir ve karar yeniden anlamlı olur (GDD 7).
   */
  const standardBullion = isBullion(item.templateId) && !hasSuspicionSignal(item);

  return relevantFields(item).map((field) => {
    // Beyan edilen gramaj kaba bir başlangıç verir; taşsız ürün net oranı bilinir.
    let certainty = 0;
    if (field === 'weight') certainty = standardBullion ? 0.92 : 0.35;
    if (field === 'purity') certainty = standardBullion ? 0.88 : 0.15; // Damga var ama doğrulanmadı.
    if (field === 'condition') certainty = 0.45; // Gözle görülebilir.
    if (field === 'stone') certainty = item.truth.stoneData.kind === 'none' ? 1 : 0.1;
    if (field === 'coreIntegrity') certainty = 0.2;

    const credibleDeclaration = standardBullion && (field === 'weight' || field === 'purity');
    return {
      field,
      certainty,
      testsApplied: [],
      // Yüksek katalog güveni ekonomik bandı daraltır; ancak müşterinin
      // fiziksel ürünü ölçülmeden "doğrulandı" etiketi üretmez.
      status: credibleDeclaration
        ? 'partial'
        : certainty >= 0.85
          ? 'verified'
          : certainty > 0.3
            ? 'partial'
            : 'unverified',
    };
  });
}

/**
 * GDD 7.2 — Diminishing return.
 * "Aynı bilgiyi ölçen iki test ikinci kullanımda daha az fayda sağlar."
 * "Yüksek güven seviyesine ulaşmış alanda ek test yalnızca marjinal kesinlik verir."
 */
export function effectiveGain(tool: TestTool, field: FieldKnowledge): number {
  const remaining = 1 - field.certainty;

  // Ölçüm araçları (terazi, spektrometre) ilgilendikleri alanı tam kapatır.
  // Bu bir istisna değil, azalan getirinin uç hâlidir: aynı aracın ikinci
  // kullanımı sıfır kazanç verir çünkü kapatacak belirsizlik kalmamıştır.
  if (tool.reliability >= DEFINITIVE_RELIABILITY) return remaining;

  const priorTestsOnField = field.testsApplied.length;
  const dr = DIMINISHING_RETURN[Math.min(priorTestsOnField, DIMINISHING_RETURN.length - 1)] ?? 0.05;
  return remaining * tool.certaintyGain * dr;
}

/**
 * Bir testi uygular ve yeni bilgi durumunu döndürür.
 * Saf fonksiyon: girdi durumunu değiştirmez, yeni dizi üretir.
 *
 * DEĞİŞMEZ (GDD 5.4): Testi tekrarlamak gerçeği değiştirmez. Bu yüzden readout
 * ürünün *gerçeğinden* türetilir; RNG ile yeniden zar atılmaz. Aracın hata payı
 * da deterministiktir — (item.id, tool.id) çiftine bağlıdır.
 */
export function applyTest(
  item: ItemInstance,
  tool: TestTool,
  knowledge: FieldKnowledge[],
  runAtSec: number,
): { knowledge: FieldKnowledge[]; result: TestResult } {
  let totalGain = 0;
  const touched: InfoField[] = [];

  const next = knowledge.map((fk) => {
    if (!tool.infoFields.includes(fk.field)) return fk;

    const gain = effectiveGain(tool, fk);
    totalGain += gain;
    touched.push(fk.field);

    const certainty = Math.min(1, fk.certainty + gain);
    return {
      ...fk,
      certainty,
      testsApplied: [...fk.testsApplied, tool.id],
      status: statusFor(certainty, item, fk.field, tool),
    } satisfies FieldKnowledge;
  });

  return {
    knowledge: next,
    result: {
      toolId: tool.id,
      itemId: item.id,
      readout: buildReadout(item, tool),
      raisesSuspicion: detectsSuspicion(item, tool),
      fields: touched,
      effectiveGain: round3(totalGain),
      patienceCost: 0, // Sabır maliyeti negotiation katmanında uygulanır.
      runAtSec,
    },
  };
}

/**
 * GDD 23.3 — "Bilinmeyen veri '?' yerine 'doğrulanmadı / düşük güven' gibi
 * anlamlı durumla gösterilir." 'conflicting', test sonucunun beyanla
 * çeliştiği durumdur; bu oyuncunun en değerli sinyalidir.
 */
function statusFor(
  certainty: number,
  item: ItemInstance,
  field: InfoField,
  tool: TestTool,
): FieldKnowledge['status'] {
  if (field === 'purity' && detectsSuspicion(item, tool)) return 'conflicting';
  if (certainty >= 0.85) return 'verified';
  if (certainty >= 0.3) return 'partial';
  return 'unverified';
}

/**
 * Testin şüphe uyandırıp uyandırmadığı — tamamen gerçeğe bağlı, deterministik.
 * Güvenilirliği düşük araç, mevcut bir kusuru kaçırabilir (false negative);
 * ama var olmayan kusuru uydurmaz (false positive yok — GDD 7.3 "ceza tuzağı değil").
 */
function detectsSuspicion(item: ItemInstance, tool: TestTool): boolean {
  const karatMismatch = item.truth.actualKarat !== item.declared.claimedKarat;
  const hasCoreFlaw = item.truth.hiddenFlaws.some(
    (f) => f.kind === 'plated' || f.kind === 'filled' || f.kind === 'hollow',
  );
  const hasFakeStone = item.truth.stoneData.kind !== 'none' && !item.truth.stoneData.genuine;

  // Aracın hangi gerçeği görebildiği bilgi alanına bağlıdır (GDD 7.1).
  const canSee =
    (tool.infoFields.includes('purity') && karatMismatch) ||
    (tool.infoFields.includes('coreIntegrity') && hasCoreFlaw) ||
    (tool.infoFields.includes('stone') && hasFakeStone);

  if (!canSee) return false;

  // Deterministik hata payı: aynı ürün + aynı araç her zaman aynı sonucu verir.
  const roll = pseudoUnit(`${item.id}:${tool.id}`);
  return roll < tool.reliability;
}

/** Testin oyuncuya gösterdiği okunabilir çıktı (GDD 23.11 — sonuç aynı masada). */
function buildReadout(item: ItemInstance, tool: TestTool): string {
  const t = item.truth;

  switch (tool.id) {
    case 'scale':
      return `Brüt ${fmtG(t.grossWeight)} · net metal ${fmtG(t.netMetalWeight)}`;

    case 'magnet': {
      const suspicious = detectsSuspicion(item, tool);
      return suspicious
        ? 'Hafif manyetik tepki — alaşım/çekirdek şüphesi'
        : 'Manyetik tepki yok — bariz demir alaşımı değil';
    }

    case 'touchstone': {
      // GDD EK A adım 3: "Mihenk testi 18K–22K arası verir; band daralır fakat
      // kesinleşmez." Bant gerçeği içine alır ama tek noktaya indirmez.
      const [lo, hi] = karatBand(item, 1);
      return `Ayar bandı ${lo}–${hi} görünüyor`;
    }

    case 'density': {
      const flaw = t.hiddenFlaws.find(
        (f) => f.kind === 'plated' || f.kind === 'filled' || f.kind === 'hollow',
      );
      if (flaw && detectsSuspicion(item, tool)) {
        const label =
          flaw.kind === 'plated' ? 'kaplama' : flaw.kind === 'filled' ? 'dolgu' : 'içi boşluk';
        return `Yoğunluk beyan edilen ayarın altında — ${label} riski yüksek`;
      }
      return `Yoğunluk ${t.actualKarat} ile tutarlı — dolgu riski düşük`;
    }

    case 'loupe': {
      if (t.stoneData.kind === 'none') {
        return `Taş yok · kondisyon incelemesi: ${conditionText(item)}`;
      }
      const genuineText =
        detectsSuspicion(item, tool) && !t.stoneData.genuine
          ? 'sentetik/taklit izleri'
          : t.stoneData.genuine
            ? 'doğal taş özellikleri'
            : 'net ayrım yapılamadı';
      return `${t.stoneData.count} taş · ${genuineText} · kalite ${Math.round(t.stoneData.qualityBand * 100)}/100`;
    }

    case 'spectrometer':
      return `Saflık ölçümü: ${t.actualKarat} (%${(t.actualPurity * 100).toFixed(1)})`;

    default:
      return 'Sonuç okunamadı';
  }
}

function conditionText(item: ItemInstance): string {
  const worse = item.truth.condition !== item.declared.visibleCondition;
  return worse ? 'gözle görünenden daha yıpranmış' : 'gözlemle tutarlı';
}

/**
 * Mihenk gibi bant daraltan araçların verdiği ayar aralığı.
 * Gerçek ayarı her zaman içerir; genişlik aracın hassasiyetine bağlıdır.
 */
function karatBand(item: ItemInstance, spread: number): [string, string] {
  const idx = GOLD_KARATS.indexOf(item.truth.actualKarat);
  if (idx < 0) return [item.truth.actualKarat, item.truth.actualKarat];
  const lo = GOLD_KARATS[Math.max(0, idx - spread)] as string;
  const hi = GOLD_KARATS[Math.min(GOLD_KARATS.length - 1, idx + spread)] as string;
  return [lo, hi];
}

// ---------------------------------------------------------------------------
// Oyuncu tahmin bandı (GDD 6.3) — oyuncunun gördüğü tek çıktı
// ---------------------------------------------------------------------------

/**
 * GDD 6.3 — "Oyuncu tüm gerçek alanları baştan bilmez. Bildiği bilgi setine göre
 * minimum ve maksimum tahmini değer oluşturulur. Testler bu bandı daraltır."
 *
 * Yöntem: her belirsiz alan için bir [alt, üst] senaryo kurulur ve band
 * bunların birleşiminden doğar. certainty = 1 olduğunda alt ve üst çakışır,
 * yani band gerçek değere yakınsar.
 */
export function estimateBand(
  item: ItemInstance,
  market: MarketState,
  knowledge: FieldKnowledge[],
): ValuationBand {
  // Alan bilgi setinde yoksa iki ayrı durum vardır ve karıştırılmamalıdır:
  //   · ürün için ANLAMSIZ (taşsız üründe taş) → belirsizlik YOKTUR, 1
  //   · anlamlı ama henüz okunmamış → belirsizdir, 0
  // İkisini birden 0 saymak, ilgisiz bir alanı belirsizlik gibi işleyip
  // sarrafiyenin bandını haksız yere genişletirdi (§8: değerleme formülü
  // değişmez — filtre yalnız görünürlüğü değiştirir).
  const k = (field: InfoField) => {
    const known = knowledge.find((f) => f.field === field);
    if (known) return known.certainty;
    return isFieldRelevant(item, field) ? 0 : 1;
  };
  const spot = spotFor(market, item.metal);
  const t = item.truth;

  // --- Ağırlık belirsizliği ---
  const wC = k('weight');
  const declaredWeight = item.declared.claimedWeight ?? t.grossWeight;
  const weightGuess = lerp(declaredWeight, t.grossWeight, wC);
  const weightSlack = (1 - wC) * 0.06;
  // Net metal oranı: taşlı üründe taş çıkarıldığında ne kalır belirsizliği.
  const netRatioTrue = t.netMetalWeight / Math.max(t.grossWeight, 0.0001);
  const netRatioGuess = lerp(item.truth.stoneData.kind === 'none' ? 0.98 : 0.85, netRatioTrue, wC);

  const netLo = weightGuess * (1 - weightSlack) * netRatioGuess * (1 - (1 - wC) * 0.05);
  const netHi = weightGuess * (1 + weightSlack) * netRatioGuess * (1 + (1 - wC) * 0.05);

  // --- Saflık ve çekirdek bütünlüğü belirsizliği ---
  //
  // Bu ikisi tek bir ekonomik soruya bakar: "bu kütlenin gerçekte ne kadarı
  // değerli metal?" Ayar testi damganın doğruluğunu, yoğunluk ölçümü ise
  // kaplama/dolgu riskini kapatır. Bu yüzden alt senaryo İKİSİNİN de
  // kapanmasını ister; biri eksikse band aşağı doğru açık kalır.
  const pC = k('purity');
  const cC = k('coreIntegrity');

  const claimedPurity = PURITY_TABLE[item.declared.claimedKarat];
  const purityLoBase = PURITY_TABLE[stepDownKarat(item.declared.claimedKarat)];

  // Çekirdek doğrulanmamışsa alt senaryo kaplama/dolgu varsayar. Varsayımın
  // ağırlığı görünür şüphe sinyallerinden gelir (GDD 7.3) — sinyalsiz üründe
  // sistem paranoyak davranmaz.
  const deceptionAssumption = (1 - cC) * (0.15 + 0.55 * signalPressure(item));
  const worstPurity = purityLoBase * (1 - deceptionAssumption);

  // Alt uç yalnız her iki bilgi de tamamlandığında gerçeğe oturur.
  const metalCertainty = Math.min(pC, cC);
  const purityLo = lerp(worstPurity, t.actualPurity, metalCertainty);
  const purityHi = lerp(claimedPurity, t.actualPurity, pC);

  // --- Taş belirsizliği ---
  const sC = k('stone');
  const stoneTrue = t.stoneData.extractableValue;
  // Bilinmiyorsa: alt uç taklit varsayar, üst uç gerçek varsayar.
  const stoneIfFake = t.stoneData.kind === 'none' ? 0 : stoneTrue * (t.stoneData.genuine ? 0.04 : 1);
  const stoneIfReal =
    t.stoneData.kind === 'none' ? 0 : t.stoneData.genuine ? stoneTrue : stoneTrue * 25;
  const stoneLo = lerp(Math.min(stoneIfFake, stoneIfReal), stoneTrue, sC);
  const stoneHi = lerp(Math.max(stoneIfFake, stoneIfReal), stoneTrue, sC);

  // --- Kondisyon belirsizliği ---
  // Kesinti tabanı trueBreakdown ile AYNI formüldür: yalnız değer düşüren
  // kusurlar sayılır. Aldatma kusurları yukarıda saflık üzerinden işledi.
  const condC = k('condition');
  const visibleCut = CONDITION_DEDUCTION[item.declared.visibleCondition];
  const trueCut = conditionCutFor(t);

  // Alt senaryo: gözle görünen ile gerçek arasındaki kötümser uç.
  const condCutLo = lerp(Math.max(visibleCut, trueCut), trueCut, condC);
  // Üst senaryo: yalnız gözle görünen kadar hasar var.
  const condCutHi = lerp(Math.min(visibleCut, trueCut), trueCut, condC);

  // --- İşçilik ve nadirlik ---
  // İşçilik gözle büyük ölçüde okunur; belirsizliği kondisyona bağlıdır.
  const craftLo = t.craftsmanship * (0.75 + 0.25 * condC);
  const craftHi = t.craftsmanship * (1.15 - 0.15 * condC);

  const metalLo = netLo * purityLo * spot;
  const metalHi = netHi * purityHi * spot;

  const grossLo = metalLo + stoneLo + craftLo;
  const grossHi = metalHi + stoneHi + craftHi;

  // Nadirlik primi ancak koleksiyon ailesinde ve kısmen görünür.
  const rarityLo = grossLo * t.rarity * 0.45 * (0.4 + 0.6 * condC);
  const rarityHi = grossHi * t.rarity * 0.45;

  // Kesinti, trueValue ile AYNI tabana uygulanır: metal + işçilik.
  // (Taş ve nadirlik primi kondisyondan bağımsız değerlendirilir.)
  const lo = Math.max(0, grossLo + rarityLo - (metalLo + craftLo) * condCutLo);
  const hi = Math.max(0, grossHi + rarityHi - (metalHi + craftHi) * condCutHi);

  const min = Math.round(Math.min(lo, hi));
  const max = Math.round(Math.max(lo, hi));
  const mid = Math.round((min + max) / 2);

  const relativeWidth = mid > 0 ? (max - min) / mid : 1;

  // Piyasa rejiminin bandı ne kadar etkilediği — bilgilendirici satır.
  const marketInfluence = Math.round(mid * market.volatility);

  return {
    min,
    max,
    mid,
    confidence: confidenceFor(relativeWidth),
    relativeWidth: round3(relativeWidth),
    breakdown: {
      metal: Math.round((metalLo + metalHi) / 2),
      stone: Math.round((stoneLo + stoneHi) / 2),
      craftsmanship: Math.round((craftLo + craftHi) / 2),
      rarityPremium: Math.round((rarityLo + rarityHi) / 2),
      riskDeduction: -Math.round(
        ((metalLo + craftLo) * condCutLo + (metalHi + craftHi) * condCutHi) / 2,
      ),
      marketInfluence,
    },
  };
}

/** GDD 6.3 — güven seviyesi bandın göreli genişliğinden doğar. */
export function confidenceFor(relativeWidth: number): ConfidenceLevel {
  if (relativeWidth <= CONFIDENCE_THRESHOLD.high) return 'high';
  if (relativeWidth <= CONFIDENCE_THRESHOLD.medium) return 'medium';
  return 'low';
}

export const CONFIDENCE_LABEL: Record<ConfidenceLevel, string> = {
  low: 'Düşük',
  medium: 'Orta',
  high: 'Yüksek',
};

/** Ürün üzerindeki gözlemlenebilir şüphe baskısı (0–1). */
export function signalPressure(item: ItemInstance): number {
  const weights = { faint: 0.12, noticeable: 0.28, strong: 0.5 } as const;
  const total = item.declared.observableSignals.reduce((s, sig) => s + weights[sig.strength], 0);
  return Math.min(1, total);
}

function stepDownKarat(karat: ItemInstance['declared']['claimedKarat']) {
  const idx = GOLD_KARATS.indexOf(karat);
  if (idx <= 0) return karat;
  return GOLD_KARATS[Math.max(0, idx - 2)] ?? karat;
}

// ---------------------------------------------------------------------------
// Yardımcılar
// ---------------------------------------------------------------------------

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.min(1, Math.max(0, t));
}

function fmtG(n: number): string {
  return `${n.toFixed(1).replace('.', ',')} g`;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** String'den deterministik [0,1) — test hata payı gibi sabit kararlar için. */
function pseudoUnit(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ((h >>> 0) % 100000) / 100000;
}
