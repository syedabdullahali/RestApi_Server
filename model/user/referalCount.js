const mongoose = require("mongoose");

const referalCounterSchema = new mongoose.Schema({
  sequence_value: { type: Number, default: 1 }, 
});

const referalCounter = mongoose.model("referalCounter", referalCounterSchema);
module.exports = referalCounter;
