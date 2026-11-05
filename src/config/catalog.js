// Mağaza kataloğu (sözleşmeyle birebir). Gerçek para fiyatı burada YOK; uygulama RevenueCat offering'inden gösterir.
// Reklam / reklam kaldırma ürünü yoktur.

// 1 can = 250 coin (bölüm içinde canlar bitince).
const LIVES_REFILL_PRICE = 250;
const LIVES_REFILL_AMOUNT = 1;

const ITEMS = Object.freeze([
  { id: 'hint_x1', type: 'booster', booster: 'hint', quantity: 1, currency: 'coins', price: 150 },
  { id: 'undo_x5', type: 'booster', booster: 'undo', quantity: 5, currency: 'coins', price: 100 },
  // Store fiyatları: 250 → 1.99, 500 → 3.49, 1000 → 5.99 (App Store Connect / Play Console'da tanımlanır).
  { id: 'coins_250', type: 'coin_pack', product_id: 'com.flywork.arrowshift.coins_250', coins: 250 },
  { id: 'coins_500', type: 'coin_pack', product_id: 'com.flywork.arrowshift.coins_500', coins: 500 },
  { id: 'coins_1000', type: 'coin_pack', product_id: 'com.flywork.arrowshift.coins_1000', coins: 1000 },
].map((i) => Object.freeze(i)));

function getCatalog() {
  return {
    lives_refill_price: LIVES_REFILL_PRICE,
    lives_refill_amount: LIVES_REFILL_AMOUNT,
    items: ITEMS.map((i) => ({ ...i })),
  };
}

function findItem(id) {
  return ITEMS.find((i) => i.id === id) || null;
}

function findBoosterItem(id) {
  const item = findItem(id);
  return item && item.type === 'booster' ? item : null;
}

/** RevenueCat / mağaza product id → coin paketi. Store öneki (ör. "pkg:...") veya Android "...:base" eki tolere edilir. */
function findCoinPackByProductId(productId) {
  if (typeof productId !== 'string' || !productId) return null;
  const candidates = [productId, productId.split(':')[0]];
  return ITEMS.find((i) => i.type === 'coin_pack' && candidates.includes(i.product_id)) || null;
}

module.exports = { LIVES_REFILL_PRICE, LIVES_REFILL_AMOUNT, ITEMS, getCatalog, findItem, findBoosterItem, findCoinPackByProductId };
