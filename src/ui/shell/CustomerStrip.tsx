/**
 * C — Müşteri / Kuyruk Şeridi (GDD 23.9.2, 50 px)
 * "Aktif müşteride kimlik/niyet/sabır; boş durumda kuyruk/çağrı."
 *
 * GDD 23.10.1: Müşteri yokken şerit "Bekleyen: N" veya "Yeni müşteri
 * bekleniyor" durumuna geçer — ekran boş bir dashboard'a dönüşmez.
 * GDD 11.3: Sabır sayısal skor olarak gösterilmez; nokta dizisiyle okunur.
 */

import { MEMORY } from '@domain/balance';
import { loyaltyEffects, type CustomerRecord } from '@domain/customer-memory';
import { getArchetype } from '@data/archetypes';
import { IconQueue } from '@ui/icons';
import { Art } from '@ui/Art';
import { customerArt } from '@ui/assets';
import { customerIntentLine } from '@ui/intent-line';
import type { Customer, ItemInstance } from '@domain/types';

interface Props {
  customer: Customer | null;
  /** GDD 10 — bu müşterinin kalıcı kaydı; yeni müşteride null. */
  record?: CustomerRecord | null;
  queueLength: number;
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

export function CustomerStrip({ customer, record, queueLength, lineCount, broughtItems }: Props) {
  if (!customer) {
    return (
      <div className="customerStrip">
        <span className="customerStrip__avatar">
          <IconQueue size={18} />
        </span>
        <div className="customerStrip__main">
          <div className="customerStrip__name">
            {queueLength > 0 ? `Bekleyen: ${queueLength} müşteri` : 'Yeni müşteri bekleniyor'}
          </div>
          <div className="customerStrip__intent">
            {queueLength > 0 ? 'Karşılamak için hazır' : 'Kapı açık — gün akıyor'}
          </div>
        </div>
      </div>
    );
  }

  const archetype = getArchetype(customer.archetype);
  const initial = customer.displayName.charAt(0);

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
          {customer.displayName}
          {lineCount > 1 && (
            <span style={{ color: 'var(--brass-600)', fontWeight: 500 }}> · {lineCount} ürün</span>
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
        <div className="customerStrip__demeanor">{archetype.demeanor}</div>
        <PatienceDots value={customer.patience} max={customer.patienceMax} />
      </div>
    </div>
  );
}

/**
 * Sabır göstergesi. GDD 11.3 — "matematiksel skor oyuncuya gösterilmez".
 * Beş nokta; renk düşük sabırda uyarıya döner.
 */
export function PatienceDots({ value, max }: { value: number; max: number }) {
  const ratio = Math.max(0, Math.min(1, value / Math.max(1, max)));
  const filled = Math.ceil(ratio * 5);
  const tone = ratio <= 0.2 ? 'critical' : ratio <= 0.45 ? 'low' : 'on';

  return (
    <div className="patience" aria-label={`Sabır: ${filled}/5`} title="Müşteri sabrı">
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={`patience__dot ${i < filled ? `patience__dot--${tone}` : ''}`}
        />
      ))}
    </div>
  );
}
