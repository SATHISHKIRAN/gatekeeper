const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/login', authController.login);
router.get('/me', verifyToken, authController.getMe);

// Forgot Password Flow
router.post('/forgot-password/init', authController.forgotPasswordInit);
router.post('/forgot-password/send-otp', authController.sendResetOTP);
router.post('/forgot-password/verify-otp', authController.verifyOTP);
router.post('/forgot-password/reset', authController.resetPassword);

// Forgot Email Flow
router.post('/forgot-email/init', authController.forgotEmailInit);
router.post('/forgot-email/verify', authController.verifyForgotEmailOTP);

router.post('/change-password', verifyToken, authController.changePassword);

module.exports = router;
