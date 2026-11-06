// Bölüm sonu coin ödülü (saf; DB'siz, test edilebilir).
// Flutter tarafındaki lib/domain/game/reward_rules.dart ile BİREBİR aynı formül.
//
// ödül = taban(zorluk) × hız çarpanı(süre / hedef süre) × doğruluk çarpanı(hata)
//  - Taban: bölümün zorluk kademesi (levels.reward): Kolay 8, Normal 12,
//    Zor 18, Çok Zor 25. Geçersiz/eski değerler 5..25 aralığına sıkıştırılır.
//  - Hedef süre: 10 sn + ok başına 3 sn. Hedefin yarısında bitirmek ×1.5,
//    tam hedefte ×1.0, 2 katında ×0.7, daha yavaşta yavaşça ×0.5'e iner.
//  - Hata (engelli oka dokunup can kaybetme): 0 → ×1.0, 1 → ×0.8, 2 → ×0.65, 3+ → ×0.5.
//  - En az 3 coin. Hile koruması: süre ok başına 0.25 sn'nin altında sayılmaz.

const MIN_REWARD = 3;
const MIN_BASE = 5;
const MAX_BASE = 25;
const DEFAULT_BASE = 12;
const ACCURACY = Object.freeze([1.0, 0.8, 0.65, 0.5]);

/** Bölümün zorluk tabanı (levels.reward) -> geçerli taban coin. */
function baseReward(levelReward) {
  const n = Math.floor(Number(levelReward));
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_BASE;
  return Math.min(MAX_BASE, Math.max(MIN_BASE, n));
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
 * @param {{ levelReward: number, arrowCount: number, durationMs?: number|null, mistakes?: number }} input
 * durationMs yoksa hedef süre varsayılır (×1.0).
 */
function calcReward({ levelReward, arrowCount, durationMs = null, mistakes = 0 }) {
  const arrows = Math.max(0, Math.floor(Number(arrowCount) || 0));
  const duration = Number.isFinite(durationMs) && durationMs >= 0 ? durationMs : parMs(arrows);
  const base = baseReward(levelReward);
  const speed = speedMultiplier(duration, arrows);
  const accuracy = accuracyMultiplier(mistakes);
  const total = Math.max(MIN_REWARD, Math.round(base * speed * accuracy));
  return { base, speed, accuracy, total };
}

module.exports = { calcReward, baseReward, speedMultiplier, accuracyMultiplier, parMs, MIN_REWARD };
