/**
 * level_<n>.json dosyalarını `levels` tablosuna upsert eder.
 *
 *   npm run seed:levels                      # LEVELS_DIR veya varsayılan dizin
 *   npm run seed:levels -- /yol/levels       # dizin argümanla
 *   npm run seed:levels -- /yol --prune      # dizinde olmayan bölümleri DB'den siler
 *   npm run seed:levels -- /yol --dry-run    # yalnızca doğrular, DB'ye yazmaz
 *
 * Varsayılan dizin: ../arrow_shift/assets/mock/levels (yoksa ../arrow_shift/assets/mock).
 */
const fs = require('fs');
const path = require('path');
const env = require('../src/config/env');
const { levelNumberFromFilename, parseLevelJson } = require('../src/lib/levelFile');

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith('--')));
const positional = argv.filter((a) => !a.startsWith('--'));
const prune = flags.has('--prune');
const dryRun = flags.has('--dry-run');

const DEFAULT_DIRS = [
  path.resolve(__dirname, '..', '..', 'arrow_shift', 'assets', 'mock', 'levels'),
  path.resolve(__dirname, '..', '..', 'arrow_shift', 'assets', 'mock'),
];

function resolveDir() {
  if (positional[0]) return path.resolve(process.cwd(), positional[0]);
  if (env.levelsDir) return path.resolve(path.resolve(__dirname, '..'), env.levelsDir);
  const found = DEFAULT_DIRS.find((d) => fs.existsSync(d) && fs.readdirSync(d).some((f) => levelNumberFromFilename(f)));
  return found || DEFAULT_DIRS[0];
}

async function main() {
  const dir = resolveDir();
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    throw new Error(`Bölüm dizini bulunamadı: ${dir} (LEVELS_DIR veya argümanla verin)`);
  }

  const files = fs
    .readdirSync(dir)
    .filter((f) => levelNumberFromFilename(f) !== null)
    .sort((a, b) => levelNumberFromFilename(a) - levelNumberFromFilename(b));
  console.log(`Dizin: ${dir} · ${files.length} dosya`);
  if (files.length === 0) throw new Error('level_<n>.json dosyası yok');

  const levels = [];
  const errors = [];
  for (const file of files) {
    const fileNumber = levelNumberFromFilename(file);
    try {
      const json = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
      const level = parseLevelJson(json, { expectedNumber: fileNumber });
      if (level.number !== fileNumber) {
        console.warn(`⚠ ${file}: içerikteki level=${level.number} dosya adıyla uyuşmuyor; dosya adı (${fileNumber}) kullanılıyor`);
        level.number = fileNumber;
      }
      levels.push(level);
    } catch (err) {
      errors.push(`${file}: ${err.message}`);
    }
  }
  for (const e of errors) console.error(`✖ ${e}`);

  const numbers = levels.map((l) => l.number);
  const max = numbers.length ? Math.max(...numbers) : 0;
  const missing = [];
  for (let i = 1; i <= max; i++) if (!numbers.includes(i)) missing.push(i);
  if (missing.length) {
    console.warn(`⚠ Eksik bölüm numaraları: ${missing.join(', ')} — GET /levels döngüsü 1..toplam aralığının kesintisiz olmasını varsayar`);
  }

  if (dryRun) {
    console.log(`Dry-run: ${levels.length} geçerli, ${errors.length} hatalı. DB'ye yazılmadı.`);
    return errors.length ? 1 : 0;
  }

  const { pool } = require('../src/db');
  try {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (const l of levels) {
        await conn.query(
          `INSERT INTO levels (number, cols, \`rows\`, reward, lives, arrows)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE cols = VALUES(cols), \`rows\` = VALUES(\`rows\`), reward = VALUES(reward),
             lives = VALUES(lives), arrows = VALUES(arrows)`,
          [l.number, l.cols, l.rows, l.reward, l.lives, JSON.stringify(l.arrows)],
        );
      }
      let pruned = 0;
      if (prune && numbers.length) {
        const [r] = await conn.query('DELETE FROM levels WHERE number NOT IN (?)', [numbers]);
        pruned = r.affectedRows;
      }
      await conn.commit();
      const [[{ total }]] = await conn.query('SELECT COUNT(*) AS total FROM levels');
      console.log(`✔ ${levels.length} bölüm upsert edildi${prune ? `, ${pruned} silindi` : ''}. Tablodaki toplam: ${total}`);
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } finally {
    await pool.end();
  }
  return errors.length ? 1 : 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(`✖ seed-levels başarısız: ${err.message}`);
    process.exit(1);
  });
