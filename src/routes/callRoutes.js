const express = require('express');
const { initiateCall} = require('../controllers/callController');
const router = express.Router();

router.post('/initiateCall', initiateCall);

module.exports = router;
