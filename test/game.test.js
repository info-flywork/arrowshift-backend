const test = require('node:test');
const assert = require('node:assert/strict');
const { calcStars, levelSlot, parseLevelNumber, NEW_USER_DEFAULTS } = require('../src/lib/game');

test('calcStars: lives_left → yıldız', () => {
  assert.equal(calcStars(5), 3);
  assert.equal(calcStars(3), 3);
  assert.equal(calcStars(2), 2);
  assert.equal(calcStars(1), 1);
  assert.equal(calcStars(0), 1, 'asla 0 yıldız değil');
  assert.equal(calcStars(-4), 1);
  assert.equal(calcStars('x'), 1);
});

test('levelSlot: toplamın üstündeki numaralar döngüyle eşlenir', () => {
  assert.equal(levelSlot(1, 220), 1);
  assert.equal(levelSlot(220, 220), 220);
  assert.equal(levelSlot(221, 220), 1);
  assert.equal(levelSlot(441, 220), 1);
  assert.equal(levelSlot(445, 220), 5);
  assert.equal(levelSlot(7, 1), 1);
  assert.throws(() => levelSlot(0, 220), RangeError);
  assert.throws(() => levelSlot(3, 0), RangeError);
});

test('parseLevelNumber', () => {
  assert.equal(parseLevelNumber('12'), 12);
  assert.equal(parseLevelNumber('0'), null);
  assert.equal(parseLevelNumber('-1'), null);
  assert.equal(parseLevelNumber('1.5'), null);
  assert.equal(parseLevelNumber('abc'), null);
  assert.equal(parseLevelNumber('meta'), null);
});

test('yeni kullanıcı varsayılanları sözleşmeyle aynı', () => {
  assert.deepEqual({ ...NEW_USER_DEFAULTS }, { coins: 320, current_level: 1, hints: 3, undos: 3, tutorial_seen: false });
});
