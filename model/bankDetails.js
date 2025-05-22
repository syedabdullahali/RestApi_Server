const { Schema, model } = require("mongoose");


const bankDetailSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    enterAccountNumber: { type: String },
    enterBankName: { type: String },
    enterIFSCCode: { type: String },
    enterUpiId: { type: String },
    status: {
        type: String,
        enum: ["Pending", "Reject", "Approve"],
        required: true,
        default: "Pending",
    },
  },
  { timestamps: true }
);

module.exports = model("bankDetail", bankDetailSchema);
