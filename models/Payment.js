const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  method: { type: String, enum: ['card', 'upi'], required: true },
  amount: { type: Number, required: true },
  card: {
    cardName: String,
    cardNumber: String,
    expiry: String,
    cvv: String,
  },
  upi: {
    app: String,
    upiId: String,
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Payment', paymentSchema);
