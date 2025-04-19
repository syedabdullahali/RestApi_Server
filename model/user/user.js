const mongoose = require("mongoose");
const {v4:uuidv4} =  require("uuid")

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },
    mobileNumber: {
      type: Number,
      required: true,
      // unique: true,
    },
    email: {
      type: String,
    },
    profile: {
      type: String
    },
    otp: {
      type: Number,
      // required: true,
    },
    sessionId:{
     type:String
    },
    password: {
      type: String,
      // required: true,
    },
    state: {
      type: String,
    },
    pincode: {
      type: Number,
    },
    totalRecharge: {
      type: Number,
    },
    totalSpent: {
      type: Number,
    },
    totalWithdraw: {
      type: Number,
    },
    profitOrLossPercentageToCompany: {
      type: String,
    },
    amountProfitToCompany: {
      type: String,
    },
    balance: {
      type: Number,
    },
    winningBalance: {
      type: Number,
    },
    performanceWinningPercentage: {
      type: String,
    },
    kyc: {
      type: String,
    },
    bankKYC: {
      type: Boolean,
      default: false
    },
    upiId: {
      type: String,
    },
    bankName: {
      type: String,
    },
    /* branchName: {
      type: String
    }, */
    accountNumber: {
      type: Number,
    },
    ifscCode: {
      type: String,
    },
    activePercentage: {
      type: Number,
    },
    contestnotify: [
      {
        contestId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "categoryContest",
        },
        timeSlotId: {
          type: mongoose.Schema.Types.ObjectId,
          ref:"timeSheduleSchema"
        },
        subcategoryId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "sub-category",
        },
      },
    ],
    contestNotification: [
      {
        contestId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "categoryContest",
        },
        subcategoryId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "sub-category",
        },
        timeSlotId: {
          type: mongoose.Schema.Types.ObjectId,
          ref:"timeSheduleSchema"
        },
        isNotificationSended:{
          default:false,
          type:Boolean,
       }
      },   
    ],
    fcmToken: {
      type: String
    },
    type: { type: String, enum: ["user", "bot", "admin"], default: "user" },
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    joinPrivateContest: [{ type: mongoose.Schema.Types.ObjectId, ref: "privateContest" }],
    notifications: [{ type: mongoose.Schema.Types.ObjectId, ref: "notification" }],
    referralCode: {
      type: String,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

// UserSchema.pre("save", async function (next) {
//   if (!this.name) { // Only generate if name is missing
//     let isUnique = false;
//     let userName;

//     while (!isUnique) {
//       userName = `user_${uuidv4()}`;
//       const existingUser = await mongoose.model("User").findOne({ name: userName });
//       if (!existingUser) isUnique = true;
//     }

//     this.name = userName; // Assign unique name
//   }
//   next();
// });




const UserModel = mongoose.model("User", UserSchema);

module.exports = UserModel;