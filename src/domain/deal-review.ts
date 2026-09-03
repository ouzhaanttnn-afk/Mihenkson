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


import { t } from '@i18n/index';
import { tl } from '@i18n/money';
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
      headline: t('İşlem kapanmadı.'),
      missedSignals: [],
      keyDecisionPoint:
        price > 0
          ? t('Teklifiniz müşterinin kabul sınırının altında kaldı.')
          : t('İşlemi reddettiniz.'),
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
  const truth = item.truth;

  const testedPurity = testsUsed.some((id) => id === 'touchstone' || id === 'spectrometer' || id === 'density');
  const testedCore = testsUsed.some((id) => id === 'density' || id === 'magnet' || id === 'spectrometer');
  const testedStone = testsUsed.includes('loupe');
  const testedWeight = testsUsed.includes('scale');

  if (!testedPurity && truth.actualKarat !== item.declared.claimedKarat) {
    out.push(
      t('Beyan {beyan} idi, gerçek ayar {gercek}. Damga tutarsızlığı sinyali görünürdü.', {
        beyan: t(item.declared.claimedKarat),
        gercek: t(truth.actualKarat),
      }),
    );
  }

  const coreFlaw = truth.hiddenFlaws.find(
    (f) => f.kind === 'plated' || f.kind === 'filled' || f.kind === 'hollow',
  );
  if (!testedCore && coreFlaw) {
    out.push(
      t('{sinyal} — yoğunluk ölçümü bu riski kapatırdı.', {
        sinyal: t(coreFlaw.readableSignal.label),
      }),
    );
  }

  if (!testedStone && truth.stoneData.kind !== 'none' && !truth.stoneData.genuine) {
    out.push(t('Taş taklit çıktı. Lup, değer bandını almadan önce daraltırdı.'));
  }

  if (!testedWeight && Math.abs((item.declared.claimedWeight ?? 0) - truth.grossWeight) > 0.3) {
    out.push(
      t('Beyan edilen gramaj {beyan} g, gerçek {gercek} g. Terazi ücretsizdi.', {
        beyan: item.declared.claimedWeight ?? 0,
        gercek: truth.grossWeight,
      }),
    );
  }

  return out;
}

function buildHeadline(item: ItemInstance, valueDelta: Money, hadMissedSignals: boolean): string {
  if (valueDelta < 0) {
    return hadMissedSignals
      ? t('Gerçek değerin {fark} üstünde ödediniz — kaçırılan sinyal vardı.', {
          fark: fmt(-valueDelta),
        })
      : t('Gerçek değerin {fark} üstünde ödediniz.', { fark: fmt(-valueDelta) });
  }
  if (valueDelta === 0) return t('Gerçek değerine çok yakın kapattınız.');
  return t('{ad} için gerçek değerin {fark} altında aldınız.', {
    ad: t(item.displayName),
    fark: fmt(valueDelta),
  });
}

function buildDecisionNote(input: ReviewInput, actual: Money): string {
  const { band, price } = input;

  if (price > band.max) {
    return t('Teklifiniz kendi tahmin bandınızın ({alt}–{ust}) üstündeydi.', {
      alt: fmt(band.min),
      ust: fmt(band.max),
    });
  }
  if (band.confidence === 'low') {
    return t(
      'Düşük güvenle karar verdiniz. Band {alt}–{ust} kadar genişti; gerçek değer {gercek} çıktı.',
      { alt: fmt(band.min), ust: fmt(band.max), gercek: fmt(actual) },
    );
  }
  if (band.confidence === 'high') {
    return t('Yüksek güven bandıyla girdiniz; teklif {teklif}, gerçek değer {gercek}.', {
      teklif: fmt(price),
      gercek: fmt(actual),
    });
  }
  return t('Orta güvenle kapattınız. Tek ek test bandı belirgin daraltabilirdi.');
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
    return t(
      '{enIyi} en yüksek net getiriyi verdi; {ikinci} {fark} daha az ama {alt}–{ust} günde nakde dönerdi.',
      {
        enIyi: t(best.shortLabel),
        ikinci: t(runnerUp.shortLabel),
        fark: fmt(best.expectedNet - runnerUp.expectedNet),
        alt: runnerUp.daysToCash[0],
        ust: runnerUp.daysToCash[1],
      },
    );
  }

  const diff = best.expectedNet - selected.expectedNet;
  return t(
    '{kanal} kanalı {fark} daha fazla net getiri üretebilirdi; karşılığında {alt}–{ust} gün sermaye bağlar.',
    {
      kanal: t(best.shortLabel),
      fark: fmt(diff),
      alt: best.daysToCash[0],
      ust: best.daysToCash[1],
    },
  );
}

/** DealRecord'un reviewData alanını doldurur. */
export function toReviewData(review: CaseReview): DealRecord['reviewData'] {
  return {
    missedSignals: review.missedSignals,
    keyDecisionPoint: review.keyDecisionPoint,
    alternativeChannelNote: review.alternativeChannelNote,
  };
}

/*
  Para birimi ve sayı yereli TEK yerden gelir (`@i18n/money`). Buradaki
  eski hâli `tr-TR` ve `₺` sabitlemişti; dolar seçen oyuncu, işlem
  değerlendirmesinde bir tek burada TL görürdü.
*/
const fmt = tl;
