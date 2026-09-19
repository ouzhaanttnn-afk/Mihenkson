import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const native = vi.hoisted(() => ({
  authenticate: vi.fn(),
  isAuthenticated: vi.fn(),
  submit: vi.fn(),
  entries: vi.fn(),
}));
vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => 'ios' },
  registerPlugin: () => native,
}));

import { rankingConfigured, refreshRanking, syncRankingIfAuthenticated } from './game-center';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-19T12:00:00Z'));
  for (const fn of Object.values(native)) fn.mockReset();
  native.authenticate.mockResolvedValue({ authenticated: true });
  native.isAuthenticated.mockResolvedValue({ authenticated: true });
  native.submit.mockResolvedValue(undefined);
  native.entries.mockResolvedValue({ entries: [{ rank: 1, name: 'Oyuncu', score: 250000 }], own: null });
});
afterEach(() => vi.useRealTimers());

describe('real monthly Game Center boards', () => {
  it('submits fine-gold milligrams to the real September board and loads real rows', async () => {
    expect(rankingConfigured('2026-09')).toBe(true);
    const result = await refreshRanking(250000);
    expect(native.authenticate).toHaveBeenCalledOnce();
    expect(native.submit).toHaveBeenCalledWith({ id: 'com.mihenkaynak.has.2026_09', score: 250000 });
    expect(result.entries).toEqual([{ rank: 1, name: 'Oyuncu', score: 250000 }]);
  });

  it('silently updates only an authenticated player', async () => {
    native.isAuthenticated.mockResolvedValueOnce({ authenticated: false });
    expect(await syncRankingIfAuthenticated(250000)).toBe(false);
    expect(native.submit).not.toHaveBeenCalled();
    expect(await syncRankingIfAuthenticated(250000)).toBe(true);
    expect(native.authenticate).not.toHaveBeenCalled();
    expect(native.submit).toHaveBeenCalledOnce();
  });

  it('never sends to an old or unconfigured calendar month', async () => {
    vi.setSystemTime(new Date('2026-10-01T00:00:00Z'));
    expect(await syncRankingIfAuthenticated(250000, '2026-09')).toBe(false);
    await expect(refreshRanking(250000, '2026-09')).rejects.toThrow('season-unavailable');
    expect(rankingConfigured('2027-01')).toBe(false);
    expect(native.submit).not.toHaveBeenCalled();
  });
});
