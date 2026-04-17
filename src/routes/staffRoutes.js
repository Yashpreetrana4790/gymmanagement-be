const express = require('express');
const router = express.Router();
const {
  getAllStaff,
  getStaff,
  createStaff,
  updateStaff,
  deleteStaff,
} = require('../controllers/staffController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(authorize('admin', 'staff'), getAllStaff)
  .post(authorize('admin'), createStaff);

router.route('/:id')
  .get(authorize('admin', 'staff'), getStaff)
  .put(authorize('admin'), updateStaff)
  .delete(authorize('admin'), deleteStaff);

module.exports = router;
