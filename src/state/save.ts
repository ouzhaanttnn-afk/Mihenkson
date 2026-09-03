/**
 * MIHENKAYNAK — Kayıt / yükleme
 * Kaynak: GDD 28.1 "kayıt sistemi", 28.3 determinizm;
 *         Ekonomi Ara Düzeltmesi v1.0 · §11 "Kaydet/yükle".
 *
 * §11 DEĞİŞMEZ: "Kaydet/yükle: REJİM, RNG STATE/SEED YAKLAŞIMI, AÇIK
 * BORÇLAR, VADELER, LİMİTLER ve POZİSYONLAR tutarlı biçimde geri yüklenir."
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * PİYASA SNAPSHOT'I NEDEN KAYDEDİLİR
 *
 * Gün başı zinciri seed ve günden türetilir; gün içi mikro adımlar ise o ana
 * kadar oluşmuş spot/history üzerinden ilerler. Reload avantajını önlemek
 * için o anki piyasa snapshot'ı da taşınır. Eski kayıtlarda snapshot yoksa
 * seed/gün zinciri yeniden kurularak geriye uyumluluk korunur.
 *
 * UPDATEv5: aktif müşteri, kuyruk, teklif geçmişi ve terminal settlement
 * anahtarları birlikte saklanır; reload pazarlığı veya günlük zarları sıfırlamaz.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { createMarketForDay } from '@domain/market';
import { isMarketOpen } from '@domain/calendar';
import { consolidatePools, isMassPool, poolForTemplate, poolUnitGrams } from '@domain/stock-pools';
import { bullionMeta } from '@data/bullion';
import type { CustomerDemand } from '@domain/types';
import { dayCharacter, emptyTelemetry } from '@domain/intent';
import { createLedger, type Ledger } from '@domain/settlement';
import type { GameState } from './gameStore';
import { normalizeProfile, type PlayerProfile } from '@domain/profile';
import { normalizePreferences, type PlayerPreferences } from '@domain/preferences';
import { defaultPlayerMarket, type PlayerMarketState } from '@domain/marketplace';
import {
  defaultSkillProgress,
  normalizeSkillProgress,
  startingPatience,
  type SkillProgress,
} from '@domain/skill-tree';
import { getArchetype } from '@data/archetypes';
import { PURCHASE } from '@domain/balance';
import type { CustomerRegistry } from '@domain/customer-memory';
import type {
  InventoryPosition,
  ItemInstance,
  MarketState,
  ServiceJob,
  StoreState,
  TradeNetworkMember,
} from '@domain/types';

/** Kayıt formatı sürümü. Artırıldığında migrate() bir adım daha kazanır. */
export const SAVE_VERSION = 2;

export interface SaveFile {
  dayReportOpen?: boolean;
  queue?: GameState['queue'];
  activeCustomer?: GameState['activeCustomer'];
  activeDeal?: GameState['activeDeal'];
  nextCustomerAtMinutes?: number;
  intentTelemetry?: GameState['intentTelemetry'];
  missedGuestCountToday?: number;
  /** Bugün personel reklam kirası izlendi mi — bkz. `closeDay` 5. parametresi. */
  personnelCostWaivedToday?: boolean;
  lastDayReport?: GameState['lastDayReport'];
  customerMessage?: string;
  version: number;
  /** Yazıldığı gerçek zaman; eski kayıtlarda bulunmayabilir. */
  savedAt?: number;
  /** GDD 28.3 — RNG'nin tek kaynağı. Seed olmadan hiçbir şey türetilemez. */
  seed: number;
  /** Türetim anahtarının ikinci yarısı. */
  day: number;
  clockMinutes: number;
  /** Gün içi spot/history birebir geri gelsin; eski kayıtlarda olmayabilir. */
  market?: MarketState;
  /** Deterministik spawn zinciri kaldığı yerden devam etsin diye. */
  spawnCounter: number;
  jobCounter: number;

  /** Limitler, vadeler ve açık borçlar burada (§11). */
  store: StoreState;
  /** Pozisyonlar (§11). */
  inventory: InventoryPosition[];
  items: Record<string, ItemInstance>;
  ledger: Ledger;
  jobs: ServiceJob[];
  /** §8 ağı: üye ilişkileri, kasaları ve açık borçları. */
  network: TradeNetworkMember[];
  /**
   * GDD 10 — müşteri hafızası. Kaydedilmezse her yüklemede tüm müşteriler
   * yeniden yabancı olurdu ve güven "ekonomik varlık" olmaktan çıkardı.
   */
  customers: CustomerRegistry;

  speed4xUnlocked: boolean;

  /**
   * GDD 25 — görülmüş öğretim dersleri. Taşınmasaydı her yüklemede oyuncuya
   * bildiği şey yeniden anlatılırdı.
   */
  seenLessons?: string[];

  /**
   * Oyuncu profili — ad ve avatar (GÖRÜNÜM, mekanik değil).
   *
   * İSTEĞE BAĞLI, BİLEREK: alan eklenmeden önce yazılmış kayıtlarda yoktur.
   * `deserialize` orada varsayılana düşer, yani eski kayıt bozulmaz ve
   * SAVE_VERSION artırmak gerekmez — bu, `seenLessons` ile aynı desendir.
   * Sürüm artırmak eski kayıtları `migrate`'ten geçmeye zorlardı; eklenen
   * şey yalnız bir varsayılanı olan yeni alansa buna gerek yok.
   */
  profile?: PlayerProfile;
  /** Market sahipliği; eski kayıtlarda boş koleksiyona düşer. */
  playerMarket?: PlayerMarketState;
  /** Yetenek ağacı ilerlemesi; eski kayıtlarda tüm kademeler sıfırdır. */
  skillProgress?: SkillProgress;

  /**
   * Ses / titreşim / dil tercihleri — SUNUM, mekanik değil.
   *
   * İsteğe bağlı, `profile` ile aynı gerekçeyle: alan eklenmeden önce
   * yazılmış kayıtlarda yoktur, `deserialize` orada varsayılana düşer ve
   * SAVE_VERSION artırmak gerekmez. Varsayılanı olan yeni bir alan eski
   * kayıtları `migrate`'ten geçmeye zorlamamalı.
   */
  preferences?: PlayerPreferences;

  /**
   * İlk açılıştaki "adını ve portreni seç" ekranı tamamlandı mı.
   *
   * ESKİ KAYITTA BU ALAN YOKTUR ve orada varsayılan **true** olmalıdır:
   * zaten oynamış bir oyuncuya açılışta hoş geldin ekranı göstermek, ona
   * oyunu yeni açmış gibi davranmak olurdu. Yalnız HİÇ KAYIT YOKKEN false
   * olur — o da `gameStore`daki ilk durumda kurulur, burada değil.
   *
   * Bu yüzden `deserialize` bu alanı `?? true` ile okur; diğer isteğe bağlı
   * alanların aksine varsayılanı "yapılmış" tarafındadır.
   */
  profileSetupDone?: boolean;
}

/**
 * Durumu kayda çevirir.
 *
 * Aktif işlem BİLEREK dışarıda bırakılır: kaydederken açık olan pazarlık,
 * yüklendiğinde kapanmış sayılır.
 */
export function serialize(state: GameState): SaveFile {
  return {
    version: SAVE_VERSION,
    queue: state.queue,
    activeCustomer: state.activeCustomer,
    activeDeal: state.activeDeal,
    nextCustomerAtMinutes: state.nextCustomerAtMinutes,
    intentTelemetry: state.intentTelemetry,
    missedGuestCountToday: state.missedGuestCountToday,
    personnelCostWaivedToday: state.personnelCostWaivedToday,
    lastDayReport: state.lastDayReport,
    dayReportOpen: state.dayReportOpen,
    customerMessage: state.customerMessage,
    seed: state.seed,
    day: state.market.day,
    clockMinutes: state.market.clockMinutes,
    market: state.market,
    spawnCounter: state.spawnCounter,
    jobCounter: state.jobCounter,
    store: state.store,
    inventory: state.inventory,
    items: state.items,
    ledger: state.ledger,
    jobs: state.jobs,
    network: state.network,
    customers: state.customers,
    speed4xUnlocked: state.speed4xUnlocked,
    seenLessons: state.seenLessons,
    profile: state.profile,
    playerMarket: state.playerMarket,
    skillProgress: state.skillProgress,
    preferences: state.preferences,
    profileSetupDone: state.profileSetupDone,
  };
}

/** Yüklendiğinde doğrudan store'a yazılabilecek alanlar. */
export type LoadedState = Pick<
  GameState,
  | 'seed'
  | 'spawnCounter'
  | 'jobCounter'
  | 'market'
  | 'store'
  | 'inventory'
  | 'items'
  | 'ledger'
  | 'jobs'
  | 'network'
  | 'customers'
  | 'dayCharacter'
  | 'intentTelemetry'
  | 'speed4xUnlocked'
  | 'seenLessons'
  | 'profile'
  | 'preferences'
  | 'profileSetupDone'
  | 'playerMarket'
  | 'skillProgress'
  | 'queue'
  | 'activeCustomer'
  | 'activeDeal'
  | 'overnight'
  | 'lastOvernight'
  | 'nextCustomerAtMinutes'
  | 'missedGuestCountToday'
  | 'personnelCostWaivedToday'
  | 'lastDayReport'
  | 'dayReportOpen'
  | 'customerMessage'
>;

/**
 * Kaydı duruma çevirir.
 *
 * Yeni kayıtta piyasa snapshot'ı birebir yüklenir. Eski kayıtta yoksa aynı
 * seed/gün zinciri yeniden türetilir.
 *
 * Rejim geçiş zinciri gün 1'den itibaren yeniden koşturulur: rejim artık bir
 * DURUM olduğu için (§5.1) yalnız o günün seed'ini kullanmak, zincirin
 * geçmişini yok saymak olurdu.
 */
export function deserialize(file: SaveFile): LoadedState {
  const save = migrate(file);
  const skillProgress = save.skillProgress
    ? normalizeSkillProgress(save.skillProgress)
    : defaultSkillProgress();
  const market = isMarketSnapshot(save.market)
    ? normalizeMarketSnapshot(save.market, save.clockMinutes)
    : rebuildMarket(save.seed, save.day, save.clockMinutes);

  return {
    seed: save.seed,
    spawnCounter: save.spawnCounter,
    jobCounter: save.jobCounter,
    market,
    store: save.store,
    inventory: save.inventory,
    items: save.items,
    ledger: save.ledger,
    jobs: save.jobs,
    network: save.network,
    // Eski kayıtta defter yoksa boş başlar; çökmez.
    customers: save.customers ?? {},
    dayCharacter: dayCharacter(save.seed, save.day, market),
    // Gün içi ölçüm penceresi reload ile sıfırlanmaz.
    intentTelemetry: save.intentTelemetry ?? emptyTelemetry(),
    speed4xUnlocked: save.speed4xUnlocked,
    // Eski kayıtlarda alan yok; boş liste öğretimi baştan başlatır ki
    // sürüm atlayan oyuncu sessizce derssiz kalmasın.
    seenLessons: save.seenLessons ?? [],
    // Profil alanı olmayan (bu özellikten önceki) kayıtlar varsayılana
    // düşer; bozuk bir ad veya bilinmeyen avatar da normalize edilir.
    profile: normalizeProfile(save.profile),
    // Eski kayıtta alan yok → zaten oynamış oyuncu → ekran gösterilmez.
    profileSetupDone: save.profileSetupDone ?? true,
    preferences: normalizePreferences(save.preferences),
    playerMarket: save.playerMarket ?? defaultPlayerMarket(),
    skillProgress,
    // Aktif ziyaret ve yarım pazarlık aynı durumdan devam eder.
    queue: (save.queue ?? []).map(entry => ({
      ...entry,
      customer: normalizeCustomerPatience(entry.customer, skillProgress),
    })),
    activeCustomer: save.activeCustomer
      ? normalizeCustomerPatience(save.activeCustomer, skillProgress)
      : null,
    activeDeal: save.activeDeal ?? null,
    nextCustomerAtMinutes: save.nextCustomerAtMinutes ?? save.clockMinutes + 3,
    missedGuestCountToday: save.missedGuestCountToday ?? 0,
    personnelCostWaivedToday: save.personnelCostWaivedToday ?? false,
    lastDayReport: save.lastDayReport ?? null,
    dayReportOpen: !!save.dayReportOpen && !!save.lastDayReport,
    customerMessage: save.customerMessage ?? '',
    overnight: null,
    lastOvernight: null,
  };
}

/**
 * Rejim zincirini gün 1'den yeniden kurar (§5.1 — rejim bir durumdur).
 * Yalnız hedef günün seed'iyle üretmek, önceki günlerin geçiş zincirini
 * atlayıp farklı bir rejim vermek olurdu.
 */
export function rebuildMarket(seed: number, day: number, clockMinutes: number) {
  let market = createMarketForDay(seed, 1);
  for (let d = 2; d <= day; d += 1) market = createMarketForDay(seed, d, market);
  return { ...market, clockMinutes };
}

/** Sürüm geçişleri. Bilinmeyen/ileri sürüm güvenle reddedilir. */
export function migrate(file: SaveFile): SaveFile {
  if (file.version > SAVE_VERSION) {
    throw new Error(`Kayıt sürümü desteklenmiyor: ${file.version}`);
  }
  const pooled = consolidatePools(file.inventory, file.items);
  const normalizeDemand = (d: CustomerDemand | null): CustomerDemand | null => {
    if (!d || d.poolId || d.targetInventoryItemId || !d.templateId) return d;
    const poolId = poolForTemplate(d.templateId);
    if (!poolId) return d;
    const factor = isMassPool(poolId) ? bullionMeta(d.templateId)!.unitWeightGrams / poolUnitGrams(poolId) : 1;
    return { ...d, poolId, quantity: d.quantity * factor, minQuantity: d.minQuantity * factor,
      summary: poolId === '24K_GRAM_GOLD_POOL' ? `${d.quantity * factor} gram altın` : poolId === '22K_INVESTMENT_BANGLE_POOL' ? `${d.quantity * factor * 10} gram 22 ayar işçiliksiz bilezik` : d.summary,
      templateId: poolId === '24K_GRAM_GOLD_POOL' ? 'gram_gold_1' : poolId === '22K_INVESTMENT_BANGLE_POOL' ? 'investment_bangle_22k_10' : d.templateId };
  };
  const activeDeal = file.activeDeal ? { ...file.activeDeal } : null;
  if (activeDeal?.purchase) {
    activeDeal.purchase = { ...activeDeal.purchase, demand: normalizeDemand(activeDeal.purchase.demand)!,
      lines: activeDeal.purchase.lines.map(line => {
        const alias = pooled.aliases[line.itemId];
        return alias ? { itemId: alias.itemId, quantity: line.quantity * alias.factor } : line;
      }) };
    // Merge package lines whose historical SKU positions now share one pool.
    const combined = new Map<string, number>();
    for (const line of activeDeal.purchase.lines) combined.set(line.itemId, (combined.get(line.itemId) ?? 0) + line.quantity);
    activeDeal.purchase.lines = [...combined].map(([itemId, quantity]) => ({ itemId, quantity }));
    activeDeal.purchase.units = activeDeal.purchase.lines.reduce((sum, line) => sum + line.quantity, 0);
  }
  return { ...file, version: SAVE_VERSION, inventory: pooled.inventory, items: pooled.items,
    store: { ...file.store, personnelCount: file.store.personnelCount ?? 0, personnelPaidUnlockLevel: file.store.personnelPaidUnlockLevel ?? 0, personnelTempUnlockTier: file.store.personnelTempUnlockTier ?? 0, personnelTempUnlockUntilDay: file.store.personnelTempUnlockUntilDay ?? 0, hasBalanceMg: file.store.hasBalanceMg ?? 0, hasCostBasis: file.store.hasCostBasis ?? 0 },
    activeDeal, activeCustomer: file.activeCustomer ? { ...file.activeCustomer, demand: normalizeDemand(file.activeCustomer.demand) } : null,
    queue: file.queue?.map(entry => ({ ...entry, customer: { ...entry.customer, demand: normalizeDemand(entry.customer.demand) } })) };
}

const STORAGE_KEY = 'mihenkaynak.save.v1';
const BACKUP_STORAGE_KEY = 'mihenkaynak.save.v1.backup';

/**
 * YAZMA KİLİDİ — "Kaydı sil"in sözünü tutan şey.
 *
 * TARAYICIDA ÖLÇÜLDÜ, tahmin değil: `clearSave()` iki anahtarı da siliyordu
 * ama oyun ekranda açık kalıyor ve `pagehide` ile sayfa kapanırken otomatik
 * kayıt (App.tsx · flush) dosyayı AYNI DURUMDAN geri yazıyordu. Sonuç:
 * "yeni oyun bir sonraki açılışta başlar" yazan onay metni yalan söylüyordu;
 * oyuncu kaydı siliyor, uygulamayı kapatıp açıyor ve eski dükkânını
 * buluyordu. Karşılama ekranı bu hatayı görünür kıldı — kaydı silen oyuncuya
 * "adın ne?" ekranı hiç gelmiyordu.
 *
 * Kilit BURADA, tek noktada: `writeSave` de `patchSave` de buradan geçer,
 * dolayısıyla hiçbir çağrı yerinden kaçamaz. `true` döner çünkü yazmamak
 * burada bir HATA değil, verilen karardır — `false` dönseydi arayüz
 * "Kayıt yazılamadı" diye yanlış bir uyarı gösterirdi.
 *
 * Kilit modül ömrü boyunca sürer: sayfa yenilendiğinde modül yeniden
 * yüklenir ve kilit kendiliğinden kalkar — zaten istenen de o, çünkü o
 * noktada silinmiş kayıt gerçekten yoktur ve yeni oyun başlar.
 */
let savesSuspended = false;

/** "Kaydı sil"den sonra çağrılır: bu oturum artık diske yazmaz. */
export function suspendSaves(): void {
  savesSuspended = true;
}

/** Kayıt yüklendiğinde çağrılır: oyuncu devam etmeyi seçti, yazma açılır. */
export function resumeSaves(): void {
  savesSuspended = false;
}

/**
 * Kaydı iki aşamalı yazar ve tarayıcı deposundan geri okuyarak doğrular.
 * Bir önceki sağlam kayıt yedekte tutulur; sekme kapanması veya kota hatası
 * yarım bir JSON bırakırsa oyuncunun son checkpoint'i kaybolmaz.
 */
function commitRawSave(raw: string): boolean {
  if (savesSuspended) return true;
  try {
    const previous = localStorage.getItem(STORAGE_KEY);
    if (previous && parseSave(previous)) localStorage.setItem(BACKUP_STORAGE_KEY, previous);
    localStorage.setItem(STORAGE_KEY, raw);

    if (localStorage.getItem(STORAGE_KEY) !== raw) {
      if (previous) localStorage.setItem(STORAGE_KEY, previous);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function normalizeCustomerPatience(
  customer: NonNullable<GameState['activeCustomer']>,
  skills: SkillProgress,
): NonNullable<GameState['activeCustomer']> {
  const archetype = getArchetype(customer.archetype);
  const base = startingPatience(archetype.patienceBand[0], skills);
  const max = customer.demand?.isBulk
    ? Math.round(base * PURCHASE.bulk.patienceFactor)
    : base;
  const remainingRatio = customer.patience / Math.max(1, customer.patienceMax);
  return {
    ...customer,
    patienceMax: max,
    patience: Math.max(0, Math.min(max, Math.round(remainingRatio * max))),
  };
}

/** Yeni piyasa alanları olmayan kayıtları fiyatı silmeden güvenli modele taşır. */
function normalizeMarketSnapshot(market: MarketState, clockMinutes: number): MarketState {
  const open = isMarketOpen(market.day);
  return {
    ...market,
    clockMinutes,
    marketOpen: open,
    dayOpen: market.dayOpen ?? {
      goldSpot: market.goldSpot,
      silverSpot: market.silverSpot,
      fxIndex: market.fxIndex,
    },
    gapDays: market.gapDays ?? 0,
    lastIntradayStepIndex:
      market.lastIntradayStepIndex ?? Math.max(35, Math.floor(clockMinutes / 15) - 1),
    assets: open
      ? market.assets
      : market.assets.map((asset) => ({ ...asset, changePct: 0 })),
  };
}

function isMarketSnapshot(market: MarketState | undefined): market is MarketState {
  return !!market &&
    typeof market.goldSpot === 'number' &&
    typeof market.silverSpot === 'number' &&
    typeof market.fxIndex === 'number' &&
    typeof market.regime === 'string' &&
    Array.isArray(market.assets);
}

function saveCandidates(): string[] {
  try {
    return [localStorage.getItem(STORAGE_KEY), localStorage.getItem(BACKUP_STORAGE_KEY)].filter(
      (raw): raw is string => !!raw,
    );
  } catch {
    return [];
  }
}

function parseSave(raw: string): SaveFile | null {
  try {
    const file = JSON.parse(raw) as SaveFile;
    if (
      typeof file !== 'object' ||
      file === null ||
      typeof file.version !== 'number' ||
      file.version > SAVE_VERSION ||
      typeof file.day !== 'number' ||
      !file.store ||
      !Array.isArray(file.inventory)
    ) {
      return null;
    }
    return file;
  } catch {
    return null;
  }
}

/** Tarayıcı deposuna yazar. Depo yoksa sessizce atlar (SSR / test). */
export function writeSave(state: GameState): boolean {
  return commitRawSave(JSON.stringify({ ...serialize(state), savedAt: Date.now() }));
}

export interface SaveSummary {
  day: number;
  clockMinutes: number;
  cash: number;
  stockUnits: number;
  savedAt: number | null;
}

/** Kayıt yüklenmeden önce güvenli, kısa önizleme verir. */
export function readSaveSummary(): SaveSummary | null {
  for (const raw of saveCandidates()) {
    const file = parseSave(raw);
    if (!file) continue;
    return {
      day: file.day,
      clockMinutes: file.clockMinutes,
      cash: file.store.cash,
      stockUnits: file.inventory.reduce((sum, position) => sum + position.quantity, 0),
      savedAt: typeof file.savedAt === 'number' ? file.savedAt : null,
    };
  }
  return null;
}

/** Depodan okur. Bozuk veya ileri sürümlü kayıt null döner — çökme yok. */
export function readSave(): LoadedState | null {
  for (const raw of saveCandidates()) {
    const file = parseSave(raw);
    if (!file) continue;
    try {
      return deserialize(file);
    } catch {
      // Ana kayıt bozuksa yedek denenir.
    }
  }
  return null;
}

/**
 * Profili TEK BAŞINA kalıcı hâle getirir.
 *
 * NEDEN `writeSave` DEĞİL: oyunun kayıt modeli GÜN SONU CHECKPOINT'idir
 * (GDD 28.1) — kayıt, günü kapatma kararıyla birlikte yazılır. Profil ise
 * kozmetik bir tercih ve oyuncu onu günün ortasında değiştirebilmeli.
 * Her profil değişikliğinde tam kayıt yazmak, oyunun checkpoint anlamını
 * sessizce "her an kaydediliyor"a çevirirdi.
 *
 * Bu yüzden burada mevcut kaydın YALNIZ `profile` alanı yamalanır; günün
 * geri kalanı (nakit, stok, defter) checkpoint'e kadar dokunulmadan kalır.
 *
 * Henüz hiç kayıt yoksa (ilk gün, ilk checkpoint'ten önce) yamalanacak bir
 * dosya da yoktur; o durumda tam kayıt yazılır — durum zaten yeni oyunun
 * başlangıcıdır, checkpoint'lemenin bir maliyeti yoktur.
 *
 * @returns yazılabildiyse true.
 */
function patchSave(state: GameState, patch: (file: SaveFile) => void): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return writeSave(state);
    const file = parseSave(raw);
    if (!file) return writeSave(state);
    patch(file);
    file.savedAt = Date.now();
    return commitRawSave(JSON.stringify(file));
  } catch {
    return false;
  }
}

export function persistProfile(state: GameState): boolean {
  return patchSave(state, (file) => {
    file.profile = state.profile;
    file.profileSetupDone = state.profileSetupDone;
  });
}

/**
 * Ses / titreşim / dil tercihleri de kozmetiktir ve gün ortasında
 * değiştirilebilmelidir; `persistProfile` ile birebir aynı gerekçe.
 */
export function persistPreferences(state: GameState): boolean {
  return patchSave(state, (file) => {
    file.preferences = state.preferences;
  });
}

export function clearSave(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(BACKUP_STORAGE_KEY);
  } catch {
    // Depo yoksa yapacak bir şey yok.
  }
}

/** Boş defter — testlerde ve yeni oyunda kullanılır. */
export function emptyLedger(): Ledger {
  return createLedger();
}
