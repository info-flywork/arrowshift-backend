const express = require('express');
const levelController = require('../controllers/levelController');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();
router.use(optionalAuth);
router.get('/meta', levelController.meta); // :number'dan önce olmalı
router.get('/:number', levelController.getLevel);

module.exports = router;
