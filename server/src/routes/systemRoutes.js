const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsappService');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

// Get WhatsApp Service Status and QR (if needed)
router.get('/status', verifyToken, authorizeRoles('admin'), (req, res) => {
    res.json({
        ready: whatsappService.isReady,
        sessionExists: true, // LocalAuth saves it
        lastError: null
    });
});

module.exports = router;
