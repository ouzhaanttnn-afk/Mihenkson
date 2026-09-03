/**
 * İşlem Masası · İNCELE (GDD 23.7 "İncele", 23.10.2)
 *
 * Kurallar:
 *  - Ürün görseli merkezde nötr zeminde.
 *  - Ağırlık, beyan ayarı, kondisyon ve doğrulama statüsü yakınında.
 *  - Şüpheli durumda TÜM EKRAN KIRMIZIYA DÖNMEZ; ürün sınırı / uyarı satırı değişir.
 *  - GDD 23.11: Araç seçimi yeni tam ekran açmaz; sonuç aynı masada ilgili
 *    veri satırını günceller.
 */

import { t } from '@i18n/index';
import { CONDITION_LABEL, KARAT_LABEL } from '@domain/balance';
import { signalPressure } from '@domain/valuation';
import { getTemplate } from '@data/item-templates';
import { getTool } from '@data/tools';
import { IconWarning, ProductSilhouette } from '@ui/icons';
import { Art } from '@ui/Art';
import { TOOL_ART, productArt } from '@ui/assets';
import { grams, tlBare } from '@ui/format';
import { relevantFields } from '@domain/transaction-class';
import { bullionUnitValue, unitPriceView } from '@domain/channels';
import { isBullion } from '@data/bullion';
import type {
  FieldKnowledge,
  InfoField,
  ItemInstance,
  MarketState,
  TestResult,
} from '@domain/types';

const STATUS_TEXT: Record<FieldKnowledge['status'], string> = {
  unverified: 'doğrulanmadı',
  partial: 'kısmi',
  verified: 'doğrulandı',
  conflicting: 'çelişkili',
};

interface Props {
  /** §1 birim fiyat gösterimi için güncel piyasa. */
  market: MarketState;
  item: ItemInstance;
  knowledge: FieldKnowledge[];
  testResults: TestResult[];
}

export function InspectStage({ item, knowledge, testResults, market }: Props) {
  const template = getTemplate(item.templateId);
  const pressure = signalPressure(item);
  const lastResult = testResults[testResults.length - 1];

  const stageTone =
    pressure >= 0.45 ? 'inspect__stage--risky' : pressure >= 0.18 ? 'inspect__stage--suspect' : '';

  const weightStatus = statusOf(knowledge, 'weight');
  const purityStatus = statusOf(knowledge, 'purity');
  const conditionStatus = statusOf(knowledge, 'condition');

  // §3 — bu üründe anlamlı olan alanlar. Bilgi setiyle AYNI kaynaktan gelir
  // ki ekran ile hesap birbirinden ayrışmasın.
  const fields = relevantFields(item);

  // §1 — birim fiyat yalnız sarrafiyede anlamlıdır.
  const unitView = isBullion(item.templateId)
    ? unitPriceView(item, bullionUnitValue(item, market))
    : null;

  // Ağırlık: doğrulanmadıysa müşteri beyanı, doğrulandıysa gerçek gösterilir.
  const weightVerified = weightStatus === 'verified';
  const shownWeight = weightVerified ? item.truth.grossWeight : (item.declared.claimedWeight ?? 0);

  // Ayar: yalnız doğrulandığında gerçek ayar açılır (GDD 6.6).
  const purityVerified = purityStatus === 'verified';
  const shownKarat = purityVerified ? item.truth.actualKarat : item.declared.claimedKarat;

  return (
    <>
      <div className="inspect">
        <div className={`inspect__stage ${stageTone}`}>
          {/*
            Ürün görseli 118 px — 64 px bandının üstünde, yani gerçekçi
            cutout kullanılır. Pakette karşılığı olmayan siluetlerde (küpe,
            broş, obje) <Art> kendiliğinden SVG siluetine düşer.
          */}
          <Art
            art={productArt(item.templateId, template.silhouette)}
            size={118}
            alt={item.displayName}
            className="art--onDark"
            fallback={<ProductSilhouette kind={template.silhouette} size={118} />}
          />
        </div>

        <div className="inspect__fields">
          <h2 className="inspect__title">{item.displayName}</h2>

          {/*
            İşlem Akışı Ara Düzeltmesi §3 — satırlar ÜRÜNE GÖRE türetilir,
            sabit kodlanmaz. Standart sarrafiyede kondisyon ve iç yapı
            satırları hiç çizilmez: §9.2 "alakasız kondisyon/ölçü alanları"
            görünmemeli diyor ve ölü bir satır da bir alandır.
          */}
          {/*
            §1 — sarrafiyede oyuncu yalnız toplamı değil BİRİM fiyatı da
            görür: gram bazlıda ₺/g, adet bazlıda ₺/adet.
          */}
          {unitView && (
            <Field
              label={t("Piyasa birim referansı")}
              value={`${tlBare(unitView.unitPrice)} ${unitView.unit}`}
              status="partial"
              statusLabel="referans"
            />
          )}
          {fields.includes('weight') && (
            <Field
              label={t("Ağırlık")}
              value={weightVerified ? grams(shownWeight) : `~${grams(shownWeight)}`}
              status={weightStatus}
              statusLabel={isBullion(item.templateId) && weightStatus === 'partial' ? 'beyan' : undefined}
            />
          )}
          {fields.includes('purity') && (
            <Field
              label={purityVerified ? 'Ayar' : t('Beyan ayarı')}
              value={t(KARAT_LABEL[shownKarat])}
              status={purityStatus}
              statusLabel={isBullion(item.templateId) && purityStatus === 'partial' ? 'beyan' : undefined}
            />
          )}
          {fields.includes('coreIntegrity') && (
            <Field
              label={t("İç yapı")}
              value={statusOf(knowledge, 'coreIntegrity') === 'verified' ? t('Doğrulandı') : 'Belirsiz'}
              status={statusOf(knowledge, 'coreIntegrity')}
            />
          )}
          {fields.includes('condition') && (
            <Field
              label={t('Kondisyon')}
              value={
                t(CONDITION_LABEL[
                  conditionStatus === 'verified'
                    ? item.truth.condition
                    : item.declared.visibleCondition
                ])
              }
              status={conditionStatus}
            />
          )}
          {fields.includes('stone') && (
            <Field label={t("Taş")} value={stoneText(item, knowledge)} status={statusOf(knowledge, 'stone')} />
          )}
        </div>
      </div>

      {/*
        GDD 23.11 — "araç seçimi yeni tam ekran açmaz; sonuç aynı masada
        ilgili veri satırını günceller." Cihaz görseli o satırın yanında,
        okumayı bırakan aletin kendisi olarak durur: hangi testin konuştuğu
        metni okumadan anlaşılır. Araç RAYI 22 px SVG kalır (16–32 px bandı);
        gerçekçi görsel yalnız burada, 72 px'te açılır.
      */}
      {lastResult && (
        <div className="readout">
          <Art
            art={TOOL_ART[lastResult.toolId]}
            size={72}
            decorative
            className="readout__art art--onDark"
            fallback={null}
          />
          <span className="readout__body">
            <span className="readout__tool">{getTool(lastResult.toolId).name}</span>
            {lastResult.readout}
          </span>
        </div>
      )}

      {item.declared.observableSignals.length > 0 && (
        <div className={`signals ${pressure >= 0.45 ? 'signals--strong' : ''}`}>
          {item.declared.observableSignals.slice(0, 2).map((signal) => (
            <span key={signal.id + signal.label} className="signal">
              <span className="signal__mark">
                <IconWarning size={13} />
              </span>
              {signal.label}
            </span>
          ))}
        </div>
      )}
    </>
  );
}

function Field({
  label,
  value,
  status,
  statusLabel,
}: {
  label: string;
  value: string;
  status: FieldKnowledge['status'];
  statusLabel?: string;
}) {
  return (
    <div className="field">
      <span className="field__label">{label}</span>
      <span className="field__value">
        <span className="num">{value}</span>{' '}
        <span className={`status status--${status}`}>{statusLabel ?? STATUS_TEXT[status]}</span>
      </span>
    </div>
  );
}

function statusOf(knowledge: FieldKnowledge[], field: InfoField): FieldKnowledge['status'] {
  return knowledge.find((k) => k.field === field)?.status ?? 'unverified';
}

function stoneText(item: ItemInstance, knowledge: FieldKnowledge[]): string {
  const status = statusOf(knowledge, 'stone');
  const { count, genuine, kind } = item.truth.stoneData;
  const kindLabel = STONE_LABEL[kind] ? t(STONE_LABEL[kind]) : t("Taş");
  if (status !== 'verified') return `${count} adet · tür belirsiz`;
  return `${count} adet ${kindLabel}${genuine ? '' : ' (taklit)'}`;
}

const STONE_LABEL: Record<string, string> = {
  diamond: 'pırlanta',
  zircon: 'zirkon',
  ruby: 'yakut',
  sapphire: 'safir',
  emerald: 'zümrüt',
  unknown: 'bilinmeyen',
  none: '—',
};
