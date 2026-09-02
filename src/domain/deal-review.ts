/**
 * MIHENKAYNAK — İşlem sonrası vaka özeti
 * Kaynak: GDD 22.3 "İşlem sonrası vaka özeti", 21.2 "Öğretici geri bildirim".
 *
 * GDD 22.3: "Sistem çözümü işlem öncesi söylemez. İşlem kapandıktan ve gerçek
 * sonuç ortaya çıktıktan sonra oyuncuya kısa vaka özeti sunabilir."
 *
 * Bu, oyunun öğretim döngüsüdür: tutorial yerine ustalık hissi üretir.
 * Bu dosyadaki hiçbir fonksiyon işlem kapanmadan çağrılmamalıdır.
 */

import { CHANNEL_SHORT } from './thesis';
import { trueValue } from './valuation';
import type {
  DealRecord,
  ExitChannel,
  ItemInstance,
  MarketState,
  Money,
  ThesisOption,
  ValuationBand,
} from './types';

export interface ReviewInput {
  item: ItemInstance;
  market: MarketState;
  band: ValuationBand;
  price: Money;
  accepted: boolean;
  testsUsed: string[];
  selectedThesis: ExitChannel | null;
  thesisOptions: ThesisOption[];
}

export interface CaseReview {
  headline: string;
  /** Kaçırılan okunabilir sinyaller — GDD 7.3 gereği hepsi görünürdü. */
  missedSignals: string[];
  keyDecisionPoint: string;
  alternativeChannelNote: string;
  /** Gerçek değere göre fark. Pozitif = oyuncu lehine. */
  valueDelta: Money;
  tone: 'good' | 'neutral' | 'bad';
}

/**
 * İşlem kapandıktan sonra vaka özeti üretir.
 * GDD 22.3 örneği: "18K sinyalini mihenk gösterdi; 22K kabul ederek 1.350 TL
 * fazla ödedin."
 */
export function buildCaseReview(input: ReviewInput): CaseReview {
  const { item, market, price, accepted, testsUsed } = input;
  const actual = trueValue(item, market);

  if (!accepted) {
    return {
      headline: 'İşlem kapanmadı.',
      missedSignals: [],
      keyDecisionPoint:
        price > 0
          ? 'Teklifiniz müşterinin kabul sınırının altında kaldı.'
          : 'İşlemi reddettiniz.',
      alternativeChannelNote: describeBestAlternative(input),
      valueDelta: 0,
      tone: 'neutral',
    };
  }

  // Alış işleminde oyuncu lehine fark = gerçek değer − ödenen fiyat.
  const valueDelta = actual - price;

  const missedSignals = collectMissedSignals(item, testsUsed);
  const tone: CaseReview['tone'] = valueDelta > actual * 0.06 ? 'good' : valueDelta < 0 ? 'bad' : 'neutral';

  return {
    headline: buildHeadline(item, valueDelta, missedSignals.length > 0),
    missedSignals,
    keyDecisionPoint: buildDecisionNote(input, actual),
    alternativeChannelNote: describeBestAlternative(input),
    valueDelta,
    tone,
  };
}

/**
 * Oyuncunun test etmediği ama görünür sinyali olan gerçek kusurları listeler.
 * GDD 7.3 gereği bu sinyaller işlem öncesinde de ekrandaydı — özet yalnız
 * hangisinin gerçekten önemli olduğunu söyler.
 */
function collectMissedSignals(item: ItemInstance, testsUsed: string[]): string[] {
  const out: string[] = [];
  const t = item.truth;

  const testedPurity = testsUsed.some((id) => id === 'touchstone' || id === 'spectrometer' || id === 'density');
  const testedCore = testsUsed.some((id) => id === 'density' || id === 'magnet' || id === 'spectrometer');
  const testedStone = testsUsed.includes('loupe');
  const testedWeight = testsUsed.includes('scale');

  if (!testedPurity && t.actualKarat !== item.declared.claimedKarat) {
    out.push(
      `Beyan ${item.declared.claimedKarat} idi, gerçek ayar ${t.actualKarat}. Damga tutarsızlığı sinyali görünürdü.`,
    );
  }

  const coreFlaw = t.hiddenFlaws.find(
    (f) => f.kind === 'plated' || f.kind === 'filled' || f.kind === 'hollow',
  );
  if (!testedCore && coreFlaw) {
    out.push(`${coreFlaw.readableSignal.label} — yoğunluk ölçümü bu riski kapatırdı.`);
  }

  if (!testedStone && t.stoneData.kind !== 'none' && !t.stoneData.genuine) {
    out.push('Taş taklit çıktı. Lup, değer bandını almadan önce daraltırdı.');
  }

  if (!testedWeight && Math.abs((item.declared.claimedWeight ?? 0) - t.grossWeight) > 0.3) {
    out.push(
      `Beyan edilen gramaj ${item.declared.claimedWeight} g, gerçek ${t.grossWeight} g. Terazi ücretsizdi.`,
    );
  }

  return out;
}

function buildHeadline(item: ItemInstance, valueDelta: Money, hadMissedSignals: boolean): string {
  if (valueDelta < 0) {
    return hadMissedSignals
      ? `Gerçek değerin ${fmt(-valueDelta)} üstünde ödediniz — kaçırılan sinyal vardı.`
      : `Gerçek değerin ${fmt(-valueDelta)} üstünde ödediniz.`;
  }
  if (valueDelta === 0) return 'Gerçek değerine çok yakın kapattınız.';
  return `${item.displayName} için gerçek değerin ${fmt(valueDelta)} altında aldınız.`;
}

function buildDecisionNote(input: ReviewInput, actual: Money): string {
  const { band, price } = input;

  if (price > band.max) {
    return `Teklifiniz kendi tahmin bandınızın (${fmt(band.min)}–${fmt(band.max)}) üstündeydi.`;
  }
  if (band.confidence === 'low') {
    return `Düşük güvenle karar verdiniz. Band ${fmt(band.min)}–${fmt(band.max)} kadar genişti; gerçek değer ${fmt(actual)} çıktı.`;
  }
  if (band.confidence === 'high') {
    return `Yüksek güven bandıyla girdiniz; teklif ${fmt(price)}, gerçek değer ${fmt(actual)}.`;
  }
  return `Orta güvenle kapattınız. Tek ek test bandı belirgin daraltabilirdi.`;
}

/**
 * GDD 21.2 "Yanlış İşlem Tezi → alternatif çıkış kanallarının sonucuyla
 * karşılaştırmalı vaka özeti."
 */
function describeBestAlternative(input: ReviewInput): string {
  const { thesisOptions, selectedThesis } = input;
  if (thesisOptions.length < 2) return '';

  const selected = selectedThesis
    ? thesisOptions.find((o) => o.channel === selectedThesis)
    : thesisOptions[0];
  if (!selected) return '';

  const best = thesisOptions.reduce((a, b) => (b.expectedNet > a.expectedNet ? b : a));
  if (best.channel === selected.channel) {
    const runnerUp = thesisOptions
      .filter((o) => o.channel !== best.channel)
      .sort((a, b) => b.expectedNet - a.expectedNet)[0];
    if (!runnerUp) return '';
    return `${CHANNEL_SHORT[best.channel]} en yüksek net getiriyi verdi; ${CHANNEL_SHORT[runnerUp.channel]} ${fmt(best.expectedNet - runnerUp.expectedNet)} daha az ama ${runnerUp.daysToCash[0]}–${runnerUp.daysToCash[1]} günde nakde dönerdi.`;
  }

  const diff = best.expectedNet - selected.expectedNet;
  return `${CHANNEL_SHORT[best.channel]} kanalı ${fmt(diff)} daha fazla net getiri üretebilirdi; karşılığında ${best.daysToCash[0]}–${best.daysToCash[1]} gün sermaye bağlar.`;
}

/** DealRecord'un reviewData alanını doldurur. */
export function toReviewData(review: CaseReview): DealRecord['reviewData'] {
  return {
    missedSignals: review.missedSignals,
    keyDecisionPoint: review.keyDecisionPoint,
    alternativeChannelNote: review.alternativeChannelNote,
  };
}

function fmt(n: Money): string {
  return `${Math.round(n).toLocaleString('tr-TR')} ₺`;
}
