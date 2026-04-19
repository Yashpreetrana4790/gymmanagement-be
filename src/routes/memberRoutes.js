const express = require('express');
const router = express.Router();
const {
  getAllMembers,
  getMember,
  createMember,
  updateMember,
  deleteMember,
  updateMemberPrograms,
  recordAttendance,
  getMemberAttendance,
  getRecentAttendance,
  getZombieMembers,
} = require('../controllers/memberController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/').get(authorize('admin', 'staff'), getAllMembers).post(authorize('admin', 'staff'), createMember);

router.get('/attendance/recent', authorize('admin', 'staff'), getRecentAttendance);
router.get('/zombies', authorize('admin', 'staff'), getZombieMembers);
router.put('/:id/programs', authorize('admin', 'staff'), updateMemberPrograms);
router.post('/:id/attendance', authorize('admin', 'staff'), recordAttendance);
router.get('/:id/attendance', authorize('admin', 'staff'), getMemberAttendance);

router
  .route('/:id')
  .get(authorize('admin', 'staff'), getMember)
  .put(authorize('admin', 'staff'), updateMember)
  .delete(authorize('admin'), deleteMember);

module.exports = router;
