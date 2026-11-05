const express = require('express');
const shopController = require('../controllers/shopController');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();
router.get('/catalog', optionalAuth, shopController.catalog);

module.exports = router;
