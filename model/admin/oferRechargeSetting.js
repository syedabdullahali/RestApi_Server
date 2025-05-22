const mongoose = require("mongoose");

const oferRechargeSetting = new mongoose.Schema({
  minimumWaletRecharge: { type: Number, required: true },
  minimumCashBonusExpireDay: { type: Number, required: true },
  selectedBestOfferWaletRecharge:[
    {
        amount:{ type: Number, required: true },
        bonusAmount:{ type: Number, required: true },
        label:{ type: String, required: true },
    }
  ]
},{timestamps:true});

module.exports = mongoose.model("oferRechargeSetting", oferRechargeSetting);