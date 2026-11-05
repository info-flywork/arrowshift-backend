const test = require('node:test');
const assert = require('node:assert/strict');
const { calcReward, baseReward, speedMultiplier, accuracyMultiplier, parMs } = require('../src/lib/reward');

test('base grows +5 every 10 levels, capped at 150', () => {
  assert.equal(baseReward(1), 20);
  assert.equal(baseReward(10), 20);
  assert.equal(baseReward(11), 25);
  assert.equal(baseReward(100), 65);
  assert.equal(baseReward(220), 125);
  assert.equal(baseReward(5000), 150);
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
  assert.equal(calcReward({ level: 1, arrowCount: 10, durationMs: 0 }).total, 30);
});

test('accuracy by mistakes', () => {
  assert.deepEqual([0, 1, 2, 3, 9].map(accuracyMultiplier), [1.0, 0.8, 0.65, 0.5, 0.5]);
});

test('calcReward combines factors and keeps a minimum', () => {
  assert.deepEqual(calcReward({ level: 1, arrowCount: 5, durationMs: 25_000, mistakes: 0 }), { base: 20, speed: 1.0, accuracy: 1.0, total: 20 });
  assert.equal(calcReward({ level: 120, arrowCount: 26, durationMs: 30_000, mistakes: 0 }).total, 113);
  assert.equal(calcReward({ level: 1, arrowCount: 5, durationMs: 10_000_000, mistakes: 3 }).total, 5);
  // Süre gelmezse hedef süre varsayılır.
  assert.equal(calcReward({ level: 1, arrowCount: 5, mistakes: 1 }).total, 16);
});
