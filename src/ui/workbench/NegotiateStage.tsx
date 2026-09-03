/**
 * İşlem Masası · PAZARLIK (GDD 23.7 "Pazarlık", 23.10.2)
 *
 * Kurallar:
 *  - Teklif tutarı ekranın en güçlü sayısal değeridir → Karar Dock'unda.
 *  - Teklif değiştikçe tahmini kâr/zarar, likidite ve ilişki etkisi güncellenir.
 *  - Müşteri mesajı ve state AYNI YÜZEYDE değişir.
 *  - Gerekçe/Jest/Paket gibi aksiyonlar ikincil ama görünürdür → Araç Rayı.
 *
 * GDD 23.24 DEĞİŞMEZ: "Karşı teklifte yeni modal/sayfa açma; müşteri mesajı ve
 * pazarlık state'i aynı yüzeyde güncellenir." Bu bileşen hiçbir koşulda yeni
 * ekran veya modal açmaz.
 */

import { t } from '@i18n/index';
import { TERM } from '@ui/terms';

import { STATE_LABEL } from '@domain/negotiation';
import { CONFIDENCE_LABEL } from '@domain/valuation';
import { Art } from '@ui/Art';
import { MOVE_ART, OFFER_TIER_ART, OFFER_TIER_LABEL, customerArt, offerTier } from '@ui/assets';
import { IconCounter, IconGesture, IconPackage, IconReason } from '@ui/icons';
import { tl, tlBare, tlRange, tlSigned, tonWord } from '@ui/format';
import type {
  ExitChannel,
  Money,
  NegotiationSession,
  ThesisOption,
  ValuationBand,
} from '@domain/types';

const STATE_ORDER: NegotiationSession['state'][] = ['OPEN', 'HARDENING', 'FINAL_OFFER'];

/** Fiyat dışı hamlelerin oyuncuya görünen adı ve SVG karşılığı. */
const MOVE_LABEL: Record<string, string> = {
  reason: 'Gerekçe gösterdin',
  gesture: 'Jest yaptın',
  package: 'Paket teklif ettin',
  requestCounter: 'Karşı teklif istedin',
};

const MOVE_ICON: Record<string, typeof IconReason> = {
  reason: IconReason,
  gesture: IconGesture,
  package: IconPackage,
  requestCounter: IconCounter,
};

interface Props {
  /** Oyuncunun kendi vitrin stoğu: tarihî maliyet ile güncel metal ayrı. */
  saleAccounting?: { acquisitionCost: Money; metalValue: Money };
  session: NegotiationSession;
  message: string;
  /**
   * Oyuncunun masadaki TOPLAM teklifi. `reference` yalnız sarrafiyede dolu
   * olduğu için, işçilikli üründe teklifi buradan okuruz — analiz satırı
   * her iki üründe de çalışmak zorunda.
   */
  offer: Money;
  /** Konuşan müşterinin görünen adı — portre bunun üzerinden eşlenir. */
  customerName?: string;
  selectedThesis: ExitChannel | null;
  thesisOptions: ThesisOption[];
  band: ValuationBand | null;
  /** Kaç bilgi alanı doğrulandı — "ne biliyorum?" sorusunun ikinci yarısı. */
  verifiedFields: number;
  totalFields: number;
  /** Kabul edilirse likidite bu değere düşer. */
  liquidityAfter: string;
  /**
   * §2 — Piyasa referans alışı ve oyuncunun teklifi.
   * Referans, müşterinin gizli kabul fiyatı DEĞİLDİR; piyasa ve makas
   * kurallarından türeyen tipik kuyumcu alış fiyatıdır.
   */
  reference?: {
    /**
     * Pazarlığın yönü. Etiketi VE "iyi fark" işaretini belirler:
     * dükkân alırken referansın ALTINDA kalmak iyidir, satarken ÜSTÜNDE.
     * Tek yönlü yazılmış bir panel, alış akışında oyuncuya kârlı teklifi
     * kırmızı gösterirdi.
     */
    direction: 'shopBuys' | 'shopSells';
    unitReference: Money;
    unitOffer: Money;
    unit: string;
    /** Toplam satırı gösterilsin mi — birim fiyat toplamı vermiyorsa evet. */
    showTotal: boolean;
    /** "10,0 g × 4.257 ₺/g" gibi okunur çarpım. */
    totalLabel: string;
    totalReference: Money;
    totalOffer: Money;
  } | null;
}

export function NegotiateStage({
  session,
  message,
  offer,
  customerName,
  selectedThesis,
  thesisOptions,
  band,
  verifiedFields,
  totalFields,
  liquidityAfter,
  reference,
  saleAccounting,
}: Props) {
  const active = selectedThesis
    ? thesisOptions.find((o) => o.channel === selectedThesis)
    : thesisOptions[0];

  const isFinal = session.state === 'FINAL_OFFER';
  const counter = session.finalOffer ?? session.activeCounter;

  /*
    Ara bölge artık YALNIZ final teklif önizlemesini taşır.
    Değer bandı buradan alındı ve aşağıdaki kalıcı Karar Paneli'ne taşındı:
    band spacer'da yaşarken, FINAL_OFFER'a geçilince önizleme onun yerini
    alıyordu — yani oyuncu tam da geri dönüşü olmayan kararı verirken kendi
    analizini kaybediyordu.
  */
  const hasSpacerContent = isFinal && counter !== null && active !== undefined;

  /*
    Teklifin oyuncunun KENDİ analizine göre nerede durduğu.

    Bandın ORTASINA göre işaretli fark + bandın neresinde olduğunu söyleyen
    tek kelime. Neden ikisi birden: yalnız rakam "1.204 ₺ aşağıdayım" der ama
    bandın içinde mi dışında mı olduğunu söylemez; yalnız kelime ise ne kadar
    aşağıda olduğunu gizler.

    TON, YÖNE BAĞLIDIR. Dükkân ALIRKEN bandın altında kalmak iyidir; dükkân
    SATARKEN bandın üstüne çıkmak iyidir. Tek yönlü yazılsaydı alış akışında
    kârlı teklif kırmızı görünürdü — bu hata bu ekranda daha önce yapılmıştı.

    GDD 6.6: burada müşterinin kabul eşiği YOKTUR. Karşılaştırma yalnız
    oyuncunun kendi ürettiği bandadır.
  */
  const shopSells = reference?.direction === 'shopSells';
  const analysisGap = (() => {
    if (!band) return { text: '—', tone: 'neutral' as const };
    const mid = (band.min + band.max) / 2;
    const diff = offer - mid;
    const inside = offer >= band.min && offer <= band.max;
    const below = offer < band.min;

    const where = inside ? t('band içi') : below ? t('band altı') : t('band üstü');
    // Alırken aşağısı, satarken yukarısı oyuncunun lehine.
    const favourable = inside ? null : shopSells ? !below : below;
    const tone = favourable === null ? 'neutral' : favourable ? 'positive' : 'negative';

    return {
      text: `${diff >= 0 ? '+' : '−'}${tl(Math.abs(Math.round(diff)))} · ${where}`,
      tone,
    };
  })();

  /*
    HAMLE ŞERİDİ — pazarlığın "az önce ne oldu" satırı.
    Fiyat dışı son hamle (Gerekçe / Jest / Paket / Karşı Teklif) ve
    oyuncunun masadaki teklifinin seviyesi burada okunur.

    NEDEN ARAÇ RAYINDA DEĞİL: ray 56 px ve içindeki ikonlar 19 px — yani
    16–32 px SVG bandı. Gerçekçi pazarlık görselini oraya sıkıştırmak ya
    dokunma hedefini ya da şerit sözleşmesini bozardı. Aksiyonlar rayda
    SVG olarak kalır; gerçekçi karşılıkları hamle YAPILDIKTAN sonra
    burada, 72 px'te görünür.
  */
  const lastTactic = [...session.moveHistory]
    .reverse()
    .find((m) => m.kind in MOVE_LABEL);
  const standingOffer = session.offerHistory[session.offerHistory.length - 1] ?? 0;
  const tier = active ? offerTier(standingOffer, active.buyCeiling) : null;
  const TacticIcon = lastTactic ? MOVE_ICON[lastTactic.kind] : undefined;

  return (
    <div className="negotiate">
      <div className="negotiate__top">
        {/*
          Konuşan müşterinin portresi mesajın yanında. GDD 23.24 pazarlığı
          "müşteri mesajı ve state AYNI YÜZEYDE" tutmaya bağlıyor; portre o
          yüzeyin kim olduğunu söyleyen parçası. 72 px — paketin portreler
          için verdiği 72–160 px bandının alt ucu, şerit sözleşmesini
          zorlamayan tek değer.
        */}
        {customerName && (
          <Art
            art={customerArt(customerName)}
            size={72}
            alt={`${customerName} portresi`}
            className="speech__portrait art--portrait"
            fallback={null}
          />
        )}
        <p className="speech">“{message}”</p>
        <StateBadge state={session.state} />
      </div>

      {counter !== null && (
        <div className={`counterRow ${isFinal ? 'counterRow--final' : ''}`}>
          <span className="counterRow__label">
            {isFinal ? t('Son teklifi') : t('Karşı teklifi')}
          </span>
          <span className="counterRow__value num">{tl(counter)}</span>
        </div>
      )}

      {active && (
        <div className="contextRow">
          <span className="contextRow__key">{t('Seçili tez')}</span>
          <span className="contextRow__val">{active.shortLabel}</span>
          <span className="contextRow__key">{t('Alış tavanı')}</span>
          <span className="contextRow__val num">{tl(active.buyCeiling)}</span>
        </div>
      )}

      {/*
        Boşken BÜYÜMEZ. Alış akışında band, tez ve doğrulanmış alan yoktur
        (ürün oyuncunun kendi stoğu); bu durumda `flex: 1` taşıyan boş bir
        kutu, konuşma balonu ile piyasa referansının arasına ekran boyu bir
        boşluk açıp ilgili iki bilgiyi birbirinden koparıyordu.
      */}
      <div className={`negotiate__spacer ${hasSpacerContent ? '' : 'negotiate__spacer--empty'}`}>
        {isFinal && counter !== null && active ? (
          /* GDD 23.12 Final Offer — "'Son teklif' etiketi + SONUÇ ÖNİZLEMESİ" */
          <div className="preview">
            <div className="preview__row">
              <span className="preview__key">{t('Kabul edilirse ödenecek')}</span>
              <span className="preview__val num">{tl(counter)}</span>
            </div>
            <div className="preview__row">
              <span className="preview__key">{t('Alış tavanına göre')}</span>
              <span
                className={`preview__val num preview__val--${
                  active.buyCeiling - counter >= 0 ? 'positive' : 'negative'
                }`}
              >
                {tlSigned(active.buyCeiling - counter)}{' '}
                {tonWord(active.buyCeiling - counter)}
              </span>
            </div>
            <div className="preview__row">
              <span className="preview__key">{t(TERM.liquidity)}</span>
              <span className="preview__val preview__val--warning num">{liquidityAfter}</span>
            </div>
            <div className="preview__row">
              <span className="preview__key">{t('Geri dönüş')}</span>
              <span className="preview__val preview__val--negative">{t('Yok — kabul veya red')}</span>
            </div>
          </div>
        ) : null}
      </div>

      {/*
        KARAR PANELİ — pazarlık boyunca KALICI.

        Dört bilgi aynı yüzeyde durur:
          · Senin Analizin        → testler ve değerleme sonucu ulaştığın band
          · Piyasa Referans Alış  → piyasanın tipik alışı (yalnız sarrafiyede)
          · Senin Teklifin        → masadaki rakamın
          · Analize Göre Fark     → teklifin kendi analizine göre nerede durduğu

        NEDEN BİRLİKTE: analiz Değerle aşamasında yapılıyor, teklif Pazarlık
        aşamasında veriliyordu. İkisi ayrı ekranlarda kalınca oyuncu kendi
        vardığı sonucu hatırlamak için geri dönmek zorundaydı — kararın
        girdisi kararın verildiği yerde değildi.

        BURADA OLMAYAN ŞEY (GDD 6.6): müşterinin gizli kabul fiyatı ve
        rezervasyonu. Band oyuncunun KENDİ bilgisidir, müşterinin değil;
        "Analize Göre Fark" da teklifi o kendi bilgisine göre konumlar,
        müşterinin kabul edeceği rakama göre değil.
      */}
      {saleAccounting && <div className="refPanel" aria-label={t('Vitrin satış hesabı')}>
        <div className="refPanel__row"><span className="refPanel__key">{t('Alış Maliyetim')}</span><span className="refPanel__val num">{tl(saleAccounting.acquisitionCost)}</span></div>
        <div className="refPanel__row"><span className="refPanel__key">{t('Güncel Metal Değeri')}</span><span className="refPanel__val num">{tl(saleAccounting.metalValue)}</span></div>
        <div className="refPanel__row"><span className="refPanel__key">{counter !== null ? 'Müşteri Teklifi' : 'Satış Teklifim'}</span><span className="refPanel__val num">{tl(counter ?? offer)}</span></div>
        <div className="refPanel__row"><span className="refPanel__key">{t('Kâr / Zarar')}</span><span className="refPanel__val num">{tlSigned((counter ?? offer) - saleAccounting.acquisitionCost)}</span></div>
      </div>}
      {!saleAccounting && (band || reference) && (
        <div className="refPanel">
          {band && (
            <div className="refPanel__row refPanel__row--analysis">
              <span className="refPanel__key">
                {t('Senin Analizin')}
                <span className={`refPanel__conf confidence__value--${band.confidence}`}>
                  {' '}
                  · {CONFIDENCE_LABEL[band.confidence]} ({verifiedFields}/{totalFields})
                </span>
              </span>
              <span className="refPanel__val num">
                {tlRange(band.min, band.max)}
              </span>
            </div>
          )}

          {reference && (
            <div className="refPanel__row">
              <span className="refPanel__key">
                {reference.direction === 'shopBuys'
                  ? t('Piyasa Referans Alış')
                  : t('Piyasa Referans Satış')}
              </span>
              <span className="refPanel__val num">
                {tlBare(reference.unitReference)} {reference.unit}
              </span>
            </div>
          )}

          <div className="refPanel__row">
            <span className="refPanel__key">
              {reference && reference.direction === 'shopSells' ? t('İstediğin Fiyat') : t('Senin Teklifin')}
            </span>
            <span className="refPanel__val num">
              {reference
                ? `${tlBare(reference.unitOffer)} ${reference.unit}`
                : tl(offer)}
            </span>
          </div>

          {band && (
            <div className="refPanel__row">
              <span className="refPanel__key">{t('Analize Göre Fark')}</span>
              <span className={`refPanel__val num refPanel__val--${analysisGap.tone}`}>
                {analysisGap.text}
              </span>
            </div>
          )}

          {reference && (
            <div className="refPanel__row refPanel__row--refGap">
              <span className="refPanel__key">{t('Referansa Göre Fark')}</span>
              <span
                className={`refPanel__val num refPanel__val--${
                  (
                    reference.direction === 'shopBuys'
                      ? reference.unitOffer <= reference.unitReference
                      : reference.unitOffer >= reference.unitReference
                  )
                    ? 'positive'
                    : 'negative'
                }`}
              >
                {reference.unitOffer === reference.unitReference
                  ? `0 ${reference.unit}`
                  : `${reference.unitOffer > reference.unitReference ? '+' : '−'}${tlBare(
                      Math.abs(reference.unitReference - reference.unitOffer),
                    )} ${reference.unit}`}
              </span>
            </div>
          )}

          {/*
            §1 — "adet/gram × birim fiyat = toplam". Gram bazlı üründe birim
            fiyat ₺/g olduğu için toplam ayrıca yazılmalı: 4.257 ₺/g tek
            başına 10 g'lık külçenin ne ettiğini söylemez.
          */}
          {reference?.showTotal && (
            <div className="refPanel__row refPanel__row--total">
              <span className="refPanel__key">{reference.totalLabel}</span>
              <span className="refPanel__val num">{tl(reference.totalOffer)}</span>
            </div>
          )}
        </div>
      )}

      {session.offerHistory.length > 0 && (
        <div className="history">
          <span className="history__label">Teklifleriniz</span>
          {session.offerHistory.map((offer, i) => {
            const prev = session.offerHistory[i - 1];
            // Anti-spam görünür kanıtı: tekrar eden teklif işaretlenir (GDD 11.4).
            const isRepeat =
              prev !== undefined && Math.abs(offer - prev) / Math.max(1, prev) < 0.005;
            return (
              <span
                key={`${i}-${offer}`}
                className={`history__chip num ${isRepeat ? 'history__chip--repeat' : ''}`}
                title={isRepeat ? t('Aynı teklif tekrarlandı — yeni şans üretmez') : undefined}
              >
                {tlBare(offer)}
              </span>
            );
          })}
        </div>
      )}
      {/*
        ŞERİT KOLONUN SONUNDA — ölçüp taşıdım.
        Önce konuşma balonunun hemen altındaydı. 390×844'te ölçünce şunu
        gördüm: 74 px'lik şerit, PİYASA REFERANS ALIŞ panelini ve değer
        bandını katlanın altına itiyordu. O panel bu ekranda özellikle
        istenmiş bilgidir — "istediğim fiyatı neye göre koyacağım"ın cevabı.
        Az önce kendi bastığın düğmenin hatırlatmasını, kararı verdiren
        rakamın önüne koymak yanlış sıralamaydı. Şerit artık en sonda:
        kimseyi aşağı itmez, yer daralınca ilk o görünmez olur.
      */}
      {(lastTactic || tier) && (
        <div className="moveStrip">
          {lastTactic && (
            <span className="moveStrip__cell">
              <Art
                art={MOVE_ART[lastTactic.kind]}
                size={72}
                decorative
                className="art--onDark"
                fallback={TacticIcon ? <TacticIcon size={26} /> : null}
              />
              <span className="moveStrip__label">{MOVE_LABEL[lastTactic.kind]}</span>
            </span>
          )}

          {tier && (
            <span className="moveStrip__cell moveStrip__cell--tier">
              <Art art={OFFER_TIER_ART[tier]} size={56} decorative fallback={null} />
              <span className="moveStrip__label">
                Teklifin: <strong>{OFFER_TIER_LABEL[tier]}</strong>
              </span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Durum rozeti. GDD 11.1 durum makinesini görünür kılar; kapanış skoru
 * gösterilmez (GDD 11.3 — "matematiksel skor oyuncuya gösterilmez").
 */
function StateBadge({ state }: { state: NegotiationSession['state'] }) {
  const index = STATE_ORDER.indexOf(state);

  return (
    <div className="stateBadge">
      <span className="stateBadge__label">{t('Pazarlık')}</span>
      <span className={`stateBadge__value stateBadge__value--${state}`}>
        {STATE_LABEL[state]}
      </span>
      <span className={`stateBadge__dots stateBadge__value--${state}`}>
        {STATE_ORDER.map((_, i) => (
          <span
            key={i}
            className={`stateBadge__dot ${i <= index ? 'stateBadge__dot--on' : ''}`}
          />
        ))}
      </span>
    </div>
  );
}
