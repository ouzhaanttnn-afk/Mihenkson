import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { defaultPreferences, normalizePreferences } from '@domain/preferences';
import { deserialize, serialize } from '@state/save';
import { useGame } from '@state/gameStore';

describe('Fixed Build 21 palette without theme selection', () => {
  it('has no theme preference, selector or alternate palette', () => {
    expect(defaultPreferences()).not.toHaveProperty('theme');
    const settings = readFileSync(new URL('./shell/SettingsDialog.tsx', import.meta.url), 'utf8');
    expect(settings).not.toContain('settingsSegment--appearance');
    expect(settings).not.toContain("setPreference('theme'");
    const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
    expect(app).not.toContain('watchTheme');
    const tokens = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8');
    expect(tokens).not.toContain('data-theme');
  });
  it.each(['classic', 'light', 'dark', 'system'])('ignores legacy %s without resetting preferences', theme => {
    expect(normalizePreferences({ theme, themeVersion: 1, soundEnabled: false, soundVolume: 30,
      vibrationEnabled: false, language: 'en', currency: 'usd' })).toMatchObject({
      soundEnabled: false, soundVolume: 30,
      vibrationEnabled: false, language: 'en', currency: 'usd',
    });
    expect(normalizePreferences({ theme, themeVersion: 1 })).not.toHaveProperty('theme');
  });
  it.each(['classic', 'light', 'dark', 'system'])('legacy %s save preserves trading progress', theme => {
    const save = serialize(useGame.getState());
    const baseline = deserialize(save);
    const old = { ...save, preferences: { ...save.preferences, theme, themeVersion: 1 } };
    const restored = deserialize(JSON.parse(JSON.stringify(old)));
    expect(restored.preferences).not.toHaveProperty('theme');
    expect(restored.store).toEqual(baseline.store);
    expect(restored.inventory).toEqual(baseline.inventory);
    expect(restored.market).toEqual(baseline.market);
    expect(restored.items).toEqual(baseline.items);
    expect(restored.ledger).toEqual(baseline.ledger);
  });
});
