const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  name: String,
  companyName: String,
  linkedin: String,
  website: String,
  city: String,
 email: {
  type: String,
  required: true,
  unique: true,
  match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
},
whatsapp: {
  type: String,
  required: true,
  unique: true,
  match: [/^\d{10,15}$/, 'Invalid WhatsApp number'], // Adjust regex as needed
},
  couponCode: String,
  paymentAmount: Number,
},{timestamps:true});

module.exports = mongoose.model('Member',memberSchema);