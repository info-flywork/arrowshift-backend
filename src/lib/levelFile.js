// level_<n>.json dosyalarını doğrular (seed script'i ve testler kullanır).

const FILE_RE = /^level_(\d+)\.json$/;

function levelNumberFromFilename(filename) {
  const m = FILE_RE.exec(filename);
  return m ? Number(m[1]) : null;
}

function isPoint(p) {
  return Array.isArray(p) && p.length === 2 && p.every((v) => Number.isInteger(v) && v >= 0);
}

/**
 * Dosya içeriğini (zarf {status,message,data} veya doğrudan data) doğrular.
 * @returns {{ number, cols, rows, reward, lives, arrows }}
 */
function parseLevelJson(json, { expectedNumber = null } = {}) {
  const data = json && typeof json === 'object' && json.data && typeof json.data === 'object' ? json.data : json;
  if (!data || typeof data !== 'object') throw new Error('data nesnesi yok');

  const number = Number.isInteger(data.level) && data.level >= 1 ? data.level : expectedNumber;
  if (!Number.isInteger(number) || number < 1) throw new Error('level numarası geçersiz');

  const { cols, rows } = data;
  if (!Number.isInteger(cols) || cols < 1 || cols > 1000) throw new Error('cols geçersiz');
  if (!Number.isInteger(rows) || rows < 1 || rows > 1000) throw new Error('rows geçersiz');

  const reward = data.reward === undefined ? 0 : data.reward;
  if (!Number.isInteger(reward) || reward < 0) throw new Error('reward geçersiz');
  const lives = data.lives === undefined ? 3 : data.lives;
  if (!Number.isInteger(lives) || lives < 1 || lives > 255) throw new Error('lives geçersiz');

  if (!Array.isArray(data.arrows) || data.arrows.length === 0) throw new Error('arrows boş veya dizi değil');
  data.arrows.forEach((a, i) => {
    if (!a || typeof a !== 'object') throw new Error(`arrows[${i}] nesne değil`);
    if (typeof a.id !== 'string' || !a.id) throw new Error(`arrows[${i}].id geçersiz`);
    if (!Array.isArray(a.path) || a.path.length < 2 || !a.path.every(isPoint)) {
      throw new Error(`arrows[${i}].path geçersiz`);
    }
  });

  return { number, cols, rows, reward, lives, arrows: data.arrows };
}

module.exports = { FILE_RE, levelNumberFromFilename, parseLevelJson };
