const express = require('express');
const router  = express.Router();
const { generatePrograms } = require('../controllers/aiController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin', 'staff'));

// POST /api/ai/members/:id/suggest
router.post('/members/:id/suggest', generatePrograms);

module.exports = router;
