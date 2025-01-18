const mongoose = require("mongoose");

const kycSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    name: {
      type: String,
    },
    email: {
      type: String,
    },
    status: {
      type: String,
      enum: ["Pending", "Reject", "Approve"],
      required: true,
      default: "Pending",
    },
    aadharNumber: {
      type: Number,
    },
    aadhar_photo: {
      type: String,
    },
    dateOfBirth: {
      type: Date,
      // required: true,
    },
    pancardNumber: {
      type: String,
    },
    pancard_photo: {
      type: String,
    },
    dob: {
      type: String,
    },
    state: {
      type: String,
      // required: true,
    },
    city: {
      type: String,
      // required: true,
    },
    address: {
      type: String
    },
    documentKYC: {
      type: Boolean,
      default: false
    },
    addressKyc: {
      type: Boolean,
      default: false
    },
    pincode: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("user_kyc", kycSchema);
