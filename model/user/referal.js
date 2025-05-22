const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
  referrerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  refereeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  referralCode: {
    type: String,
    required: true,
    unique: true,
  },
  rewardAmount: {
    type: Number,
    default: 0,
  },
  creditRewardAmount: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['Pending', 'Completed', ],
    default: 'Pending',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  referalType:{type:String,enum:["Real cash","Cash Bonus"],required:true,default:"Real cash"},
  amountDistributionPercentage:{type:Number,required:true,default:10},
  isLogin:{type:Boolean,default:false}
});

module.exports = mongoose.model('Referral', referralSchema);
