const express = require('express');
const router = express.Router();
const Member = require('../models/Member');

router.post('/check-duplicate', async (req, res) => {
  const email = req.body.email?.trim().toLowerCase();
  const whatsapp = req.body.whatsapp?.trim();
  const errors = {};  // ✅ correct object

  try {
    const emailExists = await Member.findOne({ email });
    if (emailExists) errors.email = 'Email already used.';

    const whatsappExists = await Member.findOne({ whatsapp });
    if (whatsappExists) errors.whatsapp = 'WhatsApp already used.';

    if (Object.keys(errors).length > 0) {
      return res.status(409).json({ success: false, errors });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ Error checking duplicate member', {
      message: err.message,
      stack: err.stack,
      input: { email, whatsapp },
    });
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});


// ✅ Register a new member
router.post('/register', async (req, res) => {
  const {
    name,
    companyName,
    linkedin,
    website,
    city,
    whatsapp,
    email,
    couponCode,
    paymentAmount,
  } = req.body;

  try {
    const existing = await Member.findOne({
      $or: [
        { email: email?.trim().toLowerCase() },
        { whatsapp: whatsapp?.trim() },
      ],
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Email or WhatsApp number already used',
      });
    }

    const member = new Member({
      name,
      companyName,
      linkedin,
      website,
      city,
      whatsapp: whatsapp.trim(),
      email: email.trim().toLowerCase(),
      couponCode,
      paymentAmount,
    });

    await member.save();

    return res.status(201).json({
      success: true,
      message: 'Member registered successfully',
      member,
    });
  } catch (err) {
    console.error('❌ Error registering member:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error while registering member',
    });
  }
});

module.exports = router;
