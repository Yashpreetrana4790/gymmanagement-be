const express = require('express');
const router  = express.Router();
const { getAllStaff, getStaff, createStaff, updateStaff, deleteStaff, createAccount, revokeAccount } = require('../controllers/staffController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { staffSchema } = require('../lib/validations');

router.use(protect);

router.route('/')
  .get(authorize('admin', 'staff'),  getAllStaff)
  .post(authorize('admin'), validate(staffSchema), createStaff);

router.route('/:id')
  .get(authorize('admin', 'staff'),  getStaff)
  .put(authorize('admin'), updateStaff)
  .delete(authorize('admin'),        deleteStaff);

router.post('/:id/create-account', authorize('admin'), createAccount);
router.delete('/:id/account',       authorize('admin'), revokeAccount);

module.exports = router;
