const express = require('express');
const router = express.Router();
const wardenController = require('../controllers/wardenController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

router.use(verifyToken);
// 'warden' role access
// 'warden' role access
router.get('/verify-queue', authorizeRoles('warden'), wardenController.getVerificationQueue);
router.get('/stats', authorizeRoles('warden'), wardenController.getDashboardStats);
router.get('/students', authorizeRoles('warden'), wardenController.getStudents);
router.get('/students/:id', authorizeRoles('warden'), wardenController.getStudentProfile);
router.get('/history', authorizeRoles('warden'), wardenController.getMovementHistory);
router.get('/analytics', authorizeRoles('warden'), wardenController.getAnalytics);
router.get('/broadcasts', authorizeRoles('warden'), wardenController.getBroadcastHistory);
router.post('/broadcast', authorizeRoles('warden'), wardenController.broadcast);
router.put('/:id/verify', authorizeRoles('warden'), wardenController.verifyRequest);

router.get('/unassigned-students', authorizeRoles('warden'), wardenController.getUnassignedStudents);
router.get('/unassigned-block-students', authorizeRoles('warden'), wardenController.getUnassignedBlockStudents);
router.post('/assign-student', authorizeRoles('warden'), wardenController.assignStudent);
router.post('/remove-student', authorizeRoles('warden'), wardenController.removeStudent);

// Room Management
router.get('/rooms', authorizeRoles('warden'), wardenController.getRooms);
router.post('/rooms', authorizeRoles('warden'), wardenController.createRoom);
router.put('/rooms/:id', authorizeRoles('warden'), wardenController.updateRoom);
router.delete('/rooms/:id', authorizeRoles('warden'), wardenController.deleteRoom);
router.post('/rooms/assign', authorizeRoles('warden'), wardenController.assignRoom);
router.post('/rooms/vacate', authorizeRoles('warden'), wardenController.vacateRoom);

module.exports = router;
