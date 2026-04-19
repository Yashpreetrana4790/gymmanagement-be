const Plan = require('../models/Plan');
const Member = require('../models/Member');
const resolveGym = require('../utils/resolveGym');

// GET /api/plans/stats — member count per membership type
exports.getPlanStats = async (req, res) => {
  const gym = await resolveGym(req, res);
  if (!gym) return;

  const [breakdown, plans] = await Promise.all([
    Member.aggregate([
      { $match: { gym: gym._id } },
      { $group: { _id: '$membershipType', count: { $sum: 1 }, active: { $sum: { $cond: [{ $and: [{ $eq: ['$isActive', true] }, { $gte: ['$membershipEnd', new Date()] }] }, 1, 0] } } } },
      { $sort: { count: -1 } },
    ]),
    Plan.find({ gym: gym._id, isActive: true }).select('name durationDays price'),
  ]);

  res.json({ success: true, data: { breakdown, plans } });
};

// GET /api/plans
exports.getAllPlans = async (req, res) => {
  const gym = await resolveGym(req, res);
  if (!gym) return;

  const plans = await Plan.find({ gym: gym._id, isActive: true });
  res.status(200).json({ success: true, count: plans.length, data: plans });
};

// GET /api/plans/:id
exports.getPlan = async (req, res) => {
  const gym = await resolveGym(req, res);
  if (!gym) return;

  const plan = await Plan.findOne({ _id: req.params.id, gym: gym._id });
  if (!plan) {
    return res.status(404).json({ success: false, message: 'Plan not found.' });
  }
  res.status(200).json({ success: true, data: plan });
};

// POST /api/plans
exports.createPlan = async (req, res) => {
  const gym = await resolveGym(req, res);
  if (!gym) return;

  const plan = await Plan.create({ ...req.body, gym: gym._id });
  res.status(201).json({ success: true, data: plan });
};

// PUT /api/plans/:id
exports.updatePlan = async (req, res) => {
  const gym = await resolveGym(req, res);
  if (!gym) return;

  const plan = await Plan.findOneAndUpdate(
    { _id: req.params.id, gym: gym._id },
    req.body,
    { new: true, runValidators: true }
  );
  if (!plan) {
    return res.status(404).json({ success: false, message: 'Plan not found.' });
  }
  res.status(200).json({ success: true, data: plan });
};

// DELETE /api/plans/:id  (soft delete)
exports.deletePlan = async (req, res) => {
  const gym = await resolveGym(req, res);
  if (!gym) return;

  const plan = await Plan.findOneAndUpdate(
    { _id: req.params.id, gym: gym._id },
    { isActive: false },
    { new: true }
  );
  if (!plan) {
    return res.status(404).json({ success: false, message: 'Plan not found.' });
  }
  res.status(200).json({ success: true, message: 'Plan deactivated.' });
};
