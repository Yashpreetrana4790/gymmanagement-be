const express = require('express');
const router = express.Router();
const { register, login, verifyOtp, resendOtp, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/security');

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', protect, getMe);
router.post('/verify-otp', protect, verifyOtp);
router.post('/resend-otp', protect, resendOtp);

module.exports = router;
