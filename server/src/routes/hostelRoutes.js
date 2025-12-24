const express = require('express');
const router = express.Router();
const hostelController = require('../controllers/hostelController');

// Hostel Blocks
router.get('/', hostelController.getHostels);
router.post('/', hostelController.createHostel);
router.put('/:id', hostelController.updateHostel);
router.delete('/:id', hostelController.deleteHostel);

// Rooms
router.get('/rooms', hostelController.getRooms);
router.post('/rooms', hostelController.createRoom);
router.put('/rooms/:id', hostelController.updateRoom);
router.delete('/rooms/:id', hostelController.deleteRoom);

// Assignments
router.get('/assignments', hostelController.getAssignments);
router.post('/assign', hostelController.assignRoom);
router.put('/unassign/:id', hostelController.unassignRoom);

// Stats
router.get('/stats', hostelController.getHostelStats);

// Maintenance
router.get('/maintenance', hostelController.getMaintenanceRequests);
router.post('/maintenance', hostelController.createMaintenanceRequest);
router.put('/maintenance/:id', hostelController.updateMaintenanceStatus);

// Announcements
router.get('/announcements', hostelController.getAnnouncements);
router.post('/announcements', hostelController.createAnnouncement);


// Block-Level Assignments
router.get('/unassigned-students', hostelController.getUnassignedHostelStudents);
router.get('/students/:hostel_id', hostelController.getHostelStudents);
router.post('/assign-student', hostelController.assignStudentToHostel);
router.post('/remove-student', hostelController.removeStudentFromHostel);

module.exports = router;
