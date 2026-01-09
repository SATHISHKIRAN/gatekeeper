const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

// Public route to get settings (for Login page branding etc.)
router.get('/', settingsController.getSettings);

// Protected route to update settings (Admin only)
// Protected route to update settings (Admin only)
router.put('/', verifyToken, authorizeRoles('admin'), settingsController.updateSettings);

// Verify Admin PIN
router.post('/verify-pin', verifyToken, authorizeRoles('admin'), settingsController.verifyAdminPassword);

module.exports = router;
