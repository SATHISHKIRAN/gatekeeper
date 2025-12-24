const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

router.use(verifyToken);
// Warden, HOD, Admin, Principal can access AI insights
router.post('/predict-risk', authorizeRoles('warden', 'hod', 'admin', 'principal'), aiController.predictRisk);

module.exports = router;
