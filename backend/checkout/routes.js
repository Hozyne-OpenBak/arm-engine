const express = require('express');
const router = express.Router();
const checkoutController = require('./controller');
const { authenticateJWT } = require('../auth/middleware');

// All checkout routes require authentication
router.use(authenticateJWT);

router.post('/session', checkoutController.createCheckoutSession);
router.get('/session/:sessionId', checkoutController.getCheckoutSession);

module.exports = router;
