-- Arrow Shift başlangıç şeması. MariaDB 10.6+ ve MySQL 8+ uyumlu.
-- JSON veriler LONGTEXT olarak tutulur (MariaDB'de JSON zaten LONGTEXT takma adıdır).

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL,
  device_id VARCHAR(128) NOT NULL,
  platform VARCHAR(16) NULL,
  app_version VARCHAR(32) NULL,
  coins INT UNSIGNED NOT NULL DEFAULT 320,
  current_level INT UNSIGNED NOT NULL DEFAULT 1,
  hints INT UNSIGNED NOT NULL DEFAULT 3,
  undos INT UNSIGNED NOT NULL DEFAULT 3,
  tutorial_seen TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_device_id (device_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  revoked_at DATETIME(3) NULL,
  replaced_by_id BIGINT UNSIGNED NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_refresh_tokens_hash (token_hash),
  KEY idx_refresh_tokens_user (user_id),
  CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS levels (
  number INT UNSIGNED NOT NULL,
  cols SMALLINT UNSIGNED NOT NULL,
  `rows` SMALLINT UNSIGNED NOT NULL,
  reward INT UNSIGNED NOT NULL DEFAULT 0,
  lives TINYINT UNSIGNED NOT NULL DEFAULT 3,
  arrows LONGTEXT NOT NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS level_results (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id CHAR(36) NOT NULL,
  level INT UNSIGNED NOT NULL,
  best_stars TINYINT UNSIGNED NOT NULL,
  completed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_level_results_user_level (user_id, level),
  CONSTRAINT fk_level_results_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- İstemci olayları için idempotentlik: aynı (user_id, client_event_id) ikinci kez gelirse saklanan cevap döner.
CREATE TABLE IF NOT EXISTS client_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id CHAR(36) NOT NULL,
  client_event_id VARCHAR(64) NOT NULL,
  type VARCHAR(32) NOT NULL,
  response LONGTEXT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_client_events_user_event (user_id, client_event_id),
  CONSTRAINT fk_client_events_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- RevenueCat coin paketi işlemleri. transaction_id = mağaza işlem id'si (webhook transaction_id == REST store_transaction_id),
-- böylece webhook ve /purchases/sync aynı işlemi iki kez yükleyemez.
CREATE TABLE IF NOT EXISTS purchase_transactions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  transaction_id VARCHAR(191) NOT NULL,
  rc_transaction_id VARCHAR(191) NULL,
  user_id CHAR(36) NOT NULL,
  product_id VARCHAR(191) NOT NULL,
  coins INT UNSIGNED NOT NULL DEFAULT 0,
  source ENUM('webhook','sync') NOT NULL,
  status ENUM('credited','refunded') NOT NULL,
  environment VARCHAR(16) NULL,
  raw LONGTEXT NULL,
  refunded_at DATETIME(3) NULL,
  refund_raw LONGTEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_purchase_transactions_tx (transaction_id),
  KEY idx_purchase_transactions_user (user_id),
  CONSTRAINT fk_purchase_transactions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Her coin değişikliği (delta negatif olabilir).
CREATE TABLE IF NOT EXISTS coin_ledger (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id CHAR(36) NOT NULL,
  delta INT NOT NULL,
  balance_after INT UNSIGNED NOT NULL,
  reason VARCHAR(32) NOT NULL,
  ref VARCHAR(191) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_coin_ledger_user (user_id, created_at),
  CONSTRAINT fk_coin_ledger_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
