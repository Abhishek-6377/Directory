const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const { body, validationResult } = require('express-validator');

// POST /api/pay
router.post(
  '/',
  [
    body('method').isIn(['card', 'upi']),
    body('amount').isNumeric().toFloat(),

    // card fields
    body('card.cardName').if(body('method').equals('card')).notEmpty(),
    body('card.cardNumber').if(body('method').equals('card')).isLength({ min: 12 }),
    body('card.expiry').if(body('method').equals('card')).notEmpty(),
    body('card.cvv').if(body('method').equals('card')).isLength({ min: 3 }),

    // upi fields
    body('upi.upiId').if(body('method').equals('upi')).notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    try {
      const payment = new Payment(req.body);
      await payment.save();
      res.status(201).json({ message: 'Payment successful', payment });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

module.exports = router;
