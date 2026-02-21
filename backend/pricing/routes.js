const express = require('express');
const router = express.Router();
const pricingController = require('./controller');
const rateLimit = require('express-rate-limit');

// Rate limiting for pricing endpoint (per architect's spec)
const pricingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});

// Public routes - no authentication required
router.get('/', pricingLimiter, pricingController.getPricingTiers);
router.get('/:id', pricingLimiter, pricingController.getPricingTier);

module.exports = router;
