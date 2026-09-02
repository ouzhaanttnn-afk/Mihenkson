/**
 * MIHENKAYNAK — Oyun oturumu orkestrasyonu
 *
 * Bu katman domain'i UI'ya bağlar. Kural: iş mantığı BURADA YAŞAMAZ.
 * Store yalnız domain fonksiyonlarını doğru sırayla çağırır ve sonucu tutar.
 * Ekonomik yazma işlemi tek kapıdan geçer: settlement.applyTransaction().
 *
 * GDD 28.1 — kayıt sistemi işlem bazlı auto-save + gün sonu checkpoint kullanır;
 * save dosyası versiyonlanır ve migration destekler (bkz. src/state/save.ts).
 */

import { create } from 'zustand';
import { poolSupplyQuote, poolSupplyItem } from '@domain/pool-supply';
import { queueCapacity, toMg, canSetPersonnel } from '@domain/v5-rules';
import { tradeHas, meltToHas } from '@domain/has-account';
import { customerPriceBand, isCrafted } from '@domain/customer-pricing';
import { packagePriceBand, showcaseStock } from '@domain/purchase';
import { validQuantity } from '@domain/stock-pools';

import {
  DAY,
  PURCHASE,
  SERVICE,
  START,
  XP,
  PATIENCE_PER_TEST_SECOND,
  type SpeedStep,
} from '@domain/balance';
import { spawnItem } from '@domain/item-spawn';
import { createMarketForDay, stepMarketIntraday } from '@domain/market';
import { isShopOpen } from '@domain/calendar';
import { nextCustomerDelay, spawnCustomer } from '@domain/customer-spawn';
import {
  dayCharacter,
  emptyTelemetry,
  recordIntent,
  type DayCharacter,
  type IntentTelemetry,
} from '@domain/intent';
import {
  createPurchaseSession,
  matchDemand,
  maxPackageLines,
  packageFitPenalty,
  packageGrams,
  purchaseCeiling,
  repricePackage,
} from '@domain/purchase';
import { CHANNEL_LABEL_TR, gramsFor } from '@domain/channels';
import {
  measurePosition,
  resolveOvernight,
  type OvernightOutcome,
  type OvernightPosition,
} from '@domain/overnight';
import {
  accrueNetworkOverdue,
  applyLiquidation,
  networkLiquidationOffer,
  networkLoanOffer,
  openLoan,
  repayLoan,
  replenishNetwork,
  spawnNetwork,
} from '@domain/trade-network';
import {
  accrueOverdue,
  creditLimit,
  financeTerms,
  openInvoice,
  quoteLiquidation,
  repayInvoice,
  supplyOffer,
  tradeTrustAfterPurchase,
} from '@domain/wholesaler';
import { applyMove, createSession, effectiveReservation, isTerminal } from '@domain/negotiation';
import { applyTest, estimateBand, initialKnowledge, trueValue } from '@domain/valuation';
import {
  effectiveCeiling,
  revalueInventory,
  thesisFor,
  type ThesisContext,
} from '@domain/thesis';
import {
  applyTransaction,
  closeDay,
  createLedger,
  liquidityBand,
  liquidityRatio,
  realizeProfit,
  recordDeal,
  summarizeWealth,
  xpForDeal,
  type EconomyState,
  type Ledger,
} from '@domain/settlement';
import { buildCaseReview, toReviewData, type CaseReview } from '@domain/deal-review';
import {
  advanceJobsOneDay,
  applyServiceToItem,
  buildQuotes,
  createServiceJob,
  createServiceSession,
  diagnose,
  findQuote,
  inHouseLoad,
  resolveDelivery,
  type QuoteContext,
} from '@domain/service';
import { getTool } from '@data/tools';
import { getServiceType } from '@data/service-types';
import { makeId } from '@domain/rng';
import {
  createRecord,
  recordVisit,
  reputationDelta,
  type CustomerRegistry,
} from '@domain/customer-memory';
import { flowPolicy, stageUnlocked, transactionClass } from '@domain/transaction-class';
import { nextLesson, skipAll, type CoachContext } from '@domain/onboarding';
import {
  checkJewelerName,
  defaultProfile,
  normalizeAvatarId,
  type PlayerProfile,
} from '@domain/profile';
import { getTemplate } from '@data/item-templates';
import { rulesFor } from '@data/product-classes';
import {
  appraisalTransaction,
  feeBounds,
  resolveAppraisal,
  suggestedFee,
} from '@domain/appraisal';
import { applyTierGrants, evaluateUpgrade, growthSnapshot } from '@domain/store-growth';
import {
  defaultPlayerMarket,
  equipMarketProduct,
  lifestyleDailyExpense,
  purchaseMarketProduct,
  type PlayerMarketState,
} from '@domain/marketplace';
import {
  defaultSkillProgress,
  toolWithSkillBonuses,
  type SkillProgress,
} from '@domain/skill-tree';
import { clearSave, persistProfile, readSave, writeSave } from './save';
import type {
  ActiveDeal,
  AppraisalSession,
  AppraisalStance,
  Customer,
  DealLine,
  DealRecord,
  ExitChannel,
  InfoField,
  InventoryPosition,
  ItemInstance,
  MarketState,
  Money,
  NegotiationMove,
  NegotiationState,
  PackageLine,
  PurchaseSession,
  ServiceJob,
  ServiceVenue,
  SettlementTransaction,
  StoreState,
  TradeNetworkMember,
  VisitRecord,
  TradeSide,
  WorkbenchStage,
} from '@domain/types';

// ---------------------------------------------------------------------------
// Durum şekli
// ---------------------------------------------------------------------------

export type RootTab = 'shop' | 'stock' | 'workshop' | 'market' | 'business';

export interface ToastMessage {
  id: string;
  text: string;
  tone: 'info' | 'positive' | 'negative';
}

export interface ServiceDeliverySummary {
  jobId: string;
  jobName: string;
  customerName: string;
  succeeded: boolean;
  fee: Money;
  compensation: Money;
  cashDelta: Money;
  netContribution: Money;
  trustDelta: number;
  reputationDelta: number;
  risk: number;
  message: string;
}

export interface GameState {
  // --- Determinizm ---
  seed: number;
  /** Artan spawn sayacı — her spawn'ın deterministik anahtarı. */
  spawnCounter: number;

  // --- Dünya ---
  market: MarketState;
  store: StoreState;
  inventory: InventoryPosition[];
  items: Record<string, ItemInstance>;
  ledger: Ledger;

  // --- Oturum ---
  tab: RootTab;
  speed: SpeedStep;
  /** 4x rewarded video ile geçici açılır (GDD 26.2). */
  speed4xUnlocked: boolean;

  /**
   * GDD 25 — görülmüş öğretim dersleri. Kayıtla taşınır; taşınmasaydı her
   * yüklemede oyuncuya bildiği şey yeniden anlatılırdı.
   */
  seenLessons: string[];

  /**
   * Oyuncu profili — yalnız görünüm (bkz. @domain/profile).
   * Hiçbir ilerleme, ekonomi veya karar değeri taşımaz.
   */
  profile: PlayerProfile;
  /** Oyun içi TL ile alınan kozmetik ve şahsi prestij varlıkları. */
  playerMarket: PlayerMarketState;
  /** Gelecekteki yetenek ağacının kalıcı mekanik kademeleri. */
  skillProgress: SkillProgress;
  /** Profil düzenleme penceresi açık mı (yalnız arayüz durumu). */
  profileOpen: boolean;
  customerRushUntilMinutes: number | null;

  /**
   * Günün karakteri — Addendum §3'ün %24'lük dinamik havuzu.
   * %38/%38 intent tabanını DEĞİŞTİRMEZ; ürün karması, hacim, kalite,
   * aciliyet ve tempo gibi nitelikleri belirler.
   */
  dayCharacter: DayCharacter;
  /** §3 "dağılım ... izlenir" — üretilen intentlerin sayacı. */
  intentTelemetry: IntentTelemetry;

  /**
   * GDD 10 — müşteri hafızası. Müşteri gidince silinmez; geri döndüğünde
   * ilişkisi ve geçmişiyle birlikte gelir. Güvenin "ekonomik varlık"
   * olmasının tek koşulu bu defterin kalıcı olmasıdır.
   */
  customers: CustomerRegistry;

  /** Kapıda bekleyen müşteriler. */
  queue: { customer: Customer; items: ItemInstance[] }[];
  missedGuestCountToday: number;
  lastDayReport: import('@domain/settlement').DayReport | null;
  dayCloseConfirmOpen: boolean;
  dayReportOpen: boolean;
  requestDayClose: () => void;
  cancelDayClose: () => void;
  startNewDay: () => void;
  stockCatalogOpen: boolean;
  openStockCatalog: () => void;
  setStockCatalogOpen: (open: boolean) => void;
  setPersonnelCount: (count: number) => void;
  tradeHas: (side: 'buy' | 'sell', grams: number, txId: string) => void;
  meltStock: (itemId: string) => void;
  displayStock: (itemId: string) => void;
  /** Bir sonraki müşterinin geleceği oyun dakikası. */
  nextCustomerAtMinutes: number;

  /**
   * Addendum §8 — esnaf ağı üyeleri. Tek hesap değil, her biri kendi kasası
   * ve ilişkisi olan esnaflar; §8 "sınırsız ikinci banka değildir".
   */
  network: TradeNetworkMember[];

  /**
   * Addendum §5 — gün kapanışında alınan pozisyon (nakit / altın dağılımı).
   * Ertesi sabah sonucu hesaplanır; ikisi de §5'in iki yarısını taşır.
   */
  overnight: OvernightPosition | null;
  /** Dün gecenin sonucu — sabah gösterilir, sonra bir sonraki geceye devreder. */
  lastOvernight: OvernightOutcome | null;

  /** Atölyedeki tüm servis işleri (GDD 28.2 ServiceJob). */
  jobs: ServiceJob[];
  lastServiceDelivery: ServiceDeliverySummary | null;
  /** Deterministik iş kimliği için artan sayaç. */
  jobCounter: number;

  activeCustomer: Customer | null;
  activeDeal: ActiveDeal | null;
  /** Müşterinin son mesajı — aynı yüzeyde gösterilir (GDD 23.24). */
  customerMessage: string;
  lastReview: CaseReview | null;

  toasts: ToastMessage[];

  // --- Aksiyonlar ---
  setTab: (tab: RootTab) => void;
  setSpeed: (speed: SpeedStep) => void;
  unlock4x: () => void;

  /** GDD 25 — dersi kapat; bir daha gösterilmez. */
  dismissLesson: (id: string) => void;
  /** GDD 25 — öğretimin tamamını atla. */
  skipOnboarding: () => void;

  /**
   * Kuyumcu adını ve avatarı birlikte kaydeder.
   * @returns ad geçerliyse true; geçersizse hiçbir şey yazılmaz ve false.
   */
  updateProfile: (next: { jewelerName: string; avatarId: string }) => boolean;
  openProfile: () => void;
  closeProfile: () => void;
  triggerCustomerRush: () => void;
  buyMarketProduct: (productId: string) => boolean;
  equipMarketProduct: (productId: string) => boolean;

  tick: (deltaRealSeconds: number) => void;
  greetCustomer: () => void;
  setStage: (stage: WorkbenchStage) => void;
  setActiveLine: (lineId: string) => void;

  // --- Servis Kabul akışı (GDD 23.14) ---
  selectServiceType: (typeId: string) => void;
  selectServiceVenue: (venue: ServiceVenue) => void;
  setPromiseBuffer: (days: number) => void;
  acceptServiceJob: () => void;
  declineServiceJob: () => void;

  // --- Ekspertiz / danışma akışı (GDD 23.23 beşinci akış) ---
  selectStance: (stance: AppraisalStance) => void;
  setAppraisalFee: (fee: Money) => void;
  issueReport: () => void;
  declineAppraisal: () => void;
  deliverJob: (jobId: string) => void;
  dismissServiceDelivery: () => void;

  // --- Müşteri alış akışı (GDD 23.23 · Addendum §3, §4.1) ---
  togglePackageItem: (itemId: string) => void;
  /** §4.1 — sarrafiye adetle satılır; paket satırının adedini değiştirir. */
  setPackageQuantity: (itemId: string, quantity: number) => void;
  clearPackage: () => void;

  runTest: (toolId: string) => void;
  selectThesis: (channel: ExitChannel) => void;
  submitOffer: (amount: Money) => void;
  negotiationMove: (move: NegotiationMove) => void;
  finishDeal: () => void;

  // --- Toptancı (Addendum §4.2, §7) ---
  liquidateToWholesaler: (itemId: string, quantity: number, sliceCount: number) => void;
  buyPoolStock: (templateId: string, quantity: number) => void;
  buyFromWholesaler: (templateId: string, quantity: number) => void;
  repaySupplier: (invoiceId: string) => void;

  // --- Esnaf ağı (Addendum §8) ---
  liquidateToNetwork: (memberId: string, itemId: string, quantity: number) => void;
  borrowFromNetwork: (memberId: string, amount: Money) => void;
  repayNetworkLoan: (memberId: string) => void;

  advanceDay: () => void;

  /** GDD 19.2 — mağaza kademesini yükseltir. */
  upgradeStore: () => void;

  // --- Kayıt (GDD 28.1 · Addendum §11) ---
  saveGame: () => boolean;
  loadGame: () => boolean;
  resetGame: () => void;
  notify: (text: string, tone: ToastMessage['tone']) => void;
  dismissToast: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Başlangıç durumu
// ---------------------------------------------------------------------------

function createInitialStore(): StoreState {
  return {
    name: 'MIHENKAYNAK Kuyumculuk',
    cash: START.cash,
    reputation: START.reputation,
    level: 1,
    xp: 0,
    xpToNext: XP.levelCurve(1),
    storeTier: 1,
    displaySlots: START.displaySlots,
    backStockSlots: START.backStockSlots,
    workshopCapacity: START.workshopCapacity,
    staff: [],
    personnelCount: 0,
    hasBalanceMg: 0,
    hasCostBasis: 0,
    supplier: {
      trust: START.supplierTrust,
      limit: START.supplierLimit,
      terms: START.supplierTerms,
      openInvoices: [],
      priceBand: 1.0,
      specialLotEligibility: false,
    },
    payables: [],
    dailyOverhead: START.dailyOverhead,
  };
}

/** Yeni oyun için deterministik kök seed. */
function freshSeed(): number {
  // Yeni oyun başlatılırken bir kez seçilir ve kaydedilir; oturum boyunca
  // asla değişmez. Save'den yüklenirken dosyadaki seed kullanılır.
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}

export const useGame = create<GameState>((set, get) => {
  // GDD 28.1 — açılışta kayıt varsa oradan devam edilir. Kayıt bozuksa
  // readSave() null döner ve yeni oyun başlar; çökme yok (§11).
  const restored = readSave();
  const seed = restored?.seed ?? freshSeed();
  const market = restored?.market ?? createMarketForDay(seed, 1);

  return {
    seed,
    spawnCounter: 0,
    market,
    store: createInitialStore(),
    inventory: [],
    items: {},
    ledger: createLedger(),

    tab: 'shop',
    speed: 1,
    speed4xUnlocked: false,
    customerRushUntilMinutes: null,
    seenLessons: [],
    profile: defaultProfile(),
    playerMarket: defaultPlayerMarket(),
    skillProgress: defaultSkillProgress(),
    profileOpen: false,

    dayCharacter: dayCharacter(seed, 1, market),
    intentTelemetry: emptyTelemetry(),
    customers: {},
    network: spawnNetwork(seed, START.reputation),
    overnight: null,
    lastOvernight: null,

    queue: [],
    missedGuestCountToday: 0,
    lastDayReport: null,
    dayCloseConfirmOpen: false,
    dayReportOpen: false,
    stockCatalogOpen: false,
    nextCustomerAtMinutes: DAY.openMinutes + 3,

    jobs: [],
    lastServiceDelivery: null,
    jobCounter: 0,

    activeCustomer: null,
    activeDeal: null,
    customerMessage: '',
    lastReview: null,
    toasts: [],

    // Kayıt varsa VARSAYILANLARIN ÜSTÜNE yazar. Sıra kritik: varsayılanları
    // sonra koymak, yüklenen oyunu sessizce yeni oyuna çevirirdi.
    ...(restored ?? {}),

    // -----------------------------------------------------------------------
    setTab: (tab) => set({ tab }),
    // Ana Dükkan'daki hızlı alım, oyuncuyu bağlamından koparmadan sheet açar.
    // Stok ekranındaki aynı katalog kendi açılır tezgâhı olarak yaşamaya devam eder.
    openStockCatalog: () => set({ stockCatalogOpen: true }),
    setStockCatalogOpen: (stockCatalogOpen) => set({ stockCatalogOpen }),
    setPersonnelCount: (count) => {
      const s = get();
      if (!canSetPersonnel(s.store, count)) return;
      set({ store: { ...s.store, personnelCount: count } });
      writeSave(get());
    },
    tradeHas: (side, grams, txId) => {
      const s = get();
      if (!Number.isFinite(grams) || Math.abs(toMg(grams) / 1000 - grams) > 1e-9) return;
      const outcome = tradeHas(economyOf(s), s.market, side, toMg(grams), txId);
      if (!outcome.applied) { pushToast(set, get, outcome.reason ?? 'İşlem uygulanmadı.', 'negative'); return; }
      set(economyToState(outcome.state));
      writeSave(get());
      pushToast(set, get, 'HAS işlemi kaydedildi.', 'positive');
    },
    meltStock: (itemId) => {
      const s = get();
      const outcome = meltToHas(economyOf(s), s.market, itemId);
      if (!outcome.applied) { pushToast(set, get, outcome.reason ?? 'Eritilemedi.', 'negative'); return; }
      set(economyToState(outcome.state));
      writeSave(get());
      pushToast(set, get, 'Ürün eritildi; karşılığı HAS bakiyesine eklendi.', 'positive');
    },
    displayStock: (itemId) => {
      const s = get();
      const item = s.items[itemId];
      const pos = s.inventory.find(p => p.itemId === itemId);
      if (!item || !pos || pos.location === 'workshop' || !isCrafted(item) || item.buyCost === null ||
          s.inventory.filter(p => p.location === 'display').length >= s.store.displaySlots) return;
      set({ items: { ...s.items, [itemId]: { ...item, location: 'display', thesis: 'retail' } },
        inventory: s.inventory.map(p => p.itemId === itemId ? { ...p, location: 'display', thesis: 'retail' } : p) });
      writeSave(get());
    },

    setSpeed: (speed) => {
      // GDD 26.2 — 1x/2x temel erişim; 4x yalnız rewarded ile geçici açılır.
      if (speed === 4 && !get().speed4xUnlocked) return;
      set({ speed });
    },

    unlock4x: () => {
      set({ speed4xUnlocked: true, speed: 4 });
      pushToast(set, get, '4x hız açıldı.', 'info');
    },

    // --- GDD 25 · öğretim ---
    // Ders KAPATMAK oyunu hiç değiştirmez; yalnız o dersin bir daha
    // gösterilmemesini kaydeder. Bu yüzden atlamak da hiçbir şeyi eksik
    // bırakmaz.
    dismissLesson: (id) => {
      const seen = get().seenLessons;
      if (seen.includes(id)) return;
      set({ seenLessons: [...seen, id] });
    },

    skipOnboarding: () => set({ seenLessons: skipAll(get().seenLessons) }),

    /**
     * Profili günceller — ad ve avatar BİRLİKTE.
     *
     * Bilerek yapmadığı şey: başka hiçbir alana dokunmaz. Nakit, seviye,
     * XP, güven, stok ve defter aynı kalır; profil değiştirmek yeni oyun
     * başlatmaz. Bu yüzden burada `set` yalnız `profile` yazar.
     *
     * Geçersiz ad sessizce yutulmaz: çağıran taraf zaten doğrulamış olmalı,
     * yine de burada son bir kez süzülür ki bozuk bir ad kayda giremesin.
     */
    openProfile: () => set({ profileOpen: true }),
    closeProfile: () => set({ profileOpen: false }),

    updateProfile: (next) => {
      const check = checkJewelerName(next.jewelerName);
      if (!check.ok) return false;
      set({
        profile: { jewelerName: check.value, avatarId: normalizeAvatarId(next.avatarId) },
        profileOpen: false,
      });
      // Tercih ANINDA kalıcı olur; oyunun gün sonu checkpoint'ini beklemez.
      // Yalnız `profile` alanı yamalanır (bkz. persistProfile).
      persistProfile(get());
      pushToast(set, get, 'Profil güncellendi.', 'positive');
      return true;
    },

    triggerCustomerRush: () => {
      const { market } = get();
      // GDD 23.10.1 — yalnız müşteri geliş aralığını kısaltır. Müşteri
      // kalitesi, bütçesi, rezervasyon fiyatı veya hidden truth DEĞİŞMEZ.
      set({ customerRushUntilMinutes: market.clockMinutes + 90 });
      pushToast(set, get, 'Müşteri akını başladı — geliş aralığı kısaldı.', 'info');
    },

    buyMarketProduct: (productId) => {
      const s = get();
      const outcome = purchaseMarketProduct(economyOf(s), s.playerMarket, productId, s.market.day);
      if (!outcome.applied) {
        pushToast(set, get, outcome.reason ?? 'Market satın alımı yapılamadı.', 'negative');
        return false;
      }
      set({ ...economyToState(outcome.economy), playerMarket: outcome.playerMarket });
      writeSave(get());
      pushToast(set, get, 'Market ürünü koleksiyonuna eklendi.', 'positive');
      return true;
    },

    equipMarketProduct: (productId) => {
      const next = equipMarketProduct(get().playerMarket, productId);
      if (!next) {
        pushToast(set, get, 'Bu ürün kullanılamıyor.', 'negative');
        return false;
      }
      set({ playerMarket: next });
      writeSave(get());
      pushToast(set, get, 'Kozmetik görünüm uygulandı.', 'positive');
      return true;
    },

    // -----------------------------------------------------------------------
    tick: (deltaRealSeconds) => {
      const s = get();
      // Profil penceresi açıkken oyun dünyası donar; oyuncu seçim yaparken
      // günün ve müşteri kuyruğunun ilerlemesi cezaya dönüşmemeli.
      if (s.profileOpen || s.dayCloseConfirmOpen || s.dayReportOpen) return;
      // Aktif pazarlık sırasında saat ilerlemez: oyuncu düşünürken müşteri
      // sabrı gerçek zamanla erimez (GDD 11 — refleks oyunu değildir).
      if (s.activeDeal && !isDealFinished(s.activeDeal)) return;

      const advance = deltaRealSeconds * DAY.minutesPerRealSecond * s.speed;
      const clock = s.market.clockMinutes + advance;

      if (clock >= DAY.closeMinutes) {
        get().advanceDay();
        return;
      }

      const market = stepMarketIntraday(s.market, clock);
      let { queue, nextCustomerAtMinutes, spawnCounter, missedGuestCountToday } = s;
      let telemetry = s.intentTelemetry;

      if (isShopOpen(s.market.day) && clock >= nextCustomerAtMinutes) {
        const spawned = spawnCustomer(
          s.seed,
          spawnCounter,
          market,
          s.store,
          s.dayCharacter,
          s.customers,
          { inventory: s.inventory, items: s.items },
        );
        const valid = spawned.customer.intent === 'buy' ? !!spawned.customer.demand : spawned.items.length > 0;
        if (valid) {
          if (queue.length < queueCapacity(s.store)) queue = [...queue, spawned];
          else missedGuestCountToday += 1;
        }
        spawnCounter += 1;
        telemetry = recordIntent(telemetry, spawned.customer.intent, spawned.fromDynamicPool);

        const rushActive =
          s.customerRushUntilMinutes !== null && clock < s.customerRushUntilMinutes;
        // §3: dinamik havuz "gün içi yoğunluk" karakterini belirler.
        nextCustomerAtMinutes =
          clock +
          nextCustomerDelay(s.seed, spawnCounter, DAY.customerIntervalMinutes, rushActive) *
            s.dayCharacter.tempo;
      }

      // GDD 14.3 / 15.1 — stok değeri bugünkü piyasaya göre canlı kalır.
      // Bu YALNIZ currentValue yazar; gerçekleşmiş kâra dokunmaz (GDD 34.5).
      const inventory = revalueInventory(s.inventory, s.items, thesisContext({ ...s, market }));

      set({
        market,
        inventory,
        queue,
        nextCustomerAtMinutes,
        spawnCounter,
        intentTelemetry: telemetry,
        missedGuestCountToday,
      });
    },

    // -----------------------------------------------------------------------
    greetCustomer: () => {
      const s = get();
      if (s.activeDeal && !isDealFinished(s.activeDeal)) return;

      let head = s.queue[0];
      if (!head) return;
      const targetId = head.customer.demand?.targetInventoryItemId;
      if (targetId && !showcaseStock(s.inventory, s.items).some(p => p.itemId === targetId)) {
        // Regenerate the SAME spawn's standard demand; no extra arrival/count.
        const demand = head.customer.demand?.fallbackDemand;
        if (demand) head = { ...head, customer: { ...head.customer, demand } };
      }

      const items = { ...s.items };
      for (const item of head.items) items[item.id] = item;

      const lines: DealLine[] = head.items.map((item, i) => {
        const lineId = head.customer.lineIds[i] ?? `${head.customer.id}_line${i}`;
        return {
          lineId,
          itemId: item.id,
          knowledge: initialKnowledge(item),
          testResults: [],
          band: null,
          thesisOptions: [],
          selectedThesis: null,
          negotiation: createSession(lineId, item.id),
          status: 'untouched',
        };
      });

      const dealId = makeId('deal', s.seed, s.spawnCounter);

      // GDD 10 — ilk karşılaşmada kalıcı kayıt açılır. Kayıt açmadan güven
      // yazacak yer olmaz ve müşteri yine yabancı kalırdı.
      const customers = s.customers[head.customer.id]
        ? s.customers
        : {
            ...s.customers,
            [head.customer.id]: createRecord(head.customer, s.market.day, s.spawnCounter),
          };

      // GDD 23.23 intent matrisi — niyet hangi aşama dizisinin kullanılacağını
      // belirler. Servis müşterisi ana ticaret slider'ına ZORLANMAZ (GDD 23.14),
      // alış müşterisi de değerleme akışına zorlanmaz: elinde ürün yoktur,
      // ürünü oyuncu stoktan seçer.
      const intent = head.customer.intent;
      const isService = intent === 'service';
      const isPurchase = intent === 'buy' && !!head.customer.demand;
      // GDD 23.23 beşinci akış — ekspertiz. Müşteri ürününü satmaya değil,
      // ne ettiğini öğrenmeye gelir; ürün hiçbir an dükkânın olmaz.
      const isAppraisal = intent === 'appraisal';
      const firstItem = head.items[0];

      // Servis akışı tanılamayla açılır; ticaret akışı incelemeyle;
      // alış akışı stok seçimiyle.
      const service = isService && firstItem ? createServiceSession() : null;
      if (service && firstItem) {
        service.diagnosis = diagnose(firstItem, s.store.level);
        service.quotes = buildQuotes(
          firstItem,
          service.diagnosis,
          quoteContext(s),
        );
      }

      const purchase =
        isPurchase && head.customer.demand ? createPurchaseSession(head.customer.demand) : null;

      const appraisal: AppraisalSession | null =
        isAppraisal && firstItem
          ? { stance: null, fee: 0, verdict: null, outcome: 'pending' }
          : null;

      // Alış akışında pazarlık tek bir "paket satırı" üzerinden yürür;
      // kalem henüz seçilmediği için itemId boştur ve paket kuruldukça dolar.
      const purchaseLines: DealLine[] =
        purchase && lines.length === 0
          ? [
              {
                lineId: `${head.customer.id}_pkg`,
                itemId: '',
                knowledge: [],
                testResults: [],
                band: null,
                thesisOptions: [],
                selectedThesis: null,
                negotiation: createSession(`${head.customer.id}_pkg`, ''),
                status: 'untouched',
              },
            ]
          : lines;

      set({
        items,
        customers,
        queue: s.queue.slice(1),
        activeCustomer: head.customer,
        activeDeal: {
          dealId,
          customerId: head.customer.id,
          flow: isService
            ? 'service'
            : isPurchase
              ? 'purchase'
              : isAppraisal
                ? 'appraisal'
                : 'trade',
          // Ekspertiz de incelemeyle açılır — akışın ilk adımı "İncele".
          stage: isService ? 'diagnose' : isPurchase ? 'stockPick' : 'inspect',
          activeLineId: purchaseLines[0]?.lineId ?? '',
          lines: purchaseLines,
          service,
          purchase,
          appraisal,
          startedAtSec: s.market.clockMinutes * 60,
          settled: false,
        },
        customerMessage: openingLine(head.customer),
        lastReview: null,
        tab: 'shop',
      });
    },

    // -----------------------------------------------------------------------
    // Servis Kabul akışı (GDD 23.14)
    // -----------------------------------------------------------------------

    selectServiceType: (typeId) => {
      const s = get();
      const deal = s.activeDeal;
      if (!deal?.service) return;
      set({
        activeDeal: {
          ...deal,
          service: { ...deal.service, selectedTypeId: typeId },
        },
      });
    },

    selectServiceVenue: (venue) => {
      const s = get();
      const deal = s.activeDeal;
      if (!deal?.service) return;
      set({
        activeDeal: { ...deal, service: { ...deal.service, selectedVenue: venue } },
      });
    },

    setPromiseBuffer: (days) => {
      const s = get();
      const deal = s.activeDeal;
      if (!deal?.service) return;
      const clamped = Math.min(SERVICE.promise.maxBufferDays, Math.max(0, days));
      set({
        activeDeal: {
          ...deal,
          service: { ...deal.service, promiseBufferDays: clamped },
        },
      });
    },

    /**
     * "İşi Kabul Et" — GDD 23.14 "Söz" adımının dock aksiyonu.
     *
     * Parça maliyeti KABUL ANINDA kasadan çıkar; ücret TESLİMDE girer.
     * İkisi de ayrı txId taşır, yani ikisi de idempotenttir (GDD 22.1).
     */
    acceptServiceJob: () => {
      const s = get();
      const deal = s.activeDeal;
      const customer = s.activeCustomer;
      if (!deal?.service || !customer) return;
      if (deal.service.outcome !== 'pending') return;

      const line = activeLine(deal);
      const item = line ? s.items[line.itemId] : undefined;
      if (!item) return;

      const quote = findQuote(
        deal.service.quotes,
        deal.service.selectedTypeId,
        deal.service.selectedVenue,
      );
      if (!quote || quote.blockedReason) return;

      if (quote.partsCost > s.store.cash) {
        pushToast(set, get, 'Parça maliyeti için yeterli nakit yok.', 'negative');
        return;
      }

      const job = createServiceJob({
        rootSeed: s.seed,
        jobIndex: s.jobCounter,
        item,
        customerId: customer.id,
        customerName: customer.displayName,
        quote,
        today: s.market.day,
        promiseBufferDays: deal.service.promiseBufferDays,
      });

      const tx: SettlementTransaction = {
        txId: `service_accept_${job.jobId}`,
        dealId: deal.dealId,
        day: s.market.day,
        cashDelta: -quote.partsCost,
        itemsIn: [],
        itemsOut: [],
        trustDelta: 0,
        reputationDelta: 0,
        xpDelta: SERVICE.xpOnAccept,
        label: `${quote.label} · parça maliyeti`,
      };

      const outcome = applyTransaction(economyOf(s), tx);
      if (!outcome.applied) return;

      // Ürün müşteride değil artık atölyededir.
      const items = { ...outcome.state.items, [item.id]: { ...item, location: 'workshop' as const } };

      set({
        ...economyToState({ ...outcome.state, items }),
        jobs: [...s.jobs, job],
        jobCounter: s.jobCounter + 1,
        activeDeal: {
          ...deal,
          stage: 'jobQueue',
          service: { ...deal.service, createdJobId: job.jobId, outcome: 'accepted' },
        },
        customerMessage: `Anlaştık. ${job.promisedDay}. gün için sözünüzü aldım.`,
      });
    },

    declineServiceJob: () => {
      const s = get();
      const deal = s.activeDeal;
      if (!deal?.service) return;
      set({
        activeDeal: {
          ...deal,
          stage: 'jobQueue',
          service: { ...deal.service, outcome: 'declined' },
        },
        customerMessage: 'Peki, başka yere bakayım.',
      });
    },

    /**
     * Biten işi müşteriye teslim eder.
     *
     * GDD 22.4 — "Servis net katkısı: Ücret − parça − dış usta − tazmin."
     * GDD EK F — "Servis işi duplicate completion üretmiyor": txId iş kimliğini
     * taşır ve `result: 'delivered'` ikinci teslimi baştan engeller.
     */
    deliverJob: (jobId) => {
      const s = get();
      const job = s.jobs.find((j) => j.jobId === jobId);
      if (!job) return;
      if (job.result === 'pending' || job.result === 'delivered') return;

      const item = s.items[job.itemId];
      if (!item) return;

      const delivery = resolveDelivery(job, item, s.market.day);

      const tx: SettlementTransaction = {
        txId: `service_deliver_${job.jobId}`,
        dealId: job.jobId,
        day: s.market.day,
        cashDelta: delivery.cashDelta,
        itemsIn: [],
        itemsOut: [],
        trustDelta: delivery.trustDelta,
        reputationDelta: delivery.reputationDelta,
        xpDelta: delivery.succeeded ? SERVICE.xpOnDelivery : 0,
        label: `${job.itemName} · servis teslimi`,
      };

      const outcome = applyTransaction(economyOf(s), tx);
      if (!outcome.applied) return;

      // Başarılı serviste ürünün kondisyonu gerçekten iyileşir.
      const servicedItem = applyServiceToItem(item, job);
      const items = {
        ...outcome.state.items,
        [item.id]: { ...servicedItem, location: 'customer' as const },
      };

      // Servis geliri GERÇEKLEŞMİŞ katkıdır — iş tamamlandı ve teslim edildi.
      const ledger = realizeProfit(outcome.state.ledger, delivery.cashDelta, 0);

      set({
        ...economyToState({ ...outcome.state, items, ledger }),
        toasts: s.toasts.filter((toast) => !toast.text.includes('servis işi teslime hazır')),
        jobs: s.jobs.map((j) =>
          j.jobId === jobId ? { ...j, result: 'delivered' as const } : j,
        ),
        lastServiceDelivery: {
          jobId: job.jobId,
          jobName: `${getServiceType(job.type).label} · ${job.itemName}`,
          customerName: job.customerName,
          succeeded: delivery.succeeded,
          fee: delivery.succeeded ? job.fee : 0,
          compensation: delivery.succeeded ? 0 : job.compensation,
          cashDelta: delivery.cashDelta,
          netContribution: delivery.netContribution,
          trustDelta: delivery.trustDelta,
          reputationDelta: delivery.reputationDelta,
          risk: job.risk,
          message: delivery.message,
        },
      });

      pushToast(set, get, delivery.message, delivery.succeeded ? 'positive' : 'negative');
    },

    dismissServiceDelivery: () => set({ lastServiceDelivery: null }),

    // -----------------------------------------------------------------------
    // Ekspertiz / danışma akışı (GDD 23.23 · İncele → Test → Rapor/Ücret → Sonuç)
    // -----------------------------------------------------------------------

    /**
     * Rapor duruşunu seçer ve ücreti o duruşun önerisine çeker.
     *
     * Ücret duruşa BAĞLI olduğu için duruş değişince öneri de değişmelidir;
     * aksi hâlde oyuncu "Temkinli"nin ücretiyle "Kesin"in itibar kazancını
     * alırdı. Oyuncu isterse öneriyi sonra elle değiştirir.
     */
    selectStance: (stance) => {
      const s = get();
      const deal = s.activeDeal;
      if (!deal?.appraisal || deal.appraisal.outcome !== 'pending') return;

      const line = activeLine(deal);
      const band = line?.band;
      if (!band) return;

      set({
        activeDeal: {
          ...deal,
          appraisal: { ...deal.appraisal, stance, fee: suggestedFee(band, stance) },
        },
      });
    },

    setAppraisalFee: (fee) => {
      const s = get();
      const deal = s.activeDeal;
      if (!deal?.appraisal || deal.appraisal.outcome !== 'pending') return;
      const { stance } = deal.appraisal;
      if (!stance) return;

      const line = activeLine(deal);
      const band = line?.band;
      if (!band) return;

      const bounds = feeBounds(band, stance);
      const clamped = Math.round(clamp(fee, bounds.min, bounds.max));
      set({ activeDeal: { ...deal, appraisal: { ...deal.appraisal, fee: clamped } } });
    },

    /**
     * Raporu verir ve sonucu bağlar (GDD 23.23 "Sonuç").
     *
     * GDD 22.1 — ücret tek settlement kapısından geçer. GDD 34.3 — sonuç
     * belirlenimlidir: aynı rapor ve aynı ücret her zaman aynı cevabı alır,
     * bu yüzden reddedilen bir ücreti tekrar denemek diye bir şey yoktur.
     * `outcome !== 'pending'` kapısı çift dokunuşu da baştan keser.
     */
    issueReport: () => {
      const s = get();
      const deal = s.activeDeal;
      const customer = s.activeCustomer;
      if (!deal?.appraisal || !customer) return;
      if (deal.appraisal.outcome !== 'pending') return;

      const { stance, fee } = deal.appraisal;
      if (!stance) return;

      const line = activeLine(deal);
      const item = line ? s.items[line.itemId] : undefined;
      if (!line || !item || !line.band) return;

      const verdict = resolveAppraisal({
        item,
        market: s.market,
        customer,
        band: line.band,
        stance,
        fee,
        testsUsed: line.testResults.length,
      });

      const tx = appraisalTransaction({
        dealId: deal.dealId,
        day: s.market.day,
        verdict,
        // Ekspertizde XP emeğin ve doğruluğun karşılığıdır; marj yoktur çünkü
        // alınıp satılan bir mal yoktur.
        xpDelta: xpForDeal({
          testsUsed: line.testResults.length,
          confidence: line.band.confidence,
          margin: verdict.accurate ? 0.1 : 0,
        }),
      });

      const outcome = applyTransaction(economyOf(s), tx);
      if (!outcome.applied) return;

      // Ücret gerçekleşmiş katkıdır: iş bitti, rapor teslim edildi.
      const ledger = verdict.paid
        ? realizeProfit(outcome.state.ledger, verdict.fee, 0)
        : outcome.state.ledger;

      // GDD 6.6 — ürün müşteriyle gider. Stoğa hiçbir an girmez.
      set({
        ...economyToState({ ...outcome.state, ledger }),
        activeCustomer: { ...customer, trust: clamp(customer.trust + verdict.trustDelta, 0, 100) },
        activeDeal: {
          ...deal,
          stage: 'result',
          settled: true,
          appraisal: { ...deal.appraisal, verdict, outcome: 'reported' },
        },
        customerMessage: verdict.summary,
      });

      pushToast(
        set,
        get,
        verdict.paid ? `Ekspertiz ücreti ${fmt(verdict.fee)} alındı.` : 'Müşteri ücreti ödemedi.',
        verdict.paid && verdict.accurate ? 'positive' : verdict.accurate ? 'info' : 'negative',
      );
    },

    /** Oyuncu işi almaz — rapor verilmez, ücret alınmaz, itibar oynamaz. */
    declineAppraisal: () => {
      const s = get();
      const deal = s.activeDeal;
      if (!deal?.appraisal || deal.appraisal.outcome !== 'pending') return;
      set({
        activeDeal: {
          ...deal,
          stage: 'result',
          appraisal: { ...deal.appraisal, outcome: 'declined' },
        },
        customerMessage: 'Anlıyorum, başka bir yere sorayım.',
      });
    },

    setStage: (stage) => {
      const s = get();
      if (!s.activeDeal) return;
      if (!canEnterStage(s, stage)) return;

      // Değerle aşamasına girerken band ve tez seçenekleri hesaplanır.
      const deal = s.activeDeal;
      const lines = deal.lines.map((line) =>
        line.lineId === deal.activeLineId ? refreshLine(s, line) : line,
      );

      set({ activeDeal: { ...deal, stage, lines } });
    },

    setActiveLine: (lineId) => {
      const s = get();
      if (!s.activeDeal) return;
      set({ activeDeal: { ...s.activeDeal, activeLineId: lineId } });
    },

    // -----------------------------------------------------------------------
    runTest: (toolId) => {
      const s = get();
      const deal = s.activeDeal;
      const customer = s.activeCustomer;
      if (!deal || !customer) return;

      const line = activeLine(deal);
      if (!line) return;

      const item = s.items[line.itemId];
      if (!item) return;

      const tool = toolWithSkillBonuses(getTool(toolId), s.skillProgress);
      if (tool.unlockLevel > s.store.level) return;
      if (line.testResults.some((test) => test.toolId === tool.id)) {
        pushToast(set, get, `${tool.name} bu üründe zaten uygulandı.`, 'info');
        return;
      }
      if (tool.cost > s.store.cash) {
        pushToast(set, get, 'Bu test için yeterli nakit yok.', 'negative');
        return;
      }

      const { knowledge, result } = applyTest(
        item,
        tool,
        line.knowledge,
        s.market.clockMinutes * 60,
      );

      // GDD 7 — test müşteri sabrına maliyettir.
      const patienceCost = Math.round(tool.durationSec * PATIENCE_PER_TEST_SECOND);
      const nextCustomer: Customer = {
        ...customer,
        patience: Math.max(0, customer.patience - patienceCost),
        // Çelişkili sonuç oyuncunun şüphesini artırır, müşterininkini değil;
        // müşteri şüphesi yalnız yanlış gerekçeden doğar (GDD 11.5).
      };

      const nextLine: DealLine = {
        ...line,
        knowledge,
        testResults: [...line.testResults, { ...result, patienceCost }],
      };

      // Sarf maliyeti kasadan düşer — tek settlement kapısından geçer.
      let economy = economyOf(get());
      if (tool.cost > 0) {
        const tx: SettlementTransaction = {
          txId: `test_${deal.dealId}_${line.lineId}_${line.testResults.length}_${tool.id}`,
          dealId: deal.dealId,
          day: s.market.day,
          cashDelta: -tool.cost,
          itemsIn: [],
          itemsOut: [],
          trustDelta: 0,
          reputationDelta: 0,
          xpDelta: 0,
          label: `${tool.name} sarf maliyeti`,
        };
        const outcome = applyTransaction(economy, tx);
        economy = outcome.state;
      }

      set({
        ...economyToState(economy),
        activeCustomer: nextCustomer,
        activeDeal: {
          ...deal,
          lines: deal.lines.map((l) => (l.lineId === line.lineId ? refreshLine(get(), nextLine) : l)),
        },
        customerMessage: patienceComment(nextCustomer),
      });
    },

    selectThesis: (channel) => {
      const s = get();
      const deal = s.activeDeal;
      if (!deal) return;
      const line = activeLine(deal);
      if (!line) return;

      set({
        activeDeal: {
          ...deal,
          lines: deal.lines.map((l) =>
            l.lineId === line.lineId ? { ...l, selectedThesis: channel } : l,
          ),
        },
      });
    },

    submitOffer: (amount) => {
      get().negotiationMove({ kind: 'offer', amount, atRound: 0 });
    },

    // -----------------------------------------------------------------------
    // Müşteri alış akışı — Stok seçimi → Değer/Paket → Pazarlık (GDD 23.23)
    // -----------------------------------------------------------------------
    togglePackageItem: (itemId) => {
      const s = get();
      const deal = s.activeDeal;
      const customer = s.activeCustomer;
      if (!deal || !customer || !deal.purchase) return;
      const candidate = s.items[itemId];
      if (!candidate || matchDemand(deal.purchase.demand, candidate) === 'off') {
        pushToast(set, get, 'Bu ürün müşterinin talebiyle eşleşmiyor.', 'negative');
        return;
      }
      if (packageLocked(deal)) {
        pushToast(set, get, 'Pazarlık başladı; paket artık değiştirilemez.', 'negative');
        return;
      }

      const lines = deal.purchase.lines;
      const existing = lines.find((l) => l.itemId === itemId);
      const limit = maxPackageLines(s.store);

      if (!existing && lines.length >= limit) {
        pushToast(set, get, `Bu dükkân kademesinde pakete en fazla ${limit} kalem konur.`, 'negative');
        return;
      }

      // §4.1 — yeni satır talebin gerektirdiği kadar adetle açılır; stok
      // yetmiyorsa olan kadarıyla. Oyuncuyu 40 kez dokunmaya zorlamak
      // "toplu müşteri" fikrini ekranda yalanlardı.
      const next = existing
        ? lines.filter((l) => l.itemId !== itemId)
        : [...lines, { itemId, quantity: openingQuantity(s, deal.purchase, itemId) }];

      applyPackage(set, get, next);
    },

    setPackageQuantity: (itemId, quantity) => {
      const s = get();
      const deal = s.activeDeal;
      if (!deal?.purchase) return;
      if (packageLocked(deal)) return;

      const candidate = s.items[itemId];
      if (!candidate || matchDemand(deal.purchase.demand, candidate) === 'off') return;

      const position = s.inventory.find((p) => p.itemId === itemId);
      if (!position) return;

      // Stokta olmayan adedi satmak stok uydurmaktır (GDD 34.4).
      const capped = Math.max(0, Math.min(position.quantity, deal.purchase.demand.quantity, position.poolId === '24K_GRAM_GOLD_POOL' ? toMg(quantity) / 1000 : Math.floor(quantity)));
      if (capped > 0 && !validQuantity(position, capped)) return;
      const next =
        capped <= 0
          ? deal.purchase.lines.filter((l) => l.itemId !== itemId)
          : deal.purchase.lines.map((l) => (l.itemId === itemId ? { ...l, quantity: capped } : l));

      applyPackage(set, get, next);
    },

    clearPackage: () => {
      const s = get();
      const deal = s.activeDeal;
      if (!deal?.purchase || packageLocked(deal)) return;
      applyPackage(set, get, []);
    },

    negotiationMove: (move) => {
      const s = get();
      const deal = s.activeDeal;
      const customer = s.activeCustomer;
      if (!deal || !customer) return;

      const line = activeLine(deal);
      if (!line) return;
      if (isTerminal(line.negotiation.state)) return;

      const options = line.thesisOptions;
      const isPurchase = deal.flow === 'purchase' && !!deal.purchase;

      // Addendum §3 terminolojisi: alış akışında YÖN terstir — oyuncu satar,
      // müşteri alır. Aynı durum makinesi, farklı eşik yönü.
      // Pazarlık payı ürün sınıfından gelir (product-classes.ts · haggleRoom):
      // sarrafiyede eşik kanal makasına sıkışır, işçilikli üründe band aynen
      // kalır. Çapa, pazarlığın döndüğü kalemin adil değeridir.
      const haggle = haggleContext(deal, line, s);

      const ctx = {
        economicBand: isPurchase ? packagePriceBand(deal.purchase!.lines, s.items, s.market) :
          (s.items[line.itemId] ? customerPriceBand(s.items[line.itemId]!, s.market, 'shopBuys') ?? undefined : undefined),
        customer,
        direction: (isPurchase ? 'shopSells' : 'shopBuys') as TradeSide,
        reputation: s.store.reputation,
        buyCeiling: effectiveCeiling(options, line.selectedThesis),
        purchaseCeiling: isPurchase ? effectivePurchaseCeiling(deal, customer, s) : undefined,
        knowledge: line.knowledge,
        fairValue: haggle.fairValue,
        haggleRoom: haggle.room,
        retailSpread: haggle.retailSpread,
      };

      const { session, response } = applyMove(line.negotiation, ctx, move);

      const nextCustomer: Customer = {
        ...customer,
        patience: clamp(customer.patience + response.patienceDelta, 0, customer.patienceMax),
        trust: clamp(customer.trust + response.trustDelta, 0, 100),
        suspicion: clamp(customer.suspicion + response.suspicionDelta, 0, 100),
      };

      const status: DealLine['status'] =
        session.state === 'ACCEPTED'
          ? 'accepted'
          : session.state === 'REJECTED'
            ? 'rejected'
            : 'offered';

      const nextLines = deal.lines.map((l) =>
        l.lineId === line.lineId ? { ...l, negotiation: session, status } : l,
      );

      const nextDeal: ActiveDeal = {
        ...deal,
        lines: nextLines,
        stage: isTerminal(session.state) && allLinesResolved(nextLines) ? 'result' : deal.stage,
      };

      set({
        activeCustomer: nextCustomer,
        activeDeal: nextDeal,
        customerMessage: response.message,
      });

      if (isTerminal(session.state)) {
        if (isPurchase) settlePurchase(set, get, session.settledPrice ?? 0, session.state);
        else settleLine(set, get, line.lineId);
      }
    },

    // -----------------------------------------------------------------------
    finishDeal: () => {
      const s = get();
      if (
        s.activeDeal?.flow === 'purchase' &&
        s.activeDeal.purchase &&
        s.activeDeal.purchase.lines.length === 0
      ) {
        pushToast(set, get, 'Talep karşılanamadı · stok ve nakit değişmedi.', 'info');
      }
      // GDD 10.2 — ziyaret KAPANIRKEN deftere yazılır. İşlem içinde oynayan
      // güveni kaydetmeden müşteriyi göndermek, güveni ekonomik varlık değil
      // geçici bir sayı yapardı (GDD 10).
      const customers = commitVisit(s);
      const repDelta = visitReputationDelta(s);
      set({
        customers,
        store: repDelta
          ? { ...s.store, reputation: clamp(s.store.reputation + repDelta, 0, 100) }
          : s.store,
        activeDeal: null,
        activeCustomer: null,
        customerMessage: '',
        lastReview: null,
      });
    },

    // -----------------------------------------------------------------------
    // Toptancı — §4.2 toplu bozma, §7 finansman
    // -----------------------------------------------------------------------

    /**
     * §4.2 — sarrafiyeyi toptancıya bozar. Ödeme aynı gün; bu kanalın satış
     * gerekçesi zaten hız ve kesinliktir.
     */
    liquidateToWholesaler: (itemId, quantity, sliceCount) => {
      const s = get();
      const quote = quoteLiquidation(
        { itemId, quantity },
        s.items,
        s.inventory,
        s.market,
        s.store,
        sliceCount,
      );
      if (!quote) return;

      const item = s.items[itemId];
      if (!item) return;

      const tx: SettlementTransaction = {
        // Gün + kalem + adet bazlı kimlik: aynı bozmayı çift tap ikinci kez
        // uygulamaz (GDD 22.1).
        txId: `wsale_${s.market.day}_${itemId}_${quote.quantity}_${s.ledger.transactions.length}`,
        dealId: `wsale_${s.market.day}_${itemId}`,
        day: s.market.day,
        cashDelta: quote.gross,
        itemsIn: [],
        itemsOut: [{ itemId, quantity: quote.quantity }],
        trustDelta: 0,
        reputationDelta: 0,
        xpDelta: 0,
        label: `${quote.quantity} adet ${item.displayName} bozma`,
      };

      const outcome = applyTransaction(economyOf(s), tx);
      if (!outcome.applied) return;

      // GDD 34.5 — kâr SATIŞTA doğar; bozma da bir satıştır.
      const ledger = recordDeal(
        realizeProfit(outcome.state.ledger, quote.gross, quote.costBasis),
        {
          dealId: tx.dealId + `_${s.ledger.deals.length}`,
          customerId: 'wholesaler',
          lineIds: [],
          itemIds: [itemId],
          side: 'sell',
          day: s.market.day,
          clockMinutes: s.market.clockMinutes,
          testsUsed: [],
          estimateBand: { min: quote.gross, max: quote.gross },
          confidence: 'high',
          actualValue: quote.gross,
          offerHistory: [],
          finalState: 'ACCEPTED',
          movesUsed: [],
          thesisAtDeal: 'wholesale',
          price: quote.gross,
          costBasis: quote.costBasis,
          realizedProfit: quote.gross - quote.costBasis,
          units: quote.quantity,
          grams: quote.grams,
          channel: 'wholesaler',
          isBulk: quote.quantity >= PURCHASE.bulkChannelThreshold,
          trustDelta: 0,
          reputationDelta: 0,
          reviewData: {
            missedSignals: [],
            keyDecisionPoint: `${quote.slices.length} dilimde bozuldu.`,
            alternativeChannelNote: quote.rationale,
          },
        },
      );

      const revalued = revalueInventory(
        outcome.state.inventory,
        outcome.state.items,
        thesisContext(get()),
      );
      set(economyToState({ ...outcome.state, inventory: revalued, ledger }));

      const profit = quote.gross - quote.costBasis;
      pushToast(
        set,
        get,
        `${quote.quantity} adet bozuldu · ${fmt(quote.gross)} · ${fmt(profit)} kâr`,
        profit >= 0 ? 'positive' : 'negative',
      );
    },

    /** Three canonical cash-only counter families; transaction revalidates quote, cash and physical space. */
    buyPoolStock: (templateId, quantity) => {
      const s = get();
      const quote = poolSupplyQuote(templateId, quantity, s.market, s.store);
      if (!quote) return;
      const id = `poolbuy_${s.market.day}_${s.ledger.appliedTxIds.length}`;
      const item = { ...poolSupplyItem(templateId), id: `${id}_item`,
        buyCost: quote.totalPrice / quantity, acquiredDay: s.market.day, location: 'backStock' as const };
      const outcome = applyTransaction({ ...economyOf(s), market: s.market }, {
        txId: id, dealId: id, day: s.market.day, cashDelta: -quote.totalPrice,
        poolPurchase: { quantity }, itemsIn: [item], itemsOut: [],
        trustDelta: 0, reputationDelta: 0, xpDelta: 0, label: `${item.displayName} ortak havuz tedariki`,
      });
      if (!outcome.applied) { pushToast(set, get, outcome.reason ?? 'Alım uygulanamadı.', 'negative'); return; }
      set(economyToState({ ...outcome.state, inventory: revalueInventory(outcome.state.inventory, outcome.state.items, thesisContext(s)) }));
      writeSave(get());
      pushToast(set, get, `Sarrafiye alındı · ${fmt(quote.totalPrice)}`, 'positive');
    },
    /**
     * §7 — other wholesale routes retain their existing financed lot system.
     * It is deliberately separate from the three-family cash counter above.
     */
    buyFromWholesaler: (templateId, quantity) => {
      const s = get();
      const probe = spawnItem(s.seed, s.spawnCounter * 100 + 7, templateId);
      // Fiyat İSTENEN adetle hesaplanır. supplyLots() kendi "bugün sığan"
      // adedini kullandığı için ekranda gösterilen tutarla tahsil edilen
      // tutar ayrışıyordu — hacim makasa girdiği için birim fiyat adede
      // bağlıdır ve iki farklı adet iki farklı fiyat verir.
      const lot = supplyOffer(probe, Math.max(1, Math.round(quantity)), s.market, s.store);
      if (!lot) return;

      const units = lot.quantity;
      const amount = lot.total;
      const terms = financeTerms(s.store, amount, s.market.day);

      if (terms.blockedReason) {
        pushToast(set, get, terms.blockedReason, 'negative');
        return;
      }

      /*
       * SIRA NUMARASI — aynı ürünü iki kez almanın kilitlenmesini önler.
       *
       * Fatura kimliği eskiden `inv_<gün>_<ürün>_<açık fatura sayısı>` idi.
       * Peşin ödemede fatura AÇILMADIĞI için o sayaç kıpırdamıyordu: aynı
       * gün aynı üründen ikinci kez alındığında kimlik birebir aynı çıkıyor
       * ve settlement'in idempotency kapısı işlemi HAKLI OLARAK reddediyordu
       * (oyuncuya "Transaction wbuy_inv_2_gram_gold_1_0 zaten uygulanmış"
       * diye düşüyordu). Kapı doğru çalışıyordu; kusurlu olan kimlikti.
       *
       * Defterdeki uygulanmış işlem sayısı her işlemde artar, kaydedilir ve
       * geri yüklenir — bu yüzden hem tekildir hem determinizmi bozmaz
       * (GDD 28.3 rastgelelik akışıyla ilgilidir, kimliklerle değil).
       */
      const seq = s.ledger.appliedTxIds.length;
      const invoiceId = `inv_${s.market.day}_${templateId}_${seq}`;

      // Her adet ayrı bir kalem olarak girer ve yığın kuralı onları
      // birleştirir (GDD 22.1). Böylece "40 adet" tek pozisyon olur ama
      // maliyet tabanı gerçek birim maliyettir.
      //
      // Kalem kimliği de sıraya bağlıdır: `probe.id` (seed, spawnCounter,
      // ürün) ile sabit olduğu için eski hâlde ikinci alım BİRİNCİNİN
      // kalemlerini ezerdi — applyTransaction gelen kalemi kimliğiyle
      // yazar, aynı kimlik iki kez gelirse ikincisi birincinin üstüne biner.
      const itemsIn: ItemInstance[] = Array.from({ length: units }, (_, i) => ({
        ...spawnItem(s.seed, s.spawnCounter * 100 + 7, templateId),
        id: `${probe.id}_${seq}_${i}`,
        // Vade farkı maliyet tabanına BİNER: finanse edilmiş malın gerçek
        // maliyeti daha yüksektir ve kâr hesabı bunu görmek zorundadır.
        buyCost: (amount + terms.financeCost) / units,
        acquiredDay: s.market.day,
        location: 'backStock' as const,
      }));

      const tx: SettlementTransaction = {
        txId: `wbuy_${invoiceId}`,
        dealId: `wbuy_${invoiceId}`,
        day: s.market.day,
        // Vadeye yazılan kısım bugün kasadan ÇIKMAZ.
        cashDelta: -terms.fromCash,
        itemsIn,
        itemsOut: [],
        trustDelta: 0,
        reputationDelta: 0,
        xpDelta: 0,
        label: `${units} adet ${lot.displayName} tedariki`,
      };

      const outcome = applyTransaction(economyOf(s), tx);
      if (!outcome.applied) {
        // `outcome.reason` işlem kimliğini taşıyan GELİŞTİRİCİ metnidir;
        // oyuncuya gösterilmez (v1.1 §7 — iç isimler ekrana çıkmaz).
        pushToast(set, get, 'Tedarik uygulanamadı.', 'negative');
        return;
      }

      const withInvoice =
        terms.totalDue > 0
          ? openInvoice(outcome.state.store.supplier, {
              id: invoiceId,
              amount: terms.totalDue,
              dueDay: terms.dueDay,
            })
          : outcome.state.store.supplier;

      const supplier = tradeTrustAfterPurchase(withInvoice, amount, creditLimit(s.store));

      const revalued = revalueInventory(
        outcome.state.inventory,
        outcome.state.items,
        thesisContext(get()),
      );
      set(
        economyToState({
          ...outcome.state,
          store: { ...outcome.state.store, supplier },
          inventory: revalued,
        }),
      );

      pushToast(
        set,
        get,
        terms.financed > 0
          ? `${units} adet alındı · ${fmt(terms.fromCash)} peşin, ${fmt(terms.totalDue)} ${terms.dueDay}. güne vadeli`
          : `${units} adet alındı · ${fmt(amount)} peşin`,
        'info',
      );
    },

    /** §7 "Kullanılan limit, geri ödeme ile serbestleşir." */
    repaySupplier: (invoiceId) => {
      const s = get();
      const invoice = s.store.supplier.openInvoices.find((i) => i.id === invoiceId);
      if (!invoice) return;
      if (invoice.amount > s.store.cash) {
        pushToast(set, get, 'Vadeyi kapatacak nakit yok.', 'negative');
        return;
      }

      const tx: SettlementTransaction = {
        txId: `repay_${invoiceId}`,
        dealId: `repay_${invoiceId}`,
        day: s.market.day,
        cashDelta: -invoice.amount,
        itemsIn: [],
        itemsOut: [],
        trustDelta: 0,
        reputationDelta: 0,
        xpDelta: 0,
        label: 'Toptancı vadesi ödemesi',
      };

      const outcome = applyTransaction(economyOf(s), tx);
      if (!outcome.applied) return;

      const { supplier, onTime } = repayInvoice(
        outcome.state.store.supplier,
        invoiceId,
        s.market.day,
      );
      set(
        economyToState({
          ...outcome.state,
          store: { ...outcome.state.store, supplier },
        }),
      );

      pushToast(
        set,
        get,
        onTime
          ? `Vade kapandı · güven ${supplier.trust}/100`
          : `Vade GECİKMELİ kapandı · güven ${supplier.trust}/100`,
        onTime ? 'positive' : 'negative',
      );
    },

    // -----------------------------------------------------------------------
    // Esnaf ağı — §8
    // -----------------------------------------------------------------------

    /** §8 "Altın bozdurma: oyuncu uygun esnafta sarrafiyeyi nakde çevirebilir." */
    liquidateToNetwork: (memberId, itemId, quantity) => {
      const s = get();
      const member = s.network.find((m) => m.id === memberId);
      if (!member) return;

      const offer = networkLiquidationOffer(
        member,
        itemId,
        quantity,
        s.items,
        s.inventory,
        s.market,
      );
      if (!offer || offer.quantity <= 0) {
        pushToast(set, get, offer?.shortfallReason ?? 'Bu esnaf bu işi alamıyor.', 'negative');
        return;
      }

      const item = s.items[itemId];
      if (!item) return;

      const tx: SettlementTransaction = {
        txId: `nsale_${s.market.day}_${memberId}_${itemId}_${s.ledger.transactions.length}`,
        dealId: `nsale_${s.market.day}_${memberId}_${itemId}`,
        day: s.market.day,
        cashDelta: offer.total,
        itemsIn: [],
        itemsOut: [{ itemId, quantity: offer.quantity }],
        trustDelta: 0,
        reputationDelta: 0,
        xpDelta: 0,
        label: `${offer.quantity} adet ${item.displayName} · ${member.displayName}`,
      };

      const outcome = applyTransaction(economyOf(s), tx);
      if (!outcome.applied) return;

      const ledger = recordDeal(
        realizeProfit(outcome.state.ledger, offer.total, offer.costBasis),
        {
          dealId: `${tx.dealId}_${s.ledger.deals.length}`,
          customerId: memberId,
          lineIds: [],
          itemIds: [itemId],
          side: 'sell',
          day: s.market.day,
          clockMinutes: s.market.clockMinutes,
          testsUsed: [],
          estimateBand: { min: offer.total, max: offer.total },
          confidence: 'high',
          actualValue: offer.total,
          offerHistory: [],
          finalState: 'ACCEPTED',
          movesUsed: [],
          thesisAtDeal: null,
          price: offer.total,
          costBasis: offer.costBasis,
          realizedProfit: offer.total - offer.costBasis,
          units: offer.quantity,
          grams: offer.grams,
          channel: 'tradeNetwork',
          isBulk: false,
          trustDelta: 0,
          reputationDelta: 0,
          reviewData: {
            missedSignals: [],
            keyDecisionPoint: `${member.displayName} ile bozuldu.`,
            alternativeChannelNote: offer.shortfallReason ?? 'Ağ kapasitesi yetti.',
          },
        },
      );

      const revalued = revalueInventory(
        outcome.state.inventory,
        outcome.state.items,
        thesisContext(get()),
      );

      set({
        ...economyToState({ ...outcome.state, inventory: revalued, ledger }),
        // §8 "Ağ kapasitesi sonludur" — kullanılan kapasite gerçekten azalır.
        network: s.network.map((m) =>
          m.id === memberId ? applyLiquidation(m, offer.total) : m,
        ),
      });

      const profit = offer.total - offer.costBasis;
      pushToast(
        set,
        get,
        `${offer.quantity} adet bozuldu · ${fmt(offer.total)} · ${fmt(profit)} kâr`,
        profit >= 0 ? 'positive' : 'negative',
      );
    },

    /** §8 "Kısa vadeli ticari borç: güven, geçmiş davranış, açık borç ve vade sınırıyla." */
    borrowFromNetwork: (memberId, amount) => {
      const s = get();
      const member = s.network.find((m) => m.id === memberId);
      if (!member) return;

      const offer = networkLoanOffer(member, s.network, amount, s.market.day);
      if (offer.blockedReason) {
        pushToast(set, get, offer.blockedReason, 'negative');
        return;
      }

      // Sıra numarası: aynı gün borç alıp kapatıp yeniden almak kimlik
      // çakıştırıyordu (bkz. buyFromWholesaler'daki aynı sınıf hata).
      const loanId = `nloan_${memberId}_${s.market.day}_${s.ledger.appliedTxIds.length}`;

      const tx: SettlementTransaction = {
        txId: loanId,
        dealId: loanId,
        day: s.market.day,
        cashDelta: offer.amount,
        itemsIn: [],
        itemsOut: [],
        trustDelta: 0,
        reputationDelta: 0,
        xpDelta: 0,
        label: `${member.displayName} · kısa vadeli borç`,
      };

      const outcome = applyTransaction(economyOf(s), tx);
      if (!outcome.applied) return;

      set({
        ...economyToState(outcome.state),
        network: s.network.map((m) =>
          m.id === memberId ? openLoan(m, offer, s.market.day, loanId) : m,
        ),
      });

      pushToast(
        set,
        get,
        `${fmt(offer.amount)} alındı · ${fmt(offer.totalDue)} ${offer.dueDay}. güne`,
        'info',
      );
    },

    repayNetworkLoan: (memberId) => {
      const s = get();
      const member = s.network.find((m) => m.id === memberId);
      if (!member?.loan) return;
      if (member.loan.totalDue > s.store.cash) {
        pushToast(set, get, 'Borcu kapatacak nakit yok.', 'negative');
        return;
      }

      const tx: SettlementTransaction = {
        txId: `nrepay_${member.loan.id}`,
        dealId: `nrepay_${member.loan.id}`,
        day: s.market.day,
        cashDelta: -member.loan.totalDue,
        itemsIn: [],
        itemsOut: [],
        trustDelta: 0,
        reputationDelta: 0,
        xpDelta: 0,
        label: `${member.displayName} · borç ödemesi`,
      };

      const outcome = applyTransaction(economyOf(s), tx);
      if (!outcome.applied) return;

      const { member: next, onTime } = repayLoan(member, s.market.day);
      set({
        ...economyToState(outcome.state),
        network: s.network.map((m) => (m.id === memberId ? next : m)),
      });

      pushToast(
        set,
        get,
        onTime
          ? `${member.displayName} kapandı · ilişki ${next.trust}/100`
          : `${member.displayName} GECİKMELİ kapandı · ilişki ${next.trust}/100`,
        onTime ? 'positive' : 'negative',
      );
    },

    requestDayClose: () => {
      const s = get();
      if (s.dayReportOpen || (s.activeDeal && !isDealFinished(s.activeDeal))) return;
      set({ dayCloseConfirmOpen: true });
    },
    cancelDayClose: () => set({ dayCloseConfirmOpen: false }),
    startNewDay: () => {
      const s = get();
      if (!s.dayReportOpen) return;
      if (!writeSave({ ...s, dayReportOpen: false })) {
        pushToast(set, get, 'Kayıt yazılamadı; gün özeti açık tutuldu.', 'negative'); return;
      }
      set({ dayReportOpen: false });
    },
    advanceDay: () => {
      const s = get();
      if (s.dayReportOpen) return;
      const { state: closed, report, applied } = closeDay(
        economyOf(s),
        s.market.day,
        s.missedGuestCountToday,
        lifestyleDailyExpense(s.playerMarket),
      );
      if (!applied) { pushToast(set, get, 'Günlük gider karşılanamadı; gün kapatılmadı.', 'negative'); return; }
      const nextDay = s.market.day + 1;
      const market = createMarketForDay(s.seed, nextDay, s.market);

      // Stok yaşlanması (GDD 15.3) + yeni günün piyasasına göre yeniden değerleme.
      const aged = closed.inventory.map((p) => ({ ...p, age: p.age + 1 }));
      const inventory = revalueInventory(aged, closed.items, thesisContext({ ...s, market }));

      // GDD 17.3 — her servis işi süre tüketir. Bu ADIM PARA HAREKETİ ÜRETMEZ;
      // gelir yalnız teslimde doğar (GDD 17.4 pasif gelir yasağı).
      const jobs = advanceJobsOneDay(s.jobs);

      // §7 "Gecikme; maliyet, limit, güven veya erişim üzerinde sonuç
      // doğurur." Gecikme yükü borcun kendisine biner ve gün raporunda
      // görünür — geriye dönük veya gizli bir kalem açılmaz.
      const overdue = accrueOverdue(closed.store.supplier, nextDay);
      const store = { ...closed.store, supplier: overdue.supplier };

      // §8 aynı kural ağda da işler; ayrıca esnafın kasası kısmen tazelenir
      // ki ağ kalıcı olarak kurumasın.
      const networkOverdue = accrueNetworkOverdue(s.network, nextDay);
      const network = replenishNetwork(networkOverdue.members);

      // §5 — kapanış pozisyonu ÖNCE ölçülür (gün kapanışı fiyatıyla), sonra
      // ertesi günün fiyatıyla sonucu çözülür. Sıra önemli: pozisyonu yeni
      // fiyatla ölçmek, geceyi hiç yaşamamış gibi göstermek olurdu.
      const position = measurePosition(
        s.market.day,
        closed.store.cash,
        inventory,
        closed.items,
        s.market,
      );
      const overnightOutcome = resolveOvernight(position, market);

      const nextState = {
        ...economyToState({ ...closed, store, inventory }),
        ledger: { ...closed.ledger, realizedProfitToday: 0 },
        jobs,
        market,
        // §3: her günün kendi karakteri var; havuz gün başında yeniden çekilir.
        dayCharacter: dayCharacter(s.seed, market.day, market),
        network,
        overnight: position,
        lastOvernight: overnightOutcome,
        queue: [],
        missedGuestCountToday: 0,
        lastDayReport: { ...report, overnightSummary: overnightOutcome.summary },
        dayCloseConfirmOpen: false,
        dayReportOpen: true,
        activeCustomer: null,
        activeDeal: null,
        nextCustomerAtMinutes: DAY.openMinutes + 3,
        customerRushUntilMinutes: null,
      };

      // Gün değişimi ekrana uygulanmadan önce checkpoint'in gerçekten
      // yazılabildiğini doğrula. Kayıt başarısızsa oyuncu eski günde kalır;
      // sessiz ilerleme kaybı yerine güvenle tekrar deneyebilir.
      if (!writeSave({ ...s, ...nextState } as GameState)) {
        pushToast(set, get, 'Gün kapatılamadı: kayıt doğrulanamadı. Tekrar deneyin.', 'negative');
        return;
      }

      set(nextState);

      pushToast(
        set,
        get,
        `Gün ${report.day} kapandı · Gerçekleşmiş kâr ${fmt(report.realizedTradeProfit)} · Gider ${fmt(report.overhead)}`,
        report.netCashChange >= 0 ? 'positive' : 'negative',
      );

      // §5 — gecelik pozisyonun sonucu. GDD 34.5: bu sayı gerçekleşmiş kâra
      // YAZILMAZ; mal hâlâ stokta, fırsat maliyeti ise hiç var olmamış bir para.
      if (Math.abs(overnightOutcome.spotChange) >= 0.0005) {
        pushToast(set, get, overnightOutcome.summary, 'info');
      }

      if (networkOverdue.penalty > 0) {
        pushToast(
          set,
          get,
          `${networkOverdue.lateMembers.length} esnaf borcu gecikti · ${fmt(networkOverdue.penalty)} yük`,
          'negative',
        );
      }

      if (overdue.penalty > 0) {
        pushToast(
          set,
          get,
          `${overdue.overdueIds.length} vade gecikti · ${fmt(overdue.penalty)} gecikme yükü`,
          'negative',
        );
      }

      const ready = jobs.filter((j) => j.result === 'success' || j.result === 'failed').length;
      if (ready > 0) {
        pushToast(set, get, `${ready} servis işi teslime hazır — Atölye'ye bak.`, 'info');
      }
    },

    // -----------------------------------------------------------------------
    // Mağaza büyümesi (GDD 19)
    // -----------------------------------------------------------------------
    upgradeStore: () => {
      const s = get();
      const evaluation = evaluateUpgrade(
        s.store,
        growthSnapshot(economyOf(s), Object.keys(s.customers).length),
      );

      if (!evaluation.next || !evaluation.ready) {
        pushToast(set, get, evaluation.blockedReason ?? 'Mağaza yükseltmeye hazır değil.', 'negative');
        return;
      }

      const next = evaluation.next;

      // GDD 22.1 — kasa hareketi TEK yoldan geçer. Yükseltme de bir işlemdir;
      // doğrudan cash'e yazmak settlement garantisini delerdi.
      const tx: SettlementTransaction = {
        txId: `upgrade_tier_${next.tier}`,
        dealId: `upgrade_tier_${next.tier}`,
        day: s.market.day,
        cashDelta: -next.investment,
        itemsIn: [],
        itemsOut: [],
        trustDelta: 0,
        reputationDelta: 0,
        xpDelta: 0,
        label: `${next.name} yatırımı`,
      };

      const outcome = applyTransaction(economyOf(s), tx);
      if (!outcome.applied) {
        // Teknik gerekçe oyuncuya gösterilmez; bkz. buyFromWholesaler.
        pushToast(set, get, 'Yükseltme uygulanamadı.', 'negative');
        return;
      }

      set(economyToState({ ...outcome.state, store: applyTierGrants(outcome.state.store, next) }));

      pushToast(
        set,
        get,
        `${next.name} açıldı · günlük gider ${fmt(next.grants.dailyOverhead)}`,
        'positive',
      );
    },

    // -----------------------------------------------------------------------
    // Kayıt (GDD 28.1 · Addendum §11)
    // -----------------------------------------------------------------------
    saveGame: () => writeSave(get()),

    loadGame: () => {
      const loaded = readSave();
      if (!loaded) return false;
      set(loaded);
      pushToast(set, get, `Kayıt yüklendi · Gün ${loaded.market.day}`, 'info');
      return true;
    },

    resetGame: () => {
      clearSave();
      pushToast(set, get, 'Kayıt silindi. Yeni oyun bir sonraki açılışta başlar.', 'info');
    },

    notify: (text, tone) => pushToast(set, get, text, tone),

    dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  };
});

// ---------------------------------------------------------------------------
// Settlement köprüsü
// ---------------------------------------------------------------------------

/**
 * Bir kalemin terminal sonucunu ekonomiye yazar.
 *
 * GDD 12.3 / 22.1 — settlement KALEM BAZINDADIR ve txId kalem kimliğini taşır.
 * Aynı kalem iki kez settle edilemez; bir kalemin reddi diğerinin cost basis'ini
 * bozmaz.
 */
function settleLine(
  set: (partial: Partial<GameState>) => void,
  get: () => GameState,
  lineId: string,
): void {
  const s = get();
  const deal = s.activeDeal;
  const customer = s.activeCustomer;
  if (!deal || !customer) return;

  const line = deal.lines.find((l) => l.lineId === lineId);
  if (!line) return;

  const item = s.items[line.itemId];
  const band = line.band;
  if (!item || !band) return;

  const accepted = line.negotiation.state === 'ACCEPTED';
  const price = line.negotiation.settledPrice ?? 0;

  // --- Vaka özeti (GDD 22.3) — işlem kapandıktan SONRA üretilir ---
  const review = buildCaseReview({
    item,
    market: s.market,
    band,
    price,
    accepted,
    testsUsed: line.testResults.map((r) => r.toolId),
    selectedThesis: line.selectedThesis,
    thesisOptions: line.thesisOptions,
  });

  let economy = economyOf(s);

  if (accepted) {
    const stored: ItemInstance = {
      ...item,
      buyCost: price,
      acquiredDay: s.market.day,
      thesis: line.selectedThesis,
      location: 'backStock',
    };

    const actual = trueValue(item, s.market);
    const margin = price > 0 ? (actual - price) / price : 0;

    const tx: SettlementTransaction = {
      // Kalem bazlı benzersiz kimlik → çift tap ve reload koruması.
      txId: `settle_${deal.dealId}_${line.lineId}`,
      dealId: deal.dealId,
      day: s.market.day,
      cashDelta: -price,
      itemsIn: [stored],
      itemsOut: [],
      trustDelta: 0,
      reputationDelta: Math.round(
        (customer.trust - 50) / 50 * 2,
      ),
      xpDelta: xpForDeal({
        testsUsed: line.testResults.length,
        confidence: band.confidence,
        margin,
      }),
      label: `${item.displayName} alımı`,
    };

    const outcome = applyTransaction(economy, tx);
    if (!outcome.applied) {
      // Zaten uygulanmış — sessizce çık. Bu, GDD 22.1'in "çift tap ikinci
      // işlem oluşturmaz" garantisinin çalıştığı yerdir.
      set({ lastReview: review });
      return;
    }
    economy = outcome.state;
  }

  // --- DealRecord (GDD 22.2) ---
  const record: DealRecord = {
    dealId: `${deal.dealId}_${line.lineId}`,
    customerId: customer.id,
    lineIds: [line.lineId],
    itemIds: [item.id],
    side: 'buy',
    day: s.market.day,
    clockMinutes: s.market.clockMinutes,
    testsUsed: line.testResults.map((r) => r.toolId),
    estimateBand: { min: band.min, max: band.max },
    confidence: band.confidence,
    actualValue: trueValue(item, s.market),
    offerHistory: line.negotiation.offerHistory,
    finalState: line.negotiation.state,
    movesUsed: line.negotiation.moveHistory.map((m) => m.kind),
    thesisAtDeal: line.selectedThesis,
    price,
    costBasis: accepted ? price : 0,
    // Alış tarafı tek kalemdir; §4.1 telemetrisi satış tarafında iş görür.
    units: 1,
    grams: gramsFor(item, 1),
    channel: null,
    isBulk: false,
    // GDD 34.5 — alışta realize kâr YOKTUR; kâr satışta doğar.
    realizedProfit: null,
    trustDelta: 0,
    reputationDelta: 0,
    reviewData: toReviewData(review),
  };

  economy = { ...economy, ledger: recordDeal(economy.ledger, record) };

  const revalued = revalueInventory(economy.inventory, economy.items, thesisContext(get()));
  set({ ...economyToState({ ...economy, inventory: revalued }), lastReview: review });
}

/** Pazarlık başladıysa paket kilitlidir (GDD 34.2 tavanı yeniden zar atılamaz). */
function packageLocked(deal: ActiveDeal): boolean {
  return deal.lines.some((l) => l.negotiation.offerHistory.length > 0);
}

/**
 * §4.1 — bir satır pakete ilk konduğunda kaç adetle açılır.
 * Talebin eksiği kadar, stokta olanı aşmadan. Toplu müşteriye tek tek adet
 * eklettirmek, "ayrı hacim bandı" fikrini arayüzde geçersiz kılardı.
 */
function openingQuantity(s: GameState, purchase: PurchaseSession, itemId: string): number {
  const position = s.inventory.find((p) => p.itemId === itemId);
  if (!position) return 1;
  const missing = Math.max(0, purchase.demand.quantity - purchase.units);
  return Math.max(0, Math.min(position.quantity, missing));
}

/** Paketi yeniden fiyatlayıp state'e yazar — tek giriş noktası. */
function applyPackage(
  set: (partial: Partial<GameState>) => void,
  get: () => GameState,
  lines: PackageLine[],
): void {
  const s = get();
  const deal = s.activeDeal;
  const customer = s.activeCustomer;
  if (!deal?.purchase || !customer) return;

  const purchase = repricePackage(deal.purchase, lines, s.items, s.inventory, customer, s.market);
  set({
    activeDeal: {
      ...deal,
      purchase,
      lines: syncPackageLine(deal.lines, purchase.lines.map((l) => l.itemId)),
    },
  });
}

/**
 * Paket satırının itemId'sini seçimle senkron tutar. Pazarlık satırı tek
 * kalırken temsil ettiği kalemler değişebilir; ilk kalem "yüz" olur.
 */
function syncPackageLine(lines: DealLine[], itemIds: string[]): DealLine[] {
  if (lines.length === 0) return lines;
  return lines.map((l, i) => (i === 0 ? { ...l, itemId: itemIds[0] ?? '' } : l));
}

/**
 * Müşterinin bu PAKET için ödeme tavanı (GDD 6.6: asla gösterilmez).
 *
 * Oranı spawn anında sabittir (GDD 34.2); TL karşılığı paketten türer.
 * Yanlış mal sunmak tavanı düşürür — §9'un "her koşulda en iyi sonuç yok"
 * ilkesinin müşteri tarafındaki karşılığı.
 */
function effectivePurchaseCeiling(deal: ActiveDeal, customer: Customer, s: GameState): Money {
  const purchase = deal.purchase;
  if (!purchase) return customer.reservationPrice;

  const base = purchaseCeiling(customer, purchase.packageFairValue);

  // Kısmi karşılama müşteriyi tam memnun etmez: §4.1 "kısmen karşılanabilir"
  // demek "aynı parayı öder" demek değildir.
  const fulfilmentFactor =
    purchase.fulfilment === 'full' ? 1 : purchase.fulfilment === 'partial' ? 0.94 : 0.8;

  // Yanlış mal sunmak tavanı düşürür (§9 — hiçbir seçim her koşulda en iyi
  // sonucu vermez).
  const { ceilingMultiplier } = packageFitPenalty(purchase.demand, purchase.lines, s.items);

  return Math.round(base * fulfilmentFactor * ceilingMultiplier);
}

/**
 * Müşteri alış işleminin settlement'i — GDD 22.1'in TEK yazma yolu.
 *
 * GDD 34.5: kâr SATIŞTA doğar. Alışta realize kâr yoktu; burada vardır ve
 * paketin maliyet tabanına göre hesaplanır.
 */
function settlePurchase(
  set: (partial: Partial<GameState>) => void,
  get: () => GameState,
  price: Money,
  state: NegotiationState,
): void {
  const s = get();
  const deal = s.activeDeal;
  const customer = s.activeCustomer;
  if (!deal || !customer || !deal.purchase) return;

  const purchase = deal.purchase;
  // Son güvenlik kapısı: bozuk/eski bir arayüz durumu yanlış ürünü
  // transaction katmanına taşısa bile stok ve para değişmez.
  if (purchase.lines.some((line) => {
    const item = s.items[line.itemId];
    return !item || matchDemand(purchase.demand, item) === 'off';
  })) return;
  const accepted = state === 'ACCEPTED' && price > 0;
  if (accepted && (purchase.fulfilment === 'none' || purchase.units > purchase.demand.quantity)) return;

  let economy = economyOf(s);

  if (accepted) {
    const soldItems = purchase.lines
      .map((l) => s.items[l.itemId])
      .filter((it): it is ItemInstance => !!it);

    const tx: SettlementTransaction = {
      // Paket bazlı benzersiz kimlik → çift tap ve reload koruması (GDD 22.1).
      txId: `sale_${deal.dealId}`,
      targetInventoryItemId: purchase.demand.targetInventoryItemId,
      dealId: deal.dealId,
      day: s.market.day,
      cashDelta: price,
      itemsIn: [],
      itemsOut: purchase.lines.map((l) => ({ itemId: l.itemId, quantity: l.quantity })),
      trustDelta: 0,
      reputationDelta: Math.round(((customer.trust - 50) / 50) * 2),
      xpDelta: xpForDeal({
        testsUsed: 0,
        confidence: 'high',
        margin: purchase.packageCost > 0 ? (price - purchase.packageCost) / purchase.packageCost : 0,
      }),
      label:
        purchase.units > soldItems.length
          ? `${purchase.units} adet sarrafiye satışı`
          : `${soldItems.length} kalem satışı`,
    };

    const outcome = applyTransaction(economy, tx);
    if (!outcome.applied) return;

    economy = {
      ...outcome.state,
      // GDD 34.5 — gerçekleşmiş kâr TAM BURADA doğar, başka hiçbir yerde.
      ledger: realizeProfit(outcome.state.ledger, price, purchase.packageCost),
    };
  }

  const record: DealRecord = {
    dealId: `${deal.dealId}_pkg`,
    customerId: customer.id,
    lineIds: deal.lines.map((l) => l.lineId),
    itemIds: purchase.lines.map((l) => l.itemId),
    side: 'sell',
    day: s.market.day,
    clockMinutes: s.market.clockMinutes,
    testsUsed: [],
    estimateBand: { min: purchase.packageFairValue, max: purchase.packageFairValue },
    // Alış akışında ürün oyuncunun kendi stoğudur; gerçeği zaten bilinir.
    confidence: 'high',
    actualValue: purchase.packageFairValue,
    offerHistory: deal.lines[0]?.negotiation.offerHistory ?? [],
    finalState: state,
    movesUsed: deal.lines[0]?.negotiation.moveHistory.map((m) => m.kind) ?? [],
    thesisAtDeal: null,
    price: accepted ? price : 0,
    costBasis: accepted ? purchase.packageCost : 0,
    realizedProfit: accepted ? price - purchase.packageCost : null,
    // §4.1 — adet, gram ve kanal ayrı ölçülür ki toplu işlem tekil müşteri
    // ortalamasını şişirmesin.
    units: purchase.units,
    grams: packageGrams(purchase.lines, s.items),
    channel: purchase.channel,
    isBulk: purchase.demand.isBulk,
    trustDelta: 0,
    reputationDelta: 0,
    reviewData: {
      missedSignals: [],
      keyDecisionPoint:
        purchase.fulfilment === 'partial'
          ? 'Talep kısmen karşılandı; müşteri eksik adede razı oldu.'
          : 'Paket talebi tam karşıladı.',
      alternativeChannelNote: `${CHANNEL_LABEL_TR[purchase.channel]} alış-satış farkıyla fiyatlandı.`,
    },
  };

  economy = { ...economy, ledger: recordDeal(economy.ledger, record) };

  const revalued = revalueInventory(economy.inventory, economy.items, thesisContext(get()));
  set({
    ...economyToState({ ...economy, inventory: revalued }),
    activeDeal: { ...deal, settled: true },
  });
}

/**
 * GDD 10.2 — ziyaretin deftere yazılması.
 *
 * Ne yazılır: sonuç (kabul/red/çıkıp gitme/servis), güven değişimi, kısa not
 * ve ciro. Ne yazılmaz: gizli gerçek. Defter oyuncunun da göreceği bir
 * hafızadır; müşterinin bilmediği şeyi taşımaz (GDD 6.6).
 */
function commitVisit(s: GameState): CustomerRegistry {
  const deal = s.activeDeal;
  const customer = s.activeCustomer;
  if (!deal || !customer) return s.customers;

  const record = s.customers[customer.id];
  if (!record) return s.customers;

  const outcome = visitOutcome(deal, customer);
  const volume = dealVolume(deal);

  const visit: VisitRecord = {
    day: s.market.day,
    dealId: deal.dealId,
    outcome,
    // Ziyaretin net güven etkisi: işlem içinde oynayan güvenin defterdeki
    // değere göre farkı.
    trustDelta: customer.trust - record.trust,
    note: visitNote(outcome, volume),
  };

  return { ...s.customers, [customer.id]: recordVisit(record, visit, volume) };
}

/**
 * GDD 10.1 — kişisel güvenin semt itibarına yansıması.
 * "Tek işlem itibarı uçurmaz" (10.4): transfer küçüktür ve yalnız kapanan
 * ziyaretten doğar.
 */
function visitReputationDelta(s: GameState): number {
  const customer = s.activeCustomer;
  const record = customer ? s.customers[customer.id] : undefined;
  if (!customer || !record) return 0;
  return reputationDelta(customer.trust - record.trust);
}

function visitOutcome(deal: ActiveDeal, customer: Customer): VisitRecord['outcome'] {
  if (deal.flow === 'service') {
    return deal.service?.outcome === 'accepted' ? 'serviceBooked' : 'rejected';
  }
  // Ekspertizde "kapandı" demek para değil, RAPOR demektir: ücret
  // reddedilse bile iş yapılmıştır ve ziyaret boşa geçmemiştir.
  if (deal.flow === 'appraisal') {
    return deal.appraisal?.outcome === 'reported' ? 'accepted' : 'rejected';
  }
  // Sabrı bitip çıkan müşteri, fiyatı beğenmeyip redden ayrı tutulur:
  // GDD 10.4 ciddi olayları daha ağır sayar.
  if (customer.patience <= 0) return 'walkedOut';
  return deal.lines.some((l) => l.negotiation.state === 'ACCEPTED') ? 'accepted' : 'rejected';
}

function dealVolume(deal: ActiveDeal): Money {
  return deal.lines.reduce((sum, l) => sum + (l.negotiation.settledPrice ?? 0), 0);
}

function visitNote(outcome: VisitRecord['outcome'], volume: Money): string {
  switch (outcome) {
    case 'accepted':
      return `İşlem kapandı · ${fmt(volume)}`;
    case 'serviceBooked':
      return 'Servis işi bırakıldı';
    case 'walkedOut':
      return 'Sabrı bitti, çıkıp gitti';
    default:
      return 'Anlaşma olmadı';
  }
}

// ---------------------------------------------------------------------------
// Yardımcılar
// ---------------------------------------------------------------------------

function economyOf(s: GameState): EconomyState {
  return { store: s.store, inventory: s.inventory, items: s.items, ledger: s.ledger, market: s.market };
}

function economyToState(e: EconomyState): Pick<GameState, 'store' | 'inventory' | 'items' | 'ledger'> {
  return { store: e.store, inventory: e.inventory, items: e.items, ledger: e.ledger };
}

export function activeLine(deal: ActiveDeal): DealLine | undefined {
  return deal.lines.find((l) => l.lineId === deal.activeLineId);
}

/**
 * Tez bağlamı — oyuncunun kapasitesi ve likiditesi hangi kanalın rasyonel
 * olduğunu değiştirir (GDD 6.4). Tek yerde üretilir ki değerleme ile stok
 * yeniden değerlemesi aynı varsayımları kullansın.
 */
function thesisContext(s: Pick<GameState, 'store' | 'market' | 'inventory'>): ThesisContext {
  return {
    store: s.store,
    market: s.market,
    displayUsed: s.inventory.filter((p) => p.location === 'display').length,
    workshopUsed: s.inventory.filter((p) => p.location === 'workshop').length,
    liquidityRatio: liquidityRatio(s.store.cash, s.inventory),
  };
}

/** Bir kalemin band + tez seçeneklerini güncel bilgiye göre tazeler. */
/**
 * Pazarlığın çapası ve ürün sınıfının pazarlık payı.
 *
 * Ticaret ve ekspertizde kalem tektir. Alış akışında pazarlık bir PAKET
 * üzerinden döner: çapa paketin toplam adil değeri, pay ise paketteki en
 * DAR paydır — içinde çeyrek olan bir pakette çeyreğin fiyatı pazarlıkla
 * uçurulamaz. Pakette hiç kalem yoksa sıkıştırma uygulanmaz.
 */
function haggleContext(
  deal: ActiveDeal,
  line: DealLine,
  s: GameState,
): { fairValue: Money | undefined; room: number; retailSpread: number } {
  const pkg = deal.purchase?.lines ?? [];

  if (deal.flow === 'purchase' && pkg.length > 0) {
    let fair = 0;
    let room = 1;
    let retailSpread = Number.POSITIVE_INFINITY;
    for (const pl of pkg) {
      const item = s.items[pl.itemId];
      if (!item) continue;
      const rules = rulesFor(getTemplate(item.templateId));
      fair += trueValue(item, s.market) * pl.quantity;
      room = Math.min(room, rules.haggleRoom);
      retailSpread = Math.min(retailSpread, rules.retailSpread);
    }
    return fair > 0
      ? { fairValue: fair, room, retailSpread: Number.isFinite(retailSpread) ? retailSpread : 0 }
      : { fairValue: undefined, room: 1, retailSpread: 0 };
  }

  const item = s.items[line.itemId];
  if (!item) return { fairValue: undefined, room: 1, retailSpread: 0 };
  const rules = rulesFor(getTemplate(item.templateId));
  return {
    fairValue: trueValue(item, s.market),
    room: rules.haggleRoom,
    retailSpread: rules.retailSpread,
  };
}

function refreshLine(s: GameState, line: DealLine): DealLine {
  const item = s.items[line.itemId];
  if (!item) return line;

  const band = estimateBand(item, s.market, line.knowledge);
  const ctx = thesisContext(s);
  const options = thesisFor(item, band, ctx);

  return {
    ...line,
    band,
    thesisOptions: options,
    selectedThesis: line.selectedThesis ?? null,
    status: line.status === 'untouched' && line.testResults.length > 0 ? 'appraised' : line.status,
  };
}

/**
 * GDD 23.10.3 — "Aşama Şeridi ileri doğru yalnız gerekli minimum koşullar
 * sağlandığında ilerler. Kilitli adım tıklanamaz."
 * Geri dönmek her zaman serbesttir ve hiçbir şeyi yeniden üretmez (GDD 23.10.3).
 */
export function canEnterStage(s: GameState, stage: WorkbenchStage): boolean {
  const deal = s.activeDeal;
  if (!deal) return false;
  const line = activeLine(deal);
  if (!line) return false;

  // --- Servis Kabul akışı (GDD 23.14) ---
  // Adımlar sırayla açılır: teklif için tanı, söz için seçilmiş bir teklif,
  // kuyruk için verilmiş bir karar gerekir.
  if (deal.flow === 'service') {
    const service = deal.service;
    if (!service) return false;

    switch (stage) {
      case 'diagnose':
        return true;
      case 'quote':
        return service.diagnosis !== null;
      case 'promise':
        return (
          findQuote(service.quotes, service.selectedTypeId, service.selectedVenue) !== null
        );
      case 'jobQueue':
        return service.outcome !== 'pending';
      default:
        // Ticaret aşamaları servis akışında kilitlidir.
        return false;
    }
  }

  // --- Ekspertiz akışı (GDD 23.23 beşinci akış) ---
  // İncele ve Test her zaman açık — GDD 7'nin "bilgi satın alma" kararı
  // oyuncunundur, sistem onu teste zorlamaz ama teste ENGEL de olmaz.
  // Rapor bir değerleme bandı ister: ölçmediğin şey için rapor yazılmaz.
  if (deal.flow === 'appraisal') {
    const appraisal = deal.appraisal;
    if (!appraisal) return false;

    switch (stage) {
      case 'inspect':
      case 'test':
        return true;
      case 'report':
        return line.band !== null;
      case 'result':
        return appraisal.outcome !== 'pending';
      default:
        // Ticaret ve servis aşamaları ekspertiz akışında kilitlidir.
        return false;
    }
  }

  // --- Müşteri alış akışı (GDD 23.23) ---
  // Stok seçimi her zaman açık; paket ekranı en az bir kalem ister;
  // pazarlık, talebin karşılanabilir bir paketle karşılanmasını ister.
  if (deal.flow === 'purchase') {
    const purchase = deal.purchase;
    if (!purchase) return false;

    switch (stage) {
      case 'stockPick':
        return true;
      case 'package':
        return purchase.lines.length > 0;
      case 'negotiate':
        // §4.1: kısmi karşılamayı kabul etmeyen müşteriye eksik paket sunulmaz.
        return purchase.fulfilment !== 'none';
      case 'result':
        return isTerminal(line.negotiation.state);
      default:
        return false;
    }
  }

  if (stage === 'result') return isTerminal(line.negotiation.state);

  // İşlem Akışı Ara Düzeltmesi §2/§4 — akış yoğunluğu ÜRÜNE göre değişir.
  // Standart sarrafiyede zorunlu test zinciri yoktur; oyuncu 1-2 adımda
  // fiyata geçebilir. §8 gereği aşama SİLİNMEZ, yalnız zorunluluğu kalkar:
  // hızlı işlemde de İncele ve Değerle açıktır, sadece bekletmez.
  const item = s.items[line.itemId];
  if (!item) return stage === 'inspect' || stage === 'appraise';

  return stageUnlocked(item, stage, {
    hasBand: line.band !== null,
    hasTests: line.testResults.length > 0,
    hasExitPlan: line.selectedThesis !== null,
  });
}

/** Tez/teklif bağlamı — kapasite ve likidite kararı değiştirir (GDD 6.4 / 17.3). */
export function quoteContext(
  s: Pick<GameState, 'store' | 'market' | 'jobs'>,
): QuoteContext {
  return {
    store: s.store,
    market: s.market,
    workshopLoad: inHouseLoad(s.jobs),
    day: s.market.day,
  };
}

function isDealFinished(deal: ActiveDeal): boolean {
  if (deal.flow === 'service') {
    return deal.stage === 'jobQueue' && deal.service?.outcome !== 'pending';
  }
  return deal.stage === 'result' && allLinesResolved(deal.lines);
}

function allLinesResolved(lines: DealLine[]): boolean {
  return lines.every((l) => isTerminal(l.negotiation.state));
}

function openingLine(customer: Customer): string {
  switch (customer.intent) {
    case 'sell':
      return customer.lineIds.length > 1
        ? 'Birkaç parça getirdim, bakar mısınız?'
        : 'Bunu bozdurmak istiyorum.';
    case 'buy':
      // Talep spawn anında sabittir; müşteri ne aradığını ilk cümlede söyler
      // ki oyuncu stok seçimine bilgiyle girsin (GDD 23.23).
      return customer.demand
        ? `${customer.demand.summary} için geldim.`
        : 'Bir şeye bakıyordum.';
    case 'service':
      return 'Bunun tamiri mümkün mü?';
    case 'appraisal':
      return 'Bunun değerini öğrenmek istiyorum.';
  }
}

function patienceComment(customer: Customer): string {
  const ratio = customer.patience / Math.max(1, customer.patienceMax);
  if (ratio < 0.25) return 'Biraz acelem var, uzattık.';
  if (ratio < 0.5) return 'Peki, bakın bakalım.';
  return 'Buyurun, inceleyin.';
}

// UI-only sequence: never consume the simulation RNG for notification IDs.
let toastSequence = 0;
function pushToast(
  set: (partial: Partial<GameState>) => void,
  get: () => GameState,
  text: string,
  tone: ToastMessage['tone'],
): void {
  const id = `toast_${Date.now()}_${++toastSequence}`;
  set({ toasts: [...get().toasts, { id, text, tone }].slice(-3) });
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function fmt(n: Money): string {
  return `${Math.round(n).toLocaleString('tr-TR')} ₺`;
}

// UI'nin ihtiyaç duyduğu türetilmiş seçiciler.
export const selectors = {
  /** İşlem Akışı §2 — aktif kalemin işlem sınıfı ve akış politikası. */
  flow: (s: GameState) => {
    const line = s.activeDeal ? activeLine(s.activeDeal) : undefined;
    const item = line ? s.items[line.itemId] : undefined;
    return item ? flowPolicy(item) : null;
  },

  /**
   * GDD 25 — öğretim dersinin karar bağlamı.
   *
   * Ders koşulları saf fonksiyonlardır ve YALNIZ bu bağlamı görür; store'un
   * tamamını görselerdi test edilemez, sırası da denetlenemez olurdu.
   */
  coachContext: (s: GameState): CoachContext => {
    const deal = s.activeDeal;
    const line = deal ? activeLine(deal) : undefined;
    const item = line ? s.items[line.itemId] : undefined;

    return {
      day: s.market.day,
      hasCustomer: s.activeCustomer !== null,
      queueLength: s.queue.length,
      flow: deal?.flow ?? null,
      stage: deal?.stage ?? null,
      transactionClass: item ? transactionClass(item) : null,
      testsRun: line?.testResults.length ?? 0,
      hasBand: line?.band !== null && line?.band !== undefined,
      stockUnits: s.inventory.reduce((n, p) => n + p.quantity, 0),
    };
  },

  /** GDD 25 — şu an gösterilecek ders; yoksa null. */
  lesson: (s: GameState) => nextLesson(selectors.coachContext(s), s.seenLessons),

  /** §5 — bugünkü pozisyon (gün içinde canlı; kapanışta sabitlenir). */
  position: (s: GameState) =>
    measurePosition(s.market.day, s.store.cash, s.inventory, s.items, s.market),

  liquidity: (s: GameState) => liquidityRatio(s.store.cash, s.inventory),
  liquidityBand: (s: GameState) => liquidityBand(liquidityRatio(s.store.cash, s.inventory)),
  wealth: (s: GameState) => summarizeWealth(economyOf(s)),
  reservationDebug: (s: GameState) => {
    // Yalnız QA/geliştirme içindir; UI'da asla gösterilmez (GDD 6.6).
    const deal = s.activeDeal;
    const customer = s.activeCustomer;
    if (!deal || !customer) return null;
    const line = activeLine(deal);
    if (!line) return null;
    return effectiveReservation(
      { customer, reputation: s.store.reputation, buyCeiling: 0, knowledge: line.knowledge },
      line.negotiation,
    );
  },
};

export type { InfoField };
