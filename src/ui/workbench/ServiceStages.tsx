/**
 * İşlem Masası · SERVİS KABUL AKIŞI (GDD 23.14)
 *
 * "Servis müşterisi ana ticaret slider'ına ZORLANMAZ. Servis fiyatı ve teslim
 *  sözü kendi kısa akışında çözülür."
 *
 * GDD 23.14 tablosu:
 *   Tanıla | Ürün sorunu, kondisyon, gerekirse kısa inceleme.
 *   Teklif | Süre, parça, hata riski, dış usta/kendi atölye karşılaştırması.
 *   Söz    | Müşteriye verilecek teslim günü ve ücret.
 *   Kuyruk | Kısa iş emri özeti.
 *
 * GDD 23.24 gereği dört adım da AYNI Workbench yüzeyini kullanır; ayrı tam
 * ekran veya modal açılmaz.
 */

import { t } from '@i18n/index';
import { CONDITION_LABEL, SERVICE } from '@domain/balance';
import { conditionValueGain, expectedCompletionDay, findQuote } from '@domain/service';
import { getServiceType } from '@data/service-types';
import { getTemplate } from '@data/item-templates';
import {
  IconClock,
  IconServiceResale,
  IconWarning,
  IconWorkshop,
  ProductSilhouette,
} from '@ui/icons';
import { pct, tl } from '@ui/format';
import type {
  ItemInstance,
  MarketState,
  ServiceJob,
  ServiceSession,
  ServiceVenue,
} from '@domain/types';

// ---------------------------------------------------------------------------
// 1. TANILA
// ---------------------------------------------------------------------------

export function DiagnoseStage({ item, service }: { item: ItemInstance; service: ServiceSession }) {
  const template = getTemplate(item.templateId);
  const diagnosis = service.diagnosis;

  return (
    <div className="svc">
      <div className="svc__hero">
        <span className="svc__silhouette">
          <ProductSilhouette kind={template.silhouette} size={78} />
        </span>
        <div className="svc__heroBody">
          <h2 className="svc__title">{t(item.displayName)}</h2>
          <p className="svc__meta">
            Kondisyon: {t(CONDITION_LABEL[item.truth.condition])}
            {diagnosis && diagnosis.targetCondition !== item.truth.condition && (
              <>
                {' → '}
                <strong className="svc__target">
                  {t(CONDITION_LABEL[diagnosis.targetCondition])}
                </strong>
              </>
            )}
          </p>
        </div>
      </div>

      {diagnosis && (
        <div className="svc__problem">
          <span className="svc__problemIcon">
            <IconWarning size={15} />
          </span>
          <span>{diagnosis.problemLabel}</span>
        </div>
      )}

      <div className="svc__note">
        {diagnosis && diagnosis.availableTypeIds.length > 0
          ? t('{n} servis türü uygulanabilir.', { n: diagnosis.availableTypeIds.length })
          : t('Bu ürüne uygulanabilir servis bulunamadı.')}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. TEKLİF — "Süre, parça, hata riski, dış usta/kendi atölye karşılaştırması"
// ---------------------------------------------------------------------------

export function QuoteStage({
  item,
  market,
  service,
  onSelectVenue,
}: {
  item: ItemInstance;
  market: MarketState;
  service: ServiceSession;
  onSelectVenue: (v: ServiceVenue) => void;
}) {
  const typeId = service.selectedTypeId;

  if (!typeId) {
    return (
      <div className="svc">
        <div className="svc__note svc__note--center">
          {t('Aşağıdaki raydan bir servis türü seçin.')}
        </div>
      </div>
    );
  }

  const type = getServiceType(typeId);
  const inHouse = findQuote(service.quotes, typeId, 'inHouse');
  const outsourced = findQuote(service.quotes, typeId, 'outsourced');
  const valueGain = conditionValueGain(item, market, type.conditionSteps);

  return (
    <div className="svc">
      <div className="svc__typeHead">
        <h2 className="svc__title">{t(type.label)}</h2>
        <p className="svc__meta">{t(type.description)}</p>
      </div>

      {/* GDD 17.2 — dış usta ile kendi atölye YAN YANA karşılaştırılır. */}
      <div className="venues">
        {([inHouse, outsourced] as const).map((quote) => {
          if (!quote) return null;
          const selected = service.selectedVenue === quote.venue;
          const blocked = quote.blockedReason !== null;

          return (
            <button
              key={quote.venue}
              type="button"
              className={[
                'venue',
                selected ? 'venue--selected' : '',
                blocked ? 'venue--blocked' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => !blocked && onSelectVenue(quote.venue)}
              disabled={blocked}
              aria-pressed={selected}
            >
              <span className="venue__head">
                <span className="venue__icon">
                  {quote.venue === 'inHouse' ? (
                    <IconWorkshop size={16} />
                  ) : (
                    <IconServiceResale size={16} />
                  )}
                </span>
                <span className="venue__name">
                  {quote.venue === 'inHouse' ? t('Kendi Atölyem') : t('Dış Usta')}
                </span>
                {blocked && <span className="venue__blocked">{quote.blockedReason}</span>}
              </span>

              {/*
                Baskın rakam NET KATKI'dır, ücret değil: müşteri iki mekânda da
                aynı ücreti öder, değişen senin cebine kalandır. Kararı değiştiren
                sayı en büyük gösterilir (GDD 23.12 ilkesi).
              */}
              <span className="venue__fee num">{tl(quote.netContribution)}</span>
              <span className="venue__feeLabel">{t('net katkı')}</span>

              <span className="venue__rows">
                <QuoteRow label={t("Ücret")} value={tl(quote.fee)} />
                <QuoteRow label={t('Süre')} value={t('{n} gün', { n: quote.durationDays })} />
                <QuoteRow label={t("İşçilik")} value={tl(quote.laborCost)} />
                {quote.partsCost > 0 && (
                  <QuoteRow label={t("Parça")} value={tl(quote.partsCost)} tone="negative" />
                )}
                {quote.outsourceCost > 0 && (
                  <QuoteRow label={t("Usta payı")} value={tl(quote.outsourceCost)} tone="negative" />
                )}
                <QuoteRow
                  label={t("Hata riski")}
                  value={pct(quote.risk)}
                  tone={quote.risk >= 0.3 ? 'negative' : quote.risk >= 0.12 ? 'warning' : 'positive'}
                />
              </span>

              <span className="venue__rationale">{quote.rationale}</span>
            </button>
          );
        })}
      </div>

      {valueGain > 0 && (
        <div className="svc__note">
          Servis sonrası ürün değeri yaklaşık{' '}
          <strong className="svc__target num">{tl(valueGain)}</strong> artar — bu değer
          müşterinin ürününde kalır, ücreti buna göre değerlendirin.
        </div>
      )}
    </div>
  );
}

function QuoteRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'positive' | 'negative' | 'warning';
}) {
  return (
    <span className="quoteRow">
      <span className="quoteRow__label">{label}</span>
      <span className={`quoteRow__value num ${tone ? `quoteRow__value--${tone}` : ''}`}>
        {value}
      </span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// 3. SÖZ — "Müşteriye verilecek teslim günü ve ücret"
// ---------------------------------------------------------------------------

/**
 * GDD 17.3: "Müşteriye verilen teslim sözü kişisel güvenin parçasıdır."
 * Bu yüzden söz, sistemin tahmini bitiş gününe eklenen bir TAMPON kararıdır:
 * sıkı söz güven kazandırır ama gecikme riski taşır.
 */
export function PromiseStage({
  service,
  today,
  onSetBuffer,
}: {
  service: ServiceSession;
  today: number;
  onSetBuffer: (days: number) => void;
}) {
  const quote = findQuote(service.quotes, service.selectedTypeId, service.selectedVenue);
  if (!quote) return null;

  const expected = expectedCompletionDay(quote, today);
  const promised = expected + service.promiseBufferDays;

  const options = Array.from({ length: SERVICE.promise.maxBufferDays + 1 }, (_, i) => i);

  return (
    <div className="svc">
      <div className="promise">
        <span className="promise__label">{t('Teslim sözü')}</span>
        <span className="promise__day num">{promised}. gün</span>
        <span className="promise__hint">
          Atölye tahmini: {expected}. gün · ücret {tl(quote.fee)}
        </span>
      </div>

      <div className="bufferRow" role="radiogroup" aria-label={t('Teslim tamponu')}>
        {options.map((days) => {
          const selected = service.promiseBufferDays === days;
          return (
            <button
              key={days}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`buffer ${selected ? 'buffer--selected' : ''}`}
              onClick={() => onSetBuffer(days)}
            >
              <span className="buffer__title">
                {days === 0 ? t('Sıkı') : days === 1 ? t('Normal') : `+${t('{n} gün', { n: days })}`}
              </span>
              <span className="buffer__note">
                {days === 0
                  ? t('Güven +, risk yüksek')
                  : days === 1
                    ? t('Dengeli')
                    : t('Güvenli, güven −')}
              </span>
            </button>
          );
        })}
      </div>

      <div className="svc__note">
        Söz tutulursa güven artar; geçilen her gün{' '}
        <strong>{SERVICE.latePenaltyPerDay} puan</strong> güven kaybettirir. Hata çıkarsa
        ücret alınmaz ve <strong className="svc__danger">{t('tazmin ödenir')}</strong>.
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4. KUYRUK — "Kısa iş emri özeti"
// ---------------------------------------------------------------------------

export function JobQueueStage({
  service,
  job,
}: {
  service: ServiceSession;
  job: ServiceJob | undefined;
}) {
  if (service.outcome === 'declined' || !job) {
    return (
      <div className="svc">
        <div className="svc__note svc__note--center">
          {t('İş kabul edilmedi. Müşteri ürünüyle birlikte ayrıldı.')}
        </div>
      </div>
    );
  }

  const type = getServiceType(job.type);

  return (
    <div className="svc">
      <div className="workOrder">
        <span className="workOrder__badge">{t('İŞ EMRİ')}</span>
        <h2 className="svc__title">{t(type.label)}</h2>
        <p className="svc__meta">
          {t(job.itemName)} · {job.customerName}
        </p>

        <div className="workOrder__rows">
          <QuoteRow label={t('Teslim sözü')} value={t('{gun}. gün', { gun: job.promisedDay })} />
          <QuoteRow label={t('Süre')} value={t('{n} gün', { n: job.duration })} />
          <QuoteRow
            label={t('Mekân')}
            value={job.venue === 'inHouse' ? t('Kendi atölyem') : t('Dış usta')}
          />
          <QuoteRow label={t("Tahsil edilecek")} value={tl(job.fee)} tone="positive" />
        </div>
      </div>

      <div className="svc__note">
        <IconClock size={13} />
        {t('İş atölye kuyruğuna girdi. Sonucu Atölye ekranından takip edin; ücret teslimde tahsil edilir.')}
      </div>
    </div>
  );
}
