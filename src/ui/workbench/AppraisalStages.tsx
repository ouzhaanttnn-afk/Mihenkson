/**
 * İşlem Masası · EKSPERTİZ / DANIŞMA AKIŞI (GDD 23.23 beşinci akış)
 *
 * "appraisal → İncele → Test → Rapor/Ücret → Sonuç"
 *
 * İncele ve Test adımları mevcut ticaret bileşenlerini (InspectStage,
 * AppraiseStage) olduğu gibi kullanır — aynı ürün, aynı ölçüm, aynı band.
 * Bu dosya yalnız akışın KENDİNE ÖZGÜ iki adımını çizer: raporun yazıldığı
 * "Rapor/Ücret" ve müşterinin cevabını gösteren "Sonuç".
 *
 * GDD 23.24 gereği ayrı tam ekran açılmaz; aynı Workbench yüzeyi kullanılır.
 *
 * GDD 6.6 DEĞİŞMEZİ: bu ekranların hiçbiri gizli gerçeği rapor verilmeden
 * ÖNCE göstermez. "Sonuç" ekranı gerçek değeri gösterir çünkü rapor artık
 * verilmiştir ve iş bitmiştir — GDD 20'nin öğretici geri bildirim anıdır.
 */

import { t } from '@i18n/index';
import { STANCES, feeBounds, reportedRange, suggestedFee } from '@domain/appraisal';
import { getTemplate } from '@data/item-templates';
import { IconLoupe, IconWarning, ProductSilhouette } from '@ui/icons';
import { tl, tlRange } from '@ui/format';
import type {
  AppraisalSession,
  AppraisalStance,
  ItemInstance,
  Money,
  ValuationBand,
} from '@domain/types';

// ---------------------------------------------------------------------------
// 1. İNCELE — ürünün ne için getirildiğini söyleyen başlık
// ---------------------------------------------------------------------------

/**
 * Ekspertiz akışında İncele adımının üstüne düşen kısa bant.
 *
 * Neden var: aynı ekran ticaret akışında da görünüyor ve iki akışta oyuncunun
 * yapması gereken şey FARKLI. Ticarette ölçüm fiyat içindir; burada ölçüm
 * verilecek SÖZ içindir. Bunu söylemeyen bir ekran oyuncuyu yanlış refleks
 * kurmaya iter.
 */
export function AppraisalIntro({ item }: { item: ItemInstance }) {
  const template = getTemplate(item.templateId);
  return (
    <div className="apr__intro">
      <span className="apr__introIcon">
        <ProductSilhouette kind={template.silhouette} size={34} />
      </span>
      <span className="apr__introText">
        Müşteri bu ürünü <strong>{t('satmıyor')}</strong>; ne ettiğini soruyor. Ölçtüğün kadarını
        söyleyeceksin.
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. RAPOR / ÜCRET (GDD 23.23)
// ---------------------------------------------------------------------------

interface ReportProps {
  band: ValuationBand;
  appraisal: AppraisalSession;
  testsUsed: number;
  onSelectStance: (stance: AppraisalStance) => void;
  onSetFee: (fee: Money) => void;
}

export function ReportStage({
  band,
  appraisal,
  testsUsed,
  onSelectStance,
  onSetFee,
}: ReportProps) {
  const stance = appraisal.stance;

  return (
    <div className="apr">
      {/*
        Duruş seçimi oyunun asıl kararıdır: ölçüm zaten yapıldı, geriye
        "ne kadar iddialı konuşacaksın" kaldı. Üç seçenek de her zaman
        açıktır — sistem oyuncuyu güvenli olana ZORLAMAZ, sonucuna
        katlanmasını ister (GDD 21.1 "sert game over yok").
      */}
      <div className="apr__stances">
        {STANCES.map((profile) => {
          const selected = stance === profile.id;
          const range = reportedRange(band, profile.id);
          return (
            <button
              key={profile.id}
              type="button"
              className={`stance ${selected ? 'stance--selected' : ''}`}
              onClick={() => onSelectStance(profile.id)}
              aria-pressed={selected}
            >
              <span className="stance__head">
                <span className="stance__name">{profile.label}</span>
                <span className="stance__fee num">{tl(suggestedFee(band, profile.id))}</span>
              </span>
              <span className="stance__range num">
                {tlRange(range.min, range.max)}
              </span>
              <span className="stance__desc">{t(profile.description)}</span>
            </button>
          );
        })}
      </div>

      {stance ? (
        <FeeControl band={band} stance={stance} fee={appraisal.fee} onSetFee={onSetFee} />
      ) : (
        <div className="apr__note apr__note--center">
          {t('Raporun ne kadar iddialı olacağını seçin.')}
        </div>
      )}

      {/*
        Emek uyarısı: hiç ölçmeden kesin konuşmak mekanik olarak MÜMKÜNDÜR
        ama itibar kazancı emeğe bağlıdır (appraisal.ts effortFloor). Oyuncu
        bunu sonuç ekranında sürprizle öğrenmesin.
      */}
      {testsUsed === 0 && (
        <div className="apr__warn">
          <span className="apr__warnIcon">
            <IconWarning size={14} />
          </span>
          <span>
            Hiç test yapmadın. Rapor tutsa bile müşteri bunu uzmanlık saymaz; tutmazsa
            ceza tam gelir.
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Ücret kontrolü.
 *
 * GDD 6.6 — üst sınır oyuncunun KENDİ bandından türer, gerçek değerden değil.
 * Müşterinin gerçek tavanı hiçbir yerde gösterilmez; oyuncu ancak sonucunda
 * görür. Tavanı göstermek "kabul edilecek en yüksek rakamı" ifşa etmek
 * olurdu ve karar diye bir şey kalmazdı.
 */
function FeeControl({
  band,
  stance,
  fee,
  onSetFee,
}: {
  band: ValuationBand;
  stance: AppraisalStance;
  fee: Money;
  onSetFee: (fee: Money) => void;
}) {
  const bounds = feeBounds(band, stance);
  const suggested = suggestedFee(band, stance);
  const step = Math.max(5, Math.round(suggested * 0.1 / 5) * 5);

  return (
    <div className="apr__fee">
      <div className="apr__feeHead">
        <span className="apr__feeLabel">{t('Ekspertiz ücreti')}</span>
        <span className="apr__feeValue num">{tl(fee)}</span>
      </div>

      <div className="apr__feeRow">
        <button
          type="button"
          className="apr__feeBtn"
          onClick={() => onSetFee(fee - step)}
          disabled={fee <= bounds.min}
          aria-label={t('Ücreti azalt')}
        >
          −
        </button>
        <button
          type="button"
          className="apr__feeReset"
          onClick={() => onSetFee(suggested)}
          disabled={fee === suggested}
        >
          Önerilen: {tl(suggested)}
        </button>
        <button
          type="button"
          className="apr__feeBtn"
          onClick={() => onSetFee(fee + step)}
          disabled={fee >= bounds.max}
          aria-label={t('Ücreti artır')}
        >
          +
        </button>
      </div>

      <div className="apr__note">
        {t('Yüksek ücret her müşteride geçmez; kabul etmezse rapor yine verilir, para gelmez.')}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4. SONUÇ (GDD 23.23 · GDD 20 öğretici geri bildirim)
// ---------------------------------------------------------------------------

export function AppraisalResultStage({ appraisal }: { appraisal: AppraisalSession }) {
  if (appraisal.outcome === 'declined') {
    return (
      <div className="apr">
        <div className="apr__note apr__note--center">
          {t('Ekspertiz işi alınmadı. Müşteri ürünüyle birlikte ayrıldı.')}
        </div>
      </div>
    );
  }

  const v = appraisal.verdict;
  if (!v) return null;

  return (
    <div className="apr">
      <div className={`apr__verdict ${v.accurate ? 'apr__verdict--ok' : 'apr__verdict--miss'}`}>
        <span className="apr__verdictIcon">
          <IconLoupe size={17} />
        </span>
        <span className="apr__verdictText">{v.summary}</span>
      </div>

      {/*
        Öğretici karşılaştırma (GDD 20): söylenen ile gerçek YAN YANA durur.
        Iskaladıysan nerede ıskaladığını görürsün — ceza rakamı tek başına
        bir şey öğretmez.
      */}
      <div className="apr__compare">
        <div className="apr__compareCol">
          <span className="apr__compareLabel">{t('Raporun')}</span>
          <span className="apr__compareValue num">
            {tlRange(v.reported.min, v.reported.max)}
          </span>
        </div>
        <div className="apr__compareCol">
          <span className="apr__compareLabel">{t('Gerçek değer')}</span>
          <span
            className={`apr__compareValue num ${v.accurate ? 'apr__ok' : 'apr__miss'}`}
          >
            {tl(v.actualValue)}
          </span>
        </div>
      </div>

      <div className="apr__rows">
        <ResultRow
          label={t("Ücret")}
          value={v.paid ? tl(v.fee) : t('Ödenmedi')}
          tone={v.paid ? 'positive' : 'negative'}
        />
        <ResultRow
          label={t("Güven")}
          value={`${v.trustDelta >= 0 ? '+' : ''}${v.trustDelta}`}
          tone={v.trustDelta >= 0 ? 'positive' : 'negative'}
        />
        <ResultRow
          label={t("Semt itibarı")}
          value={`${v.reputationDelta >= 0 ? '+' : ''}${v.reputationDelta}`}
          tone={v.reputationDelta >= 0 ? 'positive' : 'negative'}
        />
      </div>
    </div>
  );
}

function ResultRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'positive' | 'negative';
}) {
  return (
    <div className="apr__row">
      <span className="apr__rowLabel">{label}</span>
      <span className={`apr__rowValue num apr__${tone === 'positive' ? 'ok' : 'miss'}`}>
        {value}
      </span>
    </div>
  );
}
