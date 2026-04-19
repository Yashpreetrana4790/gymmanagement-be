const crypto = require('crypto');
const Staff = require('../models/Staff');
const User = require('../models/User');
const resolveGym = require('../utils/resolveGym');
const { sendStaffCredentialsEmail } = require('../services/emailService');

const ROLES_WITH_PORTAL_ACCESS = ['trainer', 'manager', 'receptionist'];

async function generateStaffId(gymId) {
  const count = await Staff.countDocuments({ gym: gymId });
  return `STF-${String(count + 1).padStart(4, '0')}`;
}

// GET /api/staff
exports.getAllStaff = async (req, res) => {
  const gym = await resolveGym(req, res);
  if (!gym) return;

  const staff = await Staff.find({ gym: gym._id }).sort({ createdAt: -1 });
  res.status(200).json({ success: true, count: staff.length, data: staff });
};

// GET /api/staff/:id
exports.getStaff = async (req, res) => {
  const gym = await resolveGym(req, res);
  if (!gym) return;

  const staff = await Staff.findOne({ _id: req.params.id, gym: gym._id }).select('+tempPassword');
  if (!staff) {
    return res.status(404).json({ success: false, message: 'Staff member not found.' });
  }
  res.status(200).json({ success: true, data: staff });
};

// POST /api/staff
exports.createStaff = async (req, res) => {
  const gym = await resolveGym(req, res);
  if (!gym) return;

  const {
    firstName, lastName, phone, email, gender, dateOfBirth,
    role, specialization, joiningDate,
    salaryAmount, salaryType, employmentType,
    workingDays, shiftType, shiftStart, shiftEnd,
  } = req.body;

  const staffId = await generateStaffId(gym._id);

  const staff = await Staff.create({
    gym: gym._id,
    staffId,
    firstName,
    lastName,
    phone,
    email: email || undefined,
    gender,
    dateOfBirth: dateOfBirth || undefined,
    role,
    specialization: Array.isArray(specialization)
      ? specialization
      : specialization ? specialization.split(',').map(s => s.trim()).filter(Boolean) : [],
    joiningDate,
    salary: {
      amount: salaryAmount ? Number(salaryAmount) : undefined,
      type: salaryType || 'monthly',
    },
    employmentType: employmentType || 'full-time',
    schedule: {
      workingDays: Array.isArray(workingDays)
        ? workingDays
        : workingDays ? workingDays.split(',').map(s => s.trim()).filter(Boolean) : [],
      shiftType: shiftType || 'morning',
      shiftStart: shiftStart || undefined,
      shiftEnd: shiftEnd || undefined,
    },
  });

  // Auto-create portal login for trainer / manager / receptionist
  let credentials = null;
  if (ROLES_WITH_PORTAL_ACCESS.includes(role) && email) {
    const tempPassword = crypto.randomBytes(8).toString('hex');
    const user = await User.create({
      firstName,
      lastName,
      email,
      password: tempPassword,
      phone: phone || undefined,
      role: 'staff',
      stage: 'onboarded',
    });
    staff.userId = user._id;
    staff.tempPassword = tempPassword;
    await staff.save();
    try {
      await sendStaffCredentialsEmail(email, firstName, email, tempPassword);
    } catch (err) {
      console.error('[Email] Failed to send credentials email:', err.message);
    }
    credentials = { email, password: tempPassword };
  }

  res.status(201).json({ success: true, data: staff, credentials });
};

// PUT /api/staff/:id
exports.updateStaff = async (req, res) => {
  const gym = await resolveGym(req, res);
  if (!gym) return;

  const staff = await Staff.findOneAndUpdate(
    { _id: req.params.id, gym: gym._id },
    req.body,
    { new: true, runValidators: true }
  );

  if (!staff) {
    return res.status(404).json({ success: false, message: 'Staff member not found.' });
  }
  res.status(200).json({ success: true, data: staff });
};

// DELETE /api/staff/:id
exports.deleteStaff = async (req, res) => {
  const gym = await resolveGym(req, res);
  if (!gym) return;

  const staff = await Staff.findOneAndDelete({ _id: req.params.id, gym: gym._id });
  if (!staff) {
    return res.status(404).json({ success: false, message: 'Staff member not found.' });
  }
  res.status(200).json({ success: true, message: 'Staff member deleted.' });
};

// DELETE /api/staff/:id/account  (revoke login access)
exports.revokeAccount = async (req, res) => {
  const gym = await resolveGym(req, res);
  if (!gym) return;

  const staff = await Staff.findOne({ _id: req.params.id, gym: gym._id });
  if (!staff) return res.status(404).json({ success: false, message: 'Staff member not found.' });
  if (!staff.userId) return res.status(400).json({ success: false, message: 'No login account to revoke.' });

  await Promise.all([
    User.findByIdAndDelete(staff.userId),
    Staff.findByIdAndUpdate(staff._id, { $unset: { userId: 1, tempPassword: 1 } }),
  ]);

  res.status(200).json({ success: true, message: 'Login access revoked.' });
};

// POST /api/staff/:id/create-account
exports.createAccount = async (req, res) => {
  const gym = await resolveGym(req, res);
  if (!gym) return;

  const staff = await Staff.findOne({ _id: req.params.id, gym: gym._id });
  if (!staff) return res.status(404).json({ success: false, message: 'Staff member not found.' });
  if (staff.userId) return res.status(409).json({ success: false, message: 'This staff member already has a login account.' });
  if (!staff.email) return res.status(400).json({ success: false, message: 'Staff member must have an email address to create an account.' });

  const { password } = req.body;
  if (!password || password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
  }

  const existing = await User.findOne({ email: staff.email });
  if (existing) return res.status(409).json({ success: false, message: 'A user with this email already exists.' });

  const user = await User.create({
    firstName: staff.firstName,
    lastName:  staff.lastName,
    email:     staff.email,
    password,
    phone:     staff.phone,
    role:      'staff',
    stage:     'onboarded',
  });

  await Staff.findByIdAndUpdate(staff._id, { userId: user._id });

  res.status(201).json({ success: true, message: 'Login account created.', data: { userId: user._id } });
};
