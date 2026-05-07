const express = require('express');
const router  = express.Router();
const { register, login, verifyOtp, resendOtp, getMe, forgotPassword, resetPassword } = require('../controllers/authController');
const { protect }      = require('../middleware/auth');
const validate         = require('../middleware/validate');
const { loginSchema, signupSchema, resetPasswordSchema } = require('../lib/validations');

router.post('/register',        validate(signupSchema), register);
router.post('/login',           validate(loginSchema),  login);
router.post('/forgot-password',                         forgotPassword);
router.post('/reset-password',  validate(resetPasswordSchema),            resetPassword);
router.get('/me',               protect,                                   getMe);
router.post('/verify-otp',      protect,                                   verifyOtp);
router.post('/resend-otp',      protect,                                   resendOtp);

module.exports = router;
