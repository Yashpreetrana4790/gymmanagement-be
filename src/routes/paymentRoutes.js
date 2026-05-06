const express = require('express');
const router  = express.Router();
const { getPayments, createPayment } = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin'));

router.route('/')
  .get(getPayments)
  .post(createPayment);

module.exports = router;
