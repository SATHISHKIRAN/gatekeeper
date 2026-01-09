const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

// All routes are protected and restricted to staff role
router.use(verifyToken);
router.use(authorizeRoles('staff', 'hod'));

router.get('/dashboard', staffController.getDashboardStats);
router.get('/profile', verifyToken, authorizeRoles('staff'), staffController.getProfile);
router.get('/my-students', staffController.getMyStudents);
router.get('/analytics', staffController.getAnalytics);
router.get('/history', staffController.getHistory);
router.get('/proxy/pending', staffController.getProxyPendingRequests);
router.get('/student/:id', staffController.getStudentProfile);
router.post('/bulk-approve', staffController.bulkApprove);
router.post('/proxy/medical-override', authorizeRoles('staff'), staffController.proxyMedicalOverride);
router.get('/proxy/medical-history', authorizeRoles('staff'), staffController.getProxyOverrideHistory);
router.get('/students-on-leave', staffController.getStudentsOnLeave);

// Reports
router.get('/reports', authorizeRoles('staff'), staffController.getReports);

module.exports = router;
