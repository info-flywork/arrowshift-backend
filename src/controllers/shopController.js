const { getCatalog } = require('../config/catalog');
const { success } = require('../lib/response');

function catalog(_req, res) {
  // Katalog nadiren değişir; uygulama ayrıca kendi önbelleğini 24 saat tutar.
  res.set('Cache-Control', 'public, max-age=3600');
  return success(res, getCatalog());
}

module.exports = { catalog };
