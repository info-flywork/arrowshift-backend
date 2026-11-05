const { getCatalog } = require('../config/catalog');
const { success } = require('../lib/response');

function catalog(_req, res) {
  res.set('Cache-Control', 'public, max-age=300');
  return success(res, getCatalog());
}

module.exports = { catalog };
