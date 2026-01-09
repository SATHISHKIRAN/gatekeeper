const express = require('express');
const router = express.Router();
const policyController = require('../controllers/policyController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/', verifyToken, policyController.getPolicies);
router.post('/', verifyToken, policyController.createPolicy);
router.put('/:id', verifyToken, policyController.updatePolicy);
router.delete('/:id', verifyToken, policyController.deletePolicy);

// Student Endpoint
router.get('/student-types', verifyToken, policyController.getStudentPassTypes);

module.exports = router;
