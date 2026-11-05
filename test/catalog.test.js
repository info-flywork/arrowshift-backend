const test = require('node:test');
const assert = require('node:assert/strict');
const catalog = require('../src/config/catalog');

test('katalog sözleşmedeki şekilde', () => {
  const c = catalog.getCatalog();
  assert.equal(c.lives_refill_price, 250);
  assert.equal(c.lives_refill_amount, 1);
  assert.deepEqual(
    c.items.map((i) => i.id),
    ['hint_x1', 'undo_x5', 'coins_250', 'coins_500', 'coins_1000'],
  );
  assert.deepEqual(c.items[0], { id: 'hint_x1', type: 'booster', booster: 'hint', quantity: 1, currency: 'coins', price: 150 });
  assert.deepEqual(c.items[4], { id: 'coins_1000', type: 'coin_pack', product_id: 'com.flywork.arrowshift.coins_1000', coins: 1000 });
  assert.ok(c.items.every((i) => ['booster', 'coin_pack'].includes(i.type)), 'reklam / reklam kaldırma ürünü yok');
});

test('getCatalog kopya döner (dışarıdan değiştirilemez)', () => {
  catalog.getCatalog().items[0].price = 1;
  assert.equal(catalog.findItem('hint_x1').price, 150);
});

test('findBoosterItem yalnız booster döner', () => {
  assert.equal(catalog.findBoosterItem('undo_x5').booster, 'undo');
  assert.equal(catalog.findBoosterItem('coins_500'), null);
  assert.equal(catalog.findBoosterItem('nope'), null);
});

test('findCoinPackByProductId', () => {
  assert.equal(catalog.findCoinPackByProductId('com.flywork.arrowshift.coins_1000').coins, 1000);
  assert.equal(catalog.findCoinPackByProductId('com.flywork.arrowshift.coins_500:base').coins, 500);
  assert.equal(catalog.findCoinPackByProductId('com.flywork.arrowshift.premium'), null);
  assert.equal(catalog.findCoinPackByProductId(undefined), null);
});
