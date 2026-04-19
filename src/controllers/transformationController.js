const Transformation = require('../models/Transformation');
const resolveGym = require('../utils/resolveGym');

// GET /api/transformations
exports.getTransformations = async (req, res) => {
  const gym = await resolveGym(req, res);
  if (!gym) return;

  const transformations = await Transformation.find({ gym: gym._id })
    .sort({ achievedAt: -1 });

  res.json({ success: true, data: transformations });
};

// GET /api/transformations/member/:memberId
exports.getMemberTransformations = async (req, res) => {
  const gym = await resolveGym(req, res);
  if (!gym) return;

  const transformations = await Transformation.find({
    gym: gym._id,
    member: req.params.memberId,
  }).sort({ achievedAt: -1 });

  res.json({ success: true, data: transformations });
};

// POST /api/transformations
exports.createTransformation = async (req, res) => {
  const gym = await resolveGym(req, res);
  if (!gym) return;

  const { memberId, memberName, beforeImageUrl, afterImageUrl, caption, weightBefore, weightAfter, achievedAt } = req.body;

  if (!beforeImageUrl || !afterImageUrl) {
    return res.status(400).json({ success: false, message: 'Before and after image URLs are required.' });
  }

  const transformation = await Transformation.create({
    gym: gym._id,
    member: memberId || undefined,
    memberName,
    beforeImageUrl,
    afterImageUrl,
    caption,
    weightBefore: weightBefore ? Number(weightBefore) : undefined,
    weightAfter: weightAfter ? Number(weightAfter) : undefined,
    achievedAt: achievedAt || new Date(),
    addedBy: req.user._id,
  });

  res.status(201).json({ success: true, data: transformation });
};

// DELETE /api/transformations/:id
exports.deleteTransformation = async (req, res) => {
  const gym = await resolveGym(req, res);
  if (!gym) return;

  const t = await Transformation.findOneAndDelete({ _id: req.params.id, gym: gym._id });
  if (!t) return res.status(404).json({ success: false, message: 'Not found.' });
  res.json({ success: true, message: 'Deleted.' });
};
