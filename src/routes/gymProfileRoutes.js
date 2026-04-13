const express = require('express');
const router = express.Router();
const { createGymProfile, getGymProfile, updateGymProfile } = require('../controllers/gymProfileController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin'));

router.route('/').get(getGymProfile).post(createGymProfile).put(updateGymProfile);

module.exports = router;
