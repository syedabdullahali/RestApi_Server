const mongoose = require("mongoose");

const userRankSettingSchema = new mongoose.Schema({
maximumCollectionLimit:{type:String,default:10000},  
isCollectionLimit:{type:String,default:"no"},  
maximumDaysObservation:{type:String,default:10},  
userLimit:{type:Number,default:10}
},{timestamps:true});

module.exports = mongoose.model("userRankSetting", userRankSettingSchema);