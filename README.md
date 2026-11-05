# Arrow Shift API

Flutter bulmaca oyunu **Arrow Shift** için Node.js REST API.
Express 5 + mysql2 (promise pool) + CommonJS, MariaDB/MySQL. ORM yok, build adımı yok.
Sözleşme: `arrow_shift/docs/API_CONTRACT.md` (snake_case alanlar, `{status, message, data}` zarfı).

Reklam yoktur. Coin paketleri RevenueCat ile satılan consumable IAP'lerdir; coin'i yalnızca sunucu yükler.

## Kurulum

```bash
cp .env.example .env          # DB bilgileri, JWT_SECRET, RevenueCat anahtarları
npm install
npm run migrate               # migrations/*.sql → schema_migrations tablosuna işlenir
npm run seed:levels           # level_<n>.json → levels tablosu (upsert)
npm start                     # geliştirme: npm run dev
```

- Yerel geliştirmede veritabanı yoksa: `npm run migrate -- --create-db`
- Migration durumu: `npm run migrate:status`
- Seed dizini: argüman > `LEVELS_DIR` > `../arrow_shift/assets/mock/levels` (yoksa `../arrow_shift/assets/mock`)
  - `npm run seed:levels -- /yol/levels` · `-- --dry-run` (yalnızca doğrula) · `-- --prune` (dizinde olmayan bölümleri sil)
  - `GET /levels` döngüsü 1..toplam aralığının kesintisiz olmasını varsayar; script boşlukları uyarır.
- `JWT_SECRET` üretmek: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`

## Testler

```bash
npm test        # node:test — yıldız hesabı, bölüm döngüsü, katalog, RevenueCat ayrıştırma/karar, seed doğrulama
npm run check   # tüm dosyalarda node --check
```

## Yapı

```
src/
  index.js            # giriş noktası (DB ping, listen, graceful shutdown)
  app.js              # express app: cors, json limit, güvenlik başlıkları, morgan→winston, 404, hata zarfı
  db.js               # mysql2/promise havuzu (DB_POOL_LIMIT, varsayılan 5) + withTransaction
  logger.js           # winston (console + logs/combined.log + logs/error.log)
  config/env.js       # .env okuma (yol __dirname'e göre)
  config/catalog.js   # mağaza kataloğu
  routes/ controllers/ services/ middleware/ lib/
migrations/001_init.sql
scripts/migrate.js, scripts/seed-levels.js
test/*.test.js
```

## Uçlar

| Metot | Yol | Kimlik | Dosyalar |
|---|---|---|---|
| GET | `/health` | – | `controllers/healthController.js` |
| POST | `/auth/device` | – | `routes/authRoutes.js` → `controllers/authController.js` → `services/authService.js` |
| POST | `/auth/refresh` | – | aynı (rotasyon; eski token iptal) |
| GET | `/levels/meta` | isteğe bağlı | `routes/levelRoutes.js` → `controllers/levelController.js` → `services/levelService.js` |
| GET | `/levels/:number` | isteğe bağlı | aynı (`Cache-Control: public, max-age=86400`) |
| GET | `/player/progress` | Bearer | `routes/playerRoutes.js` → `controllers/playerController.js` → `services/userService.js` |
| POST | `/player/tutorial-complete` | Bearer | → `services/playerService.js` |
| POST | `/player/level-complete` | Bearer | → `services/playerService.js` (`client_event_id` ile idempotent) |
| POST | `/player/boosters/consume` | Bearer | → `services/playerService.js` (`client_event_id` ile idempotent) |
| POST | `/player/boosters/buy` | Bearer | → `services/playerService.js` |
| POST | `/player/lives/refill` | Bearer | → `services/playerService.js` |
| GET | `/shop/catalog` | isteğe bağlı | `routes/shopRoutes.js` → `controllers/shopController.js` → `config/catalog.js` |
| POST | `/purchases/sync` | Bearer | `routes/purchaseRoutes.js` → `controllers/purchaseController.js` → `services/purchaseService.js` + `services/revenueCatClient.js` |
| POST | `/webhooks/revenuecat` | `REVENUECAT_WEBHOOK_AUTH` | `routes/webhookRoutes.js` → `controllers/revenueCatController.js` → `services/purchaseService.js` |

Hata kodları (`message`): `invalid_request` 400, `unauthorized` 401, `not_found` 404,
`insufficient_coins` / `booster_unavailable` / `level_locked` 409, `server_error` 500.

## Tutarlılık kuralları

- Coin/booster değişiklikleri transaction içinde, kullanıcı satırı `SELECT ... FOR UPDATE` ile kilitlenerek yapılır; bakiye negatife düşemez.
- Her coin değişikliği `coin_ledger`'a yazılır (`level_reward`, `booster_buy`, `lives_refill`, `purchase`, `purchase_refund`).
- `client_events (user_id, client_event_id)` UNIQUE: aynı olay tekrar gelirse ilk cevap döner.
- `purchase_transactions.transaction_id` UNIQUE = mağaza işlem id'si (webhook `transaction_id` == REST `store_transaction_id`); webhook ve sync aynı işlemi iki kez yükleyemez.
- İade (`CANCELLATION`/`REFUND`): yüklenen coin geri alınır, bakiye 0'da durur. İade krediden önce gelirse 0 coin'lik `refunded` kayıt bırakılır, sonradan yüklenmez.

## RevenueCat

- Panel → Integrations → Webhooks: URL `https://<alan>/webhooks/revenuecat`, Authorization değeri = `REVENUECAT_WEBHOOK_AUTH`.
- `/purchases/sync`: `GET https://api.revenuecat.com/v1/subscribers/{user.id}` (`REVENUECAT_SECRET_KEY`, sk_...).
- Uygulama `Purchases.logIn(user.id)` yapmalı; webhook'ta kullanıcı `app_user_id`, `original_app_user_id`, `aliases`, `transferred_to` içinden bulunur. Bilinmeyen kullanıcı → 200 (sonraki sync yükler).

## Deploy (PM2 + nginx)

```bash
npm ci --omit=dev
cp .env.example .env && nano .env          # PORT için önce: sudo ss -tlnp
npm run migrate && npm run seed:levels -- /yol/levels
pm2 startOrReload ecosystem.config.js --update-env && pm2 save
curl https://<alan>/health
```

nginx: `proxy_pass http://127.0.0.1:<PORT>;` + `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto` başlıkları;
`sudo nginx -t && sudo systemctl reload nginx`; SSL için `certbot --nginx`.
Havuz limiti küçük (5): aynı MySQL'i kullanan diğer API'lerin bağlantı bütçesini etkilemez.

Geri alma: `pm2 stop arrowshift-api` (diğer süreçlere dokunmaz). Şema tamamen yeni tablolardan oluşur; başka uygulamanın tablosunu değiştirmez.

## Loglar

- Konsol (renkli), `logs/combined.log`, `logs/error.log` (winston, boyut sınırlı dönüşüm)
- HTTP satırları morgan ile combined log'a (`lang=` Accept-Language dahil)
