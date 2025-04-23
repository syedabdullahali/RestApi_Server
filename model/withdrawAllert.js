const mongoose = require('mongoose');

const withdrawAllertSchema = new mongoose.Schema({
  user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
  },
  type: {
    type: String,
    enum: ['bankAcountNo', 'upi'], // or use boolean if applicable
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  walletAmountTodeduct: {
    type: Number,
    required: true
  },
  transfer: {
    type: String,
    enum: ['Approve', 'Pending', 'Reject'], // or use boolean if applicable
    required: true,
    default:"Pending"
  },
  withdrawType:{
    type: String,
    enum: ['referral', 'private', 'withdrawable'], // or use boolean if applicable
    required: true,
  },
  upiId:{
    type: String,
  },
  bankAccountNo:{
    type: String,
  },
  bankName:{
    type: String,
  },
  IFSC_code: { type: String },
  statusConfirmDateTime:{
    type:Date,
    default:null
  }
}, { timestamps: true });

module.exports = mongoose.model('withdrawAllert', withdrawAllertSchema);