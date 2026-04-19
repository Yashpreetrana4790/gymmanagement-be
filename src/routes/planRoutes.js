const express = require('express');
const router = express.Router();
const {
  getAllPlans,
  getPlan,
  getPlanStats,
  createPlan,
  updatePlan,
  deletePlan,
} = require('../controllers/planController');
const { protect, authorize } = require('../middleware/auth');
// protect/authorize used directly on stats route above

// Public — anyone can view plans
router.get('/', getAllPlans);
router.get('/stats', protect, authorize('admin', 'staff'), getPlanStats);
router.get('/:id', getPlan);

// Admin only — manage plans
router.use(protect, authorize('admin'));
router.post('/', createPlan);
router.put('/:id', updatePlan);
router.delete('/:id', deletePlan);

module.exports = router;
