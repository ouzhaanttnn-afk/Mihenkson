import { describe, expect, it } from 'vitest';
import { defaultPreferences, normalizePreferences } from '@domain/preferences';
import { resolveTheme } from './theme';
import { deserialize, serialize } from '@state/save';
import { useGame } from '@state/gameStore';

describe('Build 21 appearance without gameplay rollback', () => {
  it('starts classic on light and dark phones', () => {
    expect(defaultPreferences().theme).toBe('classic');
    expect(resolveTheme('classic', false)).toBe('classic');
    expect(resolveTheme('classic', true)).toBe('classic');
  });
  it('migrates the previous automatic preview default, not other preferences', () => {
    expect(normalizePreferences({ theme: 'system', soundEnabled: false, soundVolume: 30,
      vibrationEnabled: false, language: 'en', currency: 'usd' })).toMatchObject({
      theme: 'classic', themeVersion: 1, soundEnabled: false, soundVolume: 30,
      vibrationEnabled: false, language: 'en', currency: 'usd',
    });
  });
  it('preserves explicit light/dark and future system choices', () => {
    expect(normalizePreferences({ theme: 'light' }).theme).toBe('light');
    expect(normalizePreferences({ theme: 'dark' }).theme).toBe('dark');
    expect(normalizePreferences({ theme: 'system', themeVersion: 1 }).theme).toBe('system');
  });
  it('legacy save migration changes appearance only, not trading progress', () => {
    const save = serialize(useGame.getState());
    const baseline = deserialize(save);
    const old = { ...save, preferences: { ...save.preferences, theme: 'system' as const, themeVersion: undefined } };
    // Old disk JSON has no new themeVersion field.
    const restored = deserialize(JSON.parse(JSON.stringify(old)));
    expect(restored.preferences.theme).toBe('classic');
    expect(restored.store).toEqual(baseline.store);
    expect(restored.inventory).toEqual(baseline.inventory);
    expect(restored.market).toEqual(baseline.market);
    expect(restored.items).toEqual(baseline.items);
  });
});
