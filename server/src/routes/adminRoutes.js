const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

router.use(verifyToken);
// Principal can also view analytics
// Principal can also view analytics
router.get('/analytics', authorizeRoles('admin', 'principal'), adminController.getGlobalStats);

// User Management
router.get('/users', adminController.getAllUsers);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.post('/users/reset-password/:id', adminController.resetUserPassword);
router.get('/users/oversight/:id', adminController.getStudentOversight);
router.get('/hostels', adminController.getHostels);
router.delete('/users/:id', authorizeRoles('admin'), adminController.deleteUser);

// Department Management
router.get('/departments', authorizeRoles('admin'), adminController.getDepartments);
router.post('/departments', authorizeRoles('admin'), adminController.createDepartment);
router.put('/departments/:id', authorizeRoles('admin'), adminController.updateDepartment);
router.delete('/departments/:id', authorizeRoles('admin'), adminController.deleteDepartment);
router.get('/departments/users/:id', authorizeRoles('admin'), adminController.getDepartmentUsers);
router.put('/departments/:id/hod', authorizeRoles('admin'), adminController.assignHOD);
router.delete('/departments/:id/hod', authorizeRoles('admin'), adminController.removeHOD);
router.get('/departments/stats/detailed', authorizeRoles('admin'), adminController.getDepartmentDetailedStats);

// Gate Management (Advanced)
router.get('/gate/live', authorizeRoles('admin', 'principal', 'warden'), adminController.getGateLiveStatus);
router.get('/gate/history', authorizeRoles('admin', 'principal', 'warden'), adminController.getGateHistory);

// Pass Restrictions
router.get('/departments/restrictions', authorizeRoles('admin'), adminController.getPassRestrictions);
router.post('/departments/restrictions', authorizeRoles('admin'), adminController.addPassRestriction);
router.put('/departments/restrictions/:id', authorizeRoles('admin'), adminController.updatePassRestriction);
router.delete('/departments/restrictions/:id', authorizeRoles('admin'), adminController.removePassRestriction);

const databaseController = require('../controllers/databaseController');
const academicController = require('../controllers/academicController');

// ... existing code ...

// Database Management
router.get('/database/backup', authorizeRoles('admin'), databaseController.getBackup);
router.post('/database/reset', authorizeRoles('admin'), databaseController.resetDatabase);

// Academic Year Management
router.post('/academic/promote', authorizeRoles('admin'), academicController.promoteStudents);
router.post('/academic/graduate', authorizeRoles('admin'), academicController.graduateBatch);

module.exports = router;
