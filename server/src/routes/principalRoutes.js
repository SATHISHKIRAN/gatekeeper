const express = require('express');
const router = express.Router();
const principalController = require('../controllers/principalController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

router.use(verifyToken);

// Broadcast is shared between Principal and Admin
router.post('/broadcast', authorizeRoles('principal', 'admin'), principalController.broadcastMessage);

// Other routes are Principal only
router.get('/stats', authorizeRoles('principal'), principalController.getDashboardStats);
router.get('/profile', authorizeRoles('principal'), principalController.getProfile);
router.get('/pulse', authorizeRoles('principal'), principalController.getLivePulse);
router.get('/analytics', authorizeRoles('principal'), principalController.getAnalytics);
router.get('/reports', authorizeRoles('principal'), principalController.getReports);

module.exports = router;
