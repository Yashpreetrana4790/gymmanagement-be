const express = require('express');
const router = express.Router();
const {
  getAllMembers,
  getMember,
  createMember,
  updateMember,
  deleteMember,
} = require('../controllers/memberController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/').get(authorize('admin', 'staff'), getAllMembers).post(authorize('admin', 'staff'), createMember);

router
  .route('/:id')
  .get(authorize('admin', 'staff'), getMember)
  .put(authorize('admin', 'staff'), updateMember)
  .delete(authorize('admin'), deleteMember);

module.exports = router;
