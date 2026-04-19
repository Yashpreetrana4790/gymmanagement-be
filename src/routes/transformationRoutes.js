const express = require('express');
const router = express.Router();
const { getTransformations, getMemberTransformations, createTransformation, deleteTransformation } = require('../controllers/transformationController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin', 'staff'));

router.get('/', getTransformations);
router.get('/member/:memberId', getMemberTransformations);
router.post('/', createTransformation);
router.delete('/:id', deleteTransformation);

module.exports = router;
