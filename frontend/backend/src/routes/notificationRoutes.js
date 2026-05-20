const express = require('express');
const { protect } = require('../middleware/auth');
const { getNotifications } = require('../controllers/notificationController');

const router = express.Router();

router.get('/', protect, getNotifications);

module.exports = router;
