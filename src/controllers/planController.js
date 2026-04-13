const Plan = require('../models/Plan');

// GET /api/plans
exports.getAllPlans = async (req, res) => {
  const plans = await Plan.find({ isActive: true });
  res.status(200).json({ success: true, count: plans.length, data: plans });
};

// GET /api/plans/:id
exports.getPlan = async (req, res) => {
  const plan = await Plan.findById(req.params.id);
  if (!plan) {
    return res.status(404).json({ success: false, message: 'Plan not found.' });
  }
  res.status(200).json({ success: true, data: plan });
};

// POST /api/plans
exports.createPlan = async (req, res) => {
  const plan = await Plan.create(req.body);
  res.status(201).json({ success: true, data: plan });
};

// PUT /api/plans/:id
exports.updatePlan = async (req, res) => {
  const plan = await Plan.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!plan) {
    return res.status(404).json({ success: false, message: 'Plan not found.' });
  }
  res.status(200).json({ success: true, data: plan });
};

// DELETE /api/plans/:id  (soft delete)
exports.deletePlan = async (req, res) => {
  const plan = await Plan.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!plan) {
    return res.status(404).json({ success: false, message: 'Plan not found.' });
  }
  res.status(200).json({ success: true, message: 'Plan deactivated.' });
};
