const express = require('express');
const router = express.Router();
const { updatePushToken } = require('../controllers/pushNotificationController');
const { protect } = require('../middleware/authMiddleware');

router.post('/token', protect, updatePushToken);

module.exports = router;
