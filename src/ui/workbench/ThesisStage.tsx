/**
 * İşlem Masası · TEZ (GDD 23.7 "Tez", 23.10.2)
 *
 * Kurallar:
 *  - 2–4 rasyonel çıkış kanalı kısa karşılaştırılır.
 *  - Her kanalda tahmini net değer, süre, risk ve likidite etkisi gösterilir.
 *  - Oyuncu seçim yapmadan da teklif verebilir; sistem varsayılan en makul
 *    kanalı önerebilir FAKAT KİLİTLEMEZ (GDD 8.2).
 *
 * Kanalların hangilerinin gösterileceği domain katmanında kararlaştırılır
 * (thesis.ts) — UI yalnız sunar.
 */

import { t } from '@i18n/index';
import { TERM } from '@ui/terms';
import { LIQUIDITY_LABEL, RISK_LABEL } from '@domain/thesis';
import {
  IconCollection,
  IconMelt,
  IconRetail,
  IconServiceResale,
  IconWholesale,
} from '@ui/icons';
import { Art } from '@ui/Art';
import { EXIT_ART } from '@ui/assets';
import { dayRange, tl } from '@ui/format';
import type { ExitChannel, ThesisOption } from '@domain/types';

const CHANNEL_ICON: Record<ExitChannel, typeof IconRetail> = {
  retail: IconRetail,
  wholesale: IconWholesale,
  melt: IconMelt,
  serviceResale: IconServiceResale,
  collection: IconCollection,
};

interface Props {
  options: ThesisOption[];
  selected: ExitChannel | null;
  /** Sistemin önerdiği kanal — bağlayıcı değildir. */
  suggested: ExitChannel | null;
  onSelect: (channel: ExitChannel) => void;
}

export function ThesisStage({ options, selected, suggested, onSelect }: Props) {
  return (
    <div className="thesis">
      {options.map((option) => {
        const Icon = CHANNEL_ICON[option.channel];
        const isSelected = selected === option.channel;
        const isSuggested = !selected && suggested === option.channel;

        return (
          <button
            key={option.channel}
            type="button"
            className={[
              'thesisCard',
              isSelected ? 'thesisCard--selected' : '',
              isSuggested ? 'thesisCard--suggested' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => onSelect(option.channel)}
            aria-pressed={isSelected}
          >
            {/*
              Çıkış planı görseli 64 px — kartın kimliğini taşıyan ana
              görsel, bu yüzden gerçekçi varlık. Pakette yalnız üç plan var
              (vitrin / toptan / erit); servis-satış ve koleksiyon kanalları
              SVG ikonunda kalır ve <Art> onları kendiliğinden çizer.
            */}
            <span className="thesisCard__icon">
              <Art
                art={EXIT_ART[option.channel]}
                size={64}
                decorative
                className="art--hero"
                fallback={<Icon size={26} />}
              />
            </span>

            <span className="thesisCard__body">
              <span className="thesisCard__head">
                <span className="thesisCard__name">{option.label}</span>
                <span className="thesisCard__figures">
                  <span className="thesisCard__net num">{tl(option.expectedNet)}</span>
                  {/* Alış tavanı, oyuncunun kararını asıl değiştiren sayıdır (GDD 6.4). */}
                  <span className="thesisCard__ceiling num">tavan {tl(option.buyCeiling)}</span>
                </span>
              </span>

              <span className="thesisCard__metrics">
                <Metric label={t("Süre")} value={dayRange(option.daysToCash)} />
                <Metric
                  label={t('Risk')}
                  value={t(RISK_LABEL[option.demandRisk])}
                  tone={option.demandRisk}
                />
                <Metric
                  label={t(TERM.liquidity)}
                  value={t(LIQUIDITY_LABEL[option.liquidity])}
                  tone={option.liquidity === 'high' ? 'low' : option.liquidity === 'low' ? 'high' : 'medium'}
                />
              </span>
            </span>

            {isSuggested && <span className="thesisTag">{t('Öneri')}</span>}
          </button>
        );
      })}
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'low' | 'medium' | 'high';
}) {
  return (
    <span className="metric">
      <span className="metric__label">{label}</span>
      <span className={`metric__value ${tone ? `metric__value--${tone}` : ''}`}>{value}</span>
    </span>
  );
}
