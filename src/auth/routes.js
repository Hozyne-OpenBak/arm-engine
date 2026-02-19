// Routes for authentication
const express = require('express');
const { signup, login, me } = require('./controller');
const { authenticateToken } = require('./middleware');

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', authenticateToken, me);

module.exports = router;