const test = require('node:test');
const assert = require('node:assert/strict');
const { levelNumberFromFilename, parseLevelJson } = require('../src/lib/levelFile');

const sample = {
  status: 'success',
  message: 'ok',
  data: { level: 4, cols: 6, rows: 9, reward: 20, lives: 3, arrows: [{ id: 'l4_1', path: [[0, 1], [0, 4]], color: 'c' }] },
};

test('dosya adı → numara', () => {
  assert.equal(levelNumberFromFilename('level_12.json'), 12);
  assert.equal(levelNumberFromFilename('level_x.json'), null);
  assert.equal(levelNumberFromFilename('levels.json'), null);
});

test('zarflı ve zarfsız içerik', () => {
  assert.equal(parseLevelJson(sample).number, 4);
  assert.equal(parseLevelJson(sample.data).cols, 6);
});

test('hatalı içerik reddedilir', () => {
  assert.throws(() => parseLevelJson({ data: { ...sample.data, arrows: [] } }), /arrows/);
  assert.throws(() => parseLevelJson({ data: { ...sample.data, cols: 0 } }), /cols/);
  assert.throws(() => parseLevelJson({ data: { ...sample.data, arrows: [{ id: 'a', path: [[0, 1]] }] } }), /path/);
});

test('level alanı yoksa dosya adındaki numara kullanılır', () => {
  const { level, ...rest } = sample.data;
  assert.equal(parseLevelJson({ data: rest }, { expectedNumber: 9 }).number, 9);
});
