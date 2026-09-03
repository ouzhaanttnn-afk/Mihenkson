/**
 * İŞLETME ekranı (GDD 23.19) + Piyasa ikincil rotası (GDD 23.16)
 *
 * GDD 23.19: "İşletme ekranı ana yönetim merkezi ve ikincil rotaların
 * başlangıcıdır. BÜYÜK KARTLAR YERİNE kısa özet satırları ve menü grupları
 * kullanılır." · "Ana Dükkan ekranındaki kasa/itibar bilgisini dev kartlarla
 * tekrar etmez; özet + detay rotası verir."
 *
 * GDD 23.9.1: Piyasa, Toptancı Hesabı, Kariyer ve İşlem Defteri buradan ve
 * piyasa şeridinden açılan ikincil rotalardır — alt navigasyona eklenmez.
 */

import { t } from '@i18n/index';
import { TERM } from '@ui/terms';
import { useEffect, useState } from 'react';
import { customerDensity } from '@domain/customer-traffic';
import { PERSONNEL_MONTHLY, PERSONNEL_SALARIES, PERSONNEL_UNLOCK_LEVELS, canSetPersonnel, personnelCount, personnelDaily, queueCapacity } from '@domain/v5-rules';

import { MARKET_REGIME, WHOLESALE } from '@domain/balance';
import { DEFAULT_JEWELER_NAME, SHOP_SUFFIX, shopDisplayName } from '@domain/profile';
import {
  LIQUIDITY_BAND_LABEL,
  liquidityBand,
  liquidityRatio,
  summarizeWealth,
} from '@domain/settlement';
import { marketSignals } from '@domain/overnight';
import { registrySummary } from '@domain/customer-memory';
import { evaluateUpgrade, growthSnapshot } from '@domain/store-growth';
import { intentAlarm } from '@domain/intent';
import { bullionMeta } from '@data/bullion';
import { TEST_TOOLS } from '@data/tools';
import { spawnItem } from '@domain/item-spawn';
import { readSaveSummary } from '@state/save';
import {
  creditLimit,
  creditTermDays,
  financeRate,
  financeTerms,
  affordableQuantity,
  supplyOffer,
  usedLimit,
} from '@domain/wholesaler';
import {
  buysBullion,
  memberFeeRate,
  networkDebt,
  networkDebtCeiling,
  networkLiquidationOffer,
  networkLoanOffer,
} from '@domain/trade-network';
import type { ItemInstance, TradeNetworkMember } from '@domain/types';
import { selectors, useGame } from '@state/gameStore';

import {
  IconBusiness,
  IconCash,
  IconChevronRight,
  IconLiquidity,
  IconReason,
  IconTrust,
  IconWholesale,
} from '@ui/icons';
import { Art } from '@ui/Art';
import { NAV_ART, merchantArt } from '@ui/assets';
import { clock, moneyUnit, multiplier, pct, pctChange, price, priceRawTl, tl, tlSigned } from '@ui/format';
import { TalentTreePanel } from './TalentTreePanel';
import { WholesalerLiquidationList } from './WholesalerLiquidation';

type Route = 'root' | 'market' | 'journal' | 'wholesaler' | 'network' | 'store' | 'career' | 'save';

/**
 * Varlık satırının birim etiketi — KAYITTAN DEĞİL, o an hesaplanır.
 *
 * `MarketAsset.unit` piyasa kurulurken yazılıp kayda giriyor; para birimini
 * sonradan değiştiren oyuncuda o dize eski hâliyle kalırdı (sayı dolar,
 * etiket TL). Etiket burada, çizim anında türetiliyor.
 *
 * DÖVİZ SATIRLARI HER ZAMAN ₺ KALIR. Bir kur panosu yabancı parayı YEREL
 * parayla kote eder; dolar seçiliyken "Dolar · 1,00 $" yazmak teknik olarak
 * doğru ama bilgi olarak boştur. Sarrafın panosunda dolar TL ile yazar.
 */
function assetUnitLabel(asset: { id: string }): string {
  if (isFxRow(asset.id)) return '₺';
  return asset.id === 'goldGram' || asset.id === 'silverGram' ? moneyUnit('g') : moneyUnit();
}

/** Kur satırı mı — değeri de etiketi de TL kalır (bkz. `assetUnitLabel`). */
function isFxRow(id: string): boolean {
  return id === 'usd' || id === 'eur';
}

/** Kur satırında ham TL, diğerlerinde etkin para birimi. */
function assetPrice(asset: { id: string }, value: number): string {
  return isFxRow(asset.id) ? priceRawTl(value) : price(value);
}

export function BusinessScreen() {
  const [route, setRoute] = useState<Route>('root');

  /*
    ALT NAVİGASYONDAKİ "İŞLETME"YE TEKRAR DOKUNMAK KÖKE DÖNDÜRÜR.

    Rota bu bileşenin kendi state'inde durduğu için, alt rotadayken alt
    navigasyona basmak hiçbir şey yapmıyordu: `setTab('business')` çağrılıyor
    ama sekme zaten 'business' olduğundan durum değişmiyor, bileşen yeniden
    çizilmiyordu. Oyuncunun tek çıkışı "← İşletme" bağlantısıydı.

    `tabHomeSignal` her "aynı sekmeye tekrar dokunuldu" olayında artar; bu
    effect onu izleyip rotayı köke çeker (bkz. gameStore.setTab).
  */
  const tabHomeSignal = useGame((s) => s.tabHomeSignal);
  useEffect(() => {
    setRoute('root');
  }, [tabHomeSignal]);

  if (route === 'market') return <MarketRoute onBack={() => setRoute('root')} />;
  if (route === 'journal') return <JournalRoute onBack={() => setRoute('root')} />;
  if (route === 'wholesaler') return <WholesalerRoute onBack={() => setRoute('root')} />;
  if (route === 'network') return <NetworkRoute onBack={() => setRoute('root')} />;
  if (route === 'store') return <StoreRoute onBack={() => setRoute('root')} />;
  if (route === 'career') return <CareerRoute onBack={() => setRoute('root')} />;
  if (route === 'save') return <SaveRoute onBack={() => setRoute('root')} />;
  return <BusinessRoot onOpen={setRoute} />;
}

// ---------------------------------------------------------------------------

function BusinessRoot({ onOpen }: { onOpen: (r: Route) => void }) {
  const s = useGame();
  const [pendingPersonnel, setPendingPersonnel] = useState<number | null>(null);
  const [personnelOpen, setPersonnelOpen] = useState(false);
  const wealth = summarizeWealth({
    market: s.market,
    store: s.store,
    inventory: s.inventory,
    items: s.items,
    ledger: s.ledger,
  });
  const ratio = liquidityRatio(s.store.cash, s.inventory);
  const band = liquidityBand(ratio);
  const memory = registrySummary(s.customers);

  return (
    <div className="page">
      <header className="pageHead pageHead--withArt">
        <Art
          art={NAV_ART.business}
          size={88}
          decorative
          className="pageHead__art art--hero"
          fallback={null}
        />
        <h1 className="pageHead__title">{t('İşletme')}</h1>
        <p className="pageHead__sub">
          {t('{dukkan} · Kademe {kademe} · Seviye {seviye}', {
            dukkan: shopDisplayName(s.profile.jewelerName, t(SHOP_SUFFIX), t(DEFAULT_JEWELER_NAME)),
            kademe: s.store.storeTier,
            seviye: s.store.level,
          })}
        </p>
      </header>

      <div className="page__scroll">
        {/* Finans — kısa özet satırları, dev kart değil (GDD 23.19) */}
        <div className="group">
          <h2 className="group__title">Finans</h2>
          <div className="group__body">
            <StatLine label={t('Nakit')} value={tl(wealth.cash)} icon={<IconCash size={15} />} />
            <StatLine
              label={t(TERM.liquidity)}
              value={`${pct(ratio)} · ${t(LIQUIDITY_BAND_LABEL[band])}`}
              icon={<IconLiquidity size={15} />}
              tone={band === 'red' ? 'negative' : band === 'caution' ? 'warning' : undefined}
            />
            {/* GDD 34.5 — gerçekleşmiş kâr ve stok potansiyeli AYRI satırlardır. */}
            <StatLine
              label={t("Gerçekleşmiş kâr (bugün)")}
              value={tlSigned(wealth.realizedProfitToday)}
              tone={wealth.realizedProfitToday >= 0 ? 'positive' : 'negative'}
            />
            <StatLine
              label={t("Stok net çıkış farkı (realize değil)")}
              value={tlSigned(wealth.stockPotential)}
              tone={wealth.stockPotential >= 0 ? 'positive' : 'negative'}
            />
            <StatLine label={t("Yükümlülük")} value={tl(wealth.liabilities)} />
            <StatLine label={t("Net servet")} value={tl(wealth.netWorth)} />
            <StatLine label={t("HAS değeri (realize değil)")} value={tl(wealth.hasEstimatedValue)} />
          </div>
        </div>

        {/* Addendum §5 — gecelik pozisyon ve sonucu */}
        <OvernightPanel />
        <div className="group">
          <button
            type="button"
            className="personnelDisclosure personnelDisclosure--money"
            onClick={() => setPersonnelOpen((open) => !open)}
            aria-expanded={personnelOpen}
            aria-controls="personnel-controls"
          >
            <span className="personnelDisclosure__icon"><IconBusiness size={18} /></span>
            <span className="personnelDisclosure__copy">
              <strong>Personel</strong>
              <small>
                {t('{n} personel · Kapasite {kap} · Günlük {gunluk}', {
                  n: personnelCount(s.store),
                  kap: queueCapacity(s.store),
                  gunluk: tl(personnelDaily(s.store)),
                })}
              </small>
            </span>
            <span className={`personnelDisclosure__chevron ${personnelOpen ? 'personnelDisclosure__chevron--open' : ''}`} aria-hidden="true">⌄</span>
          </button>
          {personnelOpen && <div className="group__body v5Controls personnelControls" id="personnel-controls">
            <p>Personel {personnelCount(s.store)} · Bekleme kapasitesi {queueCapacity(s.store)}</p>
            <p>
              {t('Aylık {aylik} · Günlük {gunluk}', {
                aylik: tl(PERSONNEL_MONTHLY[personnelCount(s.store)]!),
                gunluk: tl(personnelDaily(s.store)),
              })}
            </p>
            <p>
              {t('Maaşlar kişi başına eklenir: {liste} / ay. Düğmedeki tutar o kadronun aylık toplamıdır.', {
                liste: PERSONNEL_SALARIES.map((salary) => tl(salary)).join(' + '),
              })}
            </p>
            <p>
              {t(
                'Yalnız bekleme kapasitesini artırır; müşteri geliş hızını veya atölyeyi değiştirmez.',
              )}
            </p>
            {/*
              DÜĞMEDE YAZAN TUTAR O KADRONUN AYLIK TOPLAMIDIR, kişi başı maaş
              değil. Kişi başı yazsaydı "3" düğmesi 60.000 ₺ gösterirdi ama
              basınca 150.000 ₺ ödenirdi — düğmenin üstündeki sayı ile kasadan
              çıkan para birbirini tutmazdı. Onay satırı da (aşağıda) aynı
              `PERSONNEL_MONTHLY` değerini okuyor; iki yer tek kaynaktan
              besleniyor.
            */}
            <div className="personnelChoiceRow" role="group" aria-label={t('Personel sayısı')}>
              {[0, 1, 2, 3].map((count) => {
                const aylik = PERSONNEL_MONTHLY[count]!;
                const seviye = PERSONNEL_UNLOCK_LEVELS[count] ?? 0;
                const isim =
                  count > 0
                    ? t('{n} personel, aylık toplam {tutar}, seviye {sv} gerektirir', {
                        n: count,
                        tutar: tl(aylik),
                        sv: seviye,
                      })
                    : t('Personelsiz — maaş ödenmez');
                return (
                  <button
                    key={count}
                    type="button"
                    className={`personnelChoice ${aylik > 0 ? 'personnelChoice--paid' : ''}`}
                    aria-pressed={personnelCount(s.store) === count}
                    aria-label={isim}
                    title={isim}
                    disabled={!canSetPersonnel(s.store, count)}
                    onClick={() => setPendingPersonnel(count)}
                  >
                    <strong>{count}</strong>
                    <small className="personnelChoice__wage">{tl(aylik)}</small>
                    <small className="personnelChoice__req">
                      {count > 0 ? `${t('Sv')} ${seviye}` : t('Başlangıç')}
                    </small>
                  </button>
                );
              })}
            </div>
            {pendingPersonnel !== null && <div role="group" aria-label={t('Personel onayı')}>
              <p>
                {t('{n} personel · aylık toplam {tutar}.', {
                  n: pendingPersonnel,
                  tutar: tl(PERSONNEL_MONTHLY[pendingPersonnel]!),
                })}{' '}
                {t('Günlük gider kapanışta tahsil edilir.')}
              </p>
              <button type="button" className="chip" onClick={() => { s.setPersonnelCount(pendingPersonnel); setPendingPersonnel(null); }}>{t('Personeli Onayla')}</button>
              <button type="button" className="chip" onClick={() => setPendingPersonnel(null)}>{t('Vazgeç')}</button>
            </div>}
          </div>}
        </div>
        <div className="group">
          <h2 className="group__title">{t('Günlük Akış')}</h2>
          <div className="group__body v5Controls">
            <p>{t('Kaçırılan Misafir: {n}', { n: s.missedGuestCountToday })}</p>
            {s.lastDayReport && <p>Gün {s.lastDayReport.day}: {s.lastDayReport.missedGuestCountToday ?? 0} misafir kaçırıldı · Gider {tl(s.lastDayReport.overhead)} (personel dahil).</p>}
          </div>
        </div>

        {/* İlişkiler */}
        <div className="group">
          <h2 className="group__title">{t('İlişkiler')}</h2>
          <div className="group__body">
            <StatLine
              label={t('Semt itibarı')}
              value={`${Math.round(s.store.reputation)}/100`}
              icon={<IconTrust size={15} />}
            />
            {/*
              MÜŞTERİ TRAFİĞİ GÖRÜNÜR OLMALI (GDD 10.1).

              İtibar ve mağaza kademesi artık geliş sıklığını da belirliyor
              (`domain/customer-traffic`). Bu satır olmadan mekanik çalışır
              ama oyuncu çalıştığını göremezdi: "itibarım arttı, ne oldu?"
              sorusunun cevabı hiçbir ekranda yazmazdı. Aynı hata bu projede
              daha önce iki kez yapıldı (B1/B5) ve ikisinde de ekrana
              bağlanarak çözüldü.

              Sayı bir ÇARPANDIR, müşteri adedi değil: gerçek adet güne ve
              zara da bağlı, tek bir rakam vaat etmek yanıltıcı olurdu.
            */}
            <StatLine
              label={t('Müşteri trafiği')}
              value={multiplier(customerDensity(s.store))}
              tone={customerDensity(s.store) >= 1 ? 'positive' : 'warning'}
            />
            {/*
              GDD 10.1 — üç ayrı ilişki metriği. Semt itibarı ve toptancı
              güveni zaten vardı; KİŞİSEL GÜVEN görünmüyordu, yani oyuncu
              müşteri ilişkisinin biriktiğini hiç göremiyordu.
            */}
            <StatLine
              label={t("Tanıdık müşteri")}
              value={
                memory.known === 0
                  ? t('Henüz yok')
                  : t('{n} kişi · {sadik} sadık', { n: memory.known, sadik: memory.loyal }) +
                    (memory.upset > 0 ? t(' · {n} küsmüş', { n: memory.upset }) : '')
              }
              tone={memory.upset > memory.loyal ? 'warning' : undefined}
            />
            {memory.lifetimeVolume > 0 && (
              <StatLine label={t("Tanıdıklardan gelen ciro")} value={tl(memory.lifetimeVolume)} />
            )}
            <StatLine
              label={t(TERM.supplierTrust)}
              value={`${Math.round(s.store.supplier.trust)}/100`}
              icon={<IconWholesale size={15} />}
            />
            <StatLine
              label={t("Tedarik limiti")}
              value={t('{tutar} kullanılabilir · {gun} gün vade', {
                tutar: tl(Math.max(0, creditLimit(s.store) - usedLimit(s.store.supplier))),
                gun: creditTermDays(s.store),
              })}
            />
          </div>
        </div>

        {/* İkincil rotalar (GDD 23.9.1) */}
        <div className="group">
          <h2 className="group__title">Rotalar</h2>
          <div className="group__body">
            <MenuLine
              title="Piyasa"
              sub={t('{rejim} · {n} varlık', {
                rejim: t(MARKET_REGIME[s.market.regime].label),
                n: s.market.assets.length,
              })}
              icon={<IconLiquidity size={17} />}
              onPress={() => onOpen('market')}
            />
            <MenuLine
              title={t('İşlem Defteri')}
              sub={t('{n} kayıt · vaka özetleri', { n: s.ledger.deals.length })}
              icon={<IconReason size={17} />}
              onPress={() => onOpen('journal')}
            />
            <MenuLine
              title={t('Toptancı Hesabı')}
              sub={supplierSub(s)}
              icon={<IconWholesale size={17} />}
              money
              onPress={() => onOpen('wholesaler')}
            />
            <MenuLine
              title={t('Esnaf Ağı')}
              sub={networkSub(s)}
              icon={<IconTrust size={17} />}
              money
              onPress={() => onOpen('network')}
            />
            <MenuLine
              title={t('Kayıt')}
              sub={t('Gün sonunda otomatik kayıt · hesap bağlama Ayarlar’da')}
              icon={<IconReason size={17} />}
              onPress={() => onOpen('save')}
            />
            <MenuLine
              title={t('Mağaza')}
              sub={storeSub(s)}
              icon={<IconBusiness size={17} />}
              money
              onPress={() => onOpen('store')}
            />
            <MenuLine
              title={t("Kariyer / Yetenekler")}
              sub={t('Seviye {seviye} · {xp}/{hedef} XP', {
                seviye: s.store.level,
                xp: s.store.xp,
                hedef: s.store.xpToNext,
              })}
              icon={<IconBusiness size={17} />}
              onPress={() => onOpen('career')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function CareerRoute({ onBack }: { onBack: () => void }) {
  const s = useGame();
  const progress = Math.min(100, Math.round((s.store.xp / Math.max(1, s.store.xpToNext)) * 100));
  return (
    <div className="page">
      <header className="pageHead">
        <button type="button" className="chip" onClick={onBack} style={{ marginBottom: 8 }}>
          {t('← İşletme')}
        </button>
        <h1 className="pageHead__title">Kariyer / Yetenekler</h1>
        <p className="pageHead__sub">
          {t('Seviye {seviye} · uzmanlık ilerlemesi', { seviye: s.store.level })}
        </p>
      </header>
      <div className="page__scroll">
        <div className="group">
          <h2 className="group__title">{t('Seviye ilerlemesi')}</h2>
          <div className="group__body">
            <StatLine label={t('XP')} value={`${s.store.xp} / ${s.store.xpToNext}`} />
            <div
              className="careerProgress"
              aria-label={t('Seviye ilerlemesi yüzde {yuzde}', { yuzde: progress })}
            >
              <span style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
        <div className="group">
          <h2 className="group__title">{t('Yetenek ağacı')}</h2>
          <TalentTreePanel />
        </div>
        <div className="group">
          <h2 className="group__title">{t('Araç yol haritası')}</h2>
          <div className="group__body">
            {TEST_TOOLS.map((tool) => (
              <StatLine
                key={tool.id}
                label={t(tool.name)}
                value={
                  tool.unlockLevel <= s.store.level
                    ? t('Açık')
                    : t('Seviye {sv}', { sv: tool.unlockLevel })
                }
                tone={tool.unlockLevel <= s.store.level ? 'positive' : undefined}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * KAYIT rotası — elle kaydet/yükle düğmeleri kaldırıldı.
 *
 * Kullanıcı kararı: kayıt bulut tabanlı bir hesaba taşınacak. "Şimdi
 * Kaydet" ve "Son Kaydı Geri Yükle" bu yüzden gitti — ikisi de yerel bir
 * dosyayı elle yönetme eylemiydi ve bir hesap sistemi ikisini de gereksiz
 * kılıyor. Ekran bilgi amaçlı kaldı: oyuncu hâlâ "mevcut durumum ne, son
 * otomatik kayıt ne zamandı" diye bakabilir — yalnız artık DÜĞMESİZ, salt
 * okunur. Hesap bağlama Ayarlar'a taşındı (bkz. SettingsDialog · "Hesap");
 * iki yerde aynı yer tutucu düğmeyi bakımlamamak için burada tekrarlanmadı.
 */
function SaveRoute({ onBack }: { onBack: () => void }) {
  const s = useGame();
  const [saved] = useState(() => readSaveSummary());

  return (
    <div className="page">
      <header className="pageHead">
        <button type="button" className="chip" onClick={onBack} style={{ marginBottom: 8 }}>{t('← İşletme')}</button>
        <h1 className="pageHead__title">{t('Kayıt')}</h1>
        <p className="pageHead__sub">{t('Gün sonunda otomatik kayıt · hesap bağlama Ayarlar’da')}</p>
      </header>
      <div className="page__scroll">
        <div className="group">
          <h2 className="group__title">{t('Mevcut oyun')}</h2>
          <div className="group__body">
            <StatLine
              label={t('Gün / Saat')}
              value={t('{gun}. gün · {saat}', {
                gun: s.market.day,
                saat: clock(s.market.clockMinutes),
              })}
            />
            <StatLine label={t('Nakit')} value={tl(s.store.cash)} />
          </div>
        </div>
        <div className="group">
          <h2 className="group__title">{t('Son kayıt')}</h2>
          <div className="group__body">
            {saved ? (
              <>
                <StatLine
                  label={t('Gün / Saat')}
                  value={t('{gun}. gün · {saat}', {
                    gun: saved.day,
                    saat: clock(saved.clockMinutes),
                  })}
                />
                <StatLine
                  label={t('Nakit / Stok')}
                  value={t('{nakit} · {n} adet', {
                    nakit: tl(saved.cash),
                    n: saved.stockUnits,
                  })}
                />
                <StatLine
                  label={t("Kayıt zamanı")}
                  value={saved.savedAt ? new Date(saved.savedAt).toLocaleString('tr-TR') : t('Eski kayıt')}
                />
              </>
            ) : <p className="emptyNote">{t('Henüz kayıt yok.')}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Menü alt satırı — limit ve vade durumu bir bakışta (§7). */
function supplierSub(s: ReturnType<typeof useGame.getState>): string {
  const open = s.store.supplier.openInvoices.length;
  const available = creditLimit(s.store) - usedLimit(s.store.supplier);
  return open > 0
    ? t('{n} açık vade · {tutar} kullanılabilir limit', {
        n: open,
        tutar: tl(Math.max(0, available)),
      })
    : t('{tutar} kullanılabilir limit', { tutar: tl(Math.max(0, available)) });
}

/**
 * TOPTANCI HESABI — Addendum §4.2 (toplu bozma) ve §7 (finansman).
 *
 * §7 DEĞİŞMEZ: "Finansmanın maliyeti ve koşulları İŞLEM ÖNCESİ anlaşılır
 * biçimde hesaplanır; gizli veya geriye dönük ücret yaratılmaz." Bu yüzden
 * her lotun yanında peşin/vadeli ayrımı, vade farkı ve ödeme günü butona
 * basılmadan ÖNCE yazar.
 */
function WholesalerRoute({ onBack }: { onBack: () => void }) {
  const s = useGame();
  const today = s.market.day;
  const limit = creditLimit(s.store);
  const used = usedLimit(s.store.supplier);
  const available = Math.max(0, limit - used);

  // §4.1 "uygun ticari kanal üzerinden tedarik" — toptancının sattığı ürünler.
  const probes = SUPPLY_TEMPLATES.map((id) => spawnItem(s.seed, LOT_PROBE_INDEX, id));

  return (
    <div className="page">
      <header className="pageHead pageHead--withArt">
        <button type="button" className="chip" onClick={onBack} style={{ marginBottom: 8 }}>
          {t('← İşletme')}
        </button>
        {/*
          Toptancı ekranının kimlik görseli — 88 px. Başlık şeridi zaten iki
          satır; görsel sağa yaslanıp o yüksekliği kullanır, satır eklemez.
        */}
        <Art
          art={NAV_ART.wholesaler}
          size={88}
          decorative
          className="pageHead__art art--hero"
          fallback={null}
        />
        <h1 className="pageHead__title">{t('Toptancı Hesabı')}</h1>
        <p className="pageHead__sub">
          {t(TERM.supplierTrust)} {Math.round(s.store.supplier.trust)}/100 · {creditTermDays(s.store)} gün vade ·
          vade farkı {pct(financeRate(s.store))}
        </p>
      </header>

      <div className="page__scroll">
        {/* §7 — limit durumu */}
        <div className="group">
          <h2 className="group__title">{t('Limit ve vade')}</h2>
          <div className="group__body">
            <StatLine label={t("Toplam limit")} value={tl(limit)} />
            <StatLine
              label={t("Kullanılabilir")}
              value={tl(available)}
              tone={available <= 0 ? 'negative' : undefined}
            />
            {s.store.supplier.openInvoices.length === 0 ? (
              <StatLine label={t("Açık vade")} value="Yok" />
            ) : (
              s.store.supplier.openInvoices.map((inv) => {
                const late = inv.dueDay < today;
                return (
                  <div key={inv.id} className="statLine">
                    <span className="statLine__label">
                      {late ? t('GECİKMİŞ') : t('{gun}. gün', { gun: inv.dueDay })} {t('vadesi')}
                    </span>
                    <span className="statLine__value">
                      <span className={`num ${late ? 'statLine__value--negative' : ''}`}>
                        {tl(inv.amount)}
                      </span>{' '}
                      <button
                        type="button"
                        className="miniBtn"
                        onClick={() => s.repaySupplier(inv.id)}
                        disabled={inv.amount > s.store.cash}
                      >
                        {t('Öde')}
                      </button>
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* §4.2 — toplu bozma */}
        <div className="group">
          <h2 className="group__title">Toplu bozma</h2>
          <div className="group__body">
            <WholesalerLiquidationList />
          </div>
        </div>

        {/* §4.1 / §7 — tedarik */}
        <div className="group">
          <h2 className="group__title">Tedarik</h2>
          <div className="group__body">
            {probes.map((probe) => (
              <SupplyRow key={probe.templateId} probe={probe} today={today} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * §7 — bir tedarik satırı. Adet oyuncunun kararıdır ve fiyat her değişimde
 * §6'nın hacim katmanından yeniden geçer.
 *
 * §7 DEĞİŞMEZ: "Finansmanın maliyeti ve koşulları İŞLEM ÖNCESİ anlaşılır
 * biçimde hesaplanır." Peşin/vadeli ayrımı, vade farkı ve ödeme günü butona
 * basılmadan önce, seçili adede göre yazar.
 */
function SupplyRow({ probe, today }: { probe: ItemInstance; today: number }) {
  const s = useGame();
  const suggested = affordableQuantity(probe, s.market, s.store);
  // Güvenli varsayılan: oyuncu açıkça artırmadıkça tek adet satın alınır.
  const [quantity, setQuantity] = useState(1);
  const [confirming, setConfirming] = useState(false);

  const lot = supplyOffer(probe, quantity, s.market, s.store);
  if (!lot) return null;

  const terms = financeTerms(s.store, lot.total, today);
  const expensive = lot.total >= Math.max(100_000, Math.round(s.store.cash * 0.2));

  const buy = () => {
    if (expensive && !confirming) {
      setConfirming(true);
      return;
    }
    s.buyFromWholesaler(lot.templateId, lot.quantity);
    setConfirming(false);
    setQuantity(1);
  };

  return (
    <div className="lotRow">
      <div className="lotRow__head">
        <span className="lotRow__name">{t(lot.displayName)}</span>
        <span className="lotRow__price num">{tl(lot.total)}</span>
      </div>

      <div className="lotRow__terms">
        {tl(lot.unitPrice)} / adet · {lot.grams.toFixed(2)} gr · tek işlemde en çok{' '}
        {lot.maxQuantity} adet
      </div>

      <div className="lotRow__terms">
        {terms.financed > 0
          ? t('{pesin} peşin + {vadeli} vadeli · vade farkı {fark} · {gun}. gün', {
              pesin: tl(terms.fromCash),
              vadeli: tl(terms.financed),
              fark: tl(terms.financeCost),
              gun: terms.dueDay,
            })
          : t('Tamamı peşin')}
      </div>

      <div className="lotRow__controls">
        <label className="lotRow__field">
          <span>{t('Adet')}</span>
          <input
            type="number"
            min={1}
            max={lot.maxQuantity}
            value={quantity}
            onChange={(e) => {
              const next = Number(e.target.value);
              setQuantity(Number.isFinite(next) ? Math.min(lot.maxQuantity, Math.max(1, next)) : 1);
              setConfirming(false);
            }}
          />
        </label>
        {suggested !== quantity && suggested > 0 && (
          <button type="button" className="miniBtn" onClick={() => {
            setQuantity(suggested);
            setConfirming(false);
          }}>
            {suggested} adet sığar
          </button>
        )}
        <button
          type="button"
          className="lotRow__buy"
          onClick={buy}
          disabled={!!terms.blockedReason}
        >
          {terms.blockedReason ??
                (confirming ? t('{tutar} ödemeyi onayla', { tutar: tl(lot.total) }) : t('Al'))}
        </button>
      </div>
      {confirming && (
        <p className="lotRow__warning" role="status">
          {t('Bu alım yüksek tutarlı. Nakit/vadeli dağılımını kontrol edip bir kez daha onayla.')}
        </p>
      )}
    </div>
  );
}

/** Toptancının sattığı standart lot havuzu — §4'ün ürün havuzuyla aynı küme. */
const SUPPLY_TEMPLATES = ['gram_gold_1', 'quarter_gold', 'half_gold', 'full_gold'];
/** Lot fiyatlaması ürünün kimliğine değil şablonuna bağlıdır; sabit sonda yeter. */
const LOT_PROBE_INDEX = 424_242;

/** §8 — ağın durumu bir satırda: kaç esnaf alım yapar, ne kadar borç açık. */
function networkSub(s: ReturnType<typeof useGame.getState>): string {
  const buyers = s.network.filter(buysBullion).length;
  const debt = networkDebt(s.network);
  return debt > 0
    ? t('{n} esnaf altın alıyor · {tutar} açık borç', { n: buyers, tutar: tl(debt) })
    : t('{n} esnaf altın alıyor · borç yok', { n: buyers });
}

/**
 * ESNAF AĞI — Addendum §8.
 *
 * DEĞİŞMEZ: "toptancının yerine geçen SINIRSIZ İKİNCİ BANKA DEĞİLDİR."
 * Ekran bunu görünür kılar: tek bir hesap bakiyesi yok, ayrı ayrı esnaflar
 * var; her birinin kasası, ilişkisi ve tek bir açık borcu. Üstte ağın toplam
 * kapasitesi durur — üye tavanlarının toplamı DEĞİL, ondan küçük bir tavan.
 */
function NetworkRoute({ onBack }: { onBack: () => void }) {
  const s = useGame();
  const [filter, setFilter] = useState<'all' | 'bullion' | 'credit'>('all');
  const today = s.market.day;
  const debt = networkDebt(s.network);
  const ceiling = networkDebtCeiling(s.network);
  const visibleMembers = [...s.network]
    .filter((member) =>
      filter === 'bullion'
        ? buysBullion(member)
        : filter === 'credit'
          ? networkLoanOffer(member, s.network, 0, today).maxAmount > 0
          : true,
    )
    .sort((a, b) => b.trust - a.trust);

  return (
    <div className="page">
      <header className="pageHead">
        <button type="button" className="chip" onClick={onBack} style={{ marginBottom: 8 }}>
          {t('← İşletme')}
        </button>
        <h1 className="pageHead__title">{t('Esnaf Ağı')}</h1>
        <p className="pageHead__sub">
          Yerel dayanışma · {s.network.length} esnaf · kısa vadeli
        </p>
      </header>

      <div className="page__scroll">
        {/* §8 "Ağ kapasitesi sonludur" — tavan en üstte, gizlenmeden. */}
        <div className="group">
          <h2 className="group__title">{t('Ağ kapasitesi')}</h2>
          <div className="group__body">
            <StatLine label={t("Açık borç")} value={tl(debt)} tone={debt > 0 ? 'warning' : undefined} />
            <StatLine
              label={t("Kalan kapasite")}
              value={tl(Math.max(0, ceiling - debt))}
              tone={ceiling - debt <= 0 ? 'negative' : undefined}
            />
            <StatLine
              label={t("Ağ nakdi")}
              value={tl(s.network.reduce((sum, m) => sum + m.cashOnHand, 0))}
            />
          </div>
        </div>

        <div className="networkFilters" role="tablist" aria-label={t('Esnaf ağı filtresi')}>
          {([['all', t('Tümü')], ['bullion', t('Altın alan')], ['credit', t('Borç verebilen')]] as const).map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={filter === id} className={`chip ${filter === id ? 'chip--active' : ''}`} onClick={() => setFilter(id)}>
              {label}
            </button>
          ))}
        </div>

        {visibleMembers.map((member, index) => (
          <NetworkMemberCard key={member.id} member={member} today={today} defaultOpen={index === 0} />
        ))}
      </div>
    </div>
  );
}

function NetworkMemberCard({
  member,
  today,
  defaultOpen,
}: {
  member: TradeNetworkMember;
  today: number;
  defaultOpen: boolean;
}) {
  const s = useGame();
  const [amount, setAmount] = useState(0);
  const [expanded, setExpanded] = useState(defaultOpen);

  const offer = networkLoanOffer(member, s.network, amount || 0, today);
  const canBuy = buysBullion(member);
  const late = !!member.loan && member.loan.dueDay < today;

  // §8 "uygun esnafta" — yalnız bu esnafın alabileceği pozisyonlar.
  const sellable = s.inventory
    .filter((p) => p.location !== 'workshop')
    .map((p) => ({
      position: p,
      offer: networkLiquidationOffer(member, p.itemId, p.quantity, s.items, s.inventory, s.market),
    }))
    .filter((r) => r.offer !== null && r.offer.quantity > 0);

  return (
    <details
      className="group networkMember"
      open={expanded}
      onToggle={(event) => setExpanded(event.currentTarget.open)}
    >
      {/*
        §8 ağın tamamı ilişki üzerine kurulu: kimden borç alacağın, kime mal
        vereceğin ilişkiye bakıyor. Portre o ilişkinin muhatabını gösterir —
        72 px, paketin portre bandının alt ucu.
      */}
      <summary className="group__title group__title--withPortrait">
        <Art
          art={merchantArt(member.id, member.displayName)}
          size={72}
          className="group__portrait art--portrait"
          fallback={null}
        />
        <span>
          {member.displayName} · ilişki {member.trust}/100
        </span>
        <span className="networkMember__summary">{tl(member.cashOnHand)} · {buysBullion(member) ? t('altın alır') : t('hizmet ağı')}</span>
      </summary>
      <div className="group__body">
        <StatLine label={t("Kasasındaki nakit")} value={tl(member.cashOnHand)} />

        {/* §8 — açık borç ve sonuçları */}
        {member.loan ? (
          <div className="statLine">
            <span className="statLine__label">
              {late ? t('GECİKMİŞ borç') : t('{gun}. gün borcu', { gun: member.loan.dueDay })}
            </span>
            <span className="statLine__value">
              <span className={`num ${late ? 'statLine__value--negative' : ''}`}>
                {tl(member.loan.totalDue)}
              </span>{' '}
              <button
                type="button"
                className="miniBtn"
                onClick={() => s.repayNetworkLoan(member.id)}
                disabled={member.loan.totalDue > s.store.cash}
              >
                {t('Öde')}
              </button>
            </span>
          </div>
        ) : offer.maxAmount <= 0 ? (
          /*
           * §8 "Ağ kapasitesi sonludur" — kapasite dolduğunda oyuncu ölü bir
           * form değil, NEDENİNİ görür. Boş kutu göstermek kısıtı gizlemek
           * olurdu; kısıt tasarımın kendisi, saklanacak bir kusur değil.
           */
          <p className="emptyNote">
            {networkDebtCeiling(s.network) - networkDebt(s.network) <= 0
              ? t('Ağ kapasitesi dolu; önce açık borçlarınızı kapatın.')
              : t('Bu esnafın şu an verecek nakdi yok.')}
          </p>
        ) : (
          <div className="lotRow">
            <div className="lotRow__terms">
              Kısa vadeli borç · en çok {tl(offer.maxAmount)} · {offer.termDays} gün ·
              dayanışma ücreti {pct(memberFeeRate(member))}
            </div>
            {amount > 0 && !offer.blockedReason && (
              <div className="lotRow__terms">
                {tl(offer.amount)} alırsınız, {offer.dueDay}. gün {tl(offer.totalDue)} ödersiniz.
              </div>
            )}
            <div className="lotRow__controls">
              <label className="lotRow__field">
                <span>Tutar</span>
                <input
                  type="number"
                  min={0}
                  max={offer.maxAmount}
                  step={1000}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                />
              </label>
              <button
                type="button"
                className="miniBtn"
                onClick={() => setAmount(offer.maxAmount)}
                disabled={offer.maxAmount <= 0}
              >
                {t('En çok')}
              </button>
              <button
                type="button"
                className="lotRow__buy"
                onClick={() => s.borrowFromNetwork(member.id, amount)}
                disabled={!!offer.blockedReason}
              >
                {amount > 0 ? offer.blockedReason ?? t('Borç Al') : t('Borç Al')}
              </button>
            </div>
          </div>
        )}

        {/* §8 — altın bozdurma; yalnız uygun esnafta */}
        {!canBuy ? (
          <p className="emptyNote">{t('Bu esnaf sarrafiye almıyor.')}</p>
        ) : sellable.length === 0 ? (
          <p className="emptyNote">{t('Bozdurulacak uygun sarrafiye yok.')}</p>
        ) : (
          sellable.map(({ position, offer: liq }) => (
            <div key={position.itemId} className="lotRow">
              <div className="lotRow__head">
                <span className="lotRow__name">
                  {s.items[position.itemId]?.displayName ?? t('Ürün')} ×{liq!.quantity}
                </span>
                <span className="lotRow__price num">{tl(liq!.total)}</span>
              </div>
              <div className="lotRow__terms">
                {liq!.grams.toFixed(2)} gr · maliyet {tl(liq!.costBasis)} ·{' '}
                <span
                  className={
                    liq!.total - liq!.costBasis >= 0
                      ? 'statLine__value--positive'
                      : 'statLine__value--negative'
                  }
                >
                  {tlSigned(liq!.total - liq!.costBasis)}
                </span>
              </div>
              {/* §8 kapasite sınırı sessizce yutulmaz. */}
              {liq!.shortfallReason && (
                <div className="lotRow__terms">{liq!.shortfallReason}</div>
              )}
              <button
                type="button"
                className="lotRow__buy"
                onClick={() => s.liquidateToNetwork(member.id, position.itemId, liq!.quantity)}
              >
                Bozdur
              </button>
            </div>
          ))
        )}
      </div>
    </details>
  );
}

/**
 * Addendum §5 — GECELİK POZİSYON.
 *
 * DEĞİŞMEZ: "Sistem, her iki seçeneği de KOŞULSUZ GÜVENLİ veya SÜREKLİ
 * ÜSTÜN hale getirmemelidir." Bu yüzden panel iki tarafı da aynı ağırlıkta
 * gösterir: altının gecelik değişimi ve nakdin fırsat maliyeti yan yana.
 * Yalnız birini göstermek, diğerini örtük olarak "doğru seçim" ilan ederdi.
 *
 * GDD 34.5 — buradaki hiçbir sayı gerçekleşmiş kâr değildir ve etiketi bunu
 * söyler.
 */
function OvernightPanel() {
  const s = useGame();
  const position = selectors.position(s);
  const last = s.lastOvernight;
  const share = Math.round(position.metalShare * 100);

  return (
    <div className="group">
      <h2 className="group__title">{t(TERM.overnight)}</h2>
      <div className="group__body">
        <StatLine
          label={t("Dağılım")}
          value={t('Altın %{altin} · Nakit %{nakit}', { altin: share, nakit: 100 - share })}
          icon={<IconLiquidity size={15} />}
        />
        <StatLine label={t("Metale bağlı değer")} value={tl(position.metalValue)} />

        {last && (
          <>
            <StatLine
              label={`${last.position.day}. gece · piyasa`}
              value={pctChange(last.spotChange * 100)}
              tone={last.spotChange >= 0 ? 'positive' : 'negative'}
            />
            {/* §5'in iki yarısı — ikisi de görünür, biri diğerini gizlemez. */}
            <StatLine
              label={t("Altında kalmanın etkisi (realize değil)")}
              value={tlSigned(last.metalDelta)}
              tone={last.metalDelta >= 0 ? 'positive' : 'negative'}
            />
            <StatLine
              label={t("Nakitte kalmanın fırsat maliyeti")}
              value={last.cashOpportunityCost > 0 ? `−${tl(last.cashOpportunityCost)}` : '—'}
              tone={last.cashOpportunityCost > 0 ? 'warning' : undefined}
            />
          </>
        )}
      </div>
    </div>
  );
}

function storeSub(s: ReturnType<typeof useGame.getState>): string {
  const evaluation = evaluateUpgrade(
    s.store,
    growthSnapshot(
      { store: s.store, inventory: s.inventory, items: s.items, ledger: s.ledger },
      Object.keys(s.customers).length,
    ),
  );
  if (!evaluation.next)
    return t('{kademe} · son kademe', { kademe: t(evaluation.current.name) });
  const acik = evaluation.gates.filter((g) => g.met).length;
  return t('{kademe} · {acik}/{toplam} koşul hazır', {
    kademe: t(evaluation.current.name),
    acik,
    toplam: evaluation.gates.length,
  });
}

/**
 * MAĞAZA — GDD 19 "Mağaza Büyümesi ve Kariyer Katmanları".
 *
 * GDD 19.2 DEĞİŞMEZ: "Mağaza kademesi yalnız level sayısına bağlanmaz.
 * Sermaye, itibar ve bazı operasyon/tedarik eşikleri BİRLİKTE istenir."
 *
 * Ekran bu yüzden tek bir ilerleme çubuğu göstermiyor: her kapı ayrı satır.
 * Tek çubuk, "şu kadar daha XP" hissi verirdi — GDD'nin açıkça reddettiği şey.
 */
function StoreRoute({ onBack }: { onBack: () => void }) {
  const s = useGame();
  const evaluation = evaluateUpgrade(
    s.store,
    growthSnapshot(
      { store: s.store, inventory: s.inventory, items: s.items, ledger: s.ledger },
      Object.keys(s.customers).length,
    ),
  );

  const fmtGate = (g: (typeof evaluation.gates)[number]) =>
    g.unit === 'money'
      ? `${tl(g.current)} / ${tl(g.needed)}`
      : g.unit === 'points'
        ? `${g.current} → ${g.needed}`
        : `${g.current} / ${g.needed}`;

  return (
    <div className="page">
      <header className="pageHead">
        <button type="button" className="chip" onClick={onBack} style={{ marginBottom: 8 }}>
          {t('← İşletme')}
        </button>
        <h1 className="pageHead__title">{t(evaluation.current.name)}</h1>
        <p className="pageHead__sub">
          Kademe {evaluation.current.tier} · {evaluation.current.theme}
        </p>
      </header>

      <div className="page__scroll">
        <div className="group">
          <h2 className="group__title">{t('Bu kademede açık')}</h2>
          <div className="group__body">
            {evaluation.current.unlocks.map((u) => (
              <StatLine key={u} label={t(u)} value="" />
            ))}
            <StatLine label={t("Vitrin / arka stok")} value={`${s.store.displaySlots} / ${s.store.backStockSlots}`} />
            <StatLine
              label={t('Atölye kapasitesi')}
              value={t('{n} slot', { n: s.store.workshopCapacity })}
            />
            <StatLine label={t("Günlük gider")} value={tl(s.store.dailyOverhead)} />
          </div>
        </div>

        {!evaluation.next ? (
          <div className="group">
            <h2 className="group__title">Sonraki kademe</h2>
            <div className="group__body">
              {/* GDD 19.3 — Marka Ağı post-1.0 kapsamı. */}
              <p className="emptyNote">{evaluation.blockedReason}</p>
            </div>
          </div>
        ) : (
          <>
            <div className="group">
              <h2 className="group__title">
                {t('{kademe} · koşullar', { kademe: t(evaluation.next.name) })}
              </h2>
              <div className="group__body">
                {evaluation.gates.map((g) => (
                  <StatLine
                    key={g.key}
                    label={`${g.met ? '✓' : '·'} ${g.label}`}
                    value={fmtGate(g)}
                    tone={g.met ? 'positive' : undefined}
                  />
                ))}
                {evaluation.gates.some((g) => !g.met && g.key === 'supplierTrust') && (
                  <p className="emptyNote">
                    Toptancı güveni 100 üzerindendir. Anlamlı alışlar güveni {WHOLESALE.tradeTrustCap}
                    {'’'}e kadar büyütür; üstü için vade alıp zamanında ödemek gerekir.
                  </p>
                )}
                {evaluation.gates.some((g) => !g.met && g.key === 'reputation') && (
                  <p className="emptyNote">
                    Semt itibarı 100 üzerindendir. İyi kapanan işlemler yükseltir; kırıcı teklif ve
                    müşteriyi kaçırmak düşürür.
                  </p>
                )}
              </div>
            </div>

            <div className="group">
              <h2 className="group__title">
                {t('{kademe} · açılım', { kademe: t(evaluation.next.name) })}
              </h2>
              <div className="group__body">
                {evaluation.next.unlocks.map((u) => (
                  <StatLine key={u} label={t(u)} value="" />
                ))}
                <StatLine
                  label={t("Yeni günlük gider")}
                  value={tl(evaluation.next.grants.dailyOverhead)}
                  tone="warning"
                />
                <div className="lotRow">
                  <div className="lotRow__terms">
                    Yükseltme kalıcı bir gider taahhüdüdür: kademe büyüdükçe günlük
                    sabit gider de büyür.
                  </div>
                  <button
                    type="button"
                    className="lotRow__buy"
                    onClick={() => s.upgradeStore()}
                    disabled={!evaluation.ready}
                  >
                    {evaluation.ready
                      ? t('{tutar} öde ve yükselt', { tutar: tl(evaluation.investment) })
                      : (evaluation.blockedReason ?? t('Hazır değil'))}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Piyasa ekranı (GDD 23.16)
// ---------------------------------------------------------------------------

/**
 * GDD 23.16: "Piyasa ekranı telefon finans uygulaması kadar okunur; trading
 * terminali kadar yoğun değildir." · Event alanında "kesin yükselecek" dili
 * kullanılmaz — yalnız hangi grubu etkilediği söylenir.
 */
function MarketRoute({ onBack }: { onBack: () => void }) {
  const s = useGame();
  const market = s.market;
  const regime = MARKET_REGIME[market.regime];
  // §5.2 — sinyaller karar desteğidir; yön garanti etmez.
  const signals = marketSignals(market, selectors.position(s));
  const alarm = intentAlarm(s.intentTelemetry);
  const goldPosition = s.inventory.reduce(
    (sum, position) => {
      const item = s.items[position.itemId];
      const meta = item ? bullionMeta(item.templateId) : null;
      if (!meta || item?.metal !== 'gold') return sum;
      return {
        cost: sum.cost + position.costBasis,
        grams: sum.grams + meta.unitWeightGrams * position.quantity,
      };
    },
    { cost: 0, grams: 0 },
  );
  const averageGoldCost = goldPosition.grams > 0
    ? Math.round(goldPosition.cost / goldPosition.grams)
    : null;

  return (
    <div className="page">
      <header className="pageHead">
        <button type="button" className="chip" onClick={onBack} style={{ marginBottom: 8 }}>
          {t('← İşletme')}
        </button>
        <h1 className="pageHead__title">Piyasa</h1>
        <p className="pageHead__sub">
          Gün {market.day} · {regime.label} · oynaklık {pct(market.volatility, 1)}
        </p>

        {market.activeEvent && (
          <div className="eventCard">
            <div className="eventCard__title">{t(market.activeEvent.label)}</div>
            <div className="eventCard__text">{t(market.activeEvent.description)}</div>
            <div className="eventCard__list">
              {market.activeEvent.counterplay.map((play) => (
                <span key={play} className="tag tag--neutral">
                  {t(play)}
                </span>
              ))}
            </div>
          </div>
        )}
      </header>

      <div className="page__scroll">
        {/*
          §5.2 — "Oyuncuya rejim, volatilite, talep baskısı, olay riski ve
          kanal koşulları hakkında OKUNABİLİR sinyaller verilir. Sinyaller
          karar desteğidir; ertesi gün yönünü veya büyüklüğünü GARANTİ ETMEZ."
          Bu yüzden hiçbir satır yön söylemez; koşul söyler.
        */}
        <div className="group">
          <h2 className="group__title">Sinyaller</h2>
          <div className="group__body">
            {signals.map((signal) => (
              <StatLine
                key={signal.label}
                label={t(signal.label)}
                value={signal.detail}
                tone={
                  signal.level === 'high'
                    ? 'negative'
                    : signal.level === 'medium'
                      ? 'warning'
                      : undefined
                }
              />
            ))}
            {/* §11 "Dinamik havuz sapması: TELEMETRİ ALARMI ... devreye girer." */}
            {alarm.warning && (
              <StatLine label={t('Telemetri')} value={alarm.warning} tone="warning" />
            )}
            <p className="emptyNote">
              Sinyaller karar desteğidir; ertesi günün yönünü ya da büyüklüğünü
              garanti etmez.
            </p>
          </div>
        </div>

        <div className="group">
          <h2 className="group__title">Günün {t(TERM.regime)}</h2>
          <div className="group__body">
            <div className="statLine">
              <span className="statLine__label">{regime.label}</span>
              <span className="statLine__value" style={{ fontWeight: 400, fontSize: 12 }}>
                {t(regime.note)}
              </span>
            </div>
          </div>
        </div>

        <div className="group">
          <h2 className="group__title">{t('Varlıklar')}</h2>
          <div className="group__body">
            {market.assets.map((asset) => (
              <div key={asset.id} className="assetRow">
                <div>
                  <div className="assetRow__name">{t(asset.label)}</div>
                  <div className="assetRow__unit">{assetUnitLabel(asset)}</div>
                  {asset.history.length > 1 && (
                    <div className="assetRow__range num">
                      Band {assetPrice(asset, Math.min(...asset.history))}–
                      {assetPrice(asset, Math.max(...asset.history))}
                    </div>
                  )}
                  {asset.id === 'goldGram' && averageGoldCost !== null && (
                    <div className="assetRow__range num">Stok ort. {price(averageGoldCost)}/g</div>
                  )}
                </div>

                <Sparkline points={asset.history} />

                <div className="assetRow__right">
                  <div className="assetRow__price num">{assetPrice(asset, asset.price)}</div>
                  <div className={`assetRow__change num ${changeClass(asset.changePct)}`}>
                    {pctChange(asset.changePct)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Mini trend — her satırda küçük bir çizgi (GDD 23.16 "mini trend"). */
function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return <span className="spark" style={{ width: 52 }} />;

  const series = points.slice().reverse();
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const w = 52;
  const h = 18;

  const d = series
    .map((p, i) => {
      const x = (i / (series.length - 1)) * w;
      const y = h - ((p - min) / span) * h;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  const rising = (series[series.length - 1] ?? 0) >= (series[0] ?? 0);

  return (
    <svg className="spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <path
        d={d}
        fill="none"
        stroke={rising ? 'var(--positive)' : 'var(--negative)'}
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.8}
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// İşlem Defteri (GDD 23.20)
// ---------------------------------------------------------------------------

/**
 * GDD 23.20: "Liste: kısa işlem satırı — ürün, kapanış, kâr/zarar, güven delta."
 * "Öğrenme: işlem öncesi cevabı vermez; sonuçtan sonra 'neden' gösterir."
 */
function JournalRoute({ onBack }: { onBack: () => void }) {
  const s = useGame();
  const deals = s.ledger.deals.slice().reverse();

  return (
    <div className="page">
      <header className="pageHead">
        <button type="button" className="chip" onClick={onBack} style={{ marginBottom: 8 }}>
          {t('← İşletme')}
        </button>
        <h1 className="pageHead__title">{t('İşlem Defteri')}</h1>
        <p className="pageHead__sub">
          {t('{n} kayıt · her işlemin gerekçesi ve sonucu', { n: deals.length })}
        </p>
      </header>

      <div className="page__scroll">
        {deals.length === 0 ? (
          <div className="empty">
            <div className="empty__icon">
              <IconReason size={34} />
            </div>
            <p className="empty__title">{t('Henüz kayıt yok')}</p>
            <p className="empty__text">
              {t(
                'Kapanan her işlem buraya düşer: kullanılan testler, tahmin bandı, teklif geçmişi ve gerçek sonuç.',
              )}
            </p>
          </div>
        ) : (
          <div className="rowList">
            {deals.map((deal) => {
              const item = s.items[deal.itemIds[0] ?? ''];
              const accepted = deal.finalState === 'ACCEPTED';
              const delta = accepted ? deal.actualValue - deal.price : 0;

              return (
                <div key={deal.dealId} className="row">
                  <div className="row__body">
                    <div className="row__title">
                      {item?.displayName ?? t('Ürün')}{' '}
                      <span className={`tag ${accepted ? '' : 'tag--neutral'}`}>
                        {accepted ? 'Kabul' : 'Red'}
                      </span>
                    </div>
                    <div className="row__meta">
                      Gün {deal.day} · {deal.testsUsed.length} test · güven{' '}
                      {deal.confidence === 'high'
                        ? t('yüksek')
                        : deal.confidence === 'medium'
                          ? 'orta'
                          : t('düşük')}
                    </div>

                    <div className="row__figures">
                      <span className="figure">
                        <span className="figure__label">{t('Kapanış')}</span>
                        <span className="figure__value num">
                          {accepted ? tl(deal.price) : '—'}
                        </span>
                      </span>
                      <span className="figure">
                        <span className="figure__label">{t('Tahmin bandı')}</span>
                        <span className="figure__value num">
                          {tl(deal.estimateBand.min)}–{tl(deal.estimateBand.max)}
                        </span>
                      </span>
                      {accepted && (
                        <span className="figure">
                          <span className="figure__label">{t('Gerçeğe fark')}</span>
                          <span
                            className={`figure__value num ${
                              delta >= 0 ? 'figure__value--positive' : 'figure__value--negative'
                            }`}
                          >
                            {tlSigned(delta)}
                          </span>
                        </span>
                      )}
                    </div>

                    {deal.reviewData.keyDecisionPoint && (
                      <div className="rowAlert" style={{ color: 'var(--text-light-3)' }}>
                        {deal.reviewData.keyDecisionPoint}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function StatLine({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  tone?: 'positive' | 'negative' | 'warning';
}) {
  return (
    <div className="statLine">
      <span className="statLine__label">
        {icon}
        {label}
      </span>
      <span className={`statLine__value num ${tone ? `statLine__value--${tone}` : ''}`}>
        {value}
      </span>
    </div>
  );
}

/**
 * `money` — ARKASINDA PARA KARARI OLAN ROTA.
 *
 * İşletme ekranı sekiz satırlık bir listeydi ve sekizi de birbirinin aynısı
 * görünüyordu: "İşlem Defteri" (salt okunur bir kayıt) ile "Toptancı Hesabı"
 * (borç açar, vade doğurur) aynı ağırlıktaydı. Oyuncu hangi satırın kasasına
 * dokunacağını ancak içine girip öğreniyordu.
 *
 * İşaret UYDURULMADI — oyunun kendi sözlüğünden alındı: Stok ekranındaki
 * `counter__toggle` zaten 3 px'lik sol kenarla "burada para var" diyor.
 * Aynı kenar buraya taşındı, yani ekranlar arasında tek bir dil konuşuluyor.
 *
 * SEÇİCİ OLMAK ŞART. Sekiz satırın sekizi de işaretlenseydi işaret hiçbir şey
 * anlatmazdı; yalnız üçü işaretli: Toptancı, Esnaf Ağı, Mağaza. Piyasa, İşlem
 * Defteri, Kayıt ve Kariyer nötr kalır — okumak paraya mal olmaz.
 */
function MenuLine({
  title,
  sub,
  icon,
  onPress,
  money = false,
}: {
  title: string;
  sub: string;
  icon: React.ReactNode;
  onPress: () => void;
  money?: boolean;
}) {
  return (
    <button
      type="button"
      className={`menuLine ${money ? 'menuLine--money' : ''}`}
      onClick={onPress}
    >
      <span className="menuLine__icon">{icon}</span>
      <span className="menuLine__body">
        <span className="menuLine__title">{title}</span>
        <br />
        <span className="menuLine__sub">{sub}</span>
      </span>
      <span className="menuLine__chevron">
        <IconChevronRight size={16} />
      </span>
    </button>
  );
}

function changeClass(pctValue: number): string {
  if (pctValue > 0.005) return 'assetRow__change--up';
  if (pctValue < -0.005) return 'assetRow__change--down';
  return 'assetRow__change--flat';
}
