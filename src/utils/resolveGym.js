const GymProfile = require('../models/GymProfile');
const Staff = require('../models/Staff');

async function resolveGym(req, res) {
  let gym;

  if (req.user.role === 'staff') {
    const staffMember = await Staff.findOne({ userId: req.user._id });
    if (staffMember) {
      gym = await GymProfile.findById(staffMember.gym);
    }
  } else {
    gym = await GymProfile.findOne({ owner: req.user._id });
  }

  if (!gym) {
    res.status(404).json({ success: false, message: 'Gym profile not found.' });
    return null;
  }
  return gym;
}

module.exports = resolveGym;
