const express = require('express');
const router = express.Router();
const { getGymByToken, joinGym, applyAsStaff } = require('../controllers/publicController');

router.get('/gym/:qrToken', getGymByToken);
router.post('/gym/:qrToken/join', joinGym);
router.post('/gym/:qrToken/staff-apply', applyAsStaff);

module.exports = router;
