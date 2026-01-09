const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsappService');
const systemController = require('../controllers/systemController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

// System Health & Monitoring
router.get('/stats', verifyToken, authorizeRoles('admin', 'principal', 'warden'), systemController.getSystemStats);
router.get('/logs', verifyToken, authorizeRoles('admin', 'principal'), systemController.getSystemLogs);

// Get WhatsApp Service Status and QR (if needed)
router.get('/status', verifyToken, authorizeRoles('admin'), (req, res) => {
    res.json({
        ready: whatsappService.isReady,
        sessionExists: true, // LocalAuth saves it
        lastError: null
    });
});

module.exports = router;
