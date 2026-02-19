const express = require('express');
const router = express.Router();
const subscriptionController = require('./controller');
const { authenticateJWT } = require('../auth/middleware'); // From Phase 1

// Protect all subscription routes
router.use(authenticateJWT);

router.post('/create', subscriptionController.createSubscription);
router.post('/upgrade', subscriptionController.upgradeSubscription);
router.get('/current', subscriptionController.getCurrentSubscription);
router.post('/cancel', subscriptionController.cancelSubscription);

module.exports = router;