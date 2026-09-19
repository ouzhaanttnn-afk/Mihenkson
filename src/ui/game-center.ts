import { Capacitor, registerPlugin } from '@capacitor/core';
import { MONTHLY_LEADERBOARD_IDS } from '../config/release';
import { calendarMonth } from '@domain/ranking';

export interface RankingEntry { rank: number; name: string; score: number }
export interface RankingResult { entries: RankingEntry[]; own: RankingEntry | null }
const bridge = registerPlugin<{
  authenticate(): Promise<{ authenticated: boolean }>;
  isAuthenticated(): Promise<{ authenticated: boolean }>;
  submit(options: { id: string; score: number }): Promise<void>;
  entries(options: { id: string }): Promise<RankingResult>;
}>('MihenkGameCenter');

export function rankingConfigured(month = calendarMonth()): boolean {
  return !!MONTHLY_LEADERBOARD_IDS[month];
}
export function gameCenterSupported(): boolean { return Capacitor.getPlatform() === 'ios'; }

/** Keep the board current without opening a Game Center sign-in prompt. */
export async function syncRankingIfAuthenticated(score: number, month = calendarMonth()): Promise<boolean> {
  const id = MONTHLY_LEADERBOARD_IDS[month];
  if (!id || month !== calendarMonth() || !Number.isSafeInteger(score) || !gameCenterSupported()) return false;
  if (!(await bridge.isAuthenticated()).authenticated || month !== calendarMonth()) return false;
  await bridge.submit({ id, score });
  return true;
}

export async function refreshRanking(score: number, month = calendarMonth()): Promise<RankingResult> {
  const id = MONTHLY_LEADERBOARD_IDS[month];
  if (!Number.isSafeInteger(score)) throw new Error('invalid-score');
  if (!id || month !== calendarMonth()) throw new Error('season-unavailable');
  if (!gameCenterSupported()) throw new Error('ios-required');
  const auth = await bridge.authenticate();
  if (!auth.authenticated) throw new Error('sign-in-required');
  if (month !== calendarMonth()) throw new Error('season-changed');
  await bridge.submit({ id, score });
  const result = await bridge.entries({ id });
  if (month !== calendarMonth()) throw new Error('season-changed');
  return result;
}
