const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

// All routes are protected and restricted to staff role
router.use(verifyToken);
router.use(authorizeRoles('staff'));

router.get('/dashboard', staffController.getDashboardStats);
router.get('/my-students', staffController.getMyStudents);
router.get('/analytics', staffController.getAnalytics);
router.get('/history', staffController.getHistory);
router.get('/student/:id', staffController.getStudentProfile);
router.post('/bulk-approve', staffController.bulkApprove);

module.exports = router;
