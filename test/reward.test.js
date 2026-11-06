const test = require('node:test');
const assert = require('node:assert/strict');
const { calcReward, baseReward, speedMultiplier, accuracyMultiplier, parMs } = require('../src/lib/reward');

test('base comes from the level difficulty tier, clamped 5..25', () => {
  assert.deepEqual([8, 12, 18, 25].map(baseReward), [8, 12, 18, 25]);
  assert.equal(baseReward(100), 25); // eski seed değerleri
  assert.equal(baseReward(2), 5);
  assert.equal(baseReward(0), 12);
  assert.equal(baseReward(undefined), 12);
});

test('speed: half par ×1.5, par ×1.0, double par ×0.7, floor ×0.5', () => {
  const arrows = 10; // par = 40 sn
  assert.equal(parMs(arrows), 40_000);
  assert.equal(speedMultiplier(20_000, arrows), 1.5);
  assert.equal(speedMultiplier(30_000, arrows), 1.25);
  assert.equal(speedMultiplier(40_000, arrows), 1.0);
  assert.equal(speedMultiplier(80_000, arrows), 0.7);
  assert.equal(speedMultiplier(10_000_000, arrows), 0.5);
});

test('impossibly fast times are clamped (anti-cheat)', () => {
  assert.equal(speedMultiplier(0, 10), 1.5);
  assert.equal(calcReward({ levelReward: 12, arrowCount: 10, durationMs: 0 }).total, 18);
});

test('accuracy by mistakes', () => {
  assert.deepEqual([0, 1, 2, 3, 9].map(accuracyMultiplier), [1.0, 0.8, 0.65, 0.5, 0.5]);
});

test('calcReward combines factors and keeps a minimum', () => {
  assert.deepEqual(calcReward({ levelReward: 12, arrowCount: 5, durationMs: 25_000, mistakes: 0 }), { base: 12, speed: 1.0, accuracy: 1.0, total: 12 });
  assert.equal(calcReward({ levelReward: 25, arrowCount: 26, durationMs: 30_000, mistakes: 0 }).total, 38);
  assert.equal(calcReward({ levelReward: 8, arrowCount: 5, durationMs: 10_000_000, mistakes: 3 }).total, 3);
  // Süre gelmezse hedef süre varsayılır.
  assert.equal(calcReward({ levelReward: 12, arrowCount: 5, mistakes: 1 }).total, 10);
});
