const mongoose = require('mongoose');
const Coupon = require('../models/Coupon');

mongoose.connect('mongodb://localhost:27017/YOUR_DB_NAME', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(async () => {
    const result = await Coupon.updateMany(
      {
        $or: [
          { usageCount: { $exists: false } },
          { totalDiscount: { $exists: false } },
        ],
      },
      {
        $set: {
          usageCount: 0,
          totalDiscount: 0,
        },
      }
    );

    console.log(`✅ Fixed ${result.modifiedCount} old coupons.`);
    mongoose.disconnect();
  })
  .catch(err => {
    console.error('❌ Failed to fix coupons:', err);
  });
