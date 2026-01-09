const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

router.use(verifyToken); // All routes require login

router.get('/', notificationController.getMyNotifications);
router.put('/:id/read', notificationController.markAsRead);
router.put('/read-all', notificationController.markAllAsRead);

// Register Push Subscription
router.post('/subscribe', notificationController.subscribe);
router.get('/vapid-key', notificationController.getVapidKey);

// Admin only: Broadcast
router.post('/broadcast', authorizeRoles('admin', 'principal', 'hod', 'warden'), notificationController.broadcast);

module.exports = router;
