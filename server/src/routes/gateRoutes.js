const express = require('express');
const router = express.Router();
const gateController = require('../controllers/gateController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

router.use(verifyToken);

// Accessible by all management roles
const allowedRoles = ['admin', 'principal', 'hod', 'staff', 'warden', 'gatekeeper'];

router.get('/live', authorizeRoles(...allowedRoles), gateController.getLiveStatus);
router.get('/history', authorizeRoles(...allowedRoles), gateController.getHistory);
router.get('/logs', authorizeRoles(...allowedRoles), gateController.getHistory); // Alias for Frontend Compatibility
router.get('/dashboard-stats', authorizeRoles(...allowedRoles), gateController.getDashboardStats);

router.post('/verify-pass', authorizeRoles(...allowedRoles), gateController.verifyPass);
router.post('/log-action', authorizeRoles(...allowedRoles), gateController.logAction);

// Legacy/Compatibility support (Forwarding to new logic if feasible, or just replacing usage in frontend)
// For now, I will use verifyPass/logAction in the new UI.
// But Scanner.jsx used /scan and /manual-entry. I will add them to map:
// router.post('/scan', ...) -> We are changing Frontend, so no need to keep old routes if we rewrite Frontend fully. But creating aliases is safer.
router.post('/scan', authorizeRoles(...allowedRoles), gateController.verifyPass); // Note: verifyPass expects qrHash, scan sent {type, qrHash}. Controller needs to handle if type is passed but ignored? verifyPass does not look at 'type' in body.

module.exports = router;
