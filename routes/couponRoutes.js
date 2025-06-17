const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const Coupon = require('../models/Coupon');
const orderAmount = require('../models/Order');

// === Middleware: Handle Validation Errors ===
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
  }
  next();
};

// === Helper: Validate Expiry Date ===
const isValidExpiryDate = (date) => !date || new Date(date).getTime() > Date.now();

// === Create Coupon ===
router.post(
  '/create',
  [
    body('amount').isFloat({ gt: 0 }),
    body('discount').isString().trim().notEmpty(),
    body('name').optional().isString().trim(),
    body('expiresAt').optional().isISO8601(),
    body('category').optional().isArray(),
    body('category.*').optional().isString(),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const { code, amount, discount, name, expiresAt, category } = req.body;
      const formattedCode = code.toUpperCase().trim();

      if (!isValidExpiryDate(expiresAt)) {
        return res.status(400).json({ success: false, message: 'Expiry date must be in the future' });
      }

      const existing = await Coupon.findOne({ code: formattedCode });
      if (existing) {
        return res.status(409).json({ success: false, message: 'Coupon with this code already exists' });
      }

      const coupon = new Coupon({
        code: formattedCode,
        name: name?.trim(),
        amount,
        discount: discount.trim(),
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        category: Array.isArray(category) ? category : [],
      });

      await coupon.save();
      res.status(201).json({ success: true, message: 'Coupon created successfully', coupon });
    } catch (err) {
      console.error('Coupon creation error:', err);
      res.status(500).json({ success: false, message: err.message || 'Server error while creating coupon' });
    }
  }
);

// === Get All Coupons (Paginated) ===
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;

    const coupons = await Coupon.find().sort({ createdAt: -1 }).skip(skip).limit(limit);
    const total = await Coupon.countDocuments();

    res.json({ success: true, count: coupons.length, total, coupons });
  } catch (err) {
    console.error('Fetch error:', err);
    res.status(500).json({ success: false, message: err.message || 'Error fetching coupons' });
  }
});

// === ✅ Fixed Coupon Usage Summary (from Coupon model only) ===
router.get("/usage", async (req, res) => {
  try {
    const coupons = await Coupon.find();

    // Auto-fix missing fields
    for (const coupon of coupons) {
      let updated = false;
      if (coupon.usageCount === undefined) {
        coupon.usageCount = 0;
        updated = true;
      }
      if (coupon.totalDiscount === undefined) {
        coupon.totalDiscount = 0;
        updated = true;
      }
      if (updated) await coupon.save();
    }

    // Return only necessary fields
    const sanitized = coupons.map(c => ({
      code: c.code,
      name: c.name,
      amount: c.amount,
      discount: c.discount,
      usageCount: c.usageCount,
      totalDiscount: c.totalDiscount,
    }));

    res.status(200).json(sanitized);
  } catch (err) {
    console.error("Error in /usage route:", err);
    res.status(500).json({ success: false, message: "Failed to fetch coupon usage data" });
  }
});


// === Validate Coupon ===
router.get(
  '/validate/:code',
  [param('code').isString().notEmpty()],
  handleValidation,
  async (req, res) => {
    try {
      const code = req.params.code.toUpperCase().trim();
      const coupon = await Coupon.findOne({ code });
      if (!coupon) return res.status(404).json({ valid: false, message: 'Coupon not found' });
      if (!coupon.active) return res.status(400).json({ valid: false, message: 'Coupon is inactive' });
      if (coupon.expiresAt && Date.now() > coupon.expiresAt.getTime())
        return res.status(400).json({ valid: false, message: 'Coupon expired' });

      res.json({ valid: true, coupon, discountAmount });
    } catch (err) {
      console.error('Validation error:', err);
      res.status(500).json({ valid: false, message: err.message || 'Validation server error' });
    }
  }
);
// === Use Coupon ===
router.post('/use/:code',
  [param('code').isString().notEmpty()],
  handleValidation,
  async (req, res) => {
    try {
      const code = req.params.code.toUpperCase().trim();

      const coupon = await Coupon.findOne({ code });
      if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
      if (!coupon.active) return res.status(400).json({ success: false, message: 'Coupon is inactive' });
      if (coupon.expiresAt && Date.now() > coupon.expiresAt.getTime()) {
        return res.status(400).json({ success: false, message: 'Coupon expired' });
      }

      const orderAmount = parseFloat(coupon.amount);  // 🟢 USE THIS
      const discountPercent = parseFloat(coupon.discount);

      let baseDiscountAmount  = (orderAmount * discountPercent) / 100;
      let maxDiscount = 20;
      let discountAmount = (baseDiscountAmount  * maxDiscount) / 100;

      // Cap max discount to ₹500
      const maxAllowedDiscount = 500;
      discountAmount = Math.min(discountAmount, maxAllowedDiscount);

      const orderAmountAfterDiscount = orderAmount - discountAmount;

      coupon.usageCount += 1;
      coupon.totalDiscount += discountAmount;
      coupon.usedAt = new Date();
      await coupon.save();

      console.log(`Coupon used: usageCount=${coupon.usageCount}, totalDiscount=${coupon.totalDiscount}`);

      res.json({
        success: true,
        message: 'Coupon applied successfully',
        coupon,
        originalAmount: orderAmount,
        discountAmount,
        orderAmountAfterDiscount
      });
    } catch (err) {
      console.error('Use error:', err);
      res.status(500).json({ success: false, message: err.message || 'Server error while using coupon' });
    }
  });


// === Delete Coupon ===
router.delete('/:id', [param('id').isMongoId()], handleValidation, async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
    res.json({ success: true, message: 'Coupon deleted successfully' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ success: false, message: err.message || 'Error deleting coupon' });
  }
});
// === Toggle Coupon Active/Inactive ===
router.put('/toggle/:id', async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon not found" });
    }

    coupon.active = !coupon.active;
    await coupon.save();

    res.json({
      success: true,
      message: `Coupon ${coupon.active ? 'activated' : 'deactivated'} successfully`,
      coupon,
    });
  } catch (err) {
    console.error('Toggle error:', err);
    res.status(500).json({ success: false, message: "Server error while toggling coupon" });
  }
});


module.exports = router;
