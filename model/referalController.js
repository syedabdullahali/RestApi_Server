const {Schema,model} =  require("mongoose")

const referalSchema =  new Schema({
 referalType:{type:String,enum:["Real cash","Cash Bonus"],required:true,default:"Real cash"},
 amount:{type:Number,required:true,default:50},
 amountColected:{type:Number,default:0},
 amountDistributionPercentage:{type:Number,required:true,default:10},
},{timestamps:true})

module.exports = model("referalSchema",referalSchema)