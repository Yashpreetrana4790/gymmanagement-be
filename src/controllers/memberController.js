const crypto = require('crypto');
const Member = require('../models/Member');
const User = require('../models/User');
const GymProfile = require('../models/GymProfile');

const POPULATE_USER = 'firstName lastName email phone dateOfBirth';

/** Resolve the GymProfile for the authenticated owner, or 404. */
async function resolveGym(req, res) {
  const gym = await GymProfile.findOne({ owner: req.user._id });
  if (!gym) {
    res.status(404).json({ success: false, message: 'Gym profile not found.' });
    return null;
  }
  return gym;
}

// GET /api/members
exports.getAllMembers = async (req, res) => {
  const gym = await resolveGym(req, res);
  if (!gym) return;

  const members = await Member.find({ gym: gym._id })
    .populate('user', POPULATE_USER)
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, count: members.length, data: members });
};

// GET /api/members/:id
exports.getMember = async (req, res) => {
  const gym = await resolveGym(req, res);
  if (!gym) return;

  const member = await Member.findOne({ _id: req.params.id, gym: gym._id })
    .populate('user', POPULATE_USER);

  if (!member) {
    return res.status(404).json({ success: false, message: 'Member not found.' });
  }
  res.status(200).json({ success: true, data: member });
};

// POST /api/members
exports.createMember = async (req, res) => {
  const gym = await resolveGym(req, res);
  if (!gym) return;

  const {
    firstName, lastName, email, phone, dateOfBirth,
    membershipType, membershipEnd,
    // physique
    height, weight, bodyType,
    // diet
    dietType, allergies, supplements,
    // goal
    primaryGoal, targetWeight, goalNotes,
    // health
    medicalConditions, injuries, healthNotes,
    // emergency
    emergencyName, emergencyPhone, emergencyRelation,
  } = req.body;

  const tempPassword = crypto.randomBytes(12).toString('hex');
  const user = await User.create({
    firstName,
    lastName,
    email,
    phone,
    dateOfBirth: dateOfBirth || undefined,
    password: tempPassword,
    role: 'member',
    stage: 'onboarded',
  });

  const member = await Member.create({
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

  const populated = await member.populate('user', POPULATE_USER);
  res.status(201).json({ success: true, data: populated });
};

// PUT /api/members/:id
exports.updateMember = async (req, res) => {
  const gym = await resolveGym(req, res);
  if (!gym) return;

  const member = await Member.findOneAndUpdate(
    { _id: req.params.id, gym: gym._id },
    req.body,
    { new: true, runValidators: true }
  ).populate('user', POPULATE_USER);

  if (!member) {
    return res.status(404).json({ success: false, message: 'Member not found.' });
  }
  res.status(200).json({ success: true, data: member });
};

// DELETE /api/members/:id
exports.deleteMember = async (req, res) => {
  const gym = await resolveGym(req, res);
  if (!gym) return;

  const member = await Member.findOneAndDelete({ _id: req.params.id, gym: gym._id });
  if (!member) {
    return res.status(404).json({ success: false, message: 'Member not found.' });
  }
  res.status(200).json({ success: true, message: 'Member deleted.' });
};
