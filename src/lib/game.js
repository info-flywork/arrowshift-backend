// Saf oyun kuralları (DB'siz, test edilebilir).

/** lives_left >= 3 → 3, 2 → 2, <= 1 → 1 (en az 1 yıldız). */
function calcStars(livesLeft) {
  const n = Number(livesLeft);
  if (!Number.isFinite(n)) return 1;
  if (n >= 3) return 3;
  if (n >= 2) return 2;
  return 1;
}

/** Toplamın üstündeki bölüm numaraları döngüyle eşlenir: ((number - 1) % total) + 1 */
function levelSlot(number, total) {
  if (!Number.isInteger(number) || number < 1) throw new RangeError('number must be an integer >= 1');
  if (!Number.isInteger(total) || total < 1) throw new RangeError('total must be an integer >= 1');
  return ((number - 1) % total) + 1;
}

/** "12" → 12; geçersizse null. */
function parseLevelNumber(raw) {
  if (typeof raw !== 'string' || !/^\d{1,9}$/.test(raw)) return null;
  const n = Number(raw);
  return n >= 1 ? n : null;
}

const NEW_USER_DEFAULTS = Object.freeze({
  coins: 320,
  current_level: 1,
  hints: 3,
  undos: 3,
  tutorial_seen: false,
});

const BOOSTER_COLUMNS = Object.freeze({ hint: 'hints', undo: 'undos' });

module.exports = { calcStars, levelSlot, parseLevelNumber, NEW_USER_DEFAULTS, BOOSTER_COLUMNS };
