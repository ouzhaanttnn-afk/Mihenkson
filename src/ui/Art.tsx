/**
 * Gerçekçi görsel bileşeni — SVG'ye düşen tek giriş kapısı.
 *
 * BU BİLEŞENİN VAR OLMA SEBEBİ: brief'in iki kuralı aynı anda geçerli.
 *   1. "Asset bulunamadığında kırık görsel gösterme; mevcut SVG ikonuna
 *      fallback yap."
 *   2. "Ana içerik görsellerinde object-fit: contain kullan."
 * Her çağrı yerinde tek tek <img onError> yazmak, birinci kuralın er geç
 * unutulacağı anlamına gelirdi. Görsel yolu yoksa VEYA yüklenemezse burada
 * SVG karşılığı çizilir; oyuncu hiçbir durumda kırık ikon görmez.
 *
 * ERİŞİLEBİLİRLİK: `decorative` verilen görsel erişilebilirlik ağacından
 * çıkar (alt=""+aria-hidden). Aksi halde anlamlı alt metin zorunludur —
 * `Art` tipi zaten alt'sız kurulamaz.
 */

import { t } from '@i18n/index';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Art as ArtSource } from '@ui/assets';

interface Props {
  /** Kayıt defterinden gelen varlık. Tanımsızsa doğrudan fallback çizilir. */
  art: ArtSource | undefined;
  /** Kutunun en uzun kenarı (px). 64'ün altında SVG bandı tercih edilmeli. */
  size: number;
  /** Görsel yoksa/yüklenmezse çizilecek SVG karşılığı. */
  fallback: ReactNode;
  /** Dekoratif kullanım: erişilebilirlik ağacından gizlenir. */
  decorative?: boolean;
  /** Alt metni bağlama göre özelleştirmek için. */
  alt?: string;
  className?: string;
}

export function Art({ art, size, fallback, decorative, alt, className }: Props) {
  const [failed, setFailed] = useState(false);

  // Aynı yuvada varlık değişirse (müşteri değişti, ürün değişti) önceki
  // başarısızlık yeni görseli de gizlemesin.
  useEffect(() => setFailed(false), [art?.src]);

  if (!art || failed) {
    return (
      <span className={`art art--fallback ${className ?? ''}`} style={{ width: size, height: size }}>
        {fallback}
      </span>
    );
  }

  return (
    <img
      className={`art ${className ?? ''}`}
      src={art.src}
      width={size}
      height={size}
      alt={decorative ? '' : t(alt ?? art.alt)}
      aria-hidden={decorative || undefined}
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
}
