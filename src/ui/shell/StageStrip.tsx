/**
 * D — Aşama Şeridi (GDD 23.9.2, 32 px)
 * "İncele / Değerle / Tez / Pazarlık. Bağlama göre adım atlanabilir."
 *
 * İşlem Akışı Ara Düzeltmesi §7: oyuncuya görünen ad "Çıkış Planı".
 * Aşamanın domain adı (`thesis`) §9 gereği değişmez.
 *
 * GDD 23.10.3 kuralları:
 *  - Aşama Şeridi ileri doğru yalnız gerekli minimum koşullar sağlandığında
 *    ilerler. Kilitli adım tıklanamaz.
 *  - Oyuncu önceki aşamaya dönüp bilgiyi inceleyebilir; geri dönmek hidden
 *    truth, test sonucu veya rezervasyon fiyatını yeniden üretmez.
 *
 * GDD 23.24: "İncele/Değerle/Tez/Pazarlık için ayrı tam ekran sayfalar açma;
 * aynı Workbench state değiştirir." Bu bileşen yalnız state değiştirir.
 */

import { TERM } from '@ui/terms';
import type { DealFlow, WorkbenchStage } from '@domain/types';

/** GDD 23.6 — çekirdek ticaret akışı. */
const TRADE_STEPS: { stage: WorkbenchStage; label: string }[] = [
  { stage: 'inspect', label: 'İncele' },
  { stage: 'appraise', label: 'Değerle' },
  { stage: 'thesis', label: TERM.thesis },
  { stage: 'negotiate', label: 'Pazarlık' },
];

/**
 * GDD 23.10.3 — "Servis müşterisinde standart dört aşama yerine Servis Kabul
 * akışı kullanılır: Tanıla → Süre/Risk/Fiyat → Teslim Sözü → Atölye Kuyruğu."
 * Şerit aynı 32 px bölgede kalır; yalnız adımların anlamı değişir.
 */
const SERVICE_STEPS: { stage: WorkbenchStage; label: string }[] = [
  { stage: 'diagnose', label: 'Tanıla' },
  { stage: 'quote', label: 'Teklif' },
  { stage: 'promise', label: 'Söz' },
  { stage: 'jobQueue', label: 'Kuyruk' },
];

/**
 * GDD 23.23 — "Müşteri alış: Stok seçimi → Değer/Paket → Pazarlık."
 * Üç adımdır, dört değil: alış akışında ürün oyuncunun kendi stoğudur, test
 * edilecek gizli gerçek yoktur. Dördüncü bir adım uydurmak GDD'de olmayan
 * mekanik eklemek olurdu.
 */
const PURCHASE_STEPS: { stage: WorkbenchStage; label: string }[] = [
  { stage: 'stockPick', label: 'Stok' },
  { stage: 'package', label: 'Paket' },
  { stage: 'negotiate', label: 'Pazarlık' },
];

/**
 * GDD 23.23 beşinci akış — "appraisal → İncele → Test → Rapor/Ücret → Sonuç".
 * Dört adımdır ve ticaret akışıyla KARIŞTIRILMAZ: burada pazarlık yoktur,
 * çünkü pazarlık edilecek bir mal yoktur; satılan şey bilgidir.
 */
const APPRAISAL_STEPS: { stage: WorkbenchStage; label: string }[] = [
  { stage: 'inspect', label: 'İncele' },
  { stage: 'test', label: 'Test' },
  { stage: 'report', label: 'Rapor' },
  { stage: 'result', label: 'Sonuç' },
];

const TRADE_ORDER: WorkbenchStage[] = ['inspect', 'appraise', 'thesis', 'negotiate', 'result'];
const APPRAISAL_ORDER: WorkbenchStage[] = ['inspect', 'test', 'report', 'result'];
const PURCHASE_ORDER: WorkbenchStage[] = ['stockPick', 'package', 'negotiate', 'result'];
const SERVICE_ORDER: WorkbenchStage[] = ['diagnose', 'quote', 'promise', 'jobQueue'];

interface Props {
  flow: DealFlow;
  current: WorkbenchStage;
  canEnter: (stage: WorkbenchStage) => boolean;
  onSelect: (stage: WorkbenchStage) => void;
  /**
   * Bu üründe GEREKSİZ olan aşamalar — şeritte gösterilmez.
   *
   * NEDEN GİZLEME, KAPATMA DEĞİL: standart sarrafiyede rasyonel bir çıkış
   * planı seçimi yoktur (çeyreğin nereye satılacağı zaten bellidir), ama
   * aşamanın KENDİSİ silinmez — Karar Dock'undan hâlâ açılabilir. Şeritte
   * dördüncü bir adım göstermek, olmayan bir zorunluluğu varmış gibi
   * okutuyordu: oyuncu "önce buraya girmem gerekiyor" diye duruyordu.
   *
   * Şu an açık olan aşama listede olsa bile GİZLENMEZ; oyuncu bir aşamanın
   * içindeyken o aşamanın şeritten kaybolması, bulunduğu yeri kaybetmek olur.
   */
  skipStages?: WorkbenchStage[];
}

export function StageStrip({ flow, current, canEnter, onSelect, skipStages = [] }: Props) {
  const ALL_STEPS =
    flow === 'service'
      ? SERVICE_STEPS
      : flow === 'purchase'
        ? PURCHASE_STEPS
        : flow === 'appraisal'
          ? APPRAISAL_STEPS
          : TRADE_STEPS;
  const STEPS = ALL_STEPS.filter(
    (step) => step.stage === current || !skipStages.includes(step.stage),
  );
  const ORDER =
    flow === 'service'
      ? SERVICE_ORDER
      : flow === 'purchase'
        ? PURCHASE_ORDER
        : flow === 'appraisal'
          ? APPRAISAL_ORDER
          : TRADE_ORDER;
  const currentIndex = ORDER.indexOf(current);

  return (
    <nav className="stageStrip" aria-label="İşlem aşaması">
      {STEPS.map((step, i) => {
        const index = ORDER.indexOf(step.stage);
        const isActive = step.stage === current;
        const isDone = index < currentIndex;
        const unlocked = canEnter(step.stage);

        const state = isActive ? 'active' : isDone ? 'done' : unlocked ? '' : 'locked';

        return (
          <button
            key={step.stage}
            type="button"
            className={`stageStrip__step ${state ? `stageStrip__step--${state}` : ''}`}
            onClick={() => unlocked && onSelect(step.stage)}
            disabled={!unlocked}
            aria-current={isActive ? 'step' : undefined}
          >
            <span className="stageStrip__num">{i + 1}</span>
            {step.label}
          </button>
        );
      })}
    </nav>
  );
}
