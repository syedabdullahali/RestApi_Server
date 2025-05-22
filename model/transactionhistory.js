const mongoose = require("mongoose");

const userTransactionHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ['credit', 'debit', 'withdraw', 'winning','privateContestWithdraw'],
      required: true
    },
    amountType: {
      type: String,
      enum: ['realAmount', 'bonusAmount', 'gstDeduct', 'tdsDeduct', 'referral',"tax"],
      required: true
    },
    amount: { type: Number },
    description: { type: String },
  },
  { timeseries: true, timestamps: true }
);

module.exports = mongoose.model("transaction_history", userTransactionHistorySchema,);
