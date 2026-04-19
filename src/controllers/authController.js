const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Otp = require('../models/Otp');
const Staff = require('../models/Staff');
const { sendOtpEmail, sendPasswordResetEmail } = require('../services/emailService');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

const sendToken = (user, statusCode, res, extraData = {}) => {
  const token = signToken(user._id);
  res.status(statusCode).json({
    success: true,
    token,
    stage: user.stage,
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      stage: user.stage,
    },
    ...extraData,
  });
};

const generateOtp = () => crypto.randomInt(100000, 999999).toString();

const issueOtp = async (user) => {
  await Otp.deleteMany({ userId: user._id });
  const code = generateOtp();
  await Otp.create({ userId: user._id, code });

  try {
    await sendOtpEmail(user.email, user.firstName, code);
  } catch (emailErr) {
    // Never block registration/resend if email fails — log and continue
    console.error('[Email] Failed to send OTP email:', emailErr.message);
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('\n┌─────────────────────────────────┐');
    console.log(`│  OTP for ${user.email.padEnd(23)} │`);
    console.log(`│                                 │`);
    console.log(`│        CODE :  ${code}          │`);
    console.log(`│                                 │`);
    console.log('└─────────────────────────────────┘\n');
  }

  return code;
};

// POST /api/auth/register
exports.register = async (req, res) => {
  const { firstName, lastName, email, password, phone } = req.body;
  const user = await User.create({ firstName, lastName, email, password, phone, role: 'admin' });
  const otp = await issueOtp(user);
  sendToken(user, 201, res, process.env.NODE_ENV === 'development' ? { devOtp: otp } : {});
};

// POST /api/auth/login
exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ success: false, message: 'Invalid credentials.' });
  }
  if (!user.isActive) {
    return res.status(403).json({ success: false, message: 'Account is deactivated.' });
  }

  let staffRole = null;
  if (user.role === 'staff') {
    const staffMember = await Staff.findOneAndUpdate(
      { userId: user._id },
      { $unset: { tempPassword: 1 } }
    );
    if (staffMember) staffRole = staffMember.role;
  }

  sendToken(user, 200, res, staffRole ? { staffRole } : {});
};

// POST /api/auth/verify-otp
const MAX_OTP_ATTEMPTS = 5;

exports.verifyOtp = async (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ success: false, message: 'OTP code is required.' });
  }

  const otp = await Otp.findOne({ userId: req.user._id, used: false });
  if (!otp || otp.expiresAt < new Date()) {
    return res.status(400).json({ success: false, message: 'OTP has expired. Request a new one.' });
  }

  if (otp.attempts >= MAX_OTP_ATTEMPTS) {
    return res.status(429).json({ success: false, message: `Too many attempts. Please request a new code.` });
  }

  if (otp.code !== code) {
    otp.attempts += 1;
    await otp.save();
    const remaining = MAX_OTP_ATTEMPTS - otp.attempts;
    if (remaining <= 0) {
      return res.status(429).json({ success: false, message: 'Too many attempts. Please request a new code.' });
    }
    return res.status(400).json({
      success: false,
      message: `Invalid code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
    });
  }

  otp.used = true;
  await otp.save();
  req.user.stage = 'verified';
  await req.user.save();
  sendToken(req.user, 200, res);
};

// POST /api/auth/resend-otp
exports.resendOtp = async (req, res) => {
  if (req.user.stage !== 'registered') {
    return res.status(400).json({ success: false, message: 'Account is already verified.' });
  }
  const otp = await issueOtp(req.user);
  res.status(200).json({
    success: true,
    message: 'OTP sent.',
    ...(process.env.NODE_ENV === 'development' ? { devOtp: otp } : {}),
  });
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  res.status(200).json({ success: true, user: req.user });
};

// POST /api/auth/forgot-password
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required.' });
  }

  const user = await User.findOne({ email, isActive: true });
  if (user) {
    await Otp.deleteMany({ userId: user._id });
    const code = generateOtp();
    await Otp.create({ userId: user._id, code });
    try {
      await sendPasswordResetEmail(email, user.firstName, code);
    } catch (err) {
      console.error('[Email] Failed to send reset email:', err.message);
    }
    if (process.env.NODE_ENV === 'development') {
      console.log(`\n🔑  Reset OTP for ${email}: ${code}\n`);
    }
  }

  // Always succeed to prevent email enumeration
  res.status(200).json({ success: true, message: 'If that email is registered, a reset code has been sent.' });
};

// POST /api/auth/reset-password
exports.resetPassword = async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return res.status(400).json({ success: false, message: 'Email, code, and new password are required.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).json({ success: false, message: 'Invalid or expired reset code.' });
  }

  const otp = await Otp.findOne({ userId: user._id, used: false });
  if (!otp || otp.expiresAt < new Date()) {
    return res.status(400).json({ success: false, message: 'Reset code has expired. Request a new one.' });
  }

  if (otp.attempts >= MAX_OTP_ATTEMPTS) {
    return res.status(429).json({ success: false, message: 'Too many attempts. Request a new code.' });
  }

  if (otp.code !== code) {
    otp.attempts += 1;
    await otp.save();
    const remaining = MAX_OTP_ATTEMPTS - otp.attempts;
    if (remaining <= 0) {
      return res.status(429).json({ success: false, message: 'Too many attempts. Request a new code.' });
    }
    return res.status(400).json({
      success: false,
      message: `Invalid code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
    });
  }

  otp.used = true;
  await otp.save();

  user.password = newPassword;
  await user.save();

  res.status(200).json({ success: true, message: 'Password reset successfully. You can now log in.' });
};
