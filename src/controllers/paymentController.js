const Payment = require('../models/Payment');
const Member  = require('../models/Member');
const Plan    = require('../models/Plan');
const resolveGym = require('../utils/resolveGym');

// GET /api/payments
exports.getPayments = async (req, res) => {
  const gym = await resolveGym(req, res);
  if (!gym) return;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const payments = await Payment.find({ gym: gym._id })
    .populate({ path: 'member', populate: { path: 'user', select: 'firstName lastName email' } })
    .populate('plan', 'name')
    .sort({ date: -1 });

  const thisMonthPayments = payments.filter(p => new Date(p.date) >= startOfMonth);
  const totalCollected = thisMonthPayments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);
  const pending = payments
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);
  const overdue = payments
    .filter(p => p.status === 'overdue')
    .reduce((sum, p) => sum + p.amount, 0);

  const formatted = payments.map(p => ({
    _id:    p._id,
    member: {
      name:  p.member?.user ? `${p.member.user.firstName} ${p.member.user.lastName}` : 'Unknown',
      email: p.member?.user?.email ?? '',
    },
    plan:   { name: p.plan?.name ?? '' },
    amount: p.amount,
    method: p.method,
    status: p.status,
    date:   p.date,
    note:   p.note,
  }));

  res.json({
    success: true,
    data: formatted,
    summary: { totalCollected, pending, overdue },
  });
};

// POST /api/payments
exports.createPayment = async (req, res) => {
  const gym = await resolveGym(req, res);
  if (!gym) return;

  const { memberId, planId, amount, method, date, note } = req.body;

  const [member, plan] = await Promise.all([
    Member.findOne({ _id: memberId, gym: gym._id }),
    Plan.findOne({ _id: planId, gym: gym._id }),
  ]);

  if (!member) return res.status(404).json({ success: false, message: 'Member not found.' });
  if (!plan)   return res.status(404).json({ success: false, message: 'Plan not found.' });

  const payment = await Payment.create({
    gym:        gym._id,
    member:     member._id,
    plan:       plan._id,
    amount,
    method,
    status:     'paid',
    date:       date || new Date(),
    note:       note || '',
    recordedBy: req.user._id,
  });

  res.status(201).json({ success: true, data: payment });
};
