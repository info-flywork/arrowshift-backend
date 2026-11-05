const levelService = require('../services/levelService');
const { success } = require('../lib/response');
const { ApiError } = require('../lib/apiError');
const { parseLevelNumber } = require('../lib/game');

async function meta(_req, res) {
  res.set('Cache-Control', 'public, max-age=300');
  return success(res, { total: await levelService.getTotal() });
}

async function getLevel(req, res) {
  const number = parseLevelNumber(req.params.number);
  if (number === null) throw ApiError.badRequest('number must be an integer >= 1');
  const level = await levelService.getLevel(number);
  res.set('Cache-Control', 'public, max-age=86400');
  return success(res, level);
}

module.exports = { meta, getLevel };
