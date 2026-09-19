import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gameCenterConfigured, entitlementPlist } from './prepare-release.mjs';
test('no identifiers means no signing entitlement', () => {
  assert.equal(gameCenterConfigured('export const MONTHLY_LEADERBOARD_IDS: Readonly<Record<string,string>> = {};'), false);
  assert.ok(!entitlementPlist(false).includes('game-center'));
});
test('configured calendar month enables capability', () => {
  assert.equal(gameCenterConfigured('export const MONTHLY_LEADERBOARD_IDS = { "2026-10": "test.fixture.board" };'), true);
  assert.ok(entitlementPlist(true).includes('<key>com.apple.developer.game-center</key><true/>'));
});
test('invalid, ambiguous or missing configuration fails early', () => {
  for (const source of ['const MONTHLY_LEADERBOARD_IDS = { "2026-13": "id" };', 'const MONTHLY_LEADERBOARD_IDS = { "2026-10": "" };', 'const MONTHLY_LEADERBOARD_IDS = load();', 'const MONTHLY_LEADERBOARD_IDS = { ...ids };', 'const unrelated = {};']) {
    assert.throws(() => gameCenterConfigured(source));
  }
});
test('two months cannot accidentally share one classic scoreboard', () => {
  assert.throws(() => gameCenterConfigured('const MONTHLY_LEADERBOARD_IDS = { "2026-10": "test.board", "2026-11": "test.board" };'));
});
test('whitespace IDs cannot silently enable an unusable season', () => {
  assert.throws(() => gameCenterConfigured('const MONTHLY_LEADERBOARD_IDS = { "2026-10": " test.board " };'));
});
