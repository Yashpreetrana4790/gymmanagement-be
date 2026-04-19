const express = require('express');
const router = express.Router();
const { getFeedback, submitFeedback, updateFeedback, deleteFeedback } = require('../controllers/feedbackController');
const { protect, authorize } = require('../middleware/auth');

// Public — anyone can submit feedback (gymId in body)
router.post('/submit', submitFeedback);

// Protected — admin/staff manage feedback
router.use(protect, authorize('admin', 'staff'));
router.get('/', getFeedback);
router.patch('/:id', updateFeedback);
router.delete('/:id', deleteFeedback);

module.exports = router;
