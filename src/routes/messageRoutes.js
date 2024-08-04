const express = require('express');
const router = express.Router();
const { sendMessage } = require('../controllers/messageController');
const { authenticateToken } = require('../middlewares/authMiddleware');

router.post('/sendMessage', sendMessage);

module.exports = router;
