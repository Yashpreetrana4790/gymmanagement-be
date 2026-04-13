const crypto = require('crypto');
const Member = require('../models/Member');
const User = require('../models/User');

const POPULATE_USER = 'firstName lastName email phone';

// GET /api/members
exports.getAllMembers = async (req, res) => {
  const members = await Member.find().populate('user', POPULATE_USER).sort({ createdAt: -1 });
  res.status(200).json({ success: true, count: members.length, data: members });
};

// GET /api/members/:id
exports.getMember = async (req, res) => {
  const member = await Member.findById(req.params.id).populate('user', POPULATE_USER);
  if (!member) {
    return res.status(404).json({ success: false, message: 'Member not found.' });
  }
  res.status(200).json({ success: true, data: member });
};

// POST /api/members
// Accepts: firstName, lastName, email, phone, membershipType, membershipEnd, emergencyContact, healthNotes
exports.createMember = async (req, res) => {
  const { firstName, lastName, email, phone, membershipType, membershipEnd, emergencyContact, healthNotes } = req.body;

  const tempPassword = crypto.randomBytes(12).toString('hex');
  const user = await User.create({
    firstName,
    lastName,
    email,
    phone,
    password: tempPassword,
    role: 'member',
    stage: 'onboarded',
  });

  const member = await Member.create({
    user: user._id,
    membershipType: membershipType || 'basic',
    membershipEnd,
    emergencyContact,
    healthNotes,
  });

  const populated = await member.populate('user', POPULATE_USER);
  res.status(201).json({ success: true, data: populated });
};

// PUT /api/members/:id
exports.updateMember = async (req, res) => {
  const member = await Member.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).populate('user', POPULATE_USER);
  if (!member) {
    return res.status(404).json({ success: false, message: 'Member not found.' });
  }
  res.status(200).json({ success: true, data: member });
};

// DELETE /api/members/:id
exports.deleteMember = async (req, res) => {
  const member = await Member.findByIdAndDelete(req.params.id);
  if (!member) {
    return res.status(404).json({ success: false, message: 'Member not found.' });
  }
  res.status(200).json({ success: true, message: 'Member deleted.' });
};
