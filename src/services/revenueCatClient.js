const env = require('../config/env');
const { ApiError } = require('../lib/apiError');
const logger = require('../logger');

/** GET {REVENUECAT_API_BASE}/subscribers/{appUserId} (REST v1, secret key). */
async function getSubscriber(appUserId) {
  if (!env.revenueCatSecretKey) {
    logger.error('revenuecat.secret_missing');
    throw ApiError.server('REVENUECAT_SECRET_KEY not configured');
  }
  const url = `${env.revenueCatApiBase.replace(/\/$/, '')}/subscribers/${encodeURIComponent(appUserId)}`;
  let res;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${env.revenueCatSecretKey}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    logger.error('revenuecat.request_failed', { error: err.message });
    throw ApiError.server('revenuecat unreachable');
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    logger.error('revenuecat.bad_status', { status: res.status, body: text.slice(0, 500) });
    throw ApiError.server(`revenuecat status ${res.status}`);
  }
  return res.json();
}

/**
 * DELETE {REVENUECAT_API_BASE}/subscribers/{appUserId}: müşteriyi ve geçmişini RevenueCat'ten siler (KVKK/GDPR).
 * 404 (zaten yok) başarılı sayılır.
 */
async function deleteSubscriber(appUserId) {
  if (!env.revenueCatSecretKey) throw ApiError.server('REVENUECAT_SECRET_KEY not configured');
  const url = `${env.revenueCatApiBase.replace(/\/$/, '')}/subscribers/${encodeURIComponent(appUserId)}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${env.revenueCatSecretKey}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => '');
    throw ApiError.server(`revenuecat delete status ${res.status}: ${text.slice(0, 200)}`);
  }
}

module.exports = { getSubscriber, deleteSubscriber };
