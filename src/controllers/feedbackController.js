const Feedback = require('../models/Feedback');
const GymProfile = require('../models/GymProfile');
const resolveGym = require('../utils/resolveGym');

// GET /api/feedback — admin/staff list with optional filters
exports.getFeedback = async (req, res) => {
  const gym = await resolveGym(req, res);
  if (!gym) return;

  const { status, category } = req.query;
  const filter = { gym: gym._id };
  if (status) filter.status = status;
  if (category) filter.category = category;

  const [feedback, total, openCount, resolvedCount] = await Promise.all([
    Feedback.find(filter).sort({ createdAt: -1 }),
    Feedback.countDocuments(filter),
    Feedback.countDocuments({ gym: gym._id, status: 'open' }),
    Feedback.countDocuments({ gym: gym._id, status: 'resolved' }),
  ]);

  res.json({ success: true, data: feedback, total, openCount, resolvedCount });
};

// POST /api/feedback/submit — public (gymId in body)
exports.submitFeedback = async (req, res) => {
  const { gymId, submitterName, submitterEmail, category, rating, message } = req.body;

  if (!gymId || !submitterName || !message) {
    return res.status(400).json({ success: false, message: 'gymId, submitterName and message are required.' });
  }

  const gym = await GymProfile.findById(gymId);
  if (!gym) return res.status(404).json({ success: false, message: 'Gym not found.' });

  const feedback = await Feedback.create({ gym: gymId, submitterName, submitterEmail, category, rating, message });
  res.status(201).json({ success: true, data: feedback });
};

// PATCH /api/feedback/:id — admin/staff update status + response
exports.updateFeedback = async (req, res) => {
  const gym = await resolveGym(req, res);
  if (!gym) return;

  const { status, adminResponse } = req.body;
  const update = {};
  if (status) {
    update.status = status;
    if (status === 'resolved') update.resolvedAt = new Date();
  }
  if (adminResponse !== undefined) update.adminResponse = adminResponse;

  const feedback = await Feedback.findOneAndUpdate(
    { _id: req.params.id, gym: gym._id },
    update,
    { new: true }
  );
  if (!feedback) return res.status(404).json({ success: false, message: 'Feedback not found.' });
  res.json({ success: true, data: feedback });
};

// DELETE /api/feedback/:id
exports.deleteFeedback = async (req, res) => {
  const gym = await resolveGym(req, res);
  if (!gym) return;

  await Feedback.findOneAndDelete({ _id: req.params.id, gym: gym._id });
  res.json({ success: true, message: 'Deleted.' });
};
