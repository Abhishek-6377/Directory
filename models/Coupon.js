const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    active: { type: Boolean, default: true },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,       // Percentage value (e.g., 10, 25)
      required: true,
      min: 0,
      max: 100,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    isUsed: { type: Boolean, default: false },
    usedAt: { type: Date },
    usageCount: { type: Number, default: 0 },
    totalDiscount: { type: Number, default: 0 },
    category: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Coupon', couponSchema);
