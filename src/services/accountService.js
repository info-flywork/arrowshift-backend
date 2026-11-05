const { withTransaction } = require('../db');
const { lockUser } = require('./userService');
const revenueCatClient = require('./revenueCatClient');
const logger = require('../logger');

/**
 * Uygulama içi veri silme (KVKK m.11 / GDPR m.17).
 * - Oyun verileri (ilerleme, yıldızlar, coin defteri, istemci olayları, oturumlar) silinir.
 * - Kullanıcı satırı anonimleştirilir: cihaz kimliği kaldırılır, bakiye sıfırlanır, deleted_at işaretlenir.
 *   Aynı cihaz tekrar açılırsa yepyeni bir hesap oluşur.
 * - purchase_transactions yasal (ticari kayıt) saklama için kalır; artık hiçbir cihaza/kişiye bağlı değildir.
 * - RevenueCat'teki müşteri kaydı silinir (başarısız olursa loglanır, yerel silme geri alınmaz).
 */
async function deleteAccount(userId) {
  await withTransaction(async (conn) => {
    await lockUser(conn, userId);
    for (const table of ['refresh_tokens', 'level_results', 'client_events', 'coin_ledger']) {
      await conn.query(`DELETE FROM ${table} WHERE user_id = ?`, [userId]);
    }
    await conn.query(
      `UPDATE users SET device_id = CONCAT('deleted:', id), platform = NULL, app_version = NULL,
         coins = 0, current_level = 1, hints = 0, undos = 0, tutorial_seen = 0, deleted_at = CURRENT_TIMESTAMP(3)
       WHERE id = ?`,
      [userId],
    );
  });
  logger.info('account.deleted', { user_id: userId });

  let revenueCatDeleted = false;
  try {
    await revenueCatClient.deleteSubscriber(userId);
    revenueCatDeleted = true;
  } catch (err) {
    logger.error('account.revenuecat_delete_failed', { user_id: userId, error: err.message });
  }
  return { deleted: true, revenuecat_deleted: revenueCatDeleted };
}

module.exports = { deleteAccount };
