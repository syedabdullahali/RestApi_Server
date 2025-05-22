const mongoose = require("mongoose")

const cashBonusSchema = new mongoose.Schema({
bonusAmount:{type:Number,require:true},
usedBonusAmount:{type:Number,require:true},
remainingBonusAmount:{type:Number,require:true},
bonusAmountDate:{type:Date,require:true,default:Date.now},
bonusType:{type:String,enum:["Credit","Debit"],require:true},
user:{type: mongoose.Schema.Types.ObjectId,ref: "User",required: true,},
expireBonusAmountDate:{type:Date,require:true,default:Date.now},
},{timestamps:true})



module.exports = mongoose.model('cashBonusSchema',cashBonusSchema)

//675179e7e7d8298ea7fd96a8

// Deposite mean How Much Recharge he have done 
// Total WithDrwal   
// Total Gst Deducted 



// Tax .............................................. 

//  total withdraw - totaldeposite -referalamount * 0.3 

// total WithDraw 3000
// total Deposite balance is 2000
// Referal Amount 500 

//3000 - 2000 - 500


//for every contest wining deposite 

// Tax = 500 *0.3

// if winingBalnce 5000
// if tax - 300

//if  tax in minus then there would not be any affect 
// so here Withdrawl equla to 5000

// Withdrawl  =  5000