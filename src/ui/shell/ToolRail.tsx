/**
 * F — Bağlamsal Araç Rayı (GDD 23.11, 56 px)
 *
 * DEĞİŞMEZ — GDD 23.11 "TEK FİZİKSEL KONUM":
 *   "Oyuncu test aracını, çıkış kanalını ve pazarlık hamlesini ekranın farklı
 *    yerlerinde aramaz. Aşamaya göre anlamı değişen tek bir 56 px ray İşlem
 *    Masası ile Karar Dock'u arasında sabit kalır."
 *
 * Bu yüzden ray TEK bileşendir ve içeriği aşamaya göre değişir; farklı
 * aşamalar için ayrı bileşen/konum kullanılmaz.
 *
 * Yerleşim kuralları (GDD 23.11 tablosu):
 *   İncele   → İlk 4 araç görünür; fazlası yatay scroll.
 *   Değerle  → Maksimum 3 eylem.
 *   Tez      → Yalnız rasyonel 2–4 kanal.
 *   Pazarlık → Maksimum 3 görünür; "Reddet" rayda değil Dock'ta kalır.
 */

import { t } from '@i18n/index';
import type { ReactNode } from 'react';

export interface RailItem {
  id: string;
  /** GDD 23.24 — ikon tek başına anlam taşımaz; etiket zorunludur. */
  label: string;
  icon: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  /** Bu araç bu kalemde zaten kullanıldı. */
  used?: boolean;
  /** Seçili çıkış kanalı / aktif hamle. */
  selected?: boolean;
  locked?: boolean;
  /** Kilit nedeni kısa metinle açıklanır (GDD 23.11). */
  lockReason?: string;
  /** Kilitliyken dokunulursa nedeni bildirir; dokunmatikte tooltip yoktur. */
  onLockedPress?: () => void;
  /** Sarf maliyeti rozeti. */
  badge?: string;
}

interface Props {
  items: RailItem[];
  /** Sonuç aşamasında ray gizli/disabled olur (GDD 23.10.2). */
  disabled?: boolean;
  emptyLabel?: string;
  /** Müşteri yokkenki boş ray; aşırı kısa ekranda kuyruğa yer bırakabilir. */
  idle?: boolean;
}

/*
  Varsayılan boş metin ARTIK PARAMETRE VARSAYILANINDA DEĞİL. Orada
  `t()` çağırmak modül yüklenirken bir kez çalışırdı ve dil sonradan
  değişse bile ilk dilde donardı; çizim anında seçiliyor.
*/
export function ToolRail({ items, disabled = false, emptyLabel, idle = false }: Props) {
  return (
    <div
      className={`toolRail ${disabled ? 'toolRail--disabled' : ''} ${idle ? 'toolRail--idle' : ''}`}
      role="toolbar"
      aria-label={t('Bağlamsal araç rayı')}
    >
      {items.length === 0 ? (
        <span className="toolRail__empty">{emptyLabel ?? t('Bu aşamada araç yok')}</span>
      ) : (
        items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={[
              'tool',
              item.used ? 'tool--used' : '',
              item.selected ? 'tool--selected' : '',
              item.locked ? 'tool--locked' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={item.locked ? item.onLockedPress : item.onPress}
            disabled={disabled || item.disabled || (item.locked && !item.onLockedPress)}
            /*
             * Kilitli araç TIKLANABİLİR kalır: dokunmak kilit nedenini söyler
             * (GDD 23.11). Bu yüzden aria-disabled kullanılmaz — kullanılsaydı
             * ekran okuyucuya "etkileşilemez" derdik ama buton iş yapıyor.
             * Durum bunun yerine erişilebilir isme yazılır.
             */
            aria-label={item.locked ? `${item.label} — ${t('Kilitli')}, ${item.lockReason}` : undefined}
            title={item.locked ? item.lockReason : item.label}
            aria-pressed={item.selected}
          >
            {item.badge && <span className="tool__badge num">{item.badge}</span>}
            {item.icon}
            <span className="tool__label">{item.label}</span>
          </button>
        ))
      )}
    </div>
  );
}
