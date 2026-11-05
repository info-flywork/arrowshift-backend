const { ApiError, CODES } = require('../lib/apiError');
const { calcStars, BOOSTER_COLUMNS } = require('../lib/game');
const { calcReward } = require('../lib/reward');
const { findBoosterItem, LIVES_REFILL_PRICE } = require('../config/catalog');
const { mutateUser, totalStars, toProgress, changeCoins } = require('./userService');
const levelService = require('./levelService');
const logger = require('../logger');

async function snapshot(conn, user) {
  return toProgress(user, await totalStars(conn, user.id));
}

async function completeTutorial(userId) {
  return mutateUser(userId, { type: 'tutorial_complete' }, async (conn, user) => {
    if (!Number(user.tutorial_seen)) {
      await conn.query('UPDATE users SET tutorial_seen = 1 WHERE id = ?', [userId]);
      user.tutorial_seen = 1;
    }
    return snapshot(conn, user);
  });
}

async function completeLevel(userId, { level, livesLeft, durationMs = null, mistakes = null, clientEventId }) {
  // Ok sayısı önbellekten/levels tablosundan okunur (transaction dışında; levels tablosu kullanıcı başına kilit gerektirmez).
  const arrowCount = await levelService.getArrowCount(level);
  // Eski istemciler hata sayısı göndermez: kalan candan türetilir.
  const mistakeCount = mistakes ?? Math.max(0, 3 - livesLeft);
  const breakdown = calcReward({ level, arrowCount, durationMs, mistakes: mistakeCount });

  return mutateUser(userId, { type: 'level_complete', clientEventId }, async (conn, user) => {
    const current = Number(user.current_level);
    if (level > current) throw ApiError.conflict(CODES.LEVEL_LOCKED, `level ${level} > current ${current}`);

    const stars = calcStars(livesLeft);
    await conn.query(
      `INSERT INTO level_results (user_id, level, best_stars) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE best_stars = GREATEST(best_stars, VALUES(best_stars))`,
      [userId, level, stars],
    );

    const alreadyCompleted = level < current;
    let reward = 0;
    if (!alreadyCompleted) {
      reward = breakdown.total;
      await conn.query('UPDATE users SET current_level = current_level + 1 WHERE id = ?', [userId]);
      user.current_level = current + 1;
      if (reward > 0) await changeCoins(conn, user, reward, 'level_reward', `level:${level}`);
    }

    if (!alreadyCompleted) {
      logger.info('level.reward', { user_id: userId, level, arrows: arrowCount, duration_ms: durationMs, mistakes: mistakeCount, ...breakdown });
    }
    return {
      progress: await snapshot(conn, user),
      stars,
      reward,
      already_completed: alreadyCompleted,
      reward_breakdown: { base: breakdown.base, speed: breakdown.speed, accuracy: breakdown.accuracy },
    };
  });
}

async function consumeBooster(userId, { booster, clientEventId }) {
  const column = BOOSTER_COLUMNS[booster];
  if (!column) throw ApiError.badRequest('booster must be hint or undo');
  return mutateUser(userId, { type: 'booster_consume', clientEventId }, async (conn, user) => {
    if (Number(user[column]) <= 0) throw ApiError.conflict(CODES.BOOSTER_UNAVAILABLE);
    await conn.query(`UPDATE users SET ${column} = ${column} - 1 WHERE id = ?`, [userId]);
    user[column] = Number(user[column]) - 1;
    return snapshot(conn, user);
  });
}

async function buyBooster(userId, { itemId, clientEventId }) {
  const item = findBoosterItem(itemId);
  if (!item) throw ApiError.badRequest('unknown booster item_id');
  const column = BOOSTER_COLUMNS[item.booster];
  return mutateUser(userId, { type: 'booster_buy', clientEventId }, async (conn, user) => {
    if (Number(user.coins) < item.price) throw ApiError.conflict(CODES.INSUFFICIENT_COINS);
    await changeCoins(conn, user, -item.price, 'booster_buy', item.id);
    await conn.query(`UPDATE users SET ${column} = ${column} + ? WHERE id = ?`, [item.quantity, userId]);
    user[column] = Number(user[column]) + item.quantity;
    return snapshot(conn, user);
  });
}

async function refillLives(userId, { clientEventId }) {
  return mutateUser(userId, { type: 'lives_refill', clientEventId }, async (conn, user) => {
    if (Number(user.coins) < LIVES_REFILL_PRICE) throw ApiError.conflict(CODES.INSUFFICIENT_COINS);
    await changeCoins(conn, user, -LIVES_REFILL_PRICE, 'lives_refill', clientEventId);
    logger.info('lives.refill', { user_id: userId, price: LIVES_REFILL_PRICE, balance_after: user.coins });
    return snapshot(conn, user);
  });
}

module.exports = { completeTutorial, completeLevel, consumeBooster, buyBooster, refillLives };
