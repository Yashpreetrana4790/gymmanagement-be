const express = require('express');
const router  = express.Router();
const { getAllPlans, getPlan, getPlanStats, createPlan, updatePlan, deletePlan } = require('../controllers/planController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { planSchema } = require('../lib/validations');

router.get('/',         protect, authorize('admin', 'staff'), getAllPlans);
router.get('/stats',    protect, authorize('admin', 'staff'), getPlanStats);
router.get('/:id',      protect, authorize('admin', 'staff'), getPlan);

router.use(protect, authorize('admin'));
router.post('/',        validate(planSchema), createPlan);
router.put('/:id',      validate(planSchema.partial()), updatePlan);
router.delete('/:id',   deletePlan);

module.exports = router;
