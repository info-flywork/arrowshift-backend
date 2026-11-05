// Bölüm sonu coin ödülü (saf; DB'siz, test edilebilir).
// Flutter tarafındaki lib/domain/game/reward_rules.dart ile BİREBİR aynı formül.
//
// ödül = taban(seviye) × hız çarpanı(süre / hedef süre) × doğruluk çarpanı(hata)
//  - Taban: her 10 bölümde +5 (20 → en fazla 150).
//  - Hedef süre: 10 sn + ok başına 3 sn. Hedefin yarısında bitirmek ×1.5,
//    tam hedefte ×1.0, 2 katında ×0.7, daha yavaşta yavaşça ×0.5'e iner.
//  - Hata (engelli oka dokunup can kaybetme): 0 → ×1.0, 1 → ×0.8, 2 → ×0.65, 3+ → ×0.5.
//  - En az 5 coin. Hile koruması: süre ok başına 0.25 sn'nin altında sayılmaz.

const MIN_REWARD = 5;
const MAX_BASE = 150;
const ACCURACY = Object.freeze([1.0, 0.8, 0.65, 0.5]);

function baseReward(level) {
  const n = Math.max(1, Math.floor(Number(level) || 1));
  return Math.min(MAX_BASE, 20 + 5 * Math.floor((n - 1) / 10));
}

function parMs(arrowCount) {
  return (10 + 3 * Math.max(0, arrowCount)) * 1000;
}

function speedMultiplier(durationMs, arrowCount) {
  const minMs = Math.max(0, arrowCount) * 250;
  const ratio = Math.max(durationMs, minMs) / parMs(arrowCount);
  let m;
  if (ratio <= 0.5) m = 1.5;
  else if (ratio <= 1) m = 1.5 - (ratio - 0.5);
  else if (ratio <= 2) m = 1.0 - 0.3 * (ratio - 1);
  else m = Math.max(0.5, 0.7 - 0.05 * (ratio - 2));
  return Math.round(m * 100) / 100;
}

function accuracyMultiplier(mistakes) {
  const n = Math.max(0, Math.floor(Number(mistakes) || 0));
  return ACCURACY[Math.min(n, ACCURACY.length - 1)];
}

/**
 * @param {{ level: number, arrowCount: number, durationMs?: number|null, mistakes?: number }} input
 * durationMs yoksa hedef süre varsayılır (×1.0).
 */
function calcReward({ level, arrowCount, durationMs = null, mistakes = 0 }) {
  const arrows = Math.max(0, Math.floor(Number(arrowCount) || 0));
  const duration = Number.isFinite(durationMs) && durationMs >= 0 ? durationMs : parMs(arrows);
  const base = baseReward(level);
  const speed = speedMultiplier(duration, arrows);
  const accuracy = accuracyMultiplier(mistakes);
  const total = Math.max(MIN_REWARD, Math.round(base * speed * accuracy));
  return { base, speed, accuracy, total };
}

module.exports = { calcReward, baseReward, speedMultiplier, accuracyMultiplier, parMs, MIN_REWARD };
