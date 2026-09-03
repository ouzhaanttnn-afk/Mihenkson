/**
 * DÜKKAN — ana aktif müşteri ekranı
 * Kaynak: GDD 23.9.3 wireframe, 23.10 "Dükkan Ekranı – Durumlar",
 *         23.11 Araç Rayı, 23.12 Karar Dock'u.
 *
 * BAĞLAYICI KURALLAR (GDD 23.24 "Claude / Uygulama Ajanı İçin"):
 *  ✔ Tek baskın İşlem Masası — dashboard kartları yığını yok.
 *  ✔ Aktif müşteride dikey scroll yok; CTA scroll altında kalmaz.
 *  ✔ Test araçları tek Bağlamsal Araç Rayı'nda; sayfalara dağılmaz.
 *  ✔ İncele/Değerle/Tez/Pazarlık ayrı tam ekran değil, aynı Workbench state'i.
 *  ✔ Karşı teklif yeni modal/sayfa açmaz.
 *  ✔ Rutin işlemde confirmation popup yok.
 *  ✔ İkon tek başına anlam taşımaz; her araçta metin etiketi var.
 */

import { TERM } from '@ui/terms';
import { useEffect, useMemo, useState } from 'react';

import { DAY, NEGOTIATION } from '@domain/balance';
import { isBlindTradingDay, isShopOpen, nextMarketOpenDay, weekdayLabel } from '@domain/calendar';
import { shopDisplayName } from '@domain/profile';
import { effectiveCeiling, suggestedChannel } from '@domain/thesis';
import { isTerminal } from '@domain/negotiation';
import { liquidityRatio } from '@domain/settlement';
import { toolsForLevel } from '@data/tools';
import { getArchetype } from '@data/archetypes';
import { getServiceType } from '@data/service-types';
import { expectedCompletionDay, findQuote } from '@domain/service';
import { activeLine, canEnterStage, selectors, useGame } from '@state/gameStore';
import { offerableStock } from '@domain/purchase';
import {
  bullionUnitValue,
  marketReferenceBuy,
  marketReferenceSell,
  unitPriceView,
} from '@domain/channels';
import { isBullion } from '@data/bullion';
import { CLASS_LABEL, flowPolicy, isToolRelevant, transactionClass } from '@domain/transaction-class';

import { CustomerStrip } from '@ui/shell/CustomerStrip';
import { DecisionDock } from '@ui/shell/DecisionDock';
import { MarketStrip } from '@ui/shell/MarketStrip';
import { CoachBar } from '@ui/shell/CoachBar';
import { StageStrip } from '@ui/shell/StageStrip';
import { StatusStrip } from '@ui/shell/StatusStrip';
import { ToolRail, type RailItem } from '@ui/shell/ToolRail';

import { AppraiseStage } from '@ui/workbench/AppraiseStage';
import {
  AppraisalIntro,
  AppraisalResultStage,
  ReportStage,
} from '@ui/workbench/AppraisalStages';
import { getStance } from '@domain/appraisal';
import { CONFIDENCE_LABEL } from '@domain/valuation';
import { InspectStage } from '@ui/workbench/InspectStage';
import { NegotiateStage } from '@ui/workbench/NegotiateStage';
import { ResultStage } from '@ui/workbench/ResultStage';
import { ThesisStage } from '@ui/workbench/ThesisStage';
import {
  DiagnoseStage,
  JobQueueStage,
  PromiseStage,
  QuoteStage,
} from '@ui/workbench/ServiceStages';
import { PackageStage, StockPickStage } from '@ui/workbench/PurchaseStages';
import {
  OfferControl,
  liquidityImpact,
  snapOffer,
  type OfferImpact,
} from '@ui/workbench/OfferControl';

import {
  IconClock,
  IconCash,
  IconCollection,
  IconCounter,
  IconDensity,
  IconGesture,
  IconLiquidity,
  IconLoupe,
  IconMagnet,
  IconMelt,
  IconPackage,
  IconReason,
  IconReject,
  IconRetail,
  IconScale,
  IconSend,
  IconServiceResale,
  IconSpectrometer,
  IconStock,
  IconTouchstone,
  IconVideo,
  IconWarning,
  IconWholesale,
  IconWorkshop,
  IconBusiness,
} from '@ui/icons';
import { Art } from '@ui/Art';
import { customerArt, NAV_ART } from '@ui/assets';
import { customerIntentLine } from '@ui/intent-line';
import { queueCapacity } from '@domain/v5-rules';
import { RETAIL_BULLION_CATALOG } from '@data/bullion';
import { showcaseStock } from '@domain/purchase';
import { poolForItem, poolForTemplate } from '@domain/stock-pools';
import { customerPriceBand } from '@domain/customer-pricing';
import { BullionCatalog } from '@ui/screens/StockScreen';
import { clock, grams, moneyUnit, pct, tl, tlBare, tlSigned, tonWord, preciseGrams } from '@ui/format';
import { t } from '@i18n/index';
import { offerUnitLabel } from '@ui/offer-view';
import type {
  DealLine,
  ExitChannel,
  InfoField,
  ItemInstance,
  MarketState,
  Money,
  PurchaseSession,
  WorkbenchStage,
} from '@domain/types';
import { TalentTreePanel } from './TalentTreePanel';

const TOOL_ICON: Record<string, typeof IconScale> = {
  scale: IconScale,
  magnet: IconMagnet,
  touchstone: IconTouchstone,
  density: IconDensity,
  loupe: IconLoupe,
  spectrometer: IconSpectrometer,
};

export function ShopScreen() {
  const s = useGame();
  const deal = s.activeDeal;
  const line = deal ? activeLine(deal) : undefined;
  const item = line ? s.items[line.itemId] : undefined;

  const liquidity = liquidityRatio(s.store.cash, s.inventory);

  // Teklif tutarı — aşama değiştikçe alış tavanına göre yeniden konumlanır.
  const ceiling = line ? effectiveCeiling(line.thesisOptions, line.selectedThesis) : 0;
  const [offer, setOffer] = useState<Money>(0);
  const [stageNotice, setStageNotice] = useState<string | null>(null);

  const offerBounds = useMemo(() => {
    if (!line?.band) return { min: 0, max: 0, step: 100 };
    // Slider aralığı: bandın altından tavanın üstüne. Oyuncu tavanı aşabilir —
    // sistem "bu fiyattan al" emri vermez (GDD 6.6), yalnız etkisini gösterir.
    const min = Math.max(0, Math.round(line.band.min * 0.55));
    const max = Math.max(min + 1000, Math.round(Math.max(ceiling, line.band.max) * 1.15));
    const span = max - min;
    const step = span > 200_000 ? 500 : span > 40_000 ? 100 : 50;
    return { min, max, step };
  }, [line?.band, ceiling]);

  // Pazarlığa girildiğinde teklifi slider'ın gerçekten göstereceği değere
  // yerleştir. Ham kanal önerisini state'te bırakmak ekranda snap'lenmiş başka
  // bir rakam gösterirken submit/kâr hesabında eski rakamı kullanıyordu.
  useEffect(() => {
    if (deal?.stage !== 'negotiate' || offer !== 0) return;
    if (deal.purchase) {
      setOffer(purchaseStartingOffer(deal.purchase));
    } else if (ceiling > 0) {
      setOffer(snapOffer(ceiling * 0.9, offerBounds.min, offerBounds.max, offerBounds.step));
    }
  }, [deal?.stage, deal?.purchase, ceiling, offer, offerBounds]);

  // Yeni kalem / yeni müşteri → teklif sıfırlanır.
  useEffect(() => {
    setOffer(0);
    setStageNotice(null);
  }, [deal?.dealId, deal?.activeLineId]);

  // Gün akışı: aktif pazarlık yokken saat ilerler (store.tick bunu denetler).
  useEffect(() => {
    const id = window.setInterval(() => useGame.getState().tick(0.5), 500);
    return () => window.clearInterval(id);
  }, []);

  const stage: WorkbenchStage = deal?.stage ?? 'inspect';

  // GDD 25 — gösterilecek ders; tümü görüldüyse null ve şerit hiç çizilmez.
  const lesson = selectors.lesson(s);

  return (
    <>
      <StatusStrip
        store={s.store}
        market={s.market}
        speed={s.speed}
        speed4xUnlocked={s.speed4xUnlocked}
        onSpeed={s.setSpeed}
        onUnlock4x={s.unlock4x}
        onOpenSettings={s.openSettings}
        profile={s.profile}
        profileFrame={s.playerMarket.equipped.profileFrame}
        onEditProfile={s.openProfile}
      />

      <MarketStrip market={s.market} onOpenMarket={() => s.setTab('business')} />



      {s.activeCustomer && (
        <CustomerStrip
          customer={s.activeCustomer}
          record={s.customers[s.activeCustomer.id] ?? null}
          lineCount={deal?.lines.length ?? 0}
          broughtItems={
            deal ? deal.lines.map((l) => s.items[l.itemId]).filter((i): i is ItemInstance => !!i) : []
          }
        />
      )}

      {deal && (
        <>
        <StageStrip
          flow={deal.flow}
          current={stage}
          canEnter={(target) => canEnterStage(useGame.getState(), target)}
          onSelect={(target) => {
            if (
              deal.flow === 'trade' &&
              stage === 'inspect' &&
              (target === 'thesis' || target === 'negotiate') &&
              item &&
              transactionClass(item) !== 'fast'
            ) {
              setStageNotice('Değerleme atlandı · teklif aralığı daha belirsiz ve riskli olabilir.');
            } else {
              setStageNotice(null);
            }
            s.setStage(target);
          }}
          /*
            Standart sarrafiyede (Gram / Çeyrek / Yarım / Tam / Ata) rasyonel
            bir çıkış planı SEÇİMİ yoktur — çeyreğin nereye gideceği bellidir.

            ÖLÇÜT `transactionClass === 'fast'`, `requiresExitPlan` DEĞİL.
            Önce ikincisini kullanmıştım ve tarayıcıda "22 Ayar İnce Bilezik"
            de üç aşamaya düştü: `controlled` sınıfı (düşük işçilikli takı)
            da çıkış planını ZORUNLU tutmuyor. Ama "zorunlu değil" ile
            "anlamsız" aynı şey değil — bilezik işçilikli bir üründür ve
            vitrin / toptan / erit seçimi orada gerçekten fark yaratır.
            'fast' tam olarak standart sarrafiyedir; şüphe işareti taşıyan
            bir çeyrek bile 'controlled'a düşer ve aşamasını geri alır.
          */
          skipStages={item && transactionClass(item) === 'fast' ? ['thesis'] : []}
        />
        {stageNotice && <div className="stageNotice" role="status">{stageNotice}</div>}
        </>
      )}

      <main className={`workbench ${!deal ? 'workbench--idle' : ''} ${s.playerMarket.equipped.shopTheme ? `workbench--${s.playerMarket.equipped.shopTheme}` : ''}`}>
        <div className="wb">
          {/* Çoklu ürün kalem şeridi — dikey scroll yerine yatay pill (GDD 23.13) */}
          {deal && deal.lines.length > 1 && (
            <div className="lineStrip" role="tablist" aria-label="Müşterinin ürünleri">
              {deal.lines.map((l, i) => (
                <button
                  key={l.lineId}
                  type="button"
                  role="tab"
                  aria-selected={l.lineId === deal.activeLineId}
                  className={`linePill ${l.lineId === deal.activeLineId ? 'linePill--active' : ''}`}
                  onClick={() => s.setActiveLine(l.lineId)}
                >
                  <span className={`linePill__dot linePill__dot--${l.status}`} />
                  Ürün {i + 1}
                </button>
              ))}
            </div>
          )}

          {!deal || !line ? (
            <IdleWorkbench coaching={lesson !== null} />
          ) : /* --- Müşteri alış akışı (GDD 23.23) --- */
          deal.flow === 'purchase' && deal.purchase ? (
            stage === 'package' ? (
              <PackageStage purchase={deal.purchase} items={s.items} />
            ) : stage === 'negotiate' ? (
              <NegotiateStage
                session={line.negotiation}
                message={s.customerMessage}
                offer={line.negotiation.finalOffer ?? offer}
                customerName={s.activeCustomer?.displayName}
                selectedThesis={null}
                thesisOptions={[]}
                band={null}
                saleAccounting={deal.purchase.demand.targetInventoryItemId ? {
                  acquisitionCost: deal.purchase.packageCost,
                  metalValue: deal.purchase.lines.reduce((sum, row) => {
                    const item = s.items[row.itemId];
                    return sum + (item ? customerPriceBand(item, s.market, 'shopSells', row.quantity)?.reference ?? 0 : 0);
                  }, 0),
                } : undefined}
                verifiedFields={0}
                totalFields={0}
                liquidityAfter={salePreview(
                  s,
                  line.negotiation.finalOffer ?? offer,
                  deal.purchase.packageCost,
                )}
                /*
                  Alış akışında bu alan boştu: band, tez ve doğrulanmış alan
                  yok (ürün oyuncunun kendi stoğu, ölçülecek gizli gerçek
                  yok). Oyuncunun burada ihtiyaç duyduğu çapa PİYASA
                  FİYATIDIR — istediği fiyatı neye göre koyacağı.
                */
                reference={buildPackageReference(
                  deal.purchase,
                  s.items,
                  s.market,
                  line.negotiation.finalOffer ?? offer,
                )}
              />
            ) : stage === 'result' && s.lastReview ? (
              <ResultStage review={s.lastReview} accepted={line.negotiation.state === 'ACCEPTED'} />
            ) : (
              <StockPickStage
                purchase={deal.purchase}
                rows={offerableStock(deal.purchase.demand, s.inventory, s.items)}
                onToggle={s.togglePackageItem}
                onQuantity={s.setPackageQuantity}
              />
            )
          ) : !item ? (
            <IdleWorkbench coaching={lesson !== null} />
          ) : /* --- Ekspertiz / danışma akışı (GDD 23.23 beşinci akış) --- */
          deal.flow === 'appraisal' && deal.appraisal ? (
            stage === 'inspect' ? (
              <>
                <AppraisalIntro item={item} />
                <InspectStage
                  item={item}
                  knowledge={line.knowledge}
                  testResults={line.testResults}
                  market={s.market}
                />
              </>
            ) : stage === 'test' && line.band ? (
              // Test adımı ticaretin değerleme ekranını AYNEN kullanır:
              // ölçüm ölçümdür, akış değişince fizik değişmez.
              <AppraiseStage band={line.band} />
            ) : stage === 'report' && line.band ? (
              <ReportStage
                band={line.band}
                appraisal={deal.appraisal}
                testsUsed={line.testResults.length}
                onSelectStance={s.selectStance}
                onSetFee={s.setAppraisalFee}
              />
            ) : stage === 'result' ? (
              <AppraisalResultStage appraisal={deal.appraisal} />
            ) : (
              <InspectStage
                item={item}
                knowledge={line.knowledge}
                testResults={line.testResults}
                market={s.market}
              />
            )
          ) : /* --- Servis Kabul akışı (GDD 23.14) --- */
          deal.flow === 'service' && deal.service ? (
            stage === 'diagnose' ? (
              <DiagnoseStage item={item} service={deal.service} />
            ) : stage === 'quote' ? (
              <QuoteStage
                item={item}
                market={s.market}
                service={deal.service}
                onSelectVenue={s.selectServiceVenue}
              />
            ) : stage === 'promise' ? (
              <PromiseStage
                service={deal.service}
                today={s.market.day}
                onSetBuffer={s.setPromiseBuffer}
              />
            ) : (
              <JobQueueStage
                service={deal.service}
                job={s.jobs.find((j) => j.jobId === deal.service?.createdJobId)}
              />
            )
          ) : stage === 'inspect' ? (
            <InspectStage
              item={item}
              knowledge={line.knowledge}
              testResults={line.testResults}
              market={s.market}
            />
          ) : stage === 'appraise' && line.band ? (
            <AppraiseStage band={line.band} />
          ) : stage === 'thesis' ? (
            <ThesisStage
              options={line.thesisOptions}
              selected={line.selectedThesis}
              suggested={suggestedChannel(line.thesisOptions)}
              onSelect={s.selectThesis}
            />
          ) : stage === 'negotiate' ? (
            <NegotiateStage
              session={line.negotiation}
              message={s.customerMessage}
              offer={line.negotiation.finalOffer ?? offer}
              customerName={s.activeCustomer?.displayName}
              selectedThesis={line.selectedThesis}
              thesisOptions={line.thesisOptions}
              band={line.band}
              verifiedFields={line.knowledge.filter((k) => k.status === 'verified').length}
              totalFields={line.knowledge.length}
              liquidityAfter={liquidityPreview(s, line.negotiation.finalOffer ?? offer)}
              reference={buildReference(item, s.market, line.negotiation.finalOffer ?? offer)}
            />
          ) : stage === 'result' && s.lastReview ? (
            <ResultStage
              review={s.lastReview}
              accepted={line.negotiation.state === 'ACCEPTED'}
            />
          ) : null}
        </div>
      </main>

      {/*
        GDD 25 — öğretim şeridi. Araç rayının ÜSTÜNDE, İşlem Masası'nın
        ALTINDA: hiçbir kontrolü örtmez, kapatılınca yerini geri verir.
      */}
      {lesson && (
        <CoachBar
          lesson={lesson}
          // Atlama kararı bir kez sorulur: hiç ders görmemiş oyuncuya.
          showSkip={s.seenLessons.length === 0}
          queuePriority={!deal && s.queue.length > 0}
          onDismiss={() => s.dismissLesson(lesson.id)}
          onSkipAll={s.skipOnboarding}
        />
      )}

      <ContextualToolRail liquidity={liquidity} />

      <ShopDock offer={offer} setOffer={setOffer} bounds={offerBounds} liquidity={liquidity} />

      {s.stockCatalogOpen && (
        <QuickStockSheet onClose={() => s.setStockCatalogOpen(false)} />
      )}
    </>
  );
}

function QuickStockSheet({ onClose }: { onClose: () => void }) {
  const cash = useGame((s) => s.store.cash);

  return (
    <div className="quickStockScrim" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="quickStockSheet" role="dialog" aria-modal="true" aria-labelledby="quick-stock-title">
        <header className="quickStockSheet__head">
          <span>
            <span className="quickStockSheet__eyebrow">Hızlı Stok</span>
            <h2 id="quick-stock-title">İlk Sarrafiyeni Al</h2>
          </span>
          <button type="button" className="quickStockSheet__close" onClick={onClose} aria-label="Hızlı stok ekranını kapat">×</button>
        </header>
        <p className="quickStockSheet__intro">Dükkan ekranından ayrılmadan satılabilir sarrafiye oluştur. Kullanılabilir nakit: <strong>{tl(cash)}</strong></p>
        <div className="quickStockSheet__scroll">
          <BullionCatalog />
        </div>
        {/*
          C3 — düğme yapmadığı şeyi vaat etmemeli. Alım satır satır "Al" ile
          yapılıyor; buranın tek işi pencereyi kapatmak.
        */}
        <button type="button" className="quickStockSheet__done" onClick={onClose}>Kapat</button>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// IDLE — müşteri yok (GDD 23.10.1)
// ---------------------------------------------------------------------------

/**
 * GDD 23.10.1: "İşlem Masası, günün tek kritik bağlamını gösterir: aktif event,
 * yaklaşan servis teslimi veya düşük likidite gibi. EN FAZLA 3 kompakt uyarı
 * satırı bulunur; ayrı büyük kartlar kullanılmaz."
 */
function IdleWorkbench({ coaching }: { coaching: boolean }) {
  const s = useGame();
  const [talentTreeOpen, setTalentTreeOpen] = useState(false);
  const [shopOverviewOpen, setShopOverviewOpen] = useState(false);
  const liquidity = selectors.liquidity(s);
  const band = selectors.liquidityBand(s);

  const alerts: { key: string; title: string; detail: string; tone: string; Icon: typeof IconWarning }[] =
    [];
  const shopOpen = isShopOpen(s.market.day);

  if (!shopOpen) {
    /*
      "Dükkân kapalı" cümlesini alttaki Karar Dock'u söylüyor ("Dükkân ve
      müşteri akışı kapalı"); burada TEKRARLAMAYIZ. Bu satırın işi, kapalı
      günün ne getirdiğini söylemek: piyasa da donuk, ama gün boş değil —
      stok, atölye ve toptancı açık.
    */
    alerts.push({
      key: 'closed',
      title: `${weekdayLabel(s.market.day)} · piyasa da kapalı`,
      detail: 'Fiyat cuma kapanışında donuk. Stok, atölye ve toptancı açık.',
      tone: 'warning',
      Icon: IconClock,
    });
  }

  /*
    B1 — CUMARTESİ RİSKİ OYUNCUNUN BAKTIĞI YERDE YAZMIYORDU.

    Hafta sonu boşluğu mekaniğinin bütün amacı, cuma kapanışıyla pazartesi
    açılışı arasında körlemesine alım yapmanın riskini yaşatmak. Alan katmanı
    bu günü adıyla tanıyor — `isBlindTradingDay` — ama bu yordam PROJEDE HİÇ
    ÇAĞRILMIYORDU: mekanik işliyor, oyuncuya görünmüyordu. Tek işaret üst
    şeritteki "Cmt · Piyasa Kapalı" damgasıydı; bugün alınan malın pazartesiye
    kadar fiyat riski taşıdığını hiçbir yer söylemiyordu.

    Yukarıdaki "kapalı gün" uyarısı dükkânın KAPALI olduğu günü anlatır
    (pazar); burası dükkânın AÇIK, piyasanın kapalı olduğu gündür. İkisi aynı
    anda çıkmaz.
  */
  if (isBlindTradingDay(s.market.day)) {
    alerts.push({
      key: 'blind',
      title: `${weekdayLabel(s.market.day)} · piyasa kapalı, dükkân açık`,
      detail: `Fiyat cuma kapanışında donuk. Bugün aldığın mal ${weekdayLabel(nextMarketOpenDay(s.market.day))} açılışına kadar fiyat riski taşır.`,
      tone: 'warning',
      Icon: IconClock,
    });
  }

  if (s.market.activeEvent) {
    alerts.push({
      key: 'event',
      title: s.market.activeEvent.label,
      detail: s.market.activeEvent.description,
      tone: 'warning',
      Icon: IconWarning,
    });
  }

  if (band === 'red' || band === 'caution') {
    alerts.push({
      key: 'liquidity',
      title: `${TERM.liquidity} ${pct(liquidity)}`,
      detail:
        band === 'red'
          ? 'Büyük alış öncesi hızlı likidasyon gerekebilir.'
          : 'İşlem yapılabilir ama tedarik ve büyük müşteri riski yükseliyor.',
      tone: band === 'red' ? 'negative' : 'warning',
      Icon: IconLiquidity,
    });
  }

  const nextIn = Math.max(0, Math.round(s.nextCustomerAtMinutes - s.market.clockMinutes));
  if (shopOpen && alerts.length < 3 && s.queue.length === 0) {
    alerts.push({
      key: 'schedule',
      title: `Sonraki müşteri ~${nextIn} dk`,
      detail: `Dükkan ${clock(DAY.closeMinutes)}'da kapanıyor.`,
      tone: 'positive',
      Icon: IconClock,
    });
  }

  const position = selectors.position(s);
  const metalShare = Math.round(position.metalShare * 100);
  const stockCount = s.inventory.length;

  return (
    <div className={`idle ${coaching ? 'idle--coaching' : ''} ${s.queue.length > 0 ? 'idle--hasQueue' : ''}`}>
      {/*
        Dükkanın kimlik görseli, başlıkla AYNI SATIRDA.
        Bu ekranın "çok yer kapladığı" daha önce bildirilmişti; görsel bu
        yüzden yeni bir blok açmaz, zaten var olan iki metin satırının
        yüksekliğine (64 px) oturur ve toplam yüksekliği artırmaz.
      */}
      {/*
        POZİSYON PANELİ.

        Ana ekranda yalnız NAKİT yazıyordu. Sarrafın müşteri tezgâhtayken
        sorduğu soru ise "kaç param, kaç malım var, hangisi ağır" — kararın
        yarısı budur ve oyuncu bunu görmek için ekranı terk etmek zorundaydı.
        Panel boş bekleme alanında yaşar (zaten oranın çoğu boştu) ve tek
        dokunuşla Stok ekranına götürür.

        Gizli gerçek sızmaz (GDD 6.6): buradaki hiçbir sayı tek bir ürünün
        gerçeğini açmaz; hepsi zaten oyuncunun kendi stoğunun toplamıdır.
      */}
      <section className="shopOverview" aria-label="Dükkan kimliği ve mali durum">
        <button
          type="button"
          className="idle__head shopOverview__toggle"
          onClick={() => setShopOverviewOpen((open) => !open)}
          aria-expanded={shopOverviewOpen}
          aria-controls="shop-overview-details"
        >
          <Art
            art={NAV_ART.shop}
            size={56}
            decorative
            className="idle__art art--onDark"
            fallback={null}
          />
          <div className="idle__headText">
            <h2 className="idle__title">
              {shopDisplayName(s.profile.jewelerName)}
              {s.playerMarket.equipped.shopBadge && <span className="idle__badge" title="Market profil rozeti">◆</span>}
            </h2>
            <p className="idle__sub">
              {shopOverviewOpen
                ? `Gün ${s.market.day} · ${weekdayLabel(s.market.day)} · Semt itibarı ${Math.round(s.store.reputation)}`
                : 'Dükkan ve finans özetini göster'}
            </p>
          </div>
          <span className={`shopOverview__chevron ${shopOverviewOpen ? 'shopOverview__chevron--open' : ''}`} aria-hidden="true">⌄</span>
        </button>

        {shopOverviewOpen ? <div className="shopOverview__details" id="shop-overview-details">
          <button type="button" className="shopTalentButton" onClick={() => setTalentTreeOpen(true)}>
            <span><IconBusiness size={18} /> Yetenek Ağacı</span>
            <small>Ayar %{Math.round(s.skillProgress.assayAccuracyRank === 0 ? 60 : 60 + s.skillProgress.assayAccuracyRank * 10)} · Tatlı Dil {s.skillProgress.tatliDilLevel}/3</small>
            <span aria-hidden="true">›</span>
          </button>

          <button type="button" className="position" onClick={() => s.setTab('stock')}>
          <span className="position__cell">
            <span className="position__icon" aria-hidden="true"><IconCash size={15} /></span>
            <span className="position__copy">
              <span className="position__label">Nakit</span>
              <span className="position__value num">{tl(s.store.cash)}</span>
            </span>
          </span>
          <span className="position__cell">
            <span className="position__icon" aria-hidden="true"><IconCollection size={15} /></span>
            <span className="position__copy">
              <span className="position__label">Stok Değeri</span>
              <span className="position__value num">{tl(position.metalValue)}</span>
            </span>
          </span>
          <span className="position__cell">
            <span className="position__icon" aria-hidden="true"><IconStock size={15} /></span>
            <span className="position__copy">
              <span className="position__label">Stok</span>
              <span className="position__value num">
                {stockCount === 0 ? 'Stok yok' : `${stockCount} ürün`}
              </span>
            </span>
          </span>

          {/* Nakit–altın dengesi tek çubukta; sarrafın asıl gerilimi bu. */}
          <span className="position__bar" aria-hidden="true">
            <span className="position__barFill" style={{ width: `${metalShare}%` }} />
          </span>
          <span className="position__legend">
            Altın %{metalShare} · Nakit %{100 - metalShare}
            <span className="position__go">Stok ›</span>
          </span>
          </button>
        </div> : null}
      </section>

      {!s.inventory.some(p => {
        const item = s.items[p.itemId];
        return item && p.quantity > 0 && (p.location === 'backStock' || p.location === 'display') && RETAIL_BULLION_CATALOG.includes(item.templateId) && (!poolForTemplate(item.templateId) || !!poolForItem(item));
      }) && showcaseStock(s.inventory, s.items).length === 0 && (
        <div className="alert">
          <span>Satacak ürünün yok. Satış yapabilmek için önce stok oluştur.</span>
          <button type="button" className="chip" onClick={s.openStockCatalog}>İlk Stoğunu Al</button>
        </div>
      )}
      {s.queue.length > 0 && <WaitingCustomerQueue />}

      <div className="alerts">
        {alerts.slice(0, 3).map(({ key, title, detail, tone, Icon }) => (
          <div key={key} className={`alert alert--${tone}`}>
            <span className="alert__icon">
              <Icon size={16} />
            </span>
            <span className="alert__body">
              <span className="alert__title">{title}</span>
              <span className="alert__detail"> · {detail}</span>
            </span>
          </div>
        ))}
      </div>

      {/*
       * GDD 23.10.1 — "Müşteri yokken Karar Dock'unda ana akışı bozmayan
       * ikincil 'Dükkânı Canlandır' rewarded CTA'sı gösterilebilir."
       * Ayrı banner veya büyük reklam kartı kullanılmaz.
       *
       * DÜKKÂN KAPALIYKEN GÖSTERİLMEZ. Pazar günü müşteri akışı zaten yok;
       * "geliş aralığını kısaltan" bir düğme o gün hiçbir şey yapmaz. Karar
       * Dock'u "Dükkân ve müşteri akışı kapalı" derken çalışmayan bir çağrıyı
       * ekranda tutmak oyuncunun ekrana duyduğu güveni yer (tarayıcıda
       * görüldü: pazar günü düğme yerinde duruyordu).
       */}
      {shopOpen && s.queue.length === 0 && (
        <button type="button" className="rewardedLine" onClick={s.triggerCustomerRush}>
          <IconVideo size={13} />
          Dükkânı Canlandır
        </button>
      )}

      {talentTreeOpen ? (
        <div className="talentTreeScrim" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setTalentTreeOpen(false); }}>
          <section className="talentTreeSheet" role="dialog" aria-modal="true" aria-labelledby="shop-talent-title">
            <header className="talentTreeSheet__head">
              <div><span>Uzmanlık</span><h2 id="shop-talent-title">Yetenek Ağacı</h2></div>
              <button type="button" onClick={() => setTalentTreeOpen(false)} aria-label="Yetenek ağacını kapat">×</button>
            </header>
            <div className="talentTreeSheet__scroll"><TalentTreePanel /></div>
            <button type="button" className="talentTreeSheet__done" onClick={() => setTalentTreeOpen(false)}>Dükkana Dön</button>
          </section>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Bekleme kuyruğu mevcut FIFO davranışını görünür kılar. Karşılama eylemi
 * yalnız alttaki karar alanında bulunur; kartlar müşteri bilgisini taşır.
 */
function WaitingCustomerQueue() {
  const queue = useGame((s) => s.queue);
  const capacity = useGame((s) => queueCapacity(s.store));
  const [expanded, setExpanded] = useState(false);
  const visibleQueue = expanded ? queue : queue.slice(0, 1);

  return (
    <section className="waitingQueue" aria-labelledby="waiting-queue-title">
      <button
        type="button"
        className="waitingQueue__head"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        aria-controls="waiting-customer-list"
      >
        <span className="waitingQueue__heading">
          <strong id="waiting-queue-title">Bekleyen Müşteriler</strong>
          <small>{expanded ? 'Kuyruğu daralt' : queue.length > 1 ? `${queue.length - 1} müşteriyi daha göster` : 'Sıradaki müşteri'}</small>
        </span>
        <span className="waitingQueue__count">
          {queue.length}/{capacity}
          <span className={`waitingQueue__chevron ${expanded ? 'waitingQueue__chevron--open' : ''}`} aria-hidden="true">⌄</span>
        </span>
      </button>

      <div className="waitingQueue__list" id="waiting-customer-list">
        {visibleQueue.map(({ customer, items }, index) => {
          const archetype = getArchetype(customer.archetype);
          const isNext = index === 0;

          return (
            <article
              key={customer.id}
              className={`waitingCustomer ${isNext ? 'waitingCustomer--next' : ''}`}
            >
              <Art
                art={customerArt(customer.displayName)}
                size={42}
                decorative
                className="waitingCustomer__avatar art--portrait"
                fallback={<span className="waitingCustomer__initial">{customer.displayName[0]}</span>}
              />

              <div className="waitingCustomer__body">
                <div className="waitingCustomer__identity">
                  <strong>{customer.displayName}</strong>
                  <span>{isNext ? 'Şimdi' : `${index + 1}. sırada`}</span>
                </div>
                <p>{customerIntentLine(customer, items)}</p>
                <div className="waitingCustomer__meta">
                  <span>{archetype.demeanor}</span>
                  <span>Bekliyor</span>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Bağlamsal Araç Rayı — aşamaya göre içerik (GDD 23.11)
// ---------------------------------------------------------------------------

function ContextualToolRail({ liquidity }: { liquidity: number }) {
  const s = useGame();
  const deal = s.activeDeal;
  const line = deal ? activeLine(deal) : undefined;

  if (!deal || !line) {
    // Kuyruk doluyken boş araç rayının hiçbir eylemi yoktu; buna rağmen
    // 56 px yer ayırıp kısa/safe-area'lı telefonlarda ilk müşteri kartını
    // kesiyordu. Kuyruk kararın kendisidir. Müşteri karşılanınca aktif işlem
    // rayı aynı fiziksel konumunda yeniden görünür.
    if (s.queue.length > 0) return null;
    return <ToolRail items={[]} idle emptyLabel="Müşteri karşılandığında araçlar burada" />;
  }

  const railItem = s.items[line.itemId];

  // --- Müşteri alış akışı (GDD 23.23) ---
  // Ray aynı fiziksel konumda kalır. Alış akışında test aracı YOKTUR: ürün
  // oyuncunun kendi stoğudur, ölçülecek gizli gerçek yok. Rayın işi paketi
  // yönetmektir.
  if (deal.flow === 'purchase' && deal.purchase) {
    const purchase = deal.purchase;
    const locked = line.negotiation.offerHistory.length > 0;

    // Pazarlıkta ray fiyat dışı hamleleri taşır. "Gerekçe" burada YOKTUR:
    // GDD 11.5 gerekçeyi doğrulanmış test verisine bağlar, alış akışında ise
    // test yapılmaz. Elde olmayan bir kanıta dayanan buton koymak, kuralı
    // ekranda varmış gibi göstermek olurdu.
    if (deal.stage === 'negotiate') {
      const session = line.negotiation;
      const terminal = isTerminal(session.state);
      return (
        <ToolRail
          disabled={terminal}
          items={[
            {
              id: 'gesture',
              label: 'Jest',
              icon: <IconGesture size={19} />,
              used: session.gesturesUsed >= NEGOTIATION.maxEffectiveGestures,
              onPress: () => s.negotiationMove({ kind: 'gesture', atRound: session.round }),
            },
            {
              id: 'counter',
              label: 'Karşı Teklif',
              icon: <IconCounter size={19} />,
              // Müşteri son sözünü söylediyse bir daha karşı teklif istemek
              // anlamsız: cevap değişmez, yalnız sabır yakılır. Jestteki
              // "tükendi" işaretiyle aynı desen.
              used: session.state === 'FINAL_OFFER',
              onPress: () => s.negotiationMove({ kind: 'requestCounter', atRound: session.round }),
            },
          ]}
        />
      );
    }

    if (deal.stage === 'result') {
      return <ToolRail items={[]} disabled emptyLabel="İşlem kapandı" />;
    }

    return (
      <ToolRail
        items={[
          {
            id: 'clearPackage',
            label: 'Paketi boşalt',
            icon: <IconReject size={19} />,
            onPress: s.clearPackage,
            disabled: purchase.lines.length === 0 || locked,
          },
          {
            id: 'toPackage',
            label: 'Pakete bak',
            icon: <IconPackage size={19} />,
            onPress: () => s.setStage('package'),
            selected: deal.stage === 'package',
            disabled: purchase.lines.length === 0,
          },
        ]}
      />
    );
  }

  // --- Ekspertiz akışı (GDD 23.23 beşinci akış) ---
  // İncele ve Test adımlarında ray ticaret akışının test rayıdır — ölçüm
  // aracı akışa göre değişmez. Rapor ve Sonuç adımlarında ölçecek bir şey
  // kalmamıştır; ray boşalır ama yerinde durur (GDD 23.11).
  if (deal.flow === 'appraisal') {
    if (deal.stage === 'report') {
      return <ToolRail items={[]} disabled emptyLabel="Raporu Karar Dock'unda verin" />;
    }
    if (deal.stage === 'result') {
      return <ToolRail items={[]} disabled emptyLabel="Ekspertiz tamamlandı" />;
    }
    // inspect / test → aşağıdaki ortak test rayına düşer; ölçüm asıl olarak
    // "Test" adımında yapılır ama İncele'de de yasak değildir.
  }

  // --- Servis Kabul akışı (GDD 23.14) ---
  // Ray aynı fiziksel konumda kalır; içeriği adıma göre değişir (GDD 23.11).
  if (deal.flow === 'service' && deal.service) {
    const service = deal.service;

    switch (deal.stage) {
      // "Tanıla | Servis test/inceleme araçları; Devam."
      // Servis müşterisinde ürünün sorunu beyandan bellidir; ray tanılamayı
      // derinleştiren lup ile sınırlıdır — ticaret testleri burada anlamsızdır.
      case 'diagnose': {
        // §3 — lup da bir testtir ve ürün sınıfı whitelist'ine tabidir.
        // Ölçü/taş aracı almayan bir üründe rayda görünmemeli.
        const loupe = toolsForLevel(s.store.level).find(
          (t) => t.tool.id === 'loupe' && (!railItem || isToolRelevant(railItem, t.tool)),
        );
        if (!loupe) return <ToolRail items={[]} emptyLabel="İnceleme aracı yok" />;
        return (
          <ToolRail
            items={[
              {
                id: loupe.tool.id,
                label: loupe.tool.shortLabel,
                icon: <IconLoupe size={19} />,
                onPress: () => s.runTest(loupe.tool.id),
                used: line.testResults.some((r) => r.toolId === loupe.tool.id),
                locked: loupe.locked,
                lockReason: loupe.lockReason,
                onLockedPress: () =>
                  s.notify(`${loupe.tool.name}: ${loupe.lockReason}`, 'info'),
              },
            ]}
          />
        );
      }

      // "Teklif | Servis türleri; fiyat ve teslim tarihi."
      case 'quote': {
        const typeIds = service.diagnosis?.availableTypeIds ?? [];
        const items: RailItem[] = typeIds.map((typeId) => {
          const type = getServiceType(typeId);
          return {
            id: typeId,
            label: type.shortLabel,
            icon: <IconWorkshop size={19} />,
            onPress: () => s.selectServiceType(typeId),
            selected: service.selectedTypeId === typeId,
          };
        });
        return <ToolRail items={items} emptyLabel="Uygulanabilir servis yok" />;
      }

      // "Söz | İşi Kabul Et / Reddet." — bu iki aksiyon Dock'ta yaşar.
      case 'promise':
        return <ToolRail items={[]} disabled emptyLabel="Teslim sözünü Karar Dock'unda ver" />;

      // "Kuyruk | Atölyeye Gönder; sonuç Atölye ekranında takip edilir."
      default:
        return <ToolRail items={[]} disabled emptyLabel="İş emri oluşturuldu" />;
    }
  }

  switch (deal.stage) {
    // İncele → test araçları. İlk 4 görünür; fazlası yatay scroll.
    //
    // Ekspertiz akışının "Test" adımı da BURAYA düşer (GDD 23.23): ölçüm
    // aracı akışa göre değişmez, yalnız adımın adı değişir. Kendi case'ini
    // açsaydık aynı rayı iki yerde tutmuş olurduk.
    case 'test':
    case 'inspect': {
      // İşlem Akışı Ara Düzeltmesi §3 — "Bir test ürün hakkında ANLAMLI YENİ
      // BİLGİ ÜRETMİYORSA varsayılan akışta gösterilmemeli." Gram altına taş
      // kontrolü, çeyreğe ölçü aracı bu filtreyle rayda hiç belirmez.
      const items: RailItem[] = toolsForLevel(s.store.level)
        .filter(({ tool }) => !railItem || isToolRelevant(railItem, tool))
        .map(({ tool, locked, lockReason }) => {
        const Icon = TOOL_ICON[tool.id] ?? IconScale;
        const used = line.testResults.some((r) => r.toolId === tool.id);
        return {
          id: tool.id,
          label: tool.shortLabel,
          icon: <Icon size={19} />,
          onPress: () => s.runTest(tool.id),
          used,
          locked,
          lockReason,
          // GDD 23.11 — "Locked araç görünüyorsa kilit nedeni kısa metinle
          // açıklanır." Dokunmatikte tooltip yoktur; nedeni toast ile söyle.
          onLockedPress: () => s.notify(`${tool.name}: ${lockReason}`, 'info'),
          disabled: used || tool.cost > s.store.cash,
          badge: tool.cost > 0 ? tl(tool.cost) : undefined,
          };
        });
      return <ToolRail items={items} />;
    }

    // Değerle → maksimum 3 eylem; ana veri zaten Workbench'te.
    case 'appraise': {
      const items: RailItem[] = [
        {
          id: 'more-test',
          label: 'Ek Test',
          icon: <IconTouchstone size={19} />,
          onPress: () => s.setStage('inspect'),
        },
        {
          id: 'market',
          label: 'Piyasa',
          icon: <IconLiquidity size={19} />,
          onPress: () => s.setTab('business'),
        },
        {
          id: 'thesis',
          label: TERM.thesisShort,
          icon: <IconPackage size={19} />,
          onPress: () => s.setStage('thesis'),
        },
      ];
      return <ToolRail items={items} />;
    }

    // Tez → yalnız ürün için rasyonel kanallar (domain filtreler).
    case 'thesis': {
      const items: RailItem[] = line.thesisOptions.map((option) => {
        const ChannelIcon = CHANNEL_RAIL_ICON[option.channel];
        return {
          id: option.channel,
          label: CHANNEL_RAIL_LABEL[option.channel],
          icon: <ChannelIcon size={19} />,
          onPress: () => s.selectThesis(option.channel),
          selected: line.selectedThesis === option.channel,
        };
      });
      return <ToolRail items={items} />;
    }

    // Pazarlık → maks 3 görünür; "Reddet" rayda DEĞİL, Dock'ta (GDD 23.11).
    case 'negotiate': {
      const session = line.negotiation;
      const terminal = isTerminal(session.state);

      // Gerekçe yalnız DOĞRULANMIŞ veriye dayanabilir (GDD 11.5).
      const evidence = findEvidence(line.knowledge, line.testResults);

      const items: RailItem[] = [
        {
          id: 'reason',
          label: 'Gerekçe',
          icon: <IconReason size={19} />,
          disabled: !evidence,
          used: evidence ? session.usedReasons.includes(`${evidence.field}:${evidence.toolId}`) : false,
          lockReason: 'Önce ilgili testi yapın',
          onPress: () =>
            evidence &&
            s.negotiationMove({
              kind: 'reason',
              reasonEvidence: evidence,
              atRound: session.round,
            }),
        },
        {
          id: 'gesture',
          label: 'Jest',
          icon: <IconGesture size={19} />,
          used: session.gesturesUsed >= NEGOTIATION.maxEffectiveGestures,
          onPress: () => s.negotiationMove({ kind: 'gesture', atRound: session.round }),
        },
        {
          id: 'counter',
          label: 'Karşı Teklif',
          icon: <IconCounter size={19} />,
          // Bkz. yukarısı: son teklifte karşı teklif istemek yalnız sabır yakar.
          used: session.state === 'FINAL_OFFER',
          onPress: () => s.negotiationMove({ kind: 'requestCounter', atRound: session.round }),
        },
      ];

      // Paket teklif yalnız en az 2 kalem yeterince değerlenmişse (GDD 23.13).
      const appraisedLines = deal.lines.filter((l) => l.band !== null).length;
      if (deal.lines.length > 1 && appraisedLines >= 2) {
        items.push({
          id: 'package',
          label: 'Paket',
          icon: <IconPackage size={19} />,
          onPress: () => s.negotiationMove({ kind: 'package', atRound: session.round }),
        });
      }

      return <ToolRail items={items} disabled={terminal} />;
    }

    // Sonuç → ray gizli/disabled (GDD 23.10.2).
    case 'result':
      return <ToolRail items={[]} disabled emptyLabel="İşlem tamamlandı" />;
  }

  void liquidity;
  return <ToolRail items={[]} />;
}

const CHANNEL_RAIL_ICON: Record<ExitChannel, typeof IconRetail> = {
  retail: IconRetail,
  wholesale: IconWholesale,
  melt: IconMelt,
  serviceResale: IconServiceResale,
  collection: IconCollection,
};

const CHANNEL_RAIL_LABEL: Record<ExitChannel, string> = {
  retail: 'Vitrin',
  wholesale: 'Toptan',
  melt: 'Erit',
  serviceResale: 'Servis',
  collection: 'Beklet',
};

/**
 * Pazarlıkta kullanılabilecek gerekçe kanıtı.
 * GDD 11.5 — yalnız gerçekten yapılmış ve yeterince kesinleşmiş test sayılır.
 */
function findEvidence(
  knowledge: { field: InfoField; certainty: number; testsApplied: string[] }[],
  results: { toolId: string; readout: string }[],
): { field: InfoField; toolId: string; claim: string } | null {
  for (const k of knowledge) {
    if (k.certainty < 0.6) continue;
    const toolId = k.testsApplied[k.testsApplied.length - 1];
    if (!toolId) continue;
    const result = results.find((r) => r.toolId === toolId);
    if (!result) continue;
    return { field: k.field, toolId, claim: result.readout };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Karar Dock'u — aşamaya göre etiket ve özet (GDD 23.12)
// ---------------------------------------------------------------------------

function ShopDock({
  offer,
  setOffer,
  bounds,
  liquidity,
}: {
  offer: Money;
  setOffer: (v: Money) => void;
  bounds: { min: Money; max: Money; step: Money };
  liquidity: number;
}) {
  const s = useGame();
  const deal = s.activeDeal;
  const line = deal ? activeLine(deal) : undefined;

  // --- IDLE ---
  if (!deal || !line) {
    const hasQueue = s.queue.length > 0;
    const shopOpen = isShopOpen(s.market.day);

    if (!shopOpen) {
      return (
        <DecisionDock
          idle
          summaryLabel={weekdayLabel(s.market.day)}
          summaryValue="Dükkân ve müşteri akışı kapalı"
          primary={{ label: 'Günü Bitir', onPress: s.requestDayClose }}
          secondary={[{ label: 'Stoka Bak', onPress: () => s.setTab('stock') }]}
        />
      );
    }

    return (
      <DecisionDock
        idle
        hideSummary
        summaryLabel="Kuyruk"
        summaryValue={hasQueue ? `${s.queue.length} müşteri bekliyor` : 'Müşteri bekleniyor'}
        primary={{
          label: hasQueue ? `Müşteriyi Karşıla · ${s.queue.length}` : 'Müşteri bekleniyor',
          onPress: s.greetCustomer,
          disabled: !hasQueue,
        }}
        secondary={[{ label: 'Günü Bitir', onPress: s.requestDayClose }]}
      />
    );
  }

  // --- Servis Kabul akışı Dock'u (GDD 23.14) ---
  if (deal.flow === 'service' && deal.service) {
    return <ServiceDock deal={deal} />;
  }

  // --- Ekspertiz akışı Dock'u (GDD 23.23 beşinci akış) ---
  if (deal.flow === 'appraisal' && deal.appraisal) {
    return <AppraisalDock deal={deal} line={line} />;
  }

  // --- Müşteri alış akışı Dock'u (GDD 23.23) ---
  if (deal.flow === 'purchase' && deal.purchase) {
    return (
      <PurchaseDock
        deal={deal}
        line={line}
        offer={offer}
        setOffer={setOffer}
        liquidity={liquidity}
      />
    );
  }

  const ceiling = effectiveCeiling(line.thesisOptions, line.selectedThesis);

  // İşlem Akışı §2 — akış politikası ürünün kendisinden türer.
  const dockItem = s.items[line.itemId];
  const policy = dockItem ? flowPolicy(dockItem) : null;

  switch (deal.stage) {
    // --- İNCELE: doğrulanan alan sayısı + risk ---
    case 'inspect': {
      const verified = line.knowledge.filter((k) => k.status === 'verified').length;
      const conflicting = line.knowledge.some((k) => k.status === 'conflicting');

      // İşlem Akışı §2/§4 — hızlı işlemde birincil eylem doğrudan fiyattır.
      // "Değerlemeye Geç" düğmesini zorunlu adım gibi bırakmak, kaldırılan
      // test zincirini arayüzde diriltmek olurdu.
      const fast = policy?.transactionClass === 'fast';

      return (
        <DecisionDock
          summaryLabel={policy ? CLASS_LABEL[policy.transactionClass] : 'Doğrulanan alan'}
          summaryValue={
            <>
              {verified}/{line.knowledge.length} alan
              {policy && <span style={{ color: 'var(--muted)' }}> · {policy.note}</span>}
              {conflicting && (
                <span style={{ color: 'var(--negative)' }}> · çelişkili sinyal</span>
              )}
            </>
          }
          primary={
            fast
              ? { label: 'Fiyata Geç', onPress: () => s.setStage('negotiate') }
              : { label: 'Değerlemeye Geç', onPress: () => s.setStage('appraise') }
          }
          /*
            "İLGİLENMİYORUM" — KAPIDAKİ MALI GERİ ÇEVİRME.

            Bu aşamada hiçbir çıkış yoktu: müşteriyi karşılayan oyuncu,
            değerleme ve pazarlığı geçmeden ondan kurtulamıyordu; reddetme
            yalnız pazarlık aşamasındaydı (tarayıcıda ölçüldü — birinci
            aşamanın düğmeleri: Terazi · Mihenk · Yoğunluk · Fiyata Geç ·
            Yine de değerle). Oysa bir sarraf kapıdaki malı görüp "bu bende
            olmaz" diyebilir; alış tarafında zaten "Müşteriyi Gönder" var.

            `finishDeal` akıştan bağımsız: ekonomiye dokunmaz, ziyareti
            deftere yazar ve itibar farkını uygular (GDD 10.2). Yani bedeli
            uydurmuyoruz — var olan ziyaret muhasebesi işliyor.
          */
          secondary={[
            ...(fast
              ? [{ label: 'Yine de değerle', onPress: () => s.setStage('appraise') }]
              : line.testResults.length === 0
                ? [{ label: 'Test yapmadan ilerle', onPress: () => s.setStage('appraise') }]
                : []),
            { label: 'İlgilenmiyorum', onPress: s.finishDeal, danger: true },
          ]}
        />
      );
    }

    // --- DEĞERLE: değer bandı + güven ---
    case 'appraise': {
      const band = line.band;
      /*
        GDD 23.10.2 — basit üründe Tez atlanabilir; riskli üründe görünür olmalı.

        Standart sarrafiye ('fast') doğrudan pazarlığa geçer: çeyreğin nereye
        satılacağı bellidir, araya bir seçim ekranı koymak boş bir adımdır.
        Diğer her üründe eski davranış korunur — tek kanal varsa seçtirecek
        bir şey zaten yoktur.

        ÖLÇÜT ŞERİTLE AYNI OLMAK ZORUNDA (bkz. `skipStages`, yukarıda):
        dock "Pazarlığa Geç" derken şeridin hâlâ "Çıkış Planı" adımını
        göstermesi oyuncuyu çelişkiye sokardı.

        Atlanan aşama KAPANMAZ: aşağıdaki ikincil eylemden hâlâ açılabilir.
        Zorunlu olmaktan çıkmak ile erişilemez olmak ayrı şeyler.
      */
      const skipThesis =
        policy?.transactionClass === 'fast' || line.thesisOptions.length < 2;

      return (
        <DecisionDock
          summaryLabel="Değer bandı"
          summaryValue={band ? `${tl(band.min)} – ${tl(band.max)}` : '—'}
          primary={{
            label: skipThesis ? 'Pazarlığa Geç' : `${TERM.thesis} Seç`,
            onPress: () => s.setStage(skipThesis ? 'negotiate' : 'thesis'),
          }}
          secondary={[
            { label: 'Ek test', onPress: () => s.setStage('inspect') },
            ...(skipThesis && line.thesisOptions.length > 0
              ? [{ label: `Yine de ${TERM.thesis.toLocaleLowerCase('tr')}`, onPress: () => s.setStage('thesis') }]
              : []),
          ]}
        />
      );
    }

    // --- TEZ: seçili kanalın net/süre/likidite özeti ---
    case 'thesis': {
      const selected = line.selectedThesis
        ? line.thesisOptions.find((o) => o.channel === line.selectedThesis)
        : null;

      return (
        <DecisionDock
          summaryLabel={selected ? `Seçili ${TERM.thesis.toLocaleLowerCase('tr')}` : `${TERM.thesis} seçilmedi`}
          summaryValue={
            selected
              ? `${selected.label} · net ${tl(selected.expectedNet)}`
              : 'Öneri ile devam edilecek'
          }
          primary={{ label: 'Pazarlığa Geç', onPress: () => s.setStage('negotiate') }}
        />
      );
    }

    // --- PAZARLIK: teklif + tahmini kâr/likidite/ilişki ---
    case 'negotiate': {
      const session = line.negotiation;
      const isFinal = session.state === 'FINAL_OFFER';
      const counter = session.finalOffer ?? session.activeCounter;

      const liquidityAfter = liquidityRatio(
        Math.max(0, s.store.cash - offer),
        [...s.inventory, { costBasis: offer } as never],
      );

      // GDD 23.12 — tahmini sonuçlar kesinlik iddiası taşımaz.
      const estimatedMargin = ceiling - offer;
      const impacts: OfferImpact[] = [
        {
          label: 'Tahmini',
          value: `${tlSigned(estimatedMargin)} ${tonWord(estimatedMargin)}`,
          tone: estimatedMargin >= 0 ? 'positive' : 'negative',
        },
        liquidityImpact(liquidity, liquidityAfter),
        {
          label: 'İlişki',
          value: relationLabel(offer, ceiling),
          tone: offer < ceiling * 0.75 ? 'warning' : 'neutral',
        },
      ];

      const canAfford = offer <= s.store.cash;

      return (
        <DecisionDock
          summaryLabel={isFinal ? 'Son teklif' : 'Teklifiniz'}
          summaryValue={
            isFinal && counter !== null
              ? `Müşteri: ${tl(counter)} — geri dönüş yok`
              : `Alış tavanı ${tl(ceiling)}`
          }
          primary={
            isFinal && counter !== null
              ? {
                  label: 'Kabul Et',
                  onPress: () => s.negotiationMove({ kind: 'acceptCounter', atRound: session.round }),
                  disabled: counter > s.store.cash,
                  disabledReason: counter > s.store.cash
                    ? `Minimum teklif ${tl(counter)} · mevcut nakit ${tl(s.store.cash)} · eksik ${tl(counter - s.store.cash)}`
                    : undefined,
                  icon: <IconSend size={18} />,
                }
              : {
                  label: 'Teklifi Gönder',
                  onPress: () => s.submitOffer(offer),
                  disabled: !canAfford || offer <= 0,
                  disabledReason: offer <= 0
                    ? 'Teklif tutarı sıfırdan büyük olmalı.'
                    : !canAfford
                      ? `Teklif ${tl(offer)} · mevcut nakit ${tl(s.store.cash)} · eksik ${tl(offer - s.store.cash)}`
                      : undefined,
                  icon: <IconSend size={18} />,
                }
          }
          secondary={[
            {
              label: 'Reddet',
              onPress: () => s.negotiationMove({ kind: 'reject', atRound: session.round }),
              danger: true,
              icon: <IconReject size={16} />,
            },
          ]}
        >
          {!isFinal && (
            <OfferControl
              value={offer}
              min={bounds.min}
              max={bounds.max}
              step={bounds.step}
              onChange={setOffer}
              impacts={impacts}
              disabled={isTerminal(session.state)}
              unitLabel={(() => {
                const item = s.items[line.itemId];
                return item ? offerUnitLabel([item], [1], offer) : null;
              })()}
            />
          )}
        </DecisionDock>
      );
    }

    // --- SONUÇ: "Devam Et"; uzun rapor İşlem Defteri'ne gider (GDD 23.10.2) ---
    case 'result': {
      const accepted = line.negotiation.state === 'ACCEPTED';
      const price = line.negotiation.settledPrice ?? 0;

      return (
        <DecisionDock
          summaryLabel={accepted ? 'Kapanış' : 'Sonuç'}
          summaryValue={accepted ? tl(price) : 'İşlem yapılmadı'}
          primary={{ label: 'Devam Et', onPress: s.finishDeal }}
        />
      );
    }
  }
}

/**
 * Servis Kabul akışının Karar Dock'u (GDD 23.14 "Araç Rayı / Dock" sütunu).
 *
 * Ana CTA her adımda AYNI fiziksel bölgede kalır; yalnız etiketi ve üstündeki
 * karar özeti değişir (GDD 23.12). Servis müşterisi teklif slider'ına
 * zorlanmaz — ücret tekliften gelir, karar süre/risk/söz üzerinedir.
 */
/**
 * MÜŞTERİ ALIŞ AKIŞI DOCK'U (GDD 23.23)
 *
 * GDD 6.6 — müşterinin ödeme tavanı hiçbir aşamada sayı olarak gösterilmez.
 * Dock'ta görünen tek referans oyuncunun KENDİ maliyeti ve kanal önerisidir;
 * müşterinin nereye kadar çıkacağı pazarlıkta öğrenilir.
 */
function PurchaseDock({
  deal,
  line,
  offer,
  setOffer,
  liquidity,
}: {
  deal: NonNullable<GameStateDeal>;
  line: DealLine;
  offer: Money;
  setOffer: (v: Money) => void;
  liquidity: number;
}) {
  const s = useGame();
  const purchase = deal.purchase;
  if (!purchase) return null;

  switch (deal.stage) {
    // --- STOK SEÇİMİ ---
    case 'stockPick': {
      const count = purchase.units;
      return (
        <DecisionDock
          summaryLabel="Pakette"
          summaryValue={
            count === 0
              ? 'Henüz ürün seçilmedi'
              : `${purchase.demand.poolId === '24K_GRAM_GOLD_POOL' ? preciseGrams(count) : purchase.demand.poolId === '22K_INVESTMENT_BANGLE_POOL' ? preciseGrams(count * 10) : `${count} adet`} · ${tl(purchase.packageFairValue)} adil değer`
          }
          primary={{
            label: 'Paketi Değerle',
            onPress: () => s.setStage('package'),
            disabled: count === 0,
          }}
          secondary={[{ label: 'Müşteriyi Gönder', onPress: s.finishDeal, danger: true }]}
        />
      );
    }

    // --- DEĞER / PAKET ---
    case 'package': {
      // §4.1 — kısmi karşılamayı kabul etmeyen müşteriye eksik paket sunulmaz.
      const ready = purchase.fulfilment !== 'none';
      return (
        <DecisionDock
          summaryLabel="Kanal önerisi"
          summaryValue={
            <>
              {tl(purchase.suggestedPrice)}
              <span style={{ color: 'var(--muted)' }}>
                {' '}· maliyet {tl(purchase.packageCost)}
              </span>
            </>
          }
          primary={{
            label: 'Pazarlığa Geç',
            onPress: () => {
              setOffer(purchaseStartingOffer(purchase));
              s.setStage('negotiate');
            },
            disabled: !ready,
          }}
          secondary={[
            { label: 'Paketi Düzenle', onPress: () => s.setStage('stockPick') },
            { label: 'Müşteriyi Gönder', onPress: s.finishDeal, danger: true },
          ]}
        />
      );
    }

    // --- PAZARLIK ---
    case 'negotiate': {
      const session = line.negotiation;
      const isFinal = session.state === 'FINAL_OFFER';
      const counter = session.finalOffer ?? session.activeCounter;

      // Satışta kâr HEMEN gerçekleşir (GDD 34.5): satış fiyatı eksi maliyet.
      const profit = offer - purchase.packageCost;
      const impacts: OfferImpact[] = [
        {
          label: 'Kâr',
          value: `${tlSigned(profit)} ${tonWord(profit)}`,
          tone: profit >= 0 ? 'positive' : 'negative',
        },
        liquidityImpact(liquidity, liquidity),
        {
          label: 'İlişki',
          value: saleRelationLabel(offer, purchase.packageFairValue),
          tone: offer > purchase.packageFairValue * 1.25 ? 'warning' : 'neutral',
        },
      ];

      const bounds = purchaseBounds(purchase);

      return (
        <DecisionDock
          summaryLabel={isFinal ? 'Son teklif' : 'İstediğiniz fiyat'}
          summaryValue={
            isFinal && counter !== null
              ? `Müşteri: ${tl(counter)} — geri dönüş yok`
              : `Adil değer ${tl(purchase.packageFairValue)}`
          }
          primary={{
            label: isFinal ? 'Son Teklifi Kabul Et' : 'Fiyatı Ver',
            onPress: () =>
              isFinal && counter !== null
                ? s.negotiationMove({ kind: 'acceptCounter', atRound: session.round })
                : s.submitOffer(offer),
            disabled: isTerminal(session.state) || offer <= 0,
            icon: <IconSend size={18} />,
          }}
          secondary={[
            {
              label: 'Vazgeç',
              onPress: () => s.negotiationMove({ kind: 'reject', atRound: session.round }),
              danger: true,
              icon: <IconReject size={16} />,
            },
          ]}
        >
          {!isFinal && (
            <>
              {profit < 0 && (
                <p className="dock__lossWarning" role="status">
                  Zararına satış · maliyetin {tl(Math.abs(profit))} altında
                </p>
              )}
              <OfferControl
                value={offer}
                onChange={setOffer}
                min={bounds.min}
                max={bounds.max}
                step={bounds.step}
                impacts={impacts}
                disabled={isTerminal(session.state)}
                unitLabel={offerUnitLabel(
                  purchase.lines.map((l) => s.items[l.itemId]).filter(Boolean) as ItemInstance[],
                  purchase.lines.filter((l) => s.items[l.itemId]).map((l) => l.quantity),
                  offer,
                )}
              />
            </>
          )}
        </DecisionDock>
      );
    }

    // --- SONUÇ ---
    default:
      return (
        <DecisionDock
          summaryLabel="Sonuç"
          summaryValue={
            line.negotiation.state === 'ACCEPTED'
              ? `Satıldı · ${tl(line.negotiation.settledPrice ?? 0)}`
              : 'Satış olmadı'
          }
          primary={{ label: 'Sonraki Müşteri', onPress: s.finishDeal }}
        />
      );
  }
}

/**
 * Satış slider'ının aralığı: maliyetin altından adil değerin belirgin
 * üstüne. Oyuncu zararına da satabilir — sistem "şu fiyattan sat" demez
 * (GDD 6.6), yalnız sonucunu gösterir.
 */
function purchaseBounds(purchase: NonNullable<GameStateDeal>['purchase']) {
  const fair = purchase?.packageFairValue ?? 0;
  const cost = purchase?.packageCost ?? 0;
  const min = Math.max(0, Math.round(Math.min(cost, fair) * 0.6));
  const max = Math.max(min + 1000, Math.round(fair * 1.6));
  const span = max - min;
  return { min, max, step: span > 200_000 ? 500 : span > 40_000 ? 100 : 50 };
}

/** Ekranda görülen, kâr hesabında kullanılan ve gönderilen ilk fiyat TEK değer. */
function purchaseStartingOffer(purchase: NonNullable<GameStateDeal>['purchase']): Money {
  if (!purchase) return 0;
  const bounds = purchaseBounds(purchase);
  return snapOffer(purchase.suggestedPrice, bounds.min, bounds.max, bounds.step);
}

/** Satışta ilişki etiketi: fiyat adil değerin ne kadar üstünde (GDD 23.12). */
function saleRelationLabel(price: Money, fair: Money): string {
  if (fair <= 0) return 'nötr';
  const ratio = price / fair;
  if (ratio <= 1.08) return 'olumlu';
  if (ratio <= 1.28) return 'nötr';
  return 'riskli';
}

function ServiceDock({ deal }: { deal: NonNullable<GameStateDeal> }) {
  const s = useGame();
  const service = deal.service;
  if (!service) return null;

  const quote = findQuote(service.quotes, service.selectedTypeId, service.selectedVenue);

  switch (deal.stage) {
    // --- TANILA: sorun + ulaşılabilir kondisyon ---
    case 'diagnose': {
      const count = service.diagnosis?.availableTypeIds.length ?? 0;
      return (
        <DecisionDock
          summaryLabel="Tanı"
          summaryValue={
            count > 0 ? `${count} servis türü uygulanabilir` : 'Uygun servis bulunamadı'
          }
          primary={{
            label: 'Teklif Hazırla',
            onPress: () => s.setStage('quote'),
            disabled: count === 0,
          }}
          secondary={[{ label: 'İşi Reddet', onPress: s.declineServiceJob, danger: true }]}
        />
      );
    }

    // --- TEKLİF: seçili türün ücreti + süresi + riski ---
    case 'quote':
      return (
        <DecisionDock
          summaryLabel={quote ? 'Seçili teklif' : 'Servis türü seçilmedi'}
          summaryValue={
            quote
              ? `${tl(quote.fee)} · ${quote.durationDays} gün · risk ${pct(quote.risk)}`
              : 'Raydan bir tür seçin'
          }
          primary={{
            label: 'Teslim Sözü Ver',
            onPress: () => s.setStage('promise'),
            disabled: !quote || quote.blockedReason !== null,
          }}
          secondary={[{ label: 'İşi Reddet', onPress: s.declineServiceJob, danger: true }]}
        />
      );

    // --- SÖZ: "İşi Kabul Et / Reddet" (GDD 23.14) ---
    case 'promise': {
      if (!quote) return null;
      const promised = expectedCompletionDay(quote, s.market.day) + service.promiseBufferDays;
      const affordable = quote.partsCost <= s.store.cash;

      return (
        <DecisionDock
          summaryLabel="Kabul"
          summaryValue={
            <>
              {promised}. gün teslim · {tl(quote.fee)} ücret
              {quote.partsCost > 0 && (
                <span style={{ color: 'var(--negative)' }}>
                  {' '}· bugün {tl(quote.partsCost)} parça
                </span>
              )}
            </>
          }
          primary={{
            label: 'İşi Kabul Et',
            onPress: s.acceptServiceJob,
            disabled: !affordable,
            icon: <IconWorkshop size={18} />,
          }}
          secondary={[{ label: 'Reddet', onPress: s.declineServiceJob, danger: true }]}
        />
      );
    }

    // --- KUYRUK: "Atölyeye Gönder" ---
    default: {
      const accepted = service.outcome === 'accepted';
      return (
        <DecisionDock
          summaryLabel={accepted ? 'İş emri' : 'Sonuç'}
          summaryValue={accepted ? 'Atölye kuyruğuna eklendi' : 'İş kabul edilmedi'}
          primary={{ label: 'Devam Et', onPress: s.finishDeal }}
          secondary={
            accepted
              ? [
                  {
                    label: 'Atölyeyi Aç',
                    // İşlemi kapat, sonra sekmeyi değiştir: aksi hâlde oyuncu
                    // Dükkan'a döndüğünde kapanmış bir iş emrinde kalırdı.
                    onPress: () => {
                      s.finishDeal();
                      s.setTab('workshop');
                    },
                  },
                ]
              : []
          }
        />
      );
    }
  }
}

/**
 * Ekspertiz Dock'u (GDD 23.23 · İncele → Test → Rapor/Ücret → Sonuç).
 *
 * Ticaret Dock'undan farkı: burada TEKLİF SLIDER'I YOKTUR. Pazarlık edilecek
 * bir mal yok; oyuncunun verdiği tek rakam kendi ücretidir ve o da Rapor
 * ekranında belirlenir. Dock yalnız adımlar arasında ilerletir ve raporu
 * verir.
 */
function AppraisalDock({
  deal,
  line,
}: {
  deal: NonNullable<GameStateDeal>;
  line: DealLine;
}) {
  const s = useGame();
  const appraisal = deal.appraisal;
  if (!appraisal) return null;

  const tests = line.testResults.length;

  switch (deal.stage) {
    // --- İNCELE: ölçüme geç ---
    case 'inspect':
      return (
        <DecisionDock
          summaryLabel="Ekspertiz"
          summaryValue={
            tests > 0 ? `${tests} test yapıldı` : 'Henüz ölçüm yok — raydan araç seçin'
          }
          primary={{ label: 'Ölçüme Geç', onPress: () => s.setStage('test') }}
          secondary={[{ label: 'İşi Reddet', onPress: s.declineAppraisal, danger: true }]}
        />
      );

    // --- TEST: band ne kadar daraldı ---
    case 'test': {
      const band = line.band;
      return (
        <DecisionDock
          summaryLabel="Ölçülen aralık"
          summaryValue={
            band
              ? `${tl(band.min)} – ${tl(band.max)} · ${CONFIDENCE_LABEL[band.confidence]}`
              : 'Değerleme bandı yok'
          }
          primary={{
            label: 'Rapor Yaz',
            onPress: () => s.setStage('report'),
            disabled: !band,
          }}
          secondary={[{ label: 'İşi Reddet', onPress: s.declineAppraisal, danger: true }]}
        />
      );
    }

    // --- RAPOR/ÜCRET: raporu ver ---
    case 'report': {
      const ready = appraisal.stance !== null;
      return (
        <DecisionDock
          summaryLabel={ready ? 'Rapor' : 'Duruş seçilmedi'}
          summaryValue={
            ready
              ? `${getStance(appraisal.stance!).label} · ${tl(appraisal.fee)} ücret`
              : 'Yukarıdan bir rapor duruşu seçin'
          }
          primary={{
            label: 'Raporu Ver',
            onPress: s.issueReport,
            disabled: !ready,
            icon: <IconLoupe size={18} />,
          }}
          secondary={[{ label: 'İşi Reddet', onPress: s.declineAppraisal, danger: true }]}
        />
      );
    }

    // --- SONUÇ ---
    default: {
      const v = appraisal.verdict;
      return (
        <DecisionDock
          summaryLabel="Sonuç"
          summaryValue={
            appraisal.outcome === 'declined'
              ? 'Ekspertiz yapılmadı'
              : v
                ? v.paid
                  ? `${tl(v.fee)} ücret alındı`
                  : 'Ücret ödenmedi'
                : '—'
          }
          primary={{ label: 'Devam Et', onPress: s.finishDeal }}
        />
      );
    }
  }
}

type GameStateDeal = ReturnType<typeof useGame.getState>['activeDeal'];

/**
 * §2 — teklif ekranının piyasa referansı.
 *
 * Yalnız SARRAFİYEDE gösterilir: işçilikli üründe "tipik alış fiyatı" diye
 * bir şey yoktur, değer işçilik ve taşla birlikte değişir. Orada referans
 * uydurmak, olmayan bir kesinlik göstermek olurdu.
 */
function buildReference(item: ItemInstance | undefined, market: MarketState, offer: Money) {
  if (!item || !isBullion(item.templateId)) return null;

  const base = bullionUnitValue(item, market);
  const pieceReference = marketReferenceBuy(item, market, base, 1);
  const view = unitPriceView(item, pieceReference);
  const offerView = unitPriceView(item, offer);

  // Gram bazlı üründe birim fiyat gramadır; toplam ayrıca yazılır.
  // Adet bazlı üründe birim fiyat zaten toplamdır, satır tekrar olurdu.
  const showTotal = view.perGram && view.gramsPerPiece > 1;

  return {
    direction: 'shopBuys' as const,
    unitReference: view.unitPrice,
    unitOffer: offerView.unitPrice,
    unit: view.unit,
    showTotal,
    totalLabel: showTotal
      ? `${grams(view.gramsPerPiece)} × ${tlBare(offerView.unitPrice)} ${moneyUnit('g')}`
      : '',
    totalReference: pieceReference,
    totalOffer: offer,
  };
}

/**
 * Alış akışının piyasa referansı — dükkân SATARKEN.
 *
 * Neden ayrı bir fonksiyon: burada pazarlık tek bir kaleme değil bir PAKETE
 * dönüyor. Paket birden çok satır ve adet taşıyabilir, bu yüzden referans
 * satır satır toplanır.
 *
 * İKİ DÜRÜSTLÜK SINIRI:
 *   · Pakette sarrafiye olmayan tek bir kalem varsa referans HİÇ
 *     gösterilmez. İşçilikli üründe "tipik satış fiyatı" diye bir şey yok;
 *     uydurmak olmayan bir kesinlik göstermek olurdu (buildReference'ın
 *     aynı kuralı).
 *   · Birim fiyat yalnız paket TEK ÜRÜNDEN oluşuyorsa yazılır. Karışık bir
 *     pakette "birim fiyat" hangi ürünün olduğu belirsiz bir sayıdır.
 */
function buildPackageReference(
  purchase: PurchaseSession,
  items: Record<string, ItemInstance>,
  market: MarketState,
  offer: Money,
) {
  if (purchase.lines.length === 0) return null;

  const templateIds = new Set<string>();
  let totalReference = 0;
  let units = 0;

  for (const line of purchase.lines) {
    const item = items[line.itemId];
    if (!item || !isBullion(item.templateId)) return null;
    templateIds.add(item.templateId);

    const base = bullionUnitValue(item, market);
    totalReference += marketReferenceSell(item, market, base, line.quantity) * line.quantity;
    units += line.quantity;
  }

  if (totalReference <= 0 || units <= 0) return null;

  // Tek üründen oluşan pakette birim fiyat anlamlıdır; karışıkta değildir.
  const single =
    templateIds.size === 1 ? items[purchase.lines[0]!.itemId] : undefined;

  if (single) {
    const refView = unitPriceView(single, Math.round(totalReference / units));
    const offerView = unitPriceView(single, Math.round(offer / units));
    const showTotal = units > 1 || (refView.perGram && refView.gramsPerPiece > 1);
    const amountLabel = refView.perGram
      ? `${(units * refView.gramsPerPiece).toLocaleString('tr-TR')} g`
      : `${units} adet`;

    return {
      direction: 'shopSells' as const,
      unitReference: refView.unitPrice,
      unitOffer: offerView.unitPrice,
      unit: refView.unit,
      showTotal,
      totalLabel: `${amountLabel} · ${t('piyasa')} ${tl(Math.round(totalReference))}`,
      totalReference: Math.round(totalReference),
      totalOffer: offer,
    };
  }

  // Karışık paket: yalnız toplam konuşur.
  return {
    direction: 'shopSells' as const,
    unitReference: Math.round(totalReference),
    unitOffer: offer,
    unit: moneyUnit(),
    showTotal: false,
    totalLabel: '',
    totalReference: Math.round(totalReference),
    totalOffer: offer,
  };
}

/** Kabul edilirse likidite nereye düşer — "%19 → %12" (GDD 23.12). */
function liquidityPreview(s: ReturnType<typeof useGame.getState>, price: Money): string {
  const before = liquidityRatio(s.store.cash, s.inventory);
  const after = liquidityRatio(
    Math.max(0, s.store.cash - price),
    [...s.inventory, { costBasis: price } as never],
  );
  return `${pct(before)} → ${pct(after)}`;
}

/**
 * Satış tarafında likidite TERS yönde hareket eder: mal çıkar, nakit girer.
 * Alış önizlemesini yeniden kullanmak "%19 → %12" gibi yanlış bir yön
 * gösterirdi — oyuncu kararını bu sayıya bakarak veriyor.
 */
function salePreview(
  s: ReturnType<typeof useGame.getState>,
  price: Money,
  costBasis: Money,
): string {
  const before = liquidityRatio(s.store.cash, s.inventory);
  const after = liquidityRatio(s.store.cash + price, [
    { costBasis: -costBasis } as never,
    ...s.inventory,
  ]);
  return `${pct(before)} → ${pct(after)}`;
}

/** İlişki etkisi etiketi — sayısal skor değil, okunabilir durum (GDD 23.12). */
function relationLabel(offer: Money, ceiling: Money): string {
  if (ceiling <= 0) return 'nötr';
  const ratio = offer / ceiling;
  if (ratio >= 0.95) return 'olumlu';
  if (ratio >= 0.8) return 'nötr';
  return 'riskli';
}
