const express = require('express');
const router = express.Router();
const calendarController = require('../controllers/calendarController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/', verifyToken, calendarController.getEvents);
router.post('/', verifyToken, calendarController.addEvent);
router.delete('/:id', verifyToken, calendarController.deleteEvent);

module.exports = router;
