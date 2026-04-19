const crypto = require('crypto');
const Member = require('../models/Member');
const User = require('../models/User');
const resolveGym = require('../utils/resolveGym');

const POPULATE_USER = 'firstName lastName email phone dateOfBirth';

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

  let user = await User.findOne({ email });
  if (user) {
    const alreadyMember = await Member.findOne({ gym: gym._id, user: user._id });
    if (alreadyMember) {
      return res.status(409).json({ success: false, message: 'This person is already a member of this gym.' });
    }
  } else {
    const tempPassword = crypto.randomBytes(12).toString('hex');
    user = await User.create({
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth: dateOfBirth || undefined,
      password: tempPassword,
      role: 'member',
      stage: 'onboarded',
    });
  }

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

// PUT /api/members/:id/programs  — diet & exercise assignments
exports.updateMemberPrograms = async (req, res) => {
  const gym = await resolveGym(req, res);
  if (!gym) return;

  const { diet, exercise } = req.body || {};
  const update = {};

  if (diet && typeof diet === 'object') {
    if (diet.title !== undefined) update['assignedPrograms.diet.title'] = String(diet.title);
    if (diet.notes !== undefined) update['assignedPrograms.diet.notes'] = String(diet.notes);
    if (Array.isArray(diet.items)) {
      update['assignedPrograms.diet.items'] = diet.items.map((s) => String(s).trim()).filter(Boolean);
    }
  }
  if (exercise && typeof exercise === 'object') {
    if (exercise.title !== undefined) update['assignedPrograms.exercise.title'] = String(exercise.title);
    if (exercise.notes !== undefined) update['assignedPrograms.exercise.notes'] = String(exercise.notes);
    if (Array.isArray(exercise.routine)) {
      update['assignedPrograms.exercise.routine'] = exercise.routine
        .map((r) => ({
          name: r && r.name != null ? String(r.name).trim() : '',
          detail: r && r.detail != null ? String(r.detail).trim() : '',
        }))
        .filter((r) => r.name || r.detail);
    }
  }

  if (Object.keys(update).length === 0) {
    return res.status(400).json({ success: false, message: 'Provide diet and/or exercise fields to update.' });
  }

  const member = await Member.findOneAndUpdate(
    { _id: req.params.id, gym: gym._id },
    { $set: update },
    { new: true, runValidators: true }
  ).populate('user', POPULATE_USER);

  if (!member) {
    return res.status(404).json({ success: false, message: 'Member not found.' });
  }
  res.status(200).json({ success: true, data: member });
};

// POST /api/members/:id/attendance  — log a visit (defaults to now)
exports.recordAttendance = async (req, res) => {
  const gym = await resolveGym(req, res);
  if (!gym) return;

  let at = req.body && req.body.at ? new Date(req.body.at) : new Date();
  if (Number.isNaN(at.getTime())) {
    return res.status(400).json({ success: false, message: 'Invalid date for attendance.' });
  }

  const member = await Member.findOneAndUpdate(
    { _id: req.params.id, gym: gym._id },
    { $push: { attendance: { at } } },
    { new: true, runValidators: true }
  ).populate('user', POPULATE_USER);

  if (!member) {
    return res.status(404).json({ success: false, message: 'Member not found.' });
  }
  res.status(201).json({ success: true, data: member });
};

// GET /api/members/:id/attendance?year=2026  — day counts for heatmap
exports.getMemberAttendance = async (req, res) => {
  const gym = await resolveGym(req, res);
  if (!gym) return;

  const year = parseInt(String(req.query.year || ''), 10) || new Date().getFullYear();
  const member = await Member.findOne({ _id: req.params.id, gym: gym._id }).select('attendance');
  if (!member) {
    return res.status(404).json({ success: false, message: 'Member not found.' });
  }

  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  const days = {};

  const list = member.attendance || [];
  for (const entry of list) {
    const t = entry.at;
    if (!t || t < start || t >= end) continue;
    const d = new Date(t);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    days[key] = (days[key] || 0) + 1;
  }

  const total = Object.values(days).reduce((a, b) => a + b, 0);
  res.status(200).json({
    success: true,
    data: { year, days, totalVisits: total, uniqueDays: Object.keys(days).length },
  });
};

// GET /api/members/attendance/recent?limit=100  — gym-wide recent check-ins
exports.getRecentAttendance = async (req, res) => {
  const gym = await resolveGym(req, res);
  if (!gym) return;

  const limit = Math.min(parseInt(String(req.query.limit || '100'), 10) || 100, 500);

  const members = await Member.find({ gym: gym._id })
    .populate('user', POPULATE_USER)
    .select('user attendance membershipType');

  // Flatten all attendance entries and attach member info
  const entries = [];
  for (const m of members) {
    for (const entry of m.attendance || []) {
      entries.push({
        memberId: m._id,
        memberName: `${m.user.firstName} ${m.user.lastName}`.trim(),
        memberEmail: m.user.email,
        membershipType: m.membershipType,
        at: entry.at,
        entryId: entry._id,
      });
    }
  }

  entries.sort((a, b) => new Date(b.at) - new Date(a.at));
  const recent = entries.slice(0, limit);

  // Today's count
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayCount = entries.filter(e => new Date(e.at) >= todayStart).length;

  res.status(200).json({ success: true, data: { entries: recent, todayCount, total: entries.length } });
};

// GET /api/members/zombies?days=30  — active members who haven't visited in N days (or ever)
exports.getZombieMembers = async (req, res) => {
  const gym = await resolveGym(req, res);
  if (!gym) return;

  const days = Math.max(1, parseInt(String(req.query.days || '30'), 10) || 30);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const now = new Date();

  const members = await Member.find({ gym: gym._id, isActive: true, membershipEnd: { $gte: now } })
    .populate('user', POPULATE_USER)
    .select('user attendance membershipType membershipEnd createdAt');

  const zombies = [];
  for (const m of members) {
    const visits = m.attendance || [];
    const lastVisit = visits.length
      ? visits.reduce((latest, v) => (v.at > latest ? v.at : latest), visits[0].at)
      : null;

    const isZombie = !lastVisit || new Date(lastVisit) < cutoff;
    if (!isZombie) continue;

    const daysSinceVisit = lastVisit
      ? Math.floor((now - new Date(lastVisit)) / (1000 * 60 * 60 * 24))
      : null;

    const daysSinceJoined = Math.floor((now - new Date(m.createdAt)) / (1000 * 60 * 60 * 24));

    zombies.push({
      _id: m._id,
      user: m.user,
      membershipType: m.membershipType,
      membershipEnd: m.membershipEnd,
      totalVisits: visits.length,
      lastVisit,
      daysSinceVisit,
      daysSinceJoined,
      neverVisited: !lastVisit,
    });
  }

  // Sort: never-visited first, then by longest absence
  zombies.sort((a, b) => {
    if (a.neverVisited && !b.neverVisited) return -1;
    if (!a.neverVisited && b.neverVisited) return 1;
    return (b.daysSinceVisit ?? 0) - (a.daysSinceVisit ?? 0);
  });

  res.status(200).json({
    success: true,
    data: {
      zombies,
      total: zombies.length,
      neverVisited: zombies.filter(z => z.neverVisited).length,
      days,
    },
  });
};
