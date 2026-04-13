const GymProfile = require('../models/GymProfile');
const User = require('../models/User');

// POST /api/gym-profile
exports.createGymProfile = async (req, res) => {
  if (req.user.stage === 'registered') {
    return res.status(403).json({ success: false, message: 'Please verify your account first.' });
  }

  const existing = await GymProfile.findOne({ owner: req.user._id });
  if (existing) {
    return res.status(409).json({ success: false, message: 'Gym profile already exists.' });
  }

  const { gymName, strength, city, state, country, address, pincode, phone, email } = req.body;

  const profile = await GymProfile.create({
    owner: req.user._id,
    gymName,
    strength,
    location: { city, state, country, address, pincode },
    phone,
    email,
  });

  await User.findByIdAndUpdate(req.user._id, { stage: 'onboarded' });

  res.status(201).json({ success: true, data: profile });
};

// GET /api/gym-profile
exports.getGymProfile = async (req, res) => {
  const profile = await GymProfile.findOne({ owner: req.user._id });
  if (!profile) {
    return res.status(404).json({ success: false, message: 'Gym profile not found.' });
  }
  res.status(200).json({ success: true, data: profile });
};

// PUT /api/gym-profile
exports.updateGymProfile = async (req, res) => {
  const { gymName, strength, city, state, country, address, pincode, phone, email } = req.body;
  const profile = await GymProfile.findOneAndUpdate(
    { owner: req.user._id },
    { gymName, strength, location: { city, state, country, address, pincode }, phone, email },
    { new: true, runValidators: true }
  );
  if (!profile) {
    return res.status(404).json({ success: false, message: 'Gym profile not found.' });
  }
  res.status(200).json({ success: true, data: profile });
};
