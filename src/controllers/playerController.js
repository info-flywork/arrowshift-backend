const playerService = require('../services/playerService');
const accountService = require('../services/accountService');
const { getProgress } = require('../services/userService');
const { success } = require('../lib/response');
const { requireInt, requireString, optionalString } = require('../lib/validate');

const eventId = (v) => requireString(v, 'client_event_id', { max: 64 });
const optionalEventId = (v) => optionalString(v, 'client_event_id', { max: 64 });

async function progress(req, res) {
  return success(res, await getProgress(req.userId));
}

async function tutorialComplete(req, res) {
  return success(res, await playerService.completeTutorial(req.userId));
}

async function levelComplete(req, res) {
  const body = req.body || {};
  const data = await playerService.completeLevel(req.userId, {
    level: requireInt(body.level, 'level', { min: 1, max: 100_000_000 }),
    livesLeft: requireInt(body.lives_left, 'lives_left', { min: 0, max: 255 }),
    durationMs: body.duration_ms == null ? null : requireInt(body.duration_ms, 'duration_ms', { min: 0, max: 86_400_000 }),
    mistakes: body.mistakes == null ? null : requireInt(body.mistakes, 'mistakes', { min: 0, max: 10_000 }),
    clientEventId: eventId(body.client_event_id),
  });
  return success(res, data);
}

async function consumeBooster(req, res) {
  const body = req.body || {};
  const data = await playerService.consumeBooster(req.userId, {
    booster: requireString(body.booster, 'booster', { max: 16 }),
    clientEventId: eventId(body.client_event_id),
  });
  return success(res, data);
}

async function buyBooster(req, res) {
  const body = req.body || {};
  const data = await playerService.buyBooster(req.userId, {
    itemId: requireString(body.item_id, 'item_id', { max: 64 }),
    clientEventId: optionalEventId(body.client_event_id),
  });
  return success(res, data);
}

async function refillLives(req, res) {
  const body = req.body || {};
  const data = await playerService.refillLives(req.userId, { clientEventId: optionalEventId(body.client_event_id) });
  return success(res, data);
}

async function deleteAccount(req, res) {
  return success(res, await accountService.deleteAccount(req.userId));
}

module.exports = {
  deleteAccount, progress, tutorialComplete, levelComplete, consumeBooster, buyBooster, refillLives };
