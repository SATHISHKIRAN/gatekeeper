const express = require('express');
const router = express.Router();
const queueController = require('../controllers/queueController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

router.use(verifyToken);
router.use(authorizeRoles('staff', 'hod', 'warden')); // Shared access, but logic differs slightly

router.get('/', queueController.getQueue);
router.get('/hod', queueController.getHODQueue);
router.put('/:id/status', queueController.updateStatus);

module.exports = router;
