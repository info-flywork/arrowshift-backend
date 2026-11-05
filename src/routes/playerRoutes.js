const express = require('express');
const playerController = require('../controllers/playerController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);
router.get('/progress', playerController.progress);
router.post('/tutorial-complete', playerController.tutorialComplete);
router.post('/level-complete', playerController.levelComplete);
router.post('/boosters/consume', playerController.consumeBooster);
router.post('/boosters/buy', playerController.buyBooster);
router.post('/lives/refill', playerController.refillLives);
router.delete('/', playerController.deleteAccount);

module.exports = router;
