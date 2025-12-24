const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

router.use(verifyToken);

// Student Routes
router.post('/apply', authorizeRoles('student'), requestController.createRequest);
router.get('/my-requests', requestController.getMyRequests);
router.delete('/:id', authorizeRoles('student'), requestController.cancelRequest);
router.put('/:id', authorizeRoles('student'), requestController.editRequest);

module.exports = router;
