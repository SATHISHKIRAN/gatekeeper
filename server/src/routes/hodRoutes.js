const express = require('express');
const router = express.Router();
const hodController = require('../controllers/hodController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

router.use(verifyToken);
router.use(authorizeRoles('hod'));

router.get('/stats', hodController.getStats);
router.get('/requests', hodController.getHodRequests); // NEW
router.get('/users', hodController.getDepartmentUsers);
router.post('/bulk-approve', hodController.bulkApprove);
router.post('/medical-override', hodController.medicalOverride);
router.get('/medical-overrides', hodController.getMedicalOverrides);
router.put('/medical-override/:id', hodController.updateMedicalOverride);
router.delete('/medical-override/:id', hodController.deleteMedicalOverride);

router.get('/restrictions', hodController.getRestrictions);
router.get('/student/:id', hodController.getStudentProfile); // Matches /api/hod/student/:id
router.get('/student-profile/:id', hodController.getStudentProfiler);
router.get('/staff-profile/:id', hodController.getStaffProfiler);
router.get('/unassigned-students', hodController.getUnassignedStudents); // NEW
router.get('/staff-mentees/:id', hodController.getStaffMentees); // NEW
router.get('/profile', verifyToken, authorizeRoles('hod'), hodController.getProfile);
router.post('/add-leave', hodController.addStaffLeave);
router.post('/manage-leave', hodController.manageStaffLeave);
router.post('/set-proxy', hodController.setProxy);
router.post('/revoke-proxy', hodController.revokeProxy);
router.post('/toggle-duty', hodController.toggleDuty);
router.post('/forward-requests', hodController.forwardRequests);
router.post('/toggle-block', hodController.toggleIndividualBlock);
router.post('/manage-year-restriction', hodController.manageYearRestriction);
router.post('/assign-mentees', hodController.assignMentees); // NEW
router.post('/unassign-mentees', hodController.unassignMentees); // NEW
router.post('/update-trust-score', hodController.updateTrustScore); // NEW
router.post('/reset-cooldown', hodController.resetCooldown);
router.get('/reports', verifyToken, authorizeRoles('hod'), hodController.getAdvancedReports);

module.exports = router;
