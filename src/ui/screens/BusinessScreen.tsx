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

import { TERM } from '@ui/terms';
import { useEffect, useState } from 'react';
import { PERSONNEL_MONTHLY, PERSONNEL_SALARIES, PERSONNEL_UNLOCK_LEVELS, canSetPersonnel, personnelCount, personnelDaily, queueCapacity } from '@domain/v5-rules';

import { MARKET_REGIME, WHOLESALE } from '@domain/balance';
import { shopDisplayName } from '@domain/profile';
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
import { clock, pct, pctChange, price, tl, tlSigned } from '@ui/format';
import { TalentTreePanel } from './TalentTreePanel';
import { WholesalerLiquidationList } from './WholesalerLiquidation';

type Route = 'root' | 'market' | 'journal' | 'wholesaler' | 'network' | 'store' | 'career' | 'save';

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
        <h1 className="pageHead__title">İşletme</h1>
        <p className="pageHead__sub">
          {shopDisplayName(s.profile.jewelerName)} · Kademe {s.store.storeTier} · Seviye {s.store.level}
        </p>
      </header>

      <div className="page__scroll">
        {/* Finans — kısa özet satırları, dev kart değil (GDD 23.19) */}
        <div className="group">
          <h2 className="group__title">Finans</h2>
          <div className="group__body">
            <StatLine label="Nakit" value={tl(wealth.cash)} icon={<IconCash size={15} />} />
            <StatLine
              label={TERM.liquidity}
              value={`${pct(ratio)} · ${LIQUIDITY_BAND_LABEL[band]}`}
              icon={<IconLiquidity size={15} />}
              tone={band === 'red' ? 'negative' : band === 'caution' ? 'warning' : undefined}
            />
            {/* GDD 34.5 — gerçekleşmiş kâr ve stok potansiyeli AYRI satırlardır. */}
            <StatLine
              label="Gerçekleşmiş kâr (bugün)"
              value={tlSigned(wealth.realizedProfitToday)}
              tone={wealth.realizedProfitToday >= 0 ? 'positive' : 'negative'}
            />
            <StatLine
              label="Stok net çıkış farkı (realize değil)"
              value={tlSigned(wealth.stockPotential)}
              tone={wealth.stockPotential >= 0 ? 'positive' : 'negative'}
            />
            <StatLine label="Yükümlülük" value={tl(wealth.liabilities)} />
            <StatLine label="Net servet" value={tl(wealth.netWorth)} />
            <StatLine label="HAS değeri (realize değil)" value={tl(wealth.hasEstimatedValue)} />
          </div>
        </div>

        {/* Addendum §5 — gecelik pozisyon ve sonucu */}
        <OvernightPanel />
        <div className="group">
          <button
            type="button"
            className="personnelDisclosure"
            onClick={() => setPersonnelOpen((open) => !open)}
            aria-expanded={personnelOpen}
            aria-controls="personnel-controls"
          >
            <span className="personnelDisclosure__icon"><IconBusiness size={18} /></span>
            <span className="personnelDisclosure__copy">
              <strong>Personel</strong>
              <small>{personnelCount(s.store)} personel · Kapasite {queueCapacity(s.store)} · Günlük {tl(personnelDaily(s.store))}</small>
            </span>
            <span className={`personnelDisclosure__chevron ${personnelOpen ? 'personnelDisclosure__chevron--open' : ''}`} aria-hidden="true">⌄</span>
          </button>
          {personnelOpen && <div className="group__body v5Controls personnelControls" id="personnel-controls">
            <p>Personel {personnelCount(s.store)} · Bekleme kapasitesi {queueCapacity(s.store)}</p>
            <p>Aylık {tl(PERSONNEL_MONTHLY[personnelCount(s.store)]!)} · Günlük {tl(personnelDaily(s.store))}</p>
            <p>Maaşlar kişi başına eklenir: {PERSONNEL_SALARIES.map(salary => tl(salary)).join(' + ')} / ay.</p>
            <p>Yalnız bekleme kapasitesini artırır; müşteri geliş hızını veya atölyeyi değiştirmez.</p>
            <div className="personnelChoiceRow" role="group" aria-label="Personel sayısı">
              {[0, 1, 2, 3].map(count => <button key={count} type="button" className="personnelChoice" aria-pressed={personnelCount(s.store) === count}
                aria-label={`${count} personel${count > 0 ? `, seviye ${PERSONNEL_UNLOCK_LEVELS[count]} gerektirir` : ''}`}
                disabled={!canSetPersonnel(s.store, count)}
                onClick={() => setPendingPersonnel(count)}>
                <strong>{count}</strong><small>{count > 0 ? `Sv ${PERSONNEL_UNLOCK_LEVELS[count]}` : 'Başlangıç'}</small>
              </button>)}
            </div>
            {pendingPersonnel !== null && <div role="group" aria-label="Personel onayı">
              <p>{pendingPersonnel} personel · aylık toplam {tl(PERSONNEL_MONTHLY[pendingPersonnel]!)}. Günlük gider kapanışta tahsil edilir.</p>
              <button type="button" className="chip" onClick={() => { s.setPersonnelCount(pendingPersonnel); setPendingPersonnel(null); }}>Personeli Onayla</button>
              <button type="button" className="chip" onClick={() => setPendingPersonnel(null)}>Vazgeç</button>
            </div>}
          </div>}
        </div>
        <div className="group">
          <h2 className="group__title">Günlük Akış</h2>
          <div className="group__body v5Controls">
            <p>Kaçırılan Misafir: {s.missedGuestCountToday}</p>
            {s.lastDayReport && <p>Gün {s.lastDayReport.day}: {s.lastDayReport.missedGuestCountToday ?? 0} misafir kaçırıldı · Gider {tl(s.lastDayReport.overhead)} (personel dahil).</p>}
          </div>
        </div>

        {/* İlişkiler */}
        <div className="group">
          <h2 className="group__title">İlişkiler</h2>
          <div className="group__body">
            <StatLine
              label="Semt itibarı"
              value={`${Math.round(s.store.reputation)}/100`}
              icon={<IconTrust size={15} />}
            />
            {/*
              GDD 10.1 — üç ayrı ilişki metriği. Semt itibarı ve toptancı
              güveni zaten vardı; KİŞİSEL GÜVEN görünmüyordu, yani oyuncu
              müşteri ilişkisinin biriktiğini hiç göremiyordu.
            */}
            <StatLine
              label="Tanıdık müşteri"
              value={
                memory.known === 0
                  ? 'Henüz yok'
                  : `${memory.known} kişi · ${memory.loyal} sadık${
                      memory.upset > 0 ? ` · ${memory.upset} küsmüş` : ''
                    }`
              }
              tone={memory.upset > memory.loyal ? 'warning' : undefined}
            />
            {memory.lifetimeVolume > 0 && (
              <StatLine label="Tanıdıklardan gelen ciro" value={tl(memory.lifetimeVolume)} />
            )}
            <StatLine
              label={TERM.supplierTrust}
              value={`${Math.round(s.store.supplier.trust)}/100`}
              icon={<IconWholesale size={15} />}
            />
            <StatLine
              label="Tedarik limiti"
              value={`${tl(Math.max(0, creditLimit(s.store) - usedLimit(s.store.supplier)))} kullanılabilir · ${creditTermDays(s.store)} gün vade`}
            />
          </div>
        </div>

        {/* İkincil rotalar (GDD 23.9.1) */}
        <div className="group">
          <h2 className="group__title">Rotalar</h2>
          <div className="group__body">
            <MenuLine
              title="Piyasa"
              sub={`${MARKET_REGIME[s.market.regime].label} · ${s.market.assets.length} varlık`}
              icon={<IconLiquidity size={17} />}
              onPress={() => onOpen('market')}
            />
            <MenuLine
              title="İşlem Defteri"
              sub={`${s.ledger.deals.length} kayıt · vaka özetleri`}
              icon={<IconReason size={17} />}
              onPress={() => onOpen('journal')}
            />
            <MenuLine
              title="Toptancı Hesabı"
              sub={supplierSub(s)}
              icon={<IconWholesale size={17} />}
              onPress={() => onOpen('wholesaler')}
            />
            <MenuLine
              title="Esnaf Ağı"
              sub={networkSub(s)}
              icon={<IconTrust size={17} />}
              onPress={() => onOpen('network')}
            />
            <MenuLine
              title="Kayıt"
              sub="Gün sonunda otomatik · elle kaydet veya geri yükle"
              icon={<IconReason size={17} />}
              onPress={() => onOpen('save')}
            />
            <MenuLine
              title="Mağaza"
              sub={storeSub(s)}
              icon={<IconBusiness size={17} />}
              onPress={() => onOpen('store')}
            />
            <MenuLine
              title="Kariyer / Yetenekler"
              sub={`Seviye ${s.store.level} · ${s.store.xp}/${s.store.xpToNext} XP`}
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
          ← İşletme
        </button>
        <h1 className="pageHead__title">Kariyer / Yetenekler</h1>
        <p className="pageHead__sub">Seviye {s.store.level} · uzmanlık ilerlemesi</p>
      </header>
      <div className="page__scroll">
        <div className="group">
          <h2 className="group__title">Seviye ilerlemesi</h2>
          <div className="group__body">
            <StatLine label="XP" value={`${s.store.xp} / ${s.store.xpToNext}`} />
            <div className="careerProgress" aria-label={`Seviye ilerlemesi yüzde ${progress}`}>
              <span style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
        <div className="group">
          <h2 className="group__title">Yetenek ağacı</h2>
          <TalentTreePanel />
        </div>
        <div className="group">
          <h2 className="group__title">Araç yol haritası</h2>
          <div className="group__body">
            {TEST_TOOLS.map((tool) => (
              <StatLine
                key={tool.id}
                label={tool.name}
                value={tool.unlockLevel <= s.store.level ? 'Açık' : `Seviye ${tool.unlockLevel}`}
                tone={tool.unlockLevel <= s.store.level ? 'positive' : undefined}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SaveRoute({ onBack }: { onBack: () => void }) {
  const s = useGame();
  const [confirmLoad, setConfirmLoad] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [saved, setSaved] = useState(() => readSaveSummary());

  const save = () => {
    const ok = s.saveGame();
    if (ok) setSaved(readSaveSummary());
    setLastAction(ok ? `Kaydedildi · Gün ${s.market.day}, ${clock(s.market.clockMinutes)}` : 'Kayıt oluşturulamadı.');
  };

  const load = () => {
    const ok = s.loadGame();
    setConfirmLoad(false);
    setLastAction(ok ? `Son kayıt yüklendi · Gün ${useGame.getState().market.day}` : 'Yüklenecek kayıt bulunamadı.');
  };

  return (
    <div className="page">
      <header className="pageHead">
        <button type="button" className="chip" onClick={onBack} style={{ marginBottom: 8 }}>← İşletme</button>
        <h1 className="pageHead__title">Kayıt</h1>
        <p className="pageHead__sub">Gün sonunda otomatik, istediğin anda elle kayıt</p>
      </header>
      <div className="page__scroll">
        <div className="group">
          <h2 className="group__title">Mevcut oyun</h2>
          <div className="group__body">
            <StatLine label="Gün / Saat" value={`${s.market.day}. gün · ${clock(s.market.clockMinutes)}`} />
            <StatLine label="Nakit" value={tl(s.store.cash)} />
            <button type="button" className="cta" onClick={save}>Şimdi Kaydet</button>
          </div>
        </div>
        <div className="group">
          <h2 className="group__title">Son kayıt</h2>
          <div className="group__body">
            {saved ? (
              <>
                <StatLine label="Gün / Saat" value={`${saved.day}. gün · ${clock(saved.clockMinutes)}`} />
                <StatLine label="Nakit / Stok" value={`${tl(saved.cash)} · ${saved.stockUnits} adet`} />
                <StatLine
                  label="Kayıt zamanı"
                  value={saved.savedAt ? new Date(saved.savedAt).toLocaleString('tr-TR') : 'Eski kayıt'}
                />
              </>
            ) : <p className="emptyNote">Henüz kayıt yok.</p>}
          </div>
        </div>
        <div className="group">
          <h2 className="group__title">Geri yükleme</h2>
          <div className="group__body">
            {!confirmLoad ? (
              <button type="button" className="secondary" onClick={() => setConfirmLoad(true)}>Son Kaydı Geri Yükle</button>
            ) : (
              <div className="confirmPanel">
                <p>Kaydedilmemiş mevcut ilerleme kaybolacak. Son kaydı yüklemek istiyor musun?</p>
                <div className="confirmPanel__actions">
                  <button type="button" className="secondary" onClick={() => setConfirmLoad(false)}>Vazgeç</button>
                  <button type="button" className="secondary secondary--danger" onClick={load}>Evet, Geri Yükle</button>
                </div>
              </div>
            )}
          </div>
        </div>
        {lastAction && <p className="routeFeedback" role="status">{lastAction}</p>}
      </div>
    </div>
  );
}

/** Menü alt satırı — limit ve vade durumu bir bakışta (§7). */
function supplierSub(s: ReturnType<typeof useGame.getState>): string {
  const open = s.store.supplier.openInvoices.length;
  const available = creditLimit(s.store) - usedLimit(s.store.supplier);
  return open > 0
    ? `${open} açık vade · ${tl(Math.max(0, available))} kullanılabilir limit`
    : `${tl(Math.max(0, available))} kullanılabilir limit`;
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
          ← İşletme
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
        <h1 className="pageHead__title">Toptancı Hesabı</h1>
        <p className="pageHead__sub">
          {TERM.supplierTrust} {Math.round(s.store.supplier.trust)}/100 · {creditTermDays(s.store)} gün vade ·
          vade farkı {pct(financeRate(s.store))}
        </p>
      </header>

      <div className="page__scroll">
        {/* §7 — limit durumu */}
        <div className="group">
          <h2 className="group__title">Limit ve vade</h2>
          <div className="group__body">
            <StatLine label="Toplam limit" value={tl(limit)} />
            <StatLine
              label="Kullanılabilir"
              value={tl(available)}
              tone={available <= 0 ? 'negative' : undefined}
            />
            {s.store.supplier.openInvoices.length === 0 ? (
              <StatLine label="Açık vade" value="Yok" />
            ) : (
              s.store.supplier.openInvoices.map((inv) => {
                const late = inv.dueDay < today;
                return (
                  <div key={inv.id} className="statLine">
                    <span className="statLine__label">
                      {late ? 'GECİKMİŞ' : `${inv.dueDay}. gün`} vadesi
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
                        Öde
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
        <span className="lotRow__name">{lot.displayName}</span>
        <span className="lotRow__price num">{tl(lot.total)}</span>
      </div>

      <div className="lotRow__terms">
        {tl(lot.unitPrice)} / adet · {lot.grams.toFixed(2)} gr · tek işlemde en çok{' '}
        {lot.maxQuantity} adet
      </div>

      <div className="lotRow__terms">
        {terms.financed > 0
          ? `${tl(terms.fromCash)} peşin + ${tl(terms.financed)} vadeli · vade farkı ${tl(
              terms.financeCost,
            )} · ${terms.dueDay}. gün`
          : 'Tamamı peşin'}
      </div>

      <div className="lotRow__controls">
        <label className="lotRow__field">
          <span>Adet</span>
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
          {terms.blockedReason ?? (confirming ? `${tl(lot.total)} ödemeyi onayla` : 'Al')}
        </button>
      </div>
      {confirming && (
        <p className="lotRow__warning" role="status">
          Bu alım yüksek tutarlı. Nakit/vadeli dağılımını kontrol edip bir kez daha onayla.
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
    ? `${buyers} esnaf altın alıyor · ${tl(debt)} açık borç`
    : `${buyers} esnaf altın alıyor · borç yok`;
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
          ← İşletme
        </button>
        <h1 className="pageHead__title">Esnaf Ağı</h1>
        <p className="pageHead__sub">
          Yerel dayanışma · {s.network.length} esnaf · kısa vadeli
        </p>
      </header>

      <div className="page__scroll">
        {/* §8 "Ağ kapasitesi sonludur" — tavan en üstte, gizlenmeden. */}
        <div className="group">
          <h2 className="group__title">Ağ kapasitesi</h2>
          <div className="group__body">
            <StatLine label="Açık borç" value={tl(debt)} tone={debt > 0 ? 'warning' : undefined} />
            <StatLine
              label="Kalan kapasite"
              value={tl(Math.max(0, ceiling - debt))}
              tone={ceiling - debt <= 0 ? 'negative' : undefined}
            />
            <StatLine
              label="Ağ nakdi"
              value={tl(s.network.reduce((sum, m) => sum + m.cashOnHand, 0))}
            />
          </div>
        </div>

        <div className="networkFilters" role="tablist" aria-label="Esnaf ağı filtresi">
          {([['all', 'Tümü'], ['bullion', 'Altın alan'], ['credit', 'Borç verebilen']] as const).map(([id, label]) => (
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
        <span className="networkMember__summary">{tl(member.cashOnHand)} · {buysBullion(member) ? 'altın alır' : 'hizmet ağı'}</span>
      </summary>
      <div className="group__body">
        <StatLine label="Kasasındaki nakit" value={tl(member.cashOnHand)} />

        {/* §8 — açık borç ve sonuçları */}
        {member.loan ? (
          <div className="statLine">
            <span className="statLine__label">
              {late ? 'GECİKMİŞ borç' : `${member.loan.dueDay}. gün borcu`}
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
                Öde
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
              ? 'Ağ kapasitesi dolu; önce açık borçlarınızı kapatın.'
              : 'Bu esnafın şu an verecek nakdi yok.'}
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
                En çok
              </button>
              <button
                type="button"
                className="lotRow__buy"
                onClick={() => s.borrowFromNetwork(member.id, amount)}
                disabled={!!offer.blockedReason}
              >
                {amount > 0 ? offer.blockedReason ?? 'Borç Al' : 'Borç Al'}
              </button>
            </div>
          </div>
        )}

        {/* §8 — altın bozdurma; yalnız uygun esnafta */}
        {!canBuy ? (
          <p className="emptyNote">Bu esnaf sarrafiye almıyor.</p>
        ) : sellable.length === 0 ? (
          <p className="emptyNote">Bozdurulacak uygun sarrafiye yok.</p>
        ) : (
          sellable.map(({ position, offer: liq }) => (
            <div key={position.itemId} className="lotRow">
              <div className="lotRow__head">
                <span className="lotRow__name">
                  {s.items[position.itemId]?.displayName ?? 'Ürün'} ×{liq!.quantity}
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
      <h2 className="group__title">{TERM.overnight}</h2>
      <div className="group__body">
        <StatLine
          label="Dağılım"
          value={`Altın %${share} · Nakit %${100 - share}`}
          icon={<IconLiquidity size={15} />}
        />
        <StatLine label="Metale bağlı değer" value={tl(position.metalValue)} />

        {last && (
          <>
            <StatLine
              label={`${last.position.day}. gece · piyasa`}
              value={pctChange(last.spotChange * 100)}
              tone={last.spotChange >= 0 ? 'positive' : 'negative'}
            />
            {/* §5'in iki yarısı — ikisi de görünür, biri diğerini gizlemez. */}
            <StatLine
              label="Altında kalmanın etkisi (realize değil)"
              value={tlSigned(last.metalDelta)}
              tone={last.metalDelta >= 0 ? 'positive' : 'negative'}
            />
            <StatLine
              label="Nakitte kalmanın fırsat maliyeti"
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
  if (!evaluation.next) return `${evaluation.current.name} · son kademe`;
  const acik = evaluation.gates.filter((g) => g.met).length;
  return `${evaluation.current.name} · ${acik}/${evaluation.gates.length} koşul hazır`;
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
          ← İşletme
        </button>
        <h1 className="pageHead__title">{evaluation.current.name}</h1>
        <p className="pageHead__sub">
          Kademe {evaluation.current.tier} · {evaluation.current.theme}
        </p>
      </header>

      <div className="page__scroll">
        <div className="group">
          <h2 className="group__title">Bu kademede açık</h2>
          <div className="group__body">
            {evaluation.current.unlocks.map((u) => (
              <StatLine key={u} label={u} value="" />
            ))}
            <StatLine label="Vitrin / arka stok" value={`${s.store.displaySlots} / ${s.store.backStockSlots}`} />
            <StatLine label="Atölye kapasitesi" value={`${s.store.workshopCapacity} slot`} />
            <StatLine label="Günlük gider" value={tl(s.store.dailyOverhead)} />
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
              <h2 className="group__title">{evaluation.next.name} · koşullar</h2>
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
              <h2 className="group__title">{evaluation.next.name} · açılım</h2>
              <div className="group__body">
                {evaluation.next.unlocks.map((u) => (
                  <StatLine key={u} label={u} value="" />
                ))}
                <StatLine
                  label="Yeni günlük gider"
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
                      ? `${tl(evaluation.investment)} öde ve yükselt`
                      : (evaluation.blockedReason ?? 'Hazır değil')}
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
          ← İşletme
        </button>
        <h1 className="pageHead__title">Piyasa</h1>
        <p className="pageHead__sub">
          Gün {market.day} · {regime.label} · oynaklık {pct(market.volatility, 1)}
        </p>

        {market.activeEvent && (
          <div className="eventCard">
            <div className="eventCard__title">{market.activeEvent.label}</div>
            <div className="eventCard__text">{market.activeEvent.description}</div>
            <div className="eventCard__list">
              {market.activeEvent.counterplay.map((play) => (
                <span key={play} className="tag tag--neutral">
                  {play}
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
                label={signal.label}
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
              <StatLine label="Telemetri" value={alarm.warning} tone="warning" />
            )}
            <p className="emptyNote">
              Sinyaller karar desteğidir; ertesi günün yönünü ya da büyüklüğünü
              garanti etmez.
            </p>
          </div>
        </div>

        <div className="group">
          <h2 className="group__title">Günün {TERM.regime}</h2>
          <div className="group__body">
            <div className="statLine">
              <span className="statLine__label">{regime.label}</span>
              <span className="statLine__value" style={{ fontWeight: 400, fontSize: 12 }}>
                {regime.note}
              </span>
            </div>
          </div>
        </div>

        <div className="group">
          <h2 className="group__title">Varlıklar</h2>
          <div className="group__body">
            {market.assets.map((asset) => (
              <div key={asset.id} className="assetRow">
                <div>
                  <div className="assetRow__name">{asset.label}</div>
                  <div className="assetRow__unit">{asset.unit}</div>
                  {asset.history.length > 1 && (
                    <div className="assetRow__range num">
                      Band {price(Math.min(...asset.history))}–{price(Math.max(...asset.history))}
                    </div>
                  )}
                  {asset.id === 'goldGram' && averageGoldCost !== null && (
                    <div className="assetRow__range num">Stok ort. {price(averageGoldCost)}/g</div>
                  )}
                </div>

                <Sparkline points={asset.history} />

                <div className="assetRow__right">
                  <div className="assetRow__price num">{price(asset.price)}</div>
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
          ← İşletme
        </button>
        <h1 className="pageHead__title">İşlem Defteri</h1>
        <p className="pageHead__sub">{deals.length} kayıt · her işlemin gerekçesi ve sonucu</p>
      </header>

      <div className="page__scroll">
        {deals.length === 0 ? (
          <div className="empty">
            <div className="empty__icon">
              <IconReason size={34} />
            </div>
            <p className="empty__title">Henüz kayıt yok</p>
            <p className="empty__text">
              Kapanan her işlem buraya düşer: kullanılan testler, tahmin bandı, teklif
              geçmişi ve gerçek sonuç.
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
                      {item?.displayName ?? 'Ürün'}{' '}
                      <span className={`tag ${accepted ? '' : 'tag--neutral'}`}>
                        {accepted ? 'Kabul' : 'Red'}
                      </span>
                    </div>
                    <div className="row__meta">
                      Gün {deal.day} · {deal.testsUsed.length} test · güven{' '}
                      {deal.confidence === 'high'
                        ? 'yüksek'
                        : deal.confidence === 'medium'
                          ? 'orta'
                          : 'düşük'}
                    </div>

                    <div className="row__figures">
                      <span className="figure">
                        <span className="figure__label">Kapanış</span>
                        <span className="figure__value num">
                          {accepted ? tl(deal.price) : '—'}
                        </span>
                      </span>
                      <span className="figure">
                        <span className="figure__label">Tahmin bandı</span>
                        <span className="figure__value num">
                          {tl(deal.estimateBand.min)}–{tl(deal.estimateBand.max)}
                        </span>
                      </span>
                      {accepted && (
                        <span className="figure">
                          <span className="figure__label">Gerçeğe fark</span>
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

function MenuLine({
  title,
  sub,
  icon,
  onPress,
}: {
  title: string;
  sub: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <button type="button" className="menuLine" onClick={onPress}>
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
