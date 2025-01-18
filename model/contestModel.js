const mongoose = require("mongoose");

const SheduleSchema = new mongoose.Schema({
  startTime: { type: Date },
  endTime: { type: Date },
  status: { type: String, enum: ["active", "stopped"], default: "active" },
});

const contestSchema = new mongoose.Schema(
  {
    entryAmount: { type: Number, required: true },
    slots: { type: Number, required: true },
    upto: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    type: { type: String, required: true },
    typeCashBonus: { type: String },
    bonusCashPercentage: { type: Number },
    bonusCashAmount: { type: Number },
    subcategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "sub-category",
      required: false,
    },
    platformFeePercentage: { type: Number },
    platformFeeAmount: { type: Number },
    prizeDistributionPercentage: { type: Number, required: true },
    prizeDistributionAmount: { type: Number, required: true },
    rankDistribution: { type: Array, required: true },
    prizeDistribution: { type: Array, required: true },
    rankCount: { type: Number, required: true },
    rankPercentage: { type: Number, required: true },
    startDateTime: { type: Date },
    endDateTime: { type: Date },
    timeSlots: [SheduleSchema],
    isBotActive:{ type: Boolean, required: true,default:false },
    bidRange:{ type: Number, required: true,default:100},
    isBidRangeActive:{ type: Boolean, required: true,default:false},
    bot2isActive:{type:Boolean,default:true},
    bidRangeOfContest:{
      maxBidRange:{ type: Number, required: true},
      minBidRange:{ type: Number, required: true}
    },
    favorite:[
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ] 
  },

  { timestamps: true }
);
module.exports = mongoose.model("categoryContest", contestSchema);


// [

// {
//   "entryAmount": 50,
//   "slots": 100,
//   "upto": 500,
//   "totalAmount": 5000,
//   "type": "Standard",
//   "typeCashBonus": "welcomeBonus",
//   "bonusCashPercentage": 10,
//   "bonusCashAmount": 500,
//   "subcategoryId": "64b7f0b2f1a12d3b7896bcd9",
//   "platformFeePercentage": 5,
//   "platformFeeAmount": 250,
//   "prizeDistributionPercentage": 95,
//   "prizeDistributionAmount": 4750,
//   "rankDistribution": [1, 2, 3, 4, 5],
//   "prizeDistribution": [2000, 1500, 800, 600, 300],
//   "rankCount": 5,
//   "rankPercentage": 50,
//   "startDateTime": "2024-12-07T10:00:00.000Z",
//   "endDateTime": "2024-12-07T18:00:00.000Z",
//   "timeSlots": [
//     {
//       "startTime": "2024-12-07T10:00:00.000Z",
//       "endTime": "2024-12-07T11:00:00.000Z",
//       "status": "active"
//     },
//     {
//       "startTime": "2024-12-07T11:00:00.000Z",
//       "endTime": "2024-12-07T12:00:00.000Z",
//       "status": "active"
//     },
//     {
//       "startTime": "2024-12-08T11:00:00.000Z",
//       "endTime": "2024-12-08T12:00:00.000Z",
//       "status": "active"
//     },
//     {
//       "startTime": "2024-12-08T11:00:00.000Z",
//       "endTime": "2024-12-08T12:00:00.000Z",
//       "status": "active"
//     },
//     {
//       "startTime": "2024-12-04T11:00:00.000Z",
//       "endTime": "2024-12-04T12:00:00.000Z",
//       "status": "active"
//     },
//     {
//       "startTime": "2024-12-04T11:00:00.000Z",
//       "endTime": "2024-12-04T12:00:00.000Z",
//       "status": "active"
//     }
//   ],
//   "isBotActive": true,
//   "bidRange": 200,
//   "isBidRangeActive": true,
//   "bot2isActive": false
// },

// {
//   "entryAmount": 50,
//   "slots": 100,
//   "upto": 500,
//   "totalAmount": 5000,
//   "type": "Standard",
//   "typeCashBonus": "welcomeBonus",
//   "bonusCashPercentage": 10,
//   "bonusCashAmount": 500,
//   "subcategoryId": "64b7f0b2f1a12d3b7896bcd9",
//   "platformFeePercentage": 5,
//   "platformFeeAmount": 250,
//   "prizeDistributionPercentage": 95,
//   "prizeDistributionAmount": 4750,
//   "rankDistribution": [1, 2, 3, 4, 5],
//   "prizeDistribution": [2000, 1500, 800, 600, 300],
//   "rankCount": 5,
//   "rankPercentage": 50,
//   "startDateTime": "2024-12-07T10:00:00.000Z",
//   "endDateTime": "2024-12-07T18:00:00.000Z",
//   "timeSlots": [
//     {
//       "startTime": "2024-12-07T10:00:00.000Z",
//       "endTime": "2024-12-07T11:00:00.000Z",
//       "status": "active"
//     },
//     {
//       "startTime": "2024-12-07T11:00:00.000Z",
//       "endTime": "2024-12-07T12:00:00.000Z",
//       "status": "active"
//     },
//     {
//       "startTime": "2024-12-08T11:00:00.000Z",
//       "endTime": "2024-12-08T12:00:00.000Z",
//       "status": "active"
//     },
//     {
//       "startTime": "2024-12-08T11:00:00.000Z",
//       "endTime": "2024-12-08T12:00:00.000Z",
//       "status": "active"
//     },
//     {
//       "startTime": "2024-12-04T11:00:00.000Z",
//       "endTime": "2024-12-04T12:00:00.000Z",
//       "status": "active"
//     },
//     {
//       "startTime": "2024-12-04T11:00:00.000Z",
//       "endTime": "2024-12-04T12:00:00.000Z",
//       "status": "active"
//     }
//   ],
//   "isBotActive": true,
//   "bidRange": 200,
//   "isBidRangeActive": true,
//   "bot2isActive": false
// }
// ]