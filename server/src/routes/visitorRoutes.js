const express = require('express');
const router = express.Router();
const visitorController = require('../controllers/visitorController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

// All visitor routes are protected
router.use(verifyToken);
router.use(authorizeRoles('gatekeeper', 'admin', 'principal'));

router.post('/issue', visitorController.issuePass);
router.post('/checkout/:id', visitorController.checkoutVisitor);
router.get('/active', visitorController.getActiveVisitors);
router.get('/today-stats', visitorController.getTodayStats);
router.get('/history', visitorController.getHistory);
router.get('/host-lookup/:id', visitorController.hostLookup);


// Contract Worker Routes
router.post('/contract/create', visitorController.createContractPass);
router.get('/contract/all', visitorController.getContractPasses);
router.post('/contract/toggle/:id', visitorController.toggleContractEntry);
router.get('/contract/history/:id', visitorController.getContractHistory);

module.exports = router;
