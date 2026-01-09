const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

router.use(verifyToken);
router.use(authorizeRoles('student'));

router.get('/profile', verifyToken, authorizeRoles('student'), studentController.getProfile);
router.get('/stats', verifyToken, authorizeRoles('student'), studentController.getDashboardStats);
router.post('/cancel-pass', studentController.cancelPass);
router.post('/change-password', studentController.changePassword);

module.exports = router;
