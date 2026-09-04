/**
 * C — Müşteri / Kuyruk Şeridi (GDD 23.9.2, 50 px)
 * "Aktif müşteride kimlik/niyet/sabır; boş durumda kuyruk/çağrı."
 *
 * GDD 23.10.1: Müşteri yokken şerit "Bekleyen: N" veya "Yeni müşteri
 * bekleniyor" durumuna geçer — ekran boş bir dashboard'a dönüşmez.
 * GDD 11.3: Sabır sayısal skor olarak gösterilmez; nokta dizisiyle okunur.
 */

import { localizeCustomerName, t } from '@i18n/index';
import { MEMORY } from '@domain/balance';
import { loyaltyEffects, type CustomerRecord } from '@domain/customer-memory';
import { getArchetype } from '@data/archetypes';
import { Art } from '@ui/Art';
import { customerArt } from '@ui/assets';
import { customerIntentLine } from '@ui/intent-line';
import { IconWorkshop } from '@ui/icons';
import type { Customer, ItemInstance } from '@domain/types';

interface Props {
  customer: Customer;
  /** GDD 10 — bu müşterinin kalıcı kaydı; yeni müşteride null. */
  record?: CustomerRecord | null;
  lineCount: number;
  /**
   * Müşterinin GETİRDİĞİ kalemler. Niyet cümlesi ürünü adıyla anmak için
   * bunlara ihtiyaç duyar: "1 adet 14 Ayar Yüzük satmak istiyor".
   */
  broughtItems: ItemInstance[];
}

/** Etiket tonu: sadık yeşil, küsmüş kırmızı, arası nötr. */
function tieTone(record: CustomerRecord): 'good' | 'bad' | 'neutral' {
  if (record.trust >= MEMORY.referralTrust) return 'good';
  if (record.trust <= MEMORY.upsetTrust) return 'bad';
  return 'neutral';
}

export function CustomerStrip({ customer, record, lineCount, broughtItems }: Props) {
  const archetype = getArchetype(customer.archetype);
  const initial = customer.displayName.charAt(0);
  const customerName = localizeCustomerName(customer.displayName);

  return (
    <div className="customerStrip">
      {/*
        Müşteri portresi. Şerit 44–50 px olduğu için yuva 38 px: bu, 16–32 px
        SVG bandının da 64 px gerçekçi bandının da dışında kalan bir PORTRE
        yuvası — paketin README'si portreleri 72–160 px dairesel avatar için
        hazırladığını söylüyor, ama şerit sözleşmesi (GDD 23.9.2) burada
        daha fazlasına izin vermiyor. Aynı portre Pazarlık ekranında, müşteri
        konuşurken 72 px olarak açılır; burada kimliği tanıtan küçük hâli durur.
        Görsel yüklenemezse eski baş harf rozetine düşülür.
      */}
      <Art
        art={customerArt(customer.displayName)}
        size={38}
        decorative
        className="customerStrip__avatar art--portrait"
        fallback={<span className="customerStrip__initial">{initial}</span>}
      />

      <div className="customerStrip__main">
        <div className="customerStrip__name">
          {/* Kullanıcı: "müşterinin tamir getirdiği belli olmalı." */}
          {customer.intent === 'service' && (
            <IconWorkshop size={12} className="customerStrip__repairIcon" />
          )}
          {customerName}
          {lineCount > 1 && (
            <span style={{ color: 'var(--brass-600)', fontWeight: 500 }}>
              {' · '}{t('{n} ürün', { n: lineCount })}
            </span>
          )}
        </div>
        <div className="customerStrip__intent">
          {/*
            Ne istediği TAHMİN ETTİRİLMEZ: ürün adı, adedi ve müşterinin
            eylemi açık yazılır (bkz. @ui/intent-line).
          */}
          {customerIntentLine(customer, broughtItems)}
          {/*
            GDD 10.3 — tanıdık müşteri tanınmalı. Oyuncu karşısındakinin
            geçmişini görmeden "uzun vadeli değeri korumak" diye bir karar
            veremez; etiket o kararın bilgi tarafıdır.
          */}
          {record && record.visits > 0 && (
            <span className={`customerStrip__tie customerStrip__tie--${tieTone(record)}`}>
              {' · '}
              {loyaltyEffects(record).label}
            </span>
          )}
        </div>
      </div>

      <div className="customerStrip__meta">
        <div className="customerStrip__demeanor">{t(archetype.demeanor)}</div>
        <PatienceDots value={customer.patience} max={customer.patienceMax} />
      </div>
    </div>
  );
}

/**
 * Sabır göstergesi. GDD 11.3 — "matematiksel skor oyuncuya gösterilmez".
 * Nokta sayısı gerçek sabır puanıdır; Tatlı Dil bonusu burada görünür.
 */
export function PatienceDots({ value, max }: { value: number; max: number }) {
  const ratio = Math.max(0, Math.min(1, value / Math.max(1, max)));
  const total = Math.max(1, Math.min(7, Math.round(max)));
  const filled = Math.max(0, Math.min(total, Math.ceil(value)));
  const tone = ratio <= 0.2 ? 'critical' : ratio <= 0.45 ? 'low' : 'on';

  return (
    <div
      className="patience"
      role="meter"
      aria-label={t('Sabır: {simdi}/{toplam}', { simdi: filled, toplam: total })}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={filled}
      title={t('Müşteri sabrı {simdi}/{toplam}', { simdi: filled, toplam: total })}
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`patience__dot ${i < filled ? `patience__dot--${tone}` : ''}`}
        />
      ))}
    </div>
  );
}
