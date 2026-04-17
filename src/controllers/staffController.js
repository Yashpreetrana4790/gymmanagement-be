const Staff = require('../models/Staff');
const GymProfile = require('../models/GymProfile');

async function resolveGym(req, res) {
  const gym = await GymProfile.findOne({ owner: req.user._id });
  if (!gym) {
    res.status(404).json({ success: false, message: 'Gym profile not found.' });
    return null;
  }
  return gym;
}

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

  const staff = await Staff.findOne({ _id: req.params.id, gym: gym._id });
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

  res.status(201).json({ success: true, data: staff });
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
