const crypto = require('crypto');
const GymProfile = require('../models/GymProfile');
const Member = require('../models/Member');
const User = require('../models/User');
const Staff = require('../models/Staff');

// GET /api/public/gym/:qrToken
exports.getGymByToken = async (req, res) => {
  const gym = await GymProfile.findOne({ qrToken: req.params.qrToken, isActive: true });
  if (!gym) {
    return res.status(404).json({ success: false, message: 'Invalid or expired QR code.' });
  }
  res.status(200).json({
    success: true,
    data: {
      gymName: gym.gymName,
      city: gym.location?.city,
      state: gym.location?.state,
      country: gym.location?.country,
    },
  });
};

// POST /api/public/gym/:qrToken/join
exports.joinGym = async (req, res) => {
  const gym = await GymProfile.findOne({ qrToken: req.params.qrToken, isActive: true });
  if (!gym) {
    return res.status(404).json({ success: false, message: 'Invalid or expired QR code.' });
  }

  const {
    firstName, lastName, email, phone, dateOfBirth,
    membershipType, membershipEnd,
    height, weight, bodyType,
    dietType, allergies, supplements,
    primaryGoal, targetWeight, goalNotes,
    medicalConditions, injuries, healthNotes,
    emergencyName, emergencyPhone, emergencyRelation,
  } = req.body;

  if (!firstName || !lastName || !email || !membershipEnd) {
    return res.status(400).json({ success: false, message: 'First name, last name, email, and membership end date are required.' });
  }

  let user = await User.findOne({ email });
  if (user) {
    const alreadyMember = await Member.findOne({ gym: gym._id, user: user._id });
    if (alreadyMember) {
      return res.status(409).json({ success: false, message: 'You are already a member of this gym.' });
    }
  } else {
    const tempPassword = crypto.randomBytes(12).toString('hex');
    user = await User.create({
      firstName,
      lastName,
      email,
      phone: phone || undefined,
      dateOfBirth: dateOfBirth || undefined,
      password: tempPassword,
      role: 'member',
      stage: 'onboarded',
    });
  }

  await Member.create({
    gym: gym._id,
    user: user._id,
    membershipType: membershipType || 'basic',
    membershipEnd,
    physique: {
      height:   height   ? Number(height)   : undefined,
      weight:   weight   ? Number(weight)   : undefined,
      bodyType: bodyType || '',
    },
    diet: {
      type:        dietType    || '',
      allergies:   allergies   ? (Array.isArray(allergies) ? allergies : allergies.split(',').map(s => s.trim()).filter(Boolean)) : [],
      supplements: supplements || '',
    },
    goal: {
      primary:      primaryGoal  || '',
      targetWeight: targetWeight ? Number(targetWeight) : undefined,
      notes:        goalNotes    || '',
    },
    health: {
      medicalConditions: medicalConditions || '',
      injuries:          injuries          || '',
      notes:             healthNotes       || '',
    },
    emergencyContact: {
      name:     emergencyName     || '',
      phone:    emergencyPhone    || '',
      relation: emergencyRelation || '',
    },
  });

  res.status(201).json({ success: true, message: `You've been successfully registered at ${gym.gymName}!` });
};

// POST /api/public/gym/:qrToken/staff-apply
exports.applyAsStaff = async (req, res) => {
  const gym = await GymProfile.findOne({ qrToken: req.params.qrToken, isActive: true });
  if (!gym) {
    return res.status(404).json({ success: false, message: 'Invalid or expired QR code.' });
  }

  const { firstName, lastName, phone, email, gender, role } = req.body;

  if (!firstName || !lastName || !phone || !gender || !role) {
    return res.status(400).json({ success: false, message: 'First name, last name, phone, gender, and role are required.' });
  }

  const count = await Staff.countDocuments({ gym: gym._id });
  const staffId = `STF-${String(count + 1).padStart(4, '0')}`;

  await Staff.create({
    gym: gym._id,
    staffId,
    firstName,
    lastName,
    phone,
    email: email || undefined,
    gender,
    role,
    joiningDate: new Date(),
    isActive: false,
    schedule: { workingDays: [], shiftType: 'morning' },
  });

  res.status(201).json({ success: true, message: `Application submitted to ${gym.gymName}. The admin will review and activate your profile.` });
};
