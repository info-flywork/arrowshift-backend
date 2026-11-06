const { pool } = require('../db');
const { ApiError } = require('../lib/apiError');
const { levelSlot } = require('../lib/game');

// Bölümler nadiren değişir; süreç belleğinde kısa süreli önbellek (seed sonrası en geç TTL kadar gecikme).
const CACHE_TTL_MS = 60_000;
let totalCache = { value: null, at: 0 };
const levelCache = new Map(); // slot -> { value, at }

function fresh(entry) {
  return entry && Date.now() - entry.at < CACHE_TTL_MS;
}

async function getTotal(conn = pool) {
  if (conn === pool && fresh(totalCache) && totalCache.value !== null) return totalCache.value;
  const [[row]] = await conn.query('SELECT COUNT(*) AS total FROM levels');
  const total = Number(row.total);
  if (conn === pool) totalCache = { value: total, at: Date.now() };
  return total;
}

async function getSlotRow(slot, conn = pool) {
  const cached = levelCache.get(slot);
  if (conn === pool && fresh(cached)) return cached.value;
  const [[row]] = await conn.query('SELECT number, cols, `rows`, reward, lives, arrows FROM levels WHERE number = ?', [slot]);
  const value = row
    ? {
        cols: Number(row.cols),
        rows: Number(row.rows),
        reward: Number(row.reward),
        lives: Number(row.lives),
        arrows: JSON.parse(row.arrows),
      }
    : null;
  if (conn === pool) levelCache.set(slot, { value, at: Date.now() });
  return value;
}

/** İstenen numara için bölüm; `level` alanı istenen numaradır (döngüsel eşleme). */
async function getLevel(number) {
  const total = await getTotal();
  if (total < 1) throw ApiError.notFound('no levels seeded');
  const row = await getSlotRow(levelSlot(number, total));
  if (!row) throw ApiError.notFound(`level slot missing for ${number}`);
  return { level: number, ...row };
}

/** Ödül hesabı için bölümdeki ok sayısı (bölüm yoksa 0). */
async function getArrowCount(number, conn = pool) {
  const total = await getTotal(conn);
  if (total < 1) return 0;
  const row = await getSlotRow(levelSlot(number, total), conn);
  return row ? row.arrows.length : 0;
}

/** Ödül hesabı için bölümün ok sayısı ve zorluk tabanı (levels.reward). */
async function getRewardInputs(number, conn = pool) {
  const total = await getTotal(conn);
  if (total < 1) return { arrowCount: 0, levelReward: 0 };
  const row = await getSlotRow(levelSlot(number, total), conn);
  return row
    ? { arrowCount: row.arrows.length, levelReward: row.reward }
    : { arrowCount: 0, levelReward: 0 };
}

/** Bölüm tablosundaki zorluk tabanı (levels.reward). */
async function getReward(number, conn = pool) {
  const total = await getTotal(conn);
  if (total < 1) return 0;
  const row = await getSlotRow(levelSlot(number, total), conn);
  return row ? row.reward : 0;
}

module.exports = { getTotal, getLevel, getReward, getArrowCount, getRewardInputs };
