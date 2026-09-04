/**
 * OYUN SAATİ POLİTİKASI
 *
 * Saat yalnız oyuncu boş Dükkan tezgâhındayken akar. Okunacak bir ders,
 * verilecek bir karar, açık modal veya yönetim ekranı varken `tick` doğrudan
 * çağrılsa bile dünya ilerlemez. Bu dosya UI interval'ini değil store'un
 * merkezi kapısını sınar.
 */

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

import { DAY } from '@domain/balance';
import { LESSONS } from '@domain/onboarding';
import { spawnCustomer } from '@domain/customer-spawn';
import { clockPauseReason, useGame, type GameState, type RootTab } from './gameStore';

const initial = useGame.getState();
const allLessonsSeen = LESSONS.map((lesson) => lesson.id);

function runningState(overrides: Partial<GameState> = {}): void {
  useGame.setState(
    {
      ...initial,
      market: { ...initial.market, clockMinutes: DAY.openMinutes },
      tab: 'shop',
      speed: 1,
      seenLessons: allLessonsSeen,
      profileSetupDone: true,
      profileOpen: false,
      settingsOpen: false,
      stockCatalogOpen: false,
      shopTalentTreeOpen: false,
      dayCloseConfirmOpen: false,
      dayReportOpen: false,
      dayCloseIssue: null,
      rewardedAdPending: null,
      activeCustomer: null,
      activeDeal: null,
      queue: [],
      nextCustomerAtMinutes: DAY.closeMinutes + 1,
      ...overrides,
    },
    true,
  );
}

function expectTickPaused(): void {
  const before = useGame.getState();
  useGame.getState().tick(30);
  const after = useGame.getState();
  expect(after.market.clockMinutes).toBe(before.market.clockMinutes);
  expect(after.market.day).toBe(before.market.day);
  expect(after.queue).toEqual(before.queue);
  expect(after.missedGuestCountToday).toBe(before.missedGuestCountToday);
}

beforeEach(() => {
  const data = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
    removeItem: (key: string) => data.delete(key),
  });
  runningState();
});

afterEach(() => {
  useGame.setState(initial, true);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('merkezi duraklatma politikası', () => {
  it('boş Dükkan tezgâhında akar', () => {
    const before = useGame.getState().market.clockMinutes;

    expect(clockPauseReason(useGame.getState())).toBeNull();
    useGame.getState().tick(1);

    expect(useGame.getState().market.clockMinutes).toBeCloseTo(
      before + DAY.minutesPerRealSecond,
      8,
    );
  });

  it.each<RootTab>(['stock', 'workshop', 'market', 'business'])(
    '%s yönetim sekmesinde durur',
    (tab) => {
      useGame.setState({ tab });
      expect(clockPauseReason(useGame.getState())).toBe('management-tab');
      expectTickPaused();
    },
  );

  it('ilk profil kurulurken durur', () => {
    useGame.setState({ profileSetupDone: false });
    expect(clockPauseReason(useGame.getState())).toBe('profile-setup');
    expectTickPaused();
  });

  it('ekranda okunmamış onboarding dersi varken durur, kapatılınca akar', () => {
    useGame.setState({ seenLessons: [] });
    const before = useGame.getState().market.clockMinutes;

    expect(clockPauseReason(useGame.getState())).toBe('onboarding');
    expectTickPaused();

    useGame.getState().dismissLesson('welcome');
    expect(clockPauseReason(useGame.getState())).toBeNull();
    useGame.getState().tick(1);
    expect(useGame.getState().market.clockMinutes).toBeGreaterThan(before);
  });

  it.each([
    ['profile', { profileOpen: true }],
    ['settings', { settingsOpen: true }],
    ['quick-stock', { stockCatalogOpen: true }],
    ['shop-modal', { shopTalentTreeOpen: true }],
    ['day-close', { dayCloseConfirmOpen: true }],
    ['day-close', { dayReportOpen: true }],
    ['rewarded-ad', { rewardedAdPending: 'customerRush' as const }],
  ] satisfies [string, Partial<GameState>][])('%s yüzeyi açıkken durur', (reason, patch) => {
    useGame.setState(patch);
    expect(clockPauseReason(useGame.getState())).toBe(reason);
    expectTickPaused();
  });

  it('müşteri işlemi boyunca durur', () => {
    const s = useGame.getState();
    const guest = spawnCustomer(
      s.seed,
      s.spawnCounter,
      s.market,
      s.store,
      s.dayCharacter,
      s.customers,
      { inventory: s.inventory, items: s.items },
      s.skillProgress,
    );
    useGame.setState({ queue: [guest] });
    useGame.getState().greetCustomer();

    expect(useGame.getState().activeDeal).not.toBeNull();
    expect(clockPauseReason(useGame.getState())).toBe('customer-deal');
    expectTickPaused();
  });
});

describe('kapanış yarışı', () => {
  it('19:00 eşiğini geçen tick günü otomatik kapatmaz; saati sabitleyip onay ister', () => {
    runningState({
      market: { ...initial.market, clockMinutes: DAY.closeMinutes - 0.5 },
      missedGuestCountToday: 7,
    });
    const before = useGame.getState();

    useGame.getState().tick(1);
    const atClose = useGame.getState();

    expect(atClose.market.day).toBe(before.market.day);
    expect(atClose.market.clockMinutes).toBe(DAY.closeMinutes);
    expect(atClose.store.cash).toBe(before.store.cash);
    expect(atClose.missedGuestCountToday).toBe(7);
    expect(atClose.dayCloseConfirmOpen).toBe(true);
    expect(atClose.dayReportOpen).toBe(false);
  });

  it('zorunlu kapanıştan kontrollü olarak Stok ekranına çıkılır; saat ilerlemez', () => {
    runningState({ market: { ...initial.market, clockMinutes: DAY.closeMinutes } });
    useGame.setState({ dayCloseConfirmOpen: true });
    const day = useGame.getState().market.day;

    useGame.getState().cancelDayClose();
    expect(useGame.getState().dayCloseConfirmOpen).toBe(false);
    expect(useGame.getState().tab).toBe('stock');
    expect(useGame.getState().market.day).toBe(day);
    expectTickPaused();

    // Dükkan'a dönüş interval yarışı olmadan onayı yeniden açar.
    useGame.getState().setTab('shop');
    expect(useGame.getState().dayCloseConfirmOpen).toBe(true);

    useGame.getState().advanceDay();
    expect(useGame.getState().market.day).toBe(day + 1);
    expect(useGame.getState().dayReportOpen).toBe(true);
  });

  it('gider karşılanamazsa modalda kilitlemez; tasfiye için Stok yolunu açar', () => {
    runningState({
      market: { ...initial.market, clockMinutes: DAY.closeMinutes },
      store: { ...initial.store, cash: 0 },
      dayCloseConfirmOpen: true,
    });
    const day = useGame.getState().market.day;

    useGame.getState().advanceDay();
    expect(useGame.getState().market.day).toBe(day);
    expect(useGame.getState().dayCloseConfirmOpen).toBe(true);
    expect(useGame.getState().dayCloseIssue).toBe('insufficient-funds');

    useGame.getState().cancelDayClose();
    expect(useGame.getState().tab).toBe('stock');
    expect(useGame.getState().dayCloseConfirmOpen).toBe(false);
    expect(useGame.getState().market.clockMinutes).toBe(DAY.closeMinutes);
  });

  it('kapanış kaydı yazılamazsa yeniden deneme veya güvenli Stok çıkışı kalır', () => {
    runningState({
      market: { ...initial.market, clockMinutes: DAY.closeMinutes },
      dayCloseConfirmOpen: true,
    });
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => { throw new Error('storage full'); },
      removeItem: () => undefined,
    });
    const day = useGame.getState().market.day;

    useGame.getState().advanceDay();
    expect(useGame.getState().market.day).toBe(day);
    expect(useGame.getState().dayCloseConfirmOpen).toBe(true);
    expect(useGame.getState().dayCloseIssue).toBe('save-failed');

    useGame.getState().cancelDayClose();
    expect(useGame.getState().tab).toBe('stock');
    expect(useGame.getState().dayCloseConfirmOpen).toBe(false);
  });

  it('19:00 sonrası Dükkan yarışında kuyruktan yeni işlem başlatılamaz', () => {
    runningState({ market: { ...initial.market, clockMinutes: DAY.closeMinutes } });
    const s = useGame.getState();
    const guest = spawnCustomer(
      s.seed,
      s.spawnCounter,
      s.market,
      s.store,
      s.dayCharacter,
      s.customers,
      { inventory: s.inventory, items: s.items },
      s.skillProgress,
    );
    useGame.setState({ queue: [guest], dayCloseConfirmOpen: false });

    useGame.getState().greetCustomer();

    expect(useGame.getState().activeDeal).toBeNull();
    expect(useGame.getState().activeCustomer).toBeNull();
    expect(useGame.getState().queue).toHaveLength(1);
  });

  it('erken kapanış onayı hâlâ iptal edilebilir', () => {
    useGame.getState().requestDayClose();
    expect(useGame.getState().dayCloseConfirmOpen).toBe(true);

    useGame.getState().cancelDayClose();
    expect(useGame.getState().dayCloseConfirmOpen).toBe(false);
  });

  it('19:00 arifesinde açılan hızlı stok penceresi günü arkada kapatmaz', () => {
    runningState({
      market: { ...initial.market, clockMinutes: DAY.closeMinutes - 0.1 },
      stockCatalogOpen: true,
    });
    const before = useGame.getState();

    useGame.getState().tick(60);
    const after = useGame.getState();

    expect(after.market).toEqual(before.market);
    expect(after.store.cash).toBe(before.store.cash);
    expect(after.dayCloseConfirmOpen).toBe(false);
  });
});
